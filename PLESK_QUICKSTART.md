# Plesk Setup: api.project-nexus.net

Step-by-step guide. Follow exactly as written.

---

## Part 1: Add the Domain

1. Click **Websites & Domains** in the left sidebar.
2. Click the blue **Add Domain** button.
3. In the **Domain name** field, type: `api.project-nexus.net`
4. Leave **Hosting type** as **Website hosting**.
5. Click **OK**.
6. Wait for Plesk to create the domain (10-30 seconds).

### How to know this step worked

You see `api.project-nexus.net` listed under **Websites & Domains**.

---

## Part 2: Enable SSL Certificate

1. Click **Websites & Domains** in the left sidebar.
2. Find `api.project-nexus.net` in the list.
3. Click **SSL/TLS Certificates** (under the domain name).
4. Scroll down to **Install a free basic certificate provided by Let's Encrypt**.
5. Click **Install**.
6. In the popup:
   - Check the box next to `api.project-nexus.net`.
   - Leave other boxes unchecked.
7. Click **Get it free**.
8. Wait for the certificate to install (30-60 seconds).

### How to know this step worked

You see a green padlock icon next to `api.project-nexus.net` in the domain list.

---

## Part 3: Force HTTPS Redirect

1. Click **Websites & Domains** in the left sidebar.
2. Find `api.project-nexus.net` in the list.
3. Click **Hosting & DNS** tab (if visible) or click directly on the domain name.
4. Click **Hosting Settings**.
5. Scroll down to **Security**.
6. Check the box: **Permanent SEO-safe 301 redirect from HTTP to HTTPS**.
7. Click **OK** at the bottom.

### How to know this step worked

Visit `http://api.project-nexus.net` in your browser. It automatically redirects to `https://api.project-nexus.net`.

---

## Part 4: Configure Reverse Proxy to ASP.NET

1. Click **Websites & Domains** in the left sidebar.
2. Find `api.project-nexus.net` in the list.
3. Click **Apache & nginx Settings**.
4. Scroll down to the text box labeled **Additional nginx directives**.
5. Delete any existing content in the box.
6. Paste the following exactly:

```
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

7. Click **OK** at the bottom.
8. Wait for Plesk to apply the configuration (5-10 seconds).

### How to know this step worked

You do not see any error messages after clicking OK.

---

## Part 5: Verify the API is Accessible

1. Open a new browser tab.
2. Go to: `https://api.project-nexus.net/health`
3. You should see the word: `Healthy`

### If you see "502 Bad Gateway"

The ASP.NET application is not running. You need to start it on the server.

### If you see "This site can't be reached"

DNS is not configured. Add an A record for `api.project-nexus.net` pointing to your server IP.

### If you see a Plesk default page

The nginx configuration did not apply. Repeat Part 4.

---

## Checklist

| Step | Status |
|------|--------|
| Domain added | ☐ |
| SSL certificate installed | ☐ |
| HTTPS redirect enabled | ☐ |
| Nginx proxy configured | ☐ |
| /health returns "Healthy" | ☐ |

---

## What to Do Next

Once all boxes are checked, your API is publicly accessible at:

```
https://api.project-nexus.net
```

Frontend applications can now make requests to this URL.
