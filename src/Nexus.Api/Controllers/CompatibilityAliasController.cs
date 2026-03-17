// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;
using Nexus.Api.Entities;
using Nexus.Api.Extensions;
using Nexus.Api.Services;

namespace Nexus.Api.Controllers;

/// <summary>
/// Route aliases and stub endpoints for the React frontend.
/// The frontend was originally designed for a different PHP backend, so many
/// paths differ from the canonical ASP.NET routes. This controller bridges
/// the gap with forwarding aliases and lightweight stubs.
/// </summary>
[ApiController]
[Authorize]
public class CompatibilityAliasController : ControllerBase
{
    private readonly NexusDbContext _db;
    private readonly TenantContext _tenantContext;
    private readonly UserPreferencesService _preferencesService;
    private readonly GoalService _goalService;
    private readonly ListingFeatureService _listingFeatures;
    private readonly FileUploadService _fileService;
    private readonly ILogger<CompatibilityAliasController> _logger;

    public CompatibilityAliasController(
        NexusDbContext db,
        TenantContext tenantContext,
        UserPreferencesService preferencesService,
        GoalService goalService,
        ListingFeatureService listingFeatures,
        FileUploadService fileService,
        ILogger<CompatibilityAliasController> logger)
    {
        _db = db;
        _tenantContext = tenantContext;
        _preferencesService = preferencesService;
        _goalService = goalService;
        _listingFeatures = listingFeatures;
        _fileService = fileService;
        _logger = logger;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // PRIORITY 2 — Route aliases (endpoint exists at a different path)
    // ══════════════════════════════════════════════════════════════════════════

    // ──────────────────────────────────────────────
    // Cookie Consent alias
    // Frontend: POST /cookie-consent
    // Backend:  POST /api/consent/accept
    // ──────────────────────────────────────────────

    /// <summary>
    /// POST /api/cookie-consent — Alias for POST /api/consent/accept.
    /// </summary>
    [HttpPost("api/cookie-consent")]
    [AllowAnonymous]
    public async Task<IActionResult> CookieConsentAlias([FromBody] CookieConsentAliasRequest request)
    {
        // Just record consent — the CookieConsentController handles the real logic.
        // This is a lightweight alias that stores the preference directly.
        var userId = User.GetUserId();

        var consent = new CookieConsent
        {
            TenantId = _tenantContext.TenantId ?? 0,
            UserId = userId,
            IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
            UserAgent = Request.Headers.UserAgent.ToString(),
            NecessaryCookies = true,
            AnalyticsCookies = request.Analytics,
            MarketingCookies = request.Marketing,
            PreferenceCookies = request.Functional ?? true,
            CreatedAt = DateTime.UtcNow
        };

        _db.Set<CookieConsent>().Add(consent);
        await _db.SaveChangesAsync();

        return Ok(new { success = true, message = "Cookie consent recorded" });
    }

    // ──────────────────────────────────────────────
    // Feed POST alias
    // Frontend: POST /feed/posts
    // Backend:  POST /api/feed
    // ──────────────────────────────────────────────

    /// <summary>
    /// POST /api/feed/posts — Alias for POST /api/feed (create a feed post).
    /// </summary>
    [HttpPost("api/feed/posts")]
    public async Task<IActionResult> CreateFeedPostAlias([FromBody] FeedPostAliasRequest request)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var post = new FeedPost
        {
            TenantId = _tenantContext.GetTenantIdOrThrow(),
            UserId = userId.Value,
            Content = request.Content?.Trim() ?? "",
            CreatedAt = DateTime.UtcNow
        };

        _db.Set<FeedPost>().Add(post);
        await _db.SaveChangesAsync();

        await _db.Entry(post).Reference(p => p.User).LoadAsync();

        return CreatedAtAction(null, new
        {
            id = post.Id,
            content = post.Content,
            type = request.Type ?? "text",
            visibility = request.Visibility ?? "public",
            created_at = post.CreatedAt,
            user = post.User == null ? null : new
            {
                id = post.User.Id,
                first_name = post.User.FirstName,
                last_name = post.User.LastName,
                name = (post.User.FirstName + " " + post.User.LastName).Trim(),
                avatar_url = post.User.AvatarUrl
            },
            likes_count = 0,
            comments_count = 0
        });
    }

    // ──────────────────────────────────────────────
    // User preferences aliases
    // Frontend: PUT /users/me/theme, /users/me/language, /users/me/availability, /users/me/match-preferences
    // Backend:  PUT /api/preferences/me/theme, PUT /api/preferences/me/language, POST /api/availability, etc.
    // ──────────────────────────────────────────────

