#!/usr/bin/env python3
"""
Install required system dependencies for the project.
This script runs during copier project creation.
"""
import subprocess
import sys
import os
import shutil
from pathlib import Path


def run_command(cmd, check=True, capture_output=True):
    """Run a shell command and return the result."""
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            check=check,
            capture_output=capture_output,
            text=True
        )
        return result
    except subprocess.CalledProcessError as e:
        if check:
            print(f"❌ Command failed: {cmd}")
            print(f"   Error: {e.stderr}")
        return None


def check_command_exists(command):
    """Check if a command exists in the system."""
    return shutil.which(command) is not None


def install_uv():
    """Install uv package manager if not already installed."""
    if check_command_exists("uv"):
        print("✅ uv is already installed")
        return True

    print("📦 Installing uv package manager...")

    # Try different installation methods
    # Method 1: Using curl (recommended)
    if check_command_exists("curl"):
        result = run_command("curl -LsSf https://astral.sh/uv/install.sh | sh", check=False)
        if result and result.returncode == 0:
            print("✅ uv installed successfully via curl")
            return True

    # Method 2: Using pip (fallback)
    if check_command_exists("pip") or check_command_exists("pip3"):
        pip_cmd = "pip3" if check_command_exists("pip3") else "pip"
        result = run_command(f"{pip_cmd} install uv", check=False)
        if result and result.returncode == 0:
            print("✅ uv installed successfully via pip")
            return True

    # Method 3: Using pipx (if available)
    if check_command_exists("pipx"):
        result = run_command("pipx install uv", check=False)
        if result and result.returncode == 0:
            print("✅ uv installed successfully via pipx")
            return True

    print("⚠️  Could not install uv automatically.")
    print("   Please install it manually:")
    print("   curl -LsSf https://astral.sh/uv/install.sh | sh")
    print("   or: pip install uv")
    print("   or: pipx install uv")
    return False


def check_docker():
    """Check if Docker is installed and provide hints if not."""
    if check_command_exists("docker"):
        print("✅ Docker is already installed")
        # Check Docker Compose
        result = run_command("docker compose version", check=False)
        if result and result.returncode == 0:
            print("✅ Docker Compose is already installed")
        else:
            print("⚠️  Docker Compose not found")
            print("   Install Docker Desktop or update Docker Engine")
        return True

    print("📌 Docker is not installed (optional but recommended)")
    print("   To use Docker for development, install it from:")
    print("   • Official guide: https://docs.docker.com/engine/install/")
    print("   • Quick install: curl -fsSL https://get.docker.com | sh")
    print("   • Or install Docker Desktop for a GUI experience")
    return False


def install_htpasswd():
    """Install htpasswd (apache2-utils) if not already installed."""
    if check_command_exists("htpasswd"):
        print("✅ htpasswd is already installed")
        return True

    print("📦 Installing htpasswd for password hashing...")

    # Detect OS and package manager
    if check_command_exists("apt-get"):
        # Debian/Ubuntu
        print("   Detected Debian/Ubuntu system")
        result = run_command("sudo apt-get update && sudo apt-get install -y apache2-utils", check=False)
        if result and result.returncode == 0:
            print("✅ htpasswd installed successfully")
            return True
    elif check_command_exists("yum"):
        # RHEL/CentOS/Fedora
        print("   Detected RHEL/CentOS/Fedora system")
        result = run_command("sudo yum install -y httpd-tools", check=False)
        if result and result.returncode == 0:
            print("✅ htpasswd installed successfully")
            return True
    elif check_command_exists("dnf"):
        # Newer Fedora
        print("   Detected Fedora system")
        result = run_command("sudo dnf install -y httpd-tools", check=False)
        if result and result.returncode == 0:
            print("✅ htpasswd installed successfully")
            return True
    elif check_command_exists("brew"):
        # macOS with Homebrew
        print("   Detected macOS with Homebrew")
        result = run_command("brew install httpd", check=False)
        if result and result.returncode == 0:
            print("✅ htpasswd installed successfully")
            return True
    elif check_command_exists("apk"):
        # Alpine Linux
        print("   Detected Alpine Linux")
        result = run_command("sudo apk add apache2-utils", check=False)
        if result and result.returncode == 0:
            print("✅ htpasswd installed successfully")
            return True
    elif check_command_exists("pacman"):
        # Arch Linux
        print("   Detected Arch Linux")
        result = run_command("sudo pacman -S --noconfirm apache", check=False)
        if result and result.returncode == 0:
            print("✅ htpasswd installed successfully")
            return True

    print("⚠️  Could not install htpasswd automatically.")
    print("   Please install it manually based on your OS:")
    print("   Ubuntu/Debian: sudo apt-get install apache2-utils")
    print("   RHEL/CentOS: sudo yum install httpd-tools")
    print("   Fedora: sudo dnf install httpd-tools")
    print("   macOS: brew install httpd")
    print("   Alpine: sudo apk add apache2-utils")
    print("   Arch: sudo pacman -S apache")
    return False


