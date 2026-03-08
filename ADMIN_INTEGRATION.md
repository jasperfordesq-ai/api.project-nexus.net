# Admin Panel Integration Guide

This guide documents all admin API endpoints for the Project NEXUS Admin Panel (Refine + Ant Design).

> The admin panel is a separate microservice project. Member-facing frontend integration is documented in `asp.net-backend/FRONTEND_INTEGRATION.md`.

## API Base URL

| Environment | URL |
|-------------|-----|
| Development | `http://localhost:5080` |
| Production | `https://api.project-nexus.net` |

## Authentication

Admin endpoints require a JWT with `role: "admin"`. Use the same auth flow as member frontends:
- POST /api/auth/login with admin credentials
- Include `Authorization: Bearer <token>` on all requests

### Test Credentials

| Email | Password | Tenant | Role |
|-------|----------|--------|------|
| admin@acme.test | Test123! | acme | admin |
| admin@globex.test | Test123! | globex | admin |

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

## JSON Property Naming Convention

The API uses **camelCase** for JSON properties (ASP.NET Core default):

```json
{
  "id": 1,
  "firstName": "Alice",
  "lastName": "Admin",
  "createdAt": "2026-02-02T10:00:00Z",
  "tenantId": 1
}
```

**Note:** Some endpoints use explicit `[JsonPropertyName]` annotations with snake_case for backward compatibility (e.g. `access_token`, `tenant_slug` in auth responses). The default serialization is camelCase.

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

---

## Admin Endpoint Reference

### 1. Admin Dashboard and Core (19 endpoints)

### Admin APIs - IMPLEMENTED (Admin role required)

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


---

### 2. Admin Analytics (8 endpoints)

### Admin Analytics - IMPLEMENTED (Admin role required)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/admin/analytics/overview | Admin | Platform metrics |
| GET | /api/admin/analytics/growth | Admin | Growth trends |
| GET | /api/admin/analytics/retention | Admin | Retention cohorts |
| GET | /api/admin/analytics/top-users | Admin | Top users |
| GET | /api/admin/analytics/sroi | Admin | Social ROI report |
| GET | /api/admin/analytics/inactive-members | Admin | Inactive detection |
| GET | /api/admin/analytics/categories | Admin | Category breakdown |
| GET | /api/admin/analytics/exchange-health | Admin | Exchange health metrics |


---

### 3. Admin CRM (6 endpoints)

### Admin CRM - IMPLEMENTED (Admin role required)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/admin/crm/users/search | Admin | Advanced user search |
| POST | /api/admin/crm/users/{userId}/notes | Admin | Add CRM note |
| GET | /api/admin/crm/users/{userId}/notes | Admin | Get user notes |
| PUT | /api/admin/crm/notes/{id} | Admin | Update note |
| DELETE | /api/admin/crm/notes/{id} | Admin | Delete note |
| GET | /api/admin/crm/flagged-notes | Admin | Get flagged notes |


---

### 4. Audit Logs (4 endpoints)

### Audit Logs - IMPLEMENTED (Admin role required)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/admin/audit | Admin | Query audit logs |
| GET | /api/admin/audit/user/{userId} | Admin | Get user activity |
| GET | /api/admin/audit/critical | Admin | Recent critical events |
| DELETE | /api/admin/audit/purge | Admin | Purge old logs |


---

### 5. System Admin (11 endpoints)

### System Admin - IMPLEMENTED (Admin role required)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/admin/system/settings | Admin | List system settings |
| PUT | /api/admin/system/settings | Admin | Create/update setting |
| GET | /api/admin/system/tasks | Admin | List scheduled tasks |
| GET | /api/admin/system/announcements | Admin | List announcements |
| POST | /api/admin/system/announcements | Admin | Create announcement |
| PUT | /api/admin/system/announcements/{id}/deactivate | Admin | Deactivate announcement |
| GET | /api/admin/system/health | Admin | System health |
| POST | /api/admin/system/lockdown | Admin | Activate emergency lockdown |
| DELETE | /api/admin/system/lockdown | Admin | Deactivate lockdown |
| GET | /api/admin/system/lockdown | Admin | Get lockdown status |
| GET | /api/announcements | No | Get active announcements |


---

### 6. Content Reports (6 admin endpoints)

| POST | /api/reports | Yes | File a content report |
| GET | /api/reports/my | Yes | My filed reports |
| GET | /api/reports/warnings | Yes | My warnings |
| PUT | /api/reports/warnings/{id}/acknowledge | Yes | Acknowledge warning |
| GET | /api/admin/reports | Admin | Pending reports queue |
| GET | /api/admin/reports/{id} | Admin | Get report detail |
| PUT | /api/admin/reports/{id}/review | Admin | Review report |
| POST | /api/admin/reports/warn/{userId} | Admin | Issue warning |
| GET | /api/admin/reports/user/{userId}/warnings | Admin | Get user warnings |
| GET | /api/admin/reports/stats | Admin | Report statistics |


---

### 7. Admin Events (4 endpoints)

### Admin Events - IMPLEMENTED (Admin only)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/admin/events | Admin | List all events (paginated) |
| GET | /api/admin/events/stats | Admin | Event statistics |
| PUT | /api/admin/events/{id}/cancel | Admin | Cancel event |
| DELETE | /api/admin/events/{id} | Admin | Delete event |


---

### 8. Admin Groups (3 endpoints)

### Admin Groups - IMPLEMENTED (Admin only)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/admin/groups | Admin | List all groups with member counts |
| GET | /api/admin/groups/stats | Admin | Group statistics |
| DELETE | /api/admin/groups/{id} | Admin | Delete group |


---

### 9. Admin Notifications (3 endpoints)

### Admin Notifications - IMPLEMENTED (Admin only)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/admin/notifications/stats | Admin | Notification statistics |
| POST | /api/admin/notifications/broadcast | Admin | Send notification to all users |
| DELETE | /api/admin/notifications/cleanup | Admin | Delete old read notifications |


---

### 10. Admin Matching (2 endpoints)

### Admin Matching - IMPLEMENTED (Admin only)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/admin/matching/stats | Admin | Matching algorithm statistics |
| GET | /api/admin/matching/health | Admin | Algorithm health dashboard |


