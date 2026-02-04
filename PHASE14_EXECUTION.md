# Phase 14: Reviews - Execution & Test Scripts

This document contains test scripts to verify all Phase 14 (Reviews) functionality.

## Prerequisites

1. Docker Desktop installed and running
2. Start the stack: `docker compose up -d`
3. API available at `http://localhost:5080`

## Get Authentication Token

```bash
# Login as Alice (ACME tenant admin)
curl -X POST http://localhost:5080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@acme.test","password":"Test123!","tenant_slug":"acme"}'

# Save the token for subsequent requests
# Windows PowerShell:
$TOKEN = "eyJ..."

# Linux/Mac:
export TOKEN="eyJ..."
```

---

## Test 1: Get Reviews for a User

### 1.1 Get Alice's Reviews (User ID 1)

```bash
curl -X GET "http://localhost:5080/api/users/1/reviews" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response (200 OK):**
```json
{
  "data": [
    {
      "id": 1,
      "rating": 5,
      "comment": "Alice was fantastic to work with! Very organized and punctual. Highly recommend!",
      "created_at": "...",
      "updated_at": null,
      "reviewer": {
        "id": 3,
        "first_name": "Charlie",
        "last_name": "Contributor"
      }
    }
  ],
  "summary": {
    "average_rating": 5.0,
    "total_reviews": 1
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "pages": 1
  }
}
```

### 1.2 Get Reviews for Non-Existent User

```bash
curl -X GET "http://localhost:5080/api/users/999/reviews" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response (404 Not Found):**
```json
{
  "error": "User not found"
}
```

---

## Test 2: Create Review for a User

### 2.1 Alice Reviews Charlie (Valid)

```bash
# First login as Alice if not already
curl -X POST "http://localhost:5080/api/users/3/reviews" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 5,
    "comment": "Charlie is an excellent community member!"
  }'
```

**Expected Response (201 Created):**
```json
{
  "id": 5,
  "rating": 5,
  "comment": "Charlie is an excellent community member!",
  "target_user_id": 3,
  "created_at": "...",
  "reviewer": {
    "id": 1,
    "first_name": "Alice",
    "last_name": "Admin"
  }
}
```

### 2.2 Try to Review Yourself (Should Fail)

```bash
curl -X POST "http://localhost:5080/api/users/1/reviews" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 5,
    "comment": "I am awesome!"
  }'
```

**Expected Response (400 Bad Request):**
```json
{
  "error": "You cannot review yourself"
}
```

### 2.3 Try to Review Same User Twice (Should Fail)

```bash
# Alice already reviewed Charlie in seed data
curl -X POST "http://localhost:5080/api/users/3/reviews" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 4,
    "comment": "Another review"
  }'
```

**Expected Response (409 Conflict):**
```json
{
  "error": "You have already reviewed this user"
}
```

### 2.4 Invalid Rating (Should Fail)

```bash
curl -X POST "http://localhost:5080/api/users/3/reviews" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 6,
    "comment": "Invalid rating"
  }'
```

**Expected Response (400 Bad Request):**
```json
{
  "error": "Rating must be between 1 and 5"
}
```

---

## Test 3: Get Reviews for a Listing

### 3.1 Get Reviews for Alice's Home Repair Listing (ID 1)

```bash
curl -X GET "http://localhost:5080/api/listings/1/reviews" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response (200 OK):**
```json
{
  "data": [
    {
      "id": 3,
      "rating": 5,
      "comment": "Excellent home repair service. Fixed my squeaky door in no time!",
      "created_at": "...",
      "updated_at": null,
      "reviewer": {
        "id": 3,
        "first_name": "Charlie",
        "last_name": "Contributor"
      }
    }
  ],
  "summary": {
    "average_rating": 5.0,
    "total_reviews": 1
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "pages": 1
  }
}
```

### 3.2 Get Reviews for Non-Existent Listing

```bash
curl -X GET "http://localhost:5080/api/listings/999/reviews" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response (404 Not Found):**
```json
{
  "error": "Listing not found"
}
```

---

## Test 4: Create Review for a Listing

### 4.1 Login as Charlie and Review Alice's Listing

```bash
# First login as Charlie
curl -X POST http://localhost:5080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"member@acme.test","password":"Test123!","tenant_slug":"acme"}'

# Then create review for listing 2 (Alice's furniture moving request)
curl -X POST "http://localhost:5080/api/listings/2/reviews" \
  -H "Authorization: Bearer $CHARLIE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 4,
    "comment": "Good experience helping with the move!"
  }'
```

**Expected Response (201 Created):**
```json
{
  "id": 6,
  "rating": 4,
  "comment": "Good experience helping with the move!",
  "target_listing_id": 2,
  "created_at": "...",
  "reviewer": {
    "id": 3,
    "first_name": "Charlie",
    "last_name": "Contributor"
  }
}
```

### 4.2 Try to Review Your Own Listing (Should Fail)

