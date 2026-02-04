# Security, Compliance & Enterprise Features

## 1. HTML Sanitizer (SECURITY-CRITICAL)

### Purpose
Whitelist-based HTML sanitization for page builder/CMS content to prevent XSS attacks.

### PHP Implementation

**File**: `src/Core/HtmlSanitizer.php`

```php
class HtmlSanitizer
{
    // Allowed tags whitelist
    private static $allowedTags = [
        'div', 'span', 'p', 'br', 'hr',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'strong', 'em', 'b', 'i', 'u', 's', 'mark', 'small',
        'a', 'img', 'video', 'audio', 'source', 'iframe',
        'ul', 'ol', 'li', 'dl', 'dt', 'dd',
        'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
        'form', 'input', 'textarea', 'select', 'option', 'button', 'label',
        'blockquote', 'pre', 'code', 'figure', 'figcaption'
    ];

    // Dangerous URL schemes blocked
    private static $blockedSchemes = ['javascript:', 'vbscript:', 'data:'];

    public static function sanitize($html, $allowDataUrls = false)
    {
        // Disable external entity loading (XXE prevention)
        libxml_disable_entity_loader(true);

        $dom = new DOMDocument();
        @$dom->loadHTML('<?xml encoding="UTF-8">' . $html, LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);

        self::walkNodes($dom, $allowDataUrls);

        return $dom->saveHTML();
    }

    private static function walkNodes($node, $allowDataUrls)
    {
        // Remove disallowed tags
        // Sanitize URLs in href/src
        // Strip dangerous CSS (expression, javascript, etc.)
    }

    public static function excerpt($html, $length = 160)
    {
        $text = strip_tags($html);
        if (strlen($text) <= $length) return $text;
        return substr($text, 0, strrpos(substr($text, 0, $length), ' ')) . '...';
    }
}
```

### ASP.NET Core Implementation

```csharp
// Install: HtmlSanitizer NuGet package
using Ganss.Xss;

public class HtmlSanitizerService : IHtmlSanitizer
{
    private readonly HtmlSanitizer _sanitizer;

    public HtmlSanitizerService()
    {
        _sanitizer = new HtmlSanitizer();

        // Configure allowed tags
        _sanitizer.AllowedTags.Clear();
        foreach (var tag in AllowedTags)
        {
            _sanitizer.AllowedTags.Add(tag);
        }

        // Configure allowed attributes
        _sanitizer.AllowedAttributes.Add("class");
        _sanitizer.AllowedAttributes.Add("id");
        _sanitizer.AllowedAttributes.Add("href");
        _sanitizer.AllowedAttributes.Add("src");
        _sanitizer.AllowedAttributes.Add("alt");
        _sanitizer.AllowedAttributes.Add("title");

        // Block dangerous URL schemes
        _sanitizer.AllowedSchemes.Clear();
        _sanitizer.AllowedSchemes.Add("http");
        _sanitizer.AllowedSchemes.Add("https");
        _sanitizer.AllowedSchemes.Add("mailto");
    }

    private static readonly string[] AllowedTags =
    {
        "div", "span", "p", "br", "hr",
        "h1", "h2", "h3", "h4", "h5", "h6",
        "strong", "em", "b", "i", "u", "s", "mark", "small",
        "a", "img", "video", "audio", "source", "iframe",
        "ul", "ol", "li", "dl", "dt", "dd",
        "table", "thead", "tbody", "tfoot", "tr", "th", "td",
        "blockquote", "pre", "code", "figure", "figcaption"
    };

    public string Sanitize(string html, bool allowDataUrls = false)
    {
        if (allowDataUrls)
        {
            _sanitizer.AllowedSchemes.Add("data");
        }

        var result = _sanitizer.Sanitize(html);

        if (allowDataUrls)
        {
            _sanitizer.AllowedSchemes.Remove("data");
        }

        return result;
    }

    public string Excerpt(string html, int length = 160)
    {
        var text = Regex.Replace(html, "<[^>]+>", "");
        if (text.Length <= length) return text;

        var truncated = text[..length];
        var lastSpace = truncated.LastIndexOf(' ');
        return (lastSpace > 0 ? truncated[..lastSpace] : truncated) + "...";
    }
}
```

