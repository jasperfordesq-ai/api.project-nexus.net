// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;
using Nexus.Api.Entities;
using Nexus.Api.Extensions;
using Nexus.Api.Services;

namespace Nexus.Api.Controllers;

[ApiController]
[Route("api/v2/resources")]
public class ResourcesV2Controller : ControllerBase
{
    private static readonly Regex SlugUnsafeCharacters = new("[^a-z0-9]+", RegexOptions.Compiled);

    private readonly NexusDbContext _db;
    private readonly ResourceService _resourceService;
    private readonly TenantContext _tenantContext;

    public ResourcesV2Controller(NexusDbContext db, ResourceService resourceService, TenantContext tenantContext)
    {
        _db = db;
        _resourceService = resourceService;
        _tenantContext = tenantContext;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> List(
        [FromQuery(Name = "per_page")] int perPage = 20,
        [FromQuery] string? cursor = null,
        [FromQuery] string? search = null,
        [FromQuery(Name = "category_id")] int? categoryId = null,
        CancellationToken ct = default)
    {
        var tenantId = TenantId();
        perPage = Math.Clamp(perPage, 1, 50);

        var query = _db.Resources
            .AsNoTracking()
            .Include(r => r.CreatedBy)
            .Include(r => r.Category)
            .Where(r => r.TenantId == tenantId && r.IsPublished);

        if (TryDecodeCursor(cursor, out var afterId))
            query = query.Where(r => r.Id < afterId);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLowerInvariant();
            query = query.Where(r =>
                r.Title.ToLower().Contains(term) ||
                (r.Description != null && r.Description.ToLower().Contains(term)));
        }

        if (categoryId.HasValue)
            query = query.Where(r => r.CategoryId == categoryId.Value);

        var items = await query
            .OrderByDescending(r => r.Id)
            .Take(perPage + 1)
            .ToListAsync(ct);

        var hasMore = items.Count > perPage;
        var pageItems = items.Take(perPage).ToList();
        var nextCursor = hasMore && pageItems.Count > 0 ? EncodeCursor(pageItems[^1].Id) : null;

        return Ok(new
        {
            success = true,
            data = pageItems.Select(MapResource),
            meta = new
            {
                base_url = BaseUrl(),
                per_page = perPage,
                has_more = hasMore,
                cursor = nextCursor
            }
        });
    }

    [HttpGet("categories")]
    [AllowAnonymous]
    public async Task<IActionResult> Categories(CancellationToken ct = default)
    {
        var tenantId = TenantId();
        var counts = await _db.Resources
            .AsNoTracking()
            .Where(r => r.TenantId == tenantId && r.CategoryId.HasValue)
            .GroupBy(r => r.CategoryId!.Value)
            .Select(g => new { CategoryId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.CategoryId, x => x.Count, ct);

        var categories = await _db.ResourceCategories
            .AsNoTracking()
            .Where(c => c.TenantId == tenantId)
            .OrderBy(c => c.Name)
            .ToListAsync(ct);

        return Ok(new
        {
            success = true,
            data = categories.Select(c => MapCategory(c, counts.GetValueOrDefault(c.Id)))
        });
    }

    [HttpGet("categories/tree")]
    [AllowAnonymous]
    public async Task<IActionResult> CategoryTree(CancellationToken ct = default)
    {
        var tenantId = TenantId();
        var counts = await _db.Resources
            .AsNoTracking()
            .Where(r => r.TenantId == tenantId && r.CategoryId.HasValue)
            .GroupBy(r => r.CategoryId!.Value)
            .Select(g => new { CategoryId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.CategoryId, x => x.Count, ct);

        var all = await _db.ResourceCategories
            .AsNoTracking()
            .Where(c => c.TenantId == tenantId)
            .OrderBy(c => c.SortOrder)
            .ThenBy(c => c.Name)
            .ToListAsync(ct);

        var children = all
            .Where(c => c.ParentId.HasValue)
            .GroupBy(c => c.ParentId!.Value)
            .ToDictionary(g => g.Key, g => g.ToList());

        var roots = all.Where(c => !c.ParentId.HasValue).ToList();
        return Ok(new
        {
            success = true,
            data = roots.Select(c => MapCategoryTree(c, children, counts))
        });
    }

    [HttpPost]
    [Authorize]
    public async Task<IActionResult> Store(CancellationToken ct = default)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { success = false, error = "Invalid token" });

        var form = await Request.ReadFormAsync(ct);
        var title = form["title"].FirstOrDefault();
        if (string.IsNullOrWhiteSpace(title))
            return BadRequest(new { success = false, error = "Title is required" });

        var file = form.Files.GetFile("file");
        var filePath = file?.FileName ?? form["file_path"].FirstOrDefault() ?? form["url"].FirstOrDefault();
        var resourceType = form["file_type"].FirstOrDefault() ?? form["resource_type"].FirstOrDefault() ?? "file";
        var categoryId = int.TryParse(form["category_id"].FirstOrDefault(), out var parsedCategoryId)
            ? parsedCategoryId
            : (int?)null;

        var (resource, error) = await _resourceService.CreateResourceAsync(
            TenantId(),
            userId.Value,
            title,
            form["description"].FirstOrDefault(),
            filePath,
            resourceType,
            categoryId);

        if (error != null) return BadRequest(new { success = false, error });
        return StatusCode(StatusCodes.Status201Created, new { success = true, data = MapResource(resource!) });
    }

