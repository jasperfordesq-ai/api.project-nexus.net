# AI Service Deployment Guide - Plesk on Ubuntu

This guide covers deploying the Nexus API with AI features (Ollama/LLaMA) on a Plesk-managed Ubuntu server.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Server Requirements](#server-requirements)
3. [Architecture Overview](#architecture-overview)
4. [Step 1: Install Docker](#step-1-install-docker)
5. [Step 2: Install Ollama](#step-2-install-ollama)
6. [Step 3: Configure PostgreSQL](#step-3-configure-postgresql)
7. [Step 4: Deploy ASP.NET API](#step-4-deploy-aspnet-api)
8. [Step 5: Configure Nginx Reverse Proxy](#step-5-configure-nginx-reverse-proxy)
9. [Step 6: SSL Certificates](#step-6-ssl-certificates)
10. [Step 7: Environment Configuration](#step-7-environment-configuration)
11. [Step 8: Systemd Services](#step-8-systemd-services)
12. [Step 9: Monitoring & Logs](#step-9-monitoring--logs)
13. [Step 10: Security Hardening](#step-10-security-hardening)
14. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- Ubuntu 22.04 LTS or newer
- Plesk Obsidian 18.0+
- SSH root access
- Domain configured in Plesk
- At least 16GB RAM (8GB minimum for AI)
- 50GB+ free disk space

---

## Server Requirements

### Minimum (Small Community)
- **CPU:** 4 cores
- **RAM:** 8GB (AI will be slow)
- **Storage:** 30GB SSD
- **AI Response Time:** 30-60 seconds

### Recommended (Production)
- **CPU:** 8+ cores
- **RAM:** 16GB+
- **Storage:** 100GB SSD
- **AI Response Time:** 5-15 seconds

### With GPU (Optional - Fastest)
- **GPU:** NVIDIA with 8GB+ VRAM
- **RAM:** 16GB+
- **AI Response Time:** 1-5 seconds

---

## Architecture Overview

```
                                    [Internet]
                                        │
                                        ▼
                              ┌─────────────────┐
                              │   Plesk/Nginx   │
                              │   (Port 443)    │
                              └────────┬────────┘
                                       │
              ┌────────────────────────┼────────────────────────┐
              │                        │                        │
              ▼                        ▼                        ▼
    ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
    │   Nexus API     │     │   PostgreSQL    │     │    Ollama       │
    │  (Port 5080)    │────▶│   (Port 5432)   │     │  (Port 11434)   │
    │   ASP.NET 8     │     │                 │     │   LLaMA 3.2     │
    └─────────────────┘     └─────────────────┘     └─────────────────┘
              │                                              ▲
              └──────────────────────────────────────────────┘
                              HTTP API calls
```

---

## Step 1: Install Docker

SSH into your server and run:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker dependencies
sudo apt install -y ca-certificates curl gnupg

# Add Docker GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo \
  "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Start Docker
sudo systemctl enable docker
sudo systemctl start docker

# Verify
docker --version
docker compose version
```

---

## Step 2: Install Ollama

### Option A: Native Install (Recommended for Production)

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Verify installation
ollama --version

# Pull the model (this takes 5-10 minutes, ~2GB download)
ollama pull llama3.2:3b

# Verify model
ollama list
```

### Configure Ollama as Service

Create systemd service file:

```bash
sudo nano /etc/systemd/system/ollama.service
```

Content:
```ini
[Unit]
Description=Ollama AI Service
After=network.target

[Service]
Type=simple
User=ollama
Group=ollama
ExecStart=/usr/local/bin/ollama serve
Restart=always
RestartSec=3
Environment="OLLAMA_HOST=0.0.0.0"
Environment="OLLAMA_ORIGINS=*"

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
# Create ollama user
sudo useradd -r -s /bin/false -d /usr/share/ollama ollama

# Enable service
sudo systemctl daemon-reload
sudo systemctl enable ollama
sudo systemctl start ollama

# Verify
curl http://localhost:11434/api/tags
```

### Option B: Docker Install

```bash
# Create data directory
sudo mkdir -p /opt/ollama

# Run Ollama container
docker run -d \
  --name ollama \
  --restart always \
  -p 11434:11434 \
  -v /opt/ollama:/root/.ollama \
  ollama/ollama

# Pull model
docker exec ollama ollama pull llama3.2:3b
```

---

## Step 3: Configure PostgreSQL

### Using Plesk Database Server

1. Log into Plesk
2. Go to **Databases** > **Add Database**
3. Create database: `nexus_production`
4. Create user: `nexus_user`
5. Grant all privileges

### Using Docker (Alternative)

```bash
# Create data directory
sudo mkdir -p /opt/nexus/postgres

# Run PostgreSQL
docker run -d \
  --name nexus-db \
  --restart always \
  -p 5432:5432 \
  -v /opt/nexus/postgres:/var/lib/postgresql/data \
  -e POSTGRES_DB=nexus_production \
  -e POSTGRES_USER=nexus_user \
  -e POSTGRES_PASSWORD=<STRONG_PASSWORD> \
  postgres:16
```

---

## Step 4: Deploy ASP.NET API

### Create Deployment Directory

```bash
sudo mkdir -p /opt/nexus/api
sudo mkdir -p /opt/nexus/logs
```

### Build and Transfer Application

On your development machine:

```bash
# Build release
cd /path/to/asp.net-backend
dotnet publish src/Nexus.Api/Nexus.Api.csproj -c Release -o ./publish

# Transfer to server
scp -r ./publish/* user@your-server:/opt/nexus/api/
```

### Create Environment File

```bash
sudo nano /opt/nexus/.env
```

Content:
```bash
# Database
ConnectionStrings__DefaultConnection=Host=localhost;Port=5432;Database=nexus_production;Username=nexus_user;Password=<DB_PASSWORD>

# JWT - CRITICAL: Generate a strong secret!
JWT_SECRET=<YOUR_32_CHARACTER_SECRET_HERE>

# AI Service
LlamaService__BaseUrl=http://localhost:11434
LlamaService__Model=llama3.2:3b
LlamaService__TimeoutSeconds=180

# CORS - Add your domains
Cors__AllowedOrigins__0=https://yourdomain.com
Cors__AllowedOrigins__1=https://www.yourdomain.com

# Environment
ASPNETCORE_ENVIRONMENT=Production
ASPNETCORE_URLS=http://localhost:5080
```

### Create Systemd Service

```bash
sudo nano /etc/systemd/system/nexus-api.service
```

Content:
```ini
[Unit]
Description=Nexus API Service
After=network.target postgresql.service ollama.service

[Service]
Type=notify
User=www-data
Group=www-data
WorkingDirectory=/opt/nexus/api
ExecStart=/usr/bin/dotnet /opt/nexus/api/Nexus.Api.dll
Restart=always
RestartSec=10
EnvironmentFile=/opt/nexus/.env
KillSignal=SIGINT
SyslogIdentifier=nexus-api
TimeoutStopSec=30

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
# Install .NET Runtime
wget https://packages.microsoft.com/config/ubuntu/22.04/packages-microsoft-prod.deb -O packages-microsoft-prod.deb
sudo dpkg -i packages-microsoft-prod.deb
sudo apt update
sudo apt install -y aspnetcore-runtime-8.0

# Set permissions
sudo chown -R www-data:www-data /opt/nexus

# Enable service
sudo systemctl daemon-reload
sudo systemctl enable nexus-api
sudo systemctl start nexus-api

# Check status
sudo systemctl status nexus-api
```

---

## Step 5: Configure Nginx Reverse Proxy

### Option A: Through Plesk UI

1. Go to **Domains** > **your-domain.com** > **Apache & nginx Settings**
2. Add to **Additional nginx directives**:

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:5080;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # Timeouts for AI requests (long-running)
    proxy_connect_timeout 180s;
    proxy_send_timeout 180s;
    proxy_read_timeout 180s;

    # WebSocket support (if needed)
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}

location /health {
    proxy_pass http://127.0.0.1:5080;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
}
```

### Option B: Manual Nginx Config

```bash
sudo nano /etc/nginx/conf.d/nexus-api.conf
```

Content:
```nginx
upstream nexus_api {
    server 127.0.0.1:5080;
    keepalive 32;
}

server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://nexus_api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Long timeouts for AI
        proxy_connect_timeout 180s;
        proxy_send_timeout 180s;
        proxy_read_timeout 180s;
    }
}
```

Test and reload:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## Step 6: SSL Certificates

### Using Plesk (Easiest)

1. Go to **Domains** > **your-domain.com** > **SSL/TLS Certificates**
2. Click **Install** for Let's Encrypt
3. Enable **Keep website secured**

### Manual with Certbot

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

---

## Step 7: Environment Configuration

### Production Settings

Update `/opt/nexus/.env`:

```bash
# Production environment
ASPNETCORE_ENVIRONMENT=Production

# Strong JWT secret (generate with: openssl rand -base64 32)
JWT_SECRET=<YOUR_GENERATED_SECRET>

# Database
ConnectionStrings__DefaultConnection=Host=localhost;Port=5432;Database=nexus_production;Username=nexus_user;Password=<STRONG_PASSWORD>

# AI Service
LlamaService__BaseUrl=http://localhost:11434
LlamaService__Model=llama3.2:3b
LlamaService__TimeoutSeconds=180
LlamaService__MaxRetries=3
LlamaService__CircuitBreakerFailures=5
LlamaService__CircuitBreakerDurationSeconds=30
LlamaService__MaxPromptLength=4000

# Rate Limiting (production values)
RateLimiting__Auth__PermitLimit=5
RateLimiting__Auth__WindowSeconds=60
RateLimiting__General__PermitLimit=100
RateLimiting__General__WindowSeconds=60
RateLimiting__Ai__PermitLimit=10
RateLimiting__Ai__WindowSeconds=60

# CORS (your production domains)
Cors__AllowedOrigins__0=https://yourdomain.com
Cors__AllowedOrigins__1=https://www.yourdomain.com
Cors__AllowedOrigins__2=https://app.yourdomain.com

# Logging
Logging__LogLevel__Default=Warning
Logging__LogLevel__Microsoft.AspNetCore=Warning
```

Apply changes:
```bash
sudo systemctl restart nexus-api
```

---

## Step 8: Systemd Services

### Check All Services

```bash
# Check status
sudo systemctl status ollama
sudo systemctl status nexus-api

# View logs
sudo journalctl -u ollama -f
sudo journalctl -u nexus-api -f
```

### Service Management

```bash
# Restart API
sudo systemctl restart nexus-api

# Restart Ollama (may take time to reload model)
sudo systemctl restart ollama

# Stop all
sudo systemctl stop nexus-api ollama

# Start all
sudo systemctl start ollama && sleep 5 && sudo systemctl start nexus-api
```

---

## Step 9: Monitoring & Logs

### Log Files

```bash
# API logs
sudo journalctl -u nexus-api --since "1 hour ago"

# Ollama logs
sudo journalctl -u ollama --since "1 hour ago"

# Nginx access logs
tail -f /var/log/nginx/access.log

# Nginx error logs
tail -f /var/log/nginx/error.log
```

### Health Checks

```bash
# Check API health
curl http://localhost:5080/health

# Check AI status
curl http://localhost:11434/api/tags

# Full health check script
#!/bin/bash
echo "=== Nexus Health Check ==="
echo "API: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:5080/health)"
echo "Ollama: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:11434/api/tags)"
echo "PostgreSQL: $(pg_isready -h localhost -p 5432 && echo 'OK' || echo 'DOWN')"
```

### Monitoring with Plesk

1. Go to **Server Management** > **Services**
2. You can add custom service monitors for:
   - `nexus-api`
   - `ollama`

---

## Step 10: Security Hardening

### Firewall (UFW)

```bash
# Allow only necessary ports
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS

# Block direct access to internal services
sudo ufw deny 5080/tcp   # API (use nginx proxy)
sudo ufw deny 11434/tcp  # Ollama (internal only)
sudo ufw deny 5432/tcp   # PostgreSQL (internal only)

# Enable firewall
sudo ufw enable
```

### Secure Environment File

```bash
sudo chmod 600 /opt/nexus/.env
sudo chown www-data:www-data /opt/nexus/.env
```

### Ollama Security

Bind Ollama to localhost only:

```bash
sudo nano /etc/systemd/system/ollama.service
```

Change:
```ini
Environment="OLLAMA_HOST=127.0.0.1"
```

Reload:
```bash
sudo systemctl daemon-reload
sudo systemctl restart ollama
```

---

## Troubleshooting

### API Won't Start

```bash
# Check logs
sudo journalctl -u nexus-api -n 50

# Common issues:
# 1. Missing .NET runtime
dotnet --list-runtimes

# 2. Wrong permissions
sudo chown -R www-data:www-data /opt/nexus

# 3. Port already in use
sudo lsof -i :5080

# 4. Environment variables not loaded
sudo systemctl show nexus-api --property=Environment
```

### AI Responses Timeout

```bash
# Check Ollama status
curl http://localhost:11434/api/tags

# Check model is loaded
ollama list

# Test AI directly
curl -X POST http://localhost:11434/api/chat -d '{
  "model": "llama3.2:3b",
  "messages": [{"role": "user", "content": "Hi"}],
  "stream": false
}'

# Check memory usage
free -h
htop
```

### Database Connection Issues

```bash
# Test connection
psql -h localhost -U nexus_user -d nexus_production -c "SELECT 1;"

# Check PostgreSQL status
sudo systemctl status postgresql

# Check connection string
grep ConnectionStrings /opt/nexus/.env
```

### High Memory Usage

```bash
# Check what's using memory
ps aux --sort=-%mem | head -10

# Restart Ollama (frees VRAM/RAM)
sudo systemctl restart ollama

# If out of memory, consider:
# 1. Adding swap space
# 2. Using a smaller model
# 3. Upgrading server RAM
```

### 502 Bad Gateway

```bash
# Check if API is running
curl http://localhost:5080/health

# Check nginx config
sudo nginx -t

# Check nginx logs
tail -f /var/log/nginx/error.log

# Verify proxy settings in Plesk
```

---

## Quick Reference Commands

```bash
# Deploy new version
cd /opt/nexus/api
sudo systemctl stop nexus-api
# Upload new files...
sudo systemctl start nexus-api

# View live logs
sudo journalctl -u nexus-api -f

# Restart everything
sudo systemctl restart ollama nexus-api

# Check disk space
df -h

# Check memory
free -h

# Pull new AI model
ollama pull llama3.2:3b

# Database backup
pg_dump -h localhost -U nexus_user nexus_production > backup.sql

# Rotate logs
sudo journalctl --vacuum-time=7d
```

---

## Support

For issues:
1. Check the logs first
2. Review this guide's troubleshooting section
3. See [RECOVERY_GUIDE.md](./RECOVERY_GUIDE.md) for system recovery
4. Check [AI_SERVICE_BOUNDARY.md](./AI_SERVICE_BOUNDARY.md) for security guidance
