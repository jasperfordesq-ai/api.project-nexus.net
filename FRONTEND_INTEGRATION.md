# Frontend Integration Guide

This guide explains how to connect a frontend application to the Project NEXUS ASP.NET Core API.

---

## Frontend Can Build Safely Now

These features are **fully implemented** in the ASP.NET backend (Phases 0-15). Frontend teams can build UI for:

- **Authentication** - Login, logout, register, password reset, token refresh
- **User Profiles** - View profile, edit own profile (name only)
- **Listings** - Full CRUD (create, read, update, delete) with categories
- **Wallet** - View balance, transaction history, transfer credits
- **Messaging** - Conversations, send messages, mark as read
- **Connections** - Friend requests, accept/decline, remove
- **Notifications** - List, unread count, mark read
- **Groups** - Full CRUD, join/leave, member management
- **Events** - Full CRUD, RSVP, attendees list
- **Social Feed** - Posts, likes, comments
- **Gamification** - XP, levels, badges, leaderboards
- **Reviews** - User reviews, listing reviews, ratings
- **Search** - Unified search, autocomplete suggestions, member directory
- **AI Features** - Chat, listing suggestions, matching, moderation, translations
- **Admin Dashboard** - User management, content moderation, categories, roles

---

## Do Not Build UI For This Yet

These features are **NOT implemented**. Do not build frontend UI for:

- **Avatar Upload** - Backlog
- **File/Image Uploads** - Backlog
- **Two-Factor Authentication (TOTP)** - Backlog
- **Push Notifications** - Backlog (Web Push, FCM)
- **User Preferences** - Backlog
- **Volunteering** - Backlog
- **Federation** - Backlog
- **Polls & Surveys** - Not planned

---

## Architecture Overview

### Key Principles

1. **One API, Multiple Frontends** - There is a single ASP.NET Core API. All frontends connect to it via CORS-allowed origins.
2. **Hostnames, Not Ports** - Different apps are distinguished by hostname (uk.project-nexus.net, ie.project-nexus.net), not by API ports.
3. **Dev Ports are Local-Only** - Ports like 3000, 3001, 3002 are for local development convenience only. They have no architectural significance in production.
4. **Mobile Apps Skip CORS** - Native mobile apps make direct HTTP requests (not browser requests), so they don't need CORS configuration.
5. **Internal Services are Never Browser-Facing** - AI services (LLaMA) and other internal APIs communicate server-to-server. They are never exposed to browsers.

### System Diagram

```text
                    ┌─────────────────────────────────────┐
                    │     BROWSER CLIENTS (CORS needed)   │
                    └─────────────────────────────────────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          │                           │                           │
          ▼                           ▼                           ▼
  https://uk.project       https://ie.project       https://app.project
     -nexus.net               -nexus.net               -nexus.net
  (GOV.UK Frontend)         (GOV.IE Frontend)         (Modern Frontend)
          │                           │                           │
          └───────────────────────────┼───────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       REVERSE PROXY (HTTPS 443)                         │
│                         Plesk Nginx + Let's Encrypt                     │
│                      https://api.project-nexus.net                      │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
                    ▼                 ▼                 ▼
            ┌───────────┐     ┌───────────┐     ┌───────────┐
            │  Browser  │     │  Mobile   │     │  Admin    │
            │  Requests │     │    App    │     │ Dashboard │
            │ (CORS OK) │     │ (No CORS) │     │ (CORS OK) │
            └───────────┘     └───────────┘     └───────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       ASP.NET CORE API (Kestrel)                        │
│                         Internal: localhost:5080                        │
│                   (Single API serving all clients)                      │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ Server-to-server (NO CORS)
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       INTERNAL SERVICES                                 │
│                    LLaMA AI Service (internal:8000)                     │
│                    PostgreSQL Database (port 5432)                      │
│                    (Never exposed to browsers)                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## API Base URL

| Environment | Kestrel Binding         | Public URL                                          |
|-------------|-------------------------|-----------------------------------------------------|
| Development | `http://localhost:5080` | `http://localhost:5080`                             |
| Production  | Internal (5000 or 80)   | `https://api.project-nexus.net` (via reverse proxy) |

**Note:** In production, Kestrel binds to an internal port. Plesk's Nginx reverse proxy terminates HTTPS and forwards requests.

## Frontend Applications

| App             | Dev URL                 | Production URL                     | CORS Required | Notes                         |
|-----------------|-------------------------|------------------------------------|---------------|-------------------------------|
| GOV.UK Frontend | `http://localhost:3000` | `https://uk.project-nexus.net`     | Yes           | UK government-style portal    |
| GOV.IE Frontend | `http://localhost:3001` | `https://ie.project-nexus.net`     | Yes           | Irish government-style portal |
| Modern Frontend | `http://localhost:3002` | `https://app.project-nexus.net`    | Yes           | Modern SPA interface          |
| Admin Dashboard | N/A                     | `https://admin.project-nexus.net`  | Yes           | Platform administration       |
| Mobile App      | N/A                     | `https://api.project-nexus.net`    | **No**        | Native HTTP client            |
| LLaMA Service   | `http://localhost:8000` | Internal only                      | **No**        | Server-to-server only         |

## Common Mistakes to Avoid

### 1. Do NOT add internal services to CORS

```json
// WRONG - LLaMA is internal, never browser-facing
{
  "Cors": {
    "AllowedOrigins": [
      "https://uk.project-nexus.net",
      "http://localhost:8000"  // ❌ WRONG: Internal service
    ]
  }
}
```

Internal services (LLaMA, databases, message queues) communicate server-to-server. They don't make browser requests, so CORS doesn't apply.

### 2. Do NOT create one API per frontend

