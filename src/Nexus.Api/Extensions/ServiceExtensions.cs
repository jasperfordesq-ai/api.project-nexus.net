// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using Fido2NetLib;
using Nexus.Api.Clients;
using Nexus.Api.Configuration;
using Nexus.Api.Services;
using Nexus.Api.Services.Registration;
using Nexus.Messaging;
using Polly;
using Polly.Extensions.Http;

namespace Nexus.Api.Extensions;

/// <summary>
/// IServiceCollection extension methods for domain service registrations.
/// Extracted from Program.cs to keep startup file concise.
/// </summary>
public static class ServiceExtensions
{
    /// <summary>
    /// Registers all Nexus domain services, the Meilisearch HTTP client,
    /// the Registration Policy Engine, AI/SignalR services, and the Llama
    /// HTTP client with Polly resilience policies.
    /// </summary>
    public static IServiceCollection AddNexusServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // Core infrastructure
        services.AddMemoryCache();
        services.AddSingleton<CacheService>();
        services.AddScoped<GamificationService>();
        services.AddScoped<ExchangeService>();
        services.AddScoped<MatchingService>();
        services.AddScoped<VolunteerService>();
        services.AddScoped<ShiftManagementService>();
        services.AddScoped<WalletFeatureService>();
        services.AddScoped<ListingFeatureService>();
        services.AddScoped<GroupFeatureService>();

        // Gamification V2
        services.AddScoped<ChallengeService>();
        services.AddScoped<StreakService>();
        services.AddScoped<LeaderboardSeasonService>();
        services.AddScoped<DailyRewardService>();

        // Skills, audit, email
        services.AddScoped<SkillService>();
        services.AddScoped<AuditLogService>();
        if (configuration.GetValue("SendGrid:Enabled", false))
            services.AddScoped<IEmailService, SendGridEmailService>();
        else
            services.AddScoped<IEmailService, GmailEmailService>();
        services.AddScoped<EmailNotificationService>();

        // Phase 26-37
        services.AddScoped<ContentReportService>();
        services.AddScoped<GdprService>();
        services.AddScoped<LocationService>();
        services.AddScoped<FeedRankingService>();
        services.AddScoped<AdminAnalyticsService>();
        services.AddScoped<AdminCrmService>();
        services.AddScoped<VolunteerWebhookService>();
        services.AddScoped<NewsletterService>();
        services.AddScoped<CookieConsentService>();
        services.AddScoped<LegalDocumentService>();
        services.AddScoped<PushNotificationService>();
        services.AddScoped<TranslationService>();
        services.AddScoped<FederationService>();
        services.AddSingleton<FederationJwtService>();
        services.AddScoped<FederationGatewayService>();
        services.AddScoped<FederationApiKeyService>();
        services.AddHttpClient<FederationExternalApiClient>();
        services.AddScoped<PredictiveStaffingService>();
        services.AddScoped<SystemAdminService>();
        services.AddScoped<LockdownService>();
        services.AddScoped<JobService>();
        services.AddScoped<IdeationService>();
        services.AddScoped<SubscriptionService>();
        services.AddScoped<DeliverableService>();

        // WebAuthn/Passkeys (FIDO2)
        var fido2Config = configuration.GetSection("Fido2");
        services.AddFido2(options =>
        {
            options.ServerDomain = fido2Config["ServerDomain"] ?? "localhost";
            options.ServerName = fido2Config["ServerName"] ?? "Project NEXUS";
            options.Origins = fido2Config.GetSection("Origins").Get<HashSet<string>>()
                ?? new HashSet<string> { "http://localhost:5080" };
        });
        services.AddScoped<PasskeyService>();
        services.AddSingleton<TokenService>();
        services.AddScoped<TotpService>();
        services.AddScoped<FileUploadService>();

        // Feature services
        services.AddScoped<KnowledgeBaseService>();
        services.AddScoped<UserPreferencesService>();
        services.AddScoped<PollService>();
        services.AddScoped<GoalService>();
        services.AddScoped<AvailabilityService>();
        services.AddScoped<BlogService>();
        services.AddScoped<PageService>();
        services.AddScoped<OrganisationService>();
        services.AddScoped<OrgWalletService>();
        services.AddScoped<NexusScoreService>();
        services.AddScoped<OnboardingService>();
        services.AddScoped<TenantHierarchyService>();
        services.AddScoped<InsuranceService>();
        services.AddScoped<VoiceMessageService>();
        services.AddScoped<MemberActivityService>();
        services.AddScoped<VerificationBadgeService>();
        services.AddScoped<ResourceService>();
        services.AddScoped<ThreadedCommentService>();
        services.AddScoped<VettingService>();
        services.AddScoped<BrokerService>();
        services.AddScoped<EnterpriseService>();
        services.AddScoped<EventReminderService>();
        services.AddScoped<EmailVerificationService>();
        services.AddScoped<FaqService>();
        services.AddScoped<GroupExchangeService>();
        services.AddScoped<CollaborativeFilterService>();
        services.AddScoped<HashtagService>();
        services.AddScoped<PersonalInsightsService>();
        services.AddScoped<SavedSearchService>();
        services.AddScoped<SubAccountService>();
        services.AddScoped<FederationAdminService>();
        services.AddScoped<SecretsVaultService>();

