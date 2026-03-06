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
/// Newsletter controller - public subscribe/unsubscribe and admin newsletter management.
/// Phase 31: Newsletter system.
/// </summary>
[ApiController]
public class NewsletterController : ControllerBase
{
    private readonly NewsletterService _newsletterService;
    private readonly ILogger<NewsletterController> _logger;

    public NewsletterController(
        NewsletterService newsletterService,
        ILogger<NewsletterController> logger)
    {
        _newsletterService = newsletterService;
        _logger = logger;
    }

    private int? GetCurrentUserId() => User.GetUserId();

    #region Public Endpoints

    /// <summary>
    /// POST /api/newsletter/subscribe - Subscribe to the newsletter.
    /// No authentication required.
    /// </summary>
    [HttpPost("api/newsletter/subscribe")]
    [AllowAnonymous]
    public async Task<IActionResult> Subscribe([FromBody] SubscribeRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
        {
            return BadRequest(new { error = "Email is required" });
        }

        try
        {
            var userId = GetCurrentUserId();
            var subscription = await _newsletterService.SubscribeAsync(
                request.Email, userId, request.Source);

            return Ok(new
            {
                message = "Successfully subscribed to newsletter",
                email = subscription.Email,
                subscribed_at = subscription.SubscribedAt
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error subscribing email {Email}", request.Email);
            return StatusCode(500, new { error = "Failed to subscribe" });
        }
    }

    /// <summary>
    /// POST /api/newsletter/unsubscribe - Unsubscribe from the newsletter.
    /// No authentication required.
    /// </summary>
    [HttpPost("api/newsletter/unsubscribe")]
    [AllowAnonymous]
    public async Task<IActionResult> Unsubscribe([FromBody] UnsubscribeRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
        {
            return BadRequest(new { error = "Email is required" });
        }

        try
        {
            var result = await _newsletterService.UnsubscribeAsync(request.Email);

            if (!result)
            {
                return NotFound(new { error = "Subscription not found" });
            }

            return Ok(new { message = "Successfully unsubscribed from newsletter" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error unsubscribing email {Email}", request.Email);
            return StatusCode(500, new { error = "Failed to unsubscribe" });
        }
    }

    #endregion

    #region Admin Endpoints

    /// <summary>
    /// GET /api/admin/newsletter - List all newsletters.
    /// </summary>
    [HttpGet("api/admin/newsletter")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> ListNewsletters(
        [FromQuery] string? status = null,
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20)
    {
        Entities.NewsletterStatus? parsedStatus = null;
        if (!string.IsNullOrEmpty(status) &&
            Enum.TryParse<Entities.NewsletterStatus>(status, ignoreCase: true, out var s))
        {
            parsedStatus = s;
        }

        var (items, total) = await _newsletterService.GetNewslettersAsync(parsedStatus, page, limit);

        return Ok(new
        {
            newsletters = items.Select(n => MapNewsletter(n)),
            total,
            page,
            limit
        });
    }

    /// <summary>
    /// GET /api/admin/newsletter/{id} - Get a specific newsletter.
    /// </summary>
    [HttpGet("api/admin/newsletter/{id}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> GetNewsletter(int id)
    {
        var newsletter = await _newsletterService.GetNewsletterAsync(id);
        if (newsletter == null)
        {
            return NotFound(new { error = "Newsletter not found" });
        }

        return Ok(MapNewsletter(newsletter));
    }

    /// <summary>
    /// POST /api/admin/newsletter - Create a new newsletter.
    /// </summary>
    [HttpPost("api/admin/newsletter")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> CreateNewsletter([FromBody] CreateNewsletterRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Subject))
        {
            return BadRequest(new { error = "Subject is required" });
        }
        if (string.IsNullOrWhiteSpace(request.ContentHtml))
        {
            return BadRequest(new { error = "Content HTML is required" });
        }

        var adminId = GetCurrentUserId();
        if (adminId == null) return Unauthorized(new { error = "Invalid token" });

        try
        {
            var newsletter = await _newsletterService.CreateNewsletterAsync(
                adminId.Value,
                request.Subject,
                request.ContentHtml,
                request.ContentText,
                request.ScheduledAt);

            return CreatedAtAction(nameof(GetNewsletter), new { id = newsletter.Id }, MapNewsletter(newsletter));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating newsletter");
            return StatusCode(500, new { error = "Failed to create newsletter" });
        }
    }

    /// <summary>
    /// PUT /api/admin/newsletter/{id} - Update a newsletter.
    /// </summary>
    [HttpPut("api/admin/newsletter/{id}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> UpdateNewsletter(int id, [FromBody] UpdateNewsletterRequest request)
    {
        try
        {
            var newsletter = await _newsletterService.UpdateNewsletterAsync(
                id,
                request.Subject,
                request.ContentHtml,
                request.ContentText,
                request.ScheduledAt);

            if (newsletter == null)
            {
                return NotFound(new { error = "Newsletter not found" });
            }

            return Ok(MapNewsletter(newsletter));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating newsletter {Id}", id);
            return StatusCode(500, new { error = "Failed to update newsletter" });
        }
    }

    /// <summary>
    /// POST /api/admin/newsletter/{id}/send - Send a newsletter.
    /// </summary>
    [HttpPost("api/admin/newsletter/{id}/send")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> SendNewsletter(int id)
    {
        try
        {
            var newsletter = await _newsletterService.SendNewsletterAsync(id);
            if (newsletter == null)
            {
                return NotFound(new { error = "Newsletter not found" });
            }

            return Ok(new
            {
                message = "Newsletter sent successfully",
                newsletter = MapNewsletter(newsletter)
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending newsletter {Id}", id);
            return StatusCode(500, new { error = "Failed to send newsletter" });
        }
    }

    /// <summary>
    /// PUT /api/admin/newsletter/{id}/cancel - Cancel a newsletter.
    /// </summary>
    [HttpPut("api/admin/newsletter/{id}/cancel")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> CancelNewsletter(int id)
    {
        try
        {
            var newsletter = await _newsletterService.CancelNewsletterAsync(id);
            if (newsletter == null)
            {
                return NotFound(new { error = "Newsletter not found" });
            }

            return Ok(new
            {
                message = "Newsletter cancelled",
                newsletter = MapNewsletter(newsletter)
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error cancelling newsletter {Id}", id);
            return StatusCode(500, new { error = "Failed to cancel newsletter" });
        }
    }

    /// <summary>
    /// GET /api/admin/newsletter/subscribers - List newsletter subscribers.
    /// </summary>
    [HttpGet("api/admin/newsletter/subscribers")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> ListSubscribers(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20,
        [FromQuery] bool? subscribed_only = null)
    {
        var (items, total) = await _newsletterService.GetSubscribersAsync(page, limit, subscribed_only);

        return Ok(new
        {
            subscribers = items.Select(s => new
            {
                s.Id,
                s.Email,
                user_id = s.UserId,
                is_subscribed = s.IsSubscribed,
                subscribed_at = s.SubscribedAt,
                unsubscribed_at = s.UnsubscribedAt,
                s.Source,
                created_at = s.CreatedAt
            }),
            total,
            page,
            limit
        });
    }

    /// <summary>
    /// GET /api/admin/newsletter/stats - Get subscription statistics.
    /// </summary>
    [HttpGet("api/admin/newsletter/stats")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> GetStats()
    {
        var stats = await _newsletterService.GetSubscriptionStatsAsync();

        return Ok(new
        {
            total = stats.Total,
            active = stats.Active,
            unsubscribed = stats.Unsubscribed
        });
    }

    #endregion

    #region Helpers

    private static object MapNewsletter(Entities.Newsletter n) => new
    {
        n.Id,
        n.Subject,
        content_html = n.ContentHtml,
        content_text = n.ContentText,
        status = n.Status.ToString().ToLowerInvariant(),
        scheduled_at = n.ScheduledAt,
        sent_at = n.SentAt,
        created_by_id = n.CreatedById,
        created_by_name = n.CreatedBy != null ? $"{n.CreatedBy.FirstName} {n.CreatedBy.LastName}" : null,
        recipient_count = n.RecipientCount,
        open_count = n.OpenCount,
        click_count = n.ClickCount,
        created_at = n.CreatedAt,
        updated_at = n.UpdatedAt
    };

    #endregion
}

#region Request DTOs

public class SubscribeRequest
{
    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;

    [JsonPropertyName("source")]
    public string? Source { get; set; }
}

public class UnsubscribeRequest
{
    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;
}

public class CreateNewsletterRequest
{
    [JsonPropertyName("subject")]
    public string Subject { get; set; } = string.Empty;

    [JsonPropertyName("content_html")]
    public string ContentHtml { get; set; } = string.Empty;

    [JsonPropertyName("content_text")]
    public string? ContentText { get; set; }

    [JsonPropertyName("scheduled_at")]
    public DateTime? ScheduledAt { get; set; }
}

public class UpdateNewsletterRequest
{
    [JsonPropertyName("subject")]
    public string? Subject { get; set; }

    [JsonPropertyName("content_html")]
    public string? ContentHtml { get; set; }

    [JsonPropertyName("content_text")]
    public string? ContentText { get; set; }

    [JsonPropertyName("scheduled_at")]
    public DateTime? ScheduledAt { get; set; }
}

#endregion
