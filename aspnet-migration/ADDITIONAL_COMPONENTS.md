# Additional Components - Final Completeness Check

This document covers components identified in the final audit that supplement the main migration plan.

---

## 1. Social Authentication (OAuth)

### Current Implementation

| Provider | Status | Files |
|----------|--------|-------|
| Google OAuth | ✅ Implemented | `SocialAuthController.php`, `SocialAuthService.php` |
| Facebook OAuth | ✅ Implemented | `SocialAuthController.php`, `SocialAuthService.php` |
| Apple Sign-In | ❌ Not implemented | Env vars exist but no code |

### Environment Variables
```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
FACEBOOK_REDIRECT_URI=

# Apple - NOT YET IMPLEMENTED
APPLE_CLIENT_ID=
APPLE_TEAM_ID=
APPLE_KEY_ID=
APPLE_PRIVATE_KEY=
```

### ASP.NET Core Implementation

```csharp
// Program.cs
builder.Services.AddAuthentication()
    .AddGoogle(options =>
    {
        options.ClientId = config["Google:ClientId"];
        options.ClientSecret = config["Google:ClientSecret"];
    })
    .AddFacebook(options =>
    {
        options.AppId = config["Facebook:AppId"];
        options.AppSecret = config["Facebook:AppSecret"];
    });
```

---

## 2. Federation API Authentication (Multi-Method)

The federation API supports THREE authentication methods for partner integrations.

### Method 1: HMAC-SHA256 Signing (Highest Security)

```
Headers:
- X-Federation-Signature: HMAC-SHA256(method + path + timestamp + body)
- X-Federation-Timestamp: ISO 8601 or Unix timestamp
- X-Federation-Platform-ID: Partner identifier

Validation:
- Timestamp within 5 minutes (prevents replay attacks)
- Signature verified with timing-safe comparison
```

### Method 2: JWT Bearer Token

```
Header: Authorization: Bearer <jwt>

Claims:
- partner_id
- tenant_id
- scopes (array of permissions)
- exp, iat, iss
```

### Method 3: API Key (Simple)

```
Locations checked (in order):
1. Authorization: Bearer <key>
2. X-API-Key header
3. ?api_key=<key> query param (testing only)

Storage: SHA256 hash in federation_api_keys table
```

### ASP.NET Core Implementation

```csharp
// Custom authentication handler supporting all three methods
public class FederationAuthenticationHandler : AuthenticationHandler<FederationAuthOptions>
{
    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        // Try HMAC first
        if (TryValidateHmac(out var hmacResult))
            return hmacResult;

        // Try JWT
        if (TryValidateJwt(out var jwtResult))
            return jwtResult;

        // Try API Key
        if (TryValidateApiKey(out var apiKeyResult))
            return apiKeyResult;

        return AuthenticateResult.NoResult();
    }
}
```

---

## 3. Hierarchical Multi-Tenant Access Control

### Tenant Hierarchy Structure

```
Master Tenant (id=1, path="/1/")
├── Regional Tenant A (id=2, path="/1/2/")
│   ├── Local Tenant X (id=5, path="/1/2/5/")
│   └── Local Tenant Y (id=6, path="/1/2/6/")
└── Regional Tenant B (id=3, path="/1/3/")
    └── Local Tenant Z (id=7, path="/1/3/7/")
```

### Access Rules

| User Type | Can Access |
|-----------|------------|
| God (is_god=1) | ALL tenants |
| Super Admin (Master) | ALL tenants |
| Super Admin (Regional) | Own tenant + descendants only |
| Tenant Admin | Own tenant only |

### Database Query Pattern

```sql
-- User in tenant 2 can see tenants with paths starting with "/1/2/"
SELECT * FROM tenants
WHERE path LIKE '/1/2/%'
   OR id = 2
```

### ASP.NET Core Implementation

```csharp
public class TenantHierarchyService : ITenantHierarchyService
{
    public async Task<bool> CanAccessTenantAsync(int userId, int targetTenantId)
    {
        var user = await _context.Users.FindAsync(userId);

        // God users bypass all checks
        if (user.IsGod) return true;

        // Super admin at master tenant can access all
        if (user.IsSuperAdmin && user.TenantId == 1) return true;

        // Regional super admin can access subtree
        if (user.IsTenantSuperAdmin)
        {
            var userTenant = await _context.Tenants.FindAsync(user.TenantId);
            var targetTenant = await _context.Tenants.FindAsync(targetTenantId);

            return targetTenant.Path.StartsWith(userTenant.Path);
        }

        // Regular users can only access their own tenant
        return user.TenantId == targetTenantId;
    }
}
```

---

## 4. Dual Theme System

### Theme Configuration

