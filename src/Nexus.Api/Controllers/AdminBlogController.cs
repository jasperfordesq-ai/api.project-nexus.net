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
/// Admin blog management endpoints - CRUD for posts and categories.
/// </summary>
[ApiController]
[Route("api/admin/blog")]
[Authorize(Policy = "AdminOnly")]
public class AdminBlogController : ControllerBase
{
    private readonly BlogService _blog;

    public AdminBlogController(BlogService blog)
    {
        _blog = blog;
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
    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;
    [JsonPropertyName("content")]
    public string Content { get; set; } = string.Empty;
    [JsonPropertyName("excerpt")]
    public string? Excerpt { get; set; }
    [JsonPropertyName("featured_image_url")]
    public string? FeaturedImageUrl { get; set; }
    [JsonPropertyName("category_id")]
    public int? CategoryId { get; set; }
    [JsonPropertyName("tags")]
    public string? Tags { get; set; }
    [JsonPropertyName("publish")]
    public bool Publish { get; set; } = false;
}

public class UpdateBlogPostRequest
{
    [JsonPropertyName("title")]
    public string? Title { get; set; }
    [JsonPropertyName("content")]
    public string? Content { get; set; }
    [JsonPropertyName("excerpt")]
    public string? Excerpt { get; set; }
    [JsonPropertyName("featured_image_url")]
    public string? FeaturedImageUrl { get; set; }
    [JsonPropertyName("category_id")]
    public int? CategoryId { get; set; }
    [JsonPropertyName("tags")]
    public string? Tags { get; set; }
    [JsonPropertyName("status")]
    public string? Status { get; set; }
}

public class CreateBlogCategoryRequest
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;
    [JsonPropertyName("description")]
    public string? Description { get; set; }
    [JsonPropertyName("color")]
    public string? Color { get; set; }
}

public class UpdateBlogCategoryRequest
{
    [JsonPropertyName("name")]
    public string? Name { get; set; }
    [JsonPropertyName("description")]
    public string? Description { get; set; }
    [JsonPropertyName("color")]
    public string? Color { get; set; }
}
