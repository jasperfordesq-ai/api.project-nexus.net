# Plesk Execution Guide: api.project-nexus.net

Follow each step exactly. Do not skip steps.

---

## Section 1: Add the Domain

1. Click **Websites & Domains** in the left sidebar.
2. Click **Add Domain**.
3. Enter `api.project-nexus.net` in the Domain name field.
4. Select **Hosting type: Website hosting**.
5. Click **OK**.
6. Wait for the page to reload.

### How to confirm this worked

You see `api.project-nexus.net` in the Websites & Domains list.

---

## Section 2: Enable SSL Certificate

1. Click **Websites & Domains** in the left sidebar.
2. Click on `api.project-nexus.net` to expand it.
3. Click **SSL/TLS Certificates**.
4. Scroll to **Install a free basic certificate provided by Let's Encrypt**.
5. Click **Install**.
6. Check the box next to `api.project-nexus.net`.
7. Click **Get it free**.
8. Wait for the certificate to install.

### How to confirm this worked

A green padlock icon appears next to `api.project-nexus.net` in the domain list.

---

## Section 3: Force HTTPS Redirect

1. Click **Websites & Domains** in the left sidebar.
2. Click on `api.project-nexus.net` to expand it.
3. Click **Hosting Settings**.
4. Scroll to the Security section.
5. Check **Permanent SEO-safe 301 redirect from HTTP to HTTPS**.
6. Click **OK**.

### How to confirm this worked

Open `http://api.project-nexus.net` in a browser. It redirects to `https://api.project-nexus.net`.

---

## Section 4: Configure Reverse Proxy

1. Click **Websites & Domains** in the left sidebar.
2. Click on `api.project-nexus.net` to expand it.
3. Click **Apache & nginx Settings**.
4. Scroll to **Additional nginx directives**.
5. Delete any existing text in the box.
6. Paste the following:

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

7. Click **OK**.
8. Wait for the configuration to apply.

### How to confirm this worked

No error message appears after clicking OK.

---

## Section 5: Restart Web Server

1. Click **Tools & Settings** in the left sidebar.
2. Click **Services Management** under Server Management.
3. Find **nginx** in the list.
4. Click the **Restart** button next to nginx.
5. Wait for the status to return to Running.

### How to confirm this worked

The nginx status shows a green Running indicator.

---

## Section 6: Verify API is Reachable

1. Open a new browser tab.
2. Enter `https://api.project-nexus.net/health` in the address bar.
3. Press Enter.

### How to confirm this worked

The page displays the word `Healthy`.

---

## Troubleshooting

### If you see "502 Bad Gateway"

The ASP.NET application is not running on the server.

### If you see "This site can't be reached"

DNS is not configured. Add an A record for `api.project-nexus.net` pointing to your server IP.

### If you see a Plesk default page

The nginx configuration was not applied. Repeat Section 4.

### If SSL certificate fails to install

DNS has not propagated yet. Wait 10 minutes and try again.

---

## Completion Checklist

- [ ] Domain added
- [ ] SSL certificate installed
- [ ] HTTPS redirect enabled
- [ ] Nginx proxy configured
- [ ] Web server restarted
- [ ] /health returns Healthy
