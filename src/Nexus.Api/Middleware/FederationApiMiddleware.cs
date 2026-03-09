// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Diagnostics;
using Nexus.Api.Services;

namespace Nexus.Api.Middleware;

/// <summary>
/// Middleware that authenticates external federation API requests.
/// Supports two authentication methods:
///   1. API Key via X-Federation-Key header
///   2. Federation JWT via Authorization: Bearer header (with token_type=federation)
/// Only applies to /api/v1/federation/* routes.
/// </summary>
public class FederationApiMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<FederationApiMiddleware> _logger;
    private const string FederationApiPrefix = "/api/v1/federation";
    private const string ApiKeyHeader = "X-Federation-Key";

    public FederationApiMiddleware(RequestDelegate next, ILogger<FederationApiMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Only apply to federation external API routes
        if (!context.Request.Path.StartsWithSegments(FederationApiPrefix))
        {
            await _next(context);
            return;
        }

        // Allow the info endpoint without auth
        if (context.Request.Path.Equals($"{FederationApiPrefix}", StringComparison.OrdinalIgnoreCase) &&
            context.Request.Method == "GET")
        {
            await _next(context);
            return;
        }

        var sw = Stopwatch.StartNew();
        var apiKeyService = context.RequestServices.GetRequiredService<FederationApiKeyService>();
        var jwtService = context.RequestServices.GetRequiredService<FederationJwtService>();

        // Try API Key authentication first
        if (context.Request.Headers.TryGetValue(ApiKeyHeader, out var apiKeyValue))
        {
            var apiKey = await apiKeyService.ValidateApiKeyAsync(apiKeyValue.ToString());
            if (apiKey == null)
            {
                sw.Stop();
                await LogAndReject(context, apiKeyService, sw.Elapsed, "Invalid or expired API key");
                return;
            }

            // Store the authenticated tenant info in HttpContext
            context.Items["FederationAuth"] = "apikey";
            context.Items["FederationTenantId"] = apiKey.TenantId;
            context.Items["FederationApiKeyId"] = apiKey.Id;
            context.Items["FederationScopes"] = apiKey.Scopes;

            await _next(context);

            // Log the API call
            sw.Stop();
            await apiKeyService.LogApiCallAsync(
                apiKey.TenantId, apiKey.Id,
                context.Request.Method, context.Request.Path,
                context.Response.StatusCode,
                context.Connection.RemoteIpAddress?.ToString(),
                (int)sw.ElapsedMilliseconds);
            return;
        }

        // Try Federation JWT authentication
        var authHeader = context.Request.Headers.Authorization.ToString();
        if (authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            var token = authHeader["Bearer ".Length..].Trim();
            var claims = jwtService.ValidateToken(token);

            if (claims != null)
            {
                context.Items["FederationAuth"] = "jwt";
                context.Items["FederationTenantId"] = claims.SourceTenantId;
                context.Items["FederationTargetTenantId"] = claims.TargetTenantId;
                context.Items["FederationScopes"] = string.Join(",", claims.Scopes);

                await _next(context);

                sw.Stop();
                await apiKeyService.LogApiCallAsync(
                    claims.SourceTenantId, null,
                    context.Request.Method, context.Request.Path,
                    context.Response.StatusCode,
                    context.Connection.RemoteIpAddress?.ToString(),
                    (int)sw.ElapsedMilliseconds);
                return;
            }
        }

        // No valid authentication
        sw.Stop();
        await LogAndReject(context, apiKeyService, sw.Elapsed, "Federation API authentication required");
    }

    private async Task LogAndReject(HttpContext context, FederationApiKeyService apiKeyService,
        TimeSpan elapsed, string message)
    {
        context.Response.StatusCode = 401;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsJsonAsync(new { error = message });

        try
        {
            await apiKeyService.LogApiCallAsync(
                null, null,
                context.Request.Method, context.Request.Path,
                401,
                context.Connection.RemoteIpAddress?.ToString(),
                (int)elapsed.TotalMilliseconds);
        }
        catch (Exception ex) when (ex is InvalidOperationException or Microsoft.EntityFrameworkCore.DbUpdateException or OperationCanceledException)
        {
            _logger.LogWarning(ex, "Failed to log rejected federation API call");
        }
    }
}
