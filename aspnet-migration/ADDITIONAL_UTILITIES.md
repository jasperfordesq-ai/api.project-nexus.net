# Additional Utilities & Services

## 1. SEO & Schema.org Management

### PHP Implementation

**Files**:
- `src/Core/SEO.php` - SEO metadata management
- `src/Services/SchemaService.php` - JSON-LD structured data

### Features

| Feature | Description |
|---------|-------------|
| Meta Tags | Title, description, canonical URL |
| Open Graph | Facebook/social sharing tags |
| Twitter Cards | Twitter-specific metadata |
| JSON-LD | Schema.org structured data |
| Auto-generation | Smart defaults from content |

### PHP SEO Class

```php
class SEO
{
    private static $title;
    private static $description;
    private static $image;
    private static $canonical;
    private static $schema = [];

    public static function load($type, $id = null)
    {
        switch ($type) {
            case 'article':
                $article = Article::find($id);
                self::$title = $article['title'];
                self::$description = self::excerpt($article['content']);
                self::$image = $article['image'];
                self::$schema[] = SchemaService::article($article);
                break;
            case 'event':
                $event = Event::find($id);
                self::$title = $event['title'];
                self::$schema[] = SchemaService::event($event);
                break;
            // ... more types
        }
    }

    public static function render()
    {
        $html = '';
        $html .= '<title>' . htmlspecialchars(self::$title) . '</title>';
        $html .= '<meta name="description" content="' . htmlspecialchars(self::$description) . '">';
        $html .= '<link rel="canonical" href="' . self::$canonical . '">';

        // Open Graph
        $html .= '<meta property="og:title" content="' . htmlspecialchars(self::$title) . '">';
        $html .= '<meta property="og:description" content="' . htmlspecialchars(self::$description) . '">';
        $html .= '<meta property="og:image" content="' . self::$image . '">';

        // Twitter Card
        $html .= '<meta name="twitter:card" content="summary_large_image">';

        // JSON-LD
        foreach (self::$schema as $schema) {
            $html .= '<script type="application/ld+json">' . json_encode($schema) . '</script>';
        }

        return $html;
    }
}
```

### ASP.NET Core Implementation

```csharp
public class SeoService : ISeoService
{
    private readonly ISchemaService _schema;

    public SeoMetadata Generate(string type, object entity)
    {
        return type switch
        {
            "article" => GenerateArticleSeo((Article)entity),
            "event" => GenerateEventSeo((Event)entity),
            "listing" => GenerateListingSeo((Listing)entity),
            "user" => GenerateProfileSeo((User)entity),
            _ => GenerateDefaultSeo()
        };
    }

    private SeoMetadata GenerateArticleSeo(Article article)
    {
        return new SeoMetadata
        {
            Title = article.Title,
            Description = Excerpt(article.Content, 160),
            Image = article.Image,
            CanonicalUrl = $"/blog/{article.Slug}",
            OpenGraph = new OpenGraphData
            {
                Type = "article",
                Title = article.Title,
                Description = Excerpt(article.Content, 160),
                Image = article.Image
            },
            JsonLd = _schema.GenerateArticle(article)
        };
    }
}

// Tag Helper for rendering SEO tags
[HtmlTargetElement("seo-tags")]
public class SeoTagHelper : TagHelper
{
    [HtmlAttributeName("metadata")]
    public SeoMetadata Metadata { get; set; } = new();

    public override void Process(TagHelperContext context, TagHelperOutput output)
    {
        output.TagName = null;
        output.Content.SetHtmlContent($@"
            <title>{WebUtility.HtmlEncode(Metadata.Title)}</title>
            <meta name=""description"" content=""{WebUtility.HtmlEncode(Metadata.Description)}"">
            <link rel=""canonical"" href=""{Metadata.CanonicalUrl}"">
            <meta property=""og:title"" content=""{WebUtility.HtmlEncode(Metadata.Title)}"">
            <meta property=""og:description"" content=""{WebUtility.HtmlEncode(Metadata.Description)}"">
            <meta property=""og:image"" content=""{Metadata.Image}"">
            <meta name=""twitter:card"" content=""summary_large_image"">
            <script type=""application/ld+json"">{JsonSerializer.Serialize(Metadata.JsonLd)}</script>
        ");
    }
}
```

