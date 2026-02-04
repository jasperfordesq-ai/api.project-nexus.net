# Phase 3: Listings WRITE - Execution & Testing

## Objectives
- POST /api/listings - Create new listing
- PUT /api/listings/{id} - Update own listing
- DELETE /api/listings/{id} - Soft delete own listing

## Prerequisites

- Docker Desktop installed and running

## Setup

### 1. Start the Docker Stack

```powershell
docker compose up -d
```

### 2. Get a JWT token
```powershell
$loginBody = @{
    email = "alice@acme.test"
    password = "password123"
    tenant_slug = "acme"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "http://localhost:5080/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
$token = $loginResponse.access_token
Write-Host "Token: $token"
```

---

## Test Cases

### Test 1: Create a listing (POST /api/listings)

**Expected:** 201 Created with listing data

```powershell
$createBody = @{
    title = "Test Listing from Phase 3"
    description = "A test listing created during Phase 3 testing"
    type = "offer"
    status = "active"
    location = "Downtown"
    estimated_hours = 2.5
} | ConvertTo-Json

$headers = @{ Authorization = "Bearer $token" }

$response = Invoke-RestMethod -Uri "http://localhost:5080/api/listings" -Method POST -Body $createBody -ContentType "application/json" -Headers $headers
$response | ConvertTo-Json -Depth 5
$newListingId = $response.id
Write-Host "Created listing ID: $newListingId"
```

### Test 2: Create listing with draft status

**Expected:** 201 Created with status = "draft"

```powershell
$draftBody = @{
    title = "Draft Listing"
    description = "This is a draft listing"
    type = "request"
    status = "draft"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:5080/api/listings" -Method POST -Body $draftBody -ContentType "application/json" -Headers $headers
$response | ConvertTo-Json -Depth 5
$draftListingId = $response.id
```

### Test 3: Validation - Missing title

**Expected:** 400 Bad Request

```powershell
$noTitleBody = @{
    description = "No title"
    type = "offer"
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "http://localhost:5080/api/listings" -Method POST -Body $noTitleBody -ContentType "application/json" -Headers $headers
} catch {
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)"
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $reader.ReadToEnd()
}
```

### Test 4: Validation - Title too long (>255 chars)

**Expected:** 400 Bad Request

```powershell
$longTitle = "A" * 300
$longTitleBody = @{
    title = $longTitle
    type = "offer"
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "http://localhost:5080/api/listings" -Method POST -Body $longTitleBody -ContentType "application/json" -Headers $headers
} catch {
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)"
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $reader.ReadToEnd()
}
```

### Test 5: Validation - Invalid type

**Expected:** 400 Bad Request

```powershell
$invalidTypeBody = @{
    title = "Invalid Type Listing"
    type = "invalid"
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "http://localhost:5080/api/listings" -Method POST -Body $invalidTypeBody -ContentType "application/json" -Headers $headers
} catch {
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)"
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $reader.ReadToEnd()
}
```

### Test 6: Update own listing (PUT /api/listings/{id})

**Expected:** 200 OK with updated data

```powershell
$updateBody = @{
    title = "Updated Listing Title"
    description = "Updated description"
    status = "fulfilled"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:5080/api/listings/$newListingId" -Method PUT -Body $updateBody -ContentType "application/json" -Headers $headers
$response | ConvertTo-Json -Depth 5
```

### Test 7: Update non-existent listing

**Expected:** 404 Not Found

```powershell
$updateBody = @{
    title = "Should Fail"
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "http://localhost:5080/api/listings/99999" -Method PUT -Body $updateBody -ContentType "application/json" -Headers $headers
} catch {
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)"
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $reader.ReadToEnd()
}
```

### Test 8: Update another user's listing (authorization check)

**Expected:** 403 Forbidden (if listing exists but owned by another user)

First, let's get Bob's token and try to update Alice's listing:

