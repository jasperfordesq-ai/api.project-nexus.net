// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
using System.Net;
using FluentAssertions;
using Nexus.Api.Tests.Fixtures;

namespace Nexus.Api.Tests;

[Collection("Integration")]
public class FederationExternalApiControllerTests : IntegrationTestBase
{
    public FederationExternalApiControllerTests(NexusWebApplicationFactory factory) : base(factory) { }

    [Fact]
    public async Task GetInfo_WithoutFederationAuth_ReturnsOk()
    {
        ClearAuthToken();
        var r = await Client.GetAsync("/api/v1/federation");
        // GetApiInfo() is a public endpoint (no auth required), path is excluded from tenant middleware
        r.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetTimebanks_WithoutFederationAuth_ReturnsUnauthorized()
    {
        ClearAuthToken();
        var r = await Client.GetAsync("/api/v1/federation/timebanks");
        r.StatusCode.Should().BeOneOf(HttpStatusCode.Unauthorized, HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task GetListings_WithoutFederationAuth_ReturnsUnauthorized()
    {
        ClearAuthToken();
        var r = await Client.GetAsync("/api/v1/federation/listings");
        r.StatusCode.Should().BeOneOf(HttpStatusCode.Unauthorized, HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task GetMembers_WithoutFederationAuth_ReturnsUnauthorized()
    {
        ClearAuthToken();
        var r = await Client.GetAsync("/api/v1/federation/members");
        r.StatusCode.Should().BeOneOf(HttpStatusCode.Unauthorized, HttpStatusCode.Forbidden);
    }
}