```text
❌ WRONG:
  uk.project-nexus.net    → api-uk.project-nexus.net:5001
  ie.project-nexus.net    → api-ie.project-nexus.net:5002
  app.project-nexus.net   → api-app.project-nexus.net:5003

✅ CORRECT:
  uk.project-nexus.net    → api.project-nexus.net (CORS allows origin)
  ie.project-nexus.net    → api.project-nexus.net (CORS allows origin)
  app.project-nexus.net   → api.project-nexus.net (CORS allows origin)
```

One API, multiple allowed origins. The API identifies the tenant from JWT claims, not from which frontend called it.

### 3. Do NOT expose AI services directly to browsers

```text
❌ WRONG:
  Browser → https://llama.project-nexus.net/chat  (direct browser access)

✅ CORRECT:
  Browser → https://api.project-nexus.net/ai/chat → Internal LLaMA service
```

AI services should be called by the API server, not by browsers. This allows for:

- Rate limiting and authentication
- Cost control and usage tracking
- Prompt injection protection
- Response sanitization

---

## CORS Configuration

CORS is configured per environment. Only **browser origins** are listed (not internal services).

**Development** (`appsettings.Development.json`):

```json
{
  "Cors": {
    "AllowedOrigins": [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",
      "https://localhost:3000",
      "https://localhost:3001",
      "https://localhost:3002"
    ]
  }
}
```

Both HTTP and HTTPS are included for local HTTPS dev servers (e.g., Vite with `--https`).

**Production** (`appsettings.Production.json`):

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

**Important notes:**

- Mobile apps do NOT need CORS (they make direct HTTP requests, not browser requests)
- LLaMA service does NOT need CORS (server-to-server calls from ASP.NET API)
- Origins must be valid URLs (no trailing slash, no paths) - invalid entries are filtered out
- In Production, at least one valid origin is required or the app won't start
- In Development, missing origins only logs a warning (Swagger still works)
- `AllowCredentials()` is NOT used since we use JWT Bearer tokens (not cookies)

---

## Authentication Flow

### 1. Login

**Endpoint:** `POST /api/auth/login`

**Request:**
```json
{
  "email": "admin@acme.test",
  "password": "Test123!",
  "tenant_slug": "acme"
}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "user": {
    "id": 1,
    "email": "admin@acme.test",
    "first_name": "Alice",
    "last_name": "Admin",
    "role": "admin"
  }
}
```

**Error (401):**
```json
{
  "error": "Email, password or tenant is incorrect"
}
```

### 2. Store the Token

Store the `access_token` securely:
- **Recommended:** HttpOnly cookie (if using server-side rendering)
- **Alternative:** localStorage or sessionStorage (for SPAs)

```javascript
// Example: storing in localStorage
localStorage.setItem('token', response.access_token);
```

### 3. Include Token in Requests

Add the token to the `Authorization` header for all authenticated requests:

