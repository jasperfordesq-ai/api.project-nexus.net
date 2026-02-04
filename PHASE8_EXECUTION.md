# Phase 8: Authentication Enhancements - Test Scripts

## Prerequisites

1. Docker Desktop installed and running
2. Start the stack: `docker compose up -d`
3. API available at http://localhost:5080

## Test Credentials

- `admin@acme.test` / `Test123!` / tenant_slug: `acme`
- `member@acme.test` / `Test123!` / tenant_slug: `acme`

---

## Test 1: Login with Refresh Token

```powershell
$login = Invoke-RestMethod -Uri "http://localhost:5080/api/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"admin@acme.test","password":"Test123!","tenant_slug":"acme"}'
$login | ConvertTo-Json

# Expected: access_token, refresh_token, user object
```

Save tokens for subsequent tests:
```powershell
$accessToken = $login.access_token
$refreshToken = $login.refresh_token
$headers = @{ Authorization = "Bearer $accessToken" }
```

---

## Test 2: Refresh Token

```powershell
$refresh = Invoke-RestMethod -Uri "http://localhost:5080/api/auth/refresh" -Method POST -ContentType "application/json" -Body "{`"refresh_token`":`"$refreshToken`"}"
$refresh | ConvertTo-Json

# Expected: new access_token, new refresh_token
# Old refresh token should now be invalid
```

Update tokens:
```powershell
$accessToken = $refresh.access_token
$refreshToken = $refresh.refresh_token
$headers = @{ Authorization = "Bearer $accessToken" }
```

---

## Test 3: Validate Token Still Works

```powershell
Invoke-RestMethod -Uri "http://localhost:5080/api/auth/validate" -Method GET -Headers $headers

# Expected: valid = true, user_id, tenant_id, etc.
```

---

## Test 4: Logout (Revoke Specific Token)

```powershell
Invoke-RestMethod -Uri "http://localhost:5080/api/auth/logout" -Method POST -Headers $headers -ContentType "application/json" -Body "{`"refresh_token`":`"$refreshToken`"}"

# Expected: { success: true, message: "Logged out successfully" }
```

Verify refresh token is now invalid:
```powershell
try {
    Invoke-RestMethod -Uri "http://localhost:5080/api/auth/refresh" -Method POST -ContentType "application/json" -Body "{`"refresh_token`":`"$refreshToken`"}"
} catch {
    $_.Exception.Response.StatusCode  # Should be 401 Unauthorized
}
```

---

## Test 5: Logout All Sessions

```powershell
# Login again first
$login = Invoke-RestMethod -Uri "http://localhost:5080/api/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"admin@acme.test","password":"Test123!","tenant_slug":"acme"}'
$accessToken = $login.access_token
$refreshToken = $login.refresh_token
$headers = @{ Authorization = "Bearer $accessToken" }

# Logout all (no refresh_token in body)
Invoke-RestMethod -Uri "http://localhost:5080/api/auth/logout" -Method POST -Headers $headers -ContentType "application/json" -Body '{}'

# Expected: All refresh tokens for this user are revoked
```

---

## Test 6: User Registration

```powershell
$register = Invoke-RestMethod -Uri "http://localhost:5080/api/auth/register" -Method POST -ContentType "application/json" -Body '{
    "email": "newuser@example.com",
    "password": "SecurePass123!",
    "first_name": "New",
    "last_name": "User",
    "tenant_slug": "acme"
}'
$register | ConvertTo-Json

# Expected: 201 Created, access_token, refresh_token, user object
```

---

## Test 7: Registration Validation Errors

```powershell
# Missing fields
try {
    Invoke-RestMethod -Uri "http://localhost:5080/api/auth/register" -Method POST -ContentType "application/json" -Body '{
        "email": "",
        "password": "short",
        "tenant_slug": "acme"
    }'
} catch {
    $_.ErrorDetails.Message | ConvertFrom-Json | ConvertTo-Json
    # Expected: 400 with validation errors
}
```

---

## Test 8: Duplicate Email Registration

```powershell
try {
    Invoke-RestMethod -Uri "http://localhost:5080/api/auth/register" -Method POST -ContentType "application/json" -Body '{
        "email": "admin@acme.test",
        "password": "AnotherPass123!",
        "first_name": "Duplicate",
        "last_name": "User",
        "tenant_slug": "acme"
    }'
} catch {
    $_.ErrorDetails.Message | ConvertFrom-Json
    # Expected: 409 Conflict - "Email already registered"
}
```

---

## Test 9: Forgot Password

```powershell
$forgot = Invoke-RestMethod -Uri "http://localhost:5080/api/auth/forgot-password" -Method POST -ContentType "application/json" -Body '{
    "email": "admin@acme.test",
    "tenant_slug": "acme"
}'
$forgot | ConvertTo-Json

