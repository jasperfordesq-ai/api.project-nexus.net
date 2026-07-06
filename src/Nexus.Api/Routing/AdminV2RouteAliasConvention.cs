// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using Microsoft.AspNetCore.Mvc.ApplicationModels;

namespace Nexus.Api.Routing;

/// <summary>
/// Adds Laravel React /api/v2 aliases for existing ASP.NET compatibility controllers.
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
            AddAdminControllerAliases(controller);
            AddUsersControllerAliases(controller);
            AddUsersMeActionAliases(controller);
        }
    }

    private static void AddAdminControllerAliases(ControllerModel controller)
    {
        if (controller.Actions
            .SelectMany(action => action.Selectors)
            .Any(selector => Normalize(selector.AttributeRouteModel?.Template).StartsWith(
                "api/v2/admin/",
                StringComparison.OrdinalIgnoreCase)))
        {
            return;
        }

        var aliases = controller.Selectors
            .Select(selector => selector.AttributeRouteModel?.Template)
            .Where(template => template is not null)
            .Select(template => template!)
            .Where(IsAliasedAdminPrefix)
            .Select(ToV2AdminAlias)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        foreach (var alias in aliases)
        {
            if (HasRoute(controller.Selectors, alias))
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

    private static void AddUsersMeActionAliases(ControllerModel controller)
    {
        foreach (var action in controller.Actions)
        {
            var aliases = action.Selectors
                .Where(selector => selector.AttributeRouteModel is not null)
                .Select(selector => new
                {
                    Selector = selector,
                    Alias = ToUsersMeV2Alias(selector.AttributeRouteModel!.Template)
                })
                .Where(item => item.Alias is not null)
                .ToArray();

            foreach (var item in aliases)
            {
                if (HasRoute(action.Selectors, item.Alias!))
                {
                    continue;
                }

                var aliasSelector = new SelectorModel(item.Selector)
                {
                    AttributeRouteModel = new AttributeRouteModel(item.Selector.AttributeRouteModel!)
                    {
                        Template = item.Alias
                    }
                };

                action.Selectors.Add(aliasSelector);
            }
        }
    }

    private static void AddUsersControllerAliases(ControllerModel controller)
    {
        var aliases = controller.Selectors
            .Select(selector => selector.AttributeRouteModel?.Template)
            .Where(template => template is not null)
            .Select(template => Normalize(template))
            .Where(template => template.Equals("api/users", StringComparison.OrdinalIgnoreCase))
            .Select(template => "api/v2/users")
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        foreach (var alias in aliases)
        {
            if (HasRoute(controller.Selectors, alias))
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

    private static bool IsAliasedAdminPrefix(string template) =>
        AliasedPrefixes.Any(prefix =>
            template.Equals(prefix, StringComparison.OrdinalIgnoreCase)
            || template.StartsWith(prefix + "/", StringComparison.OrdinalIgnoreCase));

    private static string ToV2AdminAlias(string template) =>
        "api/v2/admin/" + template["api/admin/".Length..];

    private static string? ToUsersMeV2Alias(string? template)
    {
        var normalized = Normalize(template);
        return normalized.StartsWith("api/users/me", StringComparison.OrdinalIgnoreCase)
            ? "api/v2/users/me" + normalized["api/users/me".Length..]
            : null;
    }

    private static bool HasRoute(IList<SelectorModel> selectors, string template) =>
        selectors.Any(selector =>
            string.Equals(
                Normalize(selector.AttributeRouteModel?.Template),
                Normalize(template),
                StringComparison.OrdinalIgnoreCase));

    private static string Normalize(string? template) =>
        (template ?? string.Empty).Trim().TrimStart('/');
}
