# Project NEXUS Deployment Checklist

For solo developers. Follow in order. Check each box before moving on.

---

## Phase 1: Domain Setup

Do this first. Everything else depends on DNS being ready.

### 1.1 Register or access your domain

- [ ] **What:** Log into your domain registrar (Namecheap, GoDaddy, Cloudflare, etc.)
- **Why now:** You need to point domains to your server before anything else works.
- **Success:** You can see your DNS settings page.

### 1.2 Get your server IP address

- [ ] **What:** Find your Plesk server's public IP address.
- **Why now:** DNS records need this IP.
- **Success:** You have a number like `123.45.67.89`.

### 1.3 Create A records for all domains

- [ ] **What:** Add these A records pointing to your server IP:
  - `api.project-nexus.net`
  - `uk.project-nexus.net`
  - `ie.project-nexus.net`
  - `app.project-nexus.net`
  - `admin.project-nexus.net` (optional)
- **Why now:** DNS propagation takes time. Start it now.
- **Success:** Each A record shows your server IP in the DNS settings.

### 1.4 Wait for DNS propagation

- [ ] **What:** Wait 5-30 minutes. Check with `nslookup api.project-nexus.net`.
- **Why now:** SSL certificates won't work until DNS resolves.
- **Success:** The command returns your server IP, not an error.

---

## Phase 2: Plesk Server Setup

Do this second. The server needs to be ready before you deploy anything.

### 2.1 Log into Plesk

- [ ] **What:** Open your Plesk URL and log in as admin.
- **Why now:** You need Plesk access for everything else.
- **Success:** You see the Plesk dashboard.

### 2.2 Install .NET 8 Runtime

- [ ] **What:** Go to **Tools & Settings** → **Updates** → **.NET Runtime**. Install version 8.x.
- **Why now:** Your API won't run without it.
- **Success:** .NET 8 appears in the installed components list.

### 2.3 Install PostgreSQL (if not using external database)

- [ ] **What:** Go to **Tools & Settings** → **Updates** → **Database Servers**. Install PostgreSQL.
- **Why now:** Your API needs a database.
- **Success:** PostgreSQL appears as available in Plesk.

### 2.4 Create the database

- [ ] **What:** Go to **Databases** → **Add Database**. Name it `nexus_prod`.
- **Why now:** The API needs a database to connect to.
- **Success:** The database appears in your database list.

---

## Phase 3: API Domain Setup

Do this third. The API must be online before frontends can use it.

### 3.1 Add api.project-nexus.net in Plesk

- [ ] **What:** Go to **Websites & Domains** → **Add Domain**. Enter `api.project-nexus.net`.
- **Why now:** Plesk needs to know about this domain.
- **Success:** The domain appears in your domains list.

### 3.2 Install SSL certificate

- [ ] **What:** Click **SSL/TLS Certificates** → **Let's Encrypt** → **Install**.
- **Why now:** HTTPS is required for security.
- **Success:** Green padlock appears next to the domain.

### 3.3 Enable HTTPS redirect

- [ ] **What:** Go to **Hosting Settings** → Check "Permanent SEO-safe 301 redirect from HTTP to HTTPS".
- **Why now:** Force all traffic through HTTPS.
- **Success:** Visiting `http://api.project-nexus.net` redirects to `https://`.

### 3.4 Configure reverse proxy

- [ ] **What:** Go to **Apache & nginx Settings** → Paste the nginx proxy configuration.
- **Why now:** This connects the public domain to your internal API.
- **Success:** No errors when you click OK.

---

## Phase 4: API Deployment

Do this fourth. Get the API running before adding frontends.

### 4.1 Build the API locally

- [ ] **What:** Run `dotnet publish -c Release` on your development machine.
- **Why now:** You need compiled files to upload.
- **Success:** A `publish` folder appears with DLL files.

### 4.2 Upload API files to server

- [ ] **What:** Upload the `publish` folder contents to `/var/www/vhosts/project-nexus.net/api/`.
- **Why now:** The files need to be on the server to run.
- **Success:** You can see the files in Plesk File Manager.

### 4.3 Create appsettings.Production.json on server

- [ ] **What:** Create the production config file with real database credentials and JWT secret.
- **Why now:** The app needs production settings.
- **Success:** The file exists alongside the DLL files.

### 4.4 Create systemd service

- [ ] **What:** SSH into server and create `/etc/systemd/system/nexus-api.service`.
- **Why now:** This keeps your API running 24/7.
- **Success:** `sudo systemctl status nexus-api` shows the service exists.