```javascript
const token = localStorage.getItem('token');

fetch('https://api.project-nexus.net/api/users/me', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

### 4. Validate Token

**Endpoint:** `GET /api/auth/validate`

Returns user info if token is valid, 401 if invalid/expired.

---

## Test Credentials

| Email | Password | Tenant | Role |
|-------|----------|--------|------|
| admin@acme.test | Test123! | acme | admin |
| member@acme.test | Test123! | acme | member |
| admin@globex.test | Test123! | globex | admin |

---

## Available API Endpoints

### Authentication - ✅ IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/login | No | Login with email, password, tenant_slug |
| POST | /api/auth/logout | Yes | Logout and revoke refresh token |
| POST | /api/auth/refresh | Yes | Refresh access token |
| POST | /api/auth/register | No | Register new user |
| POST | /api/auth/forgot-password | No | Request password reset token |
| POST | /api/auth/reset-password | No | Reset password with token |
| GET | /api/auth/validate | Yes | Validate token and get user info |

### Users - ✅ IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/users | Yes | List users in tenant |
| GET | /api/users/{id} | Yes | Get user by ID |
| GET | /api/users/me | Yes | Get current user |
| PATCH | /api/users/me | Yes | Update current user (first_name, last_name) |

### Listings - ✅ IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/listings | Yes | List listings (supports ?type=offer&status=active&page=1&limit=10) |
| GET | /api/listings/{id} | Yes | Get listing by ID |
| POST | /api/listings | Yes | Create listing |
| PUT | /api/listings/{id} | Yes | Update listing (owner only) |
| DELETE | /api/listings/{id} | Yes | Delete listing (owner only) |

### Wallet - ✅ IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/wallet/balance | Yes | Get current user's balance |
| GET | /api/wallet/transactions | Yes | Get transaction history (?type=sent&page=1&limit=10) |
| GET | /api/wallet/transactions/{id} | Yes | Get transaction by ID |
| POST | /api/wallet/transfer | Yes | Transfer time credits |

### Messages - ✅ IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/messages | Yes | List conversations |
| GET | /api/messages/{id} | Yes | Get conversation with messages |
| GET | /api/messages/unread-count | Yes | Get unread message count |
| POST | /api/messages | Yes | Send a message (creates conversation if needed) |
| PUT | /api/messages/{id}/read | Yes | Mark all messages in conversation as read |

### Connections - ✅ IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/connections | Yes | List connections (?status=accepted&page=1&limit=20) |
| GET | /api/connections/pending | Yes | Get pending connection requests |
| POST | /api/connections | Yes | Send connection request |
| PUT | /api/connections/{id}/accept | Yes | Accept connection request |
| PUT | /api/connections/{id}/decline | Yes | Decline connection request |
| DELETE | /api/connections/{id} | Yes | Remove connection |

### Notifications - ✅ IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/notifications | Yes | List notifications (?unread_only=true&page=1&limit=20) |
| GET | /api/notifications/unread-count | Yes | Get unread notification count |
| GET | /api/notifications/{id} | Yes | Get notification by ID |
| PUT | /api/notifications/{id}/read | Yes | Mark notification as read |
| PUT | /api/notifications/read-all | Yes | Mark all notifications as read |
| DELETE | /api/notifications/{id} | Yes | Delete notification |

### Groups - ✅ IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/groups | Yes | List groups (?page=1&limit=20) |
| GET | /api/groups/{id} | Yes | Get group by ID |
| POST | /api/groups | Yes | Create group |
| PUT | /api/groups/{id} | Yes | Update group (admin only) |
| DELETE | /api/groups/{id} | Yes | Delete group (admin only) |
| POST | /api/groups/{id}/join | Yes | Join group |
| DELETE | /api/groups/{id}/leave | Yes | Leave group |
| GET | /api/groups/{id}/members | Yes | List group members |
| PUT | /api/groups/{id}/members/{userId}/role | Yes | Update member role (owner only) |
| DELETE | /api/groups/{id}/members/{userId} | Yes | Remove member (admin only) |
| PUT | /api/groups/{id}/transfer-ownership | Yes | Transfer group ownership (owner only) |

### Events - ✅ IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/events | Yes | List events (?status=upcoming&page=1&limit=20) |
| GET | /api/events/{id} | Yes | Get event by ID |
| POST | /api/events | Yes | Create event |
| PUT | /api/events/{id} | Yes | Update event (organizer only) |
| DELETE | /api/events/{id} | Yes | Delete event (organizer only) |
| POST | /api/events/{id}/rsvp | Yes | RSVP to event |
| DELETE | /api/events/{id}/rsvp | Yes | Cancel RSVP |
| GET | /api/events/{id}/rsvps | Yes | List event RSVPs |

### Feed (Social Posts) - ✅ IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/feed | Yes | List feed posts (?page=1&limit=20) |
| GET | /api/feed/{id} | Yes | Get post by ID |
| POST | /api/feed | Yes | Create post |
| PUT | /api/feed/{id} | Yes | Update post (author only) |
| DELETE | /api/feed/{id} | Yes | Delete post (author only) |
| POST | /api/feed/{id}/like | Yes | Like post |
| DELETE | /api/feed/{id}/like | Yes | Unlike post |
| GET | /api/feed/{id}/comments | Yes | Get post comments |
| POST | /api/feed/{id}/comments | Yes | Add comment |
| DELETE | /api/feed/{id}/comments/{commentId} | Yes | Delete comment (author only) |

### Gamification - ✅ IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/gamification/profile | Yes | Get current user's XP, level, progress |
| GET | /api/gamification/profile/{userId} | Yes | Get another user's public gamification profile |
| GET | /api/gamification/badges | Yes | Get all badges with earned status |
| GET | /api/gamification/badges/my | Yes | Get current user's earned badges |
| GET | /api/gamification/leaderboard | Yes | Get XP leaderboard (?period=week&page=1&limit=20) |
| GET | /api/gamification/xp-history | Yes | Get current user's XP transaction log |

### Reviews - ✅ IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/users/{id}/reviews | Yes | Get reviews for a user |
| POST | /api/users/{id}/reviews | Yes | Leave a review for a user |
| GET | /api/listings/{id}/reviews | Yes | Get reviews for a listing |
| POST | /api/listings/{id}/reviews | Yes | Leave a review for a listing |
| GET | /api/reviews/{id} | Yes | Get a specific review by ID |
| PUT | /api/reviews/{id} | Yes | Update own review |
| DELETE | /api/reviews/{id} | Yes | Delete own review |

### Health - ✅ IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /health | No | Health check |

---

### Search - ✅ IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/search | Yes | Unified search (?q=term&type=all) |
| GET | /api/search/suggestions | Yes | Autocomplete suggestions |
| GET | /api/members | Yes | Member directory (?q=name) |

---

### File Uploads - 📋 BACKLOG

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/upload | Yes | General file upload |
| POST | /api/users/me/avatar | Yes | Upload user avatar |
| POST | /api/listings/{id}/images | Yes | Upload listing images |
| POST | /api/groups/{id}/image | Yes | Upload group image |
| POST | /api/events/{id}/image | Yes | Upload event image |

### User Preferences - 📋 BACKLOG

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/users/me/preferences | Yes | Get user preferences |
| PUT | /api/users/me/preferences | Yes | Update user preferences |

### Two-Factor Auth - 📋 BACKLOG

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/auth/totp/setup | Yes | Get TOTP setup (QR code, secret) |
| POST | /api/auth/totp/enable | Yes | Enable TOTP |
| POST | /api/auth/totp/verify | Yes | Verify TOTP during login |
| DELETE | /api/auth/totp | Yes | Disable TOTP |

### Push Notifications - 📋 BACKLOG

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/push/subscribe | Yes | Subscribe to web push |
| DELETE | /api/push/subscribe | Yes | Unsubscribe from web push |
| POST | /api/push/register-device | Yes | Register mobile device (FCM) |

### GDPR & Compliance - 📋 BACKLOG

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/users/me/data-export | Yes | Export user data (GDPR) |
| DELETE | /api/users/me | Yes | Delete account (GDPR) |
| POST | /api/consent | Yes | Record consent |

### Reporting & Moderation - 📋 BACKLOG

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/reports | Yes | Report content |
| GET | /api/admin/reports | Yes | Moderation queue (admin) |

### Volunteering - 📋 BACKLOG

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/volunteering/opportunities | Yes | List opportunities |
| POST | /api/volunteering/opportunities/{id}/apply | Yes | Apply to opportunity |
| POST | /api/volunteering/hours | Yes | Log volunteer hours |

### Admin APIs - ✅ IMPLEMENTED (Admin role required)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/admin/dashboard | Admin | Dashboard metrics |
| GET | /api/admin/users | Admin | List users with filters |
| GET | /api/admin/users/{id} | Admin | User details with stats |
| PUT | /api/admin/users/{id} | Admin | Update user |
| PUT | /api/admin/users/{id}/suspend | Admin | Suspend user |
| PUT | /api/admin/users/{id}/activate | Admin | Activate user |
| GET | /api/admin/listings/pending | Admin | Pending listings queue |
| PUT | /api/admin/listings/{id}/approve | Admin | Approve listing |
| PUT | /api/admin/listings/{id}/reject | Admin | Reject listing |
| GET | /api/admin/categories | Admin | List categories |
| POST | /api/admin/categories | Admin | Create category |
| PUT | /api/admin/categories/{id} | Admin | Update category |
| DELETE | /api/admin/categories/{id} | Admin | Delete category |
| GET | /api/admin/config | Admin | Get tenant config |
| PUT | /api/admin/config | Admin | Update tenant config |
| GET | /api/admin/roles | Admin | List roles |
| POST | /api/admin/roles | Admin | Create role |
| PUT | /api/admin/roles/{id} | Admin | Update role |
| DELETE | /api/admin/roles/{id} | Admin | Delete role |

### Federation - 📋 BACKLOG

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/federation/partners | Yes | List federation partners |
| GET | /api/federation/listings | Yes | Search federated listings |

---

## Example: React/Fetch Integration

```javascript
// api.js - API client
const API_BASE = 'https://api.project-nexus.net';

