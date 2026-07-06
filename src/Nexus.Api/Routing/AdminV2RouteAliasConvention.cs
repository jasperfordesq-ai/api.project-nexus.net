// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using Microsoft.AspNetCore.Mvc.ApplicationModels;
using Microsoft.AspNetCore.Mvc.ActionConstraints;

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
        var existingRoutes = application.Controllers
            .SelectMany(controller => controller.Selectors
                .Concat(controller.Actions.SelectMany(action => action.Selectors)))
            .SelectMany(RouteKeys)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        foreach (var controller in application.Controllers)
        {
            AddAdminControllerAliases(controller, existingRoutes);
            AddUsersControllerAliases(controller, existingRoutes);
            AddJobsControllerAliases(controller, existingRoutes);
            AddFederationControllerAliases(controller, existingRoutes);
            AddGoalsControllerAliases(controller, existingRoutes);
            AddCaringCommunityControllerAliases(controller, existingRoutes);
            AddVolunteeringControllerAliases(controller, existingRoutes);
            AddSimpleV2ControllerAliases(controller, existingRoutes);
            AddSimpleV2ControllerActionAliases(controller, existingRoutes);
            AddGroupsControllerActionAliases(controller, existingRoutes);
            AddIdeationControllerActionAliases(controller, existingRoutes);
            AddUsersMeActionAliases(controller, existingRoutes);
            AddGroupsActionAliases(controller, existingRoutes);
            AddJobsActionAliases(controller, existingRoutes);
            AddFederationActionAliases(controller, existingRoutes);
            AddGoalsActionAliases(controller, existingRoutes);
            AddIdeationActionAliases(controller, existingRoutes);
            AddCaringCommunityActionAliases(controller, existingRoutes);
            AddVolunteeringActionAliases(controller, existingRoutes);
            AddSimpleV2ActionAliases(controller, existingRoutes);
        }
    }

    private static void AddAdminControllerAliases(ControllerModel controller, ISet<string> existingRoutes)
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
            existingRoutes.Add(Normalize(alias));
        }
    }

    private static void AddUsersMeActionAliases(ControllerModel controller, ISet<string> existingRoutes)
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
                if (HasRoute(action.Selectors, item.Alias!) || HasExistingActionRoute(existingRoutes, item.Selector, item.Alias!))
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
                AddRouteKeys(existingRoutes, aliasSelector);
            }
        }
    }

    private static void AddGroupsActionAliases(ControllerModel controller, ISet<string> existingRoutes)
    {
        foreach (var action in controller.Actions)
        {
            var aliases = action.Selectors
                .Where(selector => selector.AttributeRouteModel is not null)
                .Select(selector => new
                {
                    Selector = selector,
                    Alias = ToGroupsV2Alias(selector.AttributeRouteModel!.Template)
                })
                .Where(item => item.Alias is not null)
                .ToArray();

            foreach (var item in aliases)
            {
                if (HasRoute(action.Selectors, item.Alias!) || HasExistingActionRoute(existingRoutes, item.Selector, item.Alias!))
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
                AddRouteKeys(existingRoutes, aliasSelector);
            }
        }
    }

    private static void AddJobsActionAliases(ControllerModel controller, ISet<string> existingRoutes)
    {
        foreach (var action in controller.Actions)
        {
            var aliases = action.Selectors
                .Where(selector => selector.AttributeRouteModel is not null)
                .Select(selector => new
                {
                    Selector = selector,
                    Alias = ToJobsV2Alias(selector.AttributeRouteModel!.Template)
                })
                .Where(item => item.Alias is not null)
                .ToArray();

            foreach (var item in aliases)
            {
                if (HasRoute(action.Selectors, item.Alias!) || HasExistingActionRoute(existingRoutes, item.Selector, item.Alias!))
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
                AddRouteKeys(existingRoutes, aliasSelector);
            }
        }
    }

    private static void AddFederationActionAliases(ControllerModel controller, ISet<string> existingRoutes)
    {
        foreach (var action in controller.Actions)
        {
            var aliases = action.Selectors
                .Where(selector => selector.AttributeRouteModel is not null)
                .Select(selector => new
                {
                    Selector = selector,
                    Alias = ToFederationV2Alias(selector.AttributeRouteModel!.Template)
                })
                .Where(item => item.Alias is not null)
                .ToArray();

            foreach (var item in aliases)
            {
                if (HasRoute(action.Selectors, item.Alias!) || HasExistingActionRoute(existingRoutes, item.Selector, item.Alias!))
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
                AddRouteKeys(existingRoutes, aliasSelector);
            }
        }
    }

    private static void AddGoalsActionAliases(ControllerModel controller, ISet<string> existingRoutes)
    {
        foreach (var action in controller.Actions)
        {
            var aliases = action.Selectors
                .Where(selector => selector.AttributeRouteModel is not null)
                .Select(selector => new
                {
                    Selector = selector,
                    Alias = ToGoalsV2Alias(selector.AttributeRouteModel!.Template)
                })
                .Where(item => item.Alias is not null)
                .ToArray();

            foreach (var item in aliases)
            {
                if (HasRoute(action.Selectors, item.Alias!) || HasExistingActionRoute(existingRoutes, item.Selector, item.Alias!))
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
                AddRouteKeys(existingRoutes, aliasSelector);
            }
        }
    }

    private static void AddIdeationActionAliases(ControllerModel controller, ISet<string> existingRoutes)
    {
        foreach (var action in controller.Actions)
        {
            var aliases = action.Selectors
                .Where(selector => selector.AttributeRouteModel is not null)
                .Select(selector => new
                {
                    Selector = selector,
                    Alias = ToIdeationV2Alias(selector.AttributeRouteModel!.Template)
                })
                .Where(item => item.Alias is not null)
                .ToArray();

            foreach (var item in aliases)
            {
                if (HasRoute(action.Selectors, item.Alias!) || HasExistingActionRoute(existingRoutes, item.Selector, item.Alias!))
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
                AddRouteKeys(existingRoutes, aliasSelector);
            }
        }
    }

    private static void AddCaringCommunityActionAliases(ControllerModel controller, ISet<string> existingRoutes)
    {
        foreach (var action in controller.Actions)
        {
            var aliases = action.Selectors
                .Where(selector => selector.AttributeRouteModel is not null)
                .Select(selector => new
                {
                    Selector = selector,
                    Alias = ToCaringCommunityV2Alias(selector.AttributeRouteModel!.Template)
                })
                .Where(item => item.Alias is not null)
                .ToArray();

            foreach (var item in aliases)
            {
                if (HasRoute(action.Selectors, item.Alias!) || HasExistingActionRoute(existingRoutes, item.Selector, item.Alias!))
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
                AddRouteKeys(existingRoutes, aliasSelector);
            }
        }
    }

    private static void AddVolunteeringActionAliases(ControllerModel controller, ISet<string> existingRoutes)
    {
        foreach (var action in controller.Actions)
        {
            var aliases = action.Selectors
                .Where(selector => selector.AttributeRouteModel is not null)
                .Select(selector => new
                {
                    Selector = selector,
                    Alias = ToVolunteeringV2Alias(selector.AttributeRouteModel!.Template)
                })
                .Where(item => item.Alias is not null)
                .ToArray();

            foreach (var item in aliases)
            {
                if (HasRoute(action.Selectors, item.Alias!) || HasExistingActionRoute(existingRoutes, item.Selector, item.Alias!))
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
                AddRouteKeys(existingRoutes, aliasSelector);
            }
        }
    }

    private static void AddSimpleV2ActionAliases(ControllerModel controller, ISet<string> existingRoutes)
    {
        foreach (var action in controller.Actions)
        {
            var aliases = action.Selectors
                .Where(selector => selector.AttributeRouteModel is not null)
                .Select(selector => new
                {
                    Selector = selector,
                    Alias = ToSimpleV2Alias(selector.AttributeRouteModel!.Template)
                })
                .Where(item => item.Alias is not null)
                .ToArray();

            foreach (var item in aliases)
            {
                if (HasRoute(action.Selectors, item.Alias!) || HasExistingActionRoute(existingRoutes, item.Selector, item.Alias!))
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
                AddRouteKeys(existingRoutes, aliasSelector);
            }
        }
    }

    private static void AddGroupsControllerActionAliases(ControllerModel controller, ISet<string> existingRoutes)
    {
        var groupPrefixes = controller.Selectors
            .Select(selector => Normalize(selector.AttributeRouteModel?.Template))
            .Where(template => template.Equals("api/groups", StringComparison.OrdinalIgnoreCase))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        if (groupPrefixes.Length == 0)
        {
            return;
        }

        foreach (var action in controller.Actions)
        {
            var aliases = action.Selectors
                .Where(selector => selector.AttributeRouteModel is not null)
                .Select(selector => new
                {
                    Selector = selector,
                    Alias = ToGroupsV2Alias(CombineRoute("api/groups", selector.AttributeRouteModel!.Template))
                })
                .Where(item => item.Alias is not null)
                .ToArray();

            foreach (var item in aliases)
            {
                if (HasRoute(action.Selectors, item.Alias!) || HasExistingActionRoute(existingRoutes, item.Selector, item.Alias!))
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
                AddRouteKeys(existingRoutes, aliasSelector);
            }
        }
    }

    private static void AddSimpleV2ControllerActionAliases(ControllerModel controller, ISet<string> existingRoutes)
    {
        var controllerPrefixes = controller.Selectors
            .Select(selector => Normalize(selector.AttributeRouteModel?.Template))
            .Where(template => template.Equals("api", StringComparison.OrdinalIgnoreCase))
            .Concat(controller.Selectors
                .Select(selector => Normalize(selector.AttributeRouteModel?.Template))
                .Where(template => template.Equals("api/auth", StringComparison.OrdinalIgnoreCase) || template.Equals("api/resources", StringComparison.OrdinalIgnoreCase) || template.Equals("api/skills", StringComparison.OrdinalIgnoreCase) || template.Equals("api/search", StringComparison.OrdinalIgnoreCase)))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        if (controllerPrefixes.Length == 0)
        {
            return;
        }

        foreach (var action in controller.Actions)
        {
            var aliases = controllerPrefixes
                .SelectMany(prefix => action.Selectors
                    .Where(selector => selector.AttributeRouteModel is not null)
                    .Select(selector => new
                    {
                        Selector = selector,
                        Alias = ToSimpleV2Alias(CombineRoute(prefix, selector.AttributeRouteModel!.Template))
                    }))
                .Where(item => item.Alias is not null)
                .ToArray();

            foreach (var item in aliases)
            {
                if (HasRoute(action.Selectors, item.Alias!) || HasExistingActionRoute(existingRoutes, item.Selector, item.Alias!))
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
                AddRouteKeys(existingRoutes, aliasSelector);
            }
        }
    }

    private static void AddIdeationControllerActionAliases(ControllerModel controller, ISet<string> existingRoutes)
    {
        var apiPrefixes = controller.Selectors
            .Select(selector => Normalize(selector.AttributeRouteModel?.Template))
            .Where(template => template.Equals("api", StringComparison.OrdinalIgnoreCase))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        if (apiPrefixes.Length == 0)
        {
            return;
        }

        foreach (var action in controller.Actions)
        {
            var aliases = action.Selectors
                .Where(selector => selector.AttributeRouteModel is not null)
                .Select(selector => new
                {
                    Selector = selector,
                    Alias = ToIdeationV2Alias(CombineRoute("api", selector.AttributeRouteModel!.Template))
                })
                .Where(item => item.Alias is not null)
                .ToArray();

            foreach (var item in aliases)
            {
                if (HasRoute(action.Selectors, item.Alias!) || HasExistingActionRoute(existingRoutes, item.Selector, item.Alias!))
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
                AddRouteKeys(existingRoutes, aliasSelector);
            }
        }
    }

    private static void AddJobsControllerActionAliases(ControllerModel controller, ISet<string> existingRoutes)
    {
        var jobPrefixes = controller.Selectors
            .Select(selector => Normalize(selector.AttributeRouteModel?.Template))
            .Where(template => template.Equals("api/jobs", StringComparison.OrdinalIgnoreCase))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        if (jobPrefixes.Length == 0)
        {
            return;
        }

        foreach (var action in controller.Actions)
        {
            var aliases = action.Selectors
                .Where(selector => selector.AttributeRouteModel is not null)
                .Select(selector => new
                {
                    Selector = selector,
                    Alias = ToJobsV2Alias(CombineRoute("api/jobs", selector.AttributeRouteModel!.Template))
                })
                .Where(item => item.Alias is not null)
                .ToArray();

            foreach (var item in aliases)
            {
                if (HasRoute(action.Selectors, item.Alias!) || HasExistingActionRoute(existingRoutes, item.Selector, item.Alias!))
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
                AddRouteKeys(existingRoutes, aliasSelector);
            }
        }
    }

    private static void AddFederationControllerActionAliases(ControllerModel controller, ISet<string> existingRoutes)
    {
        var federationPrefixes = controller.Selectors
            .Select(selector => Normalize(selector.AttributeRouteModel?.Template))
            .Where(template => template.Equals("api/federation", StringComparison.OrdinalIgnoreCase))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        if (federationPrefixes.Length == 0)
        {
            return;
        }

        foreach (var action in controller.Actions)
        {
            var aliases = action.Selectors
                .Where(selector => selector.AttributeRouteModel is not null)
                .Select(selector => new
                {
                    Selector = selector,
                    Alias = ToFederationV2Alias(CombineRoute("api/federation", selector.AttributeRouteModel!.Template))
                })
                .Where(item => item.Alias is not null)
                .ToArray();

            foreach (var item in aliases)
            {
                if (HasRoute(action.Selectors, item.Alias!) || HasExistingActionRoute(existingRoutes, item.Selector, item.Alias!))
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
                AddRouteKeys(existingRoutes, aliasSelector);
            }
        }
    }

    private static string CombineRoute(string prefix, string? child)
    {
        var normalizedChild = Normalize(child);
        if (normalizedChild.Length == 0)
        {
            return Normalize(prefix);
        }

        if (normalizedChild.StartsWith("api/", StringComparison.OrdinalIgnoreCase))
        {
            return normalizedChild;
        }

        return Normalize(prefix) + "/" + normalizedChild;
    }

    private static void AddUsersControllerAliases(ControllerModel controller, ISet<string> existingRoutes)
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
            existingRoutes.Add(Normalize(alias));
        }
    }

    private static void AddJobsControllerAliases(ControllerModel controller, ISet<string> existingRoutes)
    {
        var aliases = controller.Selectors
            .Select(selector => selector.AttributeRouteModel?.Template)
            .Where(template => template is not null)
            .Select(template => Normalize(template))
            .Where(template => template.Equals("api/jobs", StringComparison.OrdinalIgnoreCase))
            .Select(template => "api/v2/jobs")
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
            existingRoutes.Add(Normalize(alias));
        }
    }

    private static void AddFederationControllerAliases(ControllerModel controller, ISet<string> existingRoutes)
    {
        var aliases = controller.Selectors
            .Select(selector => selector.AttributeRouteModel?.Template)
            .Where(template => template is not null)
            .Select(template => Normalize(template))
            .Where(template => template.Equals("api/federation", StringComparison.OrdinalIgnoreCase))
            .Select(template => "api/v2/federation")
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
            existingRoutes.Add(Normalize(alias));
        }
    }

    private static void AddGoalsControllerAliases(ControllerModel controller, ISet<string> existingRoutes)
    {
        var aliases = controller.Selectors
            .Select(selector => selector.AttributeRouteModel?.Template)
            .Where(template => template is not null)
            .Select(template => Normalize(template))
            .Where(template => template.Equals("api/goals", StringComparison.OrdinalIgnoreCase))
            .Select(template => "api/v2/goals")
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
            existingRoutes.Add(Normalize(alias));
        }
    }

    private static void AddCaringCommunityControllerAliases(ControllerModel controller, ISet<string> existingRoutes)
    {
        var aliases = controller.Selectors
            .Select(selector => selector.AttributeRouteModel?.Template)
            .Where(template => template is not null)
            .Select(template => Normalize(template))
            .Where(template =>
                template.Equals("api/caring-community", StringComparison.OrdinalIgnoreCase)
                || template.StartsWith("api/caring-community/", StringComparison.OrdinalIgnoreCase))
            .Select(template => "api/v2/caring-community" + template["api/caring-community".Length..])
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
            existingRoutes.Add(Normalize(alias));
        }
    }

    private static void AddVolunteeringControllerAliases(ControllerModel controller, ISet<string> existingRoutes)
    {
        var aliases = controller.Selectors
            .Select(selector => selector.AttributeRouteModel?.Template)
            .Where(template => template is not null)
            .Select(template => Normalize(template))
            .Where(template =>
                template.Equals("api/volunteering", StringComparison.OrdinalIgnoreCase)
                || template.StartsWith("api/volunteering/", StringComparison.OrdinalIgnoreCase))
            .Select(template => "api/v2/volunteering" + template["api/volunteering".Length..])
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
            existingRoutes.Add(Normalize(alias));
        }
    }

    private static void AddSimpleV2ControllerAliases(ControllerModel controller, ISet<string> existingRoutes)
    {
        var aliases = controller.Selectors
            .Select(selector => selector.AttributeRouteModel?.Template)
            .Where(template => template is not null)
            .Select(template => ToSimpleV2Alias(template))
            .Where(alias => alias is not null)
            .Select(alias => Normalize(alias))
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
            existingRoutes.Add(Normalize(alias));
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
            ? "/api/v2/users/me" + normalized["api/users/me".Length..]
            : null;
    }

    private static string? ToGroupsV2Alias(string? template)
    {
        var normalized = Normalize(template);
        return normalized.StartsWith("api/groups", StringComparison.OrdinalIgnoreCase)
            ? "/api/v2/groups" + normalized["api/groups".Length..]
            : null;
    }

    private static string? ToJobsV2Alias(string? template)
    {
        var normalized = Normalize(template);
        return normalized.StartsWith("api/jobs", StringComparison.OrdinalIgnoreCase)
            ? "/api/v2/jobs" + normalized["api/jobs".Length..]
            : null;
    }

    private static string? ToFederationV2Alias(string? template)
    {
        var normalized = Normalize(template);
        return normalized.StartsWith("api/federation", StringComparison.OrdinalIgnoreCase)
            ? "/api/v2/federation" + normalized["api/federation".Length..]
            : null;
    }

    private static string? ToGoalsV2Alias(string? template)
    {
        var normalized = Normalize(template);
        return normalized.StartsWith("api/goals", StringComparison.OrdinalIgnoreCase)
            ? "/api/v2/goals" + normalized["api/goals".Length..]
            : null;
    }

    private static string? ToIdeationV2Alias(string? template)
    {
        var normalized = Normalize(template);
        if (normalized.StartsWith("api/ideation-challenges", StringComparison.OrdinalIgnoreCase))
        {
            return "/api/v2/ideation-challenges" + normalized["api/ideation-challenges".Length..];
        }

        return normalized.StartsWith("api/ideation-ideas", StringComparison.OrdinalIgnoreCase)
            ? "/api/v2/ideation-ideas" + normalized["api/ideation-ideas".Length..]
            : null;
    }

    private static string? ToCaringCommunityV2Alias(string? template)
    {
        var normalized = Normalize(template);
        return normalized.StartsWith("api/caring-community", StringComparison.OrdinalIgnoreCase)
            ? "/api/v2/caring-community" + normalized["api/caring-community".Length..]
            : null;
    }

    private static string? ToVolunteeringV2Alias(string? template)
    {
        var normalized = Normalize(template);
        return normalized.StartsWith("api/volunteering", StringComparison.OrdinalIgnoreCase)
            ? "/api/v2/volunteering" + normalized["api/volunteering".Length..]
            : null;
    }

    private static string? ToSimpleV2Alias(string? template)
    {
        var normalized = Normalize(template);
        foreach (var prefix in new[]
        {
            "api/stories",
            "api/users",
            "api/connections",
            "api/exchanges",
            "api/group-exchanges",
            "api/messages",
            "api/polls",
            "api/members",
            "api/kb",
            "api/bookmarks",
            "api/bookmark-collections",
            "api/gamification",
            "api/ads/impression",
            "api/ideation-categories",
            "api/ideation-tags",
            "api/legal",
            "api/link-preview",
            "api/newsletter/unsubscribe",
            "api/reactions",
            "api/reviews",
            "api/shares",
            "api/me/collections",
            "api/me/saved-items",
            "api/me/push-campaigns",
            "api/me/ad-campaigns",
            "api/me/verein-dues",
            "api/me/fadp",
            "api/me/residency-verification",
            "api/me/verein-invitations",
            "api/comments",
            "api/resources",
            "api/group-chatrooms",
            "api/team-tasks",
            "api/resources/categories",
            "api/skills/categories",
            "api/search/saved",
            "api/ideation-campaigns",
            "api/ideation-templates",
            "api/auth/2fa",
            "api/auth/oauth",
            "api/admin/reports",
            "api/admin/crm",
            "api/admin/feed",
            "api/admin/pages",
            "api/admin/federation",
            "api/admin/sso",
            "api/admin/gamification",
            "api/admin/identity",
            "api/admin/enterprise",
            "api/admin/moderation",
            "api/admin/tools",
            "api/admin/polls",
            "api/admin/resources",
            "api/admin/goals",
            "api/admin/ideation",
            "api/admin/events",
            "api/admin/members"
        })
        {
            if (normalized.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            {
                return "/api/v2/" + normalized["api/".Length..];
            }
        }

        return null;
    }

    private static bool HasRoute(IList<SelectorModel> selectors, string template) =>
        selectors.Any(selector =>
            string.Equals(
                Normalize(selector.AttributeRouteModel?.Template),
                Normalize(template),
                StringComparison.OrdinalIgnoreCase));

    private static string Normalize(string? template) =>
        (template ?? string.Empty).Trim().TrimStart('/');

    private static bool HasExistingActionRoute(ISet<string> existingRoutes, SelectorModel sourceSelector, string alias) =>
        RouteKeys(sourceSelector, alias).Any(existingRoutes.Contains)
        || existingRoutes.Contains(RouteKey("*", alias));

    private static IEnumerable<string> RouteKeys(SelectorModel selector) =>
        RouteKeys(selector, selector.AttributeRouteModel?.Template);

    private static IEnumerable<string> RouteKeys(SelectorModel selector, string? template)
    {
        var normalized = Normalize(template);
        if (normalized.Length == 0)
        {
            yield break;
        }

        var methods = selector.ActionConstraints
            .OfType<HttpMethodActionConstraint>()
            .SelectMany(constraint => constraint.HttpMethods)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        if (methods.Length == 0)
        {
            yield return RouteKey("*", normalized);
            yield break;
        }

        foreach (var method in methods)
        {
            yield return RouteKey(method, normalized);
        }
    }

    private static void AddRouteKeys(ISet<string> existingRoutes, SelectorModel selector)
    {
        foreach (var key in RouteKeys(selector))
        {
            existingRoutes.Add(key);
        }
    }

    private static string RouteKey(string method, string? template) =>
        $"{method.ToUpperInvariant()} {Normalize(template)}";
}