---

## 2. Database Wrapper - Tenant Isolation (SECURITY-CRITICAL)

### Purpose
Automatically injects `tenant_id` filter into all queries to prevent cross-tenant data leaks.

### PHP Implementation

**File**: `src/Core/DatabaseWrapper.php`

```php
class DatabaseWrapper
{
    private $tenantId;
    private $pdo;

    public function query($sql, $params = [])
    {
        // Auto-inject tenant_id for SELECT/UPDATE/DELETE
        if ($this->shouldInjectTenant($sql)) {
            $sql = $this->injectTenantFilter($sql);
            $params[] = $this->tenantId;
        }

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt;
    }

    private function shouldInjectTenant($sql)
    {
        $sql = strtoupper(trim($sql));
        return preg_match('/^(SELECT|UPDATE|DELETE)/', $sql)
            && !preg_match('/tenant_id/', $sql);
    }

    private function injectTenantFilter($sql)
    {
        // Insert "AND tenant_id = ?" or "WHERE tenant_id = ?"
        if (stripos($sql, 'WHERE') !== false) {
            return preg_replace('/WHERE/i', 'WHERE tenant_id = ? AND', $sql, 1);
        } else {
            // Insert before ORDER BY, GROUP BY, LIMIT, or at end
            return preg_replace('/(ORDER BY|GROUP BY|LIMIT|$)/i', ' WHERE tenant_id = ? $1', $sql, 1);
        }
    }
}
```

### ASP.NET Core Implementation

EF Core global query filters handle this automatically:

```csharp
// NexusDbContext.cs
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    // Apply tenant filter to ALL tenant-scoped entities
    foreach (var entityType in modelBuilder.Model.GetEntityTypes())
    {
        if (typeof(ITenantEntity).IsAssignableFrom(entityType.ClrType))
        {
            modelBuilder.Entity(entityType.ClrType)
                .HasQueryFilter(CreateTenantFilter(entityType.ClrType));
        }
    }
}

private LambdaExpression CreateTenantFilter(Type entityType)
{
    var parameter = Expression.Parameter(entityType, "e");
    var tenantProperty = Expression.Property(parameter, nameof(ITenantEntity.TenantId));
    var tenantValue = Expression.Property(
        Expression.Constant(_tenantService),
        nameof(ICurrentTenantService.TenantId));
    var filter = Expression.Equal(tenantProperty, tenantValue);
    return Expression.Lambda(filter, parameter);
}
```

---

## 3. Abuse Detection Service (FRAUD PREVENTION)

### Purpose
Automated detection of suspicious transaction patterns and fraud.

### PHP Implementation

**File**: `src/Services/AbuseDetectionService.php`

```php
class AbuseDetectionService
{
    // Detection thresholds
    const LARGE_TRANSFER_THRESHOLD = 50;  // hours
    const HIGH_VELOCITY_THRESHOLD = 10;    // transactions per hour
    const INACTIVE_DAYS_THRESHOLD = 90;

    public static function runAllChecks($tenantId = null)
    {
        $alerts = [];

        $alerts = array_merge($alerts, self::checkLargeTransfers($tenantId));
        $alerts = array_merge($alerts, self::checkHighVelocity($tenantId));
        $alerts = array_merge($alerts, self::checkCircularTransfers($tenantId));
        $alerts = array_merge($alerts, self::checkInactiveHighBalance($tenantId));

        foreach ($alerts as $alert) {
            self::createAlert($alert);
        }

        return $alerts;
    }

    // Large single transfer (possible collusion or theft)
    public static function checkLargeTransfers($tenantId)
    {
        $threshold = self::LARGE_TRANSFER_THRESHOLD;
        $sql = "SELECT * FROM transactions
                WHERE tenant_id = ? AND amount >= ?
                AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)";
        // ...
    }

    // Many transactions in short time (automated abuse)
    public static function checkHighVelocity($tenantId)
    {
        $sql = "SELECT sender_id, COUNT(*) as count
                FROM transactions
                WHERE tenant_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
                GROUP BY sender_id
                HAVING count >= ?";
        // ...
    }

    // A sends to B, B sends back to A (washing)
    public static function checkCircularTransfers($tenantId)
    {
        $sql = "SELECT t1.sender_id, t1.receiver_id, t1.amount
                FROM transactions t1
                JOIN transactions t2 ON t1.sender_id = t2.receiver_id
                    AND t1.receiver_id = t2.sender_id
                WHERE t1.tenant_id = ?
                AND t1.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                AND t2.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
        // ...
    }

    // Dormant account suddenly active with high balance
    public static function checkInactiveHighBalance($tenantId)
    {
        $sql = "SELECT u.id, u.balance, u.last_login_at
                FROM users u
                WHERE u.tenant_id = ?
                AND u.balance > 20
                AND u.last_login_at < DATE_SUB(NOW(), INTERVAL ? DAY)";
        // ...
    }
}
```