export async function login(email, password, tenantSlug) {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      tenant_slug: tenantSlug
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Login failed');
  }

  return response.json();
}

export async function fetchWithAuth(endpoint, options = {}) {
  const token = localStorage.getItem('token');

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers
    }
  });

  if (response.status === 401) {
    // Token expired - redirect to login
    localStorage.removeItem('token');
    window.location.href = '/login';
    throw new Error('Session expired');
  }

  return response;
}

// Usage examples
export const getListings = () => fetchWithAuth('/api/listings').then(r => r.json());
export const getBalance = () => fetchWithAuth('/api/wallet/balance').then(r => r.json());
export const getConversations = () => fetchWithAuth('/api/messages').then(r => r.json());

export async function createListing(data) {
  const response = await fetchWithAuth('/api/listings', {
    method: 'POST',
    body: JSON.stringify(data)
  });
  return response.json();
}

export async function transferCredits(receiverId, amount, description) {
  const response = await fetchWithAuth('/api/wallet/transfer', {
    method: 'POST',
    body: JSON.stringify({
      receiver_id: receiverId,
      amount,
      description
    })
  });
  return response.json();
}
```

---

## JSON Property Naming Convention

The API uses **snake_case** for JSON properties:

```json
{
  "id": 1,
  "first_name": "Alice",
  "last_name": "Admin",
  "created_at": "2026-02-02T10:00:00Z",
  "tenant_id": 1
}
```

---

## Error Handling

All errors return JSON with an `error` field:

```json
{
  "error": "Error message here"
}
```

Some errors include additional fields:

```json
{
  "error": "Insufficient balance",
  "current_balance": 2.5,
  "requested_amount": 10.0
}
```

### Common HTTP Status Codes

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 201 | Created (POST success) |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (not allowed) |
| 404 | Not Found |
| 500 | Server Error |

---

## Pagination

Paginated endpoints accept `page` and `limit` query parameters:

```
GET /api/listings?page=1&limit=10
```

Response includes pagination info:

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 42,
    "total_pages": 5
  }
}
```

---

## Filtering

### Listings
- `type`: `offer` or `request`
- `status`: `active`, `draft`, `completed`, `cancelled`
- `user_id`: Filter by user

```
GET /api/listings?type=offer&status=active&user_id=1
```

### Transactions
- `type`: `sent`, `received`, or `all` (default)

```
GET /api/wallet/transactions?type=sent
```

---

## Starting the Backend

```powershell
# 1. Start PostgreSQL (Docker)
cd c:\xampp\htdocs\asp.net-backend
docker-compose up -d

# 2. Start the API
cd src\Nexus.Api
$env:ASPNETCORE_ENVIRONMENT="Development"
dotnet run

# API will be available at http://localhost:5080
# Health check: http://localhost:5080/health
```

---

## Swagger / OpenAPI

In Development mode, Swagger UI is available at:
- `http://localhost:5080/swagger`

This provides interactive API documentation where you can test endpoints directly.

---

## Gamification System (Phase 13) - ✅ IMPLEMENTED

### XP Awards (Automatic)

XP is automatically awarded when users perform these actions:

| Action               | XP  | Possible Badge                                                   |
|----------------------|-----|------------------------------------------------------------------|
| Create listing       | 10  | First Listing (+25 XP)                                           |
| Accept connection    | 5   | First Connection (+25 XP)                                        |
| Complete transaction | 20  | First Transaction (+30 XP), Helpful Neighbor (+100 XP at 10 tx)  |
| Create post          | 5   | First Post (+15 XP)                                              |
| Create event         | 15  | Event Host (+30 XP), Event Organizer (+75 XP at 5 events)        |
| Create group         | 20  | Community Builder (+50 XP)                                       |
| Add comment          | 2   | -                                                                |
| Leave review         | 5   | -                                                                |

### Level System

Formula: `XP needed for level N = 50 * N * (N - 1)`

| Level | XP Required |
|-------|-------------|
| 1     | 0           |
| 2     | 100         |
| 3     | 300         |
| 4     | 600         |
| 5     | 1000        |
| 10    | 4500        |

### Response Examples

#### GET /api/gamification/profile

```json
{
  "profile": {
    "id": 1,
    "firstName": "Alice",
    "lastName": "Admin",
    "totalXp": 45,
    "level": 1,
    "xp_to_next_level": 55,
    "xp_required_for_current_level": 0,
    "xp_required_for_next_level": 100,
    "badges_earned": 2
  },
  "recent_xp": [
    {
      "amount": 5,
      "source": "post_created",
      "description": "Created a post",
      "createdAt": "2026-02-02T10:00:00Z"
    }
  ]
}
```

