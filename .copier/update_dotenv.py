from pathlib import Path
import json
import secrets
import subprocess
import sys

# Update the .env file with the answers from the .copier-answers.yml file
# without using Jinja2 templates in the .env file, this way the code works as is
# without needing Copier, but if Copier is used, the .env file will be updated
root_path = Path(__file__).parent.parent
answers_path = Path(__file__).parent / ".copier-answers.yml"

# Copier uses JSON format in .copier-answers.yml despite the .yml extension
answers = json.loads(answers_path.read_text())

# Auto-generate secure passwords/secrets for empty or default values
SECURE_FIELDS = ["secret_key", "postgres_password", "first_superuser_password"]
for field in SECURE_FIELDS:
    # Check if field doesn't exist, is empty, None, or has default value
    # When user leaves field empty, Copier might not include it in answers at all
    current_value = answers.get(field, "")
    if not current_value or current_value == "changethis":
        if field == "postgres_password":
            # PostgreSQL passwords with special chars can break URL parsing
            # Use hex to avoid issues with =, /, + in connection strings
            answers[field] = secrets.token_hex(32)
            print(f"🔐 Generated secure {field.replace('_', ' ')} (hex format for PostgreSQL compatibility)")
        elif field == "first_superuser_password":
            # User passwords limited to 40 chars in database
            # token_urlsafe(24) generates 32 chars which fits the limit
            answers[field] = secrets.token_urlsafe(24)
            print(f"🔐 Generated secure {field.replace('_', ' ')} (32 chars)")
        else:
            # For secret_key and other fields, use urlsafe(24) for consistency
            answers[field] = secrets.token_urlsafe(24)
            print(f"🔐 Generated secure {field.replace('_', ' ')}")

# CORS configuration
domain = answers.get("domain", "localhost")
frontend_subdomain = answers.get("frontend_subdomain", "")

if domain and domain != "localhost":
    cors_origins = [
        # Local development
        "http://localhost",
        "http://localhost:5173",
        "http://localhost:3000",
    ]

    # Production origins based on frontend location
    if frontend_subdomain:
        # Frontend on subdomain (e.g., dashboard.example.com)
        cors_origins.append(f"https://{frontend_subdomain}.{domain}")
    else:
        # Frontend on root domain
        cors_origins.extend([
            f"https://{domain}",
            f"https://www.{domain}",
        ])

    answers["backend_cors_origins"] = ",".join(cors_origins)
else:
    # Local development only
    answers["backend_cors_origins"] = "http://localhost,http://localhost:5173,http://localhost:3000,https://localhost"

# Handle Traefik configuration (.env.traefik file)
traefik_env_path = root_path / ".env.traefik"
if traefik_env_path.exists():
    traefik_content = traefik_env_path.read_text()
    traefik_lines = []

    # Prepare Traefik-specific values
    traefik_values = {}
    if answers.get("traefik_email"):
        traefik_values["EMAIL"] = answers["traefik_email"]
    # USERNAME no longer needed - it's included in HASHED_PASSWORD

    # Generate htpasswd hash for Traefik dashboard
    if answers.get("traefik_username") and answers.get("first_superuser_password"):
        password = answers["first_superuser_password"]
        if password != "changethis":
            try:
                # Try to generate htpasswd hash using htpasswd command
                result = subprocess.run(
                    ["htpasswd", "-nbB", answers.get("traefik_username", "admin"), password],
                    capture_output=True,
                    text=True
                )
                if result.returncode == 0:
                    # htpasswd output format: username:hash
                    # Keep the full format and escape $ for docker-compose
                    hashed_full = result.stdout.strip()
                    traefik_values["HASHED_PASSWORD"] = hashed_full.replace("$", "$$")
                    print(f"🔐 Generated Traefik dashboard password hash")
            except (FileNotFoundError, OSError):
                # htpasswd not available, add instructions in comment
                print("⚠️  htpasswd not found. Traefik password hash not generated.")
                print(f"   Run 'htpasswd -nbB {answers.get('traefik_username', 'admin')} <password>' to generate")

    # Update .env.traefik file
    for line in traefik_content.splitlines():
        updated = False
        for key, value in traefik_values.items():
            if line.startswith(f"{key}="):
                traefik_lines.append(f"{key}={value}")
                updated = True
                break
        if not updated:
            # Special handling for HASHED_PASSWORD placeholder
            if line.startswith("HASHED_PASSWORD=") and "HASHED_PASSWORD" not in traefik_values:
                username = answers.get("traefik_username", "admin")
                traefik_lines.append(f"HASHED_PASSWORD=# Generate with: htpasswd -nbB {username} YOUR_PASSWORD")
            else:
                traefik_lines.append(line)

    traefik_env_path.write_text("\n".join(traefik_lines))
    print("✅ Updated .env.traefik for Traefik deployment")

# Update answers file with generated values
answers_path.write_text(json.dumps(answers, indent=2))

env_path = root_path / ".env"
env_content = env_path.read_text()
lines = []
for line in env_content.splitlines():
    updated = False
    for key, value in answers.items():
        upper_key = key.upper()
        if line.startswith(f"{upper_key}="):
            if " " in value:
                content = f"{upper_key}={value!r}"
            else:
                content = f"{upper_key}={value}"
            lines.append(content)
            updated = True
            break
    if not updated:
        lines.append(line)
env_path.write_text("\n".join(lines))