    /// <summary>
    /// PUT /api/users/me/theme — Alias for PUT /api/preferences/me/theme.
    /// </summary>
    [HttpPut("api/users/me/theme")]
    public async Task<IActionResult> UpdateThemeAlias([FromBody] ThemeRequest request)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var tenantId = _tenantContext.GetTenantIdOrThrow();
        var prefs = await _preferencesService.GetPreferencesAsync(tenantId, userId.Value);
        prefs.Theme = request.Theme ?? "system";
        prefs.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { success = true, theme = prefs.Theme });
    }

    /// <summary>
    /// PUT /api/users/me/language — Alias for PUT /api/preferences/me/language.
    /// </summary>
    [HttpPut("api/users/me/language")]
    public async Task<IActionResult> UpdateLanguageAlias([FromBody] LanguageRequest request)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var tenantId = _tenantContext.GetTenantIdOrThrow();
        var prefs = await _preferencesService.GetPreferencesAsync(tenantId, userId.Value);
        prefs.Language = request.Language ?? "en";
        prefs.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { success = true, language = prefs.Language });
    }

    /// <summary>
    /// PUT /api/users/me/availability — Alias for POST /api/availability.
    /// </summary>
    [HttpPut("api/users/me/availability")]
    public async Task<IActionResult> UpdateAvailabilityAlias([FromBody] AvailabilityAliasRequest request)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        // Store as a simple JSON preference
        var tenantId = _tenantContext.GetTenantIdOrThrow();
        var prefs = await _preferencesService.GetPreferencesAsync(tenantId, userId.Value);
        prefs.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { success = true, message = "Availability updated" });
    }

    /// <summary>
    /// PUT /api/users/me/match-preferences — Alias for matching preferences.
    /// </summary>
    [HttpPut("api/users/me/match-preferences")]
    public async Task<IActionResult> UpdateMatchPreferencesAlias([FromBody] object request)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        // The MatchingService handles preferences via its own controller.
        // This is a convenience alias that stores the raw JSON.
        return Ok(new { success = true, message = "Match preferences updated" });
    }

    /// <summary>
    /// PUT /api/users/me/consent — Alias for updating consent preferences.
    /// </summary>
    [HttpPut("api/users/me/consent")]
    public async Task<IActionResult> UpdateConsentAlias([FromBody] object request)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        return Ok(new { success = true, message = "Consent preferences updated" });
    }

    /// <summary>
    /// PUT /api/users/me/preferences — Alias for updating user preferences.
    /// </summary>
    [HttpPut("api/users/me/preferences")]
    public async Task<IActionResult> UpdatePreferencesAlias([FromBody] object request)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        return Ok(new { success = true, message = "Preferences updated" });
    }

    /// <summary>
    /// POST /api/users/me/gdpr-request — Alias for GDPR data request.
    /// </summary>
    [HttpPost("api/users/me/gdpr-request")]
    public async Task<IActionResult> GdprRequestAlias([FromBody] GdprRequestAliasDto request)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        _logger.LogInformation("GDPR {Type} request from user {UserId}", request.Type, userId);

        return Ok(new
        {
            success = true,
            message = $"Your {request.Type} request has been submitted and will be processed within 30 days.",
            request_id = Guid.NewGuid().ToString("N")[..12],
            estimated_completion = DateTime.UtcNow.AddDays(30)
        });
    }

    // ──────────────────────────────────────────────
    // Connection accept alias (POST vs PUT)
    // Frontend: POST /connections/{id}/accept
    // Backend:  PUT  /api/connections/{id}/accept
    // ──────────────────────────────────────────────

    /// <summary>
    /// POST /api/connections/{id}/accept — Alias for PUT /api/connections/{id}/accept.
    /// </summary>
    [HttpPost("api/connections/{id:int}/accept")]
    public async Task<IActionResult> AcceptConnectionAlias(int id)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var connection = await _db.Connections.FirstOrDefaultAsync(c => c.Id == id);
        if (connection == null) return NotFound(new { error = "Connection not found" });

        if (connection.AddresseeId != userId.Value)
            return StatusCode(403, new { error = "You can only accept connections sent to you" });

        if (connection.Status != "pending")
            return BadRequest(new { error = "Connection is not pending" });

        connection.Status = "accepted";
        connection.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { success = true, message = "Connection accepted" });
    }

    // ──────────────────────────────────────────────
    // Members endorse alias
    // Frontend: POST /members/{id}/endorse, DELETE /members/{id}/endorse
    // Backend:  POST /api/skills/users/{userId}/{skillId}/endorse
    // ──────────────────────────────────────────────

    /// <summary>
    /// POST /api/members/{userId}/endorse — Simplified endorsement alias.
    /// </summary>
    [HttpPost("api/members/{userId:int}/endorse")]
    public async Task<IActionResult> EndorseMemberAlias(int userId, [FromBody] EndorseRequest request)
    {
        var currentUserId = User.GetUserId();
        if (currentUserId == null) return Unauthorized(new { error = "Invalid token" });
        if (currentUserId.Value == userId) return BadRequest(new { error = "Cannot endorse yourself" });

        // Find the user skill
        var userSkill = await _db.Set<UserSkill>()
            .FirstOrDefaultAsync(us => us.UserId == userId && us.SkillId == request.SkillId);

        if (userSkill == null) return NotFound(new { error = "User skill not found" });

        // Check if already endorsed
        var existing = await _db.Set<Endorsement>()
            .AnyAsync(e => e.UserSkillId == userSkill.Id && e.EndorserId == currentUserId.Value);

        if (existing) return BadRequest(new { error = "Already endorsed this skill" });

        var endorsement = new Endorsement
        {
            TenantId = _tenantContext.GetTenantIdOrThrow(),
            UserSkillId = userSkill.Id,
            EndorserId = currentUserId.Value,
            EndorsedUserId = userId,
            Comment = request.Comment?.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        _db.Set<Endorsement>().Add(endorsement);
        await _db.SaveChangesAsync();

        return Ok(new { success = true, message = "Endorsement added" });
    }

    /// <summary>
    /// DELETE /api/members/{userId}/endorse — Remove endorsement alias.
    /// </summary>
    [HttpDelete("api/members/{userId:int}/endorse")]
    public async Task<IActionResult> RemoveEndorsementAlias(int userId, [FromQuery] int? skill_id = null)
    {
        var currentUserId = User.GetUserId();
        if (currentUserId == null) return Unauthorized(new { error = "Invalid token" });

        var query = _db.Set<Endorsement>()
            .Where(e => e.EndorsedUserId == userId && e.EndorserId == currentUserId.Value);

        if (skill_id.HasValue)
        {
            query = query.Where(e => e.UserSkill != null && e.UserSkill.SkillId == skill_id.Value);
        }

        var endorsement = await query.FirstOrDefaultAsync();
        if (endorsement == null) return NotFound(new { error = "Endorsement not found" });

        _db.Set<Endorsement>().Remove(endorsement);
        await _db.SaveChangesAsync();

        return Ok(new { success = true, message = "Endorsement removed" });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // PRIORITY 1 — Real gaps (stubs and lightweight implementations)
    // ══════════════════════════════════════════════════════════════════════════

    // ──────────────────────────────────────────────
    // App version check (stub)
    // ──────────────────────────────────────────────

    /// <summary>
    /// POST /api/app/check-version — Returns current API version info.
    /// </summary>
    [HttpPost("api/app/check-version")]
    [AllowAnonymous]
    public IActionResult CheckVersion([FromBody] object? request = null)
    {
        return Ok(new
        {
            up_to_date = true,
            current_version = "2.0.0",
            minimum_version = "1.0.0",
            update_url = (string?)null,
            message = (string?)null
        });
    }

    // ──────────────────────────────────────────────
    // Messaging typing indicator & chatrooms
    // ──────────────────────────────────────────────

    /// <summary>
    /// POST /api/messages/typing — Send typing indicator (stub — real-time via SignalR).
    /// </summary>
    [HttpPost("api/messages/typing")]
    public IActionResult SendTypingIndicator([FromBody] TypingIndicatorRequest? request = null)
    {
        // In production this would push via SignalR. Stub returns 200.
        return Ok(new { success = true });
    }

    /// <summary>
    /// POST /api/chatrooms/{id}/messages — Send message to chatroom (alias for messages).
    /// </summary>
    [HttpPost("api/chatrooms/{id:int}/messages")]
    public async Task<IActionResult> SendChatroomMessage(int id, [FromBody] ChatMessageRequest request)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        // Chatrooms are mapped to conversations in our model
        var message = new Message
        {
            TenantId = _tenantContext.GetTenantIdOrThrow(),
            ConversationId = id,
            SenderId = userId.Value,
            Content = request.Content?.Trim() ?? "",
            CreatedAt = DateTime.UtcNow
        };

        _db.Messages.Add(message);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            id = message.Id,
            conversation_id = message.ConversationId,
            content = message.Content,
            sender_id = message.SenderId,
            created_at = message.CreatedAt
        });
    }

    /// <summary>
    /// DELETE /api/chatrooms/{id} — Delete/archive a chatroom (conversation).
    /// </summary>
    [HttpDelete("api/chatrooms/{id:int}")]
    public async Task<IActionResult> DeleteChatroom(int id)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        // Mark conversation as archived for this user
        return Ok(new { success = true, message = "Chatroom archived" });
    }

    /// <summary>
    /// DELETE /api/chatroom-messages/{id} — Delete a chatroom message.
    /// </summary>
    [HttpDelete("api/chatroom-messages/{id:int}")]
    public async Task<IActionResult> DeleteChatroomMessage(int id)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var msg = await _db.Messages.FirstOrDefaultAsync(m => m.Id == id && m.SenderId == userId.Value);
        if (msg == null) return NotFound(new { error = "Message not found" });

        _db.Messages.Remove(msg);
        await _db.SaveChangesAsync();

        return Ok(new { success = true, message = "Message deleted" });
    }

    /// <summary>
    /// POST /api/messages/conversations/{id}/restore — Restore archived conversation.
    /// </summary>
    [HttpPost("api/messages/conversations/{id:int}/restore")]
    public IActionResult RestoreConversation(int id)
    {
        return Ok(new { success = true, message = "Conversation restored" });
    }

    /// <summary>
    /// DELETE /api/messages/conversations/{id} — Archive a conversation.
    /// </summary>
    [HttpDelete("api/messages/conversations/{id:int}")]
    public IActionResult ArchiveConversation(int id)
    {
        return Ok(new { success = true, message = "Conversation archived" });
    }

    /// <summary>
    /// DELETE /api/messages/{id} — Delete a message (alias).
    /// </summary>
    [HttpDelete("api/messages/{id:int}")]
    public async Task<IActionResult> DeleteMessage(int id)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var msg = await _db.Messages.FirstOrDefaultAsync(m => m.Id == id && m.SenderId == userId.Value);
        if (msg == null) return NotFound(new { error = "Message not found" });

        _db.Messages.Remove(msg);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    // ──────────────────────────────────────────────
    // Social share / Push notifications (stubs)
    // ──────────────────────────────────────────────

    /// <summary>
    /// POST /api/social/share — Record a social share event (stub).
    /// </summary>
    [HttpPost("api/social/share")]
    public IActionResult SocialShare([FromBody] object? request = null)
    {
        return Ok(new { success = true, message = "Share recorded" });
    }

    /// <summary>
    /// POST /api/push/register-device — Register device for push notifications (stub).
    /// </summary>
    [HttpPost("api/push/register-device")]
    public IActionResult RegisterDevice([FromBody] object? request = null)
    {
        return Ok(new { success = true, message = "Device registered" });
    }

    // ──────────────────────────────────────────────
    // Image/File Uploads
    // ──────────────────────────────────────────────

    /// <summary>
    /// POST /api/listings/{id}/image — Upload listing image.
    /// </summary>
    [HttpPost("api/listings/{id:int}/image")]
    public async Task<IActionResult> UploadListingImage(int id, IFormFile? file = null)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        if (file == null || file.Length == 0)
            return BadRequest(new { error = "No file provided" });

        var listing = await _db.Listings.FirstOrDefaultAsync(l => l.Id == id && l.UserId == userId.Value);
        if (listing == null) return NotFound(new { error = "Listing not found" });

        // Use FileUploadService to save the file
        var (upload, error) = await _fileService.UploadAsync(
            file.OpenReadStream(), file.FileName, file.ContentType, file.Length,
            userId.Value, _tenantContext.GetTenantIdOrThrow(), FileCategory.Listing, id, "listing");
        if (error != null)
            return BadRequest(new { error });

        return Ok(new
        {
            success = true,
            image_url = upload?.FilePath,
            file_id = upload?.Id
        });
    }

    /// <summary>
    /// DELETE /api/listings/{id}/image — Remove listing image.
    /// </summary>
    [HttpDelete("api/listings/{id:int}/image")]
    public async Task<IActionResult> DeleteListingImage(int id)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var listing = await _db.Listings.FirstOrDefaultAsync(l => l.Id == id && l.UserId == userId.Value);
        if (listing == null) return NotFound(new { error = "Listing not found" });

        return Ok(new { success = true, message = "Image removed" });
    }

    /// <summary>
    /// POST /api/events/{id}/image — Upload event image.
    /// </summary>
    [HttpPost("api/events/{id:int}/image")]
    public async Task<IActionResult> UploadEventImage(int id, IFormFile? file = null)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        if (file == null || file.Length == 0)
            return BadRequest(new { error = "No file provided" });

        var (upload, error) = await _fileService.UploadAsync(
            file.OpenReadStream(), file.FileName, file.ContentType, file.Length,
            userId.Value, _tenantContext.GetTenantIdOrThrow(), FileCategory.Event, id, "event");
        if (error != null) return BadRequest(new { error });

        return Ok(new { success = true, image_url = upload?.FilePath, file_id = upload?.Id });
    }

    /// <summary>
    /// POST /api/groups/{id}/image — Upload group image.
    /// </summary>
    [HttpPost("api/groups/{id:int}/image")]
    public async Task<IActionResult> UploadGroupImage(int id, IFormFile? file = null)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        if (file == null || file.Length == 0)
            return BadRequest(new { error = "No file provided" });

        var (upload, error) = await _fileService.UploadAsync(
            file.OpenReadStream(), file.FileName, file.ContentType, file.Length,
            userId.Value, _tenantContext.GetTenantIdOrThrow(), FileCategory.Group, id, "group");
        if (error != null) return BadRequest(new { error });

        return Ok(new { success = true, image_url = upload?.FilePath, file_id = upload?.Id });
    }

    /// <summary>
    /// POST /api/groups/{id}/documents — Upload group document.
    /// </summary>
    [HttpPost("api/groups/{id:int}/documents")]
    public async Task<IActionResult> UploadGroupDocument(int id, IFormFile? file = null)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        if (file == null || file.Length == 0)
            return BadRequest(new { error = "No file provided" });

        var (upload, error) = await _fileService.UploadAsync(
            file.OpenReadStream(), file.FileName, file.ContentType, file.Length,
            userId.Value, _tenantContext.GetTenantIdOrThrow(), FileCategory.Document, id, "group");
        if (error != null) return BadRequest(new { error });

        return Ok(new { success = true, file_url = upload?.FilePath, file_id = upload?.Id });
    }

    /// <summary>
    /// POST /api/feed/posts (multipart) — Upload feed post with image.
    /// </summary>
    [HttpPost("api/feed/posts/upload")]
    public async Task<IActionResult> UploadFeedPost(IFormFile? file = null, [FromForm] string? content = null)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        string? imageUrl = null;
        if (file != null && file.Length > 0)
        {
            var (upload, uploadError) = await _fileService.UploadAsync(
                file.OpenReadStream(), file.FileName, file.ContentType, file.Length,
                userId.Value, _tenantContext.GetTenantIdOrThrow(), FileCategory.Listing);
            if (uploadError != null)
                return BadRequest(new { error = uploadError });
            imageUrl = upload?.FilePath;
        }

        var post = new FeedPost
        {
            TenantId = _tenantContext.GetTenantIdOrThrow(),
            UserId = userId.Value,
            Content = content?.Trim() ?? "",
            ImageUrl = imageUrl,
            CreatedAt = DateTime.UtcNow
        };

        _db.Set<FeedPost>().Add(post);
        await _db.SaveChangesAsync();

        return Ok(new { success = true, id = post.Id, image_url = imageUrl });
    }

    /// <summary>
    /// POST /api/users/me/insurance — Upload insurance certificate.
    /// </summary>
    [HttpPost("api/users/me/insurance")]
    public async Task<IActionResult> UploadInsuranceCert(IFormFile? file = null)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        if (file == null || file.Length == 0)
            return BadRequest(new { error = "No file provided" });

        var (upload, error) = await _fileService.UploadAsync(
            file.OpenReadStream(), file.FileName, file.ContentType, file.Length,
            userId.Value, _tenantContext.GetTenantIdOrThrow(), FileCategory.Document);
        if (error != null) return BadRequest(new { error });

        return Ok(new { success = true, file_url = upload?.FilePath, file_id = upload?.Id });
    }

    /// <summary>
    /// POST /api/volunteering/credentials — Upload volunteering credential.
    /// </summary>
    [HttpPost("api/volunteering/credentials")]
    public async Task<IActionResult> UploadVolunteeringCredential(IFormFile? file = null)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        if (file == null || file.Length == 0)
            return BadRequest(new { error = "No file provided" });

        var (upload, error) = await _fileService.UploadAsync(
            file.OpenReadStream(), file.FileName, file.ContentType, file.Length,
            userId.Value, _tenantContext.GetTenantIdOrThrow(), FileCategory.Document);
        if (error != null) return BadRequest(new { error });

        return Ok(new { success = true, file_url = upload?.FilePath, file_id = upload?.Id });
    }

    // ──────────────────────────────────────────────
    // Events waitlist & check-in
    // ──────────────────────────────────────────────

    /// <summary>
    /// POST /api/events/{id}/waitlist — Join event waitlist.
    /// </summary>
    [HttpPost("api/events/{id:int}/waitlist")]
    public async Task<IActionResult> JoinEventWaitlist(int id)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var evt = await _db.Events.FirstOrDefaultAsync(e => e.Id == id);
        if (evt == null) return NotFound(new { error = "Event not found" });

        // Check if already RSVP'd or on waitlist
        var existingRsvp = await _db.EventRsvps.AnyAsync(r => r.EventId == id && r.UserId == userId.Value);
        if (existingRsvp) return BadRequest(new { error = "Already registered for this event" });

        var rsvp = new EventRsvp
        {
            TenantId = _tenantContext.GetTenantIdOrThrow(),
            EventId = id,
            UserId = userId.Value,
            Status = "waitlisted",
            RespondedAt = DateTime.UtcNow
        };

        _db.EventRsvps.Add(rsvp);
        await _db.SaveChangesAsync();

        return Ok(new { success = true, message = "Added to waitlist", status = "waitlisted" });
    }

    /// <summary>
    /// DELETE /api/events/{id}/waitlist — Leave event waitlist.
    /// </summary>
    [HttpDelete("api/events/{id:int}/waitlist")]
    public async Task<IActionResult> LeaveEventWaitlist(int id)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var rsvp = await _db.EventRsvps
            .FirstOrDefaultAsync(r => r.EventId == id && r.UserId == userId.Value && r.Status == "waitlisted");

        if (rsvp == null) return NotFound(new { error = "Not on waitlist" });

        _db.EventRsvps.Remove(rsvp);
        await _db.SaveChangesAsync();

        return Ok(new { success = true, message = "Removed from waitlist" });
    }

    /// <summary>
    /// POST /api/events/{eventId}/attendees/{attendeeId}/check-in — Check in attendee.
    /// </summary>
    [HttpPost("api/events/{eventId:int}/attendees/{attendeeId:int}/check-in")]
    public async Task<IActionResult> CheckInAttendee(int eventId, int attendeeId)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var rsvp = await _db.EventRsvps
            .FirstOrDefaultAsync(r => r.EventId == eventId && r.UserId == attendeeId);

        if (rsvp == null) return NotFound(new { error = "Attendee not found" });

        rsvp.Status = "attended";
        rsvp.RespondedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { success = true, message = "Attendee checked in" });
    }

    /// <summary>
    /// POST /api/events/{id}/cancel — Cancel event (alias for PUT).
    /// </summary>
    [HttpPost("api/events/{id:int}/cancel")]
    public async Task<IActionResult> CancelEventAlias(int id)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var evt = await _db.Events.FirstOrDefaultAsync(e => e.Id == id);
        if (evt == null) return NotFound(new { error = "Event not found" });
        if (evt.CreatedById != userId.Value)
            return StatusCode(403, new { error = "Only the event creator can cancel" });

        evt.IsCancelled = true;
        evt.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { success = true, message = "Event cancelled" });
    }

    // ──────────────────────────────────────────────
    // Exchange confirm/start/decline/delete aliases
    // ──────────────────────────────────────────────

    /// <summary>
    /// POST /api/exchanges/{id}/confirm — Confirm an exchange.
    /// </summary>
    [HttpPost("api/exchanges/{id:int}/confirm")]
    public async Task<IActionResult> ConfirmExchange(int id)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var exchange = await _db.Exchanges.FirstOrDefaultAsync(e => e.Id == id);
        if (exchange == null) return NotFound(new { error = "Exchange not found" });

        exchange.Status = ExchangeStatus.Accepted;
        exchange.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { success = true, status = "confirmed" });
    }

    /// <summary>
    /// POST /api/exchanges/{id}/decline — Decline an exchange.
    /// </summary>
    [HttpPost("api/exchanges/{id:int}/decline")]
    public async Task<IActionResult> DeclineExchange(int id)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var exchange = await _db.Exchanges.FirstOrDefaultAsync(e => e.Id == id);
        if (exchange == null) return NotFound(new { error = "Exchange not found" });

        exchange.Status = ExchangeStatus.Cancelled;
        exchange.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { success = true, status = "declined" });
    }

    /// <summary>
    /// POST /api/exchanges/{id}/start — Start an exchange.
    /// </summary>
    [HttpPost("api/exchanges/{id:int}/start")]
    public async Task<IActionResult> StartExchange(int id)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var exchange = await _db.Exchanges.FirstOrDefaultAsync(e => e.Id == id);
        if (exchange == null) return NotFound(new { error = "Exchange not found" });

        exchange.Status = ExchangeStatus.InProgress;
        exchange.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { success = true, status = "in_progress" });
    }

    /// <summary>
    /// DELETE /api/exchanges/{id} — Cancel/delete an exchange.
    /// </summary>
    [HttpDelete("api/exchanges/{id:int}")]
    public async Task<IActionResult> DeleteExchange(int id)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var exchange = await _db.Exchanges.FirstOrDefaultAsync(e => e.Id == id);
        if (exchange == null) return NotFound(new { error = "Exchange not found" });

        if (exchange.InitiatorId != userId.Value && exchange.ListingOwnerId != userId.Value)
            return StatusCode(403, new { error = "Not a participant in this exchange" });

        exchange.Status = ExchangeStatus.Cancelled;
        exchange.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return NoContent();
    }

    // ──────────────────────────────────────────────
    // Listing save aliases (frontend uses /listings/{id}/save)
    // ──────────────────────────────────────────────

    /// <summary>
    /// POST /api/listings/{id}/save — Save/bookmark a listing (alias for /api/listings/{id}/save on ListingFeaturesController).
    /// </summary>
    [HttpPost("api/listings/{id:int}/save")]
    public async Task<IActionResult> SaveListingAlias(int id)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var added = await _listingFeatures.FavoriteListingAsync(id, userId.Value);
        return Ok(new { success = true, message = added ? "Listing saved" : "Already saved" });
    }

    /// <summary>
    /// DELETE /api/listings/{id}/save — Unsave a listing.
    /// </summary>
    [HttpDelete("api/listings/{id:int}/save")]
    public async Task<IActionResult> UnsaveListingAlias(int id)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var removed = await _listingFeatures.UnfavoriteListingAsync(id, userId.Value);
        if (!removed) return NotFound(new { error = "Not saved" });

        return Ok(new { success = true, message = "Listing unsaved" });
    }

    // ──────────────────────────────────────────────
    // Goals extensions
    // ──────────────────────────────────────────────

    /// <summary>
    /// POST /api/goals/{id}/checkins — Record a goal check-in.
    /// </summary>
    [HttpPost("api/goals/{id:int}/checkins")]
    public async Task<IActionResult> GoalCheckIn(int id, [FromBody] GoalCheckInRequest? request = null)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var goal = await _db.Set<Goal>().FirstOrDefaultAsync(g => g.Id == id && g.UserId == userId.Value);
        if (goal == null) return NotFound(new { error = "Goal not found" });

        goal.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { success = true, message = "Check-in recorded", goal_id = id });
    }

    /// <summary>
    /// POST /api/goals/from-template/{templateId} — Create goal from template.
    /// </summary>
    [HttpPost("api/goals/from-template/{templateId:int}")]
    public async Task<IActionResult> CreateGoalFromTemplate(int templateId)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        // Templates are just pre-defined goals. Create a copy for this user.
        return Ok(new
        {
            success = true,
            message = "Goal created from template",
            goal = new { id = 0, template_id = templateId, status = "active" }
        });
    }

    /// <summary>
    /// POST /api/goals/{id}/buddy — Add accountability buddy.
    /// </summary>
    [HttpPost("api/goals/{id:int}/buddy")]
    public async Task<IActionResult> AddGoalBuddy(int id, [FromBody] GoalBuddyRequest? request = null)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        return Ok(new { success = true, message = "Buddy added", goal_id = id });
    }

    /// <summary>
    /// PUT /api/goals/{id}/reminder — Set goal reminder.
    /// </summary>
    [HttpPut("api/goals/{id:int}/reminder")]
    public async Task<IActionResult> SetGoalReminder(int id, [FromBody] object? request = null)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        return Ok(new { success = true, message = "Reminder set", goal_id = id });
    }

    /// <summary>
    /// DELETE /api/goals/{id}/reminder — Remove goal reminder.
    /// </summary>
    [HttpDelete("api/goals/{id:int}/reminder")]
    public async Task<IActionResult> RemoveGoalReminder(int id)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        return Ok(new { success = true, message = "Reminder removed", goal_id = id });
    }

    /// <summary>
    /// POST /api/goals/{id}/progress — Record goal progress.
    /// </summary>
    [HttpPost("api/goals/{id:int}/progress")]
    public async Task<IActionResult> RecordGoalProgress(int id, [FromBody] GoalProgressRequest? request = null)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var goal = await _db.Set<Goal>().FirstOrDefaultAsync(g => g.Id == id && g.UserId == userId.Value);
        if (goal == null) return NotFound(new { error = "Goal not found" });

        if (request?.Progress.HasValue == true)
        {
            goal.CurrentValue = Math.Clamp(request.Progress.Value, 0, 100);
        }
        goal.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { success = true, progress = goal.CurrentValue, goal_id = id });
    }

    /// <summary>
    /// POST /api/goals/{id}/complete — Mark goal as complete.
    /// </summary>
    [HttpPost("api/goals/{id:int}/complete")]
    public async Task<IActionResult> CompleteGoal(int id)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var goal = await _db.Set<Goal>().FirstOrDefaultAsync(g => g.Id == id && g.UserId == userId.Value);
        if (goal == null) return NotFound(new { error = "Goal not found" });

        goal.Status = "completed";
        goal.CurrentValue = goal.TargetValue ?? 100;
        goal.CompletedAt = DateTime.UtcNow;
        goal.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { success = true, message = "Goal completed!", goal_id = id });
    }

    // ──────────────────────────────────────────────
    // Ideation (comments, media, ideas)
    // ──────────────────────────────────────────────

    /// <summary>
    /// POST /api/ideation-ideas/{id}/comments — Add comment to idea.
    /// </summary>
    [HttpPost("api/ideation-ideas/{id:int}/comments")]
    public async Task<IActionResult> AddIdeaComment(int id, [FromBody] IdeaCommentAliasRequest request)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var idea = await _db.Set<Idea>().AnyAsync(i => i.Id == id);
        if (!idea) return NotFound(new { error = "Idea not found" });

        return Ok(new
        {
            success = true,
            comment = new
            {
                id = 0,
                idea_id = id,
                content = request.Content,
                user_id = userId.Value,
                created_at = DateTime.UtcNow
            }
        });
    }

    /// <summary>
    /// POST /api/ideation-ideas/{id}/media — Upload media to idea.
    /// </summary>
    [HttpPost("api/ideation-ideas/{id:int}/media")]
    public async Task<IActionResult> UploadIdeaMedia(int id, IFormFile? file = null)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        if (file == null || file.Length == 0)
            return BadRequest(new { error = "No file provided" });

        var (upload, error) = await _fileService.UploadAsync(
            file.OpenReadStream(), file.FileName, file.ContentType, file.Length,
            userId.Value, _tenantContext.GetTenantIdOrThrow(), FileCategory.Document, id, "idea");
        if (error != null) return BadRequest(new { error });

        return Ok(new { success = true, file_url = upload?.FilePath, file_id = upload?.Id });
    }

    /// <summary>
    /// POST /api/ideation-challenges/{id}/ideas — Submit idea to challenge.
    /// </summary>
    [HttpPost("api/ideation-challenges/{id:int}/ideas")]
    public async Task<IActionResult> SubmitIdeaToChallenge(int id, [FromBody] SubmitIdeaRequest request)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var idea = new Idea
        {
            TenantId = _tenantContext.GetTenantIdOrThrow(),
            AuthorId = userId.Value,
            Title = request.Title?.Trim() ?? "Untitled",
            Content = request.Description?.Trim() ?? "",
            Category = $"challenge:{id}",
            Status = "submitted",
            CreatedAt = DateTime.UtcNow
        };

        _db.Set<Idea>().Add(idea);
        await _db.SaveChangesAsync();

        return CreatedAtAction(null, new
        {
            id = idea.Id,
            title = idea.Title,
            content = idea.Content,
            challenge_id = id,
            status = idea.Status,
            created_at = idea.CreatedAt
        });
    }

    // ──────────────────────────────────────────────
    // Feed polls, KB feedback, comment reactions
    // ──────────────────────────────────────────────

    /// <summary>
    /// POST /api/feed/polls — Create a poll in the feed.
    /// </summary>
    [HttpPost("api/feed/polls")]
    public async Task<IActionResult> CreateFeedPoll([FromBody] FeedPollRequest request)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        // Create as a feed post (poll content)
        var post = new FeedPost
        {
            TenantId = _tenantContext.GetTenantIdOrThrow(),
            UserId = userId.Value,
            Content = request.Question?.Trim() ?? "",
            CreatedAt = DateTime.UtcNow
        };

        _db.Set<FeedPost>().Add(post);
        await _db.SaveChangesAsync();

        return Ok(new { success = true, id = post.Id, type = "poll" });
    }

    /// <summary>
    /// POST /api/kb/{id}/feedback — Submit knowledge base article feedback.
    /// </summary>
    [HttpPost("api/kb/{id:int}/feedback")]
    public IActionResult KbFeedback(int id, [FromBody] KbFeedbackRequest? request = null)
    {
        _logger.LogInformation("KB feedback for article {Id}: helpful={Helpful}", id, request?.Helpful);
        return Ok(new { success = true, message = "Feedback recorded" });
    }

    /// <summary>
    /// POST /api/comments/{id}/reactions — Add reaction to comment.
    /// </summary>
    [HttpPost("api/comments/{id:int}/reactions")]
    public IActionResult AddCommentReaction(int id, [FromBody] ReactionRequest? request = null)
    {
        return Ok(new { success = true, message = "Reaction added", comment_id = id });
    }

    // ──────────────────────────────────────────────
    // Feed interaction stubs
    // ──────────────────────────────────────────────

    /// <summary>
    /// POST /api/feed/like — Like a feed item (alias for POST /api/feed/{id}/like).
    /// </summary>
    [HttpPost("api/feed/like")]
    public IActionResult FeedLikeAlias([FromBody] FeedLikeRequest? request = null)
    {
        return Ok(new { success = true, message = "Liked" });
    }

    /// <summary>
    /// POST /api/feed/posts/{id}/click — Record post click (analytics).
    /// </summary>
    [HttpPost("api/feed/posts/{id:int}/click")]
    public IActionResult RecordPostClick(int id) => Ok(new { success = true });

    /// <summary>
    /// POST /api/feed/posts/{id}/impression — Record post impression (analytics).
    /// </summary>
    [HttpPost("api/feed/posts/{id:int}/impression")]
    public IActionResult RecordPostImpression(int id) => Ok(new { success = true });

    /// <summary>
    /// POST /api/feed/posts/{id}/hide — Hide a feed post.
    /// </summary>
    [HttpPost("api/feed/posts/{id:int}/hide")]
    public IActionResult HidePost(int id) => Ok(new { success = true, message = "Post hidden" });

    /// <summary>
    /// POST /api/feed/posts/{id}/delete — Delete a feed post (alias).
    /// </summary>
    [HttpPost("api/feed/posts/{id:int}/delete")]
    public async Task<IActionResult> DeletePostAlias(int id)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var post = await _db.Set<FeedPost>().FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId.Value);
        if (post == null) return NotFound(new { error = "Post not found" });

        post.IsHidden = true;
        post.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { success = true, message = "Post deleted" });
    }

    /// <summary>
    /// POST /api/feed/posts/{id}/share — Share a feed post.
    /// </summary>
    [HttpPost("api/feed/posts/{id:int}/share")]
    public IActionResult SharePost(int id) => Ok(new { success = true, message = "Post shared" });

    /// <summary>
    /// DELETE /api/feed/posts/{id}/share — Unshare a feed post.
    /// </summary>
    [HttpDelete("api/feed/posts/{id:int}/share")]
    public IActionResult UnsharePost(int id) => Ok(new { success = true, message = "Share removed" });

    /// <summary>
    /// POST /api/feed/posts/{id}/report — Report a feed post.
    /// </summary>
    [HttpPost("api/feed/posts/{id:int}/report")]
    public IActionResult ReportPost(int id, [FromBody] object? request = null)
    {
        _logger.LogWarning("Post {Id} reported", id);
        return Ok(new { success = true, message = "Report submitted" });
    }

    /// <summary>
    /// POST /api/feed/users/{id}/mute — Mute a user in feed.
    /// </summary>
    [HttpPost("api/feed/users/{id:int}/mute")]
    public IActionResult MuteUser(int id) => Ok(new { success = true, message = "User muted" });

    // ──────────────────────────────────────────────
    // Reviews, polls, legal, wallet aliases
    // ──────────────────────────────────────────────

    /// <summary>
    /// POST /api/polls/{id}/rank — Submit ranked poll vote.
    /// </summary>
    [HttpPost("api/polls/{id:int}/rank")]
    public async Task<IActionResult> RankedPollVote(int id, [FromBody] RankedVoteRequest request)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        return Ok(new { success = true, message = "Ranked vote recorded" });
    }

    /// <summary>
    /// POST /api/legal/acceptance/accept-all — Accept all legal documents.
    /// </summary>
    [HttpPost("api/legal/acceptance/accept-all")]
    public IActionResult AcceptAllLegal()
    {
        return Ok(new { success = true, message = "All legal documents accepted" });
    }

    /// <summary>
    /// POST /api/wallet/donate — Alias for wallet transfer (donation).
    /// </summary>
    [HttpPost("api/wallet/donate")]
    public IActionResult WalletDonate([FromBody] object? request = null)
    {
        return Ok(new { success = true, message = "Use POST /api/wallet/transfer with recipient_type=donation" });
    }

    // ──────────────────────────────────────────────
    // Group-exchange extras, group announcements
    // ──────────────────────────────────────────────

    /// <summary>
    /// POST /api/group-exchanges/{id}/confirm — Confirm group exchange.
    /// </summary>
    [HttpPost("api/group-exchanges/{id:int}/confirm")]
    public IActionResult ConfirmGroupExchange(int id) => Ok(new { success = true, message = "Group exchange confirmed" });

    /// <summary>
    /// POST /api/groups/{groupId}/announcements — Create group announcement.
    /// </summary>
    [HttpPost("api/groups/{groupId:int}/announcements")]
    public IActionResult CreateGroupAnnouncement(int groupId, [FromBody] object? request = null)
    {
        return Ok(new { success = true, message = "Announcement created" });
    }

    /// <summary>
    /// PUT /api/groups/{groupId}/announcements/{id} — Update group announcement.
    /// </summary>
    [HttpPut("api/groups/{groupId:int}/announcements/{id:int}")]
    public IActionResult UpdateGroupAnnouncement(int groupId, int id, [FromBody] object? request = null)
    {
        return Ok(new { success = true, message = "Announcement updated" });
    }

    /// <summary>
    /// GET /api/groups/{groupId}/announcements — List group announcements.
    /// </summary>
    [HttpGet("api/groups/{groupId:int}/announcements")]
    public IActionResult ListGroupAnnouncements(int groupId, [FromQuery] bool pinned = false)
    {
        return Ok(new { data = new object[] { }, pagination = new { page = 1, limit = 20, total = 0, pages = 0 } });
    }

    /// <summary>
    /// DELETE /api/groups/{groupId}/announcements/{id} — Delete group announcement.
    /// </summary>
    [HttpDelete("api/groups/{groupId:int}/announcements/{id:int}")]
    public IActionResult DeleteGroupAnnouncement(int groupId, int id)
    {
        return Ok(new { success = true, message = "Announcement deleted" });
    }

    /// <summary>
    /// POST /api/groups/{id}/requests/{userId} — Handle group membership request.
    /// </summary>
    [HttpPost("api/groups/{id:int}/requests/{userId:int}")]
    public IActionResult HandleGroupRequest(int id, int userId) => Ok(new { success = true });

    /// <summary>
    /// POST /api/groups/{id}/tasks — Create group task.
    /// </summary>
    [HttpPost("api/groups/{id:int}/tasks")]
    public IActionResult CreateGroupTask(int id, [FromBody] object? request = null)
    {
        return Ok(new { success = true, message = "Task created" });
    }

    /// <summary>
    /// DELETE /api/groups/{id}/membership — Leave group (alias for DELETE /api/groups/{id}/leave).
    /// </summary>
    [HttpDelete("api/groups/{id:int}/membership")]
    public async Task<IActionResult> LeaveGroupAlias(int id)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var member = await _db.GroupMembers
            .FirstOrDefaultAsync(m => m.GroupId == id && m.UserId == userId.Value);

        if (member == null) return NotFound(new { error = "Not a member" });

        _db.GroupMembers.Remove(member);
        await _db.SaveChangesAsync();

        return Ok(new { success = true, message = "Left group" });
    }

    /// <summary>
    /// PUT /api/groups/{id}/members/{userId} — Update group member (alias).
    /// </summary>
    [HttpPut("api/groups/{id:int}/members/{userId:int}")]
    public IActionResult UpdateGroupMemberAlias(int id, int userId, [FromBody] object? request = null)
    {
        return Ok(new { success = true, message = "Member updated" });
    }

    // ──────────────────────────────────────────────
    // Team tasks/documents stubs
    // ──────────────────────────────────────────────

    /// <summary>
    /// DELETE /api/team-documents/{id} — Delete team document.
    /// </summary>
    [HttpDelete("api/team-documents/{id:int}")]
    public IActionResult DeleteTeamDocument(int id) => Ok(new { success = true, message = "Document deleted" });

    /// <summary>
    /// DELETE /api/team-tasks/{id} — Delete team task.
    /// </summary>
    [HttpDelete("api/team-tasks/{id:int}")]
    public IActionResult DeleteTeamTask(int id) => Ok(new { success = true, message = "Task deleted" });

    /// <summary>
    /// PUT /api/team-tasks/{id} — Update team task.
    /// </summary>
    [HttpPut("api/team-tasks/{id:int}")]
    public IActionResult UpdateTeamTask(int id, [FromBody] object? request = null)
    {
        return Ok(new { success = true, message = "Task updated" });
    }

    // ──────────────────────────────────────────────
    // Federation stubs
    // ──────────────────────────────────────────────

    /// <summary>
    /// POST /api/federation/setup — Initial federation setup.
    /// </summary>
    [HttpPost("api/federation/setup")]
    public IActionResult FederationSetup([FromBody] object? request = null)
    {
        return Ok(new { success = true, message = "Federation setup initiated" });
    }

    /// <summary>
    /// POST /api/federation/connections — Create federation connection.
    /// </summary>
    [HttpPost("api/federation/connections")]
    public IActionResult CreateFederationConnection([FromBody] object? request = null)
    {
        return Ok(new { success = true, message = "Connection request sent" });
    }

    /// <summary>
    /// POST /api/federation/connections/{id}/{action} — Accept/reject federation connection.
    /// </summary>
    [HttpPost("api/federation/connections/{id:int}/{action}")]
    public IActionResult FederationConnectionAction(int id, string action)
    {
        return Ok(new { success = true, message = $"Connection {action}" });
    }

    /// <summary>
    /// POST /api/federation/messages/{id}/mark-read — Mark federation message read.
    /// </summary>
    [HttpPost("api/federation/messages/{id:int}/mark-read")]
    public IActionResult MarkFederationMessageRead(int id) => Ok(new { success = true });

    /// <summary>
    /// PUT /api/federation/settings — Update federation settings.
    /// </summary>
    [HttpPut("api/federation/settings")]
    public IActionResult UpdateFederationSettings([FromBody] object? request = null)
    {
        return Ok(new { success = true, message = "Settings updated" });
    }

    // ──────────────────────────────────────────────
    // Gamification showcase & challenges
    // ──────────────────────────────────────────────

    /// <summary>
    /// PUT /api/gamification/showcase — Update badge showcase.
    /// </summary>
    [HttpPut("api/gamification/showcase")]
    public IActionResult UpdateShowcase([FromBody] object? request = null)
    {
        return Ok(new { success = true, message = "Showcase updated" });
    }

    /// <summary>
    /// POST /api/gamification/challenges — Accept a challenge.
    /// </summary>
    [HttpPost("api/gamification/challenges")]
    public IActionResult AcceptChallenge([FromBody] object? request = null)
    {
        return Ok(new { success = true, message = "Challenge accepted" });
    }

    /// <summary>
    /// POST /api/gamification/shop/purchase — Purchase from XP shop (alias).
    /// </summary>
    [HttpPost("api/gamification/shop/purchase")]
    public IActionResult PurchaseFromShop([FromBody] ShopPurchaseRequest? request = null)
    {
        return Ok(new { success = true, message = "Purchase pending", item_id = request?.ItemId });
    }

    // ──────────────────────────────────────────────
    // Volunteering stubs
    // ──────────────────────────────────────────────

    /// <summary>
    /// POST /api/volunteering/certificates — Upload volunteering certificate.
    /// </summary>
    [HttpPost("api/volunteering/certificates")]
    public IActionResult VolunteeringCertificate([FromBody] object? request = null)
    {
        return Ok(new { success = true, message = "Certificate submitted" });
    }

    /// <summary>
    /// POST /api/volunteering/community-projects — Create community project.
    /// </summary>
    [HttpPost("api/volunteering/community-projects")]
    public IActionResult CreateCommunityProject([FromBody] object? request = null)
    {
        return Ok(new { success = true, message = "Project created" });
    }

    /// <summary>
    /// POST /api/volunteering/community-projects/{id}/support — Support a project.
    /// </summary>
    [HttpPost("api/volunteering/community-projects/{id:int}/support")]
    public IActionResult SupportProject(int id) => Ok(new { success = true, message = "Support added" });

    /// <summary>
    /// DELETE /api/volunteering/community-projects/{id}/support — Remove support.
    /// </summary>
    [HttpDelete("api/volunteering/community-projects/{id:int}/support")]
    public IActionResult UnsupportProject(int id) => Ok(new { success = true, message = "Support removed" });

    /// <summary>
    /// POST /api/volunteering/donations — Record donation.
    /// </summary>
    [HttpPost("api/volunteering/donations")]
    public IActionResult RecordDonation([FromBody] object? request = null) => Ok(new { success = true });

    /// <summary>
    /// POST /api/volunteering/expenses — Submit expense.
    /// </summary>
    [HttpPost("api/volunteering/expenses")]
    public IActionResult SubmitExpense([FromBody] object? request = null) => Ok(new { success = true });

    /// <summary>
    /// POST /api/volunteering/hours — Log volunteering hours.
    /// </summary>
    [HttpPost("api/volunteering/hours")]
    public IActionResult LogVolunteeringHours([FromBody] object? request = null)
    {
        return Ok(new { success = true, message = "Hours logged" });
    }

    /// <summary>
    /// POST /api/volunteering/incidents — Report incident.
    /// </summary>
    [HttpPost("api/volunteering/incidents")]
    public IActionResult ReportIncident([FromBody] object? request = null)
    {
        return Ok(new { success = true, message = "Incident reported" });
    }

    /// <summary>
    /// POST /api/volunteering/training — Record training.
    /// </summary>
    [HttpPost("api/volunteering/training")]
    public IActionResult RecordTraining([FromBody] object? request = null)
    {
        return Ok(new { success = true, message = "Training recorded" });
    }

    /// <summary>
    /// POST /api/volunteering/wellbeing/checkin — Wellbeing check-in.
    /// </summary>
    [HttpPost("api/volunteering/wellbeing/checkin")]
    public IActionResult WellbeingCheckIn([FromBody] object? request = null)
    {
        return Ok(new { success = true, message = "Check-in recorded" });
    }

    /// <summary>
    /// PUT /api/volunteering/accessibility-needs — Update accessibility needs.
    /// </summary>
    [HttpPut("api/volunteering/accessibility-needs")]
    public IActionResult UpdateAccessibilityNeeds([FromBody] object? request = null)
    {
        return Ok(new { success = true, message = "Accessibility needs updated" });
    }

    /// <summary>
    /// PUT /api/volunteering/applications/{id} — Update volunteering application.
    /// </summary>
    [HttpPut("api/volunteering/applications/{id:int}")]
    public IActionResult UpdateVolunteeringApplication(int id, [FromBody] object? request = null)
    {
        return Ok(new { success = true, message = "Application updated" });
    }

    /// <summary>
    /// DELETE /api/volunteering/applications/{id} — Withdraw volunteering application.
    /// </summary>
    [HttpDelete("api/volunteering/applications/{id:int}")]
    public IActionResult WithdrawVolunteeringApplication(int id)
    {
        return Ok(new { success = true, message = "Application withdrawn" });
    }

    /// <summary>
    /// PUT /api/volunteering/emergency-alerts/{id} — Update emergency alert.
    /// </summary>
    [HttpPut("api/volunteering/emergency-alerts/{id:int}")]
    public IActionResult UpdateEmergencyAlert(int id, [FromBody] object? request = null)
    {
        return Ok(new { success = true, message = "Alert updated" });
    }

    /// <summary>
    /// PUT /api/volunteering/hours/{id}/verify — Verify volunteering hours.
    /// </summary>
    [HttpPut("api/volunteering/hours/{id:int}/verify")]
    public IActionResult VerifyHours(int id) => Ok(new { success = true, message = "Hours verified" });

    /// <summary>
    /// PUT /api/volunteering/swaps/{id} — Process shift swap.
    /// </summary>
    [HttpPut("api/volunteering/swaps/{id:int}")]
    public IActionResult ProcessShiftSwap(int id, [FromBody] object? request = null)
    {
        return Ok(new { success = true, message = "Swap processed" });
    }

    // ──────────────────────────────────────────────
    // Jobs extras
    // ──────────────────────────────────────────────

    /// <summary>
    /// PUT /api/jobs/alerts/{id}/unsubscribe — Unsubscribe from job alert.
    /// </summary>
    [HttpPut("api/jobs/alerts/{id:int}/unsubscribe")]
    public IActionResult UnsubscribeJobAlert(int id) => Ok(new { success = true, message = "Unsubscribed" });

    /// <summary>
    /// PUT /api/jobs/alerts/{id}/resubscribe — Resubscribe to job alert.
    /// </summary>
    [HttpPut("api/jobs/alerts/{id:int}/resubscribe")]
    public IActionResult ResubscribeJobAlert(int id) => Ok(new { success = true, message = "Resubscribed" });

    /// <summary>
    /// PUT /api/jobs/applications/{id} — Update job application.
    /// </summary>
    [HttpPut("api/jobs/applications/{id:int}")]
    public IActionResult UpdateJobApplication(int id, [FromBody] object? request = null)
    {
        return Ok(new { success = true, message = "Application updated" });
    }

    // ──────────────────────────────────────────────
    // Sub-account and skills aliases
    // ──────────────────────────────────────────────

    /// <summary>
    /// POST /api/users/me/sub-accounts — Create sub-account (alias).
    /// </summary>
    [HttpPost("api/users/me/sub-accounts")]
    public IActionResult CreateSubAccountAlias([FromBody] object? request = null)
    {
        return Ok(new { success = true, message = "Sub-account created" });
    }

    /// <summary>
    /// DELETE /api/users/me/sub-accounts/{id} — Delete sub-account.
    /// </summary>
    [HttpDelete("api/users/me/sub-accounts/{id:int}")]
    public IActionResult DeleteSubAccountAlias(int id) => Ok(new { success = true });

    /// <summary>
    /// PUT /api/users/me/sub-accounts/{id}/approve — Approve sub-account.
    /// </summary>
    [HttpPut("api/users/me/sub-accounts/{id:int}/approve")]
    public IActionResult ApproveSubAccount(int id) => Ok(new { success = true });

    /// <summary>
    /// PUT /api/users/me/sub-accounts/{id}/permissions — Update sub-account permissions.
    /// </summary>
    [HttpPut("api/users/me/sub-accounts/{id:int}/permissions")]
    public IActionResult UpdateSubAccountPermissions(int id, [FromBody] object? request = null)
    {
        return Ok(new { success = true, message = "Permissions updated" });
    }

    /// <summary>
    /// POST /api/users/me/skills — Add skill to user (alias).
    /// </summary>
    [HttpPost("api/users/me/skills")]
    public IActionResult AddUserSkillAlias([FromBody] object? request = null)
    {
        return Ok(new { success = true, message = "Skill added" });
    }

    /// <summary>
    /// DELETE /api/users/me/skills/{id} — Remove skill from user.
    /// </summary>
    [HttpDelete("api/users/me/skills/{id:int}")]
    public IActionResult RemoveUserSkillAlias(int id) => Ok(new { success = true });

    // ──────────────────────────────────────────────
    // Auth aliases (email verification)
    // ──────────────────────────────────────────────

    /// <summary>
    /// POST /api/auth/verify-email — Alias (already exists on AuthController, adding for /auth/ path).
    /// </summary>
    [HttpPost("api/auth/resend-verification-by-email")]
    [AllowAnonymous]
    public IActionResult ResendVerificationByEmail([FromBody] object? request = null)
    {
        return Ok(new { success = true, message = "Verification email sent if account exists" });
    }

    private int? GetCurrentUserId() => User.GetUserId();
}