#### GET /api/gamification/badges

```json
{
  "data": [
    {
      "id": 1,
      "slug": "first_listing",
      "name": "First Listing",
      "description": "Created your first listing on the marketplace",
      "icon": "🏪",
      "xpReward": 25,
      "is_earned": true,
      "earned_at": "2026-02-02T10:00:00Z"
    }
  ],
  "summary": {
    "total": 10,
    "earned": 2,
    "progress_percent": 20.0
  }
}
```

#### GET /api/gamification/leaderboard?period=week

```json
{
  "data": [
    {
      "rank": 1,
      "user": {
        "id": 1,
        "first_name": "Alice",
        "last_name": "Admin"
      },
      "period_xp": 45,
      "total_xp": 45,
      "level": 1
    }
  ],
  "current_user_rank": 1,
  "period": "week",
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 3,
    "total_pages": 1
  }
}
```

**Leaderboard periods:** `all` (default), `week`, `month`, `year`

### UI Suggestions

1. **Profile Card**: Display level badge, XP progress bar, recent XP gains
2. **Badge Gallery**: Grid of all badges (greyscale for locked, colored for earned)
3. **Leaderboard Page**: Tab switcher for period selection (All Time, This Week, This Month)
4. **Toast Notifications**: Show XP gain and badge earned events after user actions

---

## Reviews System (Phase 14) - ✅ IMPLEMENTED

Users can leave reviews for other users and listings. Each review has a 1-5 star rating and optional comment.

### XP Awards

| Action | XP |
|--------|-----|
| Leave a review | 5 |

### Business Rules

- **One review per target**: A user can only leave one review per user or per listing
- **No self-reviews**: Cannot review yourself
- **No own listing reviews**: Cannot review your own listing
- **Owner-only editing**: Only the reviewer can update or delete their review

### Response Examples

#### GET /api/users/{id}/reviews

```json
{
  "data": [
    {
      "id": 1,
      "rating": 5,
      "comment": "Alice was fantastic to work with! Very organized and punctual.",
      "created_at": "2026-02-01T10:00:00Z",
      "updated_at": null,
      "reviewer": {
        "id": 3,
        "first_name": "Charlie",
        "last_name": "Contributor"
      }
    }
  ],
  "summary": {
    "average_rating": 4.5,
    "total_reviews": 2
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 2,
    "pages": 1
  }
}
```

#### POST /api/users/{id}/reviews

**Request:**
```json
{
  "rating": 5,
  "comment": "Great experience working with this person!"
}
```

**Response (201 Created):**
```json
{
  "id": 5,
  "rating": 5,
  "comment": "Great experience working with this person!",
  "target_user_id": 3,
  "created_at": "2026-02-02T12:00:00Z",
  "reviewer": {
    "id": 1,
    "first_name": "Alice",
    "last_name": "Admin"
  }
}
```

#### GET /api/listings/{id}/reviews

```json
{
  "data": [
    {
      "id": 3,
      "rating": 5,
      "comment": "Excellent home repair service. Fixed my squeaky door in no time!",
      "created_at": "2026-02-01T10:00:00Z",
      "updated_at": null,
      "reviewer": {
        "id": 3,
        "first_name": "Charlie",
        "last_name": "Contributor"
      }
    }
  ],
  "summary": {
    "average_rating": 5.0,
    "total_reviews": 1
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "pages": 1
  }
}
```

#### GET /api/reviews/{id}

```json
{
  "id": 1,
  "rating": 5,
  "comment": "Alice was fantastic to work with!",
  "created_at": "2026-02-01T10:00:00Z",
  "updated_at": null,
  "reviewer": {
    "id": 3,
    "first_name": "Charlie",
    "last_name": "Contributor"
  },
  "target_user": {
    "id": 1,
    "first_name": "Alice",
    "last_name": "Admin"
  },
  "target_listing": null
}
```

#### PUT /api/reviews/{id}

**Request:**
```json
{
  "rating": 4,
  "comment": "Updated review - still great but had a minor issue"
}
```

**Response (200 OK):** Returns updated review object

### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 400 | "You cannot review yourself" | Attempted self-review |
| 400 | "You cannot review your own listing" | Attempted review of own listing |
| 400 | "Rating must be between 1 and 5" | Invalid rating value |
| 400 | "Comment must be 2000 characters or less" | Comment too long |
| 403 | "You can only update your own reviews" | Attempted edit of another's review |
| 404 | "User not found" | Target user doesn't exist |
| 404 | "Listing not found" | Target listing doesn't exist |
| 404 | "Review not found" | Review ID doesn't exist |
| 409 | "You have already reviewed this user" | Duplicate user review |
| 409 | "You have already reviewed this listing" | Duplicate listing review |

### UI Suggestions

1. **Star Rating Component**: 5 clickable stars for input, display average with decimal
2. **User Profile Reviews Tab**: Show reviews received with average rating badge
3. **Listing Detail Reviews Section**: Display reviews below listing info
4. **Review Form Modal**: Popup after transaction completion prompting for review
5. **Edit/Delete Controls**: Show only on reviews authored by current user

---

## Phase 15: Search Integration

> **Status:** ✅ IMPLEMENTED. Frontend teams can now build search UI.

### Endpoint Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/search | Unified search across listings, users, groups, events |
| GET | /api/search/suggestions | Lightweight autocomplete suggestions |
| GET | /api/members | Member directory with name filtering |

All endpoints require JWT authentication and return tenant-scoped results only.

### Example Request URLs

**Development:**
```
GET http://localhost:5080/api/search?q=garden&type=all&page=1&limit=20
GET http://localhost:5080/api/search/suggestions?q=gar&limit=5
GET http://localhost:5080/api/members?q=alice&page=1&limit=20
```