### ASP.NET Core Implementation

```csharp
public class AbuseDetectionService : IAbuseDetectionService
{
    private readonly NexusDbContext _context;
    private readonly ICurrentTenantService _tenant;
    private readonly ILogger<AbuseDetectionService> _logger;

    private const decimal LargeTransferThreshold = 50;
    private const int HighVelocityThreshold = 10;
    private const int InactiveDaysThreshold = 90;

    public async Task<List<AbuseAlert>> RunAllChecksAsync()
    {
        var alerts = new List<AbuseAlert>();
        var tenantId = _tenant.TenantId;

        alerts.AddRange(await CheckLargeTransfersAsync(tenantId));
        alerts.AddRange(await CheckHighVelocityAsync(tenantId));
        alerts.AddRange(await CheckCircularTransfersAsync(tenantId));
        alerts.AddRange(await CheckInactiveHighBalanceAsync(tenantId));

        foreach (var alert in alerts)
        {
            _context.AbuseAlerts.Add(alert);
        }
        await _context.SaveChangesAsync();

        return alerts;
    }

    private async Task<List<AbuseAlert>> CheckLargeTransfersAsync(int tenantId)
    {
        var since = DateTime.UtcNow.AddHours(-24);

        var largeTransfers = await _context.Transactions
            .Where(t => t.TenantId == tenantId
                && t.Amount >= LargeTransferThreshold
                && t.CreatedAt >= since)
            .Select(t => new AbuseAlert
            {
                TenantId = tenantId,
                Type = "large_transfer",
                Severity = "high",
                UserId = t.SenderId,
                Details = $"Transfer of {t.Amount} hours to user {t.ReceiverId}",
                TransactionId = t.Id,
                CreatedAt = DateTime.UtcNow
            })
            .ToListAsync();

        return largeTransfers;
    }

    private async Task<List<AbuseAlert>> CheckCircularTransfersAsync(int tenantId)
    {
        var since = DateTime.UtcNow.AddDays(-7);

        // Find A→B and B→A patterns
        var circular = await _context.Transactions
            .Where(t1 => t1.TenantId == tenantId && t1.CreatedAt >= since)
            .Join(_context.Transactions.Where(t2 => t2.TenantId == tenantId && t2.CreatedAt >= since),
                t1 => new { S = t1.SenderId, R = t1.ReceiverId },
                t2 => new { S = t2.ReceiverId, R = t2.SenderId },
                (t1, t2) => new { t1, t2 })
            .Select(x => new AbuseAlert
            {
                TenantId = tenantId,
                Type = "circular_transfer",
                Severity = "medium",
                UserId = x.t1.SenderId,
                Details = $"Circular transfer detected: {x.t1.SenderId} ↔ {x.t1.ReceiverId}",
                CreatedAt = DateTime.UtcNow
            })
            .Distinct()
            .ToListAsync();

        return circular;
    }
}

// Background job for scheduled abuse detection
public class AbuseDetectionJob : IBackgroundJob
{
    public async Task ExecuteAsync(CancellationToken ct)
    {
        await _abuseService.RunAllChecksAsync();
    }
}

// Register in Hangfire
RecurringJob.AddOrUpdate<AbuseDetectionJob>(
    "abuse-detection",
    job => job.ExecuteAsync(CancellationToken.None),
    Cron.Hourly);
```

---

## 4. Legal Document Service (GDPR Compliance)

