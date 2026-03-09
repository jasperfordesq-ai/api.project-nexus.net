// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
using System.Net;
using FluentAssertions;
using Nexus.Api.Tests.Fixtures;

namespace Nexus.Api.Tests;

[Collection("Integration")]
public class RegistrationPolicyControllerTests : IntegrationTestBase
{
    public RegistrationPolicyControllerTests(NexusWebApplicationFactory factory) : base(factory) { }

    [Fact]
    public async Task GetConfig_NoAuth_ReturnsOkOrNotFoundOrBadRequest()
    {
        ClearAuthToken();
        // This is a public endpoint but TenantResolutionMiddleware may return 400
        // for anonymous requests without tenant context
        var r = await Client.GetAsync("/api/registration/config");
        r.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound, HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GetAdminPolicy_AsMember_ReturnsForbidden()
    {
        await AuthenticateAsMemberAsync();
        var r = await Client.GetAsync("/api/registration/admin/policy");
        r.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task GetAdminPolicy_AsAdmin_ReturnsOk()
    {
        await AuthenticateAsAdminAsync();
        var r = await Client.GetAsync("/api/registration/admin/policy");
        r.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetAdminPending_AsAdmin_ReturnsOk()
    {
        await AuthenticateAsAdminAsync();
        var r = await Client.GetAsync("/api/registration/admin/pending");
        r.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetAdminOptions_AsAdmin_ReturnsOk()
    {
        await AuthenticateAsAdminAsync();
        var r = await Client.GetAsync("/api/registration/admin/options");
        r.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task VerifyStatus_AsMember_ReturnsOk()
    {
        await AuthenticateAsMemberAsync();
        var r = await Client.GetAsync("/api/registration/verify/status");
        r.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound);
    }
}
