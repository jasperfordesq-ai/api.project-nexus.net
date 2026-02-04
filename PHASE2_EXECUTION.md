# Phase 2 Execution Proof Plan: User Profile Update

## Prerequisites

- Docker Desktop installed and running
- Run `docker compose up -d` to start the stack
- API available at http://localhost:5080

---

## New Endpoint

| Endpoint | Method | Auth | Description |
| -------- | ------ | ---- | ----------- |
| /api/users/me | PATCH | Yes | Update current user's profile |

### Request Body

```json
{
  "first_name": "NewFirstName",  // optional, max 100 chars
  "last_name": "NewLastName"     // optional, max 100 chars
}
```

### Response (Success - 200)

Same shape as GET /api/users/me:

```json
{
  "id": 1,
  "email": "admin@acme.test",
  "first_name": "NewFirstName",
  "last_name": "NewLastName",
  "role": "admin",
  "tenant_id": 1,
  "created_at": "2026-02-02T...",
  "last_login_at": "2026-02-02T..."
}
```

### Response (Validation Error - 400)

```json
{
  "error": "Validation failed",
  "details": [
    "first_name cannot be empty",
    "last_name must be 100 characters or less"
  ]
}
```

---

## PowerShell Test Script

```powershell
$baseUrl = "http://localhost:5080"

# Step 1: Login
Write-Host "=== 1. Login ===" -ForegroundColor Cyan
$loginBody = @{
    email = "admin@acme.test"
    password = "Test123!"
    tenant_slug = "acme"
} | ConvertTo-Json

$loginResp = Invoke-RestMethod "$baseUrl/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
$token = $loginResp.access_token
Write-Host "Token acquired"

$headers = @{ Authorization = "Bearer $token" }

# Step 2: GET /api/users/me (before update)
Write-Host "`n=== 2. GET /api/users/me (before) ===" -ForegroundColor Cyan
$before = Invoke-RestMethod "$baseUrl/api/users/me" -Headers $headers
Write-Host "first_name: $($before.first_name)"
Write-Host "last_name: $($before.last_name)"

# Step 3: PATCH /api/users/me
Write-Host "`n=== 3. PATCH /api/users/me ===" -ForegroundColor Cyan
$updateBody = @{
    first_name = "Alicia"
    last_name = "Administrator"
} | ConvertTo-Json

$updated = Invoke-RestMethod "$baseUrl/api/users/me" -Method PATCH -Headers $headers -Body $updateBody -ContentType "application/json"
Write-Host "Updated first_name: $($updated.first_name)"
Write-Host "Updated last_name: $($updated.last_name)"

# Step 4: GET /api/users/me (verify persistence)
Write-Host "`n=== 4. GET /api/users/me (verify) ===" -ForegroundColor Cyan
$after = Invoke-RestMethod "$baseUrl/api/users/me" -Headers $headers
if ($after.first_name -eq "Alicia" -and $after.last_name -eq "Administrator") {
    Write-Host "PASS: Update persisted" -ForegroundColor Green
} else {
    Write-Host "FAIL: Update not persisted" -ForegroundColor Red
}

# Step 5: Test validation errors
Write-Host "`n=== 5. Validation Tests ===" -ForegroundColor Cyan

# Empty first_name
try {
    Invoke-RestMethod "$baseUrl/api/users/me" -Method PATCH -Headers $headers -Body '{"first_name":""}' -ContentType "application/json"
    Write-Host "FAIL: Should have rejected empty first_name" -ForegroundColor Red
} catch {
    Write-Host "PASS: Empty first_name rejected" -ForegroundColor Green
}

# Whitespace-only last_name
try {
    Invoke-RestMethod "$baseUrl/api/users/me" -Method PATCH -Headers $headers -Body '{"last_name":"   "}' -ContentType "application/json"
    Write-Host "FAIL: Should have rejected whitespace-only last_name" -ForegroundColor Red
} catch {
    Write-Host "PASS: Whitespace-only last_name rejected" -ForegroundColor Green
}

# Too long first_name
try {
    $longName = "A" * 101
    $body = @{ first_name = $longName } | ConvertTo-Json
    Invoke-RestMethod "$baseUrl/api/users/me" -Method PATCH -Headers $headers -Body $body -ContentType "application/json"
    Write-Host "FAIL: Should have rejected too-long first_name" -ForegroundColor Red
} catch {
    Write-Host "PASS: Too-long first_name rejected" -ForegroundColor Green
}

# Step 6: Restore original name
Write-Host "`n=== 6. Restore Original ===" -ForegroundColor Cyan
$restoreBody = @{
    first_name = "Alice"
    last_name = "Admin"
} | ConvertTo-Json
$restored = Invoke-RestMethod "$baseUrl/api/users/me" -Method PATCH -Headers $headers -Body $restoreBody -ContentType "application/json"
Write-Host "Restored: $($restored.first_name) $($restored.last_name)"

Write-Host "`n=== All Phase 2 tests complete ===" -ForegroundColor Green
```

---

## Pass/Fail Checklist

| Test | Description | Status |
|------|-------------|--------|
| 1 | Login returns token | [ ] |
| 2 | GET /api/users/me returns current user | [ ] |
| 3 | PATCH /api/users/me updates first_name and last_name | [ ] |
| 4 | GET /api/users/me confirms update persisted | [ ] |
| 5a | Empty first_name returns 400 | [ ] |
| 5b | Whitespace-only last_name returns 400 | [ ] |
| 5c | first_name > 100 chars returns 400 | [ ] |
| 6 | Partial update (only first_name) works | [ ] |

---

## Curl Test Script (Alternative)

```bash
# Login
curl -s -X POST http://localhost:5080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@acme.test","password":"Test123!","tenant_slug":"acme"}' \
  > /tmp/login.json

TOKEN=$(python3 -c "import json; print(json.load(open('/tmp/login.json'))['access_token'])")

# GET before
echo "=== Before ==="
curl -s http://localhost:5080/api/users/me -H "Authorization: Bearer $TOKEN"

# PATCH update
echo -e "\n\n=== PATCH ==="
curl -s -X PATCH http://localhost:5080/api/users/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"first_name":"Alicia","last_name":"Administrator"}'

# GET after
echo -e "\n\n=== After ==="
curl -s http://localhost:5080/api/users/me -H "Authorization: Bearer $TOKEN"
```

---

## Security Notes

- Only the authenticated user can update their own profile
- User ID is extracted from JWT claims (cannot be spoofed)
- Tenant isolation enforced via global query filter
- No ability to change email, role, or tenant_id via this endpoint
