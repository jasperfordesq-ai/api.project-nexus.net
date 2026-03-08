# Authentication Security Migration Guide

## Current Implementation

The NEXUS frontend currently stores JWT tokens in `localStorage`:

```typescript
// src/lib/api.ts
const TOKEN_KEY = "nexus_token";
localStorage.setItem(TOKEN_KEY, token);
```

### Security Concerns

1. **XSS Vulnerability**: localStorage is accessible via JavaScript, meaning any XSS attack can steal the token
2. **No automatic expiration handling**: Tokens persist until explicitly removed
3. **Exposed to third-party scripts**: Any script running on the page can access localStorage

## Recommended Migration: httpOnly Cookies

### Why httpOnly Cookies?

- **XSS Protection**: httpOnly cookies cannot be accessed via JavaScript
- **Automatic handling**: Browser automatically includes cookies in requests
- **CSRF protection**: Can be combined with SameSite attribute and CSRF tokens
- **Secure transmission**: Can enforce HTTPS-only transmission

### Implementation Plan

#### Phase 1: Backend Changes (ASP.NET Core)

1. **Modify Login Endpoint** to set httpOnly cookie:

```csharp
// In AuthController.cs
[HttpPost("login")]
public async Task<IActionResult> Login([FromBody] LoginRequest request)
{
    var result = await _authService.AuthenticateAsync(request);

    if (result.Success)
    {
        // Set httpOnly cookie
        Response.Cookies.Append("nexus_auth", result.Token, new CookieOptions
        {
            HttpOnly = true,
            Secure = true, // HTTPS only
            SameSite = SameSiteMode.Strict,
            Expires = DateTimeOffset.UtcNow.AddDays(7),
            Path = "/"
        });

        // Return user info without token
        return Ok(new { user = result.User });
    }

    return Unauthorized();
}
```

2. **Modify Logout Endpoint** to clear cookie:

```csharp
[HttpPost("logout")]
public IActionResult Logout()
{
    Response.Cookies.Delete("nexus_auth");
    return Ok();
}
```

3. **Update Authentication Middleware** to read from cookie:

```csharp
public class JwtCookieMiddleware
{
    public async Task InvokeAsync(HttpContext context, RequestDelegate next)
    {
        if (context.Request.Cookies.TryGetValue("nexus_auth", out var token))
        {
            context.Request.Headers.Append("Authorization", $"Bearer {token}");
        }
        await next(context);
    }
}
```

4. **Add CSRF Protection** (for state-changing requests):

```csharp
services.AddAntiforgery(options =>
{
    options.HeaderName = "X-CSRF-TOKEN";
    options.Cookie.Name = "nexus_csrf";
    options.Cookie.HttpOnly = false; // Frontend needs to read this
    options.Cookie.SameSite = SameSiteMode.Strict;
});
```

#### Phase 2: Frontend Changes

1. **Update API Client** to work with credentials:

```typescript
// src/lib/api.ts
private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        credentials: 'include', // Include cookies
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });
    // ... rest of implementation
}
```

2. **Remove localStorage token handling**:

```typescript
// Remove these functions
// - getToken()
// - setToken()
// - removeToken()

// Update login to not store token
async login(email: string, password: string, tenantSlug: string): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, tenant_slug: tenantSlug }),
    });

    // Token is now in httpOnly cookie, just store user
    setStoredUser(response.user);
    return response;
}
```

3. **Add CSRF token handling** for POST/PUT/DELETE:

```typescript
function getCsrfToken(): string | null {
    const match = document.cookie.match(/nexus_csrf=([^;]+)/);
    return match ? match[1] : null;
}

private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    // Add CSRF token for state-changing requests
    if (options.method && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method)) {
        const csrfToken = getCsrfToken();
        if (csrfToken) {
            (headers as Record<string, string>)['X-CSRF-TOKEN'] = csrfToken;
        }
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        credentials: 'include',
        headers,
    });
    // ...
}
```

4. **Update Auth Context** to check session via API:

```typescript
// src/contexts/auth-context.tsx
useEffect(() => {
    const initAuth = async () => {
        try {
            // Validate session via API (cookie sent automatically)
            const user = await api.validateToken();
            setUser(user);
        } catch {
            setUser(null);
        }
        setIsLoading(false);
    };

    initAuth();
}, []);
```

#### Phase 3: CORS Configuration

Update backend CORS to allow credentials:

```csharp
services.AddCors(options =>
{
    options.AddPolicy("Frontend", builder =>
    {
        builder
            .WithOrigins("http://localhost:3002", "https://your-domain.com")
            .AllowCredentials() // Required for cookies
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});
```

### Migration Steps

1. **Deploy backend changes first** with both cookie and header authentication support
2. **Update frontend** to use credentials mode
3. **Test thoroughly** in staging environment
4. **Remove localStorage token handling** after verification
5. **Update documentation** and security policies

### Security Checklist

- [ ] Backend sets `HttpOnly` flag on auth cookie
- [ ] Backend sets `Secure` flag (HTTPS only in production)
- [ ] Backend sets `SameSite=Strict` or `SameSite=Lax`
- [ ] Frontend uses `credentials: 'include'` in fetch
- [ ] CSRF token implemented for state-changing requests
- [ ] CORS properly configured with `AllowCredentials`
- [ ] Token refresh mechanism implemented
- [ ] Logout properly clears cookie server-side

### Additional Recommendations

1. **Token Refresh**: Implement refresh tokens with shorter-lived access tokens
2. **Rate Limiting**: Add rate limiting to auth endpoints
3. **Audit Logging**: Log authentication events
4. **Session Management**: Allow users to view/revoke active sessions
5. **2FA Support**: Consider adding two-factor authentication

### Rollback Plan

If issues arise:

1. Backend can fall back to reading Authorization header
2. Frontend can be reverted to localStorage approach
3. Both methods can coexist during transition period

## Timeline Estimate

- Backend changes: 1-2 days
- Frontend changes: 1 day
- Testing: 1-2 days
- Total: 3-5 days

## References

- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [MDN: Using HTTP cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)
- [ASP.NET Core Cookie Authentication](https://docs.microsoft.com/en-us/aspnet/core/security/authentication/cookie)
