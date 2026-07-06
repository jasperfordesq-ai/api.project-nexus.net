// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using Microsoft.AspNetCore.Mvc.ApplicationModels;

namespace Nexus.Api.Routing;

/// <summary>
/// Adds Laravel React /api/v2 admin aliases for existing ASP.NET admin controllers.
/// </summary>
public sealed class AdminV2RouteAliasConvention : IApplicationModelConvention
{
    private static readonly string[] AliasedPrefixes =
    [
        "api/admin/caring-community",
        "api/admin/safeguarding"
    ];

    public void Apply(ApplicationModel application)
    {
        foreach (var controller in application.Controllers)
        {
            if (HasAbsoluteV2AdminActionRoute(controller))
            {
                continue;
            }

            var aliases = controller.Selectors
                .Where(selector => selector.AttributeRouteModel is not null)
                .Select(selector => selector.AttributeRouteModel!.Template)
                .Where(template => template is not null)
                .Select(template => template!)
                .Where(IsAliasedAdminPrefix)
                .Select(ToV2AdminAlias)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToArray();

            foreach (var alias in aliases)
            {
                if (controller.Selectors.Any(selector =>
                        string.Equals(selector.AttributeRouteModel?.Template, alias, StringComparison.OrdinalIgnoreCase)))
                {
                    continue;
                }

                controller.Selectors.Add(new SelectorModel
                {
                    AttributeRouteModel = new AttributeRouteModel
                    {
                        Template = alias
                    }
                });
            }
        }
    }

    private static bool HasAbsoluteV2AdminActionRoute(ControllerModel controller) =>
        controller.Actions
            .SelectMany(action => action.Selectors)
            .Any(selector => selector.AttributeRouteModel?.Template?.StartsWith(
                "/api/v2/admin/",
                StringComparison.OrdinalIgnoreCase) == true);

    private static bool IsAliasedAdminPrefix(string template) =>
        AliasedPrefixes.Any(prefix =>
            template.Equals(prefix, StringComparison.OrdinalIgnoreCase)
            || template.StartsWith(prefix + "/", StringComparison.OrdinalIgnoreCase));

    private static string ToV2AdminAlias(string template) =>
        "api/v2/admin/" + template["api/admin/".Length..];
}
