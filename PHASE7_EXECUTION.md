# Phase 7: Messages WRITE - Execution & Testing

## Objectives
- POST /api/messages - Send a message (creates conversation if needed)
- PUT /api/messages/{id}/read - Mark all messages in conversation as read

## Prerequisites

- Docker Desktop installed and running

## Setup

### 1. Start the Docker Stack

```powershell
docker compose up -d
```

### 2. Get JWT tokens for testing
```powershell
# Alice (admin, user 1)
$aliceLogin = @{
    email = "admin@acme.test"
    password = "Test123!"
    tenant_slug = "acme"
} | ConvertTo-Json

$aliceResponse = Invoke-RestMethod -Uri "http://localhost:5080/api/auth/login" -Method POST -Body $aliceLogin -ContentType "application/json"
$aliceToken = $aliceResponse.access_token
$aliceHeaders = @{ Authorization = "Bearer $aliceToken" }

# Charlie (member, user 3)
$charlieLogin = @{
    email = "member@acme.test"
    password = "Test123!"
    tenant_slug = "acme"
} | ConvertTo-Json

$charlieResponse = Invoke-RestMethod -Uri "http://localhost:5080/api/auth/login" -Method POST -Body $charlieLogin -ContentType "application/json"
$charlieToken = $charlieResponse.access_token
$charlieHeaders = @{ Authorization = "Bearer $charlieToken" }

# Bob (Globex admin, user 2)
$bobLogin = @{
    email = "admin@globex.test"
    password = "Test123!"
    tenant_slug = "globex"
} | ConvertTo-Json

$bobResponse = Invoke-RestMethod -Uri "http://localhost:5080/api/auth/login" -Method POST -Body $bobLogin -ContentType "application/json"
$bobToken = $bobResponse.access_token
$bobHeaders = @{ Authorization = "Bearer $bobToken" }
```

---

## Test Cases

### Test 1: Send message to existing conversation

**Expected:** 201 Created, message added to existing conversation

```powershell
# Alice sends a message to Charlie (they already have conversation 1)
$messageBody = @{
    recipient_id = 3
    content = "Thanks for the lawn mowing offer! I might take you up on that."
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:5080/api/messages" -Method POST -Body $messageBody -ContentType "application/json" -Headers $aliceHeaders
$response | ConvertTo-Json -Depth 5
# Expected: conversation_id = 1 (existing conversation)
```

### Test 2: Send message creating new conversation

**Expected:** 201 Created with new conversation

```powershell
# Bob sends a message to himself... wait, Bob is in Globex, alone
# Let's check if Bob can message anyone - there's no one else in Globex
# So let's just verify the cross-tenant test (Test 7) works
```

### Test 3: Mark conversation as read

**Expected:** 200 OK with count of marked messages

```powershell
# First check Alice's unread count
$response = Invoke-RestMethod -Uri "http://localhost:5080/api/messages/unread-count" -Method GET -Headers $aliceHeaders
Write-Host "Alice unread before: $($response.unread_count)"

# Mark conversation 1 as read (Alice reading Charlie's messages)
$response = Invoke-RestMethod -Uri "http://localhost:5080/api/messages/1/read" -Method PUT -Headers $aliceHeaders
$response | ConvertTo-Json
# Expected: marked_read >= 1 (at least the seed unread message)

# Check Alice's unread count after
$response = Invoke-RestMethod -Uri "http://localhost:5080/api/messages/unread-count" -Method GET -Headers $aliceHeaders
Write-Host "Alice unread after: $($response.unread_count)"
# Expected: 0
```

### Test 4: Validation - Empty content

**Expected:** 400 Bad Request

```powershell
try {
    $body = @{ recipient_id = 3; content = "" } | ConvertTo-Json
    Invoke-RestMethod -Uri "http://localhost:5080/api/messages" -Method POST -Body $body -ContentType "application/json" -Headers $aliceHeaders
    Write-Host "FAIL: Should have rejected empty content"
} catch {
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)"
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $reader.ReadToEnd()
}
# Expected: {"error":"Message content is required"}
```

### Test 5: Validation - Cannot message yourself

**Expected:** 400 Bad Request

```powershell
try {
    $body = @{ recipient_id = 1; content = "Hello myself" } | ConvertTo-Json
    Invoke-RestMethod -Uri "http://localhost:5080/api/messages" -Method POST -Body $body -ContentType "application/json" -Headers $aliceHeaders
    Write-Host "FAIL: Should have rejected self-message"
} catch {
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)"
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $reader.ReadToEnd()
}
# Expected: {"error":"Cannot send message to yourself"}
```

### Test 6: Validation - Recipient not found

