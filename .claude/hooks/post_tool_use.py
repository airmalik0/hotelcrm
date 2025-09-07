#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.8"
# ///

import json
import sys
import subprocess
from pathlib import Path

try:
    from .common import get_project_root, ensure_logs_dir
except ImportError:
    # Fallback if common.py is not available
    def get_project_root():
        """
        Find the project root directory by looking for key files.
        Starts from current script location and walks up the directory tree.
        """
        current_path = Path(__file__).resolve()

        # Walk up from .claude/hooks/ to project root
        for parent in current_path.parents:
            # Check for key project files that indicate project root
            if (
                (parent / "backend" / "app" / "main.py").exists()
                and (parent / "frontend" / "package.json").exists()
                and (parent / "docker-compose.yml").exists()
            ):
                return parent

        # Fallback: assume we're in project_root/.claude/hooks/
        return current_path.parent.parent

    def ensure_logs_dir():
        project_root = get_project_root()
        log_dir = project_root / ".claude" / "logs"
        log_dir.mkdir(parents=True, exist_ok=True)
        return log_dir


def run_linters(operation_type=None):
    """
    Run linters based on operation type.
    If operation_type is 'backend', run only backend linters.
    If operation_type is 'frontend', run only frontend linters.
    If operation_type is None, run both.
    """
    linter_results = {}
    PROJECT_ROOT = get_project_root()

    # Backend linters (Python) - run only if backend or no specific type
    if operation_type in ["backend", None]:
        backend_dir = PROJECT_ROOT / "backend"
        if backend_dir.exists():
            backend_linters = [
                ("ruff (backend)", ["uv", "run", "ruff", "check", "."]),
                ("mypy (backend)", ["uv", "run", "python", "-m", "mypy", "."]),
            ]

            for name, cmd in backend_linters:
                try:
                    result = subprocess.run(
                        cmd,
                        capture_output=True,
                        text=True,
                        timeout=30,
                        cwd=backend_dir,  # Run from backend directory
                    )
                    linter_results[name] = {
                        "returncode": result.returncode,
                        "stdout": result.stdout[:3000],  # Limit output
                        "stderr": result.stderr[:3000],
                    }
                except (subprocess.TimeoutExpired, FileNotFoundError):
                    # Linter not available or timed out
                    pass

    # Frontend linters (JavaScript/TypeScript) - run only if frontend or no specific type
    if operation_type in ["frontend", None]:
        frontend_dir = PROJECT_ROOT / "frontend"
        if frontend_dir.exists():
            try:
                # Try to use the biome wrapper for concise output
                wrapper_path = PROJECT_ROOT / ".claude" / "hooks" / "utils" / "biome_wrapper.py"
                if wrapper_path.exists():
                    # Use the wrapper for concise output
                    result = subprocess.run(
                        ["python3", str(wrapper_path)],
                        capture_output=True,
                        text=True,
                        timeout=15,
                    )
                    linter_results["biome (frontend)"] = {
                        "returncode": result.returncode,
                        "stdout": result.stdout,
                        "stderr": result.stderr if result.stderr else "",
                    }
                else:
                    # Fallback to direct biome with limited diagnostics
                    result = subprocess.run(
                        [
                            "npx",
                            "biome",
                            "check",
                            ".",
                            "--max-diagnostics=10",  # Reduced from 20
                            "--files-ignore-unknown=true",
                            "--no-errors-on-unmatched",
                        ],
                        capture_output=True,
                        text=True,
                        timeout=15,
                        cwd=frontend_dir,
                    )
                    # Limit output size
                    stdout = result.stdout
                    if len(stdout) > 2000:
                        lines = stdout.split('\n')
                        # Keep first 20 lines and last 10 lines
                        if len(lines) > 30:
                            stdout = '\n'.join(lines[:20] + ['...truncated...'] + lines[-10:])

                    linter_results["biome (frontend)"] = {
                        "returncode": result.returncode,
                        "stdout": stdout,
                        "stderr": result.stderr[:500] if result.stderr else "",
                    }
            except subprocess.TimeoutExpired:
                linter_results["biome (frontend)"] = {
                    "returncode": 1,
                    "stdout": "",
                    "stderr": "⏱️ Timeout: biome check took too long (>15s)",
                }
            except FileNotFoundError:
                # biome not installed
                pass
            except Exception:
                pass

    return linter_results


