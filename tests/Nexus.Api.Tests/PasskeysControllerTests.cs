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

/// <summary>
/// Integration tests for passkey/WebAuthn endpoints.
/// Note: Full registration/authentication flows require actual browser WebAuthn API
/// interaction, so these tests focus on endpoint availability, auth requirements,
/// error handling, and management operations.
/// </summary>
[Collection("Integration")]
public class PasskeysControllerTests : IntegrationTestBase
{
    public PasskeysControllerTests(NexusWebApplicationFactory factory) : base(factory) { }

    #region Registration Endpoint Tests

    [Fact]
    public async Task BeginRegistration_WithoutAuth_ReturnsUnauthorized()
    {
        // Act - no auth header
        var response = await Client.PostAsync("/api/passkeys/register/begin", null);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task BeginRegistration_WithAuth_ReturnsCreationOptions()
    {
        // Arrange
        var token = await GetAuthTokenAsync();
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/passkeys/register/begin");
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        // Act
        var response = await Client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        // Should return WebAuthn creation options
        content.GetProperty("rp").GetProperty("name").GetString().Should().NotBeNullOrEmpty();
        content.GetProperty("user").GetProperty("name").GetString().Should().NotBeNullOrEmpty();
        content.GetProperty("challenge").GetString().Should().NotBeNullOrEmpty();
        content.GetProperty("pubKeyCredParams").GetArrayLength().Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task FinishRegistration_WithoutBegin_ReturnsBadRequest()
    {
        // Arrange
        var token = await GetAuthTokenAsync();
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/passkeys/register/finish");
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        request.Content = JsonContent.Create(new
        {
            attestation_response = new { id = "fake", rawId = "fake", response = new { clientDataJSON = "fake", attestationObject = "fake" }, type = "public-key" },
            display_name = "Test Passkey"
        });

        // Act
        var response = await Client.SendAsync(request);

        // Assert - should fail because no begin was called first
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    #endregion

    #region Authentication Endpoint Tests

    [Fact]
    public async Task BeginAuthentication_WithoutParams_ReturnsOptions()
    {
        // Act - empty body for conditional/discoverable flow
        var response = await Client.PostAsJsonAsync("/api/passkeys/authenticate/begin", new { });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("session_id").GetString().Should().NotBeNullOrEmpty();
        content.GetProperty("options").GetProperty("challenge").GetString().Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task BeginAuthentication_WithTenantSlug_ReturnsOptions()
    {
        // Act
        var response = await Client.PostAsJsonAsync("/api/passkeys/authenticate/begin", new
        {
            tenant_slug = "test-tenant"
        });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("session_id").GetString().Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task FinishAuthentication_WithInvalidSession_ReturnsBadRequest()
    {
        // Act
        var response = await Client.PostAsJsonAsync("/api/passkeys/authenticate/finish", new
        {
            session_id = "invalid-session-id",
            assertion_response = new { id = "fake", rawId = "fake", response = new { clientDataJSON = "fake", authenticatorData = "fake", signature = "fake" }, type = "public-key" }
        });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    #endregion

    #region Management Endpoint Tests

    [Fact]
    public async Task ListPasskeys_WithoutAuth_ReturnsUnauthorized()
    {
        var response = await Client.GetAsync("/api/passkeys");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task ListPasskeys_WithAuth_ReturnsEmptyList()
    {
        // Arrange
        var token = await GetAuthTokenAsync();
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/passkeys");
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        // Act
        var response = await Client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("passkeys").GetArrayLength().Should().Be(0);
    }

    [Fact]
    public async Task DeletePasskey_NonExistent_ReturnsNotFound()
    {
        // Arrange
        var token = await GetAuthTokenAsync();
        using var request = new HttpRequestMessage(HttpMethod.Delete, "/api/passkeys/99999");
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        // Act
        var response = await Client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task RenamePasskey_NonExistent_ReturnsNotFound()
    {
        // Arrange
        var token = await GetAuthTokenAsync();
        using var request = new HttpRequestMessage(HttpMethod.Put, "/api/passkeys/99999");
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        request.Content = JsonContent.Create(new { display_name = "New Name" });

        // Act
        var response = await Client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    #endregion

    #region Helpers

    private async Task<string> GetAuthTokenAsync()
    {
        var response = await Client.PostAsJsonAsync("/api/auth/login", new
        {
            email = "admin@test.com",
            password = TestDataSeeder.TestPassword,
            tenant_slug = "test-tenant"
        });

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        return content.GetProperty("access_token").GetString()!;
    }

    #endregion
}
