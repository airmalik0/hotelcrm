#!/usr/bin/env python3
"""Update .claude/settings.json with absolute paths after project creation."""

import json
import os
from pathlib import Path

# Get the project root (parent of .copier directory)
project_root = Path(__file__).parent.parent.resolve()
settings_file = project_root / ".claude" / "settings.json"

if settings_file.exists():
    # Read current settings
    with open(settings_file, "r") as f:
        settings = json.load(f)

    # Update statusLine command with absolute path
    if "statusLine" in settings and "command" in settings["statusLine"]:
        settings["statusLine"]["command"] = f"uv run {project_root}/.claude/status_lines/status_line.py"

    # Update all hook commands with absolute paths
    if "hooks" in settings:
        for hook_type, hook_configs in settings["hooks"].items():
            for config in hook_configs:
                if "hooks" in config:
                    for hook in config["hooks"]:
                        if "command" in hook and ".claude/hooks/" in hook["command"]:
                            # Extract the script name and arguments
                            parts = hook["command"].split(".claude/hooks/")
                            if len(parts) == 2:
                                script_and_args = parts[1]
                                hook["command"] = f"uv run {project_root}/.claude/hooks/{script_and_args}"

    # Write updated settings back
    with open(settings_file, "w") as f:
        json.dump(settings, f, indent=2)

    print(f"✅ Updated .claude/settings.json with absolute paths for: {project_root}")
else:
    print(f"⚠️  .claude/settings.json not found at {settings_file}")
