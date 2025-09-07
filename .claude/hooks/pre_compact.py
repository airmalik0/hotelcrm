#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = [
#     "python-dotenv",
# ]
# ///

import argparse
import json
import os
import sys
from pathlib import Path
from datetime import datetime

try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    pass  # dotenv is optional


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


def log_pre_compact(input_data):
    """Log pre-compact event to logs directory."""
    # Use dynamic project root for logs
    PROJECT_ROOT = get_project_root()
    log_dir = PROJECT_ROOT / ".claude" / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    log_file = log_dir / "pre_compact.json"

    # Read existing log data or initialize empty list
    if log_file.exists():
        with open(log_file, "r") as f:
            try:
                log_data = json.load(f)
            except (json.JSONDecodeError, ValueError):
                log_data = []
    else:
        log_data = []

    # Append the entire input data
    log_data.append(input_data)

    # Write back to file with formatting
    with open(log_file, "w") as f:
        json.dump(log_data, f, indent=2)


def backup_transcript(transcript_path, trigger):
    """Create a backup of the transcript before compaction."""
    try:
        if not os.path.exists(transcript_path):
            return

        # Create backup directory
        backup_dir = Path("logs") / "transcript_backups"
        backup_dir.mkdir(parents=True, exist_ok=True)

        # Generate backup filename with timestamp and trigger type
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        session_name = Path(transcript_path).stem
        backup_name = f"{session_name}_pre_compact_{trigger}_{timestamp}.jsonl"
        backup_path = backup_dir / backup_name

        # Copy transcript to backup
        import shutil

        shutil.copy2(transcript_path, backup_path)

        return str(backup_path)
    except Exception:
        return None


def main():
    try:
        # Parse command line arguments
        parser = argparse.ArgumentParser()
        parser.add_argument(
            "--backup",
            action="store_true",
            help="Create backup of transcript before compaction",
        )
        parser.add_argument(
            "--verbose", action="store_true", help="Print verbose output"
        )
        args = parser.parse_args()

        # Read JSON input from stdin
        input_data = json.loads(sys.stdin.read())

        # Extract fields
        session_id = input_data.get("session_id", "unknown")
        transcript_path = input_data.get("transcript_path", "")
        trigger = input_data.get("trigger", "unknown")  # "manual" or "auto"
        custom_instructions = input_data.get("custom_instructions", "")

        # Log the pre-compact event
        log_pre_compact(input_data)

        # Create backup if requested
        backup_path = None
        if args.backup and transcript_path:
            backup_path = backup_transcript(transcript_path, trigger)

        # Provide feedback based on trigger type
        if args.verbose:
            if trigger == "manual":
                message = (
                    f"Preparing for manual compaction (session: {session_id[:8]}...)"
                )
                if custom_instructions:
                    message += f"\nCustom instructions: {custom_instructions[:100]}..."
            else:  # auto
                message = f"Auto-compaction triggered due to full context window (session: {session_id[:8]}...)"

            if backup_path:
                message += f"\nTranscript backed up to: {backup_path}"

            print(message)

        # Success - compaction will proceed
        sys.exit(0)

    except json.JSONDecodeError:
        # Handle JSON decode errors gracefully
        sys.exit(0)
    except Exception:
        # Handle any other errors gracefully
        sys.exit(0)


if __name__ == "__main__":
    main()