---

## 2. ICS Calendar Export

### PHP Implementation

**File**: `src/Helpers/IcsHelper.php`

```php
class IcsHelper
{
    public static function generate($summary, $description, $location, $start, $end, $uid = null)
    {
        $uid = $uid ?? uniqid('nexus-', true) . '@project-nexus.ie';

        $ics = "BEGIN:VCALENDAR\r\n";
        $ics .= "VERSION:2.0\r\n";
        $ics .= "PRODID:-//Project NEXUS//Events//EN\r\n";
        $ics .= "METHOD:PUBLISH\r\n";
        $ics .= "BEGIN:VEVENT\r\n";
        $ics .= "UID:" . $uid . "\r\n";
        $ics .= "DTSTAMP:" . gmdate('Ymd\THis\Z') . "\r\n";
        $ics .= "DTSTART:" . gmdate('Ymd\THis\Z', strtotime($start)) . "\r\n";
        $ics .= "DTEND:" . gmdate('Ymd\THis\Z', strtotime($end)) . "\r\n";
        $ics .= "SUMMARY:" . self::escape($summary) . "\r\n";
        $ics .= "DESCRIPTION:" . self::escape($description) . "\r\n";
        $ics .= "LOCATION:" . self::escape($location) . "\r\n";
        $ics .= "END:VEVENT\r\n";
        $ics .= "END:VCALENDAR\r\n";

        return $ics;
    }

    private static function escape($text)
    {
        // RFC 5545 escaping
        $text = str_replace("\\", "\\\\", $text);
        $text = str_replace("\n", "\\n", $text);
        $text = str_replace(",", "\\,", $text);
        $text = str_replace(";", "\\;", $text);
        return $text;
    }
}
```

### ASP.NET Core Implementation

```csharp
public class IcsService : IIcsService
{
    public string GenerateEvent(Event evt)
    {
        var sb = new StringBuilder();
        var uid = $"nexus-{evt.Id}@project-nexus.ie";

        sb.AppendLine("BEGIN:VCALENDAR");
        sb.AppendLine("VERSION:2.0");
        sb.AppendLine("PRODID:-//Project NEXUS//Events//EN");
        sb.AppendLine("METHOD:PUBLISH");
        sb.AppendLine("BEGIN:VEVENT");
        sb.AppendLine($"UID:{uid}");
        sb.AppendLine($"DTSTAMP:{DateTime.UtcNow:yyyyMMdd'T'HHmmss'Z'}");
        sb.AppendLine($"DTSTART:{evt.StartDate.ToUniversalTime():yyyyMMdd'T'HHmmss'Z'}");
        sb.AppendLine($"DTEND:{(evt.EndDate ?? evt.StartDate.AddHours(1)).ToUniversalTime():yyyyMMdd'T'HHmmss'Z'}");
        sb.AppendLine($"SUMMARY:{Escape(evt.Title)}");
        sb.AppendLine($"DESCRIPTION:{Escape(evt.Description ?? "")}");
        sb.AppendLine($"LOCATION:{Escape(evt.Location ?? "")}");
        sb.AppendLine("END:VEVENT");
        sb.AppendLine("END:VCALENDAR");

        return sb.ToString();
    }

    private string Escape(string text)
    {
        return text
            .Replace("\\", "\\\\")
            .Replace("\n", "\\n")
            .Replace(",", "\\,")
            .Replace(";", "\\;");
    }
}

// Controller endpoint
[HttpGet("events/{id}/ics")]
public IActionResult DownloadIcs(int id)
{
    var evt = _eventService.GetById(id);
    if (evt == null) return NotFound();

    var ics = _icsService.GenerateEvent(evt);

    return File(
        Encoding.UTF8.GetBytes(ics),
        "text/calendar",
        $"event-{evt.Id}.ics");
}
```

---

## 3. Audio Upload for Voice Messages

### PHP Implementation

**File**: `src/Core/AudioUploader.php`