**Production:**
```
GET https://api.project-nexus.net/api/search?q=garden&type=all&page=1&limit=20
GET https://api.project-nexus.net/api/search/suggestions?q=gar&limit=5
GET https://api.project-nexus.net/api/members?q=alice&page=1&limit=20
```

### Query Parameters

#### GET /api/search

| Parameter | Type | Required | Default | Constraints |
|-----------|------|----------|---------|-------------|
| q | string | Yes | - | Min 2 chars, max 100 chars |
| type | string | No | `all` | `all`, `listings`, `users`, `groups`, `events` |
| page | int | No | 1 | >= 1 |
| limit | int | No | 20 | 1-50 |

#### GET /api/search/suggestions

| Parameter | Type | Required | Default | Constraints |
|-----------|------|----------|---------|-------------|
| q | string | Yes | - | Min 2 chars, max 100 chars |
| limit | int | No | 5 | 1-10 |

#### GET /api/members

| Parameter | Type | Required | Default | Constraints |
|-----------|------|----------|---------|-------------|
| q | string | No | - | Search by first or last name |
| page | int | No | 1 | >= 1 |
| limit | int | No | 20 | 1-50 |

*Note: Skills filter deferred to future phase.*

### Example JSON Responses

#### GET /api/search?q=garden&type=all

```json
{
  "listings": [
    {
      "id": 3,
      "title": "Garden Weeding Services",
      "description": "Professional garden maintenance and weeding",
      "type": "offer",
      "status": "active",
      "created_at": "2026-01-20T10:00:00Z"
    }
  ],
  "users": [
    {
      "id": 3,
      "first_name": "Charlie",
      "last_name": "Contributor",
      "avatar_url": null,
      "bio": null
    }
  ],
  "groups": [
    {
      "id": 2,
      "name": "Community Gardeners",
      "description": "A group for local gardening enthusiasts",
      "member_count": 12,
      "is_public": true
    }
  ],
  "events": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 3,
    "pages": 1
  }
}
```

#### GET /api/search/suggestions?q=gar

```json
[
  { "text": "Garden Weeding Services", "type": "listings", "id": 3 },
  { "text": "Community Gardeners", "type": "groups", "id": 2 },
  { "text": "Gardening Workshop", "type": "events", "id": 5 }
]
```

#### GET /api/members?q=alice

```json
{
  "data": [
    {
      "id": 1,
      "first_name": "Alice",
      "last_name": "Admin",
      "avatar_url": null,
      "bio": null,
      "created_at": "2026-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "pages": 1
  }
}
```

**Note:** `avatar_url` and `bio` are always `null` in v1 (User entity does not have these fields yet).

### Error Responses

| Status | Error | Cause |
|--------|-------|-------|
| 400 | "Search query must be at least 2 characters" | `q` parameter too short |
| 400 | "Search query must not exceed 100 characters" | `q` parameter too long |
| 400 | "Invalid type filter" | `type` not one of allowed values |
| 401 | Unauthorized | Missing or invalid JWT |

### UI Recommendations

#### 1. Shared Global Search Component

Build **one** search component shared across uk/ie/app frontends:

```javascript
// SearchBar.jsx - shared component
export function SearchBar({ onSelect }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  // Debounced fetch (see performance notes)
  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      const results = await fetchWithAuth(`/api/search/suggestions?q=${encodeURIComponent(query)}&limit=5`);
      setSuggestions(await results.json());
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="search-bar">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search listings, members, groups..."
        minLength={2}
      />
      {suggestions.length > 0 && (
        <ul className="suggestions">
          {suggestions.map((s) => (
            <li key={`${s.type}-${s.id}`} onClick={() => onSelect(s)}>
              <span className="type-badge">{s.type}</span>
              {s.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

#### 2. Autosuggest with Debounce and Min Length

- **Minimum 2 characters** before making API call (backend enforces this)
- **300ms debounce** to avoid excessive requests while typing
- **Cancel pending requests** when query changes (use AbortController)
- **Show loading state** during fetch

```javascript
// Good: Debounced with minimum length check
if (query.length >= 2) {
  debounce(() => fetchSuggestions(query), 300);
}

// Bad: Fetch on every keystroke
onChange={(e) => fetchSuggestions(e.target.value)}  // ❌ Don't do this
```

#### 3. Results Page with Tabs by Type

```jsx
// SearchResultsPage.jsx
function SearchResultsPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [results, setResults] = useState(null);

  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'listings', label: 'Listings' },
    { id: 'users', label: 'Members' },
    { id: 'groups', label: 'Groups' },
    { id: 'events', label: 'Events' },
  ];

  useEffect(() => {
    fetchWithAuth(`/api/search?q=${query}&type=${activeTab}`)
      .then(r => r.json())
      .then(setResults);
  }, [query, activeTab]);

  return (
    <div>
      <nav className="tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={activeTab === tab.id ? 'active' : ''}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {results && (
        <div className="results">
          {activeTab === 'all' && <AllResultsView results={results} />}
          {activeTab === 'listings' && <ListingResults items={results.listings} />}
          {activeTab === 'users' && <UserResults items={results.users} />}
          {/* ... */}
        </div>
      )}
    </div>
  );
}
```

#### 4. Member Directory Page

```jsx
// MemberDirectory.jsx
function MemberDirectory() {
  const [nameFilter, setNameFilter] = useState('');
  const [members, setMembers] = useState([]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const params = new URLSearchParams({ page, limit: 20 });
    if (nameFilter) params.set('q', nameFilter);

    fetchWithAuth(`/api/members?${params}`)
      .then(r => r.json())
      .then(setMembers);
  }, [nameFilter, page]);

  return (
    <div>
      <input
        type="text"
        placeholder="Search by name..."
        value={nameFilter}
        onChange={(e) => setNameFilter(e.target.value)}
      />

      <div className="member-grid">
        {members.data?.map(member => (
          <MemberCard key={member.id} member={member} />
        ))}
      </div>

      <Pagination
        page={page}
        totalPages={members.pagination?.pages}
        onPageChange={setPage}
      />
    </div>
  );
}
```

**Note:** Skills filter is not implemented in v1. It will be added in a future phase when User Skills entity is created.

### Performance Notes

1. **Use pagination** - Always include `page` and `limit` params. Default is 20 results per page, max is 50.

2. **Respect limit caps** - Suggestions max is 10. Don't request more than needed (5 is usually sufficient for autocomplete).

3. **Debounce input** - Never call `/api/search/suggestions` on every keystroke. Use 300ms debounce minimum.

4. **Cancel in-flight requests** - When query changes, abort the previous request:
   ```javascript
   const controller = new AbortController();
   fetch(url, { signal: controller.signal });
   // On query change: controller.abort();
   ```

5. **Cache recent results** - Consider caching search results in memory for back/forward navigation.

6. **Empty state** - When `/api/members` is called with no filters, it returns all members (paginated). This is intentional for directory browsing.

### Navigation from Search Results

When user selects a search result, navigate to the appropriate detail page:

```javascript
function handleSearchSelect(item) {
  switch (item.type) {
    case 'listings':
      navigate(`/listings/${item.id}`);
      break;
    case 'users':
      navigate(`/members/${item.id}`);
      break;
    case 'groups':
      navigate(`/groups/${item.id}`);
      break;
    case 'events':
      navigate(`/events/${item.id}`);
      break;
  }
}
```

---

## Real-Time Messaging (SignalR) - ✅ IMPLEMENTED

The API provides real-time messaging via SignalR WebSockets. This enables instant message delivery, read receipts, and live conversation updates without polling.

### Connection Details

| Environment | WebSocket URL |
|-------------|---------------|
| Development | `ws://localhost:5080/hubs/messages` |
| Production  | `wss://api.project-nexus.net/hubs/messages` |