| Theme | Directory | Design System | Accessibility |
|-------|-----------|---------------|---------------|
| `modern` | `views/modern/` | Custom responsive | Standard |
| `civicone` | `views/civicone/` | GOV.UK Frontend | WCAG 2.1 AA |

### Theme Selection

```php
// PHP: Theme stored in user preferences and session
$theme = $_SESSION['nexus_active_layout'] ?? $user['preferred_layout'] ?? 'modern';
```

### ASP.NET Core Implementation

```csharp
// Theme selection middleware
public class ThemeMiddleware
{
    public async Task InvokeAsync(HttpContext context, ICurrentUserService currentUser)
    {
        var theme = currentUser.PreferredLayout ?? "modern";
        context.Items["Theme"] = theme;

        // Set view location expander for theme-specific views
        var viewLocationExpander = context.RequestServices
            .GetRequiredService<IViewLocationExpander>();
        viewLocationExpander.SetTheme(theme);

        await _next(context);
    }
}

// View location expander
public class ThemeViewLocationExpander : IViewLocationExpander
{
    public IEnumerable<string> ExpandViewLocations(
        ViewLocationExpanderContext context,
        IEnumerable<string> viewLocations)
    {
        var theme = context.ActionContext.HttpContext.Items["Theme"] as string ?? "modern";

        foreach (var location in viewLocations)
        {
            yield return location.Replace("/Views/", $"/Views/{theme}/");
        }
    }
}
```

---

## 5. AI Provider Abstraction

### Supported Providers

| Provider | Model | Use Case |
|----------|-------|----------|
| Google Gemini | gemini-1.5-flash | Default (fast, cost-effective) |
| OpenAI | gpt-4, gpt-3.5-turbo | Alternative (high quality) |
| Anthropic | claude-3-sonnet | Alternative (reasoning) |
| Ollama | llama3, mistral | Self-hosted (privacy) |

### Configuration (from `src/Config/ai.php`)

```php
return [
    'default_provider' => env('AI_DEFAULT_PROVIDER', 'gemini'),
    'providers' => [
        'gemini' => [
            'api_key' => env('GEMINI_API_KEY'),
            'model' => 'gemini-1.5-flash',
            'temperature' => 0.7,
        ],
        'openai' => [
            'api_key' => env('OPENAI_API_KEY'),
            'model' => 'gpt-4',
            'temperature' => 0.7,
        ],
        // ...
    ],
    'system_prompt' => "You are a helpful assistant for a timebanking community...",
];
```

### ASP.NET Core Implementation

```csharp
// Provider interface
public interface IAiProvider
{
    string ProviderName { get; }
    Task<string> GenerateAsync(string prompt, AiOptions options);
    IAsyncEnumerable<string> StreamAsync(string prompt, AiOptions options);
}

// Factory for provider selection
public class AiProviderFactory : IAiProviderFactory
{
    private readonly IServiceProvider _services;
    private readonly IConfiguration _config;

    public IAiProvider GetProvider(string? providerName = null)
    {
        var name = providerName ?? _config["AI:DefaultProvider"] ?? "gemini";

        return name.ToLower() switch
        {
            "gemini" => _services.GetRequiredService<GeminiProvider>(),
            "openai" => _services.GetRequiredService<OpenAiProvider>(),
            "anthropic" => _services.GetRequiredService<AnthropicProvider>(),
            "ollama" => _services.GetRequiredService<OllamaProvider>(),
            _ => throw new ArgumentException($"Unknown provider: {name}")
        };
    }
}
```

---

## 6. Email Digest System

### Digest Types

| Type | Schedule | Template |
|------|----------|----------|
| Weekly Digest | Monday 9am | `views/emails/weekly_digest.php` |
| Match Notifications | Real-time | `views/emails/match_hot.php`, `match_mutual.php` |
| Group Digests | Weekly | Generated by `send_group_digests.php` |
| Balance Alerts | Daily | Generated by `check_balance_alerts.php` |

### Email Configuration

```env
# Primary: Gmail API (OAuth2)
USE_GMAIL_API=true
GMAIL_CLIENT_ID=
GMAIL_CLIENT_SECRET=
GMAIL_REFRESH_TOKEN=

# Fallback: SMTP
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_ENCRYPTION=tls

# Recipients
ADMIN_EMAIL=admin@project-nexus.ie
ERROR_ALERT_EMAIL=errors@project-nexus.ie
```

### ASP.NET Core Implementation

```csharp
// Email service with Gmail API primary, SMTP fallback
public class EmailService : IEmailService
{
    private readonly IGmailApiService _gmailApi;
    private readonly ISmtpService _smtp;
    private readonly IConfiguration _config;

    public async Task SendAsync(EmailMessage message)
    {
        if (_config.GetValue<bool>("Email:UseGmailApi"))
        {
            try
            {
                await _gmailApi.SendAsync(message);
                return;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Gmail API failed, falling back to SMTP");
            }
        }

        await _smtp.SendAsync(message);
    }
}
```