---

### 11. Admin Email (7 endpoints)

### Admin Email - IMPLEMENTED (Admin only)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/admin/emails/templates | Admin | List email templates |
| GET | /api/admin/emails/templates/{id} | Admin | Get template details |
| POST | /api/admin/emails/templates | Admin | Create email template |
| PUT | /api/admin/emails/templates/{id} | Admin | Update email template |
| DELETE | /api/admin/emails/templates/{id} | Admin | Delete email template |
| GET | /api/admin/emails/logs | Admin | Email send logs (paginated) |
| GET | /api/admin/emails/stats | Admin | Email statistics |


---

### 12. Admin Translations (5 endpoints)

### Admin Translations - IMPLEMENTED (Admin only)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/admin/translations/stats | Admin | Translation coverage stats |
| GET | /api/admin/translations/missing | Admin | Missing keys for locale |
| POST | /api/admin/translations/bulk | Admin | Bulk import translations |
| POST | /api/admin/translations/locales | Admin | Add supported locale |
| DELETE | /api/admin/translations/locales/{code} | Admin | Remove locale |


---

### 13. Admin Gamification (6 endpoints)

### Admin Gamification - IMPLEMENTED (Admin only)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/admin/gamification/stats | Admin | Gamification statistics |
| GET | /api/admin/gamification/badges | Admin | List all badges with earned counts |
| POST | /api/admin/gamification/badges | Admin | Create badge |
| PUT | /api/admin/gamification/badges/{id} | Admin | Update badge |
| DELETE | /api/admin/gamification/badges/{id} | Admin | Delete badge |
| POST | /api/admin/gamification/badges/{id}/award | Admin | Award badge to user |


---

### 14. Admin Broker (13 endpoints)

### Admin Broker - IMPLEMENTED (Admin only)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/admin/broker/assignments | Admin | List broker assignments |
| GET | /api/admin/broker/assignments/{id} | Admin | Get assignment details |
| POST | /api/admin/broker/assignments | Admin | Create assignment |
| PUT | /api/admin/broker/assignments/{id} | Admin | Update assignment |
| PUT | /api/admin/broker/assignments/{id}/complete | Admin | Mark completed |
| DELETE | /api/admin/broker/assignments/{id} | Admin | Delete assignment |
| PUT | /api/admin/broker/assignments/{id}/reassign | Admin | Reassign to different broker |
| GET | /api/admin/broker/members/{memberId}/notes | Admin | Get notes for member |
| GET | /api/admin/broker/exchanges/{exchangeId}/notes | Admin | Get notes for exchange |
| POST | /api/admin/broker/notes | Admin | Create broker note |
| GET | /api/admin/broker/stats | Admin | Overall broker statistics |
| GET | /api/admin/broker/stats/{brokerId} | Admin | Stats for specific broker |
| GET | /api/admin/broker/brokers | Admin | List users with broker role |

### Admin Vetting - IMPLEMENTED (Admin only)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/admin/vetting/records | Admin | List vetting records (paginated) |
| GET | /api/admin/vetting/records/{id} | Admin | Get record details |
| POST | /api/admin/vetting/records | Admin | Create vetting record |
| PUT | /api/admin/vetting/records/{id} | Admin | Update record |
| DELETE | /api/admin/vetting/records/{id} | Admin | Delete record |
| PUT | /api/admin/vetting/records/{id}/verify | Admin | Verify record |
| PUT | /api/admin/vetting/records/{id}/reject | Admin | Reject record |
| GET | /api/admin/vetting/users/{userId}/records | Admin | All records for user |
| GET | /api/admin/vetting/expiring | Admin | Expiring records |
| GET | /api/admin/vetting/stats | Admin | Vetting statistics |
| GET | /api/admin/vetting/types | Admin | Valid vetting types |
| POST | /api/admin/vetting/bulk-verify | Admin | Verify multiple records |
| GET | /api/admin/vetting/pending | Admin | Pending records |
| GET | /api/admin/vetting/expired | Admin | Expired records |
| PUT | /api/admin/vetting/records/{id}/renew | Admin | Renew record expiry |

### Enterprise Config - IMPLEMENTED (Admin only)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/admin/enterprise/config | Admin | List enterprise configs |
| PUT | /api/admin/enterprise/config | Admin | Create or update config |
| DELETE | /api/admin/enterprise/config/{key} | Admin | Delete config |
| GET | /api/admin/enterprise/dashboard | Admin | Enterprise dashboard metrics |
| GET | /api/admin/enterprise/compliance | Admin | Compliance overview |


### FAQ - IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/faqs | No | List FAQs (?category=X&publishedOnly=true) |
| GET | /api/faqs/{id} | No | Get FAQ by ID |
| GET | /api/faqs/categories | No | List FAQ categories |
| POST | /api/faqs | Admin | Create FAQ |
| PUT | /api/faqs/{id} | Admin | Update FAQ |
| DELETE | /api/faqs/{id} | Admin | Delete FAQ |
| PUT | /api/faqs/reorder | Admin | Reorder FAQs |

### GDPR Breach Management - IMPLEMENTED (Admin only)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/admin/gdpr/breaches | Admin | List breaches (?status=X&severity=X, paginated) |
| GET | /api/admin/gdpr/breaches/{id} | Admin | Get breach details |
| POST | /api/admin/gdpr/breaches | Admin | Report new breach |
| PUT | /api/admin/gdpr/breaches/{id} | Admin | Update breach status/details |
| PUT | /api/admin/gdpr/breaches/{id}/report-authority | Admin | Mark as reported to DPA |
| GET | /api/admin/gdpr/consent-types | Admin | List consent types |
| POST | /api/admin/gdpr/consent-types | Admin | Create consent type |
| GET | /api/admin/gdpr/consent-stats | Admin | Consent statistics |

### Session Management - IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/sessions | Yes | List my active sessions |
| DELETE | /api/sessions/{id} | Yes | Terminate a session |
| DELETE | /api/sessions | Yes | Terminate all other sessions |


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

The API uses **camelCase** for JSON properties (ASP.NET Core default):

