# Phase 5: Wallet WRITE - Execution & Testing

## Objectives
- POST /api/wallet/transfer - Transfer time credits to another user

## Prerequisites

- Docker Desktop installed and running

## Setup

### 1. Start the Docker Stack

```powershell
docker compose up -d
```

### 2. Get JWT tokens for testing
```powershell
# Alice (admin, user 1) - has balance of 3.5 hours
$aliceLogin = @{
    email = "admin@acme.test"
    password = "Test123!"
    tenant_slug = "acme"
} | ConvertTo-Json

$aliceResponse = Invoke-RestMethod -Uri "http://localhost:5080/api/auth/login" -Method POST -Body $aliceLogin -ContentType "application/json"
$aliceToken = $aliceResponse.access_token
$aliceHeaders = @{ Authorization = "Bearer $aliceToken" }

# Charlie (member, user 3) - has balance of -3.5 hours
$charlieLogin = @{
    email = "member@acme.test"
    password = "Test123!"
    tenant_slug = "acme"
} | ConvertTo-Json

$charlieResponse = Invoke-RestMethod -Uri "http://localhost:5080/api/auth/login" -Method POST -Body $charlieLogin -ContentType "application/json"
$charlieToken = $charlieResponse.access_token
$charlieHeaders = @{ Authorization = "Bearer $charlieToken" }
```

---

## Test Cases

### Test 1: Successful transfer

**Expected:** 201 Created with transaction details

```powershell
# Check Alice's balance before transfer
$balanceBefore = Invoke-RestMethod -Uri "http://localhost:5080/api/wallet/balance" -Method GET -Headers $aliceHeaders
Write-Host "Alice balance before: $($balanceBefore.balance)"

# Transfer 1 hour from Alice to Charlie
$transferBody = @{
    receiver_id = 3
    amount = 1.0
    description = "Test transfer"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:5080/api/wallet/transfer" -Method POST -Body $transferBody -ContentType "application/json" -Headers $aliceHeaders
$response | ConvertTo-Json -Depth 5

# Check Alice's balance after transfer
$balanceAfter = Invoke-RestMethod -Uri "http://localhost:5080/api/wallet/balance" -Method GET -Headers $aliceHeaders
Write-Host "Alice balance after: $($balanceAfter.balance)"
# Expected: 2.5 hours (was 3.5, sent 1.0)
```

### Test 2: Transfer with listing reference

```powershell
$transferBody = @{
    receiver_id = 3
    amount = 0.5
    description = "Payment for gardening help"
    listing_id = 3
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:5080/api/wallet/transfer" -Method POST -Body $transferBody -ContentType "application/json" -Headers $aliceHeaders
$response | ConvertTo-Json -Depth 5
```

### Test 3: Validation - Amount must be positive

**Expected:** 400 Bad Request

```powershell
$transferBody = @{
    receiver_id = 3
    amount = 0
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "http://localhost:5080/api/wallet/transfer" -Method POST -Body $transferBody -ContentType "application/json" -Headers $aliceHeaders
} catch {
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)"
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $reader.ReadToEnd()
}
# Expected: {"error":"Amount must be greater than zero"}
```

### Test 4: Validation - Cannot transfer to yourself

**Expected:** 400 Bad Request

```powershell
$transferBody = @{
    receiver_id = 1
    amount = 1.0
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "http://localhost:5080/api/wallet/transfer" -Method POST -Body $transferBody -ContentType "application/json" -Headers $aliceHeaders
} catch {
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)"
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $reader.ReadToEnd()
}
# Expected: {"error":"Cannot transfer to yourself"}
```

### Test 5: Validation - Receiver must exist

**Expected:** 400 Bad Request

```powershell
$transferBody = @{
    receiver_id = 99999
    amount = 1.0
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "http://localhost:5080/api/wallet/transfer" -Method POST -Body $transferBody -ContentType "application/json" -Headers $aliceHeaders
} catch {
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)"
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $reader.ReadToEnd()
}
# Expected: {"error":"Receiver not found"}
```

