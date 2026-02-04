# Phase 1 Execution Proof Plan: Listings READ API

## Prerequisites

- Docker Desktop installed and running

---

## Step 1: Start the Docker Stack

```powershell
# Start the full stack (API + PostgreSQL)
docker compose up -d

# Verify containers are healthy
docker compose ps

# View logs (optional)
docker compose logs -f api
```

The API will auto-migrate the database and seed listings data on startup.

---

## Step 2: Verify Seed Data

After startup, the database contains:

| Entity | ID | Tenant | Title/Name | Type |
|--------|-----|--------|------------|------|
| Tenant | 1 | acme | ACME Corporation | - |
| Tenant | 2 | globex | Globex Industries | - |
| User | 1 | 1 | Alice Admin | admin |
| User | 2 | 2 | Bob Boss | admin |
| User | 3 | 1 | Charlie Contributor | member |
| Listing | 1 | 1 | Home Repair Assistance | offer |
| Listing | 2 | 1 | Need Help Moving Furniture | request |
| Listing | 3 | 1 | Garden Weeding Services | offer (featured) |
| Listing | 4 | 2 | Computer Tutoring | offer |
| Listing | 5 | 2 | Looking for Dog Walker | request |

---

## Step 3: Run Tests

### Test 1: Login and Get Token (Tenant 1)

```powershell
$baseUrl = "http://localhost:5080"

$r1 = Invoke-RestMethod "$baseUrl/api/auth/login" -Method POST -Body '{"email":"admin@acme.test","password":"Test123!","tenant_slug":"acme"}' -ContentType "application/json"
$token1 = $r1.access_token
Write-Host "Tenant 1 token acquired"
```

### Test 2: Login Tenant 2

```powershell
$r2 = Invoke-RestMethod "$baseUrl/api/auth/login" -Method POST -Body '{"email":"admin@globex.test","password":"Test123!","tenant_slug":"globex"}' -ContentType "application/json"
$token2 = $r2.access_token
Write-Host "Tenant 2 token acquired"
```

---

### Test 3: List Listings (Tenant 1)

```powershell
$listings1 = Invoke-RestMethod "$baseUrl/api/listings" -Headers @{Authorization="Bearer $token1"}
$listings1 | ConvertTo-Json -Depth 5

Write-Host "Tenant 1 listings count: $($listings1.data.Count) (expected: 3)"
```

**Expected Response:**

```json
{
  "data": [
    {
      "id": 3,
      "title": "Garden Weeding Services",
      "description": "Happy to help with garden maintenance and weeding.",
      "type": "offer",
      "status": "active",
      "location": "Suburbs",
      "estimated_hours": 1.5,
      "is_featured": true,
      "view_count": 0,
      "expires_at": null,
      "created_at": "2026-02-01T...",
      "updated_at": null,
      "user": {
        "id": 3,
        "first_name": "Charlie",
        "last_name": "Contributor"
      }
    },
    {
      "id": 2,
      "title": "Need Help Moving Furniture",
      "type": "request",
      ...
    },
    {
      "id": 1,
      "title": "Home Repair Assistance",
      "type": "offer",
      ...
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 3,
    "pages": 1
  }
}
```