```json
{
  "id": 1,
  "firstName": "Alice",
  "lastName": "Admin",
  "createdAt": "2026-02-02T10:00:00Z",
  "tenantId": 1
}
```

**Note:** Some endpoints use explicit `[JsonPropertyName]` annotations with snake_case for backward compatibility (e.g. `access_token`, `tenant_slug` in auth responses). The default serialization is camelCase.

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

Docker is required for local development. Do NOT use `dotnet run` directly.

```powershell
# Start the full stack (API + PostgreSQL + RabbitMQ + Ollama)
cd c:\platforms\htdocs\asp.net-backend
docker compose up -d

# API will be available at http://localhost:5080
# Health check: http://localhost:5080/health
# Swagger: http://localhost:5080/swagger
```

---

## Swagger / OpenAPI

In Development mode, Swagger UI is available at:
- `http://localhost:5080/swagger`

This provides interactive API documentation where you can test endpoints directly.

---


## New Module Response Examples & UI Suggestions

### Blog & CMS

#### GET /api/blog?page=1&limit=10

```json
{
  "data": [
    {
      "id": 1,
      "title": "Community Garden Project Update",
      "slug": "community-garden-project-update",
      "content": "<p>Our community garden is thriving...</p>",
      "excerpt": "Our community garden is thriving this season",
      "featured_image_url": "/files/garden-hero.jpg",
      "status": "published",
      "tags": "garden,community,update",
      "is_featured": true,
      "view_count": 42,
      "published_at": "2026-03-01T10:00:00Z",
      "created_at": "2026-02-28T14:00:00Z",
      "updated_at": "2026-03-01T10:00:00Z",
      "category": {
        "id": 1,
        "name": "Community News",
        "slug": "community-news",
        "color": "#4CAF50"
      },
      "author": {
        "id": 1,
        "firstName": "Alice",
        "lastName": "Admin"
      },
      "meta_title": null,
      "meta_description": null
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1
  }
}
```

#### POST /api/admin/blog (Admin - Create Post)

**Request:**
```json
{
  "title": "New Community Initiative",
  "content": "<p>We are launching a new initiative...</p>",
  "excerpt": "Launching a new community initiative",
  "category_id": 1,
  "tags": "initiative,launch",
  "status": "draft"
}
```

#### UI Suggestions - Blog

1. **Blog Index Page**: Card grid with featured image, title, excerpt, category badge, author avatar, date
2. **Blog Detail Page**: Hero image, rendered HTML content, author card, related posts
3. **Category Filter**: Sidebar or top-bar filter by category with colored badges
4. **Admin Blog Editor**: Rich text editor (TipTap/Quill), slug auto-generation, draft/publish toggle, featured toggle
5. **Admin Blog List**: Table with status badges (Draft=grey, Published=green, Archived=red), bulk actions

### CMS Pages

#### GET /api/pages/{slug}

```json
{
  "data": {
    "id": 1,
    "title": "About Us",
    "slug": "about-us",
    "content": "<h2>Our Mission</h2><p>Project NEXUS...</p>",
    "is_published": true,
    "show_in_menu": true,
    "menu_location": "header",
    "sort_order": 1,
    "parent_id": null,
    "current_version": 3,
    "meta_title": "About Us - Project NEXUS",
    "meta_description": "Learn about our timebanking community",
    "created_at": "2026-01-15T10:00:00Z",
    "updated_at": "2026-03-05T09:00:00Z",
    "created_by": {
      "id": 1,
      "firstName": "Alice",
      "lastName": "Admin"
    }
  }
}
```

#### GET /api/pages/menu?location=header

```json
{
  "data": [
    { "id": 1, "title": "About Us", "slug": "about-us", "menu_location": "header", "sort_order": 1, "parent_id": null },
    { "id": 2, "title": "How It Works", "slug": "how-it-works", "menu_location": "header", "sort_order": 2, "parent_id": null },
    { "id": 3, "title": "FAQ", "slug": "faq", "menu_location": "header", "sort_order": 3, "parent_id": null }
  ]
}
```

#### UI Suggestions - Pages

1. **Dynamic Navigation**: Fetch `/api/pages/menu?location=header` on app load, render as nav links
2. **Footer Links**: Fetch `/api/pages/menu?location=footer` for footer navigation
3. **Page Renderer**: Render `content` as sanitized HTML (use DOMPurify)
4. **Admin Page Editor**: Rich text editor with version history sidebar, revert button, duplicate action
5. **Admin Page Tree**: Drag-and-drop reorder with parent-child nesting

### Organisations

#### GET /api/organisations?page=1&limit=20

```json
{
  "data": [
    {
      "id": 1,
      "name": "Community Garden Co-op",
      "slug": "community-garden-coop",
      "description": "A cooperative managing community gardens across the region",
      "logo_url": "/files/coop-logo.png",
      "website_url": "https://garden-coop.example.com",
      "email": "info@garden-coop.example.com",
      "phone": "+353 21 123 4567",
      "address": "Main Street, Bantry, Co. Cork",
      "latitude": 51.6806,
      "longitude": -9.4536,
      "type": "charity",
      "industry": "Community Development",
      "status": "verified",
      "is_public": true,
      "created_at": "2026-01-20T10:00:00Z",
      "verified_at": "2026-01-25T14:00:00Z",
      "owner": {
        "id": 1,
        "firstName": "Alice",
        "lastName": "Admin"
      }
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 1 }
}
```

#### POST /api/organisations (Create)

**Request:**
```json
{
  "name": "West Cork Tech Hub",
  "description": "Co-working and tech community space",
  "type": "business",
  "industry": "Technology",
  "email": "hello@wcth.example.com",
  "is_public": true
}
```

#### UI Suggestions - Organisations

1. **Organisation Directory**: Card grid with logo, name, type badge, verified tick, member count
2. **Organisation Profile**: Full detail page with map (if lat/lng), member list, wallet balance
3. **Create Organisation Form**: Multi-step form: basics, contact info, location (optional map picker)
4. **Member Management**: Table of members with role dropdown (owner/admin/member/volunteer), add/remove
5. **Admin Org Queue**: List pending orgs with verify/suspend actions