### Test 6: Validation - Insufficient balance

**Expected:** 400 Bad Request with balance info

```powershell
$transferBody = @{
    receiver_id = 1
    amount = 100.0
    description = "Trying to transfer more than balance"
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "http://localhost:5080/api/wallet/transfer" -Method POST -Body $transferBody -ContentType "application/json" -Headers $charlieHeaders
} catch {
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)"
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $reader.ReadToEnd()
}
# Expected: {"error":"Insufficient balance","current_balance":-3.5,"requested_amount":100.0}
```

### Test 7: Cross-tenant isolation - Cannot transfer to user in different tenant

**Expected:** 400 Bad Request (receiver not found due to tenant filter)

```powershell
# Alice tries to transfer to Bob (user 2, Globex tenant)
$transferBody = @{
    receiver_id = 2
    amount = 1.0
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "http://localhost:5080/api/wallet/transfer" -Method POST -Body $transferBody -ContentType "application/json" -Headers $aliceHeaders
} catch {
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)"
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $reader.ReadToEnd()
}
# Expected: {"error":"Receiver not found"} - Bob is in different tenant
```

### Test 8: Verify transaction appears in history

```powershell
# Get Alice's transactions
$transactions = Invoke-RestMethod -Uri "http://localhost:5080/api/wallet/transactions?type=sent" -Method GET -Headers $aliceHeaders
Write-Host "Alice's sent transactions:"
$transactions.data | ForEach-Object { Write-Host "  $($_.id): $($_.amount) hours to $($_.receiver.first_name) - $($_.description)" }

# Get Charlie's transactions
$transactions = Invoke-RestMethod -Uri "http://localhost:5080/api/wallet/transactions?type=received" -Method GET -Headers $charlieHeaders
Write-Host "Charlie's received transactions:"
$transactions.data | ForEach-Object { Write-Host "  $($_.id): $($_.amount) hours from $($_.sender.first_name) - $($_.description)" }
```

### Test 9: Unauthenticated transfer (should be 401)

```powershell
$transferBody = @{
    receiver_id = 3
    amount = 1.0
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "http://localhost:5080/api/wallet/transfer" -Method POST -Body $transferBody -ContentType "application/json"
} catch {
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)"
}
# Expected: 401
```

---

## Summary of Expected Results

| Test | Description | Expected Result |
|------|-------------|-----------------|
| 1 | Successful transfer | 201 Created, balance updated |
| 2 | Transfer with listing | 201 Created, listing_id included |
| 3 | Zero/negative amount | 400 Bad Request |
| 4 | Transfer to self | 400 Bad Request |
| 5 | Invalid receiver | 400 Bad Request |
| 6 | Insufficient balance | 400 Bad Request with balance info |
| 7 | Cross-tenant transfer | 400 Bad Request (not found) |
| 8 | Transaction history | New transactions visible |
| 9 | Unauthenticated | 401 Unauthorized |

---

## API Contract

### POST /api/wallet/transfer

**Request:**
```json
{
  "receiver_id": 3,
  "amount": 1.5,
  "description": "Payment for service",
  "listing_id": 1  // optional
}
```

**Response (201 Created):**
```json
{
  "id": 6,
  "amount": 1.5,
  "description": "Payment for service",
  "status": "completed",
  "type": "sent",
  "sender": {
    "id": 1,
    "first_name": "Alice",
    "last_name": "Admin"
  },
  "receiver": {
    "id": 3,
    "first_name": "Charlie",
    "last_name": "Contributor"
  },
  "listing_id": 1,
  "created_at": "2026-02-02T10:00:00Z",
  "new_balance": 2.0
}
```

---

## Notes

- Transfers are atomic and immediately completed
- Balance is validated before transfer
- Sender and receiver must be in the same tenant
- Transaction status is always "completed" (no pending for manual transfers)
- The response includes the sender's new balance for immediate UI feedback