### Purpose
Version-controlled legal documents with acceptance tracking for regulatory compliance.

### PHP Implementation

**File**: `src/Services/LegalDocumentService.php`

```php
class LegalDocumentService
{
    const TYPES = [
        'terms' => 'Terms of Service',
        'privacy' => 'Privacy Policy',
        'cookies' => 'Cookie Policy',
        'accessibility' => 'Accessibility Statement',
        'community' => 'Community Guidelines',
        'acceptable_use' => 'Acceptable Use Policy'
    ];

    const ACCEPTANCE_METHODS = [
        'registration',    // During signup
        'login_prompt',    // Forced on login
        'settings',        // User manually agreed
        'api',             // Via API
        'forced_update'    // Required after policy change
    ];

    public static function getByType($type, $tenantId = null)
    {
        $tenantId = $tenantId ?? TenantContext::getId();

        return Database::query(
            "SELECT * FROM legal_documents
             WHERE tenant_id = ? AND type = ? AND is_active = 1
             ORDER BY version DESC LIMIT 1",
            [$tenantId, $type]
        )->fetch();
    }

    public static function recordAcceptance($userId, $documentId, $method, $ipAddress = null)
    {
        Database::query(
            "INSERT INTO legal_acceptances
             (user_id, document_id, method, ip_address, user_agent, accepted_at)
             VALUES (?, ?, ?, ?, ?, NOW())",
            [$userId, $documentId, $method, $ipAddress, $_SERVER['HTTP_USER_AGENT'] ?? null]
        );
    }

    public static function getAcceptanceStatus($userId, $type = null)
    {
        // Check if user has accepted the latest version of each document
        $sql = "SELECT ld.type, ld.version, la.accepted_at
                FROM legal_documents ld
                LEFT JOIN legal_acceptances la ON la.document_id = ld.id AND la.user_id = ?
                WHERE ld.is_active = 1
                AND ld.tenant_id = ?";

        if ($type) {
            $sql .= " AND ld.type = ?";
        }

        // Returns which documents need acceptance
    }

    public static function requiresAcceptance($userId)
    {
        // Returns true if any legal document has been updated since last acceptance
    }
}
```

### ASP.NET Core Implementation

```csharp
public class LegalDocumentService : ILegalDocumentService
{
    private readonly NexusDbContext _context;
    private readonly ICurrentTenantService _tenant;
    private readonly IHttpContextAccessor _httpContext;

    public async Task<LegalDocument?> GetByTypeAsync(string type)
    {
        return await _context.LegalDocuments
            .Where(d => d.TenantId == _tenant.TenantId
                && d.Type == type
                && d.IsActive)
            .OrderByDescending(d => d.Version)
            .FirstOrDefaultAsync();
    }

    public async Task RecordAcceptanceAsync(int userId, int documentId, string method)
    {
        var acceptance = new LegalAcceptance
        {
            UserId = userId,
            DocumentId = documentId,
            Method = method,
            IpAddress = _httpContext.HttpContext?.Connection.RemoteIpAddress?.ToString(),
            UserAgent = _httpContext.HttpContext?.Request.Headers.UserAgent.ToString(),
            AcceptedAt = DateTime.UtcNow
        };

        _context.LegalAcceptances.Add(acceptance);
        await _context.SaveChangesAsync();
    }

    public async Task<Dictionary<string, AcceptanceStatus>> GetAcceptanceStatusAsync(int userId)
    {
        var documents = await _context.LegalDocuments
            .Where(d => d.TenantId == _tenant.TenantId && d.IsActive)
            .GroupBy(d => d.Type)
            .Select(g => g.OrderByDescending(d => d.Version).First())
            .ToListAsync();

        var acceptances = await _context.LegalAcceptances
            .Where(a => a.UserId == userId)
            .ToListAsync();

        return documents.ToDictionary(
            d => d.Type,
            d => new AcceptanceStatus
            {
                DocumentId = d.Id,
                Version = d.Version,
                Accepted = acceptances.Any(a => a.DocumentId == d.Id),
                AcceptedAt = acceptances.FirstOrDefault(a => a.DocumentId == d.Id)?.AcceptedAt
            });
    }

    public async Task<bool> RequiresAcceptanceAsync(int userId)
    {
        var status = await GetAcceptanceStatusAsync(userId);
        return status.Values.Any(s => !s.Accepted);
    }
}

// Middleware to enforce legal document acceptance
public class LegalAcceptanceMiddleware
{
    public async Task InvokeAsync(HttpContext context, ILegalDocumentService legalService)
    {
        if (context.User.Identity?.IsAuthenticated == true)
        {
            var userId = context.User.GetUserId();
            var requiresAcceptance = await legalService.RequiresAcceptanceAsync(userId);

            if (requiresAcceptance && !IsExemptPath(context.Request.Path))
            {
                context.Response.StatusCode = 451; // Unavailable For Legal Reasons
                await context.Response.WriteAsJsonAsync(new
                {
                    error = "Legal document acceptance required",
                    code = "LEGAL_ACCEPTANCE_REQUIRED"
                });
                return;
            }
        }

        await _next(context);
    }
}
```

