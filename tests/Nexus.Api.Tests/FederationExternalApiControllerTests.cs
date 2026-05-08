// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
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

    [Fact]
    public async Task GetHealth_WithoutFederationAuth_ReturnsOk()
    {
        ClearFederationHeaders();

        var response = await Client.GetAsync("/api/v1/federation/health");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        json.GetProperty("status").GetString().Should().Be("ok");
    }

    [Fact]
    public async Task GetListings_WithV15ApiKeyHeader_ReturnsPartnerTenantListings()
    {
        UseFederationApiKeyHeader();

        var response = await Client.GetAsync("/api/v1/federation/listings");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        var data = json.GetProperty("data").EnumerateArray().ToList();
        data.Should().Contain(item =>
            item.GetProperty("id").GetInt32() == TestData.PartnerListing.Id &&
            item.GetProperty("tenant_id").GetInt32() == TestData.Tenant2.Id);
    }

    [Fact]
    public async Task GetMembers_WithRawBearerApiKey_ReturnsOptedInPartnerMembers()
    {
        UseFederationBearerApiKey();

        var response = await Client.GetAsync("/api/v1/federation/members");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        var data = json.GetProperty("data").EnumerateArray().ToList();
        data.Should().Contain(item =>
            item.GetProperty("id").GetInt32() == TestData.OtherTenantUser.Id &&
            item.GetProperty("tenant_id").GetInt32() == TestData.Tenant2.Id);
    }

    [Fact]
    public async Task SendMessage_WithFederationKey_CreatesCrossServerMessageAndCanBeReadBack()
    {
        UseFederationKey();

        var create = await Client.PostAsJsonAsync("/api/v1/federation/messages", new
        {
            sender_id = TestData.MemberUser.Id,
            recipient_id = TestData.OtherTenantUser.Id,
            subject = "Federation check",
            body = "Hello from tenant one"
        }, JsonOptions);

        create.StatusCode.Should().Be(HttpStatusCode.Created);

        var list = await Client.GetAsync("/api/v1/federation/messages?direction=outbound");
        list.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await list.Content.ReadFromJsonAsync<JsonElement>();
        var data = json.GetProperty("data").EnumerateArray().ToList();
        data.Should().Contain(item => item.GetProperty("body").GetString()!.Contains("Hello from tenant one"));
    }

    [Fact]
    public async Task SendTimeCredits_WithFederationKey_CreatesCrossServerTransactionAndLookupWorks()
    {
        UseFederationKey();

        var create = await Client.PostAsJsonAsync("/api/v1/federation/transactions", new
        {
            sender_id = TestData.MemberUser.Id,
            recipient_id = TestData.OtherTenantUser.Id,
            amount = 1,
            description = "Federated time-credit parity test"
        }, JsonOptions);

        create.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await create.Content.ReadFromJsonAsync<JsonElement>();
        var transactionId = created.GetProperty("transaction_id").GetInt32();

        var lookup = await Client.GetAsync($"/api/v1/federation/transactions/{transactionId}");
        lookup.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await lookup.Content.ReadFromJsonAsync<JsonElement>();
        json.GetProperty("data").GetProperty("amount").GetDecimal().Should().Be(1);
        json.GetProperty("data").GetProperty("receiver").GetProperty("id").GetInt32()
            .Should().Be(TestData.OtherTenantUser.Id);
    }

    [Fact]
    public async Task GetListings_WithHmacSignature_ReturnsOk()
    {
        ClearFederationHeaders();
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();
        var nonce = Guid.NewGuid().ToString("N");
        var path = "/api/v1/federation/listings";
        var stringToSign = string.Join("\n", "GET", path, timestamp, nonce, string.Empty);
        var signature = Convert.ToHexString(HMACSHA256.HashData(
            Encoding.UTF8.GetBytes(TestDataSeeder.Tenant1FederationApiKey),
            Encoding.UTF8.GetBytes(stringToSign))).ToLowerInvariant();

        Client.DefaultRequestHeaders.Add("X-Federation-Key", TestDataSeeder.Tenant1FederationApiKey);
        Client.DefaultRequestHeaders.Add("X-Federation-Timestamp", timestamp);
        Client.DefaultRequestHeaders.Add("X-Federation-Nonce", nonce);
        Client.DefaultRequestHeaders.Add("X-Federation-Signature", signature);

        var response = await Client.GetAsync(path);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    private void UseFederationKey()
    {
        ClearFederationHeaders();
        Client.DefaultRequestHeaders.Add("X-Federation-Key", TestDataSeeder.Tenant1FederationApiKey);
    }

    private void UseFederationApiKeyHeader()
    {
        ClearFederationHeaders();
        Client.DefaultRequestHeaders.Add("X-API-Key", TestDataSeeder.Tenant1FederationApiKey);
    }

    private void UseFederationBearerApiKey()
    {
        ClearFederationHeaders();
        Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", TestDataSeeder.Tenant1FederationApiKey);
    }

    private void ClearFederationHeaders()
    {
        ClearAuthToken();
        Client.DefaultRequestHeaders.Remove("X-Federation-Key");
        Client.DefaultRequestHeaders.Remove("X-API-Key");
        Client.DefaultRequestHeaders.Remove("X-Federation-Timestamp");
        Client.DefaultRequestHeaders.Remove("X-Federation-Nonce");
        Client.DefaultRequestHeaders.Remove("X-Federation-Signature");
    }
}
