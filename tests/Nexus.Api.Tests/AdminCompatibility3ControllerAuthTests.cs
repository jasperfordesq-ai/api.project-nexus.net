// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/*
 * Auth-gate tests for AdminCompatibility3Controller (React admin route aliases part 3).
 * Verifies the [Authorize(Policy = "AdminOnly")] gate on GET /api/admin/enterprise/roles.
 */

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Nexus.Api.Tests.Fixtures;

namespace Nexus.Api.Tests;

[Collection("Integration")]
public class AdminCompatibility3ControllerAuthTests : IntegrationTestBase
{
    public AdminCompatibility3ControllerAuthTests(NexusWebApplicationFactory factory) : base(factory) { }

    private const string Path = "/api/admin/enterprise/roles";

    [Theory]
    [InlineData("anonymous", (int)HttpStatusCode.Unauthorized)]
    [InlineData("member", (int)HttpStatusCode.Forbidden)]
    [InlineData("admin", 200)]
    public async Task AdminCompatibility3_AuthGate(string role, int expectedStatus)
    {
        if (role == "anonymous")
        {
            ClearAuthToken();
        }
        else
        {
            var email = role == "admin" ? "admin@test.com" : "member@test.com";
            var token = await GetAccessTokenAsync(email, "test-tenant");
            SetAuthToken(token);
        }

        var resp = await Client.GetAsync(Path);

        if (role == "admin")
        {
            var code = (int)resp.StatusCode;
            code.Should().NotBe(401, $"admin must not get auth-rejected on {Path}");
            code.Should().NotBe(403, $"{role} must not get authz-rejected on {Path}");
        }
        else
        {
            ((int)resp.StatusCode).Should().Be(expectedStatus);
        }
    }

    [Fact]
    public async Task SuperTenantV2Aliases_ReturnLaravelReactAdminShapes()
    {
        await AuthenticateAsAdminAsync();

        var list = await ReadJsonAsync(await Client.GetAsync("/api/v2/admin/super/tenants?search=test&is_active=true"));
        list.GetProperty("data").ValueKind.Should().Be(JsonValueKind.Array);
        list.GetProperty("meta").GetProperty("total").GetInt32().Should().BeGreaterThanOrEqualTo(0);

        var detail = await ReadJsonAsync(await Client.GetAsync($"/api/v2/admin/super/tenants/{TestData.Tenant1.Id}"));
        detail.GetProperty("id").GetInt32().Should().Be(TestData.Tenant1.Id);
        detail.GetProperty("is_active").GetBoolean().Should().BeTrue();

        var hierarchy = await ReadJsonAsync(await Client.GetAsync("/api/v2/admin/super/tenants/hierarchy"));
        hierarchy.GetProperty("data").ValueKind.Should().Be(JsonValueKind.Array);

        var created = await ReadJsonAsync(await Client.PostAsJsonAsync("/api/v2/admin/super/tenants", new
        {
            name = "React parity tenant",
            slug = "react-parity-tenant"
        }));
        created.GetProperty("success").GetBoolean().Should().BeTrue();

        var updated = await ReadJsonAsync(await Client.PutAsJsonAsync($"/api/v2/admin/super/tenants/{TestData.Tenant1.Id}", new
        {
            name = "Updated React parity tenant"
        }));
        updated.GetProperty("success").GetBoolean().Should().BeTrue();

        var deleted = await ReadJsonAsync(await Client.DeleteAsync($"/api/v2/admin/super/tenants/{TestData.Tenant1.Id}"));
        deleted.GetProperty("success").GetBoolean().Should().BeTrue();

        var reactivated = await ReadJsonAsync(await Client.PostAsJsonAsync($"/api/v2/admin/super/tenants/{TestData.Tenant1.Id}/reactivate", new { }));
        reactivated.GetProperty("success").GetBoolean().Should().BeTrue();

        var toggle = await ReadJsonAsync(await Client.PostAsJsonAsync($"/api/v2/admin/super/tenants/{TestData.Tenant1.Id}/toggle-hub", new { enable = true }));
        toggle.GetProperty("success").GetBoolean().Should().BeTrue();

        var moved = await ReadJsonAsync(await Client.PostAsJsonAsync($"/api/v2/admin/super/tenants/{TestData.Tenant1.Id}/move", new { new_parent_id = TestData.Tenant2.Id }));
        moved.GetProperty("success").GetBoolean().Should().BeTrue();
    }

    private static async Task<JsonElement> ReadJsonAsync(HttpResponseMessage response)
    {
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }
}