```bash
# As Charlie, try to review own listing (ID 3)
curl -X POST "http://localhost:5080/api/listings/3/reviews" \
  -H "Authorization: Bearer $CHARLIE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 5,
    "comment": "My listing is great!"
  }'
```

**Expected Response (400 Bad Request):**
```json
{
  "error": "You cannot review your own listing"
}
```

---

## Test 5: Get a Specific Review

### 5.1 Get Review by ID

```bash
curl -X GET "http://localhost:5080/api/reviews/1" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response (200 OK):**
```json
{
  "id": 1,
  "rating": 5,
  "comment": "Alice was fantastic to work with! Very organized and punctual. Highly recommend!",
  "created_at": "...",
  "updated_at": null,
  "reviewer": {
    "id": 3,
    "first_name": "Charlie",
    "last_name": "Contributor"
  },
  "target_user": {
    "id": 1,
    "first_name": "Alice",
    "last_name": "Admin"
  },
  "target_listing": null
}
```

### 5.2 Get Non-Existent Review

```bash
curl -X GET "http://localhost:5080/api/reviews/999" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response (404 Not Found):**
```json
{
  "error": "Review not found"
}
```

---

## Test 6: Update a Review

### 6.1 Update Own Review (Valid)

```bash
# Login as Charlie (who wrote review 1)
curl -X PUT "http://localhost:5080/api/reviews/1" \
  -H "Authorization: Bearer $CHARLIE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 4,
    "comment": "Updated review - still great but had a minor issue"
  }'
```

**Expected Response (200 OK):**
```json
{
  "id": 1,
  "rating": 4,
  "comment": "Updated review - still great but had a minor issue",
  "created_at": "...",
  "updated_at": "...",
  "reviewer": {
    "id": 3,
    "first_name": "Charlie",
    "last_name": "Contributor"
  },
  "target_user": {
    "id": 1,
    "first_name": "Alice",
    "last_name": "Admin"
  },
  "target_listing": null
}
```

### 6.2 Try to Update Someone Else's Review (Should Fail)

```bash
# As Alice, try to update Charlie's review (ID 1)
curl -X PUT "http://localhost:5080/api/reviews/1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 1,
    "comment": "Trying to sabotage"
  }'
```

**Expected Response (403 Forbidden):**
```json
{
  "error": "You can only update your own reviews"
}
```

---

## Test 7: Delete a Review

### 7.1 Delete Own Review

```bash
# Login as Charlie and delete review 1
curl -X DELETE "http://localhost:5080/api/reviews/1" \
  -H "Authorization: Bearer $CHARLIE_TOKEN"
```

**Expected Response (204 No Content):**
(Empty response body)

### 7.2 Try to Delete Someone Else's Review (Should Fail)

```bash
# As Alice, try to delete Charlie's review (ID 2)
curl -X DELETE "http://localhost:5080/api/reviews/2" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response (403 Forbidden):**
```json
{
  "error": "You can only delete your own reviews"
}
```

---

## Test 8: XP Integration

### 8.1 Check XP Awarded After Creating a Review

```bash
# Get current user's gamification stats
curl -X GET "http://localhost:5080/api/gamification/me" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:** XP should include points from `review_left` source (5 XP per review)

---

## Test 9: Tenant Isolation

### 9.1 Verify Users from Different Tenants Cannot See Each Other's Reviews

```bash
# Login as Bob (Globex tenant)
curl -X POST http://localhost:5080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@globex.test","password":"Test123!","tenant_slug":"globex"}'

# Try to get reviews for Alice (ACME tenant user)
curl -X GET "http://localhost:5080/api/users/1/reviews" \
  -H "Authorization: Bearer $BOB_TOKEN"
```

**Expected Response (404 Not Found):**
```json
{
  "error": "User not found"
}
```

---

## Completion Checklist

- [ ] GET /api/users/{id}/reviews returns reviews with pagination
- [ ] POST /api/users/{id}/reviews creates user review
- [ ] Cannot review yourself
- [ ] Cannot duplicate user reviews
- [ ] GET /api/listings/{id}/reviews returns reviews with pagination
- [ ] POST /api/listings/{id}/reviews creates listing review
- [ ] Cannot review your own listing
- [ ] Cannot duplicate listing reviews
- [ ] GET /api/reviews/{id} returns single review
- [ ] PUT /api/reviews/{id} updates own review only
- [ ] DELETE /api/reviews/{id} deletes own review only
- [ ] XP awarded for leaving reviews
- [ ] Tenant isolation enforced
- [ ] Average rating calculated correctly
- [ ] Rating validation (1-5) enforced
- [ ] Comment length validation (max 2000) enforced

---

## Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/users/{id}/reviews | List reviews for a user |
| POST | /api/users/{id}/reviews | Create review for a user |
| GET | /api/listings/{id}/reviews | List reviews for a listing |
| POST | /api/listings/{id}/reviews | Create review for a listing |
| GET | /api/reviews/{id} | Get a specific review |
| PUT | /api/reviews/{id} | Update own review |
| DELETE | /api/reviews/{id} | Delete own review |

**Total new endpoints: 7**
