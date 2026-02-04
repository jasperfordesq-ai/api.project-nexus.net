# Phase 6: Messages READ - Execution & Testing

## Objectives
- GET /api/messages - List conversations with last message preview
- GET /api/messages/{id} - Get messages in a conversation
- GET /api/messages/unread-count - Get unread message count

## Prerequisites

- Docker Desktop installed and running

## Setup

### 1. Start the Docker Stack (resets DB if needed)

```powershell
# Fresh start with new seed data
docker compose down -v
docker compose up -d
```

### 2. Get JWT tokens for testing
```powershell
# Alice (admin, user 1) - has 1 conversation with Charlie
$aliceLogin = @{
    email = "admin@acme.test"
    password = "Test123!"
    tenant_slug = "acme"
} | ConvertTo-Json

$aliceResponse = Invoke-RestMethod -Uri "http://localhost:5080/api/auth/login" -Method POST -Body $aliceLogin -ContentType "application/json"
$aliceToken = $aliceResponse.access_token
$aliceHeaders = @{ Authorization = "Bearer $aliceToken" }

# Charlie (member, user 3) - same conversation with Alice
$charlieLogin = @{
    email = "member@acme.test"
    password = "Test123!"
    tenant_slug = "acme"
} | ConvertTo-Json

$charlieResponse = Invoke-RestMethod -Uri "http://localhost:5080/api/auth/login" -Method POST -Body $charlieLogin -ContentType "application/json"
$charlieToken = $charlieResponse.access_token
$charlieHeaders = @{ Authorization = "Bearer $charlieToken" }

# Bob (Globex admin, user 2) - no conversations
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

### Test 1: Get conversations (Alice)

**Expected:** 1 conversation with Charlie, showing last message preview and unread count

```powershell
$response = Invoke-RestMethod -Uri "http://localhost:5080/api/messages" -Method GET -Headers $aliceHeaders
$response | ConvertTo-Json -Depth 5
# Expected: 1 conversation with Charlie, unread_count = 1 (Charlie's unread message)
```

### Test 2: Get conversations (Charlie)

**Expected:** 1 conversation with Alice, unread_count = 0

```powershell
$response = Invoke-RestMethod -Uri "http://localhost:5080/api/messages" -Method GET -Headers $charlieHeaders
$response | ConvertTo-Json -Depth 5
# Expected: 1 conversation with Alice, unread_count = 0 (all messages from Alice are read)
```

### Test 3: Get conversation messages (Alice)

**Expected:** 5 messages in the conversation

```powershell
$response = Invoke-RestMethod -Uri "http://localhost:5080/api/messages/1" -Method GET -Headers $aliceHeaders
$response | ConvertTo-Json -Depth 5
# Expected: Conversation with 5 messages, ordered by most recent first
```

### Test 4: Get conversation messages with pagination

```powershell
$response = Invoke-RestMethod -Uri "http://localhost:5080/api/messages/1?page=1&limit=2" -Method GET -Headers $aliceHeaders
$response | ConvertTo-Json -Depth 5
# Expected: 2 messages, pagination shows total=5, total_pages=3
```

### Test 5: Get unread count (Alice)

**Expected:** 1 unread message (from Charlie)

```powershell
$response = Invoke-RestMethod -Uri "http://localhost:5080/api/messages/unread-count" -Method GET -Headers $aliceHeaders
$response | ConvertTo-Json
# Expected: { "unread_count": 1 }
```

### Test 6: Get unread count (Charlie)

**Expected:** 0 unread messages

```powershell
$response = Invoke-RestMethod -Uri "http://localhost:5080/api/messages/unread-count" -Method GET -Headers $charlieHeaders
$response | ConvertTo-Json
# Expected: { "unread_count": 0 }
```

### Test 7: Access non-existent conversation (should be 404)

```powershell
try {
    Invoke-RestMethod -Uri "http://localhost:5080/api/messages/999" -Method GET -Headers $aliceHeaders
    Write-Host "FAIL: Should have returned 404"
} catch {
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)"
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $reader.ReadToEnd()
}
# Expected: 404 Not Found
```

### Test 8: Cross-tenant isolation - Bob cannot see ACME conversations

```powershell
try {
    Invoke-RestMethod -Uri "http://localhost:5080/api/messages/1" -Method GET -Headers $bobHeaders
    Write-Host "FAIL: Should have returned 404"
} catch {
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)"
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $reader.ReadToEnd()
}
# Expected: 404 Not Found (conversation doesn't exist in Bob's tenant)
```

### Test 9: Bob's conversations (should be empty)

```powershell
$response = Invoke-RestMethod -Uri "http://localhost:5080/api/messages" -Method GET -Headers $bobHeaders
$response | ConvertTo-Json -Depth 5
# Expected: Empty data array, total = 0
```

### Test 10: Unauthenticated access (should be 401)

```powershell
try {
    Invoke-RestMethod -Uri "http://localhost:5080/api/messages" -Method GET
} catch {
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)"
}
# Expected: 401 Unauthorized
```

---

## Summary of Expected Results

| Test | Description | Expected Result |
|------|-------------|-----------------|
| 1 | Alice's conversations | 1 conversation, unread=1 |
| 2 | Charlie's conversations | 1 conversation, unread=0 |
| 3 | Conversation messages | 5 messages |
| 4 | Pagination | 2 messages, total=5 |
| 5 | Alice unread count | 1 |
| 6 | Charlie unread count | 0 |
| 7 | Non-existent conversation | 404 Not Found |
| 8 | Cross-tenant access | 404 Not Found |
| 9 | Bob's conversations | Empty list |
| 10 | Unauthenticated | 401 Unauthorized |

---

## Seed Data Summary

### Conversation 1 (ACME tenant - Alice & Charlie):
| ID | Sender | Content (truncated) | IsRead |
|----|--------|---------------------|--------|
| 1 | Alice | "Hi Charlie! I saw your garden..." | ✓ |
| 2 | Charlie | "Hi Alice! Yes, I'm free Saturday..." | ✓ |
| 3 | Alice | "Perfect! I'll see you then..." | ✓ |
| 4 | Charlie | "Thanks for the payment!..." | ✓ |
| 5 | Charlie | "By the way, I also do lawn mowing..." | ✗ (unread by Alice) |

---

## API Contract

### GET /api/messages

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": 1,
      "participant": {
        "id": 3,
        "first_name": "Charlie",
        "last_name": "Contributor"
      },
      "last_message": {
        "id": 5,
        "content": "By the way, I also do lawn mowing if you're interested!",
        "sender_id": 3,
        "is_read": false,
        "created_at": "2026-02-02T08:00:00Z"
      },
      "unread_count": 1,
      "created_at": "2026-01-30T10:00:00Z",
      "updated_at": "2026-02-02T08:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "total_pages": 1
  }
}
```

### GET /api/messages/{id}

**Response (200 OK):**
```json
{
  "id": 1,
  "participant": {
    "id": 3,
    "first_name": "Charlie",
    "last_name": "Contributor"
  },
  "messages": [
    {
      "id": 5,
      "content": "By the way, I also do lawn mowing if you're interested!",
      "sender": {
        "id": 3,
        "first_name": "Charlie",
        "last_name": "Contributor"
      },
      "is_read": false,
      "created_at": "2026-02-02T08:00:00Z",
      "read_at": null
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 5,
    "total_pages": 1
  },
  "created_at": "2026-01-30T10:00:00Z",
  "updated_at": "2026-02-02T08:00:00Z"
}
```

### GET /api/messages/unread-count

**Response (200 OK):**
```json
{
  "unread_count": 1
}
```

---

## Notes

- Conversations show the OTHER participant (not the current user)
- Messages are ordered by most recent first (descending)
- Only participants can access a conversation (returns 404 otherwise)
- Cross-tenant access returns 404 (not 403) for security
- Unread count only counts messages from the OTHER participant
- Last message preview is truncated to 100 characters
