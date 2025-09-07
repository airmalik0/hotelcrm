#!/usr/bin/env python3
"""
Common utilities for Claude hooks.
This file provides shared functions that can be imported by other hooks.
"""

from pathlib import Path


def get_project_root():
    """
    Find the project root directory by looking for key files.
    Starts from current script location and walks up the directory tree.

    Returns:
        Path: The project root directory
    """
    # Start from the .claude/hooks directory
    current_path = Path(__file__).resolve().parent

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
    # Go up two levels: hooks -> .claude -> project_root
    return current_path.parent.parent


def ensure_logs_dir():
    """
    Ensure the .claude/logs directory exists.

    Returns:
        Path: The logs directory path
    """
    project_root = get_project_root()
    log_dir = project_root / ".claude" / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    return log_dir
