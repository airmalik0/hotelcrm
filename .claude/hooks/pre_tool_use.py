#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.8"
# ///

import json
import sys
import re
from pathlib import Path

# Removed dangerous_rm_command and env_file_access functions
# These restrictions have been disabled as requested


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


def check_python_pip_commands(tool_name, tool_input):
    """
    Check if user is trying to use python/pip commands and suggest uv instead.
    """
    if tool_name == "Bash":
        command = tool_input.get("command", "").lower()

        # Skip git commands - they might contain python patterns in commit messages
        if command.startswith(("git commit", "git rebase", "git merge")):
            return False

        # Skip if command uses uv properly
        # Check each command in a chain (split by && or ;)
        # to ensure uv is used before python in the same subcommand
        command_parts = re.split(r"[;&]|\|\|", command)

        for part in command_parts:
            part = part.strip()

            # If this part has python/pip but doesn't have uv, it's a violation
            python_patterns = [
                r"\bpython\s+-m\s+pip\b",
                r"\bpip\s+install\b",
                r"\bpip3\s+install\b",
                r"\bpython\s+-m\s+venv\b",
                r"\bvirtualenv\b",
                r"\bpipenv\b",
                r"\bpoetry\b",
                r"\bpip\s+freeze\b",
                r"\bpip\s+list\b",
                r"\bpython\d?\s+",  # python, python3, python2 with any args
                r"\bpython\d?\s*$",  # python interactive mode
            ]

            has_python = any(re.search(pattern, part) for pattern in python_patterns)
            has_uv = "uv " in part or part.startswith("uv")

            if has_python and not has_uv:
                return True

    return False


def main():
    try:
        # Read JSON input from stdin
        input_data = json.load(sys.stdin)

        tool_name = input_data.get("tool_name", "")
        tool_input = input_data.get("tool_input", {})

        # Check for Python/pip commands and suggest uv
        if check_python_pip_commands(tool_name, tool_input):
            # Block the command and show proper uv alternatives
            warning_msg = """❌ BLOCKED: This project uses 'uv' for Python package management!

Please use these alternatives:
• Instead of 'pip install X' → use: uv add X
• Instead of 'python -m venv' → use: uv venv
• Instead of 'pip freeze' → use: uv pip freeze
• Instead of 'python script.py' → use: uv run python script.py
• Instead of 'python3 -c "..."' → use: uv run python -c "..."

Your command was blocked to maintain consistency with the project's tooling."""
            print(warning_msg, file=sys.stderr)
            sys.exit(2)  # Block the command

        # Use absolute path for logs
        PROJECT_ROOT = get_project_root()
        log_dir = PROJECT_ROOT / ".claude" / "logs"
        log_dir.mkdir(parents=True, exist_ok=True)
        log_path = log_dir / "pre_tool_use.json"

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

        sys.exit(0)

    except json.JSONDecodeError:
        # Gracefully handle JSON decode errors
        sys.exit(0)
    except Exception:
        # Handle any other errors gracefully
        sys.exit(0)


if __name__ == "__main__":
    main()
