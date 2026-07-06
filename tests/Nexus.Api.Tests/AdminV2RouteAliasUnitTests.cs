// Copyright 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later

using System.Reflection;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Routing;
using Nexus.Api.Controllers;

namespace Nexus.Api.Tests;

public class AdminV2RouteAliasUnitTests
{
    [Theory]
    [InlineData(typeof(AdminController), "api/v2/admin")]
    [InlineData(typeof(AdminCompatibilityController), "api/v2/admin")]
    [InlineData(typeof(AdminBlogController), "api/v2/admin/blog")]
    public void AdminControllers_ExposeLaravelReactV2AdminPrefix(Type controllerType, string expectedRoute)
    {
        controllerType
            .GetCustomAttributes<RouteAttribute>()
            .Select(route => route.Template)
            .Should().Contain(expectedRoute);
    }

    [Theory]
    [InlineData(typeof(AdminController), "ListCategories", typeof(HttpGetAttribute), "categories")]
    [InlineData(typeof(AdminController), "CreateCategory", typeof(HttpPostAttribute), "categories")]
    [InlineData(typeof(AdminController), "UpdateCategory", typeof(HttpPutAttribute), "categories/{id:int}")]
    [InlineData(typeof(AdminController), "DeleteCategory", typeof(HttpDeleteAttribute), "categories/{id:int}")]
    [InlineData(typeof(AdminCompatibilityController), "ListAttributes", typeof(HttpGetAttribute), "attributes")]
    [InlineData(typeof(AdminCompatibilityController), "CreateAttribute", typeof(HttpPostAttribute), "attributes")]
    [InlineData(typeof(AdminCompatibilityController), "UpdateAttribute", typeof(HttpPutAttribute), "attributes/{id:int}")]
    [InlineData(typeof(AdminCompatibilityController), "DeleteAttribute", typeof(HttpDeleteAttribute), "attributes/{id:int}")]
    [InlineData(typeof(AdminCompatibilityController), "ListGamificationCampaigns", typeof(HttpGetAttribute), "gamification/campaigns")]
    [InlineData(typeof(AdminCompatibilityController), "CreateGamificationCampaign", typeof(HttpPostAttribute), "gamification/campaigns")]
    [InlineData(typeof(AdminCompatibilityController), "UpdateGamificationCampaign", typeof(HttpPutAttribute), "gamification/campaigns/{id:int}")]
    [InlineData(typeof(AdminCompatibilityController), "DeleteGamificationCampaign", typeof(HttpDeleteAttribute), "gamification/campaigns/{id:int}")]
    [InlineData(typeof(AdminCompatibilityController), "RunSeoAudit", typeof(HttpGetAttribute), "tools/seo-audit")]
    [InlineData(typeof(AdminCompatibilityController), "RunSeoAudit", typeof(HttpPostAttribute), "tools/seo-audit")]
    [InlineData(typeof(AdminController), "SuspendUser", typeof(HttpPostAttribute), "users/{id:int}/suspend")]
    [InlineData(typeof(AdminController), "ApproveListing", typeof(HttpPostAttribute), "listings/{id:int}/approve")]
    [InlineData(typeof(AdminBlogController), "ListPosts", typeof(HttpGetAttribute), null)]
    [InlineData(typeof(AdminBlogController), "CreatePost", typeof(HttpPostAttribute), null)]
    [InlineData(typeof(AdminBlogController), "GetPost", typeof(HttpGetAttribute), "{id:int}")]
    [InlineData(typeof(AdminBlogController), "UpdatePost", typeof(HttpPutAttribute), "{id:int}")]
    [InlineData(typeof(AdminBlogController), "DeletePost", typeof(HttpDeleteAttribute), "{id:int}")]
    [InlineData(typeof(AdminBlogController), "ToggleStatus", typeof(HttpPostAttribute), "{id:int}/toggle-status")]
    public void LaravelReactAdminActions_HaveExpectedRouteTemplates(
        Type controllerType,
        string methodName,
        Type httpAttributeType,
        string? expectedTemplate)
    {
        var method = controllerType.GetMethod(methodName, BindingFlags.Instance | BindingFlags.Public);

        method.Should().NotBeNull();
        var attribute = method!.GetCustomAttributes()
            .FirstOrDefault(attr => attr.GetType() == httpAttributeType);

        attribute.Should().NotBeNull();
        ((HttpMethodAttribute)attribute!).Template.Should().Be(expectedTemplate);
    }
}