---

## 5. Cookie Consent Service (ePrivacy Directive)

### PHP Implementation

**File**: `src/Services/CookieConsentService.php`

```php
class CookieConsentService
{
    const CATEGORIES = ['essential', 'functional', 'analytics', 'marketing'];

    public static function recordConsent($userId, $consents, $source = 'banner')
    {
        $tenantId = TenantContext::getId();

        Database::query(
            "INSERT INTO cookie_consents
             (tenant_id, user_id, essential, functional, analytics, marketing,
              ip_address, user_agent, source, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())",
            [
                $tenantId,
                $userId,
                true, // Essential always true
                $consents['functional'] ?? false,
                $consents['analytics'] ?? false,
                $consents['marketing'] ?? false,
                $_SERVER['REMOTE_ADDR'] ?? null,
                $_SERVER['HTTP_USER_AGENT'] ?? null,
                $source
            ]
        );
    }

    public static function getConsent($userId)
    {
        return Database::query(
            "SELECT * FROM cookie_consents
             WHERE user_id = ? AND tenant_id = ?
             ORDER BY created_at DESC LIMIT 1",
            [$userId, TenantContext::getId()]
        )->fetch();
    }

    public static function isConsentValid($userId)
    {
        $consent = self::getConsent($userId);
        if (!$consent) return false;

        // Consent expires after 365 days
        $expiresAt = strtotime($consent['created_at']) + (365 * 24 * 60 * 60);
        return time() < $expiresAt;
    }
}
```

### ASP.NET Core Implementation

```csharp
public class CookieConsentService : ICookieConsentService
{
    public async Task RecordConsentAsync(int? userId, CookieConsent consent)
    {
        var record = new CookieConsentRecord
        {
            TenantId = _tenant.TenantId,
            UserId = userId,
            SessionId = userId == null ? GetSessionId() : null,
            Essential = true, // Always required
            Functional = consent.Functional,
            Analytics = consent.Analytics,
            Marketing = consent.Marketing,
            IpAddress = _httpContext.HttpContext?.Connection.RemoteIpAddress?.ToString(),
            UserAgent = _httpContext.HttpContext?.Request.Headers.UserAgent.ToString(),
            Source = consent.Source,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddDays(365)
        };

        _context.CookieConsents.Add(record);
        await _context.SaveChangesAsync();
    }

    public async Task<CookieConsent?> GetConsentAsync(int userId)
    {
        return await _context.CookieConsents
            .Where(c => c.UserId == userId
                && c.TenantId == _tenant.TenantId
                && c.ExpiresAt > DateTime.UtcNow)
            .OrderByDescending(c => c.CreatedAt)
            .Select(c => new CookieConsent
            {
                Functional = c.Functional,
                Analytics = c.Analytics,
                Marketing = c.Marketing,
                ConsentedAt = c.CreatedAt
            })
            .FirstOrDefaultAsync();
    }

    public async Task<bool> HasValidConsentAsync(int userId)
    {
        return await _context.CookieConsents
            .AnyAsync(c => c.UserId == userId
                && c.TenantId == _tenant.TenantId
                && c.ExpiresAt > DateTime.UtcNow);
    }
}
```