**Important:** SignalR supports multiple transports (WebSocket, Server-Sent Events, Long Polling). WebSocket is preferred for best performance.

### Authentication

WebSockets cannot send HTTP headers during the handshake. The JWT token must be passed as a query parameter:

```
ws://localhost:5080/hubs/messages?access_token=<your-jwt-token>
```

The server validates the token and associates the connection with the authenticated user.

### Install SignalR Client

```bash
# npm
npm install @microsoft/signalr

# yarn
yarn add @microsoft/signalr
```

### Client Events (Server → Client)

These events are sent from the server to connected clients:

| Event | Payload | Description |
|-------|---------|-------------|
| `ReceiveMessage` | `MessageNotification` | New message received |
| `MessageRead` | `{ conversation_id, read_by_user_id, marked_read }` | Messages in a conversation were marked as read |
| `ConversationUpdated` | `{ conversation_id, last_message }` | Conversation metadata changed (new message preview) |
| `UnreadCountUpdated` | `{ unread_count }` | Total unread message count changed |

#### MessageNotification Payload

```json
{
  "id": 123,
  "conversation_id": 45,
  "content": "Hello! Are you available for gardening help?",
  "sender": {
    "id": 2,
    "firstName": "Bob",
    "lastName": "Member"
  },
  "isRead": false,
  "createdAt": "2026-02-04T10:30:00Z"
}
```

### Server Methods (Client → Server)

These methods can be called from the client to the server:

| Method | Parameters | Description |
|--------|------------|-------------|
| `JoinConversation` | `conversationId: number` | Subscribe to updates for a specific conversation |
| `LeaveConversation` | `conversationId: number` | Unsubscribe from conversation updates |

### React Integration Example

```typescript
// hooks/useMessagesHub.ts
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { useEffect, useRef, useState, useCallback } from 'react';

interface MessageNotification {
  id: number;
  conversation_id: number;
  content: string;
  sender: {
    id: number;
    firstName: string;
    lastName: string;
  };
  isRead: boolean;
  createdAt: string;
}

interface UseMessagesHubOptions {
  onMessage?: (message: MessageNotification) => void;
  onMessageRead?: (data: { conversation_id: number; read_by_user_id: number; marked_read: number }) => void;
  onUnreadCountUpdated?: (count: number) => void;
}

export function useMessagesHub(options: UseMessagesHubOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const connectionRef = useRef<HubConnection | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setConnectionError('No authentication token');
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5080';

    const connection = new HubConnectionBuilder()
      .withUrl(`${apiUrl}/hubs/messages?access_token=${token}`)
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000]) // Retry intervals
      .configureLogging(LogLevel.Information)
      .build();

    // Register event handlers
    connection.on('ReceiveMessage', (message: MessageNotification) => {
      console.log('Received message:', message);
      options.onMessage?.(message);
    });

    connection.on('MessageRead', (data) => {
      console.log('Messages read:', data);
      options.onMessageRead?.(data);
    });

    connection.on('UnreadCountUpdated', (data) => {
      console.log('Unread count updated:', data);
      options.onUnreadCountUpdated?.(data.unread_count);
    });

    connection.on('ConversationUpdated', (data) => {
      console.log('Conversation updated:', data);
      // Handle conversation list updates
    });

    // Connection state handlers
    connection.onreconnecting((error) => {
      console.log('SignalR reconnecting...', error);
      setIsConnected(false);
    });

    connection.onreconnected((connectionId) => {
      console.log('SignalR reconnected:', connectionId);
      setIsConnected(true);
      setConnectionError(null);
    });

    connection.onclose((error) => {
      console.log('SignalR connection closed', error);
      setIsConnected(false);
    });

    // Start connection
    connection.start()
      .then(() => {
        console.log('SignalR connected');
        setIsConnected(true);
        setConnectionError(null);
        connectionRef.current = connection;
      })
      .catch((err) => {
        console.error('SignalR connection failed:', err);
        setConnectionError(err.message);
      });

    return () => {
      connection.stop();
    };
  }, []);

  const joinConversation = useCallback(async (conversationId: number) => {
    if (connectionRef.current?.state === 'Connected') {
      await connectionRef.current.invoke('JoinConversation', conversationId);
    }
  }, []);

  const leaveConversation = useCallback(async (conversationId: number) => {
    if (connectionRef.current?.state === 'Connected') {
      await connectionRef.current.invoke('LeaveConversation', conversationId);
    }
  }, []);

  return {
    isConnected,
    connectionError,
    joinConversation,
    leaveConversation,
  };
}
```

