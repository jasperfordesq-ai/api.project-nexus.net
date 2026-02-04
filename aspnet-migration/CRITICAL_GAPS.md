# Critical Migration Gaps - Additional Components

This document supplements the main migration plan with components identified during the completeness audit.

## 1. Background Jobs (CRITICAL)

The PHP application has 15+ cron jobs that must be migrated to a background job system.

### Recommended Solution: Hangfire

```csharp
// Program.cs
builder.Services.AddHangfire(config => config
    .UseSimpleAssemblyNameTypeSerializer()
    .UseRecommendedSerializerSettings()
    .UseMySqlStorage(connectionString));

builder.Services.AddHangfireServer();
```

### Jobs to Migrate

| PHP Cron Job | ASP.NET Hangfire Job | Schedule |
|--------------|---------------------|----------|
| `process_newsletter_queue.php` | `NewsletterQueueJob` | Every 5 min |
| `process_recurring_newsletters.php` | `RecurringNewsletterJob` | Every 15 min |
| `send_group_digests.php` | `GroupDigestJob` | Weekly Mon 9am |
| `gamification_cron.php` (daily XP) | `DailyXpAwardsJob` | Daily midnight |
| `gamification_cron.php` (badge check) | `BadgeCheckJob` | Every hour |
| `gamification_cron.php` (challenges) | `ChallengeExpiryJob` | Daily |
| `gamification_cron.php` (leaderboard) | `LeaderboardSnapshotJob` | Daily |
| `abuse_detection_cron.php` | `AbuseDetectionJob` | Hourly |
| `check_balance_alerts.php` | `BalanceAlertJob` | Daily |
| `cleanup_expired_tokens.php` | `TokenCleanupJob` | Daily |
| `send_digest_emails.php` | `DigestEmailJob` | Daily/Weekly |
| `update_trending.php` | `TrendingUpdateJob` | Hourly |
| `sync_federation.php` | `FederationSyncJob` | Every 30 min |

### Job Implementation Pattern

```csharp
// Nexus.Infrastructure/Jobs/NewsletterQueueJob.cs
public class NewsletterQueueJob : IBackgroundJob
{
    private readonly INewsletterService _newsletterService;
    private readonly ILogger<NewsletterQueueJob> _logger;

    public NewsletterQueueJob(
        INewsletterService newsletterService,
        ILogger<NewsletterQueueJob> logger)
    {
        _newsletterService = newsletterService;
        _logger = logger;
    }

    public async Task ExecuteAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Processing newsletter queue...");
        await _newsletterService.ProcessQueueAsync(batchSize: 100, cancellationToken);
    }
}

// Registration in Program.cs
RecurringJob.AddOrUpdate<NewsletterQueueJob>(
    "newsletter-queue",
    job => job.ExecuteAsync(CancellationToken.None),
    "*/5 * * * *"); // Every 5 minutes
```

---

## 2. Real-Time Features (CRITICAL)

### Current PHP Implementation
- **Pusher Channels** for WebSocket communication
- Used for: typing indicators, new messages, notifications, gamification events

### ASP.NET Options

#### Option A: Keep Pusher (Recommended for Migration)
```csharp
// Nexus.Infrastructure/Services/PusherService.cs
public class PusherService : IRealtimeService
{
    private readonly Pusher _pusher;

    public PusherService(IConfiguration config)
    {
        _pusher = new Pusher(
            config["Pusher:AppId"],
            config["Pusher:Key"],
            config["Pusher:Secret"],
            new PusherOptions { Cluster = config["Pusher:Cluster"] });
    }

    public async Task TriggerAsync(string channel, string eventName, object data)
    {
        await _pusher.TriggerAsync(channel, eventName, data);
    }

    public async Task BroadcastToUserAsync(int userId, string eventName, object data)
    {
        await TriggerAsync($"private-user-{userId}", eventName, data);
    }

    public async Task BroadcastTypingAsync(int conversationId, int userId, bool isTyping)
    {
        await TriggerAsync(
            $"presence-conversation-{conversationId}",
            "typing",
            new { userId, isTyping });
    }
}
```

#### Option B: Migrate to SignalR (Long-term)
Requires frontend changes but removes Pusher dependency.

### Channel Structure (Must Match PHP)
```
private-user-{userId}           # User-specific notifications
private-tenant-{tenantId}       # Tenant-wide broadcasts
presence-conversation-{convId}  # Typing indicators, presence
private-group-{groupId}         # Group activity
```