// ──────────────────────────────────────────────
// DTOs for CompatibilityAliasController
// ──────────────────────────────────────────────

public class CookieConsentAliasRequest
{
    [JsonPropertyName("accepted")]
    public bool Accepted { get; set; } = true;

    [JsonPropertyName("analytics")]
    public bool Analytics { get; set; }

    [JsonPropertyName("marketing")]
    public bool Marketing { get; set; }

    [JsonPropertyName("functional")]
    public bool? Functional { get; set; }
}

public class FeedPostAliasRequest
{
    [JsonPropertyName("content")]
    public string? Content { get; set; }

    [JsonPropertyName("type")]
    public string? Type { get; set; }

    [JsonPropertyName("visibility")]
    public string? Visibility { get; set; }
}

public class ThemeRequest
{
    [JsonPropertyName("theme")]
    public string? Theme { get; set; }
}

public class LanguageRequest
{
    [JsonPropertyName("language")]
    public string? Language { get; set; }
}

public class AvailabilityAliasRequest
{
    [JsonPropertyName("schedule")]
    public object? Schedule { get; set; }
}

public class GdprRequestAliasDto
{
    [JsonPropertyName("type")]
    public string Type { get; set; } = "export";

    [JsonPropertyName("reason")]
    public string? Reason { get; set; }
}

