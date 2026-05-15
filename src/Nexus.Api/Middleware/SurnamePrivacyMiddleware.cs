// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Text.Json;
using System.Text.Json.Nodes;
using Nexus.Api.Extensions;

namespace Nexus.Api.Middleware;

/// <summary>
/// Strips member surnames from JSON API responses so non-admin viewers only
/// ever see first names. Admins (admin / super_admin) pass through unchanged.
/// A member always sees their own surname (object's id matches current user).
///
/// Scrubs the following property names: last_name, lastName, LastName,
/// surname, Surname. When an object containing a first name also exposes a
/// pre-composed "name" / "full_name" / "display_name" field, that composite
/// is rewritten to the first name only to prevent surname leakage through
/// server-side concatenation (e.g. leaderboards).
/// </summary>
public sealed class SurnamePrivacyMiddleware
{
    private static readonly string[] SurnameKeys =
    {
        "last_name", "lastName", "LastName", "surname", "Surname"
    };

    private static readonly string[] CompositeNameKeys =
    {
        "name", "full_name", "fullName", "display_name", "displayName"
    };

    private static readonly string[] FirstNameKeys =
    {
        "first_name", "firstName", "FirstName"
    };

    private static readonly string[] IdKeys =
    {
        "id", "user_id", "userId", "Id", "UserId"
    };

    // Secondary signals that an object represents a user (in addition to
    // first_name/last_name). Many endpoints emit pre-composed `name` strings
    // on objects that only carry an avatar/email/handle alongside the id, so
    // we widen detection to catch those.
    private static readonly string[] UserShapeSignalKeys =
    {
        "avatar_url", "avatarUrl", "AvatarUrl",
        "email", "Email",
        "username", "userName", "UserName",
        "handle", "Handle",
        "user_id", "userId", "UserId"
    };

    private readonly RequestDelegate _next;
    private readonly ILogger<SurnamePrivacyMiddleware> _logger;

    public SurnamePrivacyMiddleware(RequestDelegate next, ILogger<SurnamePrivacyMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Admins see everything.
        if (context.User?.IsAdmin() == true)
        {
            await _next(context);
            return;
        }

        // Only scrub /api/* JSON.
        if (!context.Request.Path.StartsWithSegments("/api"))
        {
            await _next(context);
            return;
        }

        var originalBody = context.Response.Body;
        using var buffer = new MemoryStream();
        context.Response.Body = buffer;

        try
        {
            await _next(context);

            buffer.Position = 0;

            var contentType = context.Response.ContentType ?? string.Empty;
            var isJson = contentType.Contains("application/json", StringComparison.OrdinalIgnoreCase);

            if (!isJson || buffer.Length == 0)
            {
                context.Response.Body = originalBody;
                buffer.Position = 0;
                await buffer.CopyToAsync(originalBody);
                return;
            }

            JsonNode? root;
            try
            {
                root = JsonNode.Parse(buffer);
            }
            catch (JsonException ex)
            {
                _logger.LogDebug(ex, "SurnamePrivacy: response not valid JSON, passing through");
                context.Response.Body = originalBody;
                buffer.Position = 0;
                await buffer.CopyToAsync(originalBody);
                return;
            }

            if (root is null)
            {
                context.Response.Body = originalBody;
                buffer.Position = 0;
                await buffer.CopyToAsync(originalBody);
                return;
            }

            var currentUserId = context.User?.GetUserId();
            Scrub(root, currentUserId);

            var rewritten = JsonSerializer.SerializeToUtf8Bytes(root);
            context.Response.Body = originalBody;
            context.Response.ContentLength = null; // length changed; let host decide
            await context.Response.Body.WriteAsync(rewritten, context.RequestAborted);
        }
        finally
        {
            context.Response.Body = originalBody;
        }
    }

    private static void Scrub(JsonNode? node, int? currentUserId)
    {
        switch (node)
        {
            case JsonObject obj:
                ScrubObject(obj, currentUserId);
                foreach (var kv in obj.ToList())
                {
                    Scrub(kv.Value, currentUserId);
                }
                break;
            case JsonArray arr:
                foreach (var item in arr)
                {
                    Scrub(item, currentUserId);
                }
                break;
        }
    }

    private static void ScrubObject(JsonObject obj, int? currentUserId)
    {
        var hasFirstName = FirstNameKeys.Any(k => obj.ContainsKey(k));
        var hasSurname = SurnameKeys.Any(k => obj.ContainsKey(k));
        var hasUserSignal = UserShapeSignalKeys.Any(k => obj.ContainsKey(k));
        var hasComposite = CompositeNameKeys.Any(k => obj.ContainsKey(k));

        // An object is "user-shaped" if it carries any of: an explicit
        // first/last name, or a composite name field alongside a user-signal
        // (avatar/email/handle/user_id). Plain composite names without any
        // user signal (e.g. group.name, listing.title) are left alone.
        var isUserShaped = hasFirstName || hasSurname
            || (hasComposite && hasUserSignal);

        if (!isUserShaped)
        {
            return;
        }

        if (IsSelf(obj, currentUserId))
        {
            return;
        }

        // Blank any explicit surname field.
        foreach (var key in SurnameKeys)
        {
            if (obj.ContainsKey(key))
            {
                obj[key] = JsonValue.Create(string.Empty);
            }
        }

        // Determine the first name to use for rewriting composite fields.
        // Prefer an explicit first_name sibling; otherwise derive from the
        // composite by splitting on the first run of whitespace.
        string? firstName = null;
        foreach (var k in FirstNameKeys)
        {
            if (obj.TryGetPropertyValue(k, out var v) && v is JsonValue fv)
            {
                firstName = fv.ToString();
                break;
            }
        }

        foreach (var k in CompositeNameKeys)
        {
            if (!obj.TryGetPropertyValue(k, out var v) || v is not JsonValue cv) continue;
            var current = cv.ToString();
            if (string.IsNullOrWhiteSpace(current)) continue;

            string replacement;
            if (!string.IsNullOrWhiteSpace(firstName))
            {
                replacement = firstName!;
            }
            else
            {
                // Split on first whitespace run; keep the leading token.
                var trimmed = current.TrimStart();
                var spaceIdx = trimmed.IndexOfAny(new[] { ' ', '\t', '\n' });
                replacement = spaceIdx > 0 ? trimmed[..spaceIdx] : trimmed;
            }

            obj[k] = JsonValue.Create(replacement);
        }
    }

    private static bool IsSelf(JsonObject obj, int? currentUserId)
    {
        if (!currentUserId.HasValue) return false;

        foreach (var key in IdKeys)
        {
            if (!obj.TryGetPropertyValue(key, out var v) || v is null) continue;
            if (v is JsonValue jv)
            {
                if (jv.TryGetValue<int>(out var i) && i == currentUserId.Value) return true;
                if (jv.TryGetValue<long>(out var l) && l == currentUserId.Value) return true;
                var s = jv.ToString();
                if (int.TryParse(s, out var parsed) && parsed == currentUserId.Value) return true;
            }
        }
        return false;
    }
}