---

## 3. Push Notifications

### Firebase Cloud Messaging (FCM)

```csharp
// Nexus.Infrastructure/Services/FcmPushService.cs
public class FcmPushService : IPushNotificationService
{
    private readonly FirebaseMessaging _messaging;

    public FcmPushService(IConfiguration config)
    {
        var credential = GoogleCredential.FromFile(config["Firebase:ServiceAccountPath"]);
        FirebaseApp.Create(new AppOptions { Credential = credential });
        _messaging = FirebaseMessaging.DefaultInstance;
    }

    public async Task SendAsync(string deviceToken, string title, string body, Dictionary<string, string>? data = null)
    {
        var message = new Message
        {
            Token = deviceToken,
            Notification = new Notification { Title = title, Body = body },
            Data = data
        };

        await _messaging.SendAsync(message);
    }

    public async Task SendBatchAsync(IEnumerable<string> tokens, string title, string body)
    {
        var messages = tokens.Select(token => new Message
        {
            Token = token,
            Notification = new Notification { Title = title, Body = body }
        }).ToList();

        await _messaging.SendAllAsync(messages);
    }
}
```

### Web Push (Browser Notifications)

```csharp
// Using WebPush library
public class WebPushService : IWebPushService
{
    private readonly VapidDetails _vapidDetails;
    private readonly WebPushClient _client;

    public WebPushService(IConfiguration config)
    {
        _vapidDetails = new VapidDetails(
            config["WebPush:Subject"],
            config["WebPush:VapidPublicKey"],
            config["WebPush:VapidPrivateKey"]);
        _client = new WebPushClient();
    }

    public async Task SendAsync(PushSubscription subscription, string payload)
    {
        await _client.SendNotificationAsync(subscription, payload, _vapidDetails);
    }
}
```

---

## 4. WebAuthn (Passkey Authentication)

### Required Package
```xml
<PackageReference Include="Fido2.AspNet" Version="3.0.1" />
```

### Implementation

```csharp
// Nexus.Infrastructure/Identity/WebAuthnService.cs
public class WebAuthnService : IWebAuthnService
{
    private readonly IFido2 _fido2;
    private readonly IWebAuthnCredentialRepository _credentialRepo;

    public WebAuthnService(
        IFido2 fido2,
        IWebAuthnCredentialRepository credentialRepo)
    {
        _fido2 = fido2;
        _credentialRepo = credentialRepo;
    }

    public async Task<CredentialCreateOptions> GetRegistrationOptionsAsync(int userId, string userName, string displayName)
    {
        var user = new Fido2User
        {
            Id = BitConverter.GetBytes(userId),
            Name = userName,
            DisplayName = displayName
        };

        var existingCredentials = await _credentialRepo.GetByUserIdAsync(userId);
        var excludeCredentials = existingCredentials
            .Select(c => new PublicKeyCredentialDescriptor(c.CredentialId))
            .ToList();

        var options = _fido2.RequestNewCredential(
            user,
            excludeCredentials,
            AuthenticatorSelection.Default,
            AttestationConveyancePreference.None);

        return options;
    }

    public async Task<AuthenticatorAssertionRawResponse> GetAuthenticationOptionsAsync(int userId)
    {
        var credentials = await _credentialRepo.GetByUserIdAsync(userId);
        var allowedCredentials = credentials
            .Select(c => new PublicKeyCredentialDescriptor(c.CredentialId))
            .ToList();

        var options = _fido2.GetAssertionOptions(
            allowedCredentials,
            UserVerificationRequirement.Preferred);

        return options;
    }

    public async Task<bool> VerifyRegistrationAsync(
        int userId,
        AuthenticatorAttestationRawResponse response,
        CredentialCreateOptions originalOptions)
    {
        var result = await _fido2.MakeNewCredentialAsync(response, originalOptions, async (args, ct) =>
        {
            // Check credential doesn't already exist
            var existing = await _credentialRepo.GetByCredentialIdAsync(args.CredentialId);
            return existing == null;
        });

        if (result.Status == "ok")
        {
            await _credentialRepo.AddAsync(new WebAuthnCredential
            {
                UserId = userId,
                CredentialId = result.Result.CredentialId,
                PublicKey = result.Result.PublicKey,
                SignCount = result.Result.Counter,
                AaGuid = result.Result.Aaguid.ToString()
            });
            return true;
        }

        return false;
    }
}
```

---