def install_project_dependencies():
    """Install Python and Node.js project dependencies.

    IMPORTANT: All tools (ruff, mypy, biome, etc.) are installed automatically
    via uv sync and npm install. This ensures Claude Code has access to all
    linting and formatting tools.
    """
    print("\n📦 Installing project dependencies...")

    # Get project root (parent of .copier directory)
    project_root = Path(__file__).parent.parent
    backend_dir = project_root / "backend"
    frontend_dir = project_root / "frontend"

    success = True

    # Install Python dependencies with uv
    if check_command_exists("uv"):
        print("\n🐍 Installing Python dependencies with uv...")
        if backend_dir.exists():
            os.chdir(backend_dir)
            # uv sync --dev installs ALL dependencies from uv.lock including dev tools
            result = run_command("uv sync --dev", check=False)
            if result and result.returncode == 0:
                print("✅ Python dependencies installed successfully")
                print("   Installed: ruff, mypy, pytest, and all other dependencies")
                # Quick verification
                verify = run_command("uv run ruff --version", check=False)
                if verify and verify.returncode == 0:
                    print("✅ Verified: Tools are available for Claude Code")
            else:
                print("❌ Failed to install Python dependencies")
                print("   Fix: cd backend && uv sync --dev")
                success = False
        else:
            print("⚠️  Backend directory not found")
            success = False
    else:
        print("❌ uv not installed - can't install Python dependencies")
        success = False

    # Install Node.js dependencies with npm
    if check_command_exists("npm"):
        print("\n📦 Installing Node.js dependencies with npm...")
        if frontend_dir.exists():
            os.chdir(frontend_dir)
            # npm install installs ALL dependencies from package-lock.json
            result = run_command("npm install", check=False)
            if result and result.returncode == 0:
                print("✅ Node.js dependencies installed successfully")
                print("   Installed: biome, typescript, and all other dependencies")
            else:
                print("❌ Failed to install Node.js dependencies")
                print("   Fix: cd frontend && npm install")
                success = False
        else:
            print("⚠️  Frontend directory not found")
            success = False
    else:
        print("⚠️  npm not installed - can't install frontend dependencies")
        print("   Install Node.js first: https://nodejs.org/")
        success = False

    # Return to project root
    os.chdir(project_root)

    return success


def main():
    """Main function to install all dependencies."""
    print("\n🚀 Setting up project...")
    print("=" * 50)

    # Check if running in CI/non-interactive environment
    if os.environ.get("CI") or not sys.stdin.isatty():
        print("ℹ️  Running in non-interactive mode, skipping dependency installation")
        print("   Please ensure uv and htpasswd are installed manually")
        return

    # Step 1: Install system tools
    print("\n📌 Step 1: Installing system tools...")
    uv_installed = install_uv()
    htpasswd_installed = install_htpasswd()

    # Step 2: Check Docker (don't install, just inform)
    print("\n📌 Step 2: Checking Docker...")
    docker_available = check_docker()

    # Step 3: Install project dependencies
    print("\n📌 Step 3: Installing project dependencies...")
    project_deps_installed = install_project_dependencies()

    # Summary
    print("\n" + "=" * 50)
    print("📊 Installation Summary:")
    print("=" * 50)

    if uv_installed and project_deps_installed:
        print("✅ All required dependencies installed successfully!")
        print("\n🎉 Your project is ready! Next steps:")
        if docker_available:
            print("   1. Start with Docker: docker compose up")
            print("   2. Or run separately:")
            print("      - Backend:  cd backend && uv run fastapi dev app/main.py")
            print("      - Frontend: cd frontend && npm run dev")
        else:
            print("   Run services directly:")
            print("   - Backend:  cd backend && uv run fastapi dev app/main.py")
            print("   - Frontend: cd frontend && npm run dev")
            print("\n   💡 Tip: Install Docker for easier development with docker compose")

        if not htpasswd_installed:
            print("\n   ⚠️  htpasswd not installed - Traefik password won't be auto-generated")
            print("      Install it for production deployments (see instructions above)")
    else:
        print("⚠️  Some required dependencies could not be installed")
        print("\nManual installation required:")
        if not uv_installed:
            print("   ❌ uv (REQUIRED): curl -LsSf https://astral.sh/uv/install.sh | sh")
        if not project_deps_installed:
            print("   ❌ Project dependencies (REQUIRED):")
            print("      - Python: cd backend && uv sync --dev")
            print("      - Node.js: cd frontend && npm install")
        if not docker_available:
            print("\n   💡 Docker (optional): https://docs.docker.com/engine/install/")
        if not htpasswd_installed:
            print("   ⚠️  htpasswd (NEEDED for Traefik hash generation): See instructions above")

    print()


if __name__ == "__main__":
    main()