### Organisation Wallets

#### GET /api/organisations/{orgId}/wallet

```json
{
  "data": {
    "id": 1,
    "organisation_id": 1,
    "balance": 150.5,
    "total_received": 200.0,
    "total_spent": 49.5,
    "created_at": "2026-01-20T10:00:00Z"
  }
}
```

#### POST /api/organisations/{orgId}/wallet/donate

**Request:**
```json
{
  "amount": 5.0,
  "description": "Monthly donation"
}
```

#### UI Suggestions - Org Wallets

1. **Wallet Dashboard**: Balance card with total received/spent, recent transactions list
2. **Donate Button**: Modal with amount input, description, confirmation
3. **Transfer (Admin/Owner)**: Select user from org members, enter amount
4. **Transaction History**: Filterable table with type icons (credit=green, debit=red)

### NexusScore

#### GET /api/nexus-score/me

```json
{
  "data": {
    "userId": 1,
    "score": 720,
    "tier": "trusted",
    "exchange_score": 180,
    "review_score": 150,
    "engagement_score": 140,
    "reliability_score": 130,
    "tenure_score": 120,
    "last_calculated_at": "2026-03-08T00:00:00Z"
  }
}
```

#### GET /api/nexus-score/leaderboard?page=1&limit=10

```json
{
  "data": [
    {
      "userId": 1,
      "score": 720,
      "tier": "trusted",
      "last_calculated_at": "2026-03-08T00:00:00Z",
      "user": { "id": 1, "firstName": "Alice", "lastName": "Admin" }
    },
    {
      "userId": 2,
      "score": 540,
      "tier": "established",
      "last_calculated_at": "2026-03-08T00:00:00Z",
      "user": { "id": 2, "firstName": "Bob", "lastName": "Member" }
    }
  ]
}
```

**NexusScore tiers:**

| Tier | Score Range | Description |
|------|------------|-------------|
| Newcomer | 0-199 | Just getting started |
| Emerging | 200-399 | Building reputation |
| Established | 400-599 | Active community member |
| Trusted | 600-799 | Highly reliable |
| Exemplary | 800-1000 | Community leader |

#### UI Suggestions - NexusScore

1. **Score Card**: Circular gauge (0-1000) with tier badge and color coding
2. **Dimension Breakdown**: Radar/spider chart showing 5 dimensions (exchange, review, engagement, reliability, tenure)
3. **Score History**: Line chart showing score changes over time
4. **Leaderboard**: Ranked list with tier badges, current user highlighted
5. **Tier Distribution (Admin)**: Pie chart showing community tier breakdown
6. **Recalculate Button**: "Refresh my score" with loading state

### Onboarding Wizard

#### GET /api/onboarding/progress

```json
{
  "data": {
    "completed_steps": [
      { "step_id": 1, "key": "profile_complete", "completed_at": "2026-03-01T10:00:00Z" },
      { "step_id": 2, "key": "skills_added", "completed_at": "2026-03-02T14:00:00Z" }
    ],
    "total_steps": 5,
    "completed_count": 2,
    "completion_percentage": 40.0
  }
}
```

#### POST /api/onboarding/complete

**Request:**
```json
{
  "step_key": "first_listing"
}
```

#### UI Suggestions - Onboarding

1. **Progress Bar**: Horizontal stepper or progress bar showing completion percentage
2. **Step Cards**: Checklist with completed (green tick) and pending (grey circle) steps
3. **Guided Flow**: Full-screen wizard that walks new users through each step
4. **Dashboard Widget**: Compact progress indicator on the main dashboard for new users
5. **XP Reward Toast**: Show XP earned when completing each step

### Voice Messages

#### GET /api/voice-messages/conversation/{conversationId}

```json
{
  "data": [
    {
      "id": 1,
      "sender_id": 2,
      "conversation_id": 1,
      "audio_url": "/files/voice/msg-123.webm",
      "duration_seconds": 15,
      "file_size_bytes": 24000,
      "format": "webm",
      "transcription": "Hey, just wanted to check if you are free on Saturday...",
      "is_read": false,
      "created_at": "2026-03-08T10:30:00Z",
      "sender": { "id": 2, "firstName": "Bob", "lastName": "Member" }
    }
  ]
}
```

#### POST /api/voice-messages

**Request:**
```json
{
  "conversation_id": 1,
  "audio_url": "/files/voice/msg-456.webm",
  "duration_seconds": 8,
  "file_size_bytes": 12800,
  "format": "webm"
}
```

#### UI Suggestions - Voice Messages

1. **Audio Player**: Inline waveform player with play/pause, duration, sender name
2. **Record Button**: Hold-to-record button in conversation view (use MediaRecorder API)
3. **Transcription Toggle**: Show/hide text transcription below the audio player
4. **Unread Indicator**: Blue dot on unread voice messages
5. **Format Support**: Record in WebM (Chrome/Firefox) or MP3 fallback

### Insurance Certificates

#### GET /api/insurance

```json
{
  "data": [
    {
      "id": 1,
      "type": "public_liability",
      "provider": "Allianz",
      "policy_number": "PL-2026-12345",
      "cover_amount": 5000000.00,
      "start_date": "2026-01-01T00:00:00Z",
      "expiry_date": "2027-01-01T00:00:00Z",
      "document_url": "/files/insurance/cert-123.pdf",
      "status": "verified",
      "verified_at": "2026-01-15T10:00:00Z",
      "created_at": "2026-01-10T09:00:00Z",
      "updated_at": null,
      "user": { "id": 1, "firstName": "Alice", "lastName": "Admin" },
      "verified_by": { "id": 5, "firstName": "Eve", "lastName": "Verifier" }
    }
  ]
}
```

#### UI Suggestions - Insurance

1. **Certificate List**: Cards showing type, provider, status badge, expiry date with days-remaining
2. **Upload Form**: File upload with type dropdown, policy number, dates, cover amount
3. **Status Badges**: Pending (yellow), Verified (green), Expired (red), Rejected (grey)
4. **Expiry Warnings**: Amber banner for certificates expiring within 30 days
5. **Admin Review Queue**: Pending certs with document preview, verify/reject buttons



