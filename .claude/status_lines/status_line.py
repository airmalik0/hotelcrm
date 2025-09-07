#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# ///

import json
import subprocess
import sys
from pathlib import Path

def get_project_root():
    """Find the project root directory."""
    current_path = Path(__file__).resolve()
    for parent in current_path.parents:
        if (parent / ".git").exists():
            return parent
    return current_path.parent.parent

def main():
    try:
        # Read JSON input from stdin (required by Claude Code)
        _ = json.loads(sys.stdin.read())

        # Get current working directory
        cwd = Path.cwd()
        project_root = get_project_root()

        # Create relative path if inside project
        try:
            relative_path = cwd.relative_to(project_root)
            if relative_path == Path("."):
                display_path = "~/"
            else:
                display_path = f"~/{relative_path}"
        except ValueError:
            display_path = str(cwd)

        # Get git branch if in git repo
        try:
            branch_result = subprocess.run(
                ["git", "rev-parse", "--abbrev-ref", "HEAD"],
                capture_output=True,
                text=True,
                timeout=1,
            )
            git_branch = branch_result.stdout.strip() if branch_result.returncode == 0 else None
        except Exception:
            git_branch = None

        # Build status line
        status_parts = []
        status_parts.append(f"📁 {display_path}")

        if git_branch:
            status_parts.append(f"🌿 {git_branch}")

        # Print plain text (not JSON)
        print(" │ ".join(status_parts))
        sys.exit(0)

    except Exception:
        # Return empty string on error
        print("")
        sys.exit(0)

if __name__ == "__main__":
    main()
