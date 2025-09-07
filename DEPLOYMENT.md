# Production Deployment Guide - Hotel CRM

This guide covers deploying this project to production.

## Prerequisites

### 1. Project Already Configured
This project was created with Copier and all configuration (.env file, passwords, hashes) has been generated.


### 2. GitHub Repository
Project repository: git@github.com:airmalik0/hotelcrm.git


### 3. DNS Configuration
Configure A records pointing to your server IP:

```
hotelcrm.pro           → SERVER_IP
www.hotelcrm.pro       → SERVER_IP
api.hotelcrm.pro       → SERVER_IP
dashboard.hotelcrm.pro → SERVER_IP
adminer.hotelcrm.pro   → SERVER_IP (optional, not recommended for production)
traefik.hotelcrm.pro  → SERVER_IP (optional, for Traefik dashboard)
```


## Server Directory Structure

```bash
/opt/
├── traefik/              # Traefik proxy (one per server)
│   ├── docker-compose.traefik.yml
│   └── .env              # Traefik configuration
└── hotelcrm/     # Your project
    ├── docker-compose.yml
    └── .env              # Project configuration
```

## Server Setup (one-time)

### 0. First SSH Connection
```bash
# Add server to known_hosts (prevents "Host key verification failed" error)
ssh-keyscan -H YOUR_SERVER_IP >> ~/.ssh/known_hosts

# Test connection
ssh root@YOUR_SERVER_IP
```

### 1. Install Docker
```bash
# Official Docker installation for Ubuntu (recommended method)
# Full guide: https://docs.docker.com/engine/install/ubuntu/

# Set up Docker's apt repository
sudo apt-get update
sudo apt-get install ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# Add the repository to apt sources
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update

# Install Docker and Docker Compose plugin
sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add current user to docker group (to run without sudo)
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version
docker compose version
```

### 2. Setup SSH Key for GitHub
```bash
# Generate SSH key if you don't have one
ssh-keygen -t ed25519 -C "server-deploy"

# Display public key
cat ~/.ssh/id_ed25519.pub

# Add GitHub to known hosts (prevents "Host key verification failed" error)
ssh-keyscan github.com >> ~/.ssh/known_hosts
```


Add this public key to your GitHub repository:
- Go to: git@github.com:airmalik0/hotelcrm.git/settings/keys
- Click "Add deploy key"
- Name: "Production Server"
- Key: (paste the public key)
- Allow write access: No (read-only is enough)


### 3. Deploy Traefik (once per server)
Traefik handles SSL certificates and routing for all projects on the server.

```bash
# Create directory for Traefik
sudo mkdir -p /opt/traefik
cd /opt/traefik

# Create shared network
docker network create traefik-public

# Copy Traefik configuration from project directory
# The docker-compose.traefik.yml file is included in your project
cp /path/to/your/project/docker-compose.traefik.yml .


# Check if password hash was generated during project creation
if [ -f /path/to/your/project/.env.traefik ] && grep -q '\$\$' /path/to/your/project/.env.traefik 2>/dev/null; then
  echo "✅ Password hash found in .env.traefik - copying to server"
  cp /path/to/your/project/.env.traefik .env
  echo "Traefik configuration ready!"
else
  echo "⚠️  Password hash not generated locally (htpasswd not installed)"
  echo "Installing htpasswd and generating password on server..."

  # Install htpasswd for password generation
  sudo apt-get update && sudo apt-get install -y apache2-utils

  # Create .env configuration for Traefik
  cat > .env << EOF
EMAIL=maik.yuldashev2004@gmail.com
DOMAIN=hotelcrm.pro
HASHED_PASSWORD=# Generate with command below
EOF

  # Generate password hash for Traefik dashboard
  htpasswd -nbB admin YOUR_PASSWORD
  # Copy the ENTIRE output (including "admin:") and update HASHED_PASSWORD in .env
  # Remember to escape all $ as $$ in the .env file
fi


# Start Traefik
docker compose -f docker-compose.traefik.yml up -d

# Check if running
docker ps | grep traefik
```

## Deploy Your Project

