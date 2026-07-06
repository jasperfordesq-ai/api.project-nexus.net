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

    [Theory]
    [InlineData("/api/v2/groups")]
    [InlineData("/api/v2/groups/recommendations")]
    [InlineData("/api/v2/groups/1/discussions")]
    [InlineData("/api/v2/groups/1/files")]
    [InlineData("/api/v2/groups/1/chatrooms")]
    [InlineData("/api/v2/groups/1/tasks")]
    [InlineData("/api/v2/groups/1/wiki")]
    public async Task LaravelReactGroupsV2ReadAliases_AsMember_AreRouted(string path)
    {
        await AuthenticateAsMemberAsync();

        var response = await Client.GetAsync(path);

        response.StatusCode.Should().NotBe(HttpStatusCode.NotFound);
        response.StatusCode.Should().NotBe(HttpStatusCode.MethodNotAllowed);
    }

    [Theory]
    [InlineData("/api/v2/jobs")]
    [InlineData("/api/v2/jobs/saved")]
    [InlineData("/api/v2/jobs/my-applications")]
    [InlineData("/api/v2/jobs/my-interviews")]
    [InlineData("/api/v2/jobs/my-offers")]
    [InlineData("/api/v2/jobs/recommended")]
    [InlineData("/api/v2/jobs/saved-profile")]
    [InlineData("/api/v2/jobs/templates")]
    [InlineData("/api/v2/jobs/alerts")]
    public async Task LaravelReactJobsV2ReadAliases_AsMember_AreRouted(string path)
    {
        await AuthenticateAsMemberAsync();

        var response = await Client.GetAsync(path);

        response.StatusCode.Should().NotBe(HttpStatusCode.NotFound);
        response.StatusCode.Should().NotBe(HttpStatusCode.MethodNotAllowed);
    }

    [Theory]
    [InlineData("/api/v2/federation/status")]
    [InlineData("/api/v2/federation/settings")]
    [InlineData("/api/v2/federation/activity")]
    [InlineData("/api/v2/federation/members")]
    [InlineData("/api/v2/federation/messages")]
    [InlineData("/api/v2/federation/connections")]
    [InlineData("/api/v2/federation/groups")]
    public async Task LaravelReactFederationV2ReadAliases_AsMember_AreRouted(string path)
    {
        await AuthenticateAsMemberAsync();

        var response = await Client.GetAsync(path);

        response.StatusCode.Should().NotBe(HttpStatusCode.NotFound);
        response.StatusCode.Should().NotBe(HttpStatusCode.MethodNotAllowed);
    }

    [Theory]
    [InlineData("/api/v2/goals")]
    [InlineData("/api/v2/goals/discover")]
    [InlineData("/api/v2/goals/mentoring")]
    [InlineData("/api/v2/goals/templates")]
    [InlineData("/api/v2/goals/templates/categories")]
    public async Task LaravelReactGoalsV2ReadAliases_AsMember_AreRouted(string path)
    {
        await AuthenticateAsMemberAsync();

        var response = await Client.GetAsync(path);

        response.StatusCode.Should().NotBe(HttpStatusCode.NotFound);
        response.StatusCode.Should().NotBe(HttpStatusCode.MethodNotAllowed);
    }

    [Theory]
    [InlineData("/api/v2/ideation-challenges")]
    [InlineData("/api/v2/ideation-ideas")]
    public async Task LaravelReactIdeationV2ReadAliases_AsMember_AreRouted(string path)
    {
        await AuthenticateAsMemberAsync();

        var response = await Client.GetAsync(path);

        response.StatusCode.Should().NotBe(HttpStatusCode.NotFound);
        response.StatusCode.Should().NotBe(HttpStatusCode.MethodNotAllowed);
    }

    [Theory]
    [InlineData("/api/v2/caring-community/providers")]
    [InlineData("/api/v2/caring-community/sub-regions")]
    [InlineData("/api/v2/caring-community/hour-gifts/inbox")]
    [InlineData("/api/v2/caring-community/hour-transfer/my-history")]
    [InlineData("/api/v2/caring-community/federation-directory")]
    public async Task LaravelReactCaringCommunityV2ReadAliases_AsMember_AreRouted(string path)
    {
        await AuthenticateAsMemberAsync();

        var response = await Client.GetAsync(path);

        response.StatusCode.Should().NotBe(HttpStatusCode.NotFound);
        response.StatusCode.Should().NotBe(HttpStatusCode.MethodNotAllowed);
    }
}