### Usage in Components

```tsx
// components/MessageList.tsx
import { useMessagesHub } from '@/hooks/useMessagesHub';
import { useEffect, useState } from 'react';

export function MessageList({ conversationId }: { conversationId: number }) {
  const [messages, setMessages] = useState<Message[]>([]);

  const { isConnected, joinConversation, leaveConversation } = useMessagesHub({
    onMessage: (newMessage) => {
      // Only add if it's for this conversation
      if (newMessage.conversation_id === conversationId) {
        setMessages((prev) => [...prev, newMessage]);
      }
    },
    onMessageRead: (data) => {
      if (data.conversation_id === conversationId) {
        // Update read status in UI
        setMessages((prev) =>
          prev.map((m) => ({ ...m, isRead: true }))
        );
      }
    },
  });

  // Join conversation group when viewing
  useEffect(() => {
    if (isConnected) {
      joinConversation(conversationId);
      return () => {
        leaveConversation(conversationId);
      };
    }
  }, [isConnected, conversationId]);

  return (
    <div>
      {!isConnected && <div className="warning">Connecting to real-time updates...</div>}
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
    </div>
  );
}
```

### Unread Count Badge

```tsx
// components/UnreadBadge.tsx
import { useMessagesHub } from '@/hooks/useMessagesHub';
import { useState, useEffect } from 'react';

export function UnreadBadge() {
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch initial count
  useEffect(() => {
    fetch('/api/messages/unread-count', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
      .then((r) => r.json())
      .then((data) => setUnreadCount(data.unread_count));
  }, []);

  // Listen for real-time updates
  useMessagesHub({
    onUnreadCountUpdated: (count) => setUnreadCount(count),
    onMessage: () => {
      // Increment count when new message arrives
      setUnreadCount((prev) => prev + 1);
    },
  });

  if (unreadCount === 0) return null;

  return <span className="badge">{unreadCount}</span>;
}
```

### Connection Status Indicator

```tsx
// components/ConnectionStatus.tsx
import { useMessagesHub } from '@/hooks/useMessagesHub';

export function ConnectionStatus() {
  const { isConnected, connectionError } = useMessagesHub();

  if (connectionError) {
    return <div className="status error">⚠️ Connection failed: {connectionError}</div>;
  }

  return (
    <div className={`status ${isConnected ? 'connected' : 'disconnected'}`}>
      {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
    </div>
  );
}
```

### Error Handling

SignalR connections can fail for various reasons. Handle these gracefully:

```typescript
// Common connection errors and handling
const handleConnectionError = (error: Error) => {
  if (error.message.includes('401')) {
    // Token expired - redirect to login
    localStorage.removeItem('token');
    window.location.href = '/login';
  } else if (error.message.includes('Failed to fetch')) {
    // Network error - show offline indicator
    showOfflineMessage();
  } else {
    // Generic error - log and show retry option
    console.error('SignalR error:', error);
    showRetryButton();
  }
};
```

### Performance Best Practices

1. **Single connection per app** - Don't create multiple SignalR connections. Use React Context or a singleton.

2. **Join/leave conversation groups** - Only subscribe to conversations the user is actively viewing.

3. **Handle reconnection** - SignalR auto-reconnects, but update UI state accordingly.

4. **Don't poll when connected** - If SignalR is connected, don't also poll `/api/messages`. Use one or the other.

5. **Graceful degradation** - If SignalR fails to connect, fall back to polling.

```typescript
// Fallback to polling if WebSocket fails
const { isConnected, connectionError } = useMessagesHub({ onMessage });

useEffect(() => {
  if (!isConnected && connectionError) {
    // Fall back to polling every 30 seconds
    const interval = setInterval(fetchMessages, 30000);
    return () => clearInterval(interval);
  }
}, [isConnected, connectionError]);
```

### Testing SignalR Locally

1. Start the backend: `docker compose up -d`
2. Connect via browser console:

```javascript
// In browser dev tools
const signalR = await import('https://cdn.jsdelivr.net/npm/@microsoft/signalr@8.0.0/dist/browser/signalr.min.js');

const token = localStorage.getItem('token');
const connection = new signalR.HubConnectionBuilder()
  .withUrl(`http://localhost:5080/hubs/messages?access_token=${token}`)
  .build();

connection.on('ReceiveMessage', (msg) => console.log('New message:', msg));
await connection.start();
console.log('Connected!');

// Join a conversation
await connection.invoke('JoinConversation', 1);
```

### Migrating from Raw WebSocket

If your frontend was using raw WebSocket (`ws://localhost:5080/ws/messages`), update to use the SignalR client:

**Before (raw WebSocket - won't work):**
```javascript
const ws = new WebSocket('ws://localhost:5080/ws/messages');
ws.onmessage = (event) => { /* ... */ };
```

**After (SignalR):**
```javascript
import { HubConnectionBuilder } from '@microsoft/signalr';

const connection = new HubConnectionBuilder()
  .withUrl('/hubs/messages?access_token=' + token)
  .withAutomaticReconnect()
  .build();

connection.on('ReceiveMessage', (message) => { /* ... */ });
await connection.start();
```

Key differences:
- SignalR handles reconnection automatically
- SignalR supports multiple transports (WebSocket, SSE, Long Polling)
- SignalR provides typed RPC-style method invocation
- SignalR handles connection negotiation and fallbacks
