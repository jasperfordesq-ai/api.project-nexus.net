// Copyright 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later

using System.Net;
using System.Net.Http.Json;
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

    [Theory]
    [InlineData("/api/v2/volunteering/opportunities")]
    [InlineData("/api/v2/volunteering/organisations")]
    [InlineData("/api/v2/volunteering/my-organisations")]
    [InlineData("/api/v2/volunteering/hours/summary")]
    [InlineData("/api/v2/volunteering/guardian-consents")]
    [InlineData("/api/v2/volunteering/wellbeing")]
    public async Task LaravelReactVolunteeringV2ReadAliases_AsMember_AreRouted(string path)
    {
        await AuthenticateAsMemberAsync();

        var response = await Client.GetAsync(path);

        response.StatusCode.Should().NotBe(HttpStatusCode.NotFound);
        response.StatusCode.Should().NotBe(HttpStatusCode.MethodNotAllowed);
    }

    [Theory]
    [InlineData("/api/v2/stories")]
    [InlineData("/api/v2/stories/archive")]
    [InlineData("/api/v2/exchanges")]
    [InlineData("/api/v2/exchanges/config")]
    [InlineData("/api/v2/group-exchanges")]
    public async Task LaravelReactStoriesAndExchangesV2ReadAliases_AsMember_AreRouted(string path)
    {
        await AuthenticateAsMemberAsync();

        var response = await Client.GetAsync(path);

        response.StatusCode.Should().NotBe(HttpStatusCode.NotFound);
        response.StatusCode.Should().NotBe(HttpStatusCode.MethodNotAllowed);
    }

    [Theory]
    [InlineData("/api/v2/messages/unread-count")]
    [InlineData("/api/v2/messages/restriction-status")]
    [InlineData("/api/v2/messages/reactions/batch")]
    [InlineData("/api/v2/polls")]
    [InlineData("/api/v2/polls/categories")]
    [InlineData("/api/v2/members/nearby")]
    [InlineData("/api/v2/members/top-endorsed")]
    [InlineData("/api/v2/members/availability/available")]
    [InlineData("/api/v2/members/availability/compatible")]
    public async Task LaravelReactMessagesPollsMembersV2ReadAliases_AsMember_AreRouted(string path)
    {
        await AuthenticateAsMemberAsync();

        var response = await Client.GetAsync(path);

        response.StatusCode.Should().NotBe(HttpStatusCode.NotFound);
        response.StatusCode.Should().NotBe(HttpStatusCode.MethodNotAllowed);
    }

    [Theory]
    [InlineData("/api/v2/auth/oauth/enabled-providers")]
    [InlineData("/api/v2/auth/oauth/google/redirect")]
    public async Task LaravelReactOAuthV2AnonymousReadAliases_AreRouted(string path)
    {
        var response = await Client.GetAsync(path);

        response.StatusCode.Should().NotBe(HttpStatusCode.NotFound);
        response.StatusCode.Should().NotBe(HttpStatusCode.MethodNotAllowed);
    }

    [Theory]
    [InlineData("/api/v2/auth/oauth/me/identities")]
    public async Task LaravelReactOAuthV2MemberReadAliases_AreRouted(string path)
    {
        await AuthenticateAsMemberAsync();

        var response = await Client.GetAsync(path);

        response.StatusCode.Should().NotBe(HttpStatusCode.NotFound);
        response.StatusCode.Should().NotBe(HttpStatusCode.MethodNotAllowed);
    }

    [Theory]
    [InlineData("/api/v2/kb")]
    [InlineData("/api/v2/kb/search?q=care")]
    [InlineData("/api/v2/kb/slug/getting-started")]
    public async Task LaravelReactKnowledgeBaseV2ReadAliases_AsMember_AreRouted(string path)
    {
        await AuthenticateAsMemberAsync();

        var response = await Client.GetAsync(path);

        response.StatusCode.Should().NotBe(HttpStatusCode.NotFound);
        response.StatusCode.Should().NotBe(HttpStatusCode.MethodNotAllowed);
    }

    [Theory]
    [InlineData("/api/v2/me/collections")]
    [InlineData("/api/v2/me/saved-items/check")]
    [InlineData("/api/v2/resources/categories")]
    [InlineData("/api/v2/resources/categories/tree")]
    [InlineData("/api/v2/search/saved")]
    [InlineData("/api/v2/skills/categories")]
    public async Task LaravelReactMemberResourceUtilityV2ReadAliases_AsMember_AreRouted(string path)
    {
        await AuthenticateAsMemberAsync();

        var response = await Client.GetAsync(path);

        response.StatusCode.Should().NotBe(HttpStatusCode.NotFound);
        response.StatusCode.Should().NotBe(HttpStatusCode.MethodNotAllowed);
    }

    [Theory]
    [InlineData("/api/v2/auth/2fa/status")]
    public async Task LaravelReactTwoFactorV2ReadAliases_AsMember_AreRouted(string path)
    {
        await AuthenticateAsMemberAsync();

        var response = await Client.GetAsync(path);

        response.StatusCode.Should().NotBe(HttpStatusCode.NotFound);
        response.StatusCode.Should().NotBe(HttpStatusCode.MethodNotAllowed);
    }

    [Theory]
    [InlineData("/api/v2/admin/reports")]
    [InlineData("/api/v2/admin/reports/stats")]
    [InlineData("/api/v2/admin/crm/tasks")]
    [InlineData("/api/v2/admin/pages")]
    [InlineData("/api/v2/admin/feed/posts")]
    [InlineData("/api/v2/admin/feed/stats")]
    [InlineData("/api/v2/admin/federation/api-keys")]
    [InlineData("/api/v2/admin/federation/partners")]
    public async Task LaravelReactAdminUtilityV2ReadAliases_AsAdmin_AreRouted(string path)
    {
        await AuthenticateAsAdminAsync();

        var response = await Client.GetAsync(path);

        response.StatusCode.Should().NotBe(HttpStatusCode.NotFound);
        response.StatusCode.Should().NotBe(HttpStatusCode.MethodNotAllowed);
    }

    [Theory]
    [InlineData("/api/v2/me/push-campaigns")]
    [InlineData("/api/v2/me/ad-campaigns")]
    [InlineData("/api/v2/ideation-campaigns")]
    [InlineData("/api/v2/ideation-templates")]
    public async Task LaravelReactAdvertisingAndIdeationV2ReadAliases_AsMember_AreRouted(string path)
    {
        await AuthenticateAsMemberAsync();

        var response = await Client.GetAsync(path);

        response.StatusCode.Should().NotBe(HttpStatusCode.NotFound);
        response.StatusCode.Should().NotBe(HttpStatusCode.MethodNotAllowed);
    }

    [Theory]
    [InlineData("/api/v2/admin/sso/providers")]
    [InlineData("/api/v2/admin/gamification/stats")]
    [InlineData("/api/v2/admin/gamification/badges")]
    public async Task LaravelReactAdminSsoAndGamificationV2ReadAliases_AsAdmin_AreRouted(string path)
    {
        await AuthenticateAsAdminAsync();

        var response = await Client.GetAsync(path);

        response.StatusCode.Should().NotBe(HttpStatusCode.NotFound);
        response.StatusCode.Should().NotBe(HttpStatusCode.MethodNotAllowed);
    }

    [Theory]
    [InlineData("/api/v2/comments?target_type=post&target_id=42")]
    [InlineData("/api/v2/comments/1/reactions")]
    [InlineData("/api/v2/resources")]
    [InlineData("/api/v2/resources/1/download")]
    [InlineData("/api/v2/group-chatrooms/1/messages")]
    [InlineData("/api/v2/team-tasks/1")]
    public async Task LaravelReactCommunityResourceTaskV2ReadAliases_AsMember_AreRouted(string path)
    {
        await AuthenticateAsMemberAsync();

        var response = await Client.GetAsync(path);

        response.StatusCode.Should().NotBe(HttpStatusCode.NotFound);
        response.StatusCode.Should().NotBe(HttpStatusCode.MethodNotAllowed);
    }

    [Theory]
    [InlineData("/api/v2/admin/identity/audit-log")]
    [InlineData("/api/v2/admin/identity/provider-health")]
    [InlineData("/api/v2/admin/identity/sessions")]
    [InlineData("/api/v2/admin/enterprise/dashboard")]
    [InlineData("/api/v2/admin/enterprise/config")]
    [InlineData("/api/v2/admin/moderation/queue")]
    [InlineData("/api/v2/admin/moderation/stats")]
    [InlineData("/api/v2/admin/tools/redirects")]
    [InlineData("/api/v2/admin/tools/404-errors")]
    [InlineData("/api/v2/admin/polls")]
    [InlineData("/api/v2/admin/resources")]
    [InlineData("/api/v2/admin/goals")]
    [InlineData("/api/v2/admin/ideation")]
    public async Task LaravelReactAdminOperationsV2ReadAliases_AsAdmin_AreRouted(string path)
    {
        await AuthenticateAsAdminAsync();

        var response = await Client.GetAsync(path);

        response.StatusCode.Should().NotBe(HttpStatusCode.NotFound);
        response.StatusCode.Should().NotBe(HttpStatusCode.MethodNotAllowed);
    }

    [Theory]
    [InlineData("/api/v2/connections")]
    [InlineData("/api/v2/connections/pending")]
    [InlineData("/api/v2/connections/suggestions")]
    [InlineData("/api/v2/connections/status/me")]
    [InlineData("/api/v2/bookmarks")]
    [InlineData("/api/v2/bookmarks/status")]
    [InlineData("/api/v2/gamification/daily-reward")]
    [InlineData("/api/v2/gamification/seasons")]
    [InlineData("/api/v2/me/verein-dues")]
    public async Task LaravelReactSocialGamificationVereinV2ReadAliases_AsMember_AreRouted(string path)
    {
        await AuthenticateAsMemberAsync();

        var response = await Client.GetAsync(path);

        response.StatusCode.Should().NotBe(HttpStatusCode.NotFound);
        response.StatusCode.Should().NotBe(HttpStatusCode.MethodNotAllowed);
    }

    [Theory]
    [InlineData("/api/v2/ads/impression")]
    [InlineData("/api/v2/bookmarks")]
    [InlineData("/api/v2/connections/request")]
    [InlineData("/api/v2/gamification/daily-reward")]
    public async Task LaravelReactSocialGamificationV2PostAliases_AsMember_AreRouted(string path)
    {
        await AuthenticateAsMemberAsync();

        var response = await Client.PostAsJsonAsync(path, new { });

        response.StatusCode.Should().NotBe(HttpStatusCode.NotFound);
        response.StatusCode.Should().NotBe(HttpStatusCode.MethodNotAllowed);
    }
}