## 5. TOTP (Two-Factor Authentication)

### Required Package
```xml
<PackageReference Include="OtpNet" Version="1.4.0" />
```

### Implementation

```csharp
// Nexus.Infrastructure/Identity/TotpService.cs
public class TotpService : ITotpService
{
    private const int BackupCodeCount = 10;
    private const int BackupCodeLength = 8;

    public string GenerateSecret()
    {
        var key = KeyGeneration.GenerateRandomKey(20);
        return Base32Encoding.ToString(key);
    }

    public string GenerateQrCodeUri(string secret, string email, string issuer = "Project NEXUS")
    {
        return $"otpauth://totp/{Uri.EscapeDataString(issuer)}:{Uri.EscapeDataString(email)}" +
               $"?secret={secret}&issuer={Uri.EscapeDataString(issuer)}";
    }

    public bool VerifyCode(string secret, string code)
    {
        var totp = new Totp(Base32Encoding.ToBytes(secret));
        return totp.VerifyTotp(code, out _, new VerificationWindow(previous: 1, future: 1));
    }

    public List<string> GenerateBackupCodes()
    {
        var codes = new List<string>();
        using var rng = RandomNumberGenerator.Create();

        for (int i = 0; i < BackupCodeCount; i++)
        {
            var bytes = new byte[BackupCodeLength];
            rng.GetBytes(bytes);
            var code = string.Join("", bytes.Select(b => (b % 10).ToString()));
            codes.Add(code);
        }

        return codes;
    }

    public string HashBackupCode(string code)
    {
        return BCrypt.Net.BCrypt.HashPassword(code);
    }

    public bool VerifyBackupCode(string code, string hash)
    {
        return BCrypt.Net.BCrypt.Verify(code, hash);
    }
}
```

---

## 6. AI Integration (Multi-Provider)

### Service Abstraction

```csharp
// Nexus.Application/Common/Interfaces/IAiService.cs
public interface IAiService
{
    Task<string> GenerateCompletionAsync(string prompt, AiOptions? options = null);
    Task<IAsyncEnumerable<string>> StreamCompletionAsync(string prompt, AiOptions? options = null);
}

public record AiOptions(
    string? Model = null,
    float Temperature = 0.7f,
    int MaxTokens = 1000,
    string? SystemPrompt = null);
```

### Provider Implementations

```csharp
// OpenAI
public class OpenAiService : IAiService
{
    private readonly OpenAIClient _client;

    public OpenAiService(IConfiguration config)
    {
        _client = new OpenAIClient(config["OpenAI:ApiKey"]);
    }

    public async Task<string> GenerateCompletionAsync(string prompt, AiOptions? options = null)
    {
        var response = await _client.GetChatCompletionsAsync(
            options?.Model ?? "gpt-4",
            new ChatCompletionsOptions
            {
                Messages = { new ChatMessage(ChatRole.User, prompt) },
                Temperature = options?.Temperature ?? 0.7f,
                MaxTokens = options?.MaxTokens ?? 1000
            });

        return response.Value.Choices[0].Message.Content;
    }
}

// Anthropic Claude
public class AnthropicService : IAiService
{
    private readonly HttpClient _httpClient;
    private readonly string _apiKey;

    public AnthropicService(IConfiguration config, HttpClient httpClient)
    {
        _httpClient = httpClient;
        _apiKey = config["Anthropic:ApiKey"];
    }

    public async Task<string> GenerateCompletionAsync(string prompt, AiOptions? options = null)
    {
        // Implementation using Anthropic API
    }
}

// Google Gemini
public class GeminiService : IAiService
{
    // Implementation using Google.GenerativeAI
}
```

### Factory for Provider Selection

```csharp
public class AiServiceFactory : IAiServiceFactory
{
    private readonly IServiceProvider _serviceProvider;
    private readonly IConfiguration _config;

    public IAiService GetProvider(string? provider = null)
    {
        var selectedProvider = provider ?? _config["AI:DefaultProvider"] ?? "openai";

        return selectedProvider.ToLower() switch
        {
            "openai" => _serviceProvider.GetRequiredService<OpenAiService>(),
            "anthropic" => _serviceProvider.GetRequiredService<AnthropicService>(),
            "gemini" => _serviceProvider.GetRequiredService<GeminiService>(),
            "ollama" => _serviceProvider.GetRequiredService<OllamaService>(),
            _ => throw new ArgumentException($"Unknown AI provider: {selectedProvider}")
        };
    }
}
```