def manage_counter_and_check_linters(tool_name, input_data):
    """
    Manage persistent counter for write operations and check if we should run linters.
    Only counts Write, MultiEdit, Edit, NotebookEdit operations.
    Counts backend and frontend operations separately.
    Returns tuple (should_run_linters, current_count, operation_type).
    """
    # Check if this is a write operation
    write_operations = ["Write", "MultiEdit", "Edit", "NotebookEdit"]
    if tool_name not in write_operations:
        return False, 0, None  # Don't run linters for non-write operations

    # Determine operation type (frontend or backend)
    operation_type = check_operation_type(input_data)
    if not operation_type:
        return False, 0, None  # Don't count if we can't determine the type

    # Use dynamic project root
    PROJECT_ROOT = get_project_root()
    counter_file = PROJECT_ROOT / ".claude" / "logs" / "write_operations_counter.json"

    # Read current counters
    if counter_file.exists():
        try:
            with open(counter_file, "r") as f:
                data = json.load(f)
                # Separate counters for frontend and backend
                backend_count = data.get("backend_count", 0)
                frontend_count = data.get("frontend_count", 0)
        except Exception:
            backend_count = 0
            frontend_count = 0
    else:
        backend_count = 0
        frontend_count = 0

    # Increment appropriate counter
    if operation_type == "backend":
        backend_count += 1
        current_count = backend_count
    elif operation_type == "frontend":
        frontend_count += 1
        current_count = frontend_count
    else:
        return False, 0, None

    # Save new counter values
    counter_file.parent.mkdir(parents=True, exist_ok=True)
    with open(counter_file, "w") as f:
        json.dump({"backend_count": backend_count, "frontend_count": frontend_count}, f)

    # Check if we should run linters (every 3rd write operation for that specific type)
    should_run = current_count % 3 == 0

    return should_run, current_count, operation_type


def check_operation_type(input_data):
    """
    Check if this is a frontend or backend operation.
    Returns 'frontend', 'backend', or None.
    """
    tool_name = input_data.get("tool_name", "")
    tool_input = input_data.get("tool_input", {})

    # Check if it's a Read, Write, Edit, or MultiEdit operation
    if tool_name in ["Read", "Write", "Edit", "MultiEdit", "NotebookEdit"]:
        file_path = tool_input.get("file_path", "") or tool_input.get(
            "notebook_path", ""
        )
        # Check if the file path is in the frontend or backend directory
        if "/frontend/" in file_path:
            return "frontend"
        elif "/backend/" in file_path:
            return "backend"

    # Check if it's a Bash command
    if tool_name == "Bash":
        # Check current working directory (if available)
        cwd = input_data.get("cwd", "")
        command = tool_input.get("command", "")

        # Frontend checks
        if "/frontend" in cwd or "frontend/" in command:
            return "frontend"
        if any(
            cmd in command
            for cmd in ["npm ", "npx ", "node ", "yarn ", "pnpm ", "bun "]
        ):
            return "frontend"

        # Backend checks
        if "/backend" in cwd or "backend/" in command:
            return "backend"
        if any(
            cmd in command
            for cmd in ["uv ", "pytest", "fastapi", "alembic", "ruff", "mypy"]
        ):
            return "backend"

    # Check for Grep/Glob operations
    if tool_name in ["Grep", "Glob", "LS"]:
        path = tool_input.get("path", "")
        if "/frontend" in path:
            return "frontend"
        elif "/backend" in path:
            return "backend"

    return None


def load_context_file(context_type):
    """
    Load the CLAUDE.md file for frontend or backend.
    Returns the content or None.
    """
    PROJECT_ROOT = get_project_root()

    if context_type == "frontend":
        context_file = PROJECT_ROOT / "frontend" / "CLAUDE.md"
    elif context_type == "backend":
        context_file = PROJECT_ROOT / "backend" / "CLAUDE.md"
    else:
        return None

    if context_file.exists():
        with open(context_file, "r") as f:
            return f.read()
    return None