---

## 6. HashiCorp Vault Integration

### PHP Implementation

**File**: `src/Core/VaultClient.php`

```php
class VaultClient
{
    private $addr;
    private $token;
    private $cache = [];

    public function __construct()
    {
        $this->addr = env('VAULT_ADDR', 'http://127.0.0.1:8200');

        // Try AppRole auth first, fall back to token
        if (env('VAULT_ROLE_ID') && env('VAULT_SECRET_ID')) {
            $this->token = $this->authenticateAppRole();
        } else {
            $this->token = env('VAULT_TOKEN');
        }
    }

    public function getSecret($path)
    {
        if (isset($this->cache[$path])) {
            return $this->cache[$path];
        }

        $response = $this->request('GET', "/v1/secret/data/{$path}");
        $this->cache[$path] = $response['data']['data'] ?? null;

        return $this->cache[$path];
    }

    public function get($path, $key)
    {
        $secret = $this->getSecret($path);
        return $secret[$key] ?? null;
    }

    public function putSecret($path, $data)
    {
        unset($this->cache[$path]);
        return $this->request('POST', "/v1/secret/data/{$path}", ['data' => $data]);
    }

    public function isHealthy()
    {
        try {
            $response = $this->request('GET', '/v1/sys/health');
            return ($response['sealed'] ?? true) === false;
        } catch (\Exception $e) {
            return false;
        }
    }

    private function authenticateAppRole()
    {
        $response = $this->request('POST', '/v1/auth/approle/login', [
            'role_id' => env('VAULT_ROLE_ID'),
            'secret_id' => env('VAULT_SECRET_ID')
        ]);
        return $response['auth']['client_token'] ?? null;
    }
}
```

### ASP.NET Core Implementation

```csharp
// Option 1: Use VaultSharp NuGet package
public class VaultService : IVaultService
{
    private readonly IVaultClient _client;
    private readonly IMemoryCache _cache;

    public VaultService(IConfiguration config, IMemoryCache cache)
    {
        _cache = cache;

        var vaultAddr = config["Vault:Address"] ?? "http://127.0.0.1:8200";

        IAuthMethodInfo authMethod;
        if (!string.IsNullOrEmpty(config["Vault:RoleId"]))
        {
            authMethod = new AppRoleAuthMethodInfo(
                config["Vault:RoleId"],
                config["Vault:SecretId"]);
        }
        else
        {
            authMethod = new TokenAuthMethodInfo(config["Vault:Token"]);
        }

        var settings = new VaultClientSettings(vaultAddr, authMethod);
        _client = new VaultClient(settings);
    }

    public async Task<string?> GetSecretAsync(string path, string key)
    {
        var cacheKey = $"vault:{path}:{key}";

        if (_cache.TryGetValue(cacheKey, out string? cached))
        {
            return cached;
        }

        var secret = await _client.V1.Secrets.KeyValue.V2.ReadSecretAsync(path);
        var value = secret.Data.Data.TryGetValue(key, out var v) ? v?.ToString() : null;

        _cache.Set(cacheKey, value, TimeSpan.FromMinutes(5));

        return value;
    }

    public async Task<bool> IsHealthyAsync()
    {
        try
        {
            var health = await _client.V1.System.GetHealthStatusAsync();
            return !health.Sealed;
        }
        catch
        {
            return false;
        }
    }
}

// Option 2: Use Azure Key Vault instead (recommended for Azure deployments)
builder.Services.AddAzureKeyVault(
    new Uri(config["KeyVault:Uri"]),
    new DefaultAzureCredential());
```

---

## 7. TOTP Encryption

### PHP Implementation

**File**: `src/Core/TotpEncryption.php`