```powershell
# Login as Bob (same tenant, different user)
$bobLoginBody = @{
    email = "bob@acme.test"
    password = "password123"
    tenant_slug = "acme"
} | ConvertTo-Json

$bobLoginResponse = Invoke-RestMethod -Uri "http://localhost:5080/api/auth/login" -Method POST -Body $bobLoginBody -ContentType "application/json"
$bobToken = $bobLoginResponse.access_token
$bobHeaders = @{ Authorization = "Bearer $bobToken" }

# Try to update Alice's listing
$updateBody = @{
    title = "Bob trying to update Alice's listing"
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "http://localhost:5080/api/listings/$newListingId" -Method PUT -Body $updateBody -ContentType "application/json" -Headers $bobHeaders
} catch {
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)"
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $reader.ReadToEnd()
}
```

### Test 9: Delete own listing (DELETE /api/listings/{id})

**Expected:** 204 No Content

```powershell
Invoke-RestMethod -Uri "http://localhost:5080/api/listings/$draftListingId" -Method DELETE -Headers $headers
Write-Host "Deleted listing $draftListingId"
```

### Test 10: Verify soft delete (listing should not appear in list)

**Expected:** Deleted listing not in results

```powershell
$listings = Invoke-RestMethod -Uri "http://localhost:5080/api/listings" -Method GET -Headers $headers
$deletedListing = $listings.data | Where-Object { $_.id -eq $draftListingId }
if ($deletedListing) {
    Write-Host "FAIL: Deleted listing still visible"
} else {
    Write-Host "PASS: Deleted listing not visible"
}
```

### Test 11: Delete another user's listing

**Expected:** 403 Forbidden

```powershell
try {
    Invoke-RestMethod -Uri "http://localhost:5080/api/listings/$newListingId" -Method DELETE -Headers $bobHeaders
} catch {
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)"
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $reader.ReadToEnd()
}
```

### Test 12: Cross-tenant isolation (should return 404)

Login as a user from tenant 2 and try to access tenant 1's listing:

```powershell
# Login as user from tenant 2
$tenant2LoginBody = @{
    email = "carol@globex.test"
    password = "password123"
    tenant_slug = "globex"
} | ConvertTo-Json

$tenant2Response = Invoke-RestMethod -Uri "http://localhost:5080/api/auth/login" -Method POST -Body $tenant2LoginBody -ContentType "application/json"
$tenant2Token = $tenant2Response.access_token
$tenant2Headers = @{ Authorization = "Bearer $tenant2Token" }

# Try to access tenant 1's listing
try {
    Invoke-RestMethod -Uri "http://localhost:5080/api/listings/$newListingId" -Method GET -Headers $tenant2Headers
    Write-Host "FAIL: Should not be able to see cross-tenant listing"
} catch {
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)"
    Write-Host "PASS: Cross-tenant access correctly blocked"
}
```

---

## Cleanup

Delete the test listing we created:

```powershell
Invoke-RestMethod -Uri "http://localhost:5080/api/listings/$newListingId" -Method DELETE -Headers $headers
Write-Host "Cleaned up test listing $newListingId"
```

---

## Summary of Expected Results

| Test | Description | Expected Status |
|------|-------------|-----------------|
| 1 | Create listing | 201 Created |
| 2 | Create draft listing | 201 Created |
| 3 | Missing title | 400 Bad Request |
| 4 | Title too long | 400 Bad Request |
| 5 | Invalid type | 400 Bad Request |
| 6 | Update own listing | 200 OK |
| 7 | Update non-existent | 404 Not Found |
| 8 | Update another's listing | 403 Forbidden |
| 9 | Delete own listing | 204 No Content |
| 10 | Verify soft delete | Listing not in list |
| 11 | Delete another's listing | 403 Forbidden |
| 12 | Cross-tenant access | 404 Not Found |

---

## Notes

- All write operations require authentication (JWT token)
- Owner checks prevent users from modifying others' listings
- Soft delete sets `deleted_at` timestamp instead of removing from DB
- Global query filter automatically hides soft-deleted listings
- Cross-tenant access returns 404 (not 403) for security