```php
class AudioUploader
{
    const ALLOWED_TYPES = ['audio/webm', 'audio/ogg', 'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/aac'];
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    const MAX_DURATION = 300; // 5 minutes

    public static function upload($file, $duration = null)
    {
        // Validate MIME type from file content
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mimeType = $finfo->file($file['tmp_name']);

        if (!in_array($mimeType, self::ALLOWED_TYPES)) {
            return ['error' => 'Invalid audio format'];
        }

        if ($file['size'] > self::MAX_SIZE) {
            return ['error' => 'File too large (max 10MB)'];
        }

        if ($duration && $duration > self::MAX_DURATION) {
            return ['error' => 'Recording too long (max 5 minutes)'];
        }

        // Generate secure filename
        $extension = self::getExtension($mimeType);
        $filename = bin2hex(random_bytes(16)) . '.' . $extension;

        // Tenant-scoped path
        $tenantSlug = TenantContext::getSlug();
        $relativePath = "tenants/{$tenantSlug}/voice/{$filename}";
        $fullPath = UPLOAD_DIR . '/' . $relativePath;

        move_uploaded_file($file['tmp_name'], $fullPath);

        return [
            'success' => true,
            'path' => $relativePath,
            'url' => '/uploads/' . $relativePath,
            'duration' => $duration
        ];
    }

    public static function uploadFromBase64($base64, $mimeType, $duration = null)
    {
        // Handle blob recordings from browser
        $data = base64_decode($base64);

        if (strlen($data) > self::MAX_SIZE) {
            return ['error' => 'File too large'];
        }

        $extension = self::getExtension($mimeType);
        $filename = bin2hex(random_bytes(16)) . '.' . $extension;

        $tenantSlug = TenantContext::getSlug();
        $relativePath = "tenants/{$tenantSlug}/voice/{$filename}";
        $fullPath = UPLOAD_DIR . '/' . $relativePath;

        file_put_contents($fullPath, $data);

        return [
            'success' => true,
            'path' => $relativePath,
            'url' => '/uploads/' . $relativePath
        ];
    }
}
```

### ASP.NET Core Implementation

```csharp
public class AudioUploadService : IAudioUploadService
{
    private static readonly string[] AllowedMimeTypes =
        { "audio/webm", "audio/ogg", "audio/mp3", "audio/mpeg", "audio/wav", "audio/aac" };
    private const int MaxSize = 10 * 1024 * 1024; // 10MB
    private const int MaxDuration = 300; // 5 minutes

    public async Task<AudioUploadResult> UploadAsync(IFormFile file, int? duration = null)
    {
        // Validate MIME type
        if (!AllowedMimeTypes.Contains(file.ContentType))
        {
            return AudioUploadResult.Fail("Invalid audio format");
        }

        if (file.Length > MaxSize)
        {
            return AudioUploadResult.Fail("File too large (max 10MB)");
        }

        if (duration > MaxDuration)
        {
            return AudioUploadResult.Fail("Recording too long (max 5 minutes)");
        }

        var extension = GetExtension(file.ContentType);
        var filename = $"{Convert.ToHexString(RandomNumberGenerator.GetBytes(16))}.{extension}";

        var tenantSlug = _tenant.TenantSlug ?? "default";
        var relativePath = $"tenants/{tenantSlug}/voice/{filename}";
        var fullPath = Path.Combine(_env.WebRootPath, "uploads", relativePath);

        Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);

        using var stream = new FileStream(fullPath, FileMode.Create);
        await file.CopyToAsync(stream);

        return new AudioUploadResult
        {
            Success = true,
            Path = relativePath,
            Url = $"/uploads/{relativePath}",
            Duration = duration
        };
    }

    public async Task<AudioUploadResult> UploadFromBase64Async(string base64, string mimeType, int? duration = null)
    {
        var data = Convert.FromBase64String(base64);

        if (data.Length > MaxSize)
        {
            return AudioUploadResult.Fail("File too large");
        }

        var extension = GetExtension(mimeType);
        var filename = $"{Convert.ToHexString(RandomNumberGenerator.GetBytes(16))}.{extension}";

        var tenantSlug = _tenant.TenantSlug ?? "default";
        var relativePath = $"tenants/{tenantSlug}/voice/{filename}";
        var fullPath = Path.Combine(_env.WebRootPath, "uploads", relativePath);

        Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);
        await File.WriteAllBytesAsync(fullPath, data);

        return new AudioUploadResult
        {
            Success = true,
            Path = relativePath,
            Url = $"/uploads/{relativePath}",
            Duration = duration
        };
    }

    private string GetExtension(string mimeType) => mimeType switch
    {
        "audio/webm" => "webm",
        "audio/ogg" => "ogg",
        "audio/mp3" or "audio/mpeg" => "mp3",
        "audio/wav" => "wav",
        "audio/aac" => "aac",
        _ => "audio"
    };
}
```