### 4.5 Start the API service

- [ ] **What:** Run `sudo systemctl enable nexus-api && sudo systemctl start nexus-api`.
- **Why now:** The API needs to be running.
- **Success:** `sudo systemctl status nexus-api` shows "active (running)".

### 4.6 Verify API is accessible

- [ ] **What:** Visit `https://api.project-nexus.net/health` in your browser.
- **Why now:** Confirm the full chain works (DNS → Plesk → Nginx → Kestrel).
- **Success:** You see the word "Healthy".

---

## Phase 5: Frontend Domains Setup

Do this fifth. Now that the API works, add the frontends.

### 5.1 Add uk.project-nexus.net in Plesk

- [ ] **What:** Go to **Websites & Domains** → **Add Domain**. Enter `uk.project-nexus.net`.
- **Why now:** Setting up the first frontend.
- **Success:** The domain appears in your domains list.

### 5.2 Install SSL for uk.project-nexus.net

- [ ] **What:** Click **SSL/TLS Certificates** → **Let's Encrypt** → **Install**.
- **Why now:** HTTPS required.
- **Success:** Green padlock appears.

### 5.3 Repeat for other frontends

- [ ] **What:** Repeat steps 5.1-5.2 for:
  - `ie.project-nexus.net`
  - `app.project-nexus.net`
  - `admin.project-nexus.net` (if needed)
- **Why now:** All frontends need domains and SSL.
- **Success:** All domains have green padlocks.

---

## Phase 6: Frontend Deployment

Do this sixth. Deploy the actual frontend files.

### 6.1 Build frontend locally

- [ ] **What:** Run `npm run build` (or equivalent) for each frontend.
- **Why now:** You need compiled static files.
- **Success:** A `dist` or `build` folder appears.

### 6.2 Upload frontend files

- [ ] **What:** Upload the build folder contents to each domain's `httpdocs` folder.
- **Why now:** The files need to be on the server.
- **Success:** You can see `index.html` in each domain's folder.

### 6.3 Verify each frontend loads

- [ ] **What:** Visit each frontend URL in your browser.
- **Why now:** Confirm static files are served correctly.
- **Success:** You see the frontend UI (even if login fails).

---

## Phase 7: Integration Verification

Do this last. Confirm everything works together.

### 7.1 Test login from UK frontend

- [ ] **What:** Go to `https://uk.project-nexus.net` and try to log in.
- **Why now:** This tests the full flow: Frontend → API → Database.
- **Success:** You can log in and see your dashboard.

### 7.2 Test login from IE frontend

- [ ] **What:** Go to `https://ie.project-nexus.net` and try to log in.
- **Why now:** Confirm CORS works for all origins.
- **Success:** You can log in.

### 7.3 Test login from Modern frontend

- [ ] **What:** Go to `https://app.project-nexus.net` and try to log in.
- **Why now:** Confirm all frontends work.
- **Success:** You can log in.

### 7.4 Check browser console for errors

- [ ] **What:** Open browser DevTools (F12) → Console tab. Look for red errors.
- **Why now:** Catch any CORS or connection issues.
- **Success:** No red CORS errors or "Failed to fetch" messages.

### 7.5 Test API health endpoint

- [ ] **What:** Visit `https://api.project-nexus.net/health`.
- **Why now:** Final confirmation the API is healthy.
- **Success:** Shows "Healthy".

---

## Quick Reference: What to Check When Something Breaks

| Symptom | Likely Cause | Check This |
|---------|--------------|------------|
| "This site can't be reached" | DNS not propagated | `nslookup domain.com` |
| "502 Bad Gateway" | API not running | `sudo systemctl status nexus-api` |
| "CORS error" in console | Origin not in allowlist | `appsettings.Production.json` |
| "Connection refused" | Wrong port or firewall | Nginx config, firewall rules |
| SSL certificate error | Let's Encrypt failed | Plesk SSL/TLS settings |
| Login fails | Database connection | Check connection string |

---

## Final Checklist

Before you close your laptop:

- [ ] All 5 domains resolve (nslookup)
- [ ] All 5 domains have SSL (green padlock)
- [ ] API returns "Healthy"
- [ ] Login works from at least one frontend
- [ ] No CORS errors in browser console
- [ ] API service set to start on boot (`systemctl enable`)

---

## You're Done

If all boxes are checked, Project NEXUS is deployed and running.

Bookmark `https://api.project-nexus.net/health` and check it when you wake up.
