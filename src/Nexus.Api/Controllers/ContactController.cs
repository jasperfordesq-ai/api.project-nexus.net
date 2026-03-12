// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;
using Nexus.Api.Entities;
using Nexus.Api.Extensions;

namespace Nexus.Api.Controllers;

[ApiController]
[Route("api")]
public class ContactController : ControllerBase
{
    private readonly NexusDbContext _db;
    private readonly TenantContext _tenant;
    private readonly ILogger<ContactController> _logger;

    public ContactController(NexusDbContext db, TenantContext tenant, ILogger<ContactController> logger)
    {
        _db = db;
        _tenant = tenant;
        _logger = logger;
    }

    /// <summary>POST /api/contact - Submit a contact form (public or authenticated).</summary>
    [HttpPost("contact")]
    public async Task<IActionResult> Submit([FromBody] ContactRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.Subject) || string.IsNullOrWhiteSpace(request.Message))
            return BadRequest(new { error = "Name, email, subject, and message are required" });

        var tenantId = _tenant.GetTenantIdOrThrow();
        var userId = User.GetUserId();

        var submission = new ContactSubmission
        {
            TenantId = tenantId,
            Name = request.Name.Trim(),
            Email = request.Email.Trim().ToLower(),
            Subject = request.Subject.Trim(),
            Message = request.Message.Trim(),
            Category = request.Category,
            UserId = userId
        };

        _db.ContactSubmissions.Add(submission);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Contact form submitted: {Subject} from {Email}", submission.Subject, submission.Email);
        return Ok(new { success = true, message = "Your message has been received. We will respond shortly.", id = submission.Id });
    }

    /// <summary>GET /api/admin/contact - List contact submissions (admin).</summary>
    [HttpGet("admin/contact")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> List(
        [FromQuery] int page = 1, [FromQuery] int limit = 20,
        [FromQuery] bool unresolved_only = false,
        [FromQuery] string? category = null)
    {
        page = Math.Max(page, 1);
        limit = Math.Clamp(limit, 1, 100);

        var tenantId = _tenant.GetTenantIdOrThrow();
        var query = _db.ContactSubmissions.AsNoTracking().Where(c => c.TenantId == tenantId);

        if (unresolved_only) query = query.Where(c => !c.IsResolved);
        if (!string.IsNullOrEmpty(category)) query = query.Where(c => c.Category == category);

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(c => c.CreatedAt)
            .Skip((page - 1) * limit).Take(limit)
            .Select(c => new
            {
                c.Id, c.Name, c.Email, c.Subject, c.Category,
                c.IsResolved, c.ResolvedAt, c.CreatedAt,
                user_id = c.UserId,
                message_preview = c.Message.Length > 100 ? c.Message.Substring(0, 100) + "..." : c.Message
            })
            .ToListAsync();

        return Ok(new { data = items, total, page, limit });
    }

    /// <summary>GET /api/admin/contact/{id} - Get full contact submission (admin).</summary>
    [HttpGet("admin/contact/{id}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Get(int id)
    {
        var tenantId = _tenant.GetTenantIdOrThrow();
        var item = await _db.ContactSubmissions.AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == id && c.TenantId == tenantId);
        if (item == null) return NotFound(new { error = "Not found" });
        return Ok(item);
    }

    /// <summary>PUT /api/admin/contact/{id}/resolve - Mark as resolved (admin).</summary>
    [HttpPut("admin/contact/{id}/resolve")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Resolve(int id, [FromBody] ResolveContactRequest request)
    {
        var tenantId = _tenant.GetTenantIdOrThrow();
        var item = await _db.ContactSubmissions.FirstOrDefaultAsync(c => c.Id == id && c.TenantId == tenantId);
        if (item == null) return NotFound(new { error = "Not found" });

        item.IsResolved = true;
        item.ResolvedAt = DateTime.UtcNow;
        item.ResolvedById = User.GetUserId();
        item.ResolvedNote = request.Note;
        await _db.SaveChangesAsync();

        return Ok(new { success = true, message = "Marked as resolved" });
    }

    /// <summary>DELETE /api/admin/contact/{id} - Delete submission (admin).</summary>
    [HttpDelete("admin/contact/{id}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Delete(int id)
    {
        var tenantId = _tenant.GetTenantIdOrThrow();
        var item = await _db.ContactSubmissions.FirstOrDefaultAsync(c => c.Id == id && c.TenantId == tenantId);
        if (item == null) return NotFound(new { error = "Not found" });

        _db.ContactSubmissions.Remove(item);
        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }
}

public class ContactRequest
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? Category { get; set; }
}

public class ResolveContactRequest
{
    public string? Note { get; set; }
}
