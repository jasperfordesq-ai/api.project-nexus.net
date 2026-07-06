// Copyright 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later

using System.Net;
using FluentAssertions;
using Nexus.Api.Tests.Fixtures;

namespace Nexus.Api.Tests;

[Collection("Integration")]
public class AdminV2RouteAliasRuntimeTests : IntegrationTestBase
{
    public AdminV2RouteAliasRuntimeTests(NexusWebApplicationFactory factory) : base(factory) { }

    [Theory]
    [InlineData("/api/v2/admin/categories")]
    [InlineData("/api/v2/admin/attributes")]
    [InlineData("/api/v2/admin/gamification/campaigns")]
    [InlineData("/api/v2/admin/blog")]
    [InlineData("/api/v2/admin/broker/dashboard")]
    [InlineData("/api/v2/admin/broker/risk-tags")]
    [InlineData("/api/v2/admin/broker/messages/unreviewed-count")]
    public async Task LaravelReactAdminV2ReadAliases_AsAdmin_ReturnOk(string path)
    {
        await AuthenticateAsAdminAsync();

        var response = await Client.GetAsync(path);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Theory]
    [InlineData("/api/v2/admin/caring-community/regional-points/config")]
    [InlineData("/api/v2/admin/caring-community/municipal-roi")]
    [InlineData("/api/v2/admin/caring-community/pilot-scoreboard")]
    [InlineData("/api/v2/admin/caring-community/sub-regions")]
    [InlineData("/api/v2/admin/caring-community/providers")]
    public async Task LaravelReactAdminCaringCommunityV2ReadAliases_AsAdmin_AreRouted(string path)
    {
        await AuthenticateAsAdminAsync();

        var response = await Client.GetAsync(path);

        response.StatusCode.Should().NotBe(HttpStatusCode.NotFound);
        response.StatusCode.Should().NotBe(HttpStatusCode.MethodNotAllowed);
    }

    [Theory]
    [InlineData("/api/v2/users/me/activity/dashboard")]
    [InlineData("/api/v2/users/me/availability")]
    [InlineData("/api/v2/users/me/preferences")]
    [InlineData("/api/v2/users/me/sessions")]
    [InlineData("/api/v2/users/me/skills")]
    [InlineData("/api/v2/users/me/insurance")]
    [InlineData("/api/v2/users/me/sub-accounts")]
    public async Task LaravelReactUsersMeV2ReadAliases_AsMember_AreRouted(string path)
    {
        await AuthenticateAsMemberAsync();

        var response = await Client.GetAsync(path);

        response.StatusCode.Should().NotBe(HttpStatusCode.NotFound);
        response.StatusCode.Should().NotBe(HttpStatusCode.MethodNotAllowed);
    }
}