---

## 7. Cron Job Architecture

### HTTP-Triggered Cron System

The PHP application uses HTTP-triggered cron jobs, not a queue system.

```
External cron (every minute):
  curl -H "X-Cron-Key: {CRON_KEY}" https://project-nexus.ie/cron/run
```

### Job Registry

| Job | Trigger | Purpose |
|-----|---------|---------|
| `abuse_detection` | Hourly | Detect suspicious activity patterns |
| `gamification_daily` | Daily midnight | Process daily XP awards, badge checks |
| `gamification_hourly` | Hourly | Update streaks, check challenges |
| `newsletter_queue` | Every 5 min | Send queued newsletters |
| `recurring_newsletters` | Every 15 min | Process recurring newsletter schedules |
| `group_digests` | Weekly Mon 9am | Send group activity digests |
| `balance_alerts` | Daily | Notify users of low balances |
| `token_cleanup` | Daily | Remove expired revoked tokens |

### ASP.NET Core Implementation (Hangfire)

```csharp
// Program.cs
builder.Services.AddHangfire(config => config
    .UseMySqlStorage(connectionString));

builder.Services.AddHangfireServer();

// Job registration
app.UseHangfireDashboard("/hangfire");

RecurringJob.AddOrUpdate<IAbuseDetectionJob>(
    "abuse-detection",
    job => job.ExecuteAsync(),
    Cron.Hourly);

RecurringJob.AddOrUpdate<IGamificationJob>(
    "gamification-daily",
    job => job.ProcessDailyAsync(),
    Cron.Daily);

RecurringJob.AddOrUpdate<INewsletterJob>(
    "newsletter-queue",
    job => job.ProcessQueueAsync(),
    "*/5 * * * *");

RecurringJob.AddOrUpdate<IGroupDigestJob>(
    "group-digests",
    job => job.SendDigestsAsync(),
    Cron.Weekly(DayOfWeek.Monday, 9));
```

---

## 8. Environment Variables Checklist

### Required for Migration

```env
# Database
DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=nexus
DB_USERNAME=root
DB_PASSWORD=

# Cache
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# Authentication
APP_KEY=                    # CRITICAL: Must match for JWT compatibility
JWT_SECRET=                 # Alternative JWT key

# Real-time
PUSHER_APP_ID=
PUSHER_KEY=
PUSHER_SECRET=
PUSHER_CLUSTER=eu

# Push Notifications
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
FCM_PROJECT_ID=
FCM_SERVICE_ACCOUNT_PATH=

# Email
USE_GMAIL_API=true
GMAIL_CLIENT_ID=
GMAIL_CLIENT_SECRET=
GMAIL_REFRESH_TOKEN=

# AI (at least one)
GEMINI_API_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# Federation
FEDERATION_JWT_SECRET=

# Background Jobs
CRON_KEY=                   # For HTTP-triggered cron (legacy)
```

### Optional

```env
# Social Auth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=

# Mailchimp
MAILCHIMP_API_KEY=
MAILCHIMP_LIST_ID=

# HashiCorp Vault
VAULT_ENABLED=false
VAULT_ADDR=
VAULT_TOKEN=
```

---

## 9. Items NOT Requiring Migration

The following were explicitly checked and confirmed NOT present:

| Item | Status | Notes |
|------|--------|-------|
| Payment Processing | ❌ Not present | Timebanking uses time credits only |
| Stripe/PayPal | ❌ Not present | No payment gateway integration |
| CSV/Excel Import | ❌ Minimal | Only basic admin bulk ops |
| PDF Generation | ❌ Minimal | Only volunteer certificates |
| Async Queue (Redis) | ❌ Not used | Cron-based instead |
| Direct WebSocket | ❌ Not used | Pusher handles real-time |
| Apple Sign-In | ❌ Not implemented | Env vars exist but no code |

---

## Summary Checklist

### Must Have Before Migration

- [x] JWT token compatibility documented
- [x] Multi-tenant query filters documented
- [x] All 48 API controllers listed
- [x] Database schema mapped
- [x] Authentication flow documented
- [x] Background job migration planned (Hangfire)
- [x] Real-time strategy defined (keep Pusher)
- [x] WebAuthn/TOTP documented
- [x] Federation auth documented
- [x] Tenant hierarchy documented
- [x] Theme system documented
- [x] AI provider abstraction documented
- [x] Email system documented
- [x] Social OAuth documented

### Nice to Have

- [ ] Apple Sign-In implementation
- [ ] Menu manager migration (beta feature)
- [ ] PDF generation improvements
- [ ] CSV export functionality