### Admin Broker Controls

#### GET /api/admin/broker/assignments?status=active

```json
{
  "data": [
    {
      "id": 1,
      "broker_id": 5,
      "member_id": 12,
      "status": "active",
      "priority": "high",
      "notes": "New member needs onboarding support",
      "created_at": "2026-03-01T10:00:00Z",
      "completed_at": null,
      "broker": { "id": 5, "firstName": "Eve", "lastName": "Broker" },
      "member": { "id": 12, "firstName": "Frank", "lastName": "Newcomer" }
    }
  ]
}
```

#### GET /api/admin/broker/stats

```json
{
  "data": {
    "total_assignments": 45,
    "active_assignments": 12,
    "completed_assignments": 30,
    "overdue_assignments": 3,
    "active_brokers": 5,
    "avg_completion_days": 7.2
  }
}
```

#### UI Suggestions - Broker Controls

1. **Assignment Board**: Kanban-style board (Active, In Progress, Completed) with drag-and-drop
2. **Broker Dashboard**: Per-broker stats card showing active count, completion rate
3. **Member Notes Timeline**: Chronological notes for a member with broker attribution
4. **Reassignment Modal**: Select broker from dropdown, optional note
5. **Priority Indicators**: Color-coded badges (red=high, amber=medium, green=low)


---

### 15. Admin Vetting (15 endpoints)

### Admin Vetting (DBS Records)

#### GET /api/admin/vetting/records?status=pending&page=1

```json
{
  "data": [
    {
      "id": 1,
      "user_id": 12,
      "type": "dbs_basic",
      "reference_number": "DBS-2026-12345",
      "status": "pending",
      "issued_date": "2026-01-15T00:00:00Z",
      "expiry_date": "2029-01-15T00:00:00Z",
      "document_url": "/files/vetting/dbs-12345.pdf",
      "notes": null,
      "verified_at": null,
      "created_at": "2026-03-01T09:00:00Z",
      "user": { "id": 12, "firstName": "Frank", "lastName": "Newcomer" },
      "verified_by": null
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 3, "pages": 1 }
}
```

#### GET /api/admin/vetting/types

```json
{
  "data": ["dbs_basic", "dbs_standard", "dbs_enhanced", "access_ni", "pvg_scotland", "garda_vetting", "international", "other"]
}
```

#### GET /api/admin/vetting/stats

```json
{
  "data": {
    "total_records": 85,
    "pending": 8,
    "verified": 65,
    "expired": 10,
    "rejected": 2,
    "expiring_30_days": 5
  }
}
```

#### UI Suggestions - Vetting

1. **Review Queue**: Table of pending records with document preview (PDF viewer), verify/reject buttons
2. **Expiry Dashboard**: Calendar view or list sorted by expiry date with color-coded urgency
3. **Bulk Verify**: Checkbox selection + "Verify Selected" action for batch processing
4. **User Vetting Tab**: On user profile admin view, show all vetting records for that user
5. **Type Filter**: Dropdown filter by vetting type (DBS Basic, Enhanced, Garda, etc.)
6. **Renewal Alerts**: Admin notification when records are 30 days from expiry


---

### 16. Enterprise Config (5 endpoints)

### Enterprise Config & Governance

#### GET /api/admin/enterprise/config?category=security

```json
{
  "data": [
    {
      "id": 1,
      "key": "max_login_attempts",
      "value": "5",
      "category": "security",
      "description": "Maximum failed login attempts before lockout",
      "is_sensitive": false,
      "updated_at": "2026-02-15T10:00:00Z",
      "updated_by": { "id": 1, "firstName": "Alice", "lastName": "Admin" }
    },
    {
      "id": 2,
      "key": "session_timeout_minutes",
      "value": "120",
      "category": "security",
      "description": "Session timeout in minutes",
      "is_sensitive": false,
      "updated_at": "2026-02-15T10:00:00Z",
      "updated_by": { "id": 1, "firstName": "Alice", "lastName": "Admin" }
    }
  ]
}
```

#### GET /api/admin/enterprise/dashboard

```json
{
  "data": {
    "total_users": 245,
    "active_users_30d": 180,
    "total_exchanges": 1250,
    "total_credits_transferred": 8500.5,
    "pending_approvals": 3,
    "active_breaches": 0,
    "compliance_score": 92
  }
}
```

#### GET /api/admin/enterprise/compliance

```json
{
  "data": {
    "gdpr_status": "compliant",
    "open_data_requests": 2,
    "pending_deletions": 1,
    "active_breaches": 0,
    "consent_coverage": 95.2,
    "last_audit_date": "2026-02-01T00:00:00Z"
  }
}
```

#### UI Suggestions - Enterprise

1. **Config Editor**: Grouped settings by category (security, features, limits), inline editing
2. **Enterprise Dashboard**: Key metrics cards with trend arrows, compliance gauge
3. **Compliance Panel**: Traffic-light indicators (green/amber/red) for each compliance area
4. **Sensitive Values**: Mask sensitive config values (show as ****), reveal on click


---

### 17. GDPR Breach Management (8 endpoints)

### GDPR Breach Management - IMPLEMENTED (Admin only)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/admin/gdpr/breaches | Admin | List breaches (?status=X&severity=X, paginated) |
| GET | /api/admin/gdpr/breaches/{id} | Admin | Get breach details |
| POST | /api/admin/gdpr/breaches | Admin | Report new breach |
| PUT | /api/admin/gdpr/breaches/{id} | Admin | Update breach status/details |
| PUT | /api/admin/gdpr/breaches/{id}/report-authority | Admin | Mark as reported to DPA |
| GET | /api/admin/gdpr/consent-types | Admin | List consent types |
| POST | /api/admin/gdpr/consent-types | Admin | Create consent type |
| GET | /api/admin/gdpr/consent-stats | Admin | Consent statistics |


### GDPR Breach Management

#### GET /api/admin/gdpr/breaches?status=detected&page=1

