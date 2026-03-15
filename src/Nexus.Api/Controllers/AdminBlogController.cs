// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;
using Nexus.Api.Extensions;
using Nexus.Api.Services;

namespace Nexus.Api.Controllers;

/// <summary>
/// Admin blog management endpoints - CRUD for posts and categories.
/// </summary>
[ApiController]
[Route("api/admin/blog")]
[Authorize(Policy = "AdminOnly")]
public class AdminBlogController : ControllerBase
{
    private readonly BlogService _blog;
    private readonly NexusDbContext _db;

    public AdminBlogController(BlogService blog, NexusDbContext db)
    {
        _blog = blog;
        _db = db;
    }

    /// <summary>
    /// GET /api/admin/blog - List all blog posts (including drafts) with pagination.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> ListPosts(
        [FromQuery] string? status = null,
        [FromQuery] string? search = null,
        [FromQuery] int? category_id = null,
        [FromQuery] int page = 1,
        [FromQuery] int limit = 50)
    {
        page = Math.Max(page, 1);
        limit = Math.Clamp(limit, 1, 100);

        var query = _db.Set<Entities.BlogPost>()
            .Include(p => p.Author)
            .Include(p => p.Category)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(p => p.Status == status);

        if (category_id.HasValue)
            query = query.Where(p => p.CategoryId == category_id.Value);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(p => p.Title.ToLower().Contains(s));
        }

        var total = await query.CountAsync();

        var posts = await query
            .AsNoTracking()
            .OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * limit)
            .Take(limit)
            .Select(p => new
            {
                p.Id,
                p.Title,
                p.Slug,
                p.Excerpt,
                p.Status,
                p.Tags,
                is_featured = p.IsFeatured,
                view_count = p.ViewCount,
                published_at = p.PublishedAt,
                created_at = p.CreatedAt,
                updated_at = p.UpdatedAt,
                category = p.Category != null ? new { p.Category.Id, p.Category.Name } : null,
                author = p.Author != null ? new { p.Author.Id, p.Author.FirstName, p.Author.LastName } : null
            })
            .ToListAsync();

        return Ok(new
        {
            data = posts,
            meta = new { page, limit, total }
        });
    }

    /// <summary>
    /// GET /api/admin/blog/{id} - Get a single blog post by ID (including drafts).
    /// </summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetPost(int id)
    {
        var post = await _blog.GetPostByIdAsync(id);
        if (post == null) return NotFound(new { error = "Post not found" });

        return Ok(new
        {
            data = new
            {
                post.Id,
                post.Title,
                post.Slug,
                post.Content,
                post.Excerpt,
                featured_image_url = post.FeaturedImageUrl,
                post.Status,
                post.Tags,
                is_featured = post.IsFeatured,
                view_count = post.ViewCount,
                published_at = post.PublishedAt,
                created_at = post.CreatedAt,
                updated_at = post.UpdatedAt,
                category_id = post.CategoryId,
                category = post.Category != null ? new { post.Category.Id, post.Category.Name, post.Category.Slug, post.Category.Color } : null,
                author = post.Author != null ? new { post.Author.Id, post.Author.FirstName, post.Author.LastName } : null,
                meta_title = post.MetaTitle,
                meta_description = post.MetaDescription
            }
        });
    }

    /// <summary>
    /// POST /api/admin/blog - Create a blog post.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreatePost([FromBody] CreateBlogPostRequest request)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var (post, error) = await _blog.CreatePostAsync(
            userId.Value, request.Title, request.Content, request.Excerpt,
            request.FeaturedImageUrl, request.CategoryId, request.Tags, request.Publish);

        if (error != null) return BadRequest(new { error });

        return Created($"/api/blog/{post!.Slug}", new { data = new { post.Id, post.Title, post.Slug, post.Status } });
    }

    /// <summary>
    /// PUT /api/admin/blog/{id} - Update a blog post.
    /// </summary>
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdatePost(int id, [FromBody] UpdateBlogPostRequest request)
    {
        var (post, error) = await _blog.UpdatePostAsync(
            id, request.Title, request.Content, request.Excerpt,
            request.FeaturedImageUrl, request.CategoryId, request.Tags, request.Status);

        if (error != null) return NotFound(new { error });
        return Ok(new { data = new { post!.Id, post.Title, post.Slug, post.Status } });
    }

    /// <summary>
    /// DELETE /api/admin/blog/{id} - Delete a blog post.
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeletePost(int id)
    {
        var error = await _blog.DeletePostAsync(id);
        if (error != null) return NotFound(new { error });
        return Ok(new { message = "Post deleted" });
    }

    /// <summary>
    /// POST /api/admin/blog/{id}/toggle-status - Toggle draft/published.
    /// </summary>
    [HttpPost("{id}/toggle-status")]
    public async Task<IActionResult> ToggleStatus(int id)
    {
        var (post, error) = await _blog.ToggleStatusAsync(id);
        if (error != null) return NotFound(new { error });
        return Ok(new { data = new { post!.Id, post.Status } });
    }

    /// <summary>
    /// POST /api/admin/blog/{id}/toggle-featured - Toggle featured flag.
    /// </summary>
    [HttpPost("{id}/toggle-featured")]
    public async Task<IActionResult> ToggleFeatured(int id)
    {
        var (post, error) = await _blog.ToggleFeaturedAsync(id);
        if (error != null) return NotFound(new { error });
        return Ok(new { data = new { post!.Id, is_featured = post.IsFeatured } });
    }

    /// <summary>
    /// POST /api/admin/blog/categories - Create a category.
    /// </summary>
    [HttpPost("categories")]
    public async Task<IActionResult> CreateCategory([FromBody] CreateBlogCategoryRequest request)
    {
        var (cat, error) = await _blog.CreateCategoryAsync(request.Name, request.Description, request.Color);
        if (error != null) return BadRequest(new { error });
        return Created($"/api/blog/categories", new { data = new { cat!.Id, cat.Name, cat.Slug } });
    }

    /// <summary>
    /// PUT /api/admin/blog/categories/{id} - Update a category.
    /// </summary>
    [HttpPut("categories/{id}")]
    public async Task<IActionResult> UpdateCategory(int id, [FromBody] UpdateBlogCategoryRequest request)
    {
        var (cat, error) = await _blog.UpdateCategoryAsync(id, request.Name, request.Description, request.Color);
        if (error != null) return NotFound(new { error });
        return Ok(new { data = new { cat!.Id, cat.Name, cat.Slug } });
    }

    /// <summary>
    /// DELETE /api/admin/blog/categories/{id} - Delete a category.
    /// </summary>
    [HttpDelete("categories/{id}")]
    public async Task<IActionResult> DeleteCategory(int id)
    {
        var error = await _blog.DeleteCategoryAsync(id);
        if (error != null) return NotFound(new { error });
        return Ok(new { message = "Category deleted" });
    }
}

