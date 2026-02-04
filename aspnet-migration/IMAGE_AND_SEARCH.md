# Image Optimization & Search Engine

## 1. Image Upload & Optimization Pipeline

### Current PHP Implementation

**Files**:
- `src/Core/ImageUploader.php` - Core upload logic
- `src/Helpers/ImageHelper.php` - WebP helpers
- `src/Services/UploadService.php` - High-level upload API

### Features

| Feature | Implementation |
|---------|----------------|
| WebP Conversion | Automatic for JPEG/PNG uploads |
| Max Dimensions | 1920px (configurable) |
| Quality | 80% WebP, 85% JPEG |
| Storage | Tenant-scoped: `uploads/tenants/{slug}/` |
| Filename | Cryptographically random + timestamp |
| MIME Validation | File content inspection (not just extension) |

### Upload Flow

```php
// PHP: ImageUploader::upload()
public static function upload($file, $subDir = 'images')
{
    // 1. Validate MIME type from file content
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mimeType = $finfo->file($file['tmp_name']);

    $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!in_array($mimeType, $allowedTypes)) {
        return ['error' => 'Invalid file type'];
    }

    // 2. Generate secure filename
    $extension = self::getExtensionFromMime($mimeType);
    $filename = bin2hex(random_bytes(16)) . '_' . time() . '.' . $extension;

    // 3. Tenant-scoped path
    $tenantSlug = TenantContext::getSlug();
    $relativePath = "tenants/{$tenantSlug}/{$subDir}/{$filename}";
    $fullPath = UPLOAD_DIR . '/' . $relativePath;

    // 4. Move uploaded file
    move_uploaded_file($file['tmp_name'], $fullPath);

    // 5. Resize if needed
    self::resizeIfNeeded($fullPath, 1920);

    // 6. Create WebP version
    $webpPath = self::convertToWebP($fullPath);

    return [
        'success' => true,
        'path' => $relativePath,
        'webp_path' => $webpPath,
        'url' => '/uploads/' . $relativePath
    ];
}
```

### WebP Conversion

```php
// PHP: Auto WebP with fallback
public static function convertToWebP($sourcePath)
{
    $webpPath = preg_replace('/\.(jpg|jpeg|png)$/i', '.webp', $sourcePath);

    $image = imagecreatefromstring(file_get_contents($sourcePath));
    imagewebp($image, $webpPath, 80);
    imagedestroy($image);

    return $webpPath;
}

// Frontend: Picture element with fallback
public static function webpImage($path, $alt, $class = '')
{
    $webpPath = preg_replace('/\.(jpg|jpeg|png)$/i', '.webp', $path);
    $webpExists = file_exists(UPLOAD_DIR . '/' . $webpPath);

    if ($webpExists) {
        return sprintf(
            '<picture><source srcset="/uploads/%s" type="image/webp"><img src="/uploads/%s" alt="%s" class="%s" loading="lazy"></picture>',
            $webpPath, $path, htmlspecialchars($alt), $class
        );
    }

    return sprintf('<img src="/uploads/%s" alt="%s" class="%s" loading="lazy">', $path, htmlspecialchars($alt), $class);
}
```

### ASP.NET Core Implementation

```csharp
// Nexus.Infrastructure/Services/ImageUploadService.cs
public class ImageUploadService : IImageUploadService
{
    private readonly ICurrentTenantService _tenant;
    private readonly IWebHostEnvironment _env;
    private readonly ILogger<ImageUploadService> _logger;

    private const int MaxDimension = 1920;
    private const int WebPQuality = 80;

    public async Task<ImageUploadResult> UploadAsync(IFormFile file, string subDir = "images")
    {
        // 1. Validate MIME type from content
        using var stream = file.OpenReadStream();
        var format = await Image.DetectFormatAsync(stream);

        var allowedFormats = new[] { JpegFormat.Instance, PngFormat.Instance, GifFormat.Instance, WebpFormat.Instance };
        if (!allowedFormats.Contains(format))
        {
            return ImageUploadResult.Fail("Invalid image format");
        }

        // 2. Generate secure filename
        var extension = format.FileExtensions.First();
        var filename = $"{Convert.ToHexString(RandomNumberGenerator.GetBytes(16))}_{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}.{extension}";

        // 3. Tenant-scoped path
        var tenantSlug = _tenant.TenantSlug ?? "default";
        var relativePath = $"tenants/{tenantSlug}/{subDir}/{filename}";
        var fullPath = Path.Combine(_env.WebRootPath, "uploads", relativePath);

        // Ensure directory exists
        Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);

        // 4. Load, resize, and save
        stream.Position = 0;
        using var image = await Image.LoadAsync(stream);

        // Resize if needed
        if (image.Width > MaxDimension || image.Height > MaxDimension)
        {
            var ratio = Math.Min((float)MaxDimension / image.Width, (float)MaxDimension / image.Height);
            image.Mutate(x => x.Resize((int)(image.Width * ratio), (int)(image.Height * ratio)));
        }

        // Save original format
        await image.SaveAsync(fullPath);

        // 5. Create WebP version
        var webpPath = Path.ChangeExtension(fullPath, ".webp");
        var webpRelativePath = Path.ChangeExtension(relativePath, ".webp");
        await image.SaveAsWebpAsync(webpPath, new WebpEncoder { Quality = WebPQuality });

        return new ImageUploadResult
        {
            Success = true,
            Path = relativePath,
            WebPPath = webpRelativePath,
            Url = $"/uploads/{relativePath}",
            WebPUrl = $"/uploads/{webpRelativePath}"
        };
    }
}

public record ImageUploadResult
{
    public bool Success { get; init; }
    public string? Path { get; init; }
    public string? WebPPath { get; init; }
    public string? Url { get; init; }
    public string? WebPUrl { get; init; }
    public string? Error { get; init; }

    public static ImageUploadResult Fail(string error) => new() { Success = false, Error = error };
}
```

