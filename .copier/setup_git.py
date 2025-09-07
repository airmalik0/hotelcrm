#!/usr/bin/env python3
"""
Setup git repository after project creation.
This script runs after the project is created from the template.
"""

import subprocess
import sys
from pathlib import Path


def run_command(cmd, cwd=None):
    """Run a shell command and return success status."""
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            cwd=cwd,
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            print(f"Error: {result.stderr}", file=sys.stderr)
        return result.returncode == 0
    except Exception as e:
        print(f"Error running command: {e}", file=sys.stderr)
        return False


def main():
    # Get the GitHub repository URL from Copier answers
    try:
        # Read the copier answers file
        answers_file = Path(".copier/.copier-answers.yml")
        if not answers_file.exists():
            print("No .copier-answers.yml found, skipping git setup")
            return

        import yaml
        with open(answers_file) as f:
            answers = yaml.safe_load(f)

        github_repo = answers.get("github_repository", "").strip()

        if not github_repo:
            print("No GitHub repository URL provided, skipping git setup")
            return

        print(f"Setting up GitHub repository: {github_repo}")

        # Check if .git exists and if it has the template's history
        if Path(".git").exists():
            # Check if remote already points to the template repo
            result = subprocess.run(
                "git remote get-url origin",
                shell=True,
                capture_output=True,
                text=True
            )
            if "template-fastapi" in result.stdout:
                # This is the template's git history, remove it
                print("Removing template's git history...")
                import shutil
                shutil.rmtree(".git")
            else:
                # User already has their own git repo
                print("Git repository already exists, updating remote...")
                run_command(f'git remote set-url origin "{github_repo}"')
                print(f"Updated remote origin to: {github_repo}")
                return

        # Initialize fresh git repository
        if not run_command("git init"):
            print("Failed to initialize git repository")
            return

        # Set default branch to main
        run_command("git branch -m main")

        # Add remote
        if not run_command(f'git remote add origin "{github_repo}"'):
            print("Failed to add git remote")
            return

        print("Git repository initialized successfully")
        print(f"Remote origin set to: {github_repo}")

        # Create initial commit
        if run_command("git add ."):
            run_command('git commit -m "Initial commit"')
            print("Created initial commit")

            # Try to push to remote
            print("\nPushing to GitHub...")
            push_result = subprocess.run(
                "git push -u origin main",
                shell=True,
                capture_output=True,
                text=True
            )

            if push_result.returncode == 0:
                print("✅ Successfully pushed to GitHub!")
                print(f"   Repository: {github_repo}")
            else:
                print("⚠️  Could not push to remote automatically")
                if "Permission denied" in push_result.stderr or "Authentication" in push_result.stderr:
                    print("   Authentication issue - make sure you have SSH keys set up")
                elif "already exists" in push_result.stderr:
                    print("   Remote branch already exists")
                else:
                    print(f"   Error: {push_result.stderr}")
                print("\n   To push manually, run:")
                print("   git push -u origin main")

    except ImportError:
        print("PyYAML not available, skipping git setup")
    except Exception as e:
        print(f"Error setting up git: {e}", file=sys.stderr)


if __name__ == "__main__":
    main()
