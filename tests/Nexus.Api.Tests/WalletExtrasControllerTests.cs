// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Nexus.Api.Tests.Fixtures;

namespace Nexus.Api.Tests;

[Collection("Integration")]
public class WalletExtrasControllerTests : IntegrationTestBase
{
    public WalletExtrasControllerTests(NexusWebApplicationFactory factory) : base(factory) { }

    [Fact]
    public async Task GrantStartingBalance_WithoutAuth_ReturnsUnauthorized()
    {
        ClearAuthToken();
        var r = await Client.PostAsJsonAsync("/api/wallet/grant-starting-balance", new
        {
            user_id = TestData.MemberUser.Id,
            amount = 10
        });
        r.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GrantStartingBalance_AsMember_ReturnsForbidden()
    {
        await AuthenticateAsMemberAsync();
        var r = await Client.PostAsJsonAsync("/api/wallet/grant-starting-balance", new
        {
            user_id = TestData.MemberUser.Id,
            amount = 10
        });
        r.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task CheckStartingBalance_AsAdmin_ReturnsOk()
    {
        await AuthenticateAsAdminAsync();
        var r = await Client.GetAsync($"/api/wallet/check-starting-balance/{TestData.MemberUser.Id}");
        r.StatusCode.Should().Be(HttpStatusCode.OK);
    }
}