### Tag Helper for WebP with Fallback

```csharp
// Nexus.Api/TagHelpers/WebPImageTagHelper.cs
[HtmlTargetElement("webp-image")]
public class WebPImageTagHelper : TagHelper
{
    [HtmlAttributeName("src")]
    public string Src { get; set; } = "";

    [HtmlAttributeName("alt")]
    public string Alt { get; set; } = "";

    [HtmlAttributeName("class")]
    public string CssClass { get; set; } = "";

    public override void Process(TagHelperContext context, TagHelperOutput output)
    {
        var webpSrc = Path.ChangeExtension(Src, ".webp");

        output.TagName = "picture";
        output.Content.SetHtmlContent($@"
            <source srcset=""{webpSrc}"" type=""image/webp"">
            <img src=""{Src}"" alt=""{Alt}"" class=""{CssClass}"" loading=""lazy"">
        ");
    }
}
```

---

## 2. Search Engine (Meilisearch)

### Current Implementation

**NOT Elasticsearch or Algolia** - Uses **Meilisearch**

**Files**:
- `src/Core/SearchService.php` - Meilisearch integration
- `src/Services/UnifiedSearchService.php` - Unified search API
- `src/Services/SearchAnalyzerService.php` - AI intent detection
- `src/Services/PersonalizedSearchService.php` - User personalization

### Features

| Feature | Implementation |
|---------|----------------|
| Engine | Meilisearch (self-hosted) |
| Indexes | listings, users, events, groups, posts |
| AI Intent | Query classification (buy, sell, find, etc.) |
| Spelling | Typo tolerance built-in |
| Suggestions | Query completion |
| Personalization | User history weighting |

### Meilisearch Configuration

```php
// PHP: SearchService configuration
private static function getClient()
{
    return new \MeiliSearch\Client(
        env('MEILISEARCH_HOST', 'http://localhost:7700'),
        env('MEILISEARCH_KEY')
    );
}

// Index configuration
public static function configureIndexes()
{
    $client = self::getClient();

    // Listings index
    $listingsIndex = $client->index('listings');
    $listingsIndex->updateSettings([
        'searchableAttributes' => ['title', 'description', 'skills', 'location'],
        'filterableAttributes' => ['tenant_id', 'type', 'status', 'category_id'],
        'sortableAttributes' => ['created_at', 'view_count'],
        'typoTolerance' => ['enabled' => true]
    ]);

    // Users index
    $usersIndex = $client->index('users');
    $usersIndex->updateSettings([
        'searchableAttributes' => ['first_name', 'last_name', 'username', 'skills', 'bio'],
        'filterableAttributes' => ['tenant_id', 'status'],
        'typoTolerance' => ['enabled' => true]
    ]);
}
```

### Unified Search API

```php
// PHP: UnifiedSearchService::search()
public static function search($query, $options = [])
{
    $tenantId = TenantContext::getId();
    $types = $options['types'] ?? ['listings', 'users', 'events', 'groups'];
    $limit = $options['limit'] ?? 20;

    $client = SearchService::getClient();
    $results = [];

    foreach ($types as $type) {
        $index = $client->index($type);
        $searchResults = $index->search($query, [
            'filter' => "tenant_id = {$tenantId}",
            'limit' => $limit,
            'attributesToHighlight' => ['title', 'description', 'name']
        ]);

        foreach ($searchResults->getHits() as $hit) {
            $results[] = [
                'type' => $type,
                'id' => $hit['id'],
                'title' => $hit['_formatted']['title'] ?? $hit['title'] ?? $hit['name'],
                'description' => $hit['_formatted']['description'] ?? null,
                'url' => self::getUrl($type, $hit['id'], $hit['slug'] ?? null)
            ];
        }
    }

    return $results;
}
```

### ASP.NET Core Implementation

