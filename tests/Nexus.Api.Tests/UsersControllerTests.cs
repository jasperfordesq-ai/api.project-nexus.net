// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Nexus.Api.Data;
using Nexus.Api.Tests.Fixtures;

namespace Nexus.Api.Tests;

[Collection("Integration")]
public class UsersControllerTests : IntegrationTestBase
{
    public UsersControllerTests(NexusWebApplicationFactory factory) : base(factory) { }

    [Fact]
    public async Task GetMe_V2Alias_ReturnsCurrentUserForLaravelReact()
    {
        await AuthenticateAsMemberAsync();

        var response = await Client.GetAsync("/api/v2/users/me");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("email").GetString().Should().Be("member@test.com");
    }

    [Fact]
    public async Task DeleteMe_V2Alias_WithPassword_AnonymizesUserForLaravelReact()
    {
        await AuthenticateAsMemberAsync();
        using var request = new HttpRequestMessage(HttpMethod.Delete, "/api/v2/users/me")
        {
            Content = JsonContent.Create(new { password = TestDataSeeder.TestPassword })
        };

        var response = await Client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("data").GetProperty("message").GetString().Should().NotBeNullOrWhiteSpace();
        content.GetProperty("meta").GetProperty("base_url").GetString().Should().NotBeNullOrWhiteSpace();

        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
        var deletedUser = await db.Users.FindAsync(TestData.MemberUser.Id);
        deletedUser.Should().NotBeNull();
        deletedUser!.Email.Should().Be($"deleted-{TestData.MemberUser.Id}@anonymized.local");
        deletedUser.IsActive.Should().BeFalse();
        deletedUser.PasswordHash.Should().Be("DELETED");
    }

    [Fact]
    public async Task GetMe_WithoutAuth_ReturnsUnauthorized()
    {
        ClearAuthToken();
        var r = await Client.GetAsync("/api/users/me");
        r.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetMe_AsMember_ReturnsOk()
    {
        await AuthenticateAsMemberAsync();
        var r = await Client.GetAsync("/api/users/me");
        r.StatusCode.Should().Be(HttpStatusCode.OK);

        var user = await r.Content.ReadFromJsonAsync<JsonElement>();
        user.GetProperty("onboarding_completed").GetBoolean().Should().BeTrue();
    }

    [Fact]
    public async Task ListUsers_AsMember_ReturnsOk()
    {
        await AuthenticateAsMemberAsync();
        var r = await Client.GetAsync("/api/users");
        r.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetById_NonExistent_ReturnsNotFound()
    {
        await AuthenticateAsMemberAsync();
        var r = await Client.GetAsync("/api/users/99999");
        r.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetById_ExistingUser_ReturnsOk()
    {
        await AuthenticateAsMemberAsync();
        var r = await Client.GetAsync($"/api/users/{TestData.MemberUser.Id}");
        r.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task UploadAvatar_WithFileOverTwoMb_ReturnsOk()
    {
        await AuthenticateAsMemberAsync();
        using var form = new MultipartFormDataContent();
        var bytes = new byte[3 * 1024 * 1024];
        bytes[0] = 0x89;
        bytes[1] = 0x50;
        bytes[2] = 0x4E;
        bytes[3] = 0x47;
        using var fileContent = new ByteArrayContent(bytes);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        form.Add(fileContent, "avatar", "avatar.png");

        var response = await Client.PostAsync("/api/users/me/avatar", form);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task UploadedAvatarDownload_WithoutAuth_ReturnsOk()
    {
        await AuthenticateAsMemberAsync();

        var imageBytes = new byte[1024];
        imageBytes[0] = 0x89;
        imageBytes[1] = 0x50;
        imageBytes[2] = 0x4E;
        imageBytes[3] = 0x47;

        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(imageBytes);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        content.Add(fileContent, "avatar", "avatar.png");

        var uploadResponse = await Client.PostAsync("/api/users/me/avatar", content);
        uploadResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var uploadJson = await uploadResponse.Content.ReadFromJsonAsync<JsonElement>();
        var avatarUrl = uploadJson.GetProperty("avatar_url").GetString();

        ClearAuthToken();
        var downloadResponse = await Client.GetAsync(avatarUrl);

        downloadResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        downloadResponse.Content.Headers.ContentType?.MediaType.Should().Be("image/png");
    }
}