---

## 4. Transaction Export (CSV)

### PHP Implementation

**File**: `src/Services/TransactionExportService.php`

```php
class TransactionExportService
{
    public static function exportOrgTransactionsCSV($orgId, $userId, $filters = [])
    {
        // Verify admin access
        if (!OrganizationService::isAdmin($orgId, $userId)) {
            throw new UnauthorizedException();
        }

        $transactions = self::getFilteredTransactions($orgId, $filters);

        $csv = "\xEF\xBB\xBF"; // UTF-8 BOM for Excel
        $csv .= "Date,Type,From,To,Amount,Description,Status\n";

        foreach ($transactions as $tx) {
            $csv .= sprintf(
                "%s,%s,%s,%s,%s,%s,%s\n",
                $tx['created_at'],
                $tx['type'],
                self::escape($tx['sender_name']),
                self::escape($tx['receiver_name']),
                $tx['amount'],
                self::escape($tx['description']),
                $tx['status']
            );
        }

        return $csv;
    }

    private static function escape($value)
    {
        // CSV escaping: wrap in quotes if contains comma, quote, or newline
        if (preg_match('/[,"\n]/', $value)) {
            return '"' . str_replace('"', '""', $value) . '"';
        }
        return $value;
    }
}
```

### ASP.NET Core Implementation

```csharp
public class TransactionExportService : ITransactionExportService
{
    public async Task<byte[]> ExportToCsvAsync(int orgId, TransactionExportFilters filters)
    {
        var transactions = await GetFilteredTransactionsAsync(orgId, filters);

        using var memoryStream = new MemoryStream();
        using var writer = new StreamWriter(memoryStream, new UTF8Encoding(true)); // UTF-8 BOM

        // Header
        await writer.WriteLineAsync("Date,Type,From,To,Amount,Description,Status");

        // Data rows
        foreach (var tx in transactions)
        {
            await writer.WriteLineAsync(string.Join(",",
                tx.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss"),
                tx.Type,
                EscapeCsv(tx.SenderName),
                EscapeCsv(tx.ReceiverName),
                tx.Amount,
                EscapeCsv(tx.Description ?? ""),
                tx.Status));
        }

        await writer.FlushAsync();
        return memoryStream.ToArray();
    }

    private string EscapeCsv(string value)
    {
        if (value.Contains(',') || value.Contains('"') || value.Contains('\n'))
        {
            return $"\"{value.Replace("\"", "\"\"")}\"";
        }
        return value;
    }
}

// Controller endpoint
[HttpGet("organizations/{orgId}/transactions/export")]
[Authorize(Roles = "admin")]
public async Task<IActionResult> ExportTransactions(int orgId, [FromQuery] TransactionExportFilters filters)
{
    var csv = await _exportService.ExportToCsvAsync(orgId, filters);

    return File(csv, "text/csv", $"transactions-{DateTime.UtcNow:yyyyMMdd}.csv");
}
```

---

## 5. Geocoding Service

### PHP Implementation

**File**: `src/Services/GeocodingService.php`

