// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nexus.Api.Extensions;
using Nexus.Api.Services;

namespace Nexus.Api.Controllers;

/// <summary>
/// Admin CMS page management - CRUD, versioning, reorder, duplicate.
/// </summary>
[ApiController]
[Route("api/admin/pages")]
[Authorize(Roles = "admin")]
public class AdminPagesController : ControllerBase
{
    private readonly PageService _pages;

    public AdminPagesController(PageService pages)
    {
        _pages = pages;
    }

    /// <summary>
    /// GET /api/admin/pages - List all pages (including unpublished).
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAllPages()
    {
        var pages = await _pages.GetAllPagesAsync();
        return Ok(new
        {
            data = pages.Select(p => new
            {
                p.Id,
                p.Title,
                p.Slug,
                is_published = p.IsPublished,
                show_in_menu = p.ShowInMenu,
                menu_location = p.MenuLocation,
                sort_order = p.SortOrder,
                parent_id = p.ParentId,
                current_version = p.CurrentVersion,
                created_at = p.CreatedAt,
                updated_at = p.UpdatedAt,
                created_by = p.CreatedBy != null ? new { p.CreatedBy.Id, p.CreatedBy.FirstName, p.CreatedBy.LastName } : null
            })
        });
    }

    /// <summary>
    /// GET /api/admin/pages/{id} - Get page details (including unpublished).
    /// </summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetPage(int id)
    {
        var page = await _pages.GetPageByIdAsync(id);
        if (page == null) return NotFound(new { error = "Page not found" });

        return Ok(new
        {
            data = new
            {
                page.Id,
                page.Title,
                page.Slug,
                page.Content,
                is_published = page.IsPublished,
                show_in_menu = page.ShowInMenu,
                menu_location = page.MenuLocation,
                sort_order = page.SortOrder,
                parent_id = page.ParentId,
                current_version = page.CurrentVersion,
                meta_title = page.MetaTitle,
                meta_description = page.MetaDescription,
                publish_at = page.PublishAt,
                created_at = page.CreatedAt,
                updated_at = page.UpdatedAt,
                children = page.Children?.Select(c => new { c.Id, c.Title, c.Slug })
            }
        });
    }

