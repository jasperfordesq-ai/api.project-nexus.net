// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Nexus.Api.Tests.Fixtures;

namespace Nexus.Api.Tests;

[Collection("Integration")]
public sealed class LaravelReactMemberPremiumCompatibilityTests : IntegrationTestBase
{
    public LaravelReactMemberPremiumCompatibilityTests(NexusWebApplicationFactory factory) : base(factory) { }

    [Fact]
    public async Task MemberPremiumCheckoutAndPortal_ReturnLaravelReactRedirectEnvelopes()
    {
        await AuthenticateAsMemberAsync();

        var checkout = await Client.PostAsJsonAsync("/api/v2/member-premium/checkout", new
        {
            tier_id = 7,
            interval = "monthly",
            return_url = "https://app.example.test/test-tenant/premium/return"
        });

        checkout.StatusCode.Should().Be(HttpStatusCode.OK);
        var checkoutJson = await checkout.Content.ReadFromJsonAsync<JsonElement>();
        checkoutJson.GetProperty("success").GetBoolean().Should().BeTrue();
        var checkoutData = checkoutJson.GetProperty("data");
        checkoutData.GetProperty("checkout_url").GetString().Should().Contain("/premium/return?session_id=");
        checkoutData.GetProperty("session_id").GetString().Should().StartWith("cs_member_local_");
        checkoutData.TryGetProperty("tier", out _).Should().BeFalse();

        var portal = await Client.PostAsJsonAsync("/api/v2/member-premium/billing-portal", new
        {
            return_url = "https://app.example.test/test-tenant/premium/manage"
        });

        portal.StatusCode.Should().Be(HttpStatusCode.OK);
        var portalJson = await portal.Content.ReadFromJsonAsync<JsonElement>();
        portalJson.GetProperty("success").GetBoolean().Should().BeTrue();
        var portalData = portalJson.GetProperty("data");
        portalData.GetProperty("portal_url").GetString().Should().Contain("/premium/manage?portal_session=");
        portalData.TryGetProperty("url", out _).Should().BeFalse();
    }
}
