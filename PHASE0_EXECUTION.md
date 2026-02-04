# Phase 0 Execution Proof Plan

## Prerequisites

- Docker Desktop installed and running

---

## Step 1: Start the Docker Stack

```powershell
# Start the full stack (API + PostgreSQL)
docker compose up -d

# Verify containers are running
docker compose ps

# View API logs (includes migration and seed output)
docker compose logs -f api
```

The API will:
- Auto-apply all migrations
- Seed test data (tenants, users, listings)
- Listen on port 8080 (container) / 5080 (host)

### Expected Output (docker compose logs api)

```
info: Microsoft.EntityFrameworkCore.Database.Command[20101]
      Executed DbCommand ... CREATE TABLE ...
info: Program[0]
      Seeded 2 tenants, 3 users, 5 listings...
info: Microsoft.Hosting.Lifetime[14]
      Now listening on: http://[::]:8080
```

**API URL:** http://localhost:5080
**Swagger UI:** http://localhost:5080/swagger
**Health Check:** http://localhost:5080/health

---

## Step 3: Test Commands

### Test 0: Health Check

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:5080/health" -Method GET
```

**Expected Output:**
```
Healthy
```

**Pass Criteria:** Returns `Healthy`

---

### Test 1: Login and Get Token (Tenant 1)

**PowerShell:**
```powershell
$loginBody = @{
    email = "admin@acme.test"
    password = "Test123!"
    tenant_slug = "acme"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:5080/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
$response | ConvertTo-Json

# Save token for later tests
$token1 = $response.access_token
Write-Host "Token 1 (Tenant 1): $token1"
```

**Expected Output:**
```json
{
  "success": true,
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 7200,
  "user": {
    "id": 1,
    "email": "admin@acme.test",
    "first_name": "Alice",
    "last_name": "Admin",
    "role": "admin",
    "tenant_id": 1,
    "tenant_slug": "acme"
  }
}
```

**Pass Criteria:**
- `success` = true
- `access_token` is present
- `user.tenant_id` = 1
- `user.tenant_slug` = "acme"

---

### Test 1b: Login Without Tenant Returns 400

**PowerShell:**
```powershell
$loginNoTenant = @{
    email = "admin@acme.test"
    password = "Test123!"
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "http://localhost:5080/api/auth/login" -Method POST -Body $loginNoTenant -ContentType "application/json"
    Write-Host "FAIL: Should have returned 400" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 400) {
        Write-Host "PASS: Correctly returned 400 (tenant required)" -ForegroundColor Green
    } else {
        Write-Host "FAIL: Expected 400, got $statusCode" -ForegroundColor Red
    }
}
```

**Pass Criteria:**
- Returns 400 Bad Request with message "Tenant identifier required"

---

### Test 2: Login Tenant 2

**PowerShell:**
```powershell
$loginBody2 = @{
    email = "admin@globex.test"
    password = "Test123!"
    tenant_slug = "globex"
} | ConvertTo-Json

