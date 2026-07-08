// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;

namespace Nexus.Api.Extensions;

/// <summary>
/// IServiceCollection extension methods for JWT authentication and authorization.
/// Extracted from Program.cs to keep startup file concise.
/// </summary>
public static class AuthExtensions
{
    /// <summary>
    /// Configures JWT Bearer authentication, SignalR token extraction,
    /// and role-based authorization policies.
    /// </summary>
    /// <param name="services">The service collection.</param>
    /// <param name="configuration">Application configuration.</param>
    /// <param name="isTestEnvironment">
    /// When true, a deterministic secret is generated if Jwt:Secret is absent.
    /// </param>
    public static IServiceCollection AddNexusAuthentication(
        this IServiceCollection services,
        IConfiguration configuration,
        bool isTestEnvironment)
    {
        var jwtSecret = configuration["Jwt:Secret"];

        // Validate secret in non-test environments
        if (!isTestEnvironment && (string.IsNullOrEmpty(jwtSecret) || jwtSecret.Contains("REPLACE")))
        {
            throw new InvalidOperationException(
                "Jwt:Secret must be configured via environment variable. " +
                "Set JWT_SECRET or Jwt__Secret environment variable.");
        }

        // For testing, generate a deterministic secret if not explicitly configured
        if (isTestEnvironment && string.IsNullOrEmpty(jwtSecret))
        {
            jwtSecret = Convert.ToBase64String(
                System.Security.Cryptography.SHA256.HashData(
                    Encoding.UTF8.GetBytes("nexus-test-environment-jwt")));
        }

        // Check if issuer/audience are configured (PHP may not set these)
        var jwtIssuer = configuration["Jwt:Issuer"];
        var jwtAudience = configuration["Jwt:Audience"];
        var validateIssuer = !string.IsNullOrEmpty(jwtIssuer);
        var validateAudience = !string.IsNullOrEmpty(jwtAudience);

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                // Disable default claim type mapping so "role" claim stays as "role"
                options.MapInboundClaims = false;
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    // Preserve original claim names from JWT
                    NameClaimType = "sub",
                    RoleClaimType = "role",
                    // Issuer/Audience: Only validate if configured (PHP may not set these)
                    ValidateIssuer = validateIssuer,
                    ValidateAudience = validateAudience,
                    ValidIssuer = validateIssuer ? jwtIssuer : null,
                    ValidAudience = validateAudience ? jwtAudience : null,
                    // Lifetime: Always validate expiration
                    ValidateLifetime = true,
                    // Signature: Always validate (HS256 — must match PHP)
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret!)),
                    // Minimal clock skew for security (allows 1 min drift between servers)
                    ClockSkew = TimeSpan.FromMinutes(1)
                };

                // SignalR JWT: WebSockets cannot send custom headers, so the token
                // is sent via query string: /hubs/messages?access_token=<jwt>
                options.Events = new JwtBearerEvents
                {
                    OnMessageReceived = context =>
                    {
                        var accessToken = context.Request.Query["access_token"];
                        var path = context.HttpContext.Request.Path;
                        if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                            context.Token = accessToken;
                        return Task.CompletedTask;
                    },
                    // 2026-05-11 audit finding: AdminOnly policy validates the
                    // role claim from the JWT only, so demoting a user has no
                    // effect until their token expires (up to 120 min). For
                    // tokens claiming admin/super_admin we re-read the User
                    // row and reject if the DB role no longer matches —
                    // closing the stale-JWT admin escalation window. The
                    // DB hit is bounded to admin requests (low volume) so
                    // this does not move the hot-path latency.
                    OnTokenValidated = async context =>
                    {
                        var principal = context.Principal;
                        if (principal == null) return;
                        var tokenRole = principal.FindFirst("role")?.Value
                            ?? principal.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
                        if (string.IsNullOrEmpty(tokenRole)) return;
                        if (!PrivilegedTokenRoles.Contains(tokenRole)) return;

                        var sub = principal.FindFirst("sub")?.Value
                            ?? principal.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                        if (!int.TryParse(sub, out var userId)) return;

                        var db = context.HttpContext.RequestServices
                            .GetRequiredService<Nexus.Api.Data.NexusDbContext>();
                        var current = await db.Users
                            .IgnoreQueryFilters()
                            .Where(u => u.Id == userId)
                            .Select(u => new { u.Role, u.IsActive })
                            .FirstOrDefaultAsync();
                        if (current is null || !current.IsActive)
                        {
                            context.Fail("user_not_found_or_inactive");
                            return;
                        }
                        if (current.Role != tokenRole)
                        {
                            // Role demoted (or promoted to a different tier) since
                            // token was issued — reject so the client must re-auth.
                            context.Fail("role_changed_since_token_issue");
                        }
                    }
                };
            });

        services.AddAuthorization(options =>
        {
            options.AddPolicy("AdminOnly", policy =>
                policy.RequireClaim("role", "admin", "super_admin"));
            options.AddPolicy("BrokerOrAdmin", policy =>
                policy.RequireClaim("role", "admin", "super_admin", "tenant_admin", "god", "broker", "coordinator"));
        });

        return services;
    }

    private static readonly HashSet<string> PrivilegedTokenRoles = new(StringComparer.Ordinal)
    {
        "admin",
        "super_admin",
        "tenant_admin",
        "god",
        "broker",
        "coordinator"
    };
}
