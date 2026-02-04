# Phase 4: Wallet READ - Execution & Testing

## Objectives
- GET /api/wallet/balance - Get current user's balance
- GET /api/wallet/transactions - Get transaction history (with pagination and type filter)
- GET /api/wallet/transactions/{id} - Get single transaction

## Prerequisites

- Docker Desktop installed and running

## Setup

### 1. Start the Docker Stack (resets DB if needed)

```powershell
# Fresh start with new seed data
docker compose down -v
docker compose up -d
```

### 2. Get a JWT token
```powershell
$loginBody = @{
    email = "admin@acme.test"
    password = "Test123!"
    tenant_slug = "acme"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "http://localhost:5080/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
$token = $loginResponse.access_token
$headers = @{ Authorization = "Bearer $token" }
Write-Host "Token obtained for Alice (admin@acme.test)"
```

---

## Test Cases

### Test 1: Get balance (GET /api/wallet/balance)

**Expected for Alice (user 1):**
- Received: 2.0 + 3.0 = 5.0 hours (from Charlie)
- Sent: 1.5 hours (to Charlie)
- Balance: 5.0 - 1.5 = 3.5 hours

```powershell
$response = Invoke-RestMethod -Uri "http://localhost:5080/api/wallet/balance" -Method GET -Headers $headers
$response | ConvertTo-Json
# Expected: balance = 3.5
```

### Test 2: Get balance for Charlie (member user)

```powershell
$charlieLogin = @{
    email = "member@acme.test"
    password = "Test123!"
    tenant_slug = "acme"
} | ConvertTo-Json

$charlieResponse = Invoke-RestMethod -Uri "http://localhost:5080/api/auth/login" -Method POST -Body $charlieLogin -ContentType "application/json"
$charlieToken = $charlieResponse.access_token
$charlieHeaders = @{ Authorization = "Bearer $charlieToken" }

$response = Invoke-RestMethod -Uri "http://localhost:5080/api/wallet/balance" -Method GET -Headers $charlieHeaders
$response | ConvertTo-Json
# Expected for Charlie:
# Received: 1.5 hours (from Alice)
# Sent: 2.0 + 3.0 = 5.0 hours (to Alice)
# Balance: 1.5 - 5.0 = -3.5 hours (negative - owes time)
```

### Test 3: Get all transactions

```powershell
$response = Invoke-RestMethod -Uri "http://localhost:5080/api/wallet/transactions" -Method GET -Headers $headers
$response | ConvertTo-Json -Depth 5
# Expected: 4 transactions for Alice (2 sent, 2 received, including pending)
```

### Test 4: Get only sent transactions

```powershell
$response = Invoke-RestMethod -Uri "http://localhost:5080/api/wallet/transactions?type=sent" -Method GET -Headers $headers
$response | ConvertTo-Json -Depth 5
# Expected: 2 transactions (Alice sent to Charlie)
```

### Test 5: Get only received transactions

```powershell
$response = Invoke-RestMethod -Uri "http://localhost:5080/api/wallet/transactions?type=received" -Method GET -Headers $headers
$response | ConvertTo-Json -Depth 5
# Expected: 2 transactions (Alice received from Charlie)
```

### Test 6: Pagination

```powershell
$response = Invoke-RestMethod -Uri "http://localhost:5080/api/wallet/transactions?page=1&limit=2" -Method GET -Headers $headers
$response | ConvertTo-Json -Depth 5
# Expected: 2 transactions, pagination shows total=4, pages=2
```

### Test 7: Get single transaction

```powershell
$response = Invoke-RestMethod -Uri "http://localhost:5080/api/wallet/transactions/1" -Method GET -Headers $headers
$response | ConvertTo-Json -Depth 5
# Expected: Transaction 1 details (Charlie to Alice, 2.0 hours)
```

### Test 8: Get transaction user is not part of (should be 404)

```powershell
try {
    Invoke-RestMethod -Uri "http://localhost:5080/api/wallet/transactions/5" -Method GET -Headers $headers
    Write-Host "FAIL: Should not be able to see transaction 5 (Globex tenant)"
} catch {
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)"
    # Expected: 404 (transaction is in different tenant)
}
```

### Test 9: Cross-tenant isolation (Globex user)

```powershell
$globexLogin = @{
    email = "admin@globex.test"
    password = "Test123!"
    tenant_slug = "globex"
} | ConvertTo-Json

$globexResponse = Invoke-RestMethod -Uri "http://localhost:5080/api/auth/login" -Method POST -Body $globexLogin -ContentType "application/json"
$globexToken = $globexResponse.access_token
$globexHeaders = @{ Authorization = "Bearer $globexToken" }

# Get Bob's balance
$response = Invoke-RestMethod -Uri "http://localhost:5080/api/wallet/balance" -Method GET -Headers $globexHeaders
$response | ConvertTo-Json
# Expected: balance = 0 (self-transfer doesn't change balance)

# Try to access ACME's transaction
try {
    Invoke-RestMethod -Uri "http://localhost:5080/api/wallet/transactions/1" -Method GET -Headers $globexHeaders
    Write-Host "FAIL: Should not see ACME transactions"
} catch {
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)"
    # Expected: 404
}
```

### Test 10: Unauthenticated access (should be 401)

```powershell
try {
    Invoke-RestMethod -Uri "http://localhost:5080/api/wallet/balance" -Method GET
} catch {
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)"
    # Expected: 401
}
```

---

## Summary of Expected Results

| Test | Description | Expected Result |
|------|-------------|-----------------|
| 1 | Alice's balance | 3.5 hours |
| 2 | Charlie's balance | -3.5 hours |
| 3 | All transactions | 4 transactions |
| 4 | Sent transactions | 2 transactions |
| 5 | Received transactions | 2 transactions |
| 6 | Pagination | 2 results, total=4 |
| 7 | Single transaction | Transaction details |
| 8 | Other tenant's transaction | 404 Not Found |
| 9 | Cross-tenant isolation | Balance=0, 404 for ACME txn |
| 10 | Unauthenticated | 401 Unauthorized |

---

## Seed Data Summary

### Tenant 1 (ACME) Transactions:
| ID | Sender | Receiver | Amount | Description |
|----|--------|----------|--------|-------------|
| 1 | Charlie | Alice | 2.0 | Home repair payment |
| 2 | Alice | Charlie | 1.5 | Garden weeding payment |
| 3 | Charlie | Alice | 3.0 | Furniture moving payment |
| 4 | Alice | Charlie | 2.0 | Upcoming service (PENDING) |

### Tenant 2 (Globex) Transactions:
| ID | Sender | Receiver | Amount | Description |
|----|--------|----------|--------|-------------|
| 5 | Bob | Bob | 10.0 | Initial credit allocation |

---

## Notes

- Balance is calculated dynamically from completed transactions only
- Pending transactions don't affect balance
- Users can only see transactions where they are sender or receiver
- Cross-tenant access returns 404 (not 403) for security