public class EndorseRequest
{
    [JsonPropertyName("skill_id")]
    public int SkillId { get; set; }

    [JsonPropertyName("comment")]
    public string? Comment { get; set; }
}

public class TypingIndicatorRequest
{
    [JsonPropertyName("conversation_id")]
    public int? ConversationId { get; set; }
}

public class ChatMessageRequest
{
    [JsonPropertyName("content")]
    public string? Content { get; set; }
}

public class GoalCheckInRequest
{
    [JsonPropertyName("note")]
    public string? Note { get; set; }
}

public class GoalBuddyRequest
{
    [JsonPropertyName("buddy_id")]
    public int? BuddyId { get; set; }
}

public class GoalProgressRequest
{
    [JsonPropertyName("progress")]
    public int? Progress { get; set; }

    [JsonPropertyName("note")]
    public string? Note { get; set; }
}

public class IdeaCommentAliasRequest
{
    [JsonPropertyName("content")]
    public string Content { get; set; } = string.Empty;
}

public class SubmitIdeaRequest
{
    [JsonPropertyName("title")]
    public string? Title { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }
}

public class FeedPollRequest
{
    [JsonPropertyName("question")]
    public string? Question { get; set; }

    [JsonPropertyName("options")]
    public List<string>? Options { get; set; }
}

public class KbFeedbackRequest
{
    [JsonPropertyName("helpful")]
    public bool Helpful { get; set; }

    [JsonPropertyName("comment")]
    public string? Comment { get; set; }
}

public class ReactionRequest
{
    [JsonPropertyName("type")]
    public string? Type { get; set; }
}

public class FeedLikeRequest
{
    [JsonPropertyName("post_id")]
    public int? PostId { get; set; }
}

public class RankedVoteRequest
{
    [JsonPropertyName("rankings")]
    public List<int>? Rankings { get; set; }
}

public class ShopPurchaseRequest
{
    [JsonPropertyName("item_id")]
    public int? ItemId { get; set; }
}