### 1. Clone and Configure
```bash
# Navigate to /opt directory
cd /opt


# Clone project (using deploy key)
git clone git@github.com:airmalik0/hotelcrm.git
cd hotelcrm


# Verify .env exists and has correct values
cat .env | grep -E "DOMAIN|POSTGRES_PASSWORD|SECRET_KEY"

# Update ENVIRONMENT to production
sed -i 's/ENVIRONMENT=local/ENVIRONMENT=production/' .env

# Update FRONTEND_HOST to production URL

sed -i 's|FRONTEND_HOST=.*|FRONTEND_HOST=https://dashboard.hotelcrm.pro|' .env

```

### 2. Start the Application
```bash
# ⚠️ IMPORTANT: Explicitly specify docker-compose.yml
# Never use just "docker compose up" as it will include override.yml
docker compose -f docker-compose.yml up -d

# Check if services are running
docker compose ps

# View logs
docker compose logs -f backend
docker compose logs -f frontend
```

### 3. Verify Deployment


- Frontend: https://dashboard.hotelcrm.pro

- API docs: https://api.hotelcrm.pro/docs
- Adminer: https://adminer.hotelcrm.pro (if enabled, not recommended)

- Traefik: https://traefik.hotelcrm.pro (if configured)



### Login Credentials
The admin user is created automatically on first start:
- **Username**: admin
- **Password**: Check your .env file (FIRST_SUPERUSER_PASSWORD)

## Common Issues and Solutions

### SSL Certificate Not Working
- **Issue**: Browser shows security warning
- **Check**: DNS propagation (can take up to 48 hours)
- **Solution**: Wait for DNS, or check Traefik logs:
```bash
docker compose -f docker-compose.traefik.yml logs traefik
```

### Database Connection Failed
- **Issue**: Backend can't connect to PostgreSQL
- **Check**: Password doesn't contain special characters
- **Solution**: Passwords were generated correctly by Copier

### Cannot Access Services
- **Issue**: Services return 404 or connection refused
- **Check**: All containers are running
```bash
docker compose ps
docker network ls | grep traefik-public
```

### Migration Issues
- **Issue**: Database migrations not applied
- **Solution**: Migrations run automatically via prestart.sh. Check logs:
```bash
docker compose logs prestart
```

## Maintenance

### Update Application
```bash
cd /opt/hotelcrm
git pull
docker compose -f docker-compose.yml down
docker compose -f docker-compose.yml up -d
```

### View Logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
```

### Backup Database
```bash
# Create backup
docker compose exec db pg_dump -U postgres app > backup_$(date +%Y%m%d).sql

# Restore backup
docker compose exec -T db psql -U postgres app < backup_20240101.sql
```

### SSL Certificate Renewal
Traefik handles automatic renewal via Let's Encrypt. No manual action needed.

### Change Traefik Dashboard Password
```bash
cd /opt/traefik
# Generate new password hash
htpasswd -nbB admin NEW_PASSWORD
# Update HASHED_PASSWORD in .env (remember to escape $ as $$)
nano .env
# Restart Traefik
docker compose -f docker-compose.traefik.yml restart
```

## Security Checklist

- [x] Strong passwords generated by Copier
- [ ] .env file not committed to git (verify)
- [ ] SSH key authentication for server
- [ ] Deploy keys (read-only) for GitHub
- [ ] HTTPS enforced via Traefik
- [ ] Database not exposed to internet
- [ ] Regular backups configured

- [x] Sentry configured for error monitoring


## Scaling

### Single Server
Current setup handles moderate traffic. For higher load:
- Increase server resources (CPU, RAM)
- Enable PostgreSQL connection pooling
- Add Redis for caching

### Multiple Servers
For horizontal scaling:
- Use external PostgreSQL (RDS, Cloud SQL)
- Deploy multiple backend instances
- Use cloud load balancer
- Consider Kubernetes for orchestration

## Password Troubleshooting

### PostgreSQL Connection Issues
If you manually changed `POSTGRES_PASSWORD` and get connection errors:
- **Problem**: Special characters like `=`, `/`, `+` break URL parsing
- **Solution**: Use hex passwords (only letters and numbers)
```bash
# Generate safe PostgreSQL password
openssl rand -hex 32
```

### Traefik Dashboard Auth Issues
If Traefik dashboard authentication fails:
- **Problem**: `$` symbols in hashed passwords are interpreted as variables
- **Solution**: Escape all `$` as `$$` in `.env` file
```bash
# Original hash from htpasswd
HASHED_PASSWORD=$2y$05$abc...

# Correct format in .env
HASHED_PASSWORD=$$2y$$05$$abc...
```