```php
class GeocodingService
{
    // Primary: OpenStreetMap Nominatim (free, no API key)
    // Fallback: Google Maps (if configured)

    public static function geocode($address)
    {
        // Check cache first
        $cacheKey = 'geocode:' . md5($address);
        $cached = Cache::get($cacheKey);
        if ($cached) return $cached;

        // Try Nominatim first
        $result = self::nominatimGeocode($address);

        // Fall back to Google if Nominatim fails
        if (!$result && env('GOOGLE_MAPS_API_KEY')) {
            $result = self::googleGeocode($address);
        }

        if ($result) {
            Cache::set($cacheKey, $result, 7 * 24 * 60 * 60); // 7 days
        }

        return $result;
    }

    private static function nominatimGeocode($address)
    {
        // Rate limit: 1 request per second
        usleep(1000000);

        $url = 'https://nominatim.openstreetmap.org/search?' . http_build_query([
            'q' => $address,
            'format' => 'json',
            'limit' => 1
        ]);

        $response = file_get_contents($url, false, stream_context_create([
            'http' => ['header' => 'User-Agent: ProjectNEXUS/1.0']
        ]));

        $data = json_decode($response, true);

        if (!empty($data[0])) {
            return [
                'lat' => (float) $data[0]['lat'],
                'lng' => (float) $data[0]['lon'],
                'display_name' => $data[0]['display_name']
            ];
        }

        return null;
    }
}
```

### ASP.NET Core Implementation

```csharp
public class GeocodingService : IGeocodingService
{
    private readonly HttpClient _httpClient;
    private readonly IDistributedCache _cache;
    private readonly IConfiguration _config;
    private static readonly SemaphoreSlim _rateLimiter = new(1, 1);

    public async Task<GeocodingResult?> GeocodeAsync(string address)
    {
        var cacheKey = $"geocode:{Convert.ToBase64String(Encoding.UTF8.GetBytes(address))}";

        var cached = await _cache.GetStringAsync(cacheKey);
        if (cached != null)
        {
            return JsonSerializer.Deserialize<GeocodingResult>(cached);
        }

        // Try Nominatim first
        var result = await NominatimGeocodeAsync(address);

        // Fall back to Google
        if (result == null && !string.IsNullOrEmpty(_config["GoogleMaps:ApiKey"]))
        {
            result = await GoogleGeocodeAsync(address);
        }

        if (result != null)
        {
            await _cache.SetStringAsync(
                cacheKey,
                JsonSerializer.Serialize(result),
                new DistributedCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromDays(7)
                });
        }

        return result;
    }

    private async Task<GeocodingResult?> NominatimGeocodeAsync(string address)
    {
        // Rate limit: 1 request per second
        await _rateLimiter.WaitAsync();
        try
        {
            await Task.Delay(1000);

            var url = $"https://nominatim.openstreetmap.org/search?q={Uri.EscapeDataString(address)}&format=json&limit=1";

            var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.Add("User-Agent", "ProjectNEXUS/1.0");

            var response = await _httpClient.SendAsync(request);
            var json = await response.Content.ReadAsStringAsync();
            var data = JsonSerializer.Deserialize<JsonElement[]>(json);

            if (data?.Length > 0)
            {
                return new GeocodingResult
                {
                    Latitude = data[0].GetProperty("lat").GetDecimal(),
                    Longitude = data[0].GetProperty("lon").GetDecimal(),
                    DisplayName = data[0].GetProperty("display_name").GetString()
                };
            }

            return null;
        }
        finally
        {
            _rateLimiter.Release();
        }
    }
}
```

---

## 6. Email Template Renderer

### PHP Implementation

**File**: `src/Core/EmailTemplate.php`

```php
class EmailTemplate
{
    public static function render($title, $subtitle, $body, $btnText, $btnUrl, $tenantName)
    {
        return <<<HTML
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    @media (prefers-color-scheme: dark) {
      .email-body { background-color: #1a1a1a !important; }
      .email-content { background-color: #2d2d2d !important; color: #ffffff !important; }
    }
  </style>
</head>
<body class="email-body" style="margin:0;padding:20px;background:#f5f5f5;font-family:Arial,sans-serif;">
  <div class="email-content" style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:30px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:24px;">{$title}</h1>
      <p style="color:rgba(255,255,255,0.9);margin:10px 0 0;">{$subtitle}</p>
    </div>
    <div style="padding:30px;">
      {$body}
      <p style="text-align:center;margin:30px 0;">
        <a href="{$btnUrl}" style="background:#6366f1;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">{$btnText}</a>
      </p>
    </div>
    <div style="background:#f8f8f8;padding:20px;text-align:center;font-size:12px;color:#666;">
      <p>© {$tenantName}</p>
      <p><a href="{preferences_url}">Manage email preferences</a></p>
    </div>
  </div>
</body>
</html>
HTML;
    }
}
```

