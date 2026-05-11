// Copyright © 2024–2026 Jasper Ford
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
public class AdminProvisioningRequestsTests : IntegrationTestBase
{
    public AdminProvisioningRequestsTests(NexusWebApplicationFactory factory) : base(factory) { }

    private const string AdminPath = "/api/admin/provisioning/requests";
    private const string PublicPath = "/api/provisioning/requests";

    private static object SampleBody(string subdomain = "acme-co") => new
    {
        org_name = "Acme Co",
        requested_subdomain = subdomain,
        contact_name = "Alice Admin",
        contact_email = "alice@acme.test",
        contact_phone = "+353 1 555 0000",
        plan = "community",
        country = "ie",
        notes = "Pilot tenant"
    };

    [Theory]
    [InlineData("anonymous", (int)HttpStatusCode.Unauthorized)]
    [InlineData("member", (int)HttpStatusCode.Forbidden)]
    [InlineData("admin", 200)]
    public async Task AdminListAuthGate(string role, int expectedStatus)
    {
        if (role == "anonymous") ClearAuthToken();
        else
        {
            var email = role == "admin" ? "admin@test.com" : "member@test.com";
            SetAuthToken(await GetAccessTokenAsync(email, "test-tenant"));
        }
        var resp = await Client.GetAsync(AdminPath);
        ((int)resp.StatusCode).Should().Be(expectedStatus);
    }

    [Fact]
    public async Task AdminGetEmpty_ReturnsOkWithEmptyData()
    {
        await AuthenticateAsAdminAsync();
        var resp = await Client.GetAsync(AdminPath);
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await resp.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("data").EnumerateArray().Count().Should().Be(0);
    }

    [Fact]
    public async Task AdminCreate_CreatesPendingRow()
    {
        await AuthenticateAsAdminAsync();
        var resp = await Client.PostAsJsonAsync(AdminPath, SampleBody("admincreate"));
        resp.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await resp.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("status").GetString().Should().Be("pending");
        body.GetProperty("requested_subdomain").GetString().Should().Be("admincreate");
    }

    [Fact]
    public async Task PublicSubmit_AnonymousAllowed_Creates202()
    {
        ClearAuthToken();
        var resp = await Client.PostAsJsonAsync(PublicPath, SampleBody("publicsub"));
        resp.StatusCode.Should().Be(HttpStatusCode.Accepted);
        var body = await resp.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("status").GetString().Should().Be("pending");
    }

    [Fact]
    public async Task AdminCreate_RejectsBadSubdomain()
    {
        await AuthenticateAsAdminAsync();
        var resp = await Client.PostAsJsonAsync(AdminPath, SampleBody("BAD SUB"));
        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task AdminCreate_RejectsDuplicateSubdomain()
    {
        await AuthenticateAsAdminAsync();
        var r1 = await Client.PostAsJsonAsync(AdminPath, SampleBody("dupsub"));
        r1.StatusCode.Should().Be(HttpStatusCode.Created);
        var r2 = await Client.PostAsJsonAsync(AdminPath, SampleBody("dupsub"));
        r2.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task AdminCreate_RejectsExistingTenantSlug()
    {
        await AuthenticateAsAdminAsync();
        // "test-tenant" already exists from seeder
        var resp = await Client.PostAsJsonAsync(AdminPath, SampleBody("test-tenant"));
        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task FullStateMachine_PendingThroughReady()
    {
        await AuthenticateAsAdminAsync();
        var created = await Client.PostAsJsonAsync(AdminPath, SampleBody("flowtest"));
        created.StatusCode.Should().Be(HttpStatusCode.Created);
        var id = (await created.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var approve = await Client.PostAsync($"{AdminPath}/{id}/approve", null);
        approve.StatusCode.Should().Be(HttpStatusCode.OK);
        (await approve.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("status").GetString().Should().Be("approved");

        var markProv = await Client.PostAsync($"{AdminPath}/{id}/mark-provisioning", null);
        markProv.StatusCode.Should().Be(HttpStatusCode.OK);
        (await markProv.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("status").GetString().Should().Be("provisioning");

        var markReady = await Client.PostAsJsonAsync($"{AdminPath}/{id}/mark-ready", new { created_tenant_id = 42 });
        markReady.StatusCode.Should().Be(HttpStatusCode.OK);
        var readyBody = await markReady.Content.ReadFromJsonAsync<JsonElement>();
        readyBody.GetProperty("status").GetString().Should().Be("ready");
        readyBody.GetProperty("created_tenant_id").GetInt32().Should().Be(42);
    }

    [Fact]
    public async Task RejectFromPending_SetsReasonAndTerminal()
    {
        await AuthenticateAsAdminAsync();
        var created = await Client.PostAsJsonAsync(AdminPath, SampleBody("rejtest"));
        var id = (await created.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
        var rej = await Client.PostAsJsonAsync($"{AdminPath}/{id}/reject", new { reason = "duplicate org" });
        rej.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await rej.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("status").GetString().Should().Be("rejected");
        body.GetProperty("failure_reason").GetString().Should().Be("duplicate org");

        // Cannot approve a rejected one
        var reApprove = await Client.PostAsync($"{AdminPath}/{id}/approve", null);
        reApprove.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task FailedThenRetry_ReturnsToApproved()
    {
        await AuthenticateAsAdminAsync();
        var created = await Client.PostAsJsonAsync(AdminPath, SampleBody("failtest"));
        var id = (await created.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
        await Client.PostAsync($"{AdminPath}/{id}/approve", null);
        await Client.PostAsync($"{AdminPath}/{id}/mark-provisioning", null);
        var failed = await Client.PostAsJsonAsync($"{AdminPath}/{id}/mark-failed", new { reason = "DNS failed" });
        failed.StatusCode.Should().Be(HttpStatusCode.OK);
        (await failed.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("status").GetString().Should().Be("failed");

        var retry = await Client.PostAsync($"{AdminPath}/{id}/retry", null);
        retry.StatusCode.Should().Be(HttpStatusCode.OK);
        var retryBody = await retry.Content.ReadFromJsonAsync<JsonElement>();
        retryBody.GetProperty("status").GetString().Should().Be("approved");
        retryBody.GetProperty("failure_reason").ValueKind.Should().Be(JsonValueKind.Null);
    }

    [Fact]
    public async Task MarkReady_RequiresCreatedTenantId()
    {
        await AuthenticateAsAdminAsync();
        var created = await Client.PostAsJsonAsync(AdminPath, SampleBody("readytest"));
        var id = (await created.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
        await Client.PostAsync($"{AdminPath}/{id}/approve", null);
        await Client.PostAsync($"{AdminPath}/{id}/mark-provisioning", null);
        var bad = await Client.PostAsJsonAsync($"{AdminPath}/{id}/mark-ready", new { created_tenant_id = 0 });
        bad.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
