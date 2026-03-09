// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
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
    /// and the AdminOnly authorization policy.
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
                    }
                };
            });

        services.AddAuthorization(options =>
        {
            options.AddPolicy("AdminOnly", policy =>
                policy.RequireClaim("role", "admin", "super_admin"));
        });

        return services;
    }
}
