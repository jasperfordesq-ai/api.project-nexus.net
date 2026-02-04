using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;
using Nexus.Api.Entities;

namespace Nexus.Api.Services;

/// <summary>
/// Service for automatic content moderation using AI.
/// Integrates with the AiService to moderate listings, posts, messages, and other content.
/// </summary>
public class ContentModerationService
{
    private readonly AiService _aiService;
    private readonly NexusDbContext _db;
    private readonly ILogger<ContentModerationService> _logger;

    // Severity thresholds for automatic actions
    private const string SEVERITY_BLOCK = "critical";
    private const string SEVERITY_FLAG = "high";
    private const string SEVERITY_WARN = "medium";

    public ContentModerationService(
        AiService aiService,
        NexusDbContext db,
        ILogger<ContentModerationService> logger)
    {
        _aiService = aiService;
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// Moderate a listing before publication.
    /// Returns true if the listing passes moderation, false if it should be blocked.
    /// </summary>
    public async Task<ContentModerationOutcome> ModerateListingAsync(
        Listing listing,
        CancellationToken ct = default)
    {
        var content = $"Title: {listing.Title}\nDescription: {listing.Description ?? "N/A"}";

        try
        {
            var result = await _aiService.ModerateContent(content, "listing", ct);
            var outcome = ProcessModerationResult(result, "listing", listing.Id);

            _logger.LogInformation(
                "Listing {ListingId} moderation: Approved={Approved}, Severity={Severity}",
                listing.Id, outcome.IsApproved, outcome.Severity);

            return outcome;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Moderation failed for listing {ListingId}, allowing with warning", listing.Id);
            return new ContentModerationOutcome
            {
                IsApproved = true,
                RequiresReview = true,
                Severity = "unknown",
                Message = "Moderation service unavailable, content allowed pending review"
            };
        }
    }

    /// <summary>
    /// Moderate a feed post before publication.
    /// </summary>
    public async Task<ContentModerationOutcome> ModerateFeedPostAsync(
        FeedPost post,
        CancellationToken ct = default)
    {
        try
        {
            var result = await _aiService.ModerateContent(post.Content, "post", ct);
            var outcome = ProcessModerationResult(result, "post", post.Id);

            _logger.LogInformation(
                "FeedPost {PostId} moderation: Approved={Approved}, Severity={Severity}",
                post.Id, outcome.IsApproved, outcome.Severity);

            return outcome;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Moderation failed for post {PostId}, allowing with warning", post.Id);
            return new ContentModerationOutcome
            {
                IsApproved = true,
                RequiresReview = true,
                Severity = "unknown",
                Message = "Moderation service unavailable, content allowed pending review"
            };
        }
    }

    /// <summary>
    /// Moderate a message before sending.
    /// </summary>
    public async Task<ContentModerationOutcome> ModerateMessageAsync(
        string messageContent,
        int? messageId = null,
        CancellationToken ct = default)
    {
        try
        {
            var result = await _aiService.ModerateContent(messageContent, "message", ct);
            var outcome = ProcessModerationResult(result, "message", messageId ?? 0);

            _logger.LogInformation(
                "Message moderation: Approved={Approved}, Severity={Severity}",
                outcome.IsApproved, outcome.Severity);

            return outcome;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Moderation failed for message, allowing with warning");
            return new ContentModerationOutcome
            {
                IsApproved = true,
                RequiresReview = true,
                Severity = "unknown",
                Message = "Moderation service unavailable, content allowed pending review"
            };
        }
    }

    /// <summary>
    /// Moderate a comment before posting.
    /// </summary>
    public async Task<ContentModerationOutcome> ModerateCommentAsync(
        string commentContent,
        CancellationToken ct = default)
    {
        try
        {
            var result = await _aiService.ModerateContent(commentContent, "comment", ct);
            var outcome = ProcessModerationResult(result, "comment", 0);

            _logger.LogInformation(
                "Comment moderation: Approved={Approved}, Severity={Severity}",
                outcome.IsApproved, outcome.Severity);

            return outcome;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Moderation failed for comment, allowing with warning");
            return new ContentModerationOutcome
            {
                IsApproved = true,
                RequiresReview = true,
                Severity = "unknown",
                Message = "Moderation service unavailable, content allowed pending review"
            };
        }
    }

    /// <summary>
    /// Moderate user profile content (bio, skills, etc.).
    /// </summary>
    public async Task<ContentModerationOutcome> ModerateProfileAsync(
        string profileContent,
        int userId,
        CancellationToken ct = default)
    {
        try
        {
            var result = await _aiService.ModerateContent(profileContent, "profile", ct);
            var outcome = ProcessModerationResult(result, "profile", userId);

            _logger.LogInformation(
                "Profile {UserId} moderation: Approved={Approved}, Severity={Severity}",
                userId, outcome.IsApproved, outcome.Severity);

            return outcome;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Moderation failed for profile {UserId}, allowing with warning", userId);
            return new ContentModerationOutcome
            {
                IsApproved = true,
                RequiresReview = true,
                Severity = "unknown",
                Message = "Moderation service unavailable, content allowed pending review"
            };
        }
    }

    /// <summary>
    /// Batch moderate multiple pieces of content.
    /// </summary>
    public async Task<List<ContentModerationOutcome>> BatchModerateAsync(
        List<(string Content, string ContentType, int EntityId)> items,
        CancellationToken ct = default)
    {
        var outcomes = new List<ContentModerationOutcome>();

        foreach (var item in items)
        {
            try
            {
                var result = await _aiService.ModerateContent(item.Content, item.ContentType, ct);
                outcomes.Add(ProcessModerationResult(result, item.ContentType, item.EntityId));
            }
            catch
            {
                outcomes.Add(new ContentModerationOutcome
                {
                    IsApproved = true,
                    RequiresReview = true,
                    Severity = "unknown",
                    Message = "Moderation failed"
                });
            }
        }

        return outcomes;
    }

    /// <summary>
    /// Create a notification for admins about flagged content.
    /// </summary>
    public async Task NotifyAdminsAboutFlaggedContent(
        string contentType,
        int entityId,
        string severity,
        List<string> issues,
        CancellationToken ct = default)
    {
        // Get admin users in the current tenant
        var admins = await _db.Users
            .Where(u => u.Role == "admin" && u.IsActive)
            .ToListAsync(ct);

        foreach (var admin in admins)
        {
            var notification = new Notification
            {
                UserId = admin.Id,
                Type = "content_flagged",
                Title = $"Content Flagged: {contentType}",
                Body = $"A {contentType} (ID: {entityId}) was flagged with severity '{severity}'. Issues: {string.Join(", ", issues)}",
                Data = System.Text.Json.JsonSerializer.Serialize(new
                {
                    contentType,
                    entityId,
                    severity,
                    issues
                }),
                CreatedAt = DateTime.UtcNow
            };

            _db.Notifications.Add(notification);
        }

        await _db.SaveChangesAsync(ct);
    }

    /// <summary>
    /// Process the raw moderation result into an actionable outcome.
    /// </summary>
    private ContentModerationOutcome ProcessModerationResult(
        ModerationResult result,
        string contentType,
        int entityId)
    {
        var outcome = new ContentModerationOutcome
        {
            Severity = result.Severity,
            FlaggedIssues = result.FlaggedIssues,
            Suggestions = result.Suggestions
        };

        switch (result.Severity.ToLowerInvariant())
        {
            case "critical":
                outcome.IsApproved = false;
                outcome.RequiresReview = false;
                outcome.Message = "Content blocked: Critical policy violation detected";
                outcome.Action = ModerationAction.Block;
                break;

            case "high":
                outcome.IsApproved = false;
                outcome.RequiresReview = true;
                outcome.Message = "Content flagged for review: Potential policy violation";
                outcome.Action = ModerationAction.Flag;
                break;

            case "medium":
                outcome.IsApproved = true;
                outcome.RequiresReview = true;
                outcome.Message = "Content allowed with warning: Please review flagged issues";
                outcome.Action = ModerationAction.Warn;
                break;

            default:
                outcome.IsApproved = result.IsApproved;
                outcome.RequiresReview = false;
                outcome.Message = result.IsApproved ? "Content approved" : "Content not approved";
                outcome.Action = result.IsApproved ? ModerationAction.Allow : ModerationAction.Block;
                break;
        }

        return outcome;
    }
}

/// <summary>
/// Outcome of content moderation.
/// </summary>
public class ContentModerationOutcome
{
    /// <summary>
    /// Whether the content is approved for publication.
    /// </summary>
    public bool IsApproved { get; set; }

    /// <summary>
    /// Whether the content should be flagged for human review.
    /// </summary>
    public bool RequiresReview { get; set; }

    /// <summary>
    /// Severity level of any issues found.
    /// </summary>
    public string Severity { get; set; } = "none";

    /// <summary>
    /// Human-readable message about the moderation result.
    /// </summary>
    public string Message { get; set; } = "";

    /// <summary>
    /// Specific issues that were flagged.
    /// </summary>
    public List<string> FlaggedIssues { get; set; } = new();

    /// <summary>
    /// Suggestions for improving the content.
    /// </summary>
    public List<string> Suggestions { get; set; } = new();

    /// <summary>
    /// The recommended action to take.
    /// </summary>
    public ModerationAction Action { get; set; }
}

/// <summary>
/// Actions that can be taken based on moderation results.
/// </summary>
public enum ModerationAction
{
    Allow,    // Content is fine
    Warn,     // Content allowed but flagged for attention
    Flag,     // Content blocked pending review
    Block     // Content permanently blocked
}
