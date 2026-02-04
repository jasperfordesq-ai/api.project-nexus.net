# How to Verify and Recover Project Nexus

For when something is broken and you need to fix it calmly.

---

## Part 1: How to Tell the System is Healthy

A healthy system has all of these true:

1. The API health endpoint returns "Healthy"
2. All frontend URLs load without errors
3. All domains show a green padlock in the browser
4. You can log in from at least one frontend
5. The browser console shows no red CORS errors

If all five are true, the system is working. Stop checking and go do something else.

---

## Part 2: How to Check Each Component

### Checking the API

Open your browser and go to:

```
https://api.project-nexus.net/health
```

**If you see "Healthy":** The API is running and reachable.

**If you see "502 Bad Gateway":** The API process is not running.

**If you see "This site can't be reached":** DNS or Plesk is misconfigured.

**If you see a certificate error:** SSL has expired or is misconfigured.

### Checking the Frontends

Visit each frontend URL in your browser:

- https://uk.project-nexus.net
- https://ie.project-nexus.net
- https://app.project-nexus.net

**If the page loads:** The frontend is deployed correctly.

**If you see a blank page:** Check if the static files are in the httpdocs folder.

**If you see a Plesk default page:** The domain is configured but no files are uploaded.

### Checking SSL Certificates

Look at the address bar in your browser.

**Green padlock:** SSL is valid.

**Red warning or "Not Secure":** SSL has expired or failed.

To check expiry dates, click the padlock icon and view certificate details.

---

## Part 3: What to Do When Things Break

### Scenario: API is Unreachable

You see "502 Bad Gateway" or "This site can't be reached."

**Step 1:** Check if the API service is running.

SSH into the server and check the service status. Look for "active (running)" or an error message.

**Step 2:** If the service is stopped, start it.

The service may have crashed. Starting it usually fixes the issue.

**Step 3:** If the service won't start, check the logs.

The logs will tell you why it crashed. Common causes:
- Database connection failed
- Missing configuration file
- Port already in use

**Step 4:** If the service is running but still unreachable, check Nginx.

The reverse proxy may have stopped or lost its configuration. Restart Nginx from Plesk.

---

### Scenario: Frontend Loads but API Fails

The frontend appears but login fails or data doesn't load.

**Step 1:** Open browser DevTools (F12) and check the Console tab.

Look for red error messages.

**Step 2:** If you see "CORS error" or "blocked by CORS policy":

The frontend's origin is not in the API's allowed list. Check appsettings.Production.json on the server. Make sure the frontend URL is listed exactly, with no trailing slash.

**Step 3:** If you see "Failed to fetch" or "net::ERR_CONNECTION_REFUSED":

The API is not running. Follow the "API is Unreachable" steps above.

**Step 4:** If you see "401 Unauthorized":

The JWT token is invalid or expired. This is not a server problem. The user needs to log in again.

**Step 5:** If you see "500 Internal Server Error":

The API crashed while processing the request. Check the API logs for the full error message.

---

### Scenario: SSL Certificate Expired

You see a browser warning about an invalid or expired certificate.

**Step 1:** Log into Plesk.

**Step 2:** Go to Websites & Domains and find the affected domain.

**Step 3:** Click SSL/TLS Certificates.

**Step 4:** Click Reissue next to the Let's Encrypt certificate.

**Step 5:** Wait for the new certificate to install.

This usually takes less than a minute. If it fails, check that DNS still points to your server.

---

## Part 4: What NOT to Touch During Recovery

When you're stressed and something is broken, avoid these actions:

### Do not delete and recreate domains

This will break SSL certificates and require re-uploading all files. Almost never necessary.

### Do not edit the nginx configuration unless you're sure

A syntax error will take down all sites on the server. If you must edit, copy the existing config first.

### Do not restart the entire server

Restarting individual services is safer. A full server restart can cause other problems.

### Do not change the database password

This will break the API immediately. Only change it if you know the current one is compromised.

### Do not delete log files

You need them to diagnose the problem. Logs can be cleaned up after the issue is resolved.

### Do not update the .NET runtime during an outage

Updates can introduce new problems. Fix the current issue first, update later.

### Do not guess at configuration changes

If you're not sure what a setting does, don't change it. Look it up or ask first.

---

## Quick Recovery Checklist

When something breaks, work through this list in order:

1. Can you reach the health endpoint?
2. Is the API service running?
3. Are there errors in the API logs?
4. Is Nginx running?
5. Is DNS resolving correctly?
6. Is the SSL certificate valid?
7. Is the frontend origin in the CORS allowlist?

Most problems are solved by one of:
- Starting the API service
- Restarting Nginx
- Reissuing the SSL certificate
- Adding the correct origin to CORS

---

## After Recovery

Once the system is working again:

1. Note what broke and why
2. Note what fixed it
3. Add the fix to this document if it's not already here
4. Consider whether the problem could have been prevented

---

## Contact

If you've worked through this guide and the system is still broken, step away for 10 minutes. Fresh eyes often see what tired eyes miss.