```json
{
  "data": [
    {
      "id": 1,
      "title": "Unauthorized data export detected",
      "severity": "high",
      "status": "detected",
      "affected_users_count": 12,
      "detected_at": "2026-03-08T10:00:00Z",
      "contained_at": null,
      "resolved_at": null,
      "reported_to_authority_at": null,
      "reported_by": { "id": 1, "firstName": "Alice", "lastName": "Admin" },
      "created_at": "2026-03-08T10:05:00Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 1, "pages": 1 }
}
```

**Breach statuses:** `detected` > `contained` > `investigating` > `remediated` > `resolved` > `closed`
**Severity levels:** `low`, `medium`, `high`, `critical`

#### UI Suggestions - GDPR Breach

1. **Breach Timeline**: Vertical timeline showing status progression with timestamps
2. **Severity Badges**: Color-coded (green=low, amber=medium, red=high, purple=critical)
3. **72-Hour Clock**: GDPR requires breach notification within 72 hours — show countdown from detection
4. **Authority Report Button**: One-click "Report to DPA" with reference number input
5. **Remediation Checklist**: Editable remediation steps with progress tracking


---

### 18. Tenant Hierarchy (6 endpoints, all admin-only)

### Tenant Hierarchy - IMPLEMENTED (Admin only)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/system/tenant-hierarchy | Admin | Get full hierarchy tree |
| GET | /api/system/tenant-hierarchy/{parentId}/children | Admin | Get children of tenant |
| GET | /api/system/tenant-hierarchy/{childId}/parent | Admin | Get parent of tenant |
| POST | /api/system/tenant-hierarchy | Admin | Create parent-child relationship |
| PUT | /api/system/tenant-hierarchy/{id} | Admin | Update relationship |
| DELETE | /api/system/tenant-hierarchy/{id} | Admin | Delete relationship |


---

### 19. Admin Endpoints in Mixed-Access Sections

These sections contain both public and admin endpoints. Only the admin endpoints are listed here.

#### Blog Admin

| POST | /api/admin/blog | Admin | Create blog post |
| PUT | /api/admin/blog/{id} | Admin | Update blog post |
| DELETE | /api/admin/blog/{id} | Admin | Delete blog post |
| POST | /api/admin/blog/{id}/toggle-status | Admin | Toggle draft/published |
| POST | /api/admin/blog/{id}/toggle-featured | Admin | Toggle featured flag |
| POST | /api/admin/blog/categories | Admin | Create blog category |
| PUT | /api/admin/blog/categories/{id} | Admin | Update blog category |
| DELETE | /api/admin/blog/categories/{id} | Admin | Delete blog category |

#### POST /api/admin/blog (Admin - Create Post)

**Request:**
```json
{
  "title": "New Community Initiative",
  "content": "<p>We are launching a new initiative...</p>",
  "excerpt": "Launching a new community initiative",
  "category_id": 1,
  "tags": "initiative,launch",
  "status": "draft"
}
```

#### UI Suggestions - Blog

1. **Blog Index Page**: Card grid with featured image, title, excerpt, category badge, author avatar, date
2. **Blog Detail Page**: Hero image, rendered HTML content, author card, related posts
3. **Category Filter**: Sidebar or top-bar filter by category with colored badges
4. **Admin Blog Editor**: Rich text editor (TipTap/Quill), slug auto-generation, draft/publish toggle, featured toggle
5. **Admin Blog List**: Table with status badges (Draft=grey, Published=green, Archived=red), bulk actions


#### CMS Pages Admin

| GET | /api/admin/pages | Admin | List all pages (incl. unpublished) |
| GET | /api/admin/pages/{id} | Admin | Get page details with versioning |
| POST | /api/admin/pages | Admin | Create CMS page |
| PUT | /api/admin/pages/{id} | Admin | Update page |
| DELETE | /api/admin/pages/{id} | Admin | Delete page |
| GET | /api/admin/pages/{id}/versions | Admin | Get version history |
| POST | /api/admin/pages/{id}/revert | Admin | Revert to specific version |
| POST | /api/admin/pages/{id}/duplicate | Admin | Duplicate a page |

#### UI Suggestions - Pages

1. **Dynamic Navigation**: Fetch `/api/pages/menu?location=header` on app load, render as nav links
2. **Footer Links**: Fetch `/api/pages/menu?location=footer` for footer navigation
3. **Page Renderer**: Render `content` as sanitized HTML (use DOMPurify)
4. **Admin Page Editor**: Rich text editor with version history sidebar, revert button, duplicate action
5. **Admin Page Tree**: Drag-and-drop reorder with parent-child nesting


#### Organisations Admin

| GET | /api/admin/organisations | Admin | List all organisations |
| PUT | /api/admin/organisations/{id}/verify | Admin | Verify organisation |
| PUT | /api/admin/organisations/{id}/suspend | Admin | Suspend organisation |

#### UI Suggestions - Organisations

1. **Organisation Directory**: Card grid with logo, name, type badge, verified tick, member count
2. **Organisation Profile**: Full detail page with map (if lat/lng), member list, wallet balance
3. **Create Organisation Form**: Multi-step form: basics, contact info, location (optional map picker)
4. **Member Management**: Table of members with role dropdown (owner/admin/member/volunteer), add/remove
5. **Admin Org Queue**: List pending orgs with verify/suspend actions


#### Insurance Admin

| GET | /api/insurance/admin/pending | Admin | List pending certificates |
| GET | /api/insurance/admin/expiring | Admin | List expiring certificates |
| PUT | /api/insurance/admin/{id}/verify | Admin | Verify certificate |
| PUT | /api/insurance/admin/{id}/reject | Admin | Reject certificate |

#### UI Suggestions - Insurance

1. **Certificate List**: Cards showing type, provider, status badge, expiry date with days-remaining
2. **Upload Form**: File upload with type dropdown, policy number, dates, cover amount
3. **Status Badges**: Pending (yellow), Verified (green), Expired (red), Rejected (grey)
4. **Expiry Warnings**: Amber banner for certificates expiring within 30 days
5. **Admin Review Queue**: Pending certs with document preview, verify/reject buttons


#### NexusScore Admin

| GET | /api/nexus-score/distribution | Admin | Tier distribution stats |
| POST | /api/nexus-score/admin/recalculate/{userId} | Admin | Force recalculate user score |


