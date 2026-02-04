# Phase 9: Connections - Execution Tests

## Prerequisites

```powershell
# Start the Docker stack
docker compose up -d
```

## Test Users

| Email | Password | Tenant | User ID |
|-------|----------|--------|---------|
| admin@acme.test | Test123! | acme | 1 |
| member@acme.test | Test123! | acme | 3 |
| admin@globex.test | Test123! | globex | 2 |

---

## 1. Get Access Token

```powershell
# Login as Alice (admin@acme.test)
$loginBody = @{
    email = "admin@acme.test"
    password = "Test123!"
    tenant_slug = "acme"
} | ConvertTo-Json

$loginResult = Invoke-RestMethod -Uri "http://localhost:5080/api/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
$token = $loginResult.access_token
Write-Host "Token: $token"
```

```powershell
# Login as Charlie (member@acme.test)
$loginBody2 = @{
    email = "member@acme.test"
    password = "Test123!"
    tenant_slug = "acme"
} | ConvertTo-Json

$loginResult2 = Invoke-RestMethod -Uri "http://localhost:5080/api/auth/login" -Method POST -ContentType "application/json" -Body $loginBody2
$token2 = $loginResult2.access_token
Write-Host "Charlie Token: $token2"
```

---

## 2. List Connections

```powershell
# List all connections (as Alice)
$headers = @{ Authorization = "Bearer $token" }
$result = Invoke-RestMethod -Uri "http://localhost:5080/api/connections" -Method GET -Headers $headers
$result | ConvertTo-Json -Depth 5
```

Expected: Returns connections where user is requester or addressee.

---

## 3. Filter Connections by Status

```powershell
# List only accepted connections
$result = Invoke-RestMethod -Uri "http://localhost:5080/api/connections?status=accepted" -Method GET -Headers $headers
$result | ConvertTo-Json -Depth 5
```

```powershell
# List only pending connections
$result = Invoke-RestMethod -Uri "http://localhost:5080/api/connections?status=pending" -Method GET -Headers $headers
$result | ConvertTo-Json -Depth 5
```

---

## 4. Get Pending Requests

```powershell
# Get pending incoming and outgoing requests
$result = Invoke-RestMethod -Uri "http://localhost:5080/api/connections/pending" -Method GET -Headers $headers
$result | ConvertTo-Json -Depth 5
```

Expected: Returns `{ incoming: [], outgoing: [] }`

---

## 5. Send Connection Request

First, register a new user to test with:

```powershell
# Register a new user in ACME tenant
$registerBody = @{
    email = "newmember@acme.test"
    password = "Test123!"
    first_name = "New"
    last_name = "Member"
    tenant_slug = "acme"
} | ConvertTo-Json

$registerResult = Invoke-RestMethod -Uri "http://localhost:5080/api/auth/register" -Method POST -ContentType "application/json" -Body $registerBody
$newUserId = $registerResult.user.id
$newUserToken = $registerResult.access_token
Write-Host "New User ID: $newUserId"
```

```powershell
# Alice sends connection request to new user
$requestBody = @{
    user_id = $newUserId
} | ConvertTo-Json

$result = Invoke-RestMethod -Uri "http://localhost:5080/api/connections" -Method POST -ContentType "application/json" -Headers $headers -Body $requestBody
$result | ConvertTo-Json -Depth 3
$connectionId = $result.connection.id
Write-Host "Connection ID: $connectionId"
```

Expected:
```json
{
  "success": true,
  "message": "Connection request sent",
  "connection": {
    "id": 1,
    "status": "pending",
    "created_at": "..."
  }
}
```

---

## 6. Error: Cannot Connect to Yourself

```powershell
# Try to connect to yourself
$selfBody = @{ user_id = 1 } | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "http://localhost:5080/api/connections" -Method POST -ContentType "application/json" -Headers $headers -Body $selfBody
} catch {
    $_.Exception.Response.StatusCode
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $reader.ReadToEnd()
}
```

Expected: 400 Bad Request - "Cannot send connection request to yourself"

---

## 7. Error: User Not Found

```powershell
# Try to connect to non-existent user
$notFoundBody = @{ user_id = 9999 } | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "http://localhost:5080/api/connections" -Method POST -ContentType "application/json" -Headers $headers -Body $notFoundBody
} catch {
    $_.Exception.Response.StatusCode
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $reader.ReadToEnd()
}
```

Expected: 404 Not Found - "User not found"

---

## 8. Error: Duplicate Request

```powershell
# Try to send duplicate request
$duplicateBody = @{ user_id = $newUserId } | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "http://localhost:5080/api/connections" -Method POST -ContentType "application/json" -Headers $headers -Body $duplicateBody
} catch {
    $_.Exception.Response.StatusCode
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $reader.ReadToEnd()
}
```

Expected: 400 Bad Request - "Connection request already pending"

---

## 9. View Pending Request (as New User)

```powershell
# New user views their pending requests
$newUserHeaders = @{ Authorization = "Bearer $newUserToken" }
$result = Invoke-RestMethod -Uri "http://localhost:5080/api/connections/pending" -Method GET -Headers $newUserHeaders
$result | ConvertTo-Json -Depth 5
```

Expected: Shows incoming request from Alice

---

## 10. Accept Connection Request

```powershell
# New user accepts Alice's request
$result = Invoke-RestMethod -Uri "http://localhost:5080/api/connections/$connectionId/accept" -Method PUT -Headers $newUserHeaders
$result | ConvertTo-Json -Depth 3
```

Expected:
```json
{
  "success": true,
  "message": "Connection accepted",
  "connection": {
    "id": ...,
    "status": "accepted",
    ...
  }
}
```

