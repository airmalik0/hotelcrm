#!/usr/bin/env python3
"""
Biome wrapper for concise output.
Summarizes biome errors instead of showing full verbose output.
"""

import subprocess
import sys
import json
import re
from pathlib import Path

def run_biome_check(cwd):
    """Run biome check and return parsed results."""
    try:
        result = subprocess.run(
            ["npx", "biome", "check", ".", "--reporter=json"],
            capture_output=True,
            text=True,
            timeout=15,
            cwd=cwd,
        )

        if result.returncode == 0:
            return {"success": True, "summary": "✅ All checks passed"}

        # Try to parse JSON output
        try:
            output = json.loads(result.stdout)
            return parse_biome_json_output(output)
        except json.JSONDecodeError:
            # Fallback to text parsing
            return parse_biome_text_output(result.stdout + result.stderr)

    except subprocess.TimeoutExpired:
        return {"success": False, "summary": "⏱️ Timeout: biome check took too long (>15s)"}
    except FileNotFoundError:
        return {"success": False, "summary": "❌ biome not installed"}
    except Exception as e:
        return {"success": False, "summary": f"❌ Error: {str(e)}"}

def parse_biome_json_output(output):
    """Parse biome JSON reporter output."""
    # Handle the JSON structure from biome
    summary = output.get("summary", {})
    diagnostics = output.get("diagnostics", [])

    errors = summary.get("errors", 0)
    warnings = summary.get("warnings", 0)

    if errors == 0 and warnings == 0:
        return {"success": True, "summary": "✅ All checks passed"}

    # Group errors by category
    error_types = {}
    for diag in diagnostics:
        category = diag.get("category", "unknown")
        if category not in error_types:
            error_types[category] = []

        # Extract file path and message
        location = diag.get("location", {})
        file_path = location.get("path", {}).get("file", "unknown") if isinstance(location.get("path"), dict) else "unknown"

        # Get message content
        messages = diag.get("message", [])
        if isinstance(messages, list) and messages:
            message = messages[0].get("content", "No message") if isinstance(messages[0], dict) else "No message"
        else:
            message = "No message"

        # Shorten file path - just show filename
        if "/" in file_path:
            file_path = file_path.split("/")[-1]

        error_types[category].append(f"{file_path}: {message[:50]}...")

    # Build summary
    summary_lines = [f"❌ FAIL: {errors} error(s), {warnings} warning(s)"]

    # Show categories with counts
    for category, items in sorted(error_types.items())[:5]:  # Top 5 categories
        summary_lines.append(f"  • {category}: {len(items)} issue(s)")

    if len(error_types) > 5:
        summary_lines.append(f"  ... and {len(error_types) - 5} more categories")

    summary_lines.append(f"\n💡 Run 'npx biome check' for full details")

    return {
        "success": False,
        "summary": "\n".join(summary_lines),
        "total_errors": errors
    }

def parse_biome_text_output(output):
    """Parse biome text output for a concise summary."""
    lines = output.split("\n")

    # Look for summary patterns
    error_count = 0
    warning_count = 0
    file_errors = {}

    for line in lines:
        # Check for error patterns
        if "error" in line.lower() or "×" in line:
            error_count += 1

            # Try to extract file name
            file_match = re.search(r"(\S+\.(ts|tsx|js|jsx|json))", line)
            if file_match:
                file_name = file_match.group(1).split("/")[-1]
                file_errors[file_name] = file_errors.get(file_name, 0) + 1

        # Check for summary line
        if "Found" in line and "error" in line:
            match = re.search(r"Found (\d+) error", line)
            if match:
                error_count = int(match.group(1))

    if error_count == 0:
        return {"success": True, "summary": "✅ All checks passed"}

    # Build concise summary
    summary_lines = [f"❌ FAIL: {error_count} error(s) found"]

    if file_errors:
        summary_lines.append("\nFiles with issues:")
        # Show top 5 files with most errors
        for file_name, count in sorted(file_errors.items(), key=lambda x: x[1], reverse=True)[:5]:
            summary_lines.append(f"  • {file_name} ({count} issue{'s' if count > 1 else ''})")

        if len(file_errors) > 5:
            summary_lines.append(f"  ... and {len(file_errors) - 5} more files")

    summary_lines.append("\n💡 Run 'npx biome check' for full details")

    return {
        "success": False,
        "summary": "\n".join(summary_lines),
        "total_errors": error_count
    }

def main():
    """Main function to run biome check with concise output."""
    # Get frontend directory
    script_path = Path(__file__).resolve()
    project_root = script_path.parent.parent.parent.parent
    frontend_dir = project_root / "frontend"

    if not frontend_dir.exists():
        print("❌ Frontend directory not found")
        return 1

    result = run_biome_check(frontend_dir)

    print(result["summary"])

    return 0 if result["success"] else 1

if __name__ == "__main__":
    sys.exit(main())