**NexusScore tiers:**

| Tier | Score Range | Description |
|------|------------|-------------|
| Newcomer | 0-199 | Just getting started |
| Emerging | 200-399 | Building reputation |
| Established | 400-599 | Active community member |
| Trusted | 600-799 | Highly reliable |
| Exemplary | 800-1000 | Community leader |

#### UI Suggestions - NexusScore

1. **Score Card**: Circular gauge (0-1000) with tier badge and color coding
2. **Dimension Breakdown**: Radar/spider chart showing 5 dimensions (exchange, review, engagement, reliability, tenure)
3. **Score History**: Line chart showing score changes over time
4. **Leaderboard**: Ranked list with tier badges, current user highlighted
5. **Tier Distribution (Admin)**: Pie chart showing community tier breakdown
6. **Recalculate Button**: "Refresh my score" with loading state


#### Onboarding Admin

| POST | /api/onboarding/admin/steps | Admin | Create onboarding step |
| PUT | /api/onboarding/admin/steps/{id} | Admin | Update onboarding step |
| DELETE | /api/onboarding/admin/steps/{id} | Admin | Delete onboarding step |


#### Search Admin

| GET | /api/admin/search/stats | Admin | Meilisearch index stats |
| POST | /api/admin/search/reindex | Admin | Trigger full reindex for tenant |
| POST | /api/admin/search/reindex/{type} | Admin | Reindex specific type |


#### Verification Badges Admin

| POST | /api/admin/verification-badges/award | Admin | Award badge to user |


#### Feed Moderation Admin

| GET | /api/admin/feed/reported | Admin | List reported posts (paginated) |


#### Newsletter Admin

| GET | /api/admin/newsletter | Admin | List newsletters |
| GET | /api/admin/newsletter/{id} | Admin | Get newsletter |
| POST | /api/admin/newsletter | Admin | Create newsletter |
| PUT | /api/admin/newsletter/{id} | Admin | Update newsletter |
| POST | /api/admin/newsletter/{id}/send | Admin | Send newsletter |
| PUT | /api/admin/newsletter/{id}/cancel | Admin | Cancel newsletter |
| GET | /api/admin/newsletter/subscribers | Admin | List subscribers |
| GET | /api/admin/newsletter/stats | Admin | Subscription statistics |


#### Translation Admin (via i18n controller)

| POST | /api/admin/i18n/translations | Admin | Set translation |
| POST | /api/admin/i18n/translations/bulk | Admin | Bulk import translations |
| POST | /api/admin/i18n/locales | Admin | Add locale |
| GET | /api/admin/i18n/stats | Admin | Translation stats |
| GET | /api/admin/i18n/missing/{locale} | Admin | Get missing keys |


#### Predictive Staffing Admin

| GET | /api/admin/staffing/predictions | Admin | Get staffing predictions |
| GET | /api/admin/staffing/available | Admin | Get available volunteers |
| GET | /api/admin/staffing/dashboard | Admin | Staffing dashboard |
| GET | /api/admin/staffing/patterns | Admin | Historical patterns |


#### Knowledge Base Admin

| POST | /api/admin/kb/articles | Admin | Create article |


#### Legal Documents Admin

| POST | /api/admin/legal/documents | Admin | Create document |


#### FAQ Admin

| POST | /api/faqs | Admin | Create FAQ |
| PUT | /api/faqs/{id} | Admin | Update FAQ |
| DELETE | /api/faqs/{id} | Admin | Delete FAQ |
| PUT | /api/faqs/reorder | Admin | Reorder FAQs |

#### UI Suggestions - FAQ

1. **Accordion Layout**: Collapsible question/answer pairs grouped by category
2. **Category Tabs**: Horizontal tabs for each FAQ category
3. **Search Bar**: Client-side filter across questions and answers
4. **Admin FAQ Editor**: Drag-and-drop reorder, inline edit, publish toggle
5. **Help Widget**: Floating help button that opens FAQ search in a modal


#### Member Activity Admin

| GET | /api/admin/activity/stats | Admin | Activity breakdown by type |


#### Federation Admin

| GET | /api/admin/federation/partners | Admin | List partners |
| POST | /api/admin/federation/partners | Admin | Request partnership |
| PUT | /api/admin/federation/partners/{id}/approve | Admin | Approve partnership |
| PUT | /api/admin/federation/partners/{id}/suspend | Admin | Suspend partnership |
| GET | /api/admin/federation/api-keys | Admin | List API keys |
| POST | /api/admin/federation/api-keys | Admin | Create API key |
| DELETE | /api/admin/federation/api-keys/{id} | Admin | Revoke API key |
| GET | /api/admin/federation/features | Admin | Feature toggles |
| PUT | /api/admin/federation/features | Admin | Set feature toggle |
| GET | /api/admin/federation/stats | Admin | Federation statistics |


#### Organisation Wallet Admin

| POST | /api/organisations/{orgId}/wallet/grant | Admin | Admin grant credits to org wallet |


---

### 20. Registration Policy Admin (6 endpoints)

| GET | /api/registration/admin/policy | Admin | Get full registration policy |
| PUT | /api/registration/admin/policy | Admin | Update registration policy |
| GET | /api/registration/admin/pending | Admin | List users pending approval |
| PUT | /api/registration/admin/users/{id}/approve | Admin | Approve user registration |
| PUT | /api/registration/admin/users/{id}/reject | Admin | Reject user registration |
| GET | /api/registration/admin/options | Admin | List available modes, providers, levels |


### Admin Settings UI

#### Fetch Available Options