**Pass Criteria:**
- Returns 3 listings (not 5 - only Tenant 1's listings)
- All listings have `tenant_id` = 1 (not visible in response but enforced)
- Sorted by `created_at` descending

---

### Test 4: List Listings (Tenant 2)

```powershell
$listings2 = Invoke-RestMethod "$baseUrl/api/listings" -Headers @{Authorization="Bearer $token2"}
Write-Host "Tenant 2 listings count: $($listings2.data.Count) (expected: 2)"
```

**Pass Criteria:**
- Returns 2 listings (only Tenant 2's listings)
- Should NOT see any of Tenant 1's listings

---

### Test 5: Get Listing Details (Tenant 1)

```powershell
$listing1 = Invoke-RestMethod "$baseUrl/api/listings/1" -Headers @{Authorization="Bearer $token1"}
$listing1 | ConvertTo-Json -Depth 3
```

**Expected Response:**

```json
{
  "id": 1,
  "title": "Home Repair Assistance",
  "description": "I can help with basic home repairs - fixing doors, shelves, minor plumbing issues.",
  "type": "offer",
  "status": "active",
  "category_id": null,
  "location": "Downtown",
  "estimated_hours": 2.0,
  "is_featured": false,
  "view_count": 0,
  "expires_at": null,
  "created_at": "2026-01-28T...",
  "updated_at": null,
  "user": {
    "id": 1,
    "first_name": "Alice",
    "last_name": "Admin"
  }
}
```

---

### Test 6: Cross-Tenant Access Blocked (CRITICAL)

```powershell
# Try to access Tenant 1's listing (id=1) with Tenant 2's token
try {
    Invoke-RestMethod "$baseUrl/api/listings/1" -Headers @{Authorization="Bearer $token2"}
    Write-Host "FAIL: Should have returned 404" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 404) {
        Write-Host "PASS: Cross-tenant access blocked (404)" -ForegroundColor Green
    } else {
        Write-Host "FAIL: Expected 404, got $statusCode" -ForegroundColor Red
    }
}
```

**Pass Criteria:**
- Returns 404 Not Found
- Tenant 2 user CANNOT see Tenant 1's listing

---

### Test 7: X-Tenant-ID Header Cannot Override JWT

```powershell
# Try to use X-Tenant-ID header to access Tenant 2's listings with Tenant 1's token
$listings3 = Invoke-RestMethod "$baseUrl/api/listings" -Headers @{Authorization="Bearer $token1";"X-Tenant-ID"="2"}
Write-Host "Listings returned: $($listings3.data.Count)"

# Should still return Tenant 1's listings (3), not Tenant 2's (2)
if ($listings3.data.Count -eq 3) {
    Write-Host "PASS: X-Tenant-ID header ignored (JWT wins)" -ForegroundColor Green
} else {
    Write-Host "FAIL: Header overrode JWT tenant" -ForegroundColor Red
}
```

---

### Test 8: Filter by Type

```powershell
# Get only offers
$offers = Invoke-RestMethod "$baseUrl/api/listings?type=offer" -Headers @{Authorization="Bearer $token1"}
Write-Host "Offers count: $($offers.data.Count) (expected: 2)"

# Get only requests
$requests = Invoke-RestMethod "$baseUrl/api/listings?type=request" -Headers @{Authorization="Bearer $token1"}
Write-Host "Requests count: $($requests.data.Count) (expected: 1)"
```

---

### Test 9: Pagination

```powershell
# Get first page with limit of 2
$page1 = Invoke-RestMethod "$baseUrl/api/listings?page=1&limit=2" -Headers @{Authorization="Bearer $token1"}
Write-Host "Page 1 count: $($page1.data.Count), Total: $($page1.pagination.total), Pages: $($page1.pagination.pages)"

# Get second page
$page2 = Invoke-RestMethod "$baseUrl/api/listings?page=2&limit=2" -Headers @{Authorization="Bearer $token1"}
Write-Host "Page 2 count: $($page2.data.Count)"
```

**Pass Criteria:**
- Page 1 returns 2 items
- Page 2 returns 1 item
- Total = 3, Pages = 2

---

## Quick Test Script (All-in-One)

```powershell
$baseUrl = "http://localhost:5080"

Write-Host "=== Phase 1: Listings API Tests ===" -ForegroundColor Cyan

# Login both tenants
Write-Host "`nTest 1: Login Tenant 1" -ForegroundColor Cyan
$r1 = Invoke-RestMethod "$baseUrl/api/auth/login" -Method POST -Body '{"email":"admin@acme.test","password":"Test123!","tenant_slug":"acme"}' -ContentType "application/json"
$token1 = $r1.access_token
Write-Host "Token acquired"

Write-Host "`nTest 2: Login Tenant 2" -ForegroundColor Cyan
$r2 = Invoke-RestMethod "$baseUrl/api/auth/login" -Method POST -Body '{"email":"admin@globex.test","password":"Test123!","tenant_slug":"globex"}' -ContentType "application/json"
$token2 = $r2.access_token
Write-Host "Token acquired"

# List listings
Write-Host "`nTest 3: List Listings (Tenant 1)" -ForegroundColor Cyan
$listings1 = Invoke-RestMethod "$baseUrl/api/listings" -Headers @{Authorization="Bearer $token1"}
if ($listings1.data.Count -eq 3) {
    Write-Host "PASS: Tenant 1 sees 3 listings" -ForegroundColor Green
} else {
    Write-Host "FAIL: Expected 3 listings, got $($listings1.data.Count)" -ForegroundColor Red
}

Write-Host "`nTest 4: List Listings (Tenant 2)" -ForegroundColor Cyan
$listings2 = Invoke-RestMethod "$baseUrl/api/listings" -Headers @{Authorization="Bearer $token2"}
if ($listings2.data.Count -eq 2) {
    Write-Host "PASS: Tenant 2 sees 2 listings" -ForegroundColor Green
} else {
    Write-Host "FAIL: Expected 2 listings, got $($listings2.data.Count)" -ForegroundColor Red
}

# Get listing details
Write-Host "`nTest 5: Get Listing Details" -ForegroundColor Cyan
$listing = Invoke-RestMethod "$baseUrl/api/listings/1" -Headers @{Authorization="Bearer $token1"}
if ($listing.title -eq "Home Repair Assistance") {
    Write-Host "PASS: Got listing details" -ForegroundColor Green
} else {
    Write-Host "FAIL: Unexpected listing data" -ForegroundColor Red
}

# Cross-tenant blocked
Write-Host "`nTest 6: Cross-Tenant Access Blocked" -ForegroundColor Cyan
try {
    Invoke-RestMethod "$baseUrl/api/listings/1" -Headers @{Authorization="Bearer $token2"}
    Write-Host "FAIL: Should have returned 404" -ForegroundColor Red
} catch {
    Write-Host "PASS: Cross-tenant access blocked (404)" -ForegroundColor Green
}

# Header override blocked
Write-Host "`nTest 7: Header Override Blocked" -ForegroundColor Cyan
$listings3 = Invoke-RestMethod "$baseUrl/api/listings" -Headers @{Authorization="Bearer $token1";"X-Tenant-ID"="2"}
if ($listings3.data.Count -eq 3) {
    Write-Host "PASS: X-Tenant-ID header ignored (JWT wins)" -ForegroundColor Green
} else {
    Write-Host "FAIL: Header overrode JWT tenant" -ForegroundColor Red
}

# Filter by type
Write-Host "`nTest 8: Filter by Type" -ForegroundColor Cyan
$offers = Invoke-RestMethod "$baseUrl/api/listings?type=offer" -Headers @{Authorization="Bearer $token1"}
if ($offers.data.Count -eq 2) {
    Write-Host "PASS: Type filter works (2 offers)" -ForegroundColor Green
} else {
    Write-Host "FAIL: Expected 2 offers, got $($offers.data.Count)" -ForegroundColor Red
}

# Pagination
Write-Host "`nTest 9: Pagination" -ForegroundColor Cyan
$page1 = Invoke-RestMethod "$baseUrl/api/listings?page=1&limit=2" -Headers @{Authorization="Bearer $token1"}
if ($page1.data.Count -eq 2 -and $page1.pagination.pages -eq 2) {
    Write-Host "PASS: Pagination works (2 items, 2 pages)" -ForegroundColor Green
} else {
    Write-Host "FAIL: Pagination not working correctly" -ForegroundColor Red
}

Write-Host "`n=== All Phase 1 tests complete ===" -ForegroundColor Green
```

---

## Pass/Fail Checklist

| Test | Description | Status |
|------|-------------|--------|
| 1 | Login Tenant 1 returns token | [ ] |
| 2 | Login Tenant 2 returns token | [ ] |
| 3 | List Listings (Tenant 1) returns 3 | [ ] |
| 4 | List Listings (Tenant 2) returns 2 | [ ] |
| 5 | Get Listing details works | [ ] |
| 6 | Cross-tenant access returns 404 | [ ] |
| 7 | X-Tenant-ID header cannot override JWT | [ ] |
| 8 | Type filter (offer/request) works | [ ] |
| 9 | Pagination works | [ ] |

---

## Troubleshooting

### "No listings returned"

1. Ensure migrations ran: check for `listings` table in database
2. Ensure seed data ran (check logs on startup)
3. Verify tenant ID in token matches expected tenant

### "401 Unauthorized"

1. Check token is valid and not expired
2. Check Authorization header format: `Bearer <token>`

### Database reset (if needed)

```powershell
# Stop stack, remove volumes, restart
docker compose down -v
docker compose up -d

# View logs to confirm re-seeding
docker compose logs -f api
```