**Expected:** 400 Bad Request

```powershell
try {
    $body = @{ recipient_id = 99999; content = "Hello" } | ConvertTo-Json
    Invoke-RestMethod -Uri "http://localhost:5080/api/messages" -Method POST -Body $body -ContentType "application/json" -Headers $aliceHeaders
    Write-Host "FAIL: Should have rejected invalid recipient"
} catch {
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)"
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $reader.ReadToEnd()
}
# Expected: {"error":"Recipient not found"}
```

### Test 7: Cross-tenant isolation - Cannot message user in different tenant

**Expected:** 400 Bad Request (recipient not found due to tenant filter)

```powershell
try {
    # Alice (ACME) tries to message Bob (Globex)
    $body = @{ recipient_id = 2; content = "Hello Bob" } | ConvertTo-Json
    Invoke-RestMethod -Uri "http://localhost:5080/api/messages" -Method POST -Body $body -ContentType "application/json" -Headers $aliceHeaders
    Write-Host "FAIL: Should have rejected cross-tenant message"
} catch {
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)"
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $reader.ReadToEnd()
}
# Expected: {"error":"Recipient not found"} - Bob is in different tenant
```

### Test 8: Mark non-existent conversation as read

**Expected:** 404 Not Found

```powershell
try {
    Invoke-RestMethod -Uri "http://localhost:5080/api/messages/999/read" -Method PUT -Headers $aliceHeaders
    Write-Host "FAIL: Should have returned 404"
} catch {
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)"
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $reader.ReadToEnd()
}
# Expected: 404
```

### Test 9: Cross-tenant - Cannot mark other tenant's conversation as read

**Expected:** 404 Not Found

```powershell
try {
    # Bob (Globex) tries to mark ACME conversation as read
    Invoke-RestMethod -Uri "http://localhost:5080/api/messages/1/read" -Method PUT -Headers $bobHeaders
    Write-Host "FAIL: Should have returned 404"
} catch {
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)"
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $reader.ReadToEnd()
}
# Expected: 404
```

### Test 10: Verify message appears in conversation

```powershell
# Get conversation messages after sending
$response = Invoke-RestMethod -Uri "http://localhost:5080/api/messages/1" -Method GET -Headers $aliceHeaders
Write-Host "Total messages in conversation: $($response.pagination.total)"
Write-Host "Latest messages:"
$response.messages | Select-Object -First 3 | ForEach-Object {
    Write-Host "  [$($_.sender.first_name)]: $($_.content.Substring(0, [Math]::Min(50, $_.content.Length)))..."
}
```

### Test 11: Unauthenticated access (should be 401)

```powershell
try {
    $body = @{ recipient_id = 3; content = "Hello" } | ConvertTo-Json
    Invoke-RestMethod -Uri "http://localhost:5080/api/messages" -Method POST -Body $body -ContentType "application/json"
    Write-Host "FAIL: Should have returned 401"
} catch {
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)"
}
# Expected: 401
```

---

## Summary of Expected Results

| Test | Description | Expected Result |
|------|-------------|-----------------|
| 1 | Send to existing conversation | 201 Created, conversation_id=1 |
| 3 | Mark conversation read | 200 OK, marked_read >= 1 |
| 4 | Empty content | 400 Bad Request |
| 5 | Message yourself | 400 Bad Request |
| 6 | Invalid recipient | 400 Bad Request |
| 7 | Cross-tenant message | 400 Bad Request |
| 8 | Mark non-existent read | 404 Not Found |
| 9 | Mark other tenant's read | 404 Not Found |
| 10 | Verify in history | New message visible |
| 11 | Unauthenticated | 401 Unauthorized |

---

## API Contract

### POST /api/messages

**Request:**
```json
{
  "recipient_id": 3,
  "content": "Hello! How are you?"
}
```

**Response (201 Created):**
```json
{
  "id": 6,
  "conversation_id": 1,
  "content": "Hello! How are you?",
  "sender": {
    "id": 1,
    "first_name": "Alice",
    "last_name": "Admin"
  },
  "recipient": {
    "id": 3,
    "first_name": "Charlie",
    "last_name": "Contributor"
  },
  "is_read": false,
  "created_at": "2026-02-02T11:00:00Z"
}
```

### PUT /api/messages/{id}/read

**Response (200 OK):**
```json
{
  "conversation_id": 1,
  "marked_read": 2
}
```

---

## Notes

- Sending to a new recipient automatically creates a conversation
- Conversation participants are normalized (smaller ID first) for uniqueness
- Mark as read only affects messages from the OTHER participant
- Messages are limited to 5000 characters
- Cross-tenant messaging is blocked by tenant filter on Users
