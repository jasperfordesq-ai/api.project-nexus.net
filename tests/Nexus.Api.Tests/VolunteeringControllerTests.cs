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
/// Integration tests for the VolunteeringController.
/// Tests opportunity CRUD, applications, shifts, check-ins, stats, and error cases.
/// </summary>
[Collection("Integration")]
public class VolunteeringControllerTests : IntegrationTestBase
{
    public VolunteeringControllerTests(NexusWebApplicationFactory factory) : base(factory) { }

    #region Helpers

    /// <summary>
    /// Create a volunteer opportunity as the currently authenticated user and return its ID.
    /// The opportunity starts in Draft status.
    /// </summary>
    private async Task<int> CreateOpportunityAsync(
        string title = "Test Volunteer Opportunity",
        string? description = "Help needed for community project",
        string? location = "Community Center",
        int requiredVolunteers = 5,
        decimal? creditReward = null)
    {
        var response = await Client.PostAsJsonAsync("/api/volunteering/opportunities", new
        {
            title,
            description,
            location,
            required_volunteers = requiredVolunteers,
            starts_at = DateTime.UtcNow.AddDays(7),
            ends_at = DateTime.UtcNow.AddDays(7).AddHours(4),
            credit_reward = creditReward
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        return content.GetProperty("id").GetInt32();
    }

    /// <summary>
    /// Create an opportunity and publish it so it accepts applications.
    /// </summary>
    private async Task<int> CreateAndPublishOpportunityAsync(
        string title = "Published Volunteer Opportunity",
        string? description = "Published opportunity for testing",
        int requiredVolunteers = 5,
        decimal? creditReward = null)
    {
        var id = await CreateOpportunityAsync(title, description, requiredVolunteers: requiredVolunteers, creditReward: creditReward);

        var publishResponse = await Client.PutAsync($"/api/volunteering/opportunities/{id}/publish", null);
        publishResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        return id;
    }

    /// <summary>
    /// Create a shift for an opportunity and return its ID.
    /// </summary>
    private async Task<int> CreateShiftAsync(int opportunityId, string? title = "Morning Shift")
    {
        var response = await Client.PostAsJsonAsync($"/api/volunteering/opportunities/{opportunityId}/shifts", new
        {
            title,
            starts_at = DateTime.UtcNow.AddDays(7),
            ends_at = DateTime.UtcNow.AddDays(7).AddHours(4),
            max_volunteers = 3,
            location = "Main Hall"
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        return content.GetProperty("id").GetInt32();
    }

    /// <summary>
    /// Apply to an opportunity as the currently authenticated user and return the application ID.
    /// </summary>
    private async Task<int> ApplyToOpportunityAsync(int opportunityId, string? message = "I would like to help")
    {
        var response = await Client.PostAsJsonAsync($"/api/volunteering/opportunities/{opportunityId}/apply", new
        {
            message
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        return content.GetProperty("id").GetInt32();
    }

    #endregion

    #region Create Opportunity

    [Fact]
    public async Task CreateOpportunity_AsAdmin_ReturnsCreated()
    {
        // Arrange
        await AuthenticateAsAdminAsync();

        // Act
        var response = await Client.PostAsJsonAsync("/api/volunteering/opportunities", new
        {
            title = "Community Garden Cleanup",
            description = "Help us clean up the community garden",
            location = "Community Garden",
            required_volunteers = 10,
            is_recurring = false,
            starts_at = DateTime.UtcNow.AddDays(14),
            ends_at = DateTime.UtcNow.AddDays(14).AddHours(3),
            skills_required = "Gardening",
            credit_reward = 5.0m
        });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("id").GetInt32().Should().BeGreaterThan(0);
        content.GetProperty("title").GetString().Should().Be("Community Garden Cleanup");
        content.GetProperty("status").GetString().Should().Be("draft");
    }

    [Fact]
    public async Task CreateOpportunity_MissingTitle_ReturnsBadRequest()
    {
        // Arrange
        await AuthenticateAsAdminAsync();

        // Act
        var response = await Client.PostAsJsonAsync("/api/volunteering/opportunities", new
        {
            description = "No title provided",
            required_volunteers = 3
        });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CreateOpportunity_Unauthenticated_ReturnsUnauthorized()
    {
        // Arrange
        ClearAuthToken();

        // Act
        var response = await Client.PostAsJsonAsync("/api/volunteering/opportunities", new
        {
            title = "Unauthorized Opportunity"
        });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    #endregion

    #region List Opportunities

    [Fact]
    public async Task ListOpportunities_ReturnsPublishedByDefault()
    {
        // Arrange
        await AuthenticateAsAdminAsync();
        await CreateAndPublishOpportunityAsync("Visible Published Opportunity");

        // Act
        var response = await Client.GetAsync("/api/volunteering/opportunities");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("data").EnumerateArray().Should().NotBeEmpty();
        content.GetProperty("pagination").GetProperty("total").GetInt32().Should().BeGreaterThan(0);

        // All returned opportunities should be published
        foreach (var opp in content.GetProperty("data").EnumerateArray())
        {
            opp.GetProperty("status").GetString().Should().Be("published");
        }
    }

    [Fact]
    public async Task ListOpportunities_FilterByStatus_ReturnsDrafts()
    {
        // Arrange
        await AuthenticateAsAdminAsync();
        await CreateOpportunityAsync("Draft Opportunity For Filter");

        // Act
        var response = await Client.GetAsync("/api/volunteering/opportunities?status=draft");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        foreach (var opp in content.GetProperty("data").EnumerateArray())
        {
            opp.GetProperty("status").GetString().Should().Be("draft");
        }
    }

    #endregion

    #region Get Opportunity

    [Fact]
    public async Task GetOpportunity_ExistingId_ReturnsOk()
    {
        // Arrange
        await AuthenticateAsAdminAsync();
        var id = await CreateOpportunityAsync("Get Detail Opportunity");

        // Act
        var response = await Client.GetAsync($"/api/volunteering/opportunities/{id}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("id").GetInt32().Should().Be(id);
        content.GetProperty("title").GetString().Should().Be("Get Detail Opportunity");
        content.GetProperty("is_organizer").GetBoolean().Should().BeTrue();
    }

    [Fact]
    public async Task GetOpportunity_NonExistent_ReturnsNotFound()
    {
        // Arrange
        await AuthenticateAsAdminAsync();

        // Act
        var response = await Client.GetAsync("/api/volunteering/opportunities/99999");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    #endregion

    #region Update Opportunity

    [Fact]
    public async Task UpdateOpportunity_AsOrganizer_ReturnsOk()
    {
        // Arrange
        await AuthenticateAsAdminAsync();
        var id = await CreateOpportunityAsync("Original Title");

        // Act
        var response = await Client.PutAsJsonAsync($"/api/volunteering/opportunities/{id}", new
        {
            title = "Updated Title",
            description = "Updated description",
            required_volunteers = 20
        });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("title").GetString().Should().Be("Updated Title");
    }

    [Fact]
    public async Task UpdateOpportunity_NotOrganizer_ReturnsBadRequest()
    {
        // Arrange - Create as admin
        await AuthenticateAsAdminAsync();
        var id = await CreateAndPublishOpportunityAsync("Admin's Opportunity");

        // Switch to member
        await AuthenticateAsMemberAsync();

        // Act
        var response = await Client.PutAsJsonAsync($"/api/volunteering/opportunities/{id}", new
        {
            title = "Hijacked Title"
        });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("error").GetString().Should().Contain("organizer");
    }

    #endregion

    #region Publish Opportunity

    [Fact]
    public async Task PublishOpportunity_DraftOpportunity_ReturnsOk()
    {
        // Arrange
        await AuthenticateAsAdminAsync();
        var id = await CreateOpportunityAsync("Publish Test Opportunity");

        // Act
        var response = await Client.PutAsync($"/api/volunteering/opportunities/{id}/publish", null);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("status").GetString().Should().Be("published");
    }

    [Fact]
    public async Task PublishOpportunity_AlreadyPublished_ReturnsBadRequest()
    {
        // Arrange
        await AuthenticateAsAdminAsync();
        var id = await CreateAndPublishOpportunityAsync("Already Published");

        // Act - Try to publish again
        var response = await Client.PutAsync($"/api/volunteering/opportunities/{id}/publish", null);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    #endregion

    #region Apply to Opportunity

    [Fact]
    public async Task Apply_AsMember_ReturnsCreated()
    {
        // Arrange - Create and publish as admin
        await AuthenticateAsAdminAsync();
        var opportunityId = await CreateAndPublishOpportunityAsync("Apply Test Opportunity");

        // Switch to member
        await AuthenticateAsMemberAsync();

        // Act
        var response = await Client.PostAsJsonAsync($"/api/volunteering/opportunities/{opportunityId}/apply", new
        {
            message = "I would love to help with this project"
        });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("id").GetInt32().Should().BeGreaterThan(0);
        content.GetProperty("opportunity_id").GetInt32().Should().Be(opportunityId);
        content.GetProperty("status").GetString().Should().Be("pending");
        content.GetProperty("message").GetString().Should().Be("I would love to help with this project");
    }

    [Fact]
    public async Task Apply_ToOwnOpportunity_ReturnsBadRequest()
    {
        // Arrange - Create and publish as admin
        await AuthenticateAsAdminAsync();
        var opportunityId = await CreateAndPublishOpportunityAsync("Own Opportunity");

        // Act - Try to apply to own opportunity
        var response = await Client.PostAsJsonAsync($"/api/volunteering/opportunities/{opportunityId}/apply", new
        {
            message = "Applying to my own"
        });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("error").GetString().Should().Contain("own opportunity");
    }

    [Fact]
    public async Task Apply_DuplicateApplication_ReturnsBadRequest()
    {
        // Arrange
        await AuthenticateAsAdminAsync();
        var opportunityId = await CreateAndPublishOpportunityAsync("Duplicate Apply Test");

        await AuthenticateAsMemberAsync();

        // First application
        await ApplyToOpportunityAsync(opportunityId);

        // Act - Try to apply again
        var response = await Client.PostAsJsonAsync($"/api/volunteering/opportunities/{opportunityId}/apply", new
        {
            message = "Second application"
        });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("error").GetString().Should().Contain("already have an active application");
    }

    [Fact]
    public async Task Apply_ToDraftOpportunity_ReturnsBadRequest()
    {
        // Arrange - Create but do NOT publish
        await AuthenticateAsAdminAsync();
        var opportunityId = await CreateOpportunityAsync("Draft Only Opportunity");

        await AuthenticateAsMemberAsync();

        // Act
        var response = await Client.PostAsJsonAsync($"/api/volunteering/opportunities/{opportunityId}/apply", new
        {
            message = "Applying to draft"
        });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("error").GetString().Should().Contain("not accepting applications");
    }

    #endregion

    #region Review Application

    [Fact]
    public async Task ReviewApplication_Approve_ReturnsOk()
    {
        // Arrange
        await AuthenticateAsAdminAsync();
        var opportunityId = await CreateAndPublishOpportunityAsync("Review Test Opportunity");

        await AuthenticateAsMemberAsync();
        var applicationId = await ApplyToOpportunityAsync(opportunityId);

        // Switch back to admin (organizer)
        await AuthenticateAsAdminAsync();

        // Act
        var response = await Client.PutAsJsonAsync($"/api/volunteering/applications/{applicationId}/review", new
        {
            approved = true,
            reason = "Welcome aboard!"
        });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("status").GetString().Should().Be("approved");
        content.GetProperty("opportunity_id").GetInt32().Should().Be(opportunityId);
    }

    [Fact]
    public async Task ReviewApplication_Decline_ReturnsOk()
    {
        // Arrange
        await AuthenticateAsAdminAsync();
        var opportunityId = await CreateAndPublishOpportunityAsync("Decline Test Opportunity");

        await AuthenticateAsMemberAsync();
        var applicationId = await ApplyToOpportunityAsync(opportunityId);

        await AuthenticateAsAdminAsync();

        // Act
        var response = await Client.PutAsJsonAsync($"/api/volunteering/applications/{applicationId}/review", new
        {
            approved = false,
            reason = "Position filled"
        });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("status").GetString().Should().Be("declined");
    }

    [Fact]
    public async Task ReviewApplication_NotOrganizer_ReturnsBadRequest()
    {
        // Arrange
        await AuthenticateAsAdminAsync();
        var opportunityId = await CreateAndPublishOpportunityAsync("Not Organizer Review Test");

        await AuthenticateAsMemberAsync();
        var applicationId = await ApplyToOpportunityAsync(opportunityId);

        // Stay as member (not the organizer) and try to review

        // Act
        var response = await Client.PutAsJsonAsync($"/api/volunteering/applications/{applicationId}/review", new
        {
            approved = true
        });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("error").GetString().Should().Contain("organizer");
    }

    #endregion

    #region Create Shift

    [Fact]
    public async Task CreateShift_AsOrganizer_ReturnsCreated()
    {
        // Arrange
        await AuthenticateAsAdminAsync();
        var opportunityId = await CreateOpportunityAsync("Shift Test Opportunity");

        var startsAt = DateTime.UtcNow.AddDays(7).AddHours(9);
        var endsAt = startsAt.AddHours(4);

        // Act
        var response = await Client.PostAsJsonAsync($"/api/volunteering/opportunities/{opportunityId}/shifts", new
        {
            title = "Morning Shift",
            starts_at = startsAt,
            ends_at = endsAt,
            max_volunteers = 5,
            location = "Front Entrance",
            notes = "Please arrive 15 minutes early"
        });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("id").GetInt32().Should().BeGreaterThan(0);
        content.GetProperty("opportunity_id").GetInt32().Should().Be(opportunityId);
        content.GetProperty("title").GetString().Should().Be("Morning Shift");
        content.GetProperty("max_volunteers").GetInt32().Should().Be(5);
        content.GetProperty("status").GetString().Should().Be("scheduled");
    }

    [Fact]
    public async Task CreateShift_NotOrganizer_ReturnsBadRequest()
    {
        // Arrange - Create opportunity as admin
        await AuthenticateAsAdminAsync();
        var opportunityId = await CreateAndPublishOpportunityAsync("Shift Auth Test");

        // Switch to member
        await AuthenticateAsMemberAsync();

        // Act
        var response = await Client.PostAsJsonAsync($"/api/volunteering/opportunities/{opportunityId}/shifts", new
        {
            title = "Unauthorized Shift",
            starts_at = DateTime.UtcNow.AddDays(7),
            ends_at = DateTime.UtcNow.AddDays(7).AddHours(2),
            max_volunteers = 3
        });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("error").GetString().Should().Contain("organizer");
    }

    [Fact]
    public async Task CreateShift_InvalidTimes_ReturnsBadRequest()
    {
        // Arrange
        await AuthenticateAsAdminAsync();
        var opportunityId = await CreateOpportunityAsync("Invalid Shift Times Test");

        // Act - End time before start time
        var response = await Client.PostAsJsonAsync($"/api/volunteering/opportunities/{opportunityId}/shifts", new
        {
            title = "Bad Shift",
            starts_at = DateTime.UtcNow.AddDays(7).AddHours(10),
            ends_at = DateTime.UtcNow.AddDays(7).AddHours(8), // Before start
            max_volunteers = 3
        });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    #endregion

    #region Check-in and Check-out

    [Fact]
    public async Task CheckIn_ApprovedVolunteer_ReturnsOk()
    {
        // Arrange - Full workflow: create, publish, apply, approve, create shift, check in
        await AuthenticateAsAdminAsync();
        var opportunityId = await CreateAndPublishOpportunityAsync("Check-in Test");
        var shiftId = await CreateShiftAsync(opportunityId);

        // Member applies
        await AuthenticateAsMemberAsync();
        var applicationId = await ApplyToOpportunityAsync(opportunityId);

        // Admin approves
        await AuthenticateAsAdminAsync();
        var reviewResponse = await Client.PutAsJsonAsync($"/api/volunteering/applications/{applicationId}/review", new
        {
            approved = true
        });
        reviewResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        // Member checks in
        await AuthenticateAsMemberAsync();

        // Act
        var response = await Client.PostAsync($"/api/volunteering/shifts/{shiftId}/check-in", null);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("id").GetInt32().Should().BeGreaterThan(0);
        content.GetProperty("shift_id").GetInt32().Should().Be(shiftId);
    }

    [Fact]
    public async Task CheckIn_WithoutApprovedApplication_ReturnsBadRequest()
    {
        // Arrange
        await AuthenticateAsAdminAsync();
        var opportunityId = await CreateAndPublishOpportunityAsync("No Approval Check-in Test");
        var shiftId = await CreateShiftAsync(opportunityId);

        // Member tries to check in without applying
        await AuthenticateAsMemberAsync();

        // Act
        var response = await Client.PostAsync($"/api/volunteering/shifts/{shiftId}/check-in", null);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("error").GetString().Should().Contain("approved application");
    }

    [Fact]
    public async Task CheckOut_AfterCheckIn_ReturnsOk()
    {
        // Arrange - Full workflow
        await AuthenticateAsAdminAsync();
        var opportunityId = await CreateAndPublishOpportunityAsync("Check-out Test");
        var shiftId = await CreateShiftAsync(opportunityId);

        await AuthenticateAsMemberAsync();
        var applicationId = await ApplyToOpportunityAsync(opportunityId);

        await AuthenticateAsAdminAsync();
        await Client.PutAsJsonAsync($"/api/volunteering/applications/{applicationId}/review", new { approved = true });

        await AuthenticateAsMemberAsync();
        var checkInResponse = await Client.PostAsync($"/api/volunteering/shifts/{shiftId}/check-in", null);
        checkInResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        // Act
        var response = await Client.PutAsJsonAsync($"/api/volunteering/shifts/{shiftId}/check-out", new
        {
            hours_logged = 3.5m
        });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("shift_id").GetInt32().Should().Be(shiftId);
        content.GetProperty("hours_logged").GetDecimal().Should().Be(3.5m);
    }

    [Fact]
    public async Task CheckOut_WithoutCheckIn_ReturnsBadRequest()
    {
        // Arrange
        await AuthenticateAsAdminAsync();
        var opportunityId = await CreateAndPublishOpportunityAsync("No Check-in Checkout Test");
        var shiftId = await CreateShiftAsync(opportunityId);

        await AuthenticateAsMemberAsync();

        // Act - Try to check out without checking in
        var response = await Client.PutAsJsonAsync($"/api/volunteering/shifts/{shiftId}/check-out", new
        {
            hours_logged = 2.0m
        });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("error").GetString().Should().Contain("No active check-in");
    }

    [Fact]
    public async Task CheckIn_AlreadyCheckedIn_ReturnsBadRequest()
    {
        // Arrange - Full workflow: check in once
        await AuthenticateAsAdminAsync();
        var opportunityId = await CreateAndPublishOpportunityAsync("Double Check-in Test");
        var shiftId = await CreateShiftAsync(opportunityId);

        await AuthenticateAsMemberAsync();
        var applicationId = await ApplyToOpportunityAsync(opportunityId);

        await AuthenticateAsAdminAsync();
        await Client.PutAsJsonAsync($"/api/volunteering/applications/{applicationId}/review", new { approved = true });

        await AuthenticateAsMemberAsync();
        var firstCheckIn = await Client.PostAsync($"/api/volunteering/shifts/{shiftId}/check-in", null);
        firstCheckIn.StatusCode.Should().Be(HttpStatusCode.OK);

        // Act - Try to check in again
        var response = await Client.PostAsync($"/api/volunteering/shifts/{shiftId}/check-in", null);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("error").GetString().Should().Contain("already checked in");
    }

    #endregion

    #region Volunteer Stats

    [Fact]
    public async Task GetStats_Authenticated_ReturnsOk()
    {
        // Arrange
        await AuthenticateAsMemberAsync();

        // Act
        var response = await Client.GetAsync("/api/volunteering/stats");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("total_shifts_completed").GetInt32().Should().BeGreaterOrEqualTo(0);
        content.GetProperty("total_hours").GetDecimal().Should().BeGreaterOrEqualTo(0);
        content.GetProperty("opportunities_applied").GetInt32().Should().BeGreaterOrEqualTo(0);
        content.GetProperty("opportunities_approved").GetInt32().Should().BeGreaterOrEqualTo(0);
        content.GetProperty("active_check_ins").GetInt32().Should().BeGreaterOrEqualTo(0);
        content.GetProperty("credits_earned").GetDecimal().Should().BeGreaterOrEqualTo(0);
    }

    [Fact]
    public async Task GetStats_Unauthenticated_ReturnsUnauthorized()
    {
        // Arrange
        ClearAuthToken();

        // Act
        var response = await Client.GetAsync("/api/volunteering/stats");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    #endregion

    #region My Volunteering

    [Fact]
    public async Task MyVolunteering_ReturnsApplicationsAndStats()
    {
        // Arrange
        await AuthenticateAsAdminAsync();
        var opportunityId = await CreateAndPublishOpportunityAsync("My Volunteering Test");

        await AuthenticateAsMemberAsync();
        await ApplyToOpportunityAsync(opportunityId);

        // Act
        var response = await Client.GetAsync("/api/volunteering/my");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("applications").GetProperty("data").EnumerateArray().Should().NotBeEmpty();
        content.GetProperty("organized_count").GetInt32().Should().BeGreaterOrEqualTo(0);
    }

    #endregion

    #region List Shifts

    [Fact]
    public async Task ListShifts_ReturnsShiftsForOpportunity()
    {
        // Arrange
        await AuthenticateAsAdminAsync();
        var opportunityId = await CreateOpportunityAsync("Shift List Test");
        await CreateShiftAsync(opportunityId, "Shift A");
        await CreateShiftAsync(opportunityId, "Shift B");

        // Act
        var response = await Client.GetAsync($"/api/volunteering/opportunities/{opportunityId}/shifts");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        var shifts = content.GetProperty("data").EnumerateArray().ToList();
        shifts.Count.Should().BeGreaterOrEqualTo(2);
    }

    #endregion

    #region List Applications

    [Fact]
    public async Task ListApplications_AsOrganizer_ReturnsOk()
    {
        // Arrange
        await AuthenticateAsAdminAsync();
        var opportunityId = await CreateAndPublishOpportunityAsync("Application List Test");

        await AuthenticateAsMemberAsync();
        await ApplyToOpportunityAsync(opportunityId);

        // Switch back to admin (organizer)
        await AuthenticateAsAdminAsync();

        // Act
        var response = await Client.GetAsync($"/api/volunteering/opportunities/{opportunityId}/applications");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("data").EnumerateArray().Should().NotBeEmpty();
        content.GetProperty("pagination").GetProperty("total").GetInt32().Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task ListApplications_NotOrganizer_ReturnsForbidden()
    {
        // Arrange
        await AuthenticateAsAdminAsync();
        var opportunityId = await CreateAndPublishOpportunityAsync("Forbidden Application List");

        // Switch to member (not the organizer)
        await AuthenticateAsMemberAsync();

        // Act
        var response = await Client.GetAsync($"/api/volunteering/opportunities/{opportunityId}/applications");

        // Assert
        response.StatusCode.Should().BeOneOf(HttpStatusCode.Forbidden, HttpStatusCode.InternalServerError);
    }

    #endregion

    #region Close Opportunity

    [Fact]
    public async Task CloseOpportunity_Published_ReturnsOk()
    {
        // Arrange
        await AuthenticateAsAdminAsync();
        var id = await CreateAndPublishOpportunityAsync("Close Test Opportunity");

        // Act
        var response = await Client.PutAsync($"/api/volunteering/opportunities/{id}/close", null);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("status").GetString().Should().Be("closed");
    }

    [Fact]
    public async Task CloseOpportunity_Draft_ReturnsBadRequest()
    {
        // Arrange - Create but do not publish
        await AuthenticateAsAdminAsync();
        var id = await CreateOpportunityAsync("Draft Close Test");

        // Act
        var response = await Client.PutAsync($"/api/volunteering/opportunities/{id}/close", null);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    #endregion

    #region Withdraw Application

    [Fact]
    public async Task WithdrawApplication_AsMember_ReturnsOk()
    {
        // Arrange
        await AuthenticateAsAdminAsync();
        var opportunityId = await CreateAndPublishOpportunityAsync("Withdraw Test");

        await AuthenticateAsMemberAsync();
        var applicationId = await ApplyToOpportunityAsync(opportunityId);

        // Act
        var response = await Client.DeleteAsync($"/api/volunteering/applications/{applicationId}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("status").GetString().Should().Be("withdrawn");
    }

    #endregion

    #region Tenant Isolation

    [Fact]
    public async Task GetOpportunity_FromOtherTenant_ReturnsNotFound()
    {
        // Arrange - Create opportunity in test-tenant
        await AuthenticateAsAdminAsync();
        var id = await CreateOpportunityAsync("Tenant Isolated Opportunity");

        // Switch to other-tenant user
        await AuthenticateAsOtherTenantUserAsync();

        // Act
        var response = await Client.GetAsync($"/api/volunteering/opportunities/{id}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    #endregion
}
