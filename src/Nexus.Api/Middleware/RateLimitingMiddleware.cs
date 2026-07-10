// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Net;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;

namespace Nexus.Api.Middleware;

/// <summary>
/// Configuration for rate limiting policies.
/// Protects against brute-force attacks on auth endpoints.
/// </summary>
public static class RateLimitingExtensions
{
    public const string AuthPolicy = "auth";
    public const string GeneralPolicy = "general";
    public const string AiPolicy = "Ai";
    public const string AiProviderTestPolicy = "ai-provider-test";
    public const string VolunteerWellbeingAlertsPolicy = "volunteer-wellbeing-alerts";
    public const string VolunteerWellbeingAlertUpdatePolicy = "volunteer-wellbeing-alert-update";
    public const string GuardianConsentListPolicy = "guardian-consent-list";
    public const string GuardianConsentRequestPolicy = "guardian-consent-request";
    public const string GuardianConsentVerifyPolicy = "guardian-consent-verify";
    public const string GuardianConsentWithdrawPolicy = "guardian-consent-withdraw";
    public const string RecurringPatternListPolicy = "volunteering-recurring-pattern-list";
    public const string RecurringPatternCreatePolicy = "volunteering-recurring-pattern-create";
    public const string RecurringPatternUpdatePolicy = "volunteering-recurring-pattern-update";
    public const string RecurringPatternDeletePolicy = "volunteering-recurring-pattern-delete";

    // Known trusted proxy IPs/networks (configure via appsettings in production)
    // These are common Docker/Kubernetes internal network ranges
    private static readonly string[] DefaultTrustedProxies = new[]
    {
        "10.0.0.0/8",      // Private network (Docker default)
        "172.16.0.0/12",   // Private network (Docker bridge)
        "192.168.0.0/16",  // Private network
        "127.0.0.1",       // Localhost
        "::1",             // IPv6 localhost
    };