def check_and_handle_first_context_operation(input_data):
    """
    Check if this is the first frontend/backend operation in the session.
    Returns a context message if it's the first operation, None otherwise.
    """
    # Check operation type
    operation_type = check_operation_type(input_data)
    if not operation_type:
        return None

    # Check session tracking file
    PROJECT_ROOT = get_project_root()
    session_file = PROJECT_ROOT / ".claude" / "logs" / "context_session_tracker.json"

    # Get session ID from input data
    session_id = input_data.get("session_id", "unknown")

    # Read existing session data
    session_contexts = {}
    if session_file.exists():
        try:
            with open(session_file, "r") as f:
                session_contexts = json.load(f)
        except Exception:
            session_contexts = {}

    # Check if this session has already seen this context type
    session_data = session_contexts.get(session_id, {})
    if operation_type in session_data:
        return None

    # This is the first operation of this type for this session
    if session_id not in session_contexts:
        session_contexts[session_id] = {}
    session_contexts[session_id][operation_type] = True

    # Save updated session data
    session_file.parent.mkdir(parents=True, exist_ok=True)
    with open(session_file, "w") as f:
        json.dump(session_contexts, f, indent=2)

    # Load appropriate CLAUDE.md
    context_content = load_context_file(operation_type)
    if context_content:
        if operation_type == "frontend":
            title = "📚 FRONTEND CONTEXT LOADED (First frontend operation in session)"
            footer = "This is the frontend-specific CLAUDE.md with WowDash template guidelines."
        else:  # backend
            title = "🔧 BACKEND CONTEXT LOADED (First backend operation in session)"
            footer = "This is the backend-specific CLAUDE.md with FastAPI development guidelines."

        return f"""{title}
{'='*60}
{context_content}
{'='*60}
{footer}"""

    return None


def check_models_changed(input_data):
    """
    Check if models.py was modified in this operation.
    Returns True if backend/app/models.py was changed.
    """
    tool_name = input_data.get("tool_name", "")
    tool_input = input_data.get("tool_input", {})

    # Check if this is a write operation
    write_operations = ["Write", "MultiEdit", "Edit", "NotebookEdit"]
    if tool_name not in write_operations:
        return False

    # Get file path from tool input
    file_path = tool_input.get("file_path", "") or tool_input.get("notebook_path", "")

    # Check if it's models.py
    if file_path.endswith("backend/app/models.py") or file_path.endswith(
        "backend/app/models/__init__.py"
    ):
        return True

    # Also check for models directory changes
    if "/backend/app/models/" in file_path and file_path.endswith(".py"):
        return True

    return False


def regenerate_schemas():
    """
    Regenerate OpenAPI schema and TypeScript client.
    Returns a message about the regeneration result.
    """
    PROJECT_ROOT = get_project_root()
    results = []

    try:
        # Step 1: Generate OpenAPI schema from FastAPI (matching generate-client.sh)
        result = subprocess.run(
            [
                "uv",
                "run",
                "python",
                "-c",
                "import app.main; import json; print(json.dumps(app.main.app.openapi()))",
            ],
            capture_output=True,
            text=True,
            cwd=PROJECT_ROOT / "backend",
            timeout=10,
        )

        if result.returncode == 0:
            # Save OpenAPI schema to frontend directory
            openapi_path = PROJECT_ROOT / "frontend" / "openapi.json"
            with open(openapi_path, "w") as f:
                f.write(result.stdout)
            results.append("✅ OpenAPI schema generated")

            # Step 2: Generate TypeScript client
            ts_result = subprocess.run(
                ["npm", "run", "generate-client"],
                capture_output=True,
                text=True,
                cwd=PROJECT_ROOT / "frontend",
                timeout=15,
            )

            if ts_result.returncode == 0:
                results.append("✅ TypeScript client regenerated")

                # Step 3: Format generated client code (matching generate-client.sh)
                format_result = subprocess.run(
                    ["npx", "biome", "format", "--write", "./src/client"],
                    capture_output=True,
                    text=True,
                    cwd=PROJECT_ROOT / "frontend",
                    timeout=10,
                )

                if format_result.returncode == 0:
                    results.append("✅ Client code formatted")
                else:
                    results.append(f"⚠️ Client formatting failed: {format_result.stderr[:200]}")
            else:
                results.append(
                    f"❌ TypeScript client generation failed: {ts_result.stderr[:500]}"
                )
        else:
            results.append(
                f"❌ OpenAPI schema generation failed: {result.stderr[:500]}"
            )

    except subprocess.TimeoutExpired:
        results.append("❌ Schema regeneration timed out")
    except Exception as e:
        results.append(f"❌ Schema regeneration error: {str(e)[:500]}")

    if results:
        return "\n".join(results)
    return None


