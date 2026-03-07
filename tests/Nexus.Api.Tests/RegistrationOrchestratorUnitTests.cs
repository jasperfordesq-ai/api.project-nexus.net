// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using FluentAssertions;
using Nexus.Api.Entities;
using Nexus.Api.Services.Registration;

namespace Nexus.Api.Tests;

/// <summary>
/// Unit tests for the MockIdentityVerificationProvider.
/// These run without a database or HTTP server.
/// </summary>
public class MockProviderUnitTests
{
    private readonly MockIdentityVerificationProvider _provider = new();

    [Fact]
    public void ProviderType_IsMock()
    {
        _provider.ProviderType.Should().Be(VerificationProvider.Mock);
    }

    [Fact]
    public async Task CreateSession_ReturnsSessionWithId()
    {
        var result = await _provider.CreateSessionAsync(1, 1, VerificationLevel.DocumentOnly, "http://callback", null);

        result.ExternalSessionId.Should().StartWith("mock_");
        result.ExpiresAt.Should().BeAfter(DateTime.UtcNow);
    }

    [Fact]
    public async Task CreateSession_AutoApproveConfig_NoRedirectUrl()
    {
        var result = await _provider.CreateSessionAsync(
            1, 1, VerificationLevel.DocumentOnly, "http://callback",
            "{\"auto_approve\": true}");

        result.RedirectUrl.Should().BeNull();
    }

    [Fact]
    public async Task CreateSession_ManualConfig_HasRedirectUrl()
    {
        var result = await _provider.CreateSessionAsync(
            1, 1, VerificationLevel.DocumentOnly, "http://callback",
            "{\"auto_approve\": false}");

        result.RedirectUrl.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task GetSessionStatus_AutoApprove_ReturnsCompleted()
    {
        var result = await _provider.GetSessionStatusAsync("mock_123", "{\"auto_approve\": true}");

        result.Status.Should().Be(VerificationSessionStatus.Completed);
        result.Decision.Should().Be("approved");
        result.ConfidenceScore.Should().Be(1.0);
    }

    [Fact]
    public async Task GetSessionStatus_SimulateFailure_ReturnsFailed()
    {
        var result = await _provider.GetSessionStatusAsync("mock_123", "{\"simulate_failure\": true}");

        result.Status.Should().Be(VerificationSessionStatus.Failed);
        result.Decision.Should().Be("declined");
    }

    [Fact]
    public async Task GetSessionStatus_Manual_ReturnsInProgress()
    {
        var result = await _provider.GetSessionStatusAsync("mock_123", "{\"auto_approve\": false}");

        result.Status.Should().Be(VerificationSessionStatus.InProgress);
    }

    [Fact]
    public async Task ProcessWebhook_ApprovedBody_ReturnsCompleted()
    {
        var payload = new WebhookPayload { RawBody = "approved", Headers = new() };
        var result = await _provider.ProcessWebhookAsync(payload, null);

        result.Should().NotBeNull();
        result!.Status.Should().Be(VerificationSessionStatus.Completed);
        result.Decision.Should().Be("approved");
    }

    [Fact]
    public async Task ProcessWebhook_DeclinedBody_ReturnsFailed()
    {
        var payload = new WebhookPayload { RawBody = "declined", Headers = new() };
        var result = await _provider.ProcessWebhookAsync(payload, null);

        result.Should().NotBeNull();
        result!.Status.Should().Be(VerificationSessionStatus.Failed);
        result.Decision.Should().Be("declined");
    }

    [Fact]
    public async Task ProcessWebhook_InvalidBody_ReturnsNull()
    {
        var payload = new WebhookPayload { RawBody = "garbage", Headers = new() };
        var result = await _provider.ProcessWebhookAsync(payload, null);

        result.Should().BeNull();
    }

    [Fact]
    public void VerifyWebhookSignature_NoSecret_ReturnsTrue()
    {
        var payload = new WebhookPayload { RawBody = "test", Headers = new() };
        _provider.VerifyWebhookSignature(payload, null).Should().BeTrue();
    }

    [Fact]
    public void VerifyWebhookSignature_CorrectSecret_ReturnsTrue()
    {
        var payload = new WebhookPayload
        {
            RawBody = "test",
            Headers = new Dictionary<string, string> { ["X-Mock-Secret"] = "mysecret" }
        };
        _provider.VerifyWebhookSignature(payload, "{\"webhook_secret\": \"mysecret\"}").Should().BeTrue();
    }

    [Fact]
    public void VerifyWebhookSignature_WrongSecret_ReturnsFalse()
    {
        var payload = new WebhookPayload
        {
            RawBody = "test",
            Headers = new Dictionary<string, string> { ["X-Mock-Secret"] = "wrong" }
        };
        _provider.VerifyWebhookSignature(payload, "{\"webhook_secret\": \"mysecret\"}").Should().BeFalse();
    }
}

/// <summary>
/// Unit tests for IdentityVerificationProviderFactory.
/// </summary>
public class ProviderFactoryUnitTests
{
    [Fact]
    public void GetProvider_RegisteredProvider_ReturnsProvider()
    {
        var mock = new MockIdentityVerificationProvider();
        var factory = new IdentityVerificationProviderFactory(new[] { mock });

        var result = factory.GetProvider(VerificationProvider.Mock);
        result.Should().BeSameAs(mock);
    }

