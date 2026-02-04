# Deploying Project NEXUS API with Plesk

This guide explains how to deploy the ASP.NET Core API using Plesk. Written for developers familiar with WordPress/shared hosting who are new to application servers.

---

## What is a Reverse Proxy? (Plain English)

Think of a reverse proxy like a **receptionist at a hotel**.

When guests (web browsers) arrive, they don't walk directly to rooms (your applications). Instead, they go to the front desk (reverse proxy). The receptionist:

1. Checks their ID (SSL certificate / HTTPS)
2. Looks up which room they need (routing rules)
3. Escorts them to the right room (forwards the request)
4. Brings back the response

**In WordPress terms:** You're used to Apache/Nginx serving PHP files directly. With ASP.NET, the web server (Apache/Nginx) doesn't run your code. Instead, it forwards requests to a separate application (Kestrel) running on an internal port.

```text
WordPress way:
  Browser → Apache → PHP → Database

ASP.NET way:
  Browser → Nginx (reverse proxy) → Kestrel (localhost:5000) → Database
```

**Why bother?** Because:

- Your app runs independently (can restart without affecting the web server)
- Multiple apps can run on different ports
- SSL termination happens once at the proxy
- Better security (internal ports aren't exposed)

---

## What Role Does Plesk Play?

Plesk is your **control panel** that manages:

| Component | What It Does |
|-----------|--------------|
| **Nginx** | Receives HTTPS requests, forwards to your app |
| **Let's Encrypt** | Free SSL certificates (auto-renewed) |
| **Domain routing** | Maps `api.project-nexus.net` → `localhost:5000` |
| **Process management** | Keeps your ASP.NET app running |

**Think of it like cPanel**, but with support for .NET applications.

Plesk sits between the internet and your applications:

```text
┌─────────────────────────────────────────────────────────────────┐
│                         THE INTERNET                            │
│                    (browsers, mobile apps)                      │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ HTTPS (port 443)
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         PLESK SERVER                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Nginx (Web Server)                    │   │
│  │         • Receives all HTTPS traffic                     │   │
│  │         • Terminates SSL (decrypts HTTPS)                │   │
│  │         • Routes requests to correct app                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                │                                │
│          ┌─────────────────────┼─────────────────────┐         │
│          │                     │                     │         │
│          ▼                     ▼                     ▼         │
│   ┌─────────────┐      ┌─────────────┐      ┌─────────────┐   │
│   │ ASP.NET API │      │   Frontend  │      │   LLaMA     │   │
│   │ port 5000   │      │   (static)  │      │  port 8000  │   │
│   │ (internal)  │      │             │      │ (internal)  │   │
│   └─────────────┘      └─────────────┘      └─────────────┘   │
│                                │                                │
│                                ▼                                │
│                        ┌─────────────┐                         │
│                        │ PostgreSQL  │                         │
│                        │ port 5432   │                         │
│                        └─────────────┘                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Architecture Diagram (project-nexus.net)

```text
                    ┌─────────────────────────────────────┐
                    │          USER'S BROWSER             │
                    └─────────────────────────────────────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          │                           │                           │
          ▼                           ▼                           ▼
┌───────────────────┐    ┌───────────────────┐    ┌───────────────────┐
│ uk.project-nexus  │    │ ie.project-nexus  │    │ app.project-nexus │
│      .net         │    │      .net         │    │      .net         │
│  (GOV.UK style)   │    │  (GOV.IE style)   │    │  (Modern SPA)     │
└───────────────────┘    └───────────────────┘    └───────────────────┘
          │                           │                           │
          │         JavaScript fetch() calls to API               │
          │                           │                           │
          └───────────────────────────┼───────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                 https://api.project-nexus.net                       │
│                      (PUBLIC API ENDPOINT)                          │
│                                                                     │
│                    Plesk Nginx (HTTPS 443)                          │
│                    Let's Encrypt SSL certificate                    │
└─────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ Proxy pass (internal)
                                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     http://localhost:5000                           │
│                     ASP.NET Core API (Kestrel)                      │
│                     (NOT accessible from internet)                  │
└─────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    │                                   │
                    ▼                                   ▼
┌───────────────────────────────┐    ┌───────────────────────────────┐
│      PostgreSQL Database      │    │    LLaMA AI Service           │
│      localhost:5432           │    │    localhost:8000             │
│      (internal only)          │    │    (internal only)            │
└───────────────────────────────┘    └───────────────────────────────┘
```

### Domain Summary

| Domain | Purpose | Points To |
|--------|---------|-----------|
| `api.project-nexus.net` | ASP.NET API | Plesk → localhost:5000 |
| `uk.project-nexus.net` | UK frontend | Static files or Node.js |
| `ie.project-nexus.net` | Ireland frontend | Static files or Node.js |
| `app.project-nexus.net` | Modern SPA | Static files |
| `admin.project-nexus.net` | Admin dashboard | Static files or Node.js |

---

## Step-by-Step: Deploy api.project-nexus.net in Plesk

### Prerequisites

- Plesk Obsidian (latest version recommended)
- .NET 8 Runtime installed on server
- DNS A record pointing `api.project-nexus.net` to your server IP

### Step 1: Add the Domain

1. Log into Plesk
2. Click **"Add Domain"** (or "Add Subdomain" if project-nexus.net already exists)
3. Enter: `api.project-nexus.net`
4. Choose **"Hosting type: No hosting"** (we'll configure this manually)
5. Click **OK**

### Step 2: Enable Let's Encrypt SSL

1. Go to **Websites & Domains** → `api.project-nexus.net`
2. Click **SSL/TLS Certificates**
3. Click **"Install"** next to Let's Encrypt
4. Check **"Secure the domain"**
5. Check **"Include www..."** (optional, usually not needed for API)
6. Click **"Get it free"**
7. Wait for certificate to install (usually 30 seconds)

### Step 3: Configure Reverse Proxy

1. Go to **Websites & Domains** → `api.project-nexus.net`
2. Click **Apache & nginx Settings**
3. Scroll to **"Additional nginx directives"**
4. Paste this configuration:

```nginx
location / {
    proxy_pass http://127.0.0.1:5000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection keep-alive;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}
```

5. Click **OK**

**What this does:**

| Line | Meaning |
|------|---------|
| `proxy_pass http://127.0.0.1:5000` | Forward requests to your ASP.NET app |
| `proxy_set_header Host $host` | Tell the app which domain was requested |
| `proxy_set_header X-Forwarded-Proto $scheme` | Tell the app if request was HTTPS |
| `proxy_set_header X-Real-IP $remote_addr` | Pass the real client IP address |

### Step 4: Deploy Your ASP.NET Application

1. Publish your app locally:
   ```bash
   dotnet publish -c Release -o ./publish
   ```

2. Upload the `publish` folder contents to your server (via FTP or Plesk File Manager)
   - Typical path: `/var/www/vhosts/project-nexus.net/api/`

3. Create a systemd service to run your app (SSH required):

   ```bash
   sudo nano /etc/systemd/system/nexus-api.service
   ```

   Paste:
   ```ini
   [Unit]
   Description=Project NEXUS API
   After=network.target

   [Service]
   WorkingDirectory=/var/www/vhosts/project-nexus.net/api
   ExecStart=/usr/bin/dotnet /var/www/vhosts/project-nexus.net/api/Nexus.Api.dll
   Restart=always
   RestartSec=10
   SyslogIdentifier=nexus-api
   User=www-data
   Environment=ASPNETCORE_ENVIRONMENT=Production
   Environment=ASPNETCORE_URLS=http://localhost:5000

   [Install]
   WantedBy=multi-user.target
   ```

4. Enable and start the service:
   ```bash
   sudo systemctl enable nexus-api
   sudo systemctl start nexus-api
   sudo systemctl status nexus-api
   ```

### Step 5: Verify It Works

1. Visit `https://api.project-nexus.net/health`
2. You should see: `Healthy`

If you see an error:
- Check the service status: `sudo systemctl status nexus-api`
- Check logs: `sudo journalctl -u nexus-api -f`

---

## How Frontends Communicate with the API

All frontend applications (uk, ie, app) make **HTTP requests** to the API.

### The Flow

```text
1. User visits https://uk.project-nexus.net
2. Browser loads HTML, CSS, JavaScript
3. JavaScript runs: fetch('https://api.project-nexus.net/api/auth/login', {...})
4. Browser sends request to api.project-nexus.net
5. Plesk/Nginx receives request on port 443
6. Nginx forwards to localhost:5000 (your ASP.NET app)
7. ASP.NET processes request, returns JSON
8. Nginx sends response back to browser
9. JavaScript updates the page with the data
```

### CORS Makes This Possible

Because the frontend (uk.project-nexus.net) and API (api.project-nexus.net) are different domains, the browser blocks requests by default. This is called **Same-Origin Policy**.

CORS (Cross-Origin Resource Sharing) tells the browser: "It's OK, I trust requests from these domains."

Your API's `appsettings.Production.json`:

```json
{
  "Cors": {
    "AllowedOrigins": [
      "https://uk.project-nexus.net",
      "https://ie.project-nexus.net",
      "https://app.project-nexus.net",
      "https://admin.project-nexus.net"
    ]
  }
}
```

### What About Mobile Apps?

Mobile apps (iOS/Android) make direct HTTP requests. They don't run in a browser, so CORS doesn't apply. They just call `https://api.project-nexus.net/...` directly.

---

## Common Beginner Mistakes

### 1. Exposing Internal Ports to the Internet

```text
❌ WRONG: Opening port 5000 in your firewall
   Anyone can access http://your-server-ip:5000

✅ CORRECT: Keep port 5000 blocked
   Only Nginx (on the same server) can reach it
```

**Why it matters:** Internal ports bypass SSL. Data would be transmitted unencrypted.

### 2. Running the App as Root

```text
❌ WRONG: User=root in your systemd service

✅ CORRECT: User=www-data (or a dedicated service account)
```

**Why it matters:** If your app gets hacked, the attacker gets root access to your entire server.

### 3. Forgetting to Set ASPNETCORE_ENVIRONMENT

```text
❌ WRONG: No environment set (defaults to Production, but no config loaded)

✅ CORRECT: Environment=ASPNETCORE_ENVIRONMENT=Production
```

**Why it matters:** The app won't load `appsettings.Production.json`, so CORS won't work.

### 4. Hardcoding localhost in Frontend Code

```javascript
// ❌ WRONG: Will only work on your computer
const API_URL = 'http://localhost:5000';

// ✅ CORRECT: Use environment variables or config
const API_URL = 'https://api.project-nexus.net';
```

### 5. Adding Internal Services to CORS

```json
// ❌ WRONG: LLaMA is internal, not browser-facing
{
  "AllowedOrigins": [
    "https://uk.project-nexus.net",
    "http://localhost:8000"  // ← This is wrong!
  ]
}
```

**Why it matters:** CORS is for browsers. Internal services use server-to-server HTTP.

### 6. Not Enabling HTTPS Redirect

Make sure your Plesk domain settings redirect HTTP to HTTPS:

1. Go to **Websites & Domains** → `api.project-nexus.net`
2. Click **Hosting Settings**
3. Enable **"Permanent SEO-safe 301 redirect from HTTP to HTTPS"**

### 7. Forgetting to Update DNS

Before Plesk can issue an SSL certificate:

1. Your domain's DNS must point to your server
2. DNS propagation can take up to 48 hours (usually faster)

Check with: `nslookup api.project-nexus.net`

### 8. Using the Wrong .NET Version

```bash
# Check what's installed
dotnet --list-runtimes

# You need:
# Microsoft.AspNetCore.App 8.x.x
```

If missing, install .NET 8 Runtime on your server.

---

## Quick Reference: All Domains

| Domain | Type | Plesk Config | Internal Target |
|--------|------|--------------|-----------------|
| `api.project-nexus.net` | API | Nginx proxy | localhost:5000 |
| `uk.project-nexus.net` | Frontend | Static hosting | (none) |
| `ie.project-nexus.net` | Frontend | Static hosting | (none) |
| `app.project-nexus.net` | Frontend | Static hosting | (none) |
| `admin.project-nexus.net` | Frontend | Static hosting | (none) |

---

## Troubleshooting

### "502 Bad Gateway"

The API isn't running or Nginx can't reach it.

```bash
# Check if the app is running
sudo systemctl status nexus-api

# Check if it's listening on port 5000
sudo netstat -tlnp | grep 5000

# Check app logs
sudo journalctl -u nexus-api --since "10 minutes ago"
```

### "CORS error" in Browser Console

The API is rejecting requests from your frontend domain.

1. Check `appsettings.Production.json` has the correct origins
2. Make sure there's no trailing slash: `https://uk.project-nexus.net` not `https://uk.project-nexus.net/`
3. Restart the API after config changes

### "Connection refused"

The app crashed or isn't bound to the right port.

```bash
# Check the environment variable
cat /etc/systemd/system/nexus-api.service | grep URLS

# Should show:
# Environment=ASPNETCORE_URLS=http://localhost:5000
```

### SSL Certificate Won't Issue

1. Verify DNS points to your server: `nslookup api.project-nexus.net`
2. Make sure port 80 is open (Let's Encrypt uses HTTP challenge)
3. Try again in Plesk: SSL/TLS Certificates → Reissue

---

## Next Steps

1. **Deploy the frontends** - Upload static files to each subdomain
2. **Set up PostgreSQL** - Use Plesk's database tools
3. **Configure monitoring** - Set up health checks and alerts
4. **Enable backups** - Plesk has built-in backup tools

---

## Summary

| Concept | Plain English |
|---------|---------------|
| Reverse Proxy | A receptionist that routes requests to the right app |
| Kestrel | The engine that runs your ASP.NET code |
| CORS | Permission slip for browsers to call your API |
| systemd | Keeps your app running 24/7 |
| Let's Encrypt | Free SSL certificates |
| Nginx | The web server that handles HTTPS |
