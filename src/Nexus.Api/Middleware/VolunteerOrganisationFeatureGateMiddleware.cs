// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using Nexus.Api.Services;

namespace Nexus.Api.Middleware;

/// <summary>
/// Runs Laravel's volunteering feature gate before member organisation action
/// limiters so disabled requests do not consume create/list buckets.
/// </summary>
public sealed class VolunteerOrganisationFeatureGateMiddleware
{
    private readonly RequestDelegate _next;

    public VolunteerOrganisationFeatureGateMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(
        HttpContext context,
        VolunteerOrganisationService volunteerOrganisations)
    {
        if (!IsGatedRequest(context)
            || context.User.Identity?.IsAuthenticated != true
            || !int.TryParse(context.User.FindFirst("tenant_id")?.Value, out var tenantId))
        {
            await _next(context);
            return;
        }

        if (await volunteerOrganisations.IsFeatureEnabledAsync(tenantId, context.RequestAborted))
        {
            await _next(context);
            return;
        }

        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        context.Response.ContentType = "application/json";
        context.Response.Headers["API-Version"] = "2.0";
        context.Response.Headers["X-Tenant-ID"] = tenantId.ToString();
        await context.Response.WriteAsJsonAsync(new
        {
            errors = new[]
            {
                new
                {
                    code = "FEATURE_DISABLED",
                    message = "Volunteering module is not enabled for this community"
                }
            }
        }, context.RequestAborted);
    }

    private static bool IsGatedRequest(HttpContext context)
    {
        var path = context.Request.Path.Value?.TrimEnd('/');
        var isCreate = HttpMethods.IsPost(context.Request.Method)
            && (string.Equals(
                    path,
                    "/api/v2/volunteering/organisations",
                    StringComparison.OrdinalIgnoreCase)
                || string.Equals(
                    path,
                    "/api/volunteering/organisations",
                    StringComparison.OrdinalIgnoreCase));
        var isMyOrganisations = HttpMethods.IsGet(context.Request.Method)
            && (string.Equals(
                    path,
                    "/api/v2/volunteering/my-organisations",
                    StringComparison.OrdinalIgnoreCase)
                || string.Equals(
                    path,
                    "/api/volunteering/my-organisations",
                    StringComparison.OrdinalIgnoreCase));
        var opportunityIdSegment = path?.Split('/').LastOrDefault();
        var isOpportunityDelete = HttpMethods.IsDelete(context.Request.Method)
            && (path?.StartsWith(
                    "/api/v2/volunteering/opportunities/",
                    StringComparison.OrdinalIgnoreCase) == true
                || path?.StartsWith(
                    "/api/volunteering/opportunities/",
                    StringComparison.OrdinalIgnoreCase) == true)
            && int.TryParse(opportunityIdSegment, out _);
        var isMemberWallet = (path?.StartsWith(
                    "/api/v2/volunteering/organisations/",
                    StringComparison.OrdinalIgnoreCase) == true
                || path?.StartsWith(
                    "/api/volunteering/organisations/",
                    StringComparison.OrdinalIgnoreCase) == true)
            && (path.EndsWith("/wallet", StringComparison.OrdinalIgnoreCase)
                || path.EndsWith("/wallet/transactions", StringComparison.OrdinalIgnoreCase)
                || path.EndsWith("/wallet/deposit", StringComparison.OrdinalIgnoreCase));
        var isAdminWalletAdjustment = HttpMethods.IsPut(context.Request.Method)
            && path?.StartsWith(
                "/api/v2/admin/volunteering/organizations/",
                StringComparison.OrdinalIgnoreCase) == true
            && path.EndsWith("/wallet/adjust", StringComparison.OrdinalIgnoreCase);
        return isCreate
            || isMyOrganisations
            || isOpportunityDelete
            || isMemberWallet
            || isAdminWalletAdjustment;
    }
}
