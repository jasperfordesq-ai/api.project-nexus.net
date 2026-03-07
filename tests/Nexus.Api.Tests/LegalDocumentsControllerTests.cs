// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Nexus.Api.Tests.Fixtures;
using Xunit;

namespace Nexus.Api.Tests;

[Collection("Integration")]
public class LegalDocumentsControllerTests : IntegrationTestBase
{
    public LegalDocumentsControllerTests(NexusWebApplicationFactory factory) : base(factory) { }

    [Fact]
    public async Task ListDocuments_AsAuthenticated_ReturnsOk()
    {
        await AuthenticateAsMemberAsync();
        var response = await Client.GetAsync("/api/legal/documents");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("data").ValueKind.Should().Be(JsonValueKind.Array);
    }

    [Fact]
    public async Task CreateDocument_AsAdmin_ReturnsCreated()
    {
        await AuthenticateAsAdminAsync();
        var response = await Client.PostAsJsonAsync("/api/admin/legal/documents", new
        {
            title = "Terms of Service",
            slug = "terms-of-service",
            content = "These are the terms of service for Project NEXUS.",
            version = "1.0",
            is_active = true,
            requires_acceptance = true
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("title").GetString().Should().Be("Terms of Service");
        content.GetProperty("version").GetString().Should().Be("1.0");
    }

    [Fact]
    public async Task AcceptDocument_AsAuthenticated_ReturnsOk()
    {
        // Create a document as admin
        await AuthenticateAsAdminAsync();
        var createResponse = await Client.PostAsJsonAsync("/api/admin/legal/documents", new
        {
            title = "Privacy Policy",
            slug = "privacy-policy",
            content = "Privacy policy content.",
            version = "1.0",
            is_active = true,
            requires_acceptance = true
        });
        var doc = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        var docId = doc.GetProperty("id").GetInt32();

        // Accept as member
        await AuthenticateAsMemberAsync();
        var response = await Client.PostAsync($"/api/legal/documents/{docId}/accept", null);
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetDocumentBySlug_NonExistent_ReturnsNotFound()
    {
        await AuthenticateAsMemberAsync();
        var response = await Client.GetAsync("/api/legal/documents/by-slug/nonexistent");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