```
GET /api/registration/admin/options
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "modes": [
      { "value": 0, "name": "Standard" },
      { "value": 1, "name": "StandardWithApproval" },
      { "value": 2, "name": "VerifiedIdentity" },
      { "value": 3, "name": "GovernmentId" },
      { "value": 4, "name": "InviteOnly" }
    ],
    "providers": [
      { "value": 0, "name": "None" },
      { "value": 1, "name": "Mock" },
      { "value": 10, "name": "Veriff" },
      { "value": 11, "name": "Jumio" },
      { "value": 12, "name": "Persona" },
      { "value": 13, "name": "Entrust" },
      { "value": 14, "name": "Trulioo" },
      { "value": 15, "name": "Yoti" },
      { "value": 16, "name": "StripeIdentity" },
      { "value": 17, "name": "UkCertified" },
      { "value": 18, "name": "EudiWallet" },
      { "value": 99, "name": "Custom" }
    ],
    "verification_levels": [
      { "value": 0, "name": "None" },
      { "value": 1, "name": "DocumentOnly" },
      { "value": 2, "name": "DocumentAndSelfie" },
      { "value": 3, "name": "AuthoritativeDataMatch" },
      { "value": 4, "name": "ReusableDigitalId" },
      { "value": 5, "name": "ManualReviewFallback" }
    ],
    "post_verification_actions": [
      { "value": 0, "name": "ActivateAutomatically" },
      { "value": 1, "name": "SendToAdminForApproval" },
      { "value": 2, "name": "GrantLimitedAccess" },
      { "value": 3, "name": "RejectOnFailure" }
    ]
  }
}
```

#### Fetch Current Policy

```
GET /api/registration/admin/policy
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "mode": "StandardWithApproval",
    "mode_value": 1,
    "provider": "None",
    "provider_value": 0,
    "verification_level": "None",
    "verification_level_value": 0,
    "post_verification_action": "ActivateAutomatically",
    "post_verification_action_value": 0,
    "has_provider_config": false,
    "custom_webhook_url": null,
    "custom_provider_name": null,
    "registration_message": "Your account will be reviewed by an administrator.",
    "invite_code": null,
    "max_invite_uses": null,
    "invite_uses_count": 0,
    "is_active": true,
    "updated_at": "2026-03-07T10:00:00Z",
    "updated_by_user_id": 1
  }
}
```

#### Update Policy

```
PUT /api/registration/admin/policy
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "mode": 2,
  "provider": 1,
  "verification_level": 1,
  "post_verification_action": 0,
  "registration_message": "Please verify your identity to join our community."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration policy updated"
}
```

#### Admin Settings Form Layout

```
┌─────────────────────────────────────────────────────────┐
│  Registration Settings                                   │
│                                                          │
│  Registration Method:                                    │
│  ┌─────────────────────────────────────────────────────┐│
│  │ Standard Registration + Admin Approval          ▼   ││
│  └─────────────────────────────────────────────────────┘│
│                                                          │
│  ─── Shown when "Verified Identity" selected ───         │
│                                                          │
│  Identity Provider:                                      │
│  ┌─────────────────────────────────────────────────────┐│
│  │ Mock Provider (Development)                     ▼   ││
│  └─────────────────────────────────────────────────────┘│
│                                                          │
│  Verification Level:                                     │
│  ┌─────────────────────────────────────────────────────┐│
│  │ Document Only                                   ▼   ││
│  └─────────────────────────────────────────────────────┘│
│                                                          │
│  After Verification:                                     │
│  ┌─────────────────────────────────────────────────────┐│
│  │ Activate Automatically                          ▼   ││
│  └─────────────────────────────────────────────────────┘│
│                                                          │
│  ─── Shown when "Invite Only" selected ───               │
│                                                          │
│  Invite Code:                                            │
│  ┌─────────────────────────────────────────────────────┐│
│  │ SECRET123                                           ││
│  └─────────────────────────────────────────────────────┘│
│                                                          │
│  Max Uses (blank = unlimited):                           │
│  ┌─────────────────────────────────────────────────────┐│
│  │ 100                                                 ││
│  └─────────────────────────────────────────────────────┘│
│                                                          │
│  ─── Always shown ───                                    │
│                                                          │
│  Registration Message (shown to users):                  │
│  ┌─────────────────────────────────────────────────────┐│
│  │ Welcome! Your account will be reviewed before       ││
│  │ activation.                                         ││
│  └─────────────────────────────────────────────────────┘│
│                                                          │
│  [ Save Settings ]                                       │
└─────────────────────────────────────────────────────────┘
```

**Conditional field visibility:**
```typescript
const showProviderFields = mode === 'VerifiedIdentity' || mode === 'GovernmentId';
const showInviteFields = mode === 'InviteOnly';
```

### Admin Approval Queue

```
GET /api/registration/admin/pending?page=1&limit=20
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 43,
      "email": "pending@example.com",
      "first_name": "Jane",
      "last_name": "Doe",
      "registration_status": "PendingAdminReview",
      "created_at": "2026-03-07T09:30:00Z"
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

**Approve:**
```
PUT /api/registration/admin/users/43/approve
Authorization: Bearer <admin-token>
```

**Reject:**
```
PUT /api/registration/admin/users/43/reject
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "reason": "Unable to verify identity through alternative means."
}
```


| Status | Error | Cause |
|--------|-------|-------|
| 400 | "Invalid or missing invite code." | InviteOnly mode, wrong/missing code |
| 400 | "Invite code has reached its maximum usage limit." | Invite exhausted |
| 400 | "User is not in PendingVerification status" | Verification start on wrong state |
| 400 | "No verification provider configured for this tenant." | Provider not set |
| 400 | "Invalid provider" | Bad webhook provider param |
| 400 | "Cannot approve user. Check registration status." | Approve on non-pending user |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Non-admin calling admin endpoint |
| 404 | "Tenant not found" | Invalid tenant_slug |
| 404 | "No verification session found" | Status check before session created |

### State Machine Reference

```
Standard:           Register → Active
WithApproval:       Register → PendingAdminReview → Active | Rejected
VerifiedIdentity:   Register → PendingVerification → [Verification] → Active | PendingAdminReview | VerificationFailed
GovernmentId:       Register → PendingVerification → [Verification] → Active | PendingAdminReview | VerificationFailed
InviteOnly:         Register (+ code) → Active
```

---

## Refine Data Provider Notes

The admin panel uses Refine framework. Key mapping notes:
- Refine expects `data` and `total` in list responses -- the API returns `data` + `pagination.total`
- Map API pagination (`page`, `limit`) to Refine's pagination params
- Admin role is checked server-side -- 403 returned if non-admin JWT used
- All endpoints are tenant-scoped via the JWT's tenant_id claim
