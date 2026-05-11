// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/*
 * Auth-gate tests for BulkOperationsController (super-admin bulk user
 * activate/suspend/delete-listings/assign-role). The blast-radius of these
 * endpoints makes the AdminOnly gate especially load-bearing.
 *
 * We hit POST /api/super-admin/bulk/activate with an empty body. Admin will
 * see 400 (model validation), but anything <401 proves auth passed; member
 * must see 403 and anonymous must see 401.
 */

using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Nexus.Api.Tests.Fixtures;

namespace Nexus.Api.Tests;

[Collection("Integration")]
public class BulkOperationsControllerAuthTests : IntegrationTestBase
{
    public BulkOperationsControllerAuthTests(NexusWebApplicationFactory factory) : base(factory) { }

    private const string Path = "/api/super-admin/bulk/activate";

    [Theory]
    [InlineData("anonymous", (int)HttpStatusCode.Unauthorized)]
    [InlineData("member", (int)HttpStatusCode.Forbidden)]
    [InlineData("admin", 200)]
    public async Task BulkActivate_AuthGate(string role, int expectedStatus)
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

        var resp = await Client.PostAsync(Path, JsonContent.Create(new { userIds = new int[0] }));

        if (role == "admin")
        {
            // Admin must not be auth-rejected. Body may be invalid → 400 is OK.
            ((int)resp.StatusCode).Should().BeLessThan(401,
                $"admin must not get auth-rejected on {Path}");
        }
        else
        {
            ((int)resp.StatusCode).Should().Be(expectedStatus);
        }
    }
}