---

## 11. Verify Connection is Accepted

```powershell
# Alice checks connections
$result = Invoke-RestMethod -Uri "http://localhost:5080/api/connections?status=accepted" -Method GET -Headers $headers
$result | ConvertTo-Json -Depth 5
```

Expected: Shows accepted connection with new user

---

## 12. Test Decline Flow

```powershell
# Register another user
$register2Body = @{
    email = "another@acme.test"
    password = "Test123!"
    first_name = "Another"
    last_name = "User"
    tenant_slug = "acme"
} | ConvertTo-Json

$register2Result = Invoke-RestMethod -Uri "http://localhost:5080/api/auth/register" -Method POST -ContentType "application/json" -Body $register2Body
$anotherUserId = $register2Result.user.id
$anotherUserToken = $register2Result.access_token

# Alice sends request to Another user
$requestBody = @{ user_id = $anotherUserId } | ConvertTo-Json
$result = Invoke-RestMethod -Uri "http://localhost:5080/api/connections" -Method POST -ContentType "application/json" -Headers $headers -Body $requestBody
$declineConnectionId = $result.connection.id

# Another user declines
$anotherHeaders = @{ Authorization = "Bearer $anotherUserToken" }
$result = Invoke-RestMethod -Uri "http://localhost:5080/api/connections/$declineConnectionId/decline" -Method PUT -Headers $anotherHeaders
$result | ConvertTo-Json -Depth 3
```

Expected: Connection declined

---

## 13. Remove Connection (Unfriend)

```powershell
# Alice removes connection with new user (the one we accepted earlier)
$result = Invoke-RestMethod -Uri "http://localhost:5080/api/connections/$connectionId" -Method DELETE -Headers $headers
$result | ConvertTo-Json -Depth 3
```

Expected:
```json
{
  "success": true,
  "message": "Connection removed"
}
```

---

## 14. Cancel Pending Request

```powershell
# Alice sends a new request to Another user (who declined before)
$requestBody = @{ user_id = $anotherUserId } | ConvertTo-Json
$result = Invoke-RestMethod -Uri "http://localhost:5080/api/connections" -Method POST -ContentType "application/json" -Headers $headers -Body $requestBody
$cancelConnectionId = $result.connection.id

# Alice cancels her pending request
$result = Invoke-RestMethod -Uri "http://localhost:5080/api/connections/$cancelConnectionId" -Method DELETE -Headers $headers
$result | ConvertTo-Json -Depth 3
```

Expected: Request cancelled (removed)

---

## 15. Mutual Request Auto-Accept

```powershell
# Another user sends request to Alice
$requestBody = @{ user_id = 1 } | ConvertTo-Json
$result = Invoke-RestMethod -Uri "http://localhost:5080/api/connections" -Method POST -ContentType "application/json" -Headers $anotherHeaders -Body $requestBody
$mutualConnectionId = $result.connection.id
Write-Host "Mutual connection ID: $mutualConnectionId"

# Alice sends request back - should auto-accept
$requestBody = @{ user_id = $anotherUserId } | ConvertTo-Json
$result = Invoke-RestMethod -Uri "http://localhost:5080/api/connections" -Method POST -ContentType "application/json" -Headers $headers -Body $requestBody
$result | ConvertTo-Json -Depth 3
```

Expected: "Connection request accepted (mutual request)" with status "accepted"

---

## 16. Tenant Isolation Test

```powershell
# Login as Bob (Globex tenant)
$bobLogin = @{
    email = "admin@globex.test"
    password = "Test123!"
    tenant_slug = "globex"
} | ConvertTo-Json

$bobResult = Invoke-RestMethod -Uri "http://localhost:5080/api/auth/login" -Method POST -ContentType "application/json" -Body $bobLogin
$bobToken = $bobResult.access_token
$bobHeaders = @{ Authorization = "Bearer $bobToken" }

# Bob tries to connect to Alice (different tenant) - should fail
$crossTenantBody = @{ user_id = 1 } | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "http://localhost:5080/api/connections" -Method POST -ContentType "application/json" -Headers $bobHeaders -Body $crossTenantBody
} catch {
    $_.Exception.Response.StatusCode
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $reader.ReadToEnd()
}
```

Expected: 404 Not Found - "User not found" (tenant isolation working)

---

## 17. Bob's Connections (Empty)

```powershell
# Bob lists his connections - should be empty
$result = Invoke-RestMethod -Uri "http://localhost:5080/api/connections" -Method GET -Headers $bobHeaders
$result | ConvertTo-Json -Depth 3
```

Expected: Empty connections list (Bob has no connections in Globex tenant)

---

## Summary

| Test | Endpoint | Expected |
|------|----------|----------|
| List connections | GET /api/connections | 200 + connections array |
| Filter by status | GET /api/connections?status=accepted | 200 + filtered list |
| Pending requests | GET /api/connections/pending | 200 + incoming/outgoing |
| Send request | POST /api/connections | 201 + connection created |
| Self-connect | POST /api/connections | 400 error |
| User not found | POST /api/connections | 404 error |
| Duplicate request | POST /api/connections | 400 error |
| Accept | PUT /api/connections/{id}/accept | 200 + accepted |
| Decline | PUT /api/connections/{id}/decline | 200 + declined |
| Remove | DELETE /api/connections/{id} | 200 + removed |
| Cancel pending | DELETE /api/connections/{id} | 200 + removed |
| Mutual auto-accept | POST /api/connections | 200 + auto-accepted |
| Tenant isolation | POST /api/connections | 404 (cross-tenant) |
