# Project Nexus – Master Deployment Checklist

Single source of truth. Follow top to bottom. Do not skip steps.

Starting point: Fresh server, domains registered, nothing deployed.

End point: System live, verified, and documented.

---

## Phase 1: DNS Configuration

- [ ] **Log into your domain registrar**
  - Consult: Your registrar's documentation
  - Success: You can see the DNS settings for project-nexus.net

- [ ] **Create A record for api.project-nexus.net**
  - Consult: Your registrar's documentation
  - Success: A record points to your server IP

- [ ] **Create A record for uk.project-nexus.net**
  - Consult: Your registrar's documentation
  - Success: A record points to your server IP

- [ ] **Create A record for ie.project-nexus.net**
  - Consult: Your registrar's documentation
  - Success: A record points to your server IP

- [ ] **Create A record for app.project-nexus.net**
  - Consult: Your registrar's documentation
  - Success: A record points to your server IP

- [ ] **Create A record for admin.project-nexus.net** (optional)
  - Consult: Your registrar's documentation
  - Success: A record points to your server IP

- [ ] **Wait for DNS propagation**
  - Consult: Use nslookup to verify
  - Success: All domains resolve to your server IP

---

## Phase 2: Server Preparation

- [ ] **Log into Plesk**
  - Consult: PLESK_DEPLOYMENT.md
  - Success: You see the Plesk dashboard

- [ ] **Install .NET 8 Runtime**
  - Consult: PLESK_DEPLOYMENT.md (Server Setup section)
  - Success: .NET 8 appears in installed components

- [ ] **Install PostgreSQL**
  - Consult: PLESK_DEPLOYMENT.md (Server Setup section)
  - Success: PostgreSQL is available in Plesk

- [ ] **Create the production database**
  - Consult: PLESK_DEPLOYMENT.md (Server Setup section)
  - Success: Database named nexus_prod exists

---

## Phase 3: API Domain Setup

- [ ] **Add api.project-nexus.net domain in Plesk**
  - Consult: PLESK_EXECUTION.md (Section 1)
  - Success: Domain appears in Websites & Domains list

- [ ] **Install SSL certificate for api.project-nexus.net**
  - Consult: PLESK_EXECUTION.md (Section 2)
  - Success: Green padlock appears next to domain

- [ ] **Enable HTTPS redirect for api.project-nexus.net**
  - Consult: PLESK_EXECUTION.md (Section 3)
  - Success: HTTP redirects to HTTPS

- [ ] **Configure reverse proxy for api.project-nexus.net**
  - Consult: PLESK_EXECUTION.md (Section 4)
  - Success: No errors when saving nginx configuration

---

## Phase 4: API Deployment

- [ ] **Build the API locally**
  - Consult: CLAUDE.md (Commands section)
  - Success: Publish folder contains DLL files

- [ ] **Upload API files to server**
  - Consult: PLESK_DEPLOYMENT.md (Deploy Application section)
  - Success: Files visible in Plesk File Manager

- [ ] **Create appsettings.Production.json on server**
  - Consult: FRONTEND_INTEGRATION.md (CORS Configuration section)
  - Success: File exists with correct database and JWT settings

- [ ] **Verify CORS origins are correct**
  - Consult: FRONTEND_INTEGRATION.md (CORS Configuration section)
  - Success: All frontend domains listed, no internal services

- [ ] **Create systemd service for API**
  - Consult: PLESK_DEPLOYMENT.md (Process Management section)
  - Success: Service file exists at /etc/systemd/system/nexus-api.service

- [ ] **Enable and start the API service**
  - Consult: PLESK_DEPLOYMENT.md (Process Management section)
  - Success: Service status shows "active (running)"

- [ ] **Verify API health endpoint**
  - Consult: RECOVERY_GUIDE.md (Checking the API section)
  - Success: https://api.project-nexus.net/health returns "Healthy"

---

## Phase 5: Frontend Domains Setup

- [ ] **Add uk.project-nexus.net domain in Plesk**
  - Consult: PLESK_EXECUTION.md (Section 1)
  - Success: Domain appears in Websites & Domains list

- [ ] **Install SSL certificate for uk.project-nexus.net**
  - Consult: PLESK_EXECUTION.md (Section 2)
  - Success: Green padlock appears

- [ ] **Add ie.project-nexus.net domain in Plesk**
  - Consult: PLESK_EXECUTION.md (Section 1)
  - Success: Domain appears in Websites & Domains list

- [ ] **Install SSL certificate for ie.project-nexus.net**
  - Consult: PLESK_EXECUTION.md (Section 2)
  - Success: Green padlock appears

- [ ] **Add app.project-nexus.net domain in Plesk**
  - Consult: PLESK_EXECUTION.md (Section 1)
  - Success: Domain appears in Websites & Domains list