public class CreateBlogPostRequest
{
    [JsonPropertyName("title"), MaxLength(200)]
    public string Title { get; set; } = string.Empty;
    [JsonPropertyName("content"), MaxLength(50000)]
    public string Content { get; set; } = string.Empty;
    [JsonPropertyName("excerpt"), MaxLength(500)]
    public string? Excerpt { get; set; }
    [JsonPropertyName("featured_image_url"), MaxLength(2000)]
    public string? FeaturedImageUrl { get; set; }
    [JsonPropertyName("category_id")]
    public int? CategoryId { get; set; }
    [JsonPropertyName("tags"), MaxLength(1000)]
    public string? Tags { get; set; }
    [JsonPropertyName("publish")]
    public bool Publish { get; set; } = false;
}

public class UpdateBlogPostRequest
{
    [JsonPropertyName("title"), MaxLength(200)]
    public string? Title { get; set; }
    [JsonPropertyName("content"), MaxLength(50000)]
    public string? Content { get; set; }
    [JsonPropertyName("excerpt"), MaxLength(500)]
    public string? Excerpt { get; set; }
    [JsonPropertyName("featured_image_url"), MaxLength(2000)]
    public string? FeaturedImageUrl { get; set; }
    [JsonPropertyName("category_id")]
    public int? CategoryId { get; set; }
    [JsonPropertyName("tags"), MaxLength(1000)]
    public string? Tags { get; set; }
    [JsonPropertyName("status"), MaxLength(50)]
    public string? Status { get; set; }
}

public class CreateBlogCategoryRequest
{
    [JsonPropertyName("name"), MaxLength(100)]
    public string Name { get; set; } = string.Empty;
    [JsonPropertyName("description"), MaxLength(500)]
    public string? Description { get; set; }
    [JsonPropertyName("color"), MaxLength(20)]
    public string? Color { get; set; }
}

public class UpdateBlogCategoryRequest
{
    [JsonPropertyName("name"), MaxLength(100)]
    public string? Name { get; set; }
    [JsonPropertyName("description"), MaxLength(500)]
    public string? Description { get; set; }
    [JsonPropertyName("color"), MaxLength(20)]
    public string? Color { get; set; }
}