---

## 7. Email Service (Gmail API + SMTP)

### Gmail API Implementation

```csharp
public class GmailApiService : IEmailService
{
    private readonly GmailService _gmail;

    public GmailApiService(IConfiguration config)
    {
        var credential = GoogleCredential.FromJson(config["Gmail:CredentialsJson"])
            .CreateScoped(GmailService.Scope.GmailSend);

        _gmail = new GmailService(new BaseClientService.Initializer
        {
            HttpClientInitializer = credential
        });
    }

    public async Task SendAsync(EmailMessage message)
    {
        var mimeMessage = new MimeMessage();
        mimeMessage.From.Add(new MailboxAddress(message.FromName, message.FromEmail));
        mimeMessage.To.Add(new MailboxAddress(message.ToName, message.ToEmail));
        mimeMessage.Subject = message.Subject;
        mimeMessage.Body = new TextPart("html") { Text = message.HtmlBody };

        using var stream = new MemoryStream();
        await mimeMessage.WriteToAsync(stream);
        var raw = Convert.ToBase64String(stream.ToArray())
            .Replace('+', '-')
            .Replace('/', '_')
            .Replace("=", "");

        var gmailMessage = new Message { Raw = raw };
        await _gmail.Users.Messages.Send(gmailMessage, "me").ExecuteAsync();
    }
}
```

### SMTP Fallback

```csharp
public class SmtpEmailService : IEmailService
{
    private readonly SmtpClient _client;
    private readonly IConfiguration _config;

    public async Task SendAsync(EmailMessage message)
    {
        using var client = new SmtpClient();
        await client.ConnectAsync(
            _config["Smtp:Host"],
            int.Parse(_config["Smtp:Port"]),
            SecureSocketOptions.StartTls);

        await client.AuthenticateAsync(
            _config["Smtp:Username"],
            _config["Smtp:Password"]);

        var mimeMessage = CreateMimeMessage(message);
        await client.SendAsync(mimeMessage);
        await client.DisconnectAsync(true);
    }
}
```

---

## 8. Federation (Inter-Community Communication)

### Federation JWT Service

```csharp
public class FederationJwtService : IFederationJwtService
{
    private readonly string _signingKey;

    public FederationJwtService(IConfiguration config)
    {
        _signingKey = config["Federation:JwtSecret"];
    }

    public string GenerateFederationToken(int partnerId, int tenantId, string[] scopes)
    {
        var claims = new[]
        {
            new Claim("partner_id", partnerId.ToString()),
            new Claim("tenant_id", tenantId.ToString()),
            new Claim("scopes", string.Join(",", scopes)),
            new Claim("type", "federation")
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_signingKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: "nexus-federation",
            audience: "nexus-partner",
            claims: claims,
            expires: DateTime.UtcNow.AddHours(1),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public ClaimsPrincipal? ValidateFederationToken(string token)
    {
        var handler = new JwtSecurityTokenHandler();
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_signingKey));

        try
        {
            return handler.ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = key,
                ValidateIssuer = true,
                ValidIssuer = "nexus-federation",
                ValidateAudience = true,
                ValidAudience = "nexus-partner",
                ValidateLifetime = true
            }, out _);
        }
        catch
        {
            return null;
        }
    }
}
```

---

## 9. GDPR Compliance Module

### Data Export Service

```csharp
public class GdprExportService : IGdprExportService
{
    private readonly NexusDbContext _context;

    public async Task<GdprExportData> ExportUserDataAsync(int userId)
    {
        var user = await _context.Users
            .Include(u => u.Listings)
            .Include(u => u.SentTransactions)
            .Include(u => u.ReceivedTransactions)
            .Include(u => u.Posts)
            .Include(u => u.Badges)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null) throw new NotFoundException("User", userId);

        return new GdprExportData
        {
            PersonalInfo = MapPersonalInfo(user),
            Listings = user.Listings.Select(MapListing).ToList(),
            Transactions = user.SentTransactions
                .Concat(user.ReceivedTransactions)
                .Select(MapTransaction).ToList(),
            Posts = user.Posts.Select(MapPost).ToList(),
            Badges = user.Badges.Select(MapBadge).ToList(),
            ExportedAt = DateTime.UtcNow
        };
    }

    public async Task AnonymizeUserAsync(int userId)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null) throw new NotFoundException("User", userId);

        // Anonymize personal data
        user.Email = $"deleted-{user.Id}@anonymized.local";
        user.FirstName = "Deleted";
        user.LastName = "User";
        user.Username = null;
        user.Avatar = null;
        user.Bio = null;
        user.Phone = null;
        user.Location = null;
        user.Latitude = null;
        user.Longitude = null;
        user.Skills = null;
        user.Interests = null;
        user.AnonymizedAt = DateTime.UtcNow;
        user.DeletedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
    }
}
```