    [HttpGet("{id:int}/download")]
    [Authorize]
    public async Task<IActionResult> Download(int id, CancellationToken ct = default)
    {
        var resource = await _db.Resources.AsNoTracking().FirstOrDefaultAsync(r => r.Id == id && r.TenantId == TenantId(), ct);
        if (resource == null) return NotFound(new { success = false, error = "Resource not found" });

        var fileName = string.IsNullOrWhiteSpace(resource.Url) ? $"resource-{id}.txt" : Path.GetFileName(resource.Url);
        return File(System.Text.Encoding.UTF8.GetBytes(resource.Title), "application/octet-stream", fileName);
    }

    [HttpPut("{id:int}")]
    [Authorize]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateResourceV2Request request)
    {
        var existing = await _resourceService.GetResourceAsync(id);
        if (existing == null) return NotFound(new { success = false, error = "Resource not found" });

        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { success = false, error = "Invalid token" });
        if (existing.CreatedById != userId.Value && !User.IsAdmin())
            return StatusCode(StatusCodes.Status403Forbidden, new { success = false, error = "You can only update your own resources" });

        var (resource, error) = await _resourceService.UpdateResourceAsync(
            id,
            request.Title ?? existing.Title,
            request.Description ?? existing.Description,
            request.FilePath ?? request.Url ?? existing.Url,
            request.FileType ?? request.ResourceType ?? existing.ResourceType,
            request.CategoryId ?? existing.CategoryId);

        if (error != null) return BadRequest(new { success = false, error });
        return Ok(new { success = true, data = MapResource(resource!) });
    }

    [HttpDelete("{id:int}")]
    [Authorize]
    public async Task<IActionResult> Delete(int id)
    {
        var existing = await _resourceService.GetResourceAsync(id);
        if (existing == null) return NotFound(new { success = false, error = "Resource not found" });

        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { success = false, error = "Invalid token" });
        if (existing.CreatedById != userId.Value && !User.IsAdmin())
            return StatusCode(StatusCodes.Status403Forbidden, new { success = false, error = "You can only delete your own resources" });

        var (success, error) = await _resourceService.DeleteResourceAsync(id);
        if (!success) return BadRequest(new { success = false, error });
        return Ok(new { success = true, data = new { deleted = true, id } });
    }

    [HttpPut("reorder")]
    [Authorize]
    public async Task<IActionResult> Reorder([FromBody] ReorderResourcesV2Request request)
    {
        if (!User.IsAdmin())
            return StatusCode(StatusCodes.Status403Forbidden, new { success = false, error = "Admin access required" });

        var (success, error) = await _resourceService.ReorderResourcesAsync(request.Order ?? request.ResourceIds ?? Array.Empty<int>());
        if (!success) return BadRequest(new { success = false, error });
        return Ok(new { success = true, data = new { reordered = true } });
    }

    [HttpPost("categories")]
    [Authorize]
    public async Task<IActionResult> CreateCategory([FromBody] CreateResourceCategoryV2Request request)
    {
        if (!User.IsAdmin())
            return StatusCode(StatusCodes.Status403Forbidden, new { success = false, error = "Admin access required" });

        var (category, error) = await _resourceService.CreateCategoryAsync(TenantId(), request.Name, request.Description, request.ParentId);
        if (error != null) return BadRequest(new { success = false, error });
        return StatusCode(StatusCodes.Status201Created, new { success = true, data = MapCategory(category!, 0) });
    }

    [HttpPut("categories/{id:int}")]
    [Authorize]
    public async Task<IActionResult> UpdateCategory(int id, [FromBody] UpdateResourceCategoryV2Request request)
    {
        if (!User.IsAdmin())
            return StatusCode(StatusCodes.Status403Forbidden, new { success = false, error = "Admin access required" });

        var (category, error) = await _resourceService.UpdateCategoryAsync(id, request.Name, request.Description);
        if (error == "Category not found") return NotFound(new { success = false, error });
        if (error != null) return BadRequest(new { success = false, error });
        return Ok(new { success = true, data = MapCategory(category!, 0) });
    }

    [HttpDelete("categories/{id:int}")]
    [Authorize]
    public async Task<IActionResult> DeleteCategory(int id)
    {
        if (!User.IsAdmin())
            return StatusCode(StatusCodes.Status403Forbidden, new { success = false, error = "Admin access required" });

        var (success, error) = await _resourceService.DeleteCategoryAsync(id);
        if (error == "Category not found") return NotFound(new { success = false, error });
        if (!success) return BadRequest(new { success = false, error });
        return Ok(new { success = true, data = new { deleted = true, id } });
    }

    private int TenantId() => _tenantContext.GetTenantIdOrThrow();

    private object MapResource(Resource resource)
    {
        var filePath = resource.Url ?? string.Empty;
        return new
        {
            id = resource.Id,
            title = resource.Title,
            description = resource.Description ?? string.Empty,
            file_url = FileUrl(filePath),
            file_path = filePath,
            file_type = resource.ResourceType,
            file_size = 0,
            downloads = 0,
            sort_order = resource.SortOrder,
            content_type = "plain",
            content_body = (string?)null,
            created_at = resource.CreatedAt,
            uploader = new
            {
                id = resource.CreatedById,
                name = resource.CreatedBy == null
                    ? "Unknown"
                    : string.Join(' ', new[] { resource.CreatedBy.FirstName, resource.CreatedBy.LastName }.Where(p => !string.IsNullOrWhiteSpace(p))),
                avatar = AvatarUrl(resource.CreatedBy?.AvatarUrl)
            },
            category = resource.Category == null
                ? null
                : new
                {
                    id = resource.Category.Id,
                    name = resource.Category.Name,
                    color = "blue"
                },
            is_liked = false,
            likes_count = 0,
            comments_count = 0
        };
    }

    private static object MapCategory(ResourceCategory category, int resourceCount) => new
    {
        id = category.Id,
        name = category.Name,
        slug = Slugify(category.Name),
        color = "blue",
        resource_count = resourceCount
    };

    private object MapCategoryTree(
        ResourceCategory category,
        IReadOnlyDictionary<int, List<ResourceCategory>> children,
        IReadOnlyDictionary<int, int> counts) => new
        {
            id = category.Id,
            name = category.Name,
            slug = Slugify(category.Name),
            color = "blue",
            resource_count = counts.GetValueOrDefault(category.Id),
            children = children.GetValueOrDefault(category.Id, new List<ResourceCategory>())
                .Select(child => MapCategoryTree(child, children, counts))
        };

    private string FileUrl(string filePath)
    {
        if (string.IsNullOrWhiteSpace(filePath)) return string.Empty;
        if (filePath.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
            filePath.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            return filePath;
        if (filePath.StartsWith("/uploads/", StringComparison.OrdinalIgnoreCase))
            return BaseUrl() + filePath;
        return $"{BaseUrl()}/uploads/{TenantId()}/resources/{filePath.TrimStart('/')}";
    }

    private string? AvatarUrl(string? avatarUrl)
    {
        if (string.IsNullOrWhiteSpace(avatarUrl)) return null;
        if (avatarUrl.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
            avatarUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            return avatarUrl;
        return BaseUrl() + "/" + avatarUrl.TrimStart('/');
    }

    private string BaseUrl() => $"{Request.Scheme}://{Request.Host}";

    private static string Slugify(string value)
    {
        var slug = SlugUnsafeCharacters.Replace(value.Trim().ToLowerInvariant(), "-").Trim('-');
        return string.IsNullOrWhiteSpace(slug) ? "resource" : slug;
    }

    private static string EncodeCursor(int id) => Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(id.ToString()));

    private static bool TryDecodeCursor(string? cursor, out int id)
    {
        id = 0;
        if (string.IsNullOrWhiteSpace(cursor)) return false;

        if (int.TryParse(cursor, out id)) return true;

        try
        {
            var decoded = System.Text.Encoding.UTF8.GetString(Convert.FromBase64String(cursor));
            return int.TryParse(decoded, out id);
        }
        catch (FormatException)
        {
            return false;
        }
    }
}

public sealed class UpdateResourceV2Request
{
    [JsonPropertyName("title")] public string? Title { get; set; }
    [JsonPropertyName("description")] public string? Description { get; set; }
    [JsonPropertyName("url")] public string? Url { get; set; }
    [JsonPropertyName("file_path")] public string? FilePath { get; set; }
    [JsonPropertyName("resource_type")] public string? ResourceType { get; set; }
    [JsonPropertyName("file_type")] public string? FileType { get; set; }
    [JsonPropertyName("category_id")] public int? CategoryId { get; set; }
}

public sealed class ReorderResourcesV2Request
{
    [JsonPropertyName("order")] public int[]? Order { get; set; }
    [JsonPropertyName("resource_ids")] public int[]? ResourceIds { get; set; }
}

public sealed class CreateResourceCategoryV2Request
{
    [JsonPropertyName("name")] public string Name { get; set; } = string.Empty;
    [JsonPropertyName("description")] public string? Description { get; set; }
    [JsonPropertyName("parent_id")] public int? ParentId { get; set; }
}

public sealed class UpdateResourceCategoryV2Request
{
    [JsonPropertyName("name")] public string Name { get; set; } = string.Empty;
    [JsonPropertyName("description")] public string? Description { get; set; }
}