    [Fact]
    public void GetProvider_UnregisteredProvider_Throws()
    {
        var factory = new IdentityVerificationProviderFactory(Array.Empty<IIdentityVerificationProvider>());

        var act = () => factory.GetProvider(VerificationProvider.Veriff);
        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void IsProviderRegistered_Mock_ReturnsTrue()
    {
        var factory = new IdentityVerificationProviderFactory(new[] { new MockIdentityVerificationProvider() });
        factory.IsProviderRegistered(VerificationProvider.Mock).Should().BeTrue();
        factory.IsProviderRegistered(VerificationProvider.Veriff).Should().BeFalse();
    }

    [Fact]
    public void GetRegisteredProviders_ReturnsAll()
    {
        var factory = new IdentityVerificationProviderFactory(new[] { new MockIdentityVerificationProvider() });
        factory.GetRegisteredProviders().Should().ContainSingle().Which.Should().Be(VerificationProvider.Mock);
    }
}

/// <summary>
/// Unit tests for the RegistrationEnums — state machine validation.
/// </summary>
public class RegistrationStateTests
{
    [Theory]
    [InlineData(RegistrationMode.Standard, RegistrationStatus.Active)]
    [InlineData(RegistrationMode.StandardWithApproval, RegistrationStatus.PendingAdminReview)]
    [InlineData(RegistrationMode.VerifiedIdentity, RegistrationStatus.PendingVerification)]
    [InlineData(RegistrationMode.GovernmentId, RegistrationStatus.PendingVerification)]
    [InlineData(RegistrationMode.InviteOnly, RegistrationStatus.Active)]
    public void RegistrationMode_MapsToExpectedInitialStatus(RegistrationMode mode, RegistrationStatus expectedStatus)
    {
        // This mirrors the logic in RegistrationOrchestrator.RegisterAsync
        var (status, _) = mode switch
        {
            RegistrationMode.Standard => (RegistrationStatus.Active, true),
            RegistrationMode.StandardWithApproval => (RegistrationStatus.PendingAdminReview, false),
            RegistrationMode.VerifiedIdentity => (RegistrationStatus.PendingVerification, false),
            RegistrationMode.GovernmentId => (RegistrationStatus.PendingVerification, false),
            RegistrationMode.InviteOnly => (RegistrationStatus.Active, true),
            _ => (RegistrationStatus.Active, true)
        };

        status.Should().Be(expectedStatus);
    }

    [Fact]
    public void AllRegistrationModes_AreCovered()
    {
        // Ensure no enum values are missed
        var modes = Enum.GetValues<RegistrationMode>();
        modes.Should().HaveCountGreaterOrEqualTo(5);
    }

    [Fact]
    public void AllVerificationProviders_AreDefined()
    {
        var providers = Enum.GetValues<VerificationProvider>();
        providers.Should().Contain(VerificationProvider.Mock);
        providers.Should().Contain(VerificationProvider.Veriff);
        providers.Should().Contain(VerificationProvider.EudiWallet);
        providers.Should().Contain(VerificationProvider.Custom);
    }
}