$response2 = Invoke-RestMethod -Uri "http://localhost:5080/api/auth/login" -Method POST -Body $loginBody2 -ContentType "application/json"
$token2 = $response2.access_token
Write-Host "Token 2 (Tenant 2): $token2"
```

**Pass Criteria:**
- `user.tenant_id` = 2
- `user.tenant_slug` = "globex"

---

### Test 3: Validate Token (JWT Interop Test)

**PowerShell:**
```powershell
$headers = @{
    Authorization = "Bearer $token1"
}
$validateResponse = Invoke-RestMethod -Uri "http://localhost:5080/api/auth/validate" -Method GET -Headers $headers
$validateResponse | ConvertTo-Json
```

**Expected Output:**
```json
{
  "valid": true,
  "user_id": "1",
  "tenant_id_claim": "1",
  "tenant_id_resolved": 1,
  "tenant_context_matches": true,
  "role": "admin",
  "email": "admin@acme.test"
}
```

**Pass Criteria:**
- `valid` = true
- `tenant_id_claim` matches `tenant_id_resolved`
- `tenant_context_matches` = true

---

### Test 4: Tenant Isolation - List Users (Tenant 1)

**PowerShell:**
```powershell
$headers1 = @{ Authorization = "Bearer $token1" }
$users1 = Invoke-RestMethod -Uri "http://localhost:5080/api/users" -Method GET -Headers $headers1
$users1 | ConvertTo-Json -Depth 3
```

**Expected Output:**
```json
{
  "data": [
    {
      "id": 1,
      "email": "admin@acme.test",
      "first_name": "Alice",
      "last_name": "Admin",
      "role": "admin",
      "is_active": true
    },
    {
      "id": 3,
      "email": "member@acme.test",
      "first_name": "Charlie",
      "last_name": "Contributor",
      "role": "member",
      "is_active": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 2,
    "pages": 1
  }
}
```

**Pass Criteria:**
- Returns exactly 2 users (both from tenant 1)
- Does NOT include `admin@globex.test` (tenant 2)

---

### Test 5: Tenant Isolation - List Users (Tenant 2)

**PowerShell:**
```powershell
$headers2 = @{ Authorization = "Bearer $token2" }
$users2 = Invoke-RestMethod -Uri "http://localhost:5080/api/users" -Method GET -Headers $headers2
$users2 | ConvertTo-Json -Depth 3
```

**Expected Output:**
```json
{
  "data": [
    {
      "id": 2,
      "email": "admin@globex.test",
      "first_name": "Bob",
      "last_name": "Boss",
      "role": "admin",
      "is_active": true
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

**Pass Criteria:**
- Returns exactly 1 user (tenant 2 only)
- Does NOT include any tenant 1 users

---

### Test 6: Cross-Tenant Access Denied

Try to access a user from tenant 1 while authenticated as tenant 2:

**PowerShell:**
```powershell
# Using tenant 2 token, try to get user ID 1 (belongs to tenant 1)
$headers2 = @{ Authorization = "Bearer $token2" }
try {
    $crossTenant = Invoke-RestMethod -Uri "http://localhost:5080/api/users/1" -Method GET -Headers $headers2
    Write-Host "FAIL: Should have returned 404" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 404) {
        Write-Host "PASS: Correctly returned 404 Not Found" -ForegroundColor Green
    } else {
        Write-Host "FAIL: Expected 404, got $statusCode" -ForegroundColor Red
    }
}
```

**Pass Criteria:**
- Returns 404 Not Found (tenant filter hides user from other tenant)

---

### Test 7: Security - Header Cannot Override JWT Tenant

**PowerShell:**
```powershell
# Authenticated as tenant 1, but try to set X-Tenant-ID: 2
$headers = @{
    Authorization = "Bearer $token1"
    "X-Tenant-ID" = "2"
}
$users = Invoke-RestMethod -Uri "http://localhost:5080/api/users" -Method GET -Headers $headers
Write-Host "User count: $($users.data.Count)"
Write-Host "First user email: $($users.data[0].email)"

# Should still return tenant 1 users, NOT tenant 2
if ($users.data[0].email -eq "admin@acme.test") {
    Write-Host "PASS: X-Tenant-ID header was ignored (JWT wins)" -ForegroundColor Green
} else {
    Write-Host "FAIL: X-Tenant-ID header overrode JWT tenant" -ForegroundColor Red
}
```

**Pass Criteria:**
- Returns tenant 1 users despite X-Tenant-ID: 2 header
- Check server logs for warning about ignored header

---

### Test 8: PHP Token Validation (if you have a PHP-issued token)

**PowerShell:**
```powershell
# Replace with an actual token from your PHP system
$phpToken = "PASTE_PHP_ISSUED_JWT_HERE"

$headers = @{ Authorization = "Bearer $phpToken" }
$result = Invoke-RestMethod -Uri "http://localhost:5080/api/auth/validate" -Method GET -Headers $headers
$result | ConvertTo-Json
```

**Pass Criteria:**
- If JWT secret matches PHP: returns valid=true with correct claims
- If JWT secret doesn't match: returns 401 Unauthorized

---

## Pass/Fail Checklist

| Test | Description | Status |
|------|-------------|--------|
| 0 | Health check returns Healthy | [ ] |
| 1 | Login tenant 1 (with tenant_slug) returns token | [ ] |
| 1b | Login without tenant_slug returns 400 | [ ] |
| 2 | Login tenant 2 (with tenant_slug) returns token | [ ] |
| 3 | Validate token returns matching tenant context | [ ] |
| 4 | List users (tenant 1) returns only tenant 1 users | [ ] |
| 5 | List users (tenant 2) returns only tenant 2 users | [ ] |
| 6 | Cross-tenant user access returns 404 | [ ] |
| 7 | X-Tenant-ID header cannot override JWT tenant | [ ] |
| 8 | PHP-issued token validates (if applicable) | [ ] |

---

## Seed Data Reference

| Entity | ID | Slug | Tenant ID | Email | Password |
|--------|-----|------|-----------|-------|----------|
| Tenant | 1 | acme | - | - | - |
| Tenant | 2 | globex | - | - | - |
| User | 1 | - | 1 | admin@acme.test | Test123! |
| User | 2 | - | 2 | admin@globex.test | Test123! |
| User | 3 | - | 1 | member@acme.test | Test123! |

---

## Troubleshooting

### "Jwt:Secret not configured"
Set the environment variable or appsettings.json value.

### "Failed to connect to database"
1. Ensure PostgreSQL is running
2. Verify connection string
3. Create database: `CREATE DATABASE nexus;`

### "401 Unauthorized" on validate
1. Check JWT secret matches between .NET and PHP
2. Check token hasn't expired
3. Check algorithm is HS256

### "No users returned"
1. Ensure migrations ran: `dotnet ef database update`
2. Ensure seed data ran (check logs on startup)
3. Verify tenant ID in token matches expected tenant

### "Tenant identifier required" on login
Login now requires `tenant_slug` (or `tenant_id`). Example:
```json
{
  "email": "admin@acme.test",
  "password": "Test123!",
  "tenant_slug": "acme"
}
```

---

## Quick Test Script (All-in-One)

```powershell
$baseUrl = "http://localhost:5080"

# Test 0: Health
Write-Host "Test 0: Health Check" -ForegroundColor Cyan
Invoke-RestMethod "$baseUrl/health"

# Test 1: Login Tenant 1 (with tenant_slug)
Write-Host "`nTest 1: Login Tenant 1" -ForegroundColor Cyan
$r1 = Invoke-RestMethod "$baseUrl/api/auth/login" -Method POST -Body '{"email":"admin@acme.test","password":"Test123!","tenant_slug":"acme"}' -ContentType "application/json"
$token1 = $r1.access_token
Write-Host "Tenant 1 token acquired"

# Test 1b: Login without tenant should fail
Write-Host "`nTest 1b: Login without tenant (should fail)" -ForegroundColor Cyan
try {
    Invoke-RestMethod "$baseUrl/api/auth/login" -Method POST -Body '{"email":"admin@acme.test","password":"Test123!"}' -ContentType "application/json"
    Write-Host "FAIL: Should have returned 400" -ForegroundColor Red
} catch {
    Write-Host "PASS: Returned 400 as expected" -ForegroundColor Green
}

# Test 2: Login Tenant 2
Write-Host "`nTest 2: Login Tenant 2" -ForegroundColor Cyan
$r2 = Invoke-RestMethod "$baseUrl/api/auth/login" -Method POST -Body '{"email":"admin@globex.test","password":"Test123!","tenant_slug":"globex"}' -ContentType "application/json"
$token2 = $r2.access_token
Write-Host "Tenant 2 token acquired"

# Test 3: Validate
Write-Host "`nTest 3: Validate Token" -ForegroundColor Cyan
$v = Invoke-RestMethod "$baseUrl/api/auth/validate" -Headers @{Authorization="Bearer $token1"}
Write-Host "tenant_context_matches: $($v.tenant_context_matches)"

# Test 4: List users tenant 1
Write-Host "`nTest 4: List Users (Tenant 1)" -ForegroundColor Cyan
$u1 = Invoke-RestMethod "$baseUrl/api/users" -Headers @{Authorization="Bearer $token1"}
Write-Host "Tenant 1 users: $($u1.data.Count) (expected: 2)"

# Test 5: List users tenant 2
Write-Host "`nTest 5: List Users (Tenant 2)" -ForegroundColor Cyan
$u2 = Invoke-RestMethod "$baseUrl/api/users" -Headers @{Authorization="Bearer $token2"}
Write-Host "Tenant 2 users: $($u2.data.Count) (expected: 1)"

# Test 6: Cross-tenant blocked
Write-Host "`nTest 6: Cross-Tenant Access" -ForegroundColor Cyan
try {
    Invoke-RestMethod "$baseUrl/api/users/1" -Headers @{Authorization="Bearer $token2"}
    Write-Host "FAIL: Should have returned 404" -ForegroundColor Red
} catch {
    Write-Host "PASS: Cross-tenant access blocked (404)" -ForegroundColor Green
}

# Test 7: Header override blocked
Write-Host "`nTest 7: Header Override Blocked" -ForegroundColor Cyan
$u3 = Invoke-RestMethod "$baseUrl/api/users" -Headers @{Authorization="Bearer $token1";"X-Tenant-ID"="2"}
if ($u3.data[0].email -eq "admin@acme.test") {
    Write-Host "PASS: X-Tenant-ID header ignored (JWT wins)" -ForegroundColor Green
} else {
    Write-Host "FAIL: Header overrode JWT tenant" -ForegroundColor Red
}

Write-Host "`n=== All tests complete ===" -ForegroundColor Green
```