---

## 10. File Upload with WebP Conversion

### Required Package
```xml
<PackageReference Include="SixLabors.ImageSharp" Version="3.1.2" />
```

### Implementation

```csharp
public class FileUploadService : IFileUploadService
{
    private readonly string _uploadPath;
    private readonly ILogger<FileUploadService> _logger;

    public async Task<UploadResult> UploadImageAsync(IFormFile file, string subDirectory = "uploads")
    {
        // Validate
        var allowedTypes = new[] { "image/jpeg", "image/png", "image/gif", "image/webp" };
        if (!allowedTypes.Contains(file.ContentType))
        {
            return UploadResult.Fail("Invalid file type");
        }

        // Generate safe filename
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        var safeFileName = $"{timestamp}_{Guid.NewGuid():N}{Path.GetExtension(file.FileName)}";
        var relativePath = Path.Combine(subDirectory, safeFileName);
        var fullPath = Path.Combine(_uploadPath, relativePath);

        // Ensure directory exists
        Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);

        // Save original
        using (var stream = new FileStream(fullPath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        // Convert to WebP
        var webpResult = await ConvertToWebPAsync(fullPath);

        return new UploadResult
        {
            Success = true,
            OriginalPath = relativePath,
            WebPPath = webpResult.Path,
            OriginalSize = file.Length,
            WebPSize = webpResult.Size,
            SavingsPercent = webpResult.SavingsPercent
        };
    }

    private async Task<WebPConversionResult> ConvertToWebPAsync(string sourcePath)
    {
        var webpPath = Path.ChangeExtension(sourcePath, ".webp");

        using var image = await Image.LoadAsync(sourcePath);
        await image.SaveAsWebpAsync(webpPath, new WebpEncoder { Quality = 80 });

        var originalSize = new FileInfo(sourcePath).Length;
        var webpSize = new FileInfo(webpPath).Length;

        return new WebPConversionResult
        {
            Path = webpPath,
            Size = webpSize,
            SavingsPercent = (int)((1 - (double)webpSize / originalSize) * 100)
        };
    }
}
```

---

## Updated NuGet Packages

Add these to `Nexus.Infrastructure.csproj`:

```xml
<!-- Background Jobs -->
<PackageReference Include="Hangfire.Core" Version="1.8.6" />
<PackageReference Include="Hangfire.AspNetCore" Version="1.8.6" />
<PackageReference Include="Hangfire.MySqlStorage" Version="2.0.3" />

<!-- Authentication -->
<PackageReference Include="Fido2.AspNet" Version="3.0.1" />
<PackageReference Include="OtpNet" Version="1.4.0" />
<PackageReference Include="BCrypt.Net-Next" Version="4.0.3" />

<!-- Push Notifications -->
<PackageReference Include="FirebaseAdmin" Version="2.4.0" />
<PackageReference Include="WebPush" Version="1.0.9" />

<!-- AI Providers -->
<PackageReference Include="Azure.AI.OpenAI" Version="1.0.0-beta.12" />
<PackageReference Include="Google.Cloud.AIPlatform.V1" Version="2.22.0" />

<!-- Email -->
<PackageReference Include="Google.Apis.Gmail.v1" Version="1.64.0" />
<PackageReference Include="MailKit" Version="4.3.0" />

<!-- Image Processing -->
<PackageReference Include="SixLabors.ImageSharp" Version="3.1.2" />

<!-- Real-time -->
<PackageReference Include="PusherServer" Version="5.0.0" />
```

---

## Revised Timeline Impact

| Component | Added Effort | Phase |
|-----------|--------------|-------|
| Hangfire setup + 15 jobs | +1 week | Phase 0 |
| WebAuthn + TOTP | +1 week | Phase 1 |
| Push notifications (FCM/WebPush) | +0.5 week | Phase 9 |
| AI multi-provider | +1 week | Phase 10 |
| GDPR compliance | +1 week | Phase 10 |
| File upload + WebP | +0.5 week | Phase 2 |

**Revised Total**: ~31 weeks (8 months) with 2-3 developers