```csharp
// Nexus.Infrastructure/Search/MeilisearchService.cs
public class MeilisearchService : ISearchService
{
    private readonly MeilisearchClient _client;
    private readonly ICurrentTenantService _tenant;

    public MeilisearchService(IConfiguration config, ICurrentTenantService tenant)
    {
        _client = new MeilisearchClient(
            config["Meilisearch:Host"] ?? "http://localhost:7700",
            config["Meilisearch:ApiKey"]);
        _tenant = tenant;
    }

    public async Task<SearchResults> SearchAsync(string query, SearchOptions? options = null)
    {
        options ??= new SearchOptions();
        var tenantId = _tenant.TenantId;

        var tasks = options.Types.Select(async type =>
        {
            var index = _client.Index(type);
            var results = await index.SearchAsync<SearchDocument>(query, new SearchQuery
            {
                Filter = $"tenant_id = {tenantId}",
                Limit = options.Limit,
                AttributesToHighlight = new[] { "title", "description", "name" }
            });

            return results.Hits.Select(hit => new SearchResult
            {
                Type = type,
                Id = hit.Id,
                Title = hit.Formatted?.Title ?? hit.Title ?? hit.Name,
                Description = hit.Formatted?.Description,
                Url = GetUrl(type, hit.Id, hit.Slug)
            });
        });

        var allResults = await Task.WhenAll(tasks);
        return new SearchResults
        {
            Items = allResults.SelectMany(r => r).ToList(),
            Query = query,
            TotalHits = allResults.Sum(r => r.Count())
        };
    }

    public async Task IndexDocumentAsync<T>(string indexName, T document) where T : ISearchable
    {
        var index = _client.Index(indexName);
        await index.AddDocumentsAsync(new[] { document });
    }

    public async Task RemoveDocumentAsync(string indexName, string id)
    {
        var index = _client.Index(indexName);
        await index.DeleteDocumentAsync(id);
    }
}

public interface ISearchable
{
    string Id { get; }
    int TenantId { get; }
}

public class SearchOptions
{
    public string[] Types { get; set; } = { "listings", "users", "events", "groups" };
    public int Limit { get; set; } = 20;
    public string? Cursor { get; set; }
}

public class SearchResults
{
    public List<SearchResult> Items { get; set; } = new();
    public string Query { get; set; } = "";
    public int TotalHits { get; set; }
}

public class SearchResult
{
    public string Type { get; set; } = "";
    public string Id { get; set; } = "";
    public string Title { get; set; } = "";
    public string? Description { get; set; }
    public string Url { get; set; } = "";
}
```

### Search Controller

```csharp
[ApiController]
[Route("api/v2/search")]
public class SearchController : ControllerBase
{
    private readonly ISearchService _search;

    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] string q, [FromQuery] string? types = null, [FromQuery] int limit = 20)
    {
        var options = new SearchOptions
        {
            Types = types?.Split(',') ?? new[] { "listings", "users", "events", "groups" },
            Limit = Math.Min(limit, 100)
        };

        var results = await _search.SearchAsync(q, options);
        return Ok(results);
    }

    [HttpGet("suggestions")]
    public async Task<IActionResult> Suggestions([FromQuery] string q)
    {
        var suggestions = await _search.GetSuggestionsAsync(q);
        return Ok(new { suggestions });
    }
}
```

### Indexing on Entity Changes

```csharp
// Nexus.Infrastructure/Persistence/Interceptors/SearchIndexInterceptor.cs
public class SearchIndexInterceptor : SaveChangesInterceptor
{
    private readonly ISearchService _search;

    public override async ValueTask<int> SavedChangesAsync(
        SaveChangesCompletedEventData eventData,
        int result,
        CancellationToken cancellationToken = default)
    {
        var context = eventData.Context;
        if (context == null) return result;

        foreach (var entry in context.ChangeTracker.Entries<ISearchable>())
        {
            var indexName = GetIndexName(entry.Entity.GetType());

            switch (entry.State)
            {
                case EntityState.Added:
                case EntityState.Modified:
                    await _search.IndexDocumentAsync(indexName, entry.Entity);
                    break;
                case EntityState.Deleted:
                    await _search.RemoveDocumentAsync(indexName, entry.Entity.Id);
                    break;
            }
        }

        return result;
    }

    private string GetIndexName(Type type) => type.Name.ToLower() + "s";
}
```

---

## 3. Environment Variables

```env
# Meilisearch
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_KEY=your_master_key

# Image Upload
UPLOAD_MAX_SIZE=10485760  # 10MB
UPLOAD_MAX_DIMENSION=1920
WEBP_QUALITY=80
```

---

## 4. Migration Checklist

### Image Upload

- [ ] Install `SixLabors.ImageSharp` package
- [ ] Create upload directory structure
- [ ] Implement tenant-scoped storage
- [ ] Add WebP conversion
- [ ] Create `<webp-image>` tag helper
- [ ] Migrate existing images (optional)

### Search Engine

- [ ] Install `Meilisearch` package
- [ ] Deploy Meilisearch server
- [ ] Configure indexes with settings
- [ ] Implement unified search service
- [ ] Add search indexing interceptor
- [ ] Re-index existing data
- [ ] Test typo tolerance