    /// <summary>
    /// POST /api/admin/pages - Create a page.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreatePage([FromBody] CreatePageRequest request)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var (page, error) = await _pages.CreatePageAsync(
            userId.Value, request.Title, request.Content, request.IsPublished,
            request.ShowInMenu, request.MenuLocation, request.ParentId, request.PublishAt,
            request.MetaTitle, request.MetaDescription);

        if (error != null) return BadRequest(new { error });
        return Created($"/api/pages/{page!.Slug}", new { data = new { page.Id, page.Title, page.Slug } });
    }

    /// <summary>
    /// PUT /api/admin/pages/{id} - Update a page.
    /// </summary>
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdatePage(int id, [FromBody] UpdatePageRequest request)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var (page, error) = await _pages.UpdatePageAsync(
            id, userId.Value, request.Title, request.Content, request.IsPublished,
            request.ShowInMenu, request.MenuLocation, request.ParentId, request.PublishAt,
            request.MetaTitle, request.MetaDescription);

        if (error != null) return NotFound(new { error });
        return Ok(new { data = new { page!.Id, page.Title, page.Slug, current_version = page.CurrentVersion } });
    }

    /// <summary>
    /// DELETE /api/admin/pages/{id} - Delete a page.
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeletePage(int id)
    {
        var error = await _pages.DeletePageAsync(id);
        if (error != null) return NotFound(new { error });
        return Ok(new { message = "Page deleted" });
    }

    /// <summary>
    /// GET /api/admin/pages/{id}/versions - Get version history.
    /// </summary>
    [HttpGet("{id}/versions")]
    public async Task<IActionResult> GetVersions(int id)
    {
        var versions = await _pages.GetVersionsAsync(id);
        return Ok(new
        {
            data = versions.Select(v => new
            {
                v.Id,
                v.VersionNumber,
                v.Title,
                v.Slug,
                v.CreatedAt,
                created_by = v.CreatedBy != null ? new { v.CreatedBy.Id, v.CreatedBy.FirstName, v.CreatedBy.LastName } : null
            })
        });
    }

    /// <summary>
    /// POST /api/admin/pages/{id}/revert - Revert to a specific version.
    /// </summary>
    [HttpPost("{id}/revert")]
    public async Task<IActionResult> RevertToVersion(int id, [FromBody] RevertRequest request)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var (page, error) = await _pages.RevertToVersionAsync(id, request.VersionNumber, userId.Value);
        if (error != null) return NotFound(new { error });
        return Ok(new { data = new { page!.Id, page.Title, current_version = page.CurrentVersion } });
    }

    /// <summary>
    /// POST /api/admin/pages/{id}/duplicate - Duplicate a page.
    /// </summary>
    [HttpPost("{id}/duplicate")]
    public async Task<IActionResult> DuplicatePage(int id)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var (page, error) = await _pages.DuplicatePageAsync(id, userId.Value);
        if (error != null) return NotFound(new { error });
        return Created($"/api/pages/{page!.Slug}", new { data = new { page.Id, page.Title, page.Slug } });
    }

    /// <summary>
    /// PUT /api/admin/pages/reorder - Reorder pages.
    /// </summary>
    [HttpPut("reorder")]
    public async Task<IActionResult> ReorderPages([FromBody] ReorderPagesRequest request)
    {
        var ordering = request.Pages.Select(p => (p.Id, p.SortOrder)).ToList();
        var error = await _pages.ReorderPagesAsync(ordering);
        if (error != null) return BadRequest(new { error });
        return Ok(new { message = "Pages reordered" });
    }
}

public class CreatePageRequest
{
    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;
    [JsonPropertyName("content")]
    public string Content { get; set; } = string.Empty;
    [JsonPropertyName("is_published")]
    public bool IsPublished { get; set; } = false;
    [JsonPropertyName("show_in_menu")]
    public bool ShowInMenu { get; set; } = false;
    [JsonPropertyName("menu_location")]
    public string? MenuLocation { get; set; }
    [JsonPropertyName("parent_id")]
    public int? ParentId { get; set; }
    [JsonPropertyName("publish_at")]
    public DateTime? PublishAt { get; set; }
    [JsonPropertyName("meta_title")]
    public string? MetaTitle { get; set; }
    [JsonPropertyName("meta_description")]
    public string? MetaDescription { get; set; }
}

public class UpdatePageRequest
{
    [JsonPropertyName("title")]
    public string? Title { get; set; }
    [JsonPropertyName("content")]
    public string? Content { get; set; }
    [JsonPropertyName("is_published")]
    public bool? IsPublished { get; set; }
    [JsonPropertyName("show_in_menu")]
    public bool? ShowInMenu { get; set; }
    [JsonPropertyName("menu_location")]
    public string? MenuLocation { get; set; }
    [JsonPropertyName("parent_id")]
    public int? ParentId { get; set; }
    [JsonPropertyName("publish_at")]
    public DateTime? PublishAt { get; set; }
    [JsonPropertyName("meta_title")]
    public string? MetaTitle { get; set; }
    [JsonPropertyName("meta_description")]
    public string? MetaDescription { get; set; }
}

public class RevertRequest
{
    [JsonPropertyName("version_number")]
    public int VersionNumber { get; set; }
}

public class ReorderPagesRequest
{
    [JsonPropertyName("pages")]
    public List<PageOrderItem> Pages { get; set; } = new();
}

public class PageOrderItem
{
    [JsonPropertyName("id")]
    public int Id { get; set; }
    [JsonPropertyName("sort_order")]
    public int SortOrder { get; set; }
}