def main():
    try:
        # Read JSON input from stdin
        input_data = json.load(sys.stdin)

        # Use dynamic project root for logs
        PROJECT_ROOT = get_project_root()
        log_dir = PROJECT_ROOT / ".claude" / "logs"
        log_dir.mkdir(parents=True, exist_ok=True)
        log_path = log_dir / "post_tool_use.json"

        # Check for first frontend/backend operation
        context_message = check_and_handle_first_context_operation(input_data)

        # Get tool name for linter check
        tool_name = input_data.get("tool_name", "")

        # Check if models.py was changed
        models_changed = check_models_changed(input_data)
        schema_regen_message = None
        if models_changed:
            regen_result = regenerate_schemas()
            if regen_result:
                schema_regen_message = f"""🔄 AUTO-REGENERATION (models.py changed)
{'='*60}
{regen_result}
{'='*60}
Schemas automatically regenerated due to models.py changes."""

        # Check if we should run linters (only on write operations)
        (
            should_run_linters,
            current_count,
            linter_operation_type,
        ) = manage_counter_and_check_linters(tool_name, input_data)

        # Determine if we have any context to show
        has_context = context_message is not None
        # Check if we should run linters
        _ = should_run_linters  # Variable used for condition checking
        has_schema_regen = schema_regen_message is not None

        # Combine all messages that need to be shown
        combined_messages = []

        # Add context message if present
        if has_context:
            combined_messages.append(context_message)

        # Add schema regeneration message if present
        if has_schema_regen:
            combined_messages.append(schema_regen_message)

        # Add linter results if needed
        if should_run_linters:
            # Run only the relevant linters based on operation type
            linter_results = run_linters(operation_type=linter_operation_type)

            # Always show linter status, even if no linters are found
            if linter_results or should_run_linters:
                # Save to log data
                input_data["linter_check"] = {
                    "run_number": current_count,
                    "results": linter_results,
                }

                # Format linter results for Claude
                linter_output = []
                linter_output.append(f"{'='*60}")
                linter_type_label = (
                    f" ({linter_operation_type})" if linter_operation_type else ""
                )
                linter_output.append(
                    f"🔍 LINTER CHECK{linter_type_label} (every 3rd {linter_operation_type or ''} write operation, #{current_count})"
                )
                linter_output.append(f"{'='*60}")

                has_errors = False

                if not linter_results:
                    linter_output.append("\n⚠️ No linters found or configured!")
                    linter_output.append("Please ensure:")
                    linter_output.append("  • Backend: uv run ruff / uv run mypy work")
                    linter_output.append("  • Frontend: npm run lint is configured")
                    has_errors = False  # No linters is not an error
                else:
                    for linter_name, result in linter_results.items():
                        status = "✅ PASS" if result["returncode"] == 0 else "❌ FAIL"
                        linter_output.append(f"\n{linter_name}: {status}")

                        if result["returncode"] != 0:
                            has_errors = True
                            # Show errors/warnings from both stdout and stderr
                            if result["stdout"]:
                                linter_output.append(result["stdout"])
                            if result["stderr"]:
                                linter_output.append(result["stderr"])

                linter_output.append(f"{'='*60}")

                # Save log data before potentially exiting with JSON output
                if log_path.exists():
                    with open(log_path, "r") as f:
                        try:
                            log_data = json.load(f)
                        except (json.JSONDecodeError, ValueError):
                            log_data = []
                else:
                    log_data = []

                log_data.append(input_data)

                with open(log_path, "w") as f:
                    json.dump(log_data, f, indent=2)

                # Add linter message to combined messages
                linter_message = "\n".join(linter_output)

                if has_errors:
                    combined_messages.append(
                        f"⚠️ LINTER ISSUES DETECTED:\n\n{linter_message}\n\nPlease fix these issues when you get a chance."
                    )
                else:
                    combined_messages.append(
                        f"✅ LINTER CHECK PASSED:\n\n{linter_message}\n\nAll linters passed successfully!"
                    )

        # Save logs if we haven't already
        if not should_run_linters:
            # Read existing log data or initialize empty list
            if log_path.exists():
                with open(log_path, "r") as f:
                    try:
                        log_data = json.load(f)
                    except (json.JSONDecodeError, ValueError):
                        log_data = []
            else:
                log_data = []

            # Append new data
            log_data.append(input_data)

            # Write back to file with formatting
            with open(log_path, "w") as f:
                json.dump(log_data, f, indent=2)

        # Output combined messages if any
        if combined_messages:
            final_message = "\n\n".join(combined_messages)
            output = {
                "hookSpecificOutput": {
                    "hookEventName": "PostToolUse",
                    "additionalContext": final_message,
                }
            }
            print(json.dumps(output))

        sys.exit(0)

    except json.JSONDecodeError:
        # Handle JSON decode errors gracefully
        sys.exit(0)
    except Exception:
        # Exit cleanly on any other error
        sys.exit(0)


if __name__ == "__main__":
    main()
