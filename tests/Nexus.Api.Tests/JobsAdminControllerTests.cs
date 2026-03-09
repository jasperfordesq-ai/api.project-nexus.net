// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Nexus.Api.Tests.Fixtures;

namespace Nexus.Api.Tests;

[Collection("Integration")]
public class JobsAdminControllerTests : IntegrationTestBase
{
    public JobsAdminControllerTests(NexusWebApplicationFactory factory) : base(factory) { }

    [Fact]
    public async Task ListAll_WithoutAuth_ReturnsUnauthorized()
    {
        ClearAuthToken();
        var r = await Client.GetAsync("/api/admin/jobs");
        r.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task ListAll_AsMember_ReturnsForbidden()
    {
        await AuthenticateAsMemberAsync();
        var r = await Client.GetAsync("/api/admin/jobs");
        r.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task ListAll_AsAdmin_ReturnsOk()
    {
        await AuthenticateAsAdminAsync();
        var r = await Client.GetAsync("/api/admin/jobs");
        r.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetStats_AsAdmin_ReturnsOk()
    {
        await AuthenticateAsAdminAsync();
        var r = await Client.GetAsync("/api/admin/jobs/stats");
        r.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task UpdateStatus_NonExistent_ReturnsNotFoundOrBadRequest()
    {
        await AuthenticateAsAdminAsync();
        // Valid statuses are: draft, active, filled, expired, cancelled
        var r = await Client.PutAsJsonAsync("/api/admin/jobs/99999/status", new { status = "expired" });
        // May return BadRequest if validation fails before lookup, or NotFound for non-existent job
        r.StatusCode.Should().BeOneOf(HttpStatusCode.NotFound, HttpStatusCode.BadRequest);
    }
}
