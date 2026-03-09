// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Nexus.Api.Tests.Fixtures;

namespace Nexus.Api.Tests;

[Collection("Integration")]
public class OnboardingControllerTests : IntegrationTestBase
{
    public OnboardingControllerTests(NexusWebApplicationFactory factory) : base(factory) { }

    [Fact]
    public async Task GetSteps_WithoutAuth_ReturnsUnauthorized()
    {
        ClearAuthToken();
        var r = await Client.GetAsync("/api/onboarding/steps");
        r.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetSteps_AsMember_ReturnsOk()
    {
        await AuthenticateAsMemberAsync();
        var r = await Client.GetAsync("/api/onboarding/steps");
        r.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetProgress_AsMember_ReturnsOk()
    {
        await AuthenticateAsMemberAsync();
        var r = await Client.GetAsync("/api/onboarding/progress");
        r.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task CompleteStep_AsMember_ReturnsOkOrBadRequest()
    {
        await AuthenticateAsMemberAsync();
        var r = await Client.PostAsJsonAsync("/api/onboarding/complete", new { step_key = "profile_photo" });
        r.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task ResetProgress_AsMember_ReturnsOk()
    {
        await AuthenticateAsMemberAsync();
        var r = await Client.PostAsync("/api/onboarding/reset", null);
        r.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task AdminCreateStep_AsMember_ReturnsForbidden()
    {
        await AuthenticateAsMemberAsync();
        var r = await Client.PostAsJsonAsync("/api/onboarding/admin/steps", new
        {
            key = "test_step",
            title = "Test Step",
            description = "A test step",
            sort_order = 99,
            is_required = false,
            xp_reward = 10
        });
        r.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task AdminCreateStep_AsAdmin_ReturnsOkOrCreated()
    {
        await AuthenticateAsAdminAsync();
        var r = await Client.PostAsJsonAsync("/api/onboarding/admin/steps", new
        {
            key = "test_step_admin",
            title = "Admin Test Step",
            description = "An admin test step",
            sort_order = 99,
            is_required = false,
            xp_reward = 10
        });
        r.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.Created);
    }

    [Fact]
    public async Task AdminDeleteStep_NonExistent_ReturnsNotFound()
    {
        await AuthenticateAsAdminAsync();
        var r = await Client.DeleteAsync("/api/onboarding/admin/steps/99999");
        r.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
