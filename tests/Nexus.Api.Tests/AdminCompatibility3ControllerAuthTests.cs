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
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Nexus.Api.Data;
using Nexus.Api.Entities;
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

    [Fact]
    public async Task SuperUserPrivilegeV2Aliases_ReturnLaravelDataEnvelopesAndPersistState()
    {
        int tenantUserId;
        int globalUserId;
        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
            var tenantUser = NewSuperPanelUser("super-panel-tenant", TestData.Tenant1.Id);
            var globalUser = NewSuperPanelUser("super-panel-global", TestData.Tenant2.Id);
            db.Users.AddRange(tenantUser, globalUser);
            await db.SaveChangesAsync();
            tenantUserId = tenantUser.Id;
            globalUserId = globalUser.Id;
        }

        await AuthenticateAsAdminAsync();

        var grantTenant = await ReadJsonAsync(await Client.PostAsync($"/api/v2/admin/super/users/{tenantUserId}/grant-super-admin", null));
        grantTenant.TryGetProperty("success", out _).Should().BeFalse();
        var grantTenantData = grantTenant.GetProperty("data");
        grantTenantData.GetProperty("granted").GetBoolean().Should().BeTrue();
        grantTenantData.GetProperty("user_id").GetInt32().Should().Be(tenantUserId);

        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
            var user = await db.Users.IgnoreQueryFilters().SingleAsync(u => u.Id == tenantUserId);
            user.Role.Should().Be("tenant_admin");
        }

        var revokeTenant = await ReadJsonAsync(await Client.PostAsync($"/api/v2/admin/super/users/{tenantUserId}/revoke-super-admin", null));
        var revokeTenantData = revokeTenant.GetProperty("data");
        revokeTenantData.GetProperty("revoked").GetBoolean().Should().BeTrue();
        revokeTenantData.GetProperty("user_id").GetInt32().Should().Be(tenantUserId);

        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
            var user = await db.Users.IgnoreQueryFilters().SingleAsync(u => u.Id == tenantUserId);
            user.Role.Should().Be("member");
        }

        var grantGlobal = await ReadJsonAsync(await Client.PostAsync($"/api/v2/admin/super/users/{globalUserId}/grant-global-super-admin", null));
        grantGlobal.TryGetProperty("success", out _).Should().BeFalse();
        var grantGlobalData = grantGlobal.GetProperty("data");
        grantGlobalData.GetProperty("granted").GetBoolean().Should().BeTrue();
        grantGlobalData.GetProperty("user_id").GetInt32().Should().Be(globalUserId);
        grantGlobalData.GetProperty("level").GetString().Should().Be("global");

        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
            var user = await db.Users.IgnoreQueryFilters().SingleAsync(u => u.Id == globalUserId);
            user.Role.Should().Be("admin");
            var config = await db.TenantConfigs.IgnoreQueryFilters().SingleAsync(c =>
                c.TenantId == TestData.Tenant2.Id && c.Key == "super_admins.global_user_ids");
            config.Value.Should().Contain(globalUserId.ToString());
        }

        var revokeGlobal = await ReadJsonAsync(await Client.PostAsync($"/api/v2/admin/super/users/{globalUserId}/revoke-global-super-admin", null));
        var revokeGlobalData = revokeGlobal.GetProperty("data");
        revokeGlobalData.GetProperty("revoked").GetBoolean().Should().BeTrue();
        revokeGlobalData.GetProperty("user_id").GetInt32().Should().Be(globalUserId);
        revokeGlobalData.GetProperty("level").GetString().Should().Be("global");

        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
            var config = await db.TenantConfigs.IgnoreQueryFilters().SingleAsync(c =>
                c.TenantId == TestData.Tenant2.Id && c.Key == "super_admins.global_user_ids");
            config.Value.Should().NotContain(globalUserId.ToString());
        }

        var missing = await Client.PostAsync("/api/v2/admin/super/users/999999/grant-super-admin", null);
        missing.StatusCode.Should().Be(HttpStatusCode.NotFound);
        var missingJson = await missing.Content.ReadFromJsonAsync<JsonElement>();
        missingJson.GetProperty("errors")[0].GetProperty("code").GetString().Should().Be("NOT_FOUND");
    }

    [Fact]
    public async Task SuperUserMoveV2Aliases_ReturnLaravelDataEnvelopesAndUpdateTenantAndRole()
    {
        int moveUserId;
        int promoteUserId;
        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
            var moveUser = NewSuperPanelUser("super-panel-move", TestData.Tenant1.Id);
            var promoteUser = NewSuperPanelUser("super-panel-promote", TestData.Tenant2.Id);
            db.Users.AddRange(moveUser, promoteUser);
            await db.SaveChangesAsync();
            moveUserId = moveUser.Id;
            promoteUserId = promoteUser.Id;
        }

        await AuthenticateAsAdminAsync();

        var move = await ReadJsonAsync(await Client.PostAsJsonAsync($"/api/v2/admin/super/users/{moveUserId}/move-tenant", new
        {
            new_tenant_id = TestData.Tenant2.Id
        }));
        move.TryGetProperty("success", out _).Should().BeFalse();
        var moveData = move.GetProperty("data");
        moveData.GetProperty("moved").GetBoolean().Should().BeTrue();
        moveData.GetProperty("user_id").GetInt32().Should().Be(moveUserId);
        moveData.GetProperty("old_tenant_id").GetInt32().Should().Be(TestData.Tenant1.Id);
        moveData.GetProperty("new_tenant_id").GetInt32().Should().Be(TestData.Tenant2.Id);
        moveData.GetProperty("records_moved").GetInt32().Should().BeGreaterThanOrEqualTo(1);
        moveData.GetProperty("tables_failed").ValueKind.Should().Be(JsonValueKind.Array);

        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
            var movedUser = await db.Users.IgnoreQueryFilters().SingleAsync(u => u.Id == moveUserId);
            movedUser.TenantId.Should().Be(TestData.Tenant2.Id);
        }

        var promote = await ReadJsonAsync(await Client.PostAsJsonAsync($"/api/v2/admin/super/users/{promoteUserId}/move-and-promote", new
        {
            target_tenant_id = TestData.Tenant1.Id
        }));
        var promoteData = promote.GetProperty("data");
        promoteData.GetProperty("moved").GetBoolean().Should().BeTrue();
        promoteData.GetProperty("promoted").GetBoolean().Should().BeTrue();
        promoteData.GetProperty("user_id").GetInt32().Should().Be(promoteUserId);
        promoteData.GetProperty("old_tenant_id").GetInt32().Should().Be(TestData.Tenant2.Id);
        promoteData.GetProperty("new_tenant_id").GetInt32().Should().Be(TestData.Tenant1.Id);

        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
            var promotedUser = await db.Users.IgnoreQueryFilters().SingleAsync(u => u.Id == promoteUserId);
            promotedUser.TenantId.Should().Be(TestData.Tenant1.Id);
            promotedUser.Role.Should().Be("tenant_admin");
        }

        var missingTenant = await Client.PostAsJsonAsync($"/api/v2/admin/super/users/{moveUserId}/move-tenant", new { });
        missingTenant.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        var missingTenantJson = await missingTenant.Content.ReadFromJsonAsync<JsonElement>();
        missingTenantJson.GetProperty("errors")[0].GetProperty("code").GetString().Should().Be("VALIDATION_ERROR");
    }

    [Fact]
    public async Task SuperBulkOperationV2Aliases_ReturnLaravelDataEnvelopesAndPersistBulkState()
    {
        int userOneId;
        int userTwoId;
        int targetTenantId;
        int tenantToDeactivateId;
        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
            var targetTenant = new Tenant
            {
                Name = "Bulk move target",
                Slug = $"bulk-move-target-{Guid.NewGuid():N}",
                IsActive = true,
                CreatedAt = DateTime.UtcNow.AddDays(-2)
            };
            var tenantToDeactivate = new Tenant
            {
                Name = "Bulk deactivate tenant",
                Slug = $"bulk-deactivate-{Guid.NewGuid():N}",
                IsActive = true,
                CreatedAt = DateTime.UtcNow.AddDays(-2)
            };
            var userOne = NewSuperPanelUser("super-panel-bulk-one", TestData.Tenant1.Id);
            var userTwo = NewSuperPanelUser("super-panel-bulk-two", TestData.Tenant2.Id);
            db.Tenants.AddRange(targetTenant, tenantToDeactivate);
            db.Users.AddRange(userOne, userTwo);
            await db.SaveChangesAsync();
            userOneId = userOne.Id;
            userTwoId = userTwo.Id;
            targetTenantId = targetTenant.Id;
            tenantToDeactivateId = tenantToDeactivate.Id;
        }

        await AuthenticateAsAdminAsync();

        var move = await ReadJsonAsync(await Client.PostAsJsonAsync("/api/v2/admin/super/bulk/move-users", new
        {
            user_ids = new[] { userOneId, userTwoId, 999999 },
            target_tenant_id = targetTenantId,
            grant_super_admin = true
        }));
        move.TryGetProperty("success", out _).Should().BeFalse();
        var moveData = move.GetProperty("data");
        moveData.GetProperty("moved_count").GetInt32().Should().Be(2);
        moveData.GetProperty("total_requested").GetInt32().Should().Be(3);
        moveData.GetProperty("errors").ValueKind.Should().Be(JsonValueKind.Array);
        moveData.GetProperty("errors").EnumerateArray().Should().Contain(e => e.GetString()!.Contains("999999"));

        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
            var movedUsers = await db.Users.IgnoreQueryFilters()
                .Where(u => u.Id == userOneId || u.Id == userTwoId)
                .OrderBy(u => u.Id)
                .ToListAsync();
            movedUsers.Should().HaveCount(2);
            movedUsers.Should().OnlyContain(u => u.TenantId == targetTenantId);
            movedUsers.Should().OnlyContain(u => u.Role == "tenant_admin");
        }

        var update = await ReadJsonAsync(await Client.PostAsJsonAsync("/api/v2/admin/super/bulk/update-tenants", new
        {
            tenant_ids = new[] { tenantToDeactivateId, 999998 },
            action = "deactivate"
        }));
        update.TryGetProperty("success", out _).Should().BeFalse();
        var updateData = update.GetProperty("data");
        updateData.GetProperty("updated_count").GetInt32().Should().Be(1);
        updateData.GetProperty("total_requested").GetInt32().Should().Be(2);
        updateData.GetProperty("action").GetString().Should().Be("deactivate");
        updateData.GetProperty("errors").EnumerateArray().Should().Contain(e => e.GetString()!.Contains("999998"));

        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
            var tenant = await db.Tenants.IgnoreQueryFilters().SingleAsync(t => t.Id == tenantToDeactivateId);
            tenant.IsActive.Should().BeFalse();
        }

        var invalid = await Client.PostAsJsonAsync("/api/v2/admin/super/bulk/update-tenants", new
        {
            tenant_ids = new[] { tenantToDeactivateId },
            action = "archive"
        });
        invalid.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        var invalidJson = await invalid.Content.ReadFromJsonAsync<JsonElement>();
        invalidJson.GetProperty("errors")[0].GetProperty("code").GetString().Should().Be("VALIDATION_ERROR");
    }

    private static User NewSuperPanelUser(string prefix, int tenantId)
        => new()
        {
            TenantId = tenantId,
            Email = $"{prefix}-{Guid.NewGuid():N}@example.test",
            PasswordHash = TestDataSeeder.TestPasswordHash,
            FirstName = "Super",
            LastName = "Panel",
            Role = "member",
            IsActive = true,
            CreatedAt = DateTime.UtcNow.AddDays(-2)
        };

    private static async Task<JsonElement> ReadJsonAsync(HttpResponseMessage response)
    {
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }
}