- [ ] **Install SSL certificate for app.project-nexus.net**
  - Consult: PLESK_EXECUTION.md (Section 2)
  - Success: Green padlock appears

- [ ] **Add admin.project-nexus.net domain in Plesk** (if needed)
  - Consult: PLESK_EXECUTION.md (Section 1)
  - Success: Domain appears in Websites & Domains list

- [ ] **Install SSL certificate for admin.project-nexus.net** (if needed)
  - Consult: PLESK_EXECUTION.md (Section 2)
  - Success: Green padlock appears

---

## Phase 6: Frontend Deployment

- [ ] **Build UK frontend locally**
  - Consult: Frontend project README
  - Success: Build folder contains index.html

- [ ] **Upload UK frontend files to server**
  - Consult: PLESK_DEPLOYMENT.md (Frontend Deployment section)
  - Success: Files visible in httpdocs folder

- [ ] **Build IE frontend locally**
  - Consult: Frontend project README
  - Success: Build folder contains index.html

- [ ] **Upload IE frontend files to server**
  - Consult: PLESK_DEPLOYMENT.md (Frontend Deployment section)
  - Success: Files visible in httpdocs folder

- [ ] **Build Modern frontend locally**
  - Consult: Frontend project README
  - Success: Build folder contains index.html

- [ ] **Upload Modern frontend files to server**
  - Consult: PLESK_DEPLOYMENT.md (Frontend Deployment section)
  - Success: Files visible in httpdocs folder

---

## Phase 7: Integration Verification

- [ ] **Verify UK frontend loads**
  - Consult: RECOVERY_GUIDE.md (Checking the Frontends section)
  - Success: https://uk.project-nexus.net shows the UI

- [ ] **Verify IE frontend loads**
  - Consult: RECOVERY_GUIDE.md (Checking the Frontends section)
  - Success: https://ie.project-nexus.net shows the UI

- [ ] **Verify Modern frontend loads**
  - Consult: RECOVERY_GUIDE.md (Checking the Frontends section)
  - Success: https://app.project-nexus.net shows the UI

- [ ] **Test login from UK frontend**
  - Consult: FRONTEND_INTEGRATION.md (Authentication Flow section)
  - Success: You can log in and see the dashboard

- [ ] **Test login from IE frontend**
  - Consult: FRONTEND_INTEGRATION.md (Authentication Flow section)
  - Success: You can log in and see the dashboard

- [ ] **Test login from Modern frontend**
  - Consult: FRONTEND_INTEGRATION.md (Authentication Flow section)
  - Success: You can log in and see the dashboard

- [ ] **Check browser console for CORS errors**
  - Consult: RECOVERY_GUIDE.md (Frontend Loads but API Fails section)
  - Success: No red CORS errors in DevTools console

---

## Phase 8: Security Verification

- [ ] **Confirm LLaMA service is not publicly accessible**
  - Consult: AI_SERVICE_BOUNDARY.md
  - Success: No public URL exists for the AI service

- [ ] **Confirm internal ports are blocked**
  - Consult: AI_SERVICE_BOUNDARY.md (How This is Enforced section)
  - Success: Port 5000 and 8000 are not reachable from the internet

- [ ] **Confirm all traffic uses HTTPS**
  - Consult: RECOVERY_GUIDE.md (Checking SSL Certificates section)
  - Success: All domains show green padlock

- [ ] **Confirm API service starts on boot**
  - Consult: PLESK_DEPLOYMENT.md (Process Management section)
  - Success: systemctl is-enabled nexus-api returns "enabled"

---

## Phase 9: Documentation

- [ ] **Record the server IP address**
  - Where: Keep in a secure location
  - Success: IP address is documented

- [ ] **Record the database credentials**
  - Where: Keep in a secure location (not in git)
  - Success: Credentials are documented securely

- [ ] **Record the JWT secret**
  - Where: Keep in a secure location (not in git)
  - Success: Secret is documented securely

- [ ] **Bookmark the health endpoint**
  - What: https://api.project-nexus.net/health
  - Success: Bookmark saved in browser

- [ ] **Note the SSL certificate expiry dates**
  - Where: Calendar reminder 30 days before expiry
  - Success: Reminders are set

---

## Final Verification

Before closing:

- [ ] All domains resolve correctly
- [ ] All domains have valid SSL certificates
- [ ] API health endpoint returns "Healthy"
- [ ] Login works from at least one frontend
- [ ] No CORS errors in browser console
- [ ] API service is enabled to start on boot
- [ ] Internal services are not publicly accessible
- [ ] Credentials are documented securely

---

## System is Live

If all boxes are checked, Project Nexus is deployed and verified.

Next steps:
- Monitor https://api.project-nexus.net/health daily
- Review RECOVERY_GUIDE.md if issues arise
- Keep this checklist updated as the system evolves