    public static IServiceCollection AddRateLimitingPolicies(this IServiceCollection services, IConfiguration config)
    {
        // Get trusted proxy networks from config, or use defaults
        var trustedProxies = config.GetSection("RateLimiting:TrustedProxies").Get<string[]>()
            ?? DefaultTrustedProxies;

        services.AddRateLimiter(options =>
        {
            // Global limiter as fallback
            options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
                RateLimitPartition.GetFixedWindowLimiter(
                    partitionKey: GetClientIdentifier(context, trustedProxies),
                    factory: _ => new FixedWindowRateLimiterOptions
                    {
                        AutoReplenishment = true,
                        PermitLimit = config.GetValue("RateLimiting:General:PermitLimit", 100),
                        Window = TimeSpan.FromSeconds(config.GetValue("RateLimiting:General:WindowSeconds", 60))
                    }));

            // Strict policy for auth endpoints (login, register, forgot-password)
            options.AddPolicy(AuthPolicy, context =>
                RateLimitPartition.GetFixedWindowLimiter(
                    partitionKey: GetClientIdentifier(context, trustedProxies),
                    factory: _ => new FixedWindowRateLimiterOptions
                    {
                        AutoReplenishment = true,
                        PermitLimit = config.GetValue("RateLimiting:Auth:PermitLimit", 5),
                        Window = TimeSpan.FromSeconds(config.GetValue("RateLimiting:Auth:WindowSeconds", 60)),
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                        QueueLimit = 0 // No queuing - reject immediately
                    }));

            // General API policy
            options.AddPolicy(GeneralPolicy, context =>
                RateLimitPartition.GetFixedWindowLimiter(
                    partitionKey: GetClientIdentifier(context, trustedProxies),
                    factory: _ => new FixedWindowRateLimiterOptions
                    {
                        AutoReplenishment = true,
                        PermitLimit = config.GetValue("RateLimiting:General:PermitLimit", 100),
                        Window = TimeSpan.FromSeconds(config.GetValue("RateLimiting:General:WindowSeconds", 60))
                    }));

            // AI endpoints policy (more restrictive due to resource cost)
            options.AddPolicy(AiPolicy, context =>
                RateLimitPartition.GetFixedWindowLimiter(
                    partitionKey: GetClientIdentifier(context, trustedProxies),
                    factory: _ => new FixedWindowRateLimiterOptions
                    {
                        AutoReplenishment = true,
                        PermitLimit = config.GetValue("RateLimiting:Ai:PermitLimit", 10),
                        Window = TimeSpan.FromSeconds(config.GetValue("RateLimiting:Ai:WindowSeconds", 60)),
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                        QueueLimit = 5 // Allow some queuing for AI requests
                    }));

            // Provider connectivity tests can trigger paid or resource-intensive
            // upstream calls. Laravel limits these to 10 attempts per user/minute.
            options.AddPolicy(AiProviderTestPolicy, context =>
                RateLimitPartition.GetFixedWindowLimiter(
                    partitionKey: GetAuthenticatedUserOrClientIdentifier(context, trustedProxies),
                    factory: _ => new FixedWindowRateLimiterOptions
                    {
                        AutoReplenishment = true,
                        PermitLimit = 10,
                        Window = TimeSpan.FromSeconds(60),
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                        QueueLimit = 0
                    }));

            // Laravel uses independent 30/minute buckets for listing and updating
            // coordinator wellbeing alerts.
            options.AddPolicy(VolunteerWellbeingAlertsPolicy, context =>
                RateLimitPartition.GetFixedWindowLimiter(
                    partitionKey: GetAuthenticatedUserOrClientIdentifier(context, trustedProxies),
                    factory: _ => new FixedWindowRateLimiterOptions
                    {
                        AutoReplenishment = true,
                        PermitLimit = 30,
                        Window = TimeSpan.FromSeconds(60),
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                        QueueLimit = 0
                    }));

            options.AddPolicy(VolunteerWellbeingAlertUpdatePolicy, context =>
                RateLimitPartition.GetFixedWindowLimiter(
                    partitionKey: GetAuthenticatedUserOrClientIdentifier(context, trustedProxies),
                    factory: _ => new FixedWindowRateLimiterOptions
                    {
                        AutoReplenishment = true,
                        PermitLimit = 30,
                        Window = TimeSpan.FromSeconds(60),
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                        QueueLimit = 0
                    }));

            options.AddPolicy(GuardianConsentListPolicy, context =>
                RateLimitPartition.GetFixedWindowLimiter(
                    partitionKey: GetAuthenticatedUserOrClientIdentifier(context, trustedProxies),
                    factory: _ => FixedWindow(
                        config.GetValue("RateLimiting:GuardianConsent:ListPermitLimit", 30),
                        TimeSpan.FromSeconds(config.GetValue("RateLimiting:GuardianConsent:ListWindowSeconds", 60)))));

            options.AddPolicy(GuardianConsentRequestPolicy, context =>
                RateLimitPartition.GetFixedWindowLimiter(
                    partitionKey: GetAuthenticatedUserOrClientIdentifier(context, trustedProxies),
                    factory: _ => FixedWindow(
                        config.GetValue("RateLimiting:GuardianConsent:RequestPermitLimit", 5),
                        TimeSpan.FromSeconds(config.GetValue("RateLimiting:GuardianConsent:RequestWindowSeconds", 60)))));

            options.AddPolicy(GuardianConsentVerifyPolicy, context =>
                RateLimitPartition.GetFixedWindowLimiter(
                    partitionKey: GetClientIdentifier(context, trustedProxies),
                    factory: _ => FixedWindow(
                        config.GetValue("RateLimiting:GuardianConsent:VerifyPermitLimit", 10),
                        TimeSpan.FromSeconds(config.GetValue("RateLimiting:GuardianConsent:VerifyWindowSeconds", 300)))));

            options.AddPolicy(GuardianConsentWithdrawPolicy, context =>
                RateLimitPartition.GetFixedWindowLimiter(
                    partitionKey: GetAuthenticatedUserOrClientIdentifier(context, trustedProxies),
                    factory: _ => FixedWindow(
                        config.GetValue("RateLimiting:GuardianConsent:WithdrawPermitLimit", 10),
                        TimeSpan.FromSeconds(config.GetValue("RateLimiting:GuardianConsent:WithdrawWindowSeconds", 60)))));

            options.AddPolicy(RecurringPatternListPolicy, context =>
                RateLimitPartition.GetFixedWindowLimiter(
                    partitionKey: GetAuthenticatedUserOrClientIdentifier(context, trustedProxies),
                    factory: _ => FixedWindow(
                        config.GetValue("RateLimiting:RecurringPattern:ListPermitLimit", 60),
                        TimeSpan.FromSeconds(config.GetValue("RateLimiting:RecurringPattern:ListWindowSeconds", 60)))));

            options.AddPolicy(RecurringPatternCreatePolicy, context =>
                RateLimitPartition.GetFixedWindowLimiter(
                    partitionKey: GetAuthenticatedUserOrClientIdentifier(context, trustedProxies),
                    factory: _ => FixedWindow(
                        config.GetValue("RateLimiting:RecurringPattern:CreatePermitLimit", 10),
                        TimeSpan.FromSeconds(config.GetValue("RateLimiting:RecurringPattern:CreateWindowSeconds", 60)))));

            options.AddPolicy(RecurringPatternUpdatePolicy, context =>
                RateLimitPartition.GetFixedWindowLimiter(
                    partitionKey: GetAuthenticatedUserOrClientIdentifier(context, trustedProxies),
                    factory: _ => FixedWindow(
                        config.GetValue("RateLimiting:RecurringPattern:UpdatePermitLimit", 10),
                        TimeSpan.FromSeconds(config.GetValue("RateLimiting:RecurringPattern:UpdateWindowSeconds", 60)))));

            options.AddPolicy(RecurringPatternDeletePolicy, context =>
                RateLimitPartition.GetFixedWindowLimiter(
                    partitionKey: GetAuthenticatedUserOrClientIdentifier(context, trustedProxies),
                    factory: _ => FixedWindow(
                        config.GetValue("RateLimiting:RecurringPattern:DeletePermitLimit", 10),
                        TimeSpan.FromSeconds(config.GetValue("RateLimiting:RecurringPattern:DeleteWindowSeconds", 60)))));

            // Custom rejection response
            options.OnRejected = async (context, cancellationToken) =>
            {
                context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
                context.HttpContext.Response.ContentType = "application/json";

                var retryAfter = context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfterValue)
                    ? retryAfterValue.TotalSeconds
                    : 60;

                context.HttpContext.Response.Headers.RetryAfter = retryAfter.ToString("0");

                var path = context.HttpContext.Request.Path;
                var isGuardianConsentPath =
                    path.StartsWithSegments("/api/v2/volunteering/guardian-consents")
                    || path.StartsWithSegments("/api/volunteering/guardian-consents");
                var isRecurringPatternPath =
                    path.Value?.Contains("/volunteering/", StringComparison.OrdinalIgnoreCase) == true
                    && path.Value.Contains("/recurring-patterns", StringComparison.OrdinalIgnoreCase);
                var canonicalLimit = isRecurringPatternPath
                    ? context.HttpContext.Request.Method switch
                    {
                        "GET" => config.GetValue("RateLimiting:RecurringPattern:ListPermitLimit", 60),
                        "POST" => config.GetValue("RateLimiting:RecurringPattern:CreatePermitLimit", 10),
                        "PUT" => config.GetValue("RateLimiting:RecurringPattern:UpdatePermitLimit", 10),
                        "DELETE" => config.GetValue("RateLimiting:RecurringPattern:DeletePermitLimit", 10),
                        _ => 10
                    }
                    : isGuardianConsentPath
                    ? path.Value?.Contains("/verify/", StringComparison.OrdinalIgnoreCase) == true
                        ? config.GetValue("RateLimiting:GuardianConsent:VerifyPermitLimit", 10)
                        : context.HttpContext.Request.Method switch
                        {
                            "POST" => config.GetValue("RateLimiting:GuardianConsent:RequestPermitLimit", 5),
                            "DELETE" => config.GetValue("RateLimiting:GuardianConsent:WithdrawPermitLimit", 10),
                            _ => config.GetValue("RateLimiting:GuardianConsent:ListPermitLimit", 30)
                        }
                    : path.StartsWithSegments("/api/v2/admin/volunteering/wellbeing/alerts")
                    ? 30
                    : path.StartsWithSegments("/api/ai/test-provider") || path.StartsWithSegments("/api/v2/ai/test-provider")
                        ? 10
                        : (int?)null;

                if (canonicalLimit.HasValue)
                {
                    var retryAfterSeconds = Math.Max(1, (int)Math.Ceiling(retryAfter));
                    context.HttpContext.Response.Headers["X-RateLimit-Limit"] = canonicalLimit.Value.ToString();
                    context.HttpContext.Response.Headers["X-RateLimit-Remaining"] = "0";
                    context.HttpContext.Response.Headers["X-RateLimit-Reset"] =
                        (DateTimeOffset.UtcNow.ToUnixTimeSeconds() + retryAfterSeconds).ToString();
                    context.HttpContext.Response.Headers["API-Version"] = "2.0";

                    var tenantId = context.HttpContext.User.FindFirst("tenant_id")?.Value;
                    if (!string.IsNullOrWhiteSpace(tenantId))
                    {
                        context.HttpContext.Response.Headers["X-Tenant-ID"] = tenantId;
                    }

                    await context.HttpContext.Response.WriteAsJsonAsync(new
                    {
                        success = false,
                        error = "Rate limit exceeded. Please try again later.",
                        code = "RATE_LIMIT_EXCEEDED"
                    }, cancellationToken);
                    return;
                }

                await context.HttpContext.Response.WriteAsJsonAsync(new
                {
                    error = "Too many requests",
                    message = "Rate limit exceeded. Please try again later.",
                    retry_after_seconds = (int)retryAfter
                }, cancellationToken);
            };
        });

        return services;
    }

    private static FixedWindowRateLimiterOptions FixedWindow(int permitLimit, TimeSpan window) => new()
    {
        AutoReplenishment = true,
        PermitLimit = permitLimit,
        Window = window,
        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
        QueueLimit = 0
    };

    private static string GetAuthenticatedUserOrClientIdentifier(HttpContext context, string[] trustedProxies)
    {
        if (context.User.Identity?.IsAuthenticated == true)
        {
            var userId = context.User.FindFirst("sub")?.Value
                ?? context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (!string.IsNullOrWhiteSpace(userId))
            {
                var tenantId = context.User.FindFirst("tenant_id")?.Value ?? "unknown";
                return $"user:{tenantId}:{userId}";
            }
        }

        return $"client:{GetClientIdentifier(context, trustedProxies)}";
    }

    /// <summary>
    /// Get client identifier for rate limiting.
    /// Only trusts X-Forwarded-For header if the direct connection is from a trusted proxy.
    /// </summary>
    private static string GetClientIdentifier(HttpContext context, string[] trustedProxies)
    {
        var remoteIp = context.Connection.RemoteIpAddress;

        // Only trust X-Forwarded-For if the direct connection is from a trusted proxy
        if (remoteIp != null && IsTrustedProxy(remoteIp, trustedProxies))
        {
            var forwardedFor = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
            if (!string.IsNullOrEmpty(forwardedFor))
            {
                // Take the first IP (original client) from the chain
                var clientIp = forwardedFor.Split(',')[0].Trim();
                if (!string.IsNullOrEmpty(clientIp) && IPAddress.TryParse(clientIp, out _))
                {
                    return clientIp;
                }
            }
        }

        // Fall back to direct connection IP
        return remoteIp?.ToString() ?? "unknown";
    }

    /// <summary>
    /// Check if an IP address is from a trusted proxy network.
    /// </summary>
    private static bool IsTrustedProxy(IPAddress address, string[] trustedProxies)
    {
        foreach (var trusted in trustedProxies)
        {
            if (trusted.Contains('/'))
            {
                // CIDR notation (e.g., "10.0.0.0/8")
                if (IsInNetwork(address, trusted))
                    return true;
            }
            else
            {
                // Single IP
                if (IPAddress.TryParse(trusted, out var trustedIp) && address.Equals(trustedIp))
                    return true;
            }
        }

        return false;
    }

    /// <summary>
    /// Check if an IP address is within a CIDR network range.
    /// </summary>
    private static bool IsInNetwork(IPAddress address, string cidr)
    {
        try
        {
            var parts = cidr.Split('/');
            if (parts.Length != 2 || !IPAddress.TryParse(parts[0], out var networkAddress) || !int.TryParse(parts[1], out var prefixLength))
                return false;

            // Ensure both addresses are the same type (IPv4 or IPv6)
            if (address.AddressFamily != networkAddress.AddressFamily)
            {
                // Try to map IPv4 to IPv6 if needed
                if (address.IsIPv4MappedToIPv6)
                    address = address.MapToIPv4();
                if (networkAddress.IsIPv4MappedToIPv6)
                    networkAddress = networkAddress.MapToIPv4();

                if (address.AddressFamily != networkAddress.AddressFamily)
                    return false;
            }

            var addressBytes = address.GetAddressBytes();
            var networkBytes = networkAddress.GetAddressBytes();

            // Calculate how many full bytes and remaining bits to compare
            var fullBytes = prefixLength / 8;
            var remainingBits = prefixLength % 8;

            // Compare full bytes
            for (int i = 0; i < fullBytes && i < addressBytes.Length; i++)
            {
                if (addressBytes[i] != networkBytes[i])
                    return false;
            }

            // Compare remaining bits
            if (remainingBits > 0 && fullBytes < addressBytes.Length)
            {
                var mask = (byte)(0xFF << (8 - remainingBits));
                if ((addressBytes[fullBytes] & mask) != (networkBytes[fullBytes] & mask))
                    return false;
            }

            return true;
        }
        catch
        {
            return false;
        }
    }
}