        // Background services
        services.AddHostedService<SavedSearchAlertService>();

        // Meilisearch (semantic search — optional, falls back to ILIKE)
        services.Configure<MeilisearchOptions>(
            configuration.GetSection(MeilisearchOptions.SectionName));
        var meilisearchOptions = configuration
            .GetSection(MeilisearchOptions.SectionName)
            .Get<MeilisearchOptions>() ?? new MeilisearchOptions();
        services.AddHttpClient<MeilisearchService>(client =>
        {
            client.BaseAddress = new Uri(meilisearchOptions.BaseUrl);
            client.Timeout = TimeSpan.FromSeconds(meilisearchOptions.TimeoutSeconds);
            if (!string.IsNullOrEmpty(meilisearchOptions.ApiKey))
                client.DefaultRequestHeaders.Authorization =
                    new System.Net.Http.Headers.AuthenticationHeaderValue(
                        "Bearer", meilisearchOptions.ApiKey);
        });

        // Registration Policy Engine
        services.AddSingleton<IIdentityVerificationProvider, MockIdentityVerificationProvider>();
        services.AddSingleton<IIdentityVerificationProvider, StripeIdentityProvider>();
        services.AddSingleton<IdentityVerificationProviderFactory>();
        services.AddSingleton<ProviderConfigEncryption>();
        services.AddScoped<RegistrationOrchestrator>();

        // AI services
        services.AddScoped<AiService>();
        services.AddScoped<ContentModerationService>();
        services.AddScoped<AiNotificationService>();

        // Real-time messaging (SignalR)
        services.AddSignalR();
        services.AddSingleton<IUserConnectionService, UserConnectionService>();
        services.AddScoped<IRealTimeMessagingService, RealTimeMessagingService>();

        // Event publishing (RabbitMQ)
        services.AddEventPublishing(configuration);

        // Llama AI service — typed HttpClient with Polly resilience policies
        services.Configure<LlamaServiceOptions>(
            configuration.GetSection(LlamaServiceOptions.SectionName));
        var llamaOptions = configuration
            .GetSection(LlamaServiceOptions.SectionName)
            .Get<LlamaServiceOptions>() ?? new LlamaServiceOptions();

        services.AddHttpClient<ILlamaClient, LlamaClient>(client =>
        {
            client.BaseAddress = new Uri(llamaOptions.BaseUrl);
            client.Timeout = TimeSpan.FromSeconds(llamaOptions.TimeoutSeconds);
        })
        .AddPolicyHandler(HttpPolicyExtensions
            .HandleTransientHttpError()
            .WaitAndRetryAsync(
                llamaOptions.MaxRetries,
                attempt => TimeSpan.FromSeconds(Math.Pow(2, attempt)),
                onRetry: (outcome, timespan, retryAttempt, context) =>
                {
                    var logger = context.GetLogger();
                    logger?.LogWarning(
                        "Llama request failed with {StatusCode}. Retry {RetryAttempt} after {Delay}ms",
                        outcome.Result?.StatusCode,
                        retryAttempt,
                        timespan.TotalMilliseconds);
                }))
        .AddPolicyHandler((svcProvider, _) =>
        {
            var logger = svcProvider.GetService<ILogger<LlamaClient>>();
            return HttpPolicyExtensions
                .HandleTransientHttpError()
                .CircuitBreakerAsync(
                    llamaOptions.CircuitBreakerFailures,
                    TimeSpan.FromSeconds(llamaOptions.CircuitBreakerDurationSeconds),
                    onBreak: (outcome, timespan) =>
                    {
                        logger?.LogWarning(
                            "Llama circuit breaker opened for {Duration}s. Reason: {StatusCode}",
                            timespan.TotalSeconds,
                            outcome.Result?.StatusCode);
                    },
                    onReset: () =>
                    {
                        logger?.LogInformation("Llama circuit breaker reset");
                    });
        });

        return services;
    }
}