```php
class TotpEncryption
{
    const CIPHER = 'aes-256-gcm';

    public static function encrypt($plaintext)
    {
        $key = self::getKey();
        $iv = random_bytes(12); // 96-bit IV for GCM
        $tag = '';

        $ciphertext = openssl_encrypt(
            $plaintext,
            self::CIPHER,
            $key,
            OPENSSL_RAW_DATA,
            $iv,
            $tag
        );

        // Format: IV (12 bytes) + ciphertext + tag (16 bytes)
        return base64_encode($iv . $ciphertext . $tag);
    }

    public static function decrypt($encrypted)
    {
        $key = self::getKey();
        $data = base64_decode($encrypted);

        $iv = substr($data, 0, 12);
        $tag = substr($data, -16);
        $ciphertext = substr($data, 12, -16);

        return openssl_decrypt(
            $ciphertext,
            self::CIPHER,
            $key,
            OPENSSL_RAW_DATA,
            $iv,
            $tag
        );
    }

    private static function getKey()
    {
        $key = env('TOTP_ENCRYPTION_KEY');
        // Decode if base64 or hex encoded
        if (strlen($key) === 64 && ctype_xdigit($key)) {
            return hex2bin($key);
        }
        return base64_decode($key);
    }
}
```

### ASP.NET Core Implementation

```csharp
public class TotpEncryptionService : ITotpEncryptionService
{
    private readonly byte[] _key;

    public TotpEncryptionService(IConfiguration config)
    {
        var keyString = config["Totp:EncryptionKey"]
            ?? throw new InvalidOperationException("TOTP encryption key not configured");

        // Decode hex or base64
        _key = keyString.Length == 64 && keyString.All(c => Uri.IsHexDigit(c))
            ? Convert.FromHexString(keyString)
            : Convert.FromBase64String(keyString);
    }

    public string Encrypt(string plaintext)
    {
        using var aes = new AesGcm(_key, 16);
        var iv = RandomNumberGenerator.GetBytes(12);
        var plaintextBytes = Encoding.UTF8.GetBytes(plaintext);
        var ciphertext = new byte[plaintextBytes.Length];
        var tag = new byte[16];

        aes.Encrypt(iv, plaintextBytes, ciphertext, tag);

        // Format: IV + ciphertext + tag
        var result = new byte[iv.Length + ciphertext.Length + tag.Length];
        Buffer.BlockCopy(iv, 0, result, 0, iv.Length);
        Buffer.BlockCopy(ciphertext, 0, result, iv.Length, ciphertext.Length);
        Buffer.BlockCopy(tag, 0, result, iv.Length + ciphertext.Length, tag.Length);

        return Convert.ToBase64String(result);
    }

    public string Decrypt(string encrypted)
    {
        var data = Convert.FromBase64String(encrypted);

        var iv = data[..12];
        var tag = data[^16..];
        var ciphertext = data[12..^16];

        using var aes = new AesGcm(_key, 16);
        var plaintext = new byte[ciphertext.Length];

        aes.Decrypt(iv, ciphertext, tag, plaintext);

        return Encoding.UTF8.GetString(plaintext);
    }
}
```

---

## 8. Environment Variables for Security Features

```env
# HashiCorp Vault
VAULT_ENABLED=true
VAULT_ADDR=http://127.0.0.1:8200
VAULT_ROLE_ID=
VAULT_SECRET_ID=
VAULT_TOKEN=  # Fallback if AppRole not configured

# TOTP Encryption
TOTP_ENCRYPTION_KEY=  # 32-byte key, hex or base64 encoded

# Abuse Detection
ABUSE_LARGE_TRANSFER_THRESHOLD=50
ABUSE_HIGH_VELOCITY_THRESHOLD=10
ABUSE_INACTIVE_DAYS_THRESHOLD=90

# Cookie Consent
COOKIE_CONSENT_EXPIRY_DAYS=365
```

---

## 9. Migration Checklist

### Security Features

- [ ] Implement HTML sanitizer (use Ganss.Xss)
- [ ] Configure EF Core global query filters for tenant isolation
- [ ] Implement abuse detection service
- [ ] Set up abuse detection background job
- [ ] Create legal document tracking system
- [ ] Implement legal acceptance middleware
- [ ] Create cookie consent service
- [ ] Implement TOTP encryption
- [ ] Configure Vault or Azure Key Vault integration
- [ ] Set up CORS policies

### Testing

- [ ] Test cross-tenant data isolation
- [ ] Test HTML sanitization against XSS payloads
- [ ] Test abuse detection patterns
- [ ] Verify legal document acceptance flow
- [ ] Test cookie consent GDPR compliance