### ASP.NET Core Implementation

```csharp
public class EmailTemplateService : IEmailTemplateService
{
    private readonly ICurrentTenantService _tenant;

    public string Render(EmailTemplateModel model)
    {
        var tenantName = _tenant.GetSetting<string>("site_name") ?? "Project NEXUS";

        return $@"
<!DOCTYPE html>
<html>
<head>
  <meta charset=""utf-8"">
  <meta name=""viewport"" content=""width=device-width, initial-scale=1"">
  <style>
    @media (prefers-color-scheme: dark) {{
      .email-body {{ background-color: #1a1a1a !important; }}
      .email-content {{ background-color: #2d2d2d !important; color: #ffffff !important; }}
    }}
  </style>
</head>
<body class=""email-body"" style=""margin:0;padding:20px;background:#f5f5f5;font-family:Arial,sans-serif;"">
  <div class=""email-content"" style=""max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;"">
    <div style=""background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:30px;text-align:center;"">
      <h1 style=""color:#fff;margin:0;font-size:24px;"">{WebUtility.HtmlEncode(model.Title)}</h1>
      <p style=""color:rgba(255,255,255,0.9);margin:10px 0 0;"">{WebUtility.HtmlEncode(model.Subtitle)}</p>
    </div>
    <div style=""padding:30px;"">
      {model.Body}
      <p style=""text-align:center;margin:30px 0;"">
        <a href=""{model.ButtonUrl}"" style=""background:#6366f1;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;"">{WebUtility.HtmlEncode(model.ButtonText)}</a>
      </p>
    </div>
    <div style=""background:#f8f8f8;padding:20px;text-align:center;font-size:12px;color:#666;"">
      <p>© {WebUtility.HtmlEncode(tenantName)}</p>
      <p><a href=""{model.PreferencesUrl}"">Manage email preferences</a></p>
    </div>
  </div>
</body>
</html>";
    }
}

public record EmailTemplateModel(
    string Title,
    string Subtitle,
    string Body,
    string ButtonText,
    string ButtonUrl,
    string PreferencesUrl);
```

---

## 7. CORS Helper

### PHP Implementation

**File**: `src/Helpers/CorsHelper.php`

```php
class CorsHelper
{
    public static function setHeaders()
    {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

        if (self::isAllowedOrigin($origin)) {
            header("Access-Control-Allow-Origin: {$origin}");
            header("Access-Control-Allow-Credentials: true");
            header("Vary: Origin");
        }
    }

    public static function handlePreflight()
    {
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            self::setHeaders();
            header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
            header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Tenant-ID");
            header("Access-Control-Max-Age: 86400");
            exit(0);
        }
    }

    private static function isAllowedOrigin($origin)
    {
        $allowed = explode(',', env('ALLOWED_ORIGINS', ''));

        foreach ($allowed as $pattern) {
            $pattern = trim($pattern);
            if ($pattern === $origin) return true;
            // Wildcard subdomain support (*.project-nexus.ie)
            if (strpos($pattern, '*.') === 0) {
                $domain = substr($pattern, 2);
                if (str_ends_with($origin, $domain)) return true;
            }
        }

        return false;
    }
}
```

### ASP.NET Core Implementation

```csharp
// Program.cs
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowConfiguredOrigins", policy =>
    {
        var allowedOrigins = builder.Configuration
            .GetSection("Cors:AllowedOrigins")
            .Get<string[]>() ?? Array.Empty<string>();

        policy
            .WithOrigins(allowedOrigins)
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials()
            .SetPreflightMaxAge(TimeSpan.FromDays(1));
    });
});

app.UseCors("AllowConfiguredOrigins");
```

---

## 8. Migration Checklist

### Utilities to Migrate

- [ ] SEO service with JSON-LD generation
- [ ] ICS calendar export endpoint
- [ ] Audio upload service
- [ ] Transaction CSV export
- [ ] Geocoding service with caching
- [ ] Email template renderer
- [ ] CORS configuration

### NuGet Packages Needed

```xml
<PackageReference Include="Ganss.XSS" Version="8.0.0" />
<PackageReference Include="VaultSharp" Version="1.13.0" />
```