# In Development: Returns reset_token
# In Production: Returns generic success message
```

Save reset token (development only):
```powershell
$resetToken = $forgot.reset_token
```

---

## Test 10: Reset Password

```powershell
Invoke-RestMethod -Uri "http://localhost:5080/api/auth/reset-password" -Method POST -ContentType "application/json" -Body "{`"token`":`"$resetToken`",`"new_password`":`"NewSecurePass123!`"}"

# Expected: { success: true, message: "Password reset successfully" }
```

Verify new password works:
```powershell
$login = Invoke-RestMethod -Uri "http://localhost:5080/api/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"admin@acme.test","password":"NewSecurePass123!","tenant_slug":"acme"}'
$login | ConvertTo-Json

# Expected: Successful login
```

Reset password back:
```powershell
# Request new reset token
$forgot = Invoke-RestMethod -Uri "http://localhost:5080/api/auth/forgot-password" -Method POST -ContentType "application/json" -Body '{"email":"admin@acme.test","tenant_slug":"acme"}'
$resetToken = $forgot.reset_token

# Reset back to original
Invoke-RestMethod -Uri "http://localhost:5080/api/auth/reset-password" -Method POST -ContentType "application/json" -Body "{`"token`":`"$resetToken`",`"new_password`":`"Test123!`"}"
```

---

## Test 11: Invalid Reset Token

```powershell
try {
    Invoke-RestMethod -Uri "http://localhost:5080/api/auth/reset-password" -Method POST -ContentType "application/json" -Body '{"token":"invalid_token","new_password":"NewPass123!"}'
} catch {
    $_.ErrorDetails.Message | ConvertFrom-Json
    # Expected: 400 - "Invalid reset token"
}
```

---

## Test 12: Expired Reset Token (Manual Test)

After 1 hour, the reset token expires. This can be tested by:
1. Generating a reset token
2. Manually updating the `expires_at` in the database to the past
3. Attempting to use the token

---

## Test 13: Cross-Tenant Registration Isolation

```powershell
# Same email can register in different tenant
$register = Invoke-RestMethod -Uri "http://localhost:5080/api/auth/register" -Method POST -ContentType "application/json" -Body '{
    "email": "newuser@example.com",
    "password": "SecurePass123!",
    "first_name": "Globex",
    "last_name": "User",
    "tenant_slug": "globex"
}'
$register | ConvertTo-Json

# Expected: 201 Created - same email, different tenant
```

---

## Summary

| Test | Endpoint | Expected |
|------|----------|----------|
| 1 | POST /api/auth/login | Returns access_token + refresh_token |
| 2 | POST /api/auth/refresh | Returns new tokens, rotates old |
| 3 | GET /api/auth/validate | Token still valid |
| 4 | POST /api/auth/logout | Revokes specific token |
| 5 | POST /api/auth/logout | Revokes all tokens |
| 6 | POST /api/auth/register | 201 + auto-login |
| 7 | POST /api/auth/register | 400 validation errors |
| 8 | POST /api/auth/register | 409 duplicate email |
| 9 | POST /api/auth/forgot-password | Returns reset token (dev) |
| 10 | POST /api/auth/reset-password | Password changed |
| 11 | POST /api/auth/reset-password | 400 invalid token |
| 12 | POST /api/auth/reset-password | 400 expired token |
| 13 | POST /api/auth/register | Cross-tenant isolation |

---

## Phase 8 Checklist

- [x] RefreshToken entity with tenant isolation
- [x] PasswordResetToken entity with tenant isolation
- [x] POST /api/auth/logout (revoke tokens)
- [x] POST /api/auth/refresh (token rotation)
- [x] POST /api/auth/register (new user registration)
- [x] POST /api/auth/forgot-password (request reset)
- [x] POST /api/auth/reset-password (confirm reset)
- [x] Refresh token rotation for security
- [x] Password reset invalidates all sessions
- [ ] Email sending (deferred - requires email service)
- [x] PHASE8_EXECUTION.md with test scripts
