// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Text;
using Asp.Versioning;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Fido2NetLib;
using Nexus.Api.Clients;
using Nexus.Api.Configuration;
using Nexus.Api.Data;
using Nexus.Api.HealthChecks;
using Nexus.Api.Hubs;
using Nexus.Api.Middleware;
using Nexus.Api.Services;
using Nexus.Api.Services.Registration;
using Nexus.Messaging;
using Nexus.Api.Extensions;
using Polly;
using Polly.Extensions.Http;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// =============================================================================
// DOCKER-ONLY DEVELOPMENT CHECK
// =============================================================================
// This project is designed to run in Docker. Running directly with `dotnet run`
// is not supported and may cause configuration issues.
var isRunningInDocker = Environment.GetEnvironmentVariable("DOTNET_RUNNING_IN_CONTAINER") == "true";
var isTestEnvironment = builder.Environment.EnvironmentName == "Testing";
if (!isRunningInDocker && !isTestEnvironment && builder.Environment.IsDevelopment())
{
    Console.ForegroundColor = ConsoleColor.Yellow;
    Console.WriteLine("╔════════════════════════════════════════════════════════════════════╗");
    Console.WriteLine("║  WARNING: Running outside Docker is not supported.                 ║");
    Console.WriteLine("║  Please use: docker compose up -d                                  ║");
    Console.WriteLine("║  See DOCKER_CONTRACT.md for details.                               ║");
    Console.WriteLine("╚════════════════════════════════════════════════════════════════════╝");
    Console.ResetColor();
}

// =============================================================================
// SERILOG CONFIGURATION (Production only)
// =============================================================================
// In Production, Serilog reads config from appsettings.Production.json
// Features: structured JSON logging, file rotation, enrichers
// In Development, uses default console logging for simplicity
if (!builder.Environment.IsDevelopment())
{
    Log.Logger = new LoggerConfiguration()
        .ReadFrom.Configuration(builder.Configuration)
        .CreateLogger();

    builder.Host.UseSerilog();
}

// =============================================================================
// SERVICES
// =============================================================================

// Add controllers with request body size limit
builder.Services.AddControllers();

// Global request body size limit (5MB) to prevent abuse
// Individual endpoints can override with [RequestSizeLimit] attribute
builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = 5 * 1024 * 1024; // 5MB
});

// API Versioning
builder.Services.AddApiVersioning(options =>
{
    options.DefaultApiVersion = new ApiVersion(1, 0);
    options.AssumeDefaultVersionWhenUnspecified = true;
    options.ReportApiVersions = true;
    options.ApiVersionReader = ApiVersionReader.Combine(
        new UrlSegmentApiVersionReader(),
        new HeaderApiVersionReader("X-Api-Version")
    );
}).AddApiExplorer(options =>
{
    options.GroupNameFormat = "'v'VVV";
    options.SubstituteApiVersionInUrl = true;
});

// Swagger for development
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new() { Title = "Nexus API", Version = "v1" });
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Enter your token below.",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

// Rate Limiting
builder.Services.AddRateLimitingPolicies(builder.Configuration);

// Response Compression - reduces bandwidth by 70% for JSON responses
// Note: EnableForHttps is safe here because we use JWT Bearer tokens (not cookies).
// BREACH attacks only affect cookie-based auth where secrets are reflected in responses.
builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.MimeTypes = new[]
    {
        "application/json",
        "text/json",
        "application/json; charset=utf-8"
    };
});

// PostgreSQL + EF Core
builder.Services.AddDbContext<NexusDbContext>((sp, options) =>
{
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"));
});

// TenantContext - scoped per request
builder.Services.AddScoped<TenantContext>();

// In-memory caching for static data (categories, roles, config)
builder.Services.AddMemoryCache();
builder.Services.AddSingleton<CacheService>();

// Gamification service
builder.Services.AddScoped<GamificationService>();

// Exchange workflow service
builder.Services.AddScoped<ExchangeService>();

// Smart Matching service
builder.Services.AddScoped<MatchingService>();

// Volunteering service
builder.Services.AddScoped<VolunteerService>();

// Wallet features (limits, donations, alerts, export)
builder.Services.AddScoped<WalletFeatureService>();

// Listing features (analytics, favorites, tags)
builder.Services.AddScoped<ListingFeatureService>();

// Group features (announcements, policies, discussions, files)
builder.Services.AddScoped<GroupFeatureService>();

// Gamification V2 (challenges, streaks, seasons, daily rewards)
builder.Services.AddScoped<ChallengeService>();
builder.Services.AddScoped<StreakService>();
builder.Services.AddScoped<LeaderboardSeasonService>();
builder.Services.AddScoped<DailyRewardService>();

// Phase 23: Skills & Endorsements
builder.Services.AddScoped<SkillService>();

// Phase 24: Audit Logging
builder.Services.AddScoped<AuditLogService>();

// Phase 25: Email Notifications
builder.Services.AddScoped<IEmailService, GmailEmailService>();
builder.Services.AddScoped<EmailNotificationService>();

// Phase 26: Content Reporting
builder.Services.AddScoped<ContentReportService>();

// Phase 27: GDPR
builder.Services.AddScoped<GdprService>();

// Phase 28: Location/Geocoding
builder.Services.AddScoped<LocationService>();

// Phase 29: Feed Ranking
builder.Services.AddScoped<FeedRankingService>();

// Phase 30: Admin CRM & Analytics
builder.Services.AddScoped<AdminAnalyticsService>();
builder.Services.AddScoped<AdminCrmService>();

// Phase 31: Newsletter
builder.Services.AddScoped<NewsletterService>();

// Phase 32: Cookie Consent
builder.Services.AddScoped<CookieConsentService>();

// Phase 33: Push Notifications
builder.Services.AddScoped<PushNotificationService>();

// Phase 34: i18n / Translation
builder.Services.AddScoped<TranslationService>();

// Phase 35: Federation
builder.Services.AddScoped<FederationService>();

// Phase 36: Predictive Staffing
builder.Services.AddScoped<PredictiveStaffingService>();

// Phase 37: System Admin
builder.Services.AddScoped<SystemAdminService>();

// WebAuthn/Passkeys (FIDO2)
builder.Services.AddFido2(options =>
{
    var fido2Config = builder.Configuration.GetSection("Fido2");
    options.ServerDomain = fido2Config["ServerDomain"] ?? "localhost";
    options.ServerName = fido2Config["ServerName"] ?? "Project NEXUS";
    options.Origins = fido2Config.GetSection("Origins").Get<HashSet<string>>()
        ?? new HashSet<string> { "http://localhost:5080" };
});
builder.Services.AddScoped<PasskeyService>();
builder.Services.AddSingleton<TokenService>();
builder.Services.AddScoped<TotpService>();

// Registration Policy Engine
builder.Services.AddSingleton<IIdentityVerificationProvider, MockIdentityVerificationProvider>();
builder.Services.AddSingleton<IIdentityVerificationProvider, StripeIdentityProvider>();
builder.Services.AddSingleton<IdentityVerificationProviderFactory>();
builder.Services.AddSingleton<ProviderConfigEncryption>();
builder.Services.AddScoped<RegistrationOrchestrator>();

// AI service (requires ILlamaClient, NexusDbContext)
builder.Services.AddScoped<AiService>();

// Content Moderation service
builder.Services.AddScoped<ContentModerationService>();

// AI Notification service
builder.Services.AddScoped<AiNotificationService>();

// Real-time messaging (SignalR)
builder.Services.AddSignalR();
builder.Services.AddSingleton<IUserConnectionService, UserConnectionService>();
builder.Services.AddScoped<IRealTimeMessagingService, RealTimeMessagingService>();

// Event publishing (RabbitMQ)
builder.Services.AddEventPublishing(builder.Configuration);

// =============================================================================
// LLAMA AI SERVICE
// =============================================================================
builder.Services.Configure<LlamaServiceOptions>(
    builder.Configuration.GetSection(LlamaServiceOptions.SectionName));

var llamaOptions = builder.Configuration
    .GetSection(LlamaServiceOptions.SectionName)
    .Get<LlamaServiceOptions>() ?? new LlamaServiceOptions();

// Typed HttpClient with Polly resilience policies
builder.Services.AddHttpClient<ILlamaClient, LlamaClient>(client =>
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
.AddPolicyHandler((services, request) =>
{
    var logger = services.GetService<ILogger<LlamaClient>>();
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

// JWT Authentication
// CRITICAL: Secret must be provided via environment variable in production
var jwtSecret = builder.Configuration["Jwt:Secret"];
if (!isTestEnvironment && (string.IsNullOrEmpty(jwtSecret) || jwtSecret.Contains("REPLACE")))
{
    throw new InvalidOperationException(
        "Jwt:Secret must be configured via environment variable. " +
        "Set JWT_SECRET or Jwt__Secret environment variable.");
}
// For testing, generate a deterministic secret if not configured via environment
if (isTestEnvironment && string.IsNullOrEmpty(jwtSecret))
{
    jwtSecret = Convert.ToBase64String(
        System.Security.Cryptography.SHA256.HashData(
            System.Text.Encoding.UTF8.GetBytes("nexus-test-environment-jwt")));
}

// Check if issuer/audience are configured (PHP may not set these)
var jwtIssuer = builder.Configuration["Jwt:Issuer"];
var jwtAudience = builder.Configuration["Jwt:Audience"];
var validateIssuer = !string.IsNullOrEmpty(jwtIssuer);
var validateAudience = !string.IsNullOrEmpty(jwtAudience);

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        // Disable default claim type mapping so "role" claim stays as "role"
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            // Preserve original claim names from JWT
            NameClaimType = "sub",
            RoleClaimType = "role",
            // Issuer/Audience: Only validate if configured (PHP may not set these)
            ValidateIssuer = validateIssuer,
            ValidateAudience = validateAudience,
            ValidIssuer = validateIssuer ? jwtIssuer : null,
            ValidAudience = validateAudience ? jwtAudience : null,

            // Lifetime: Always validate expiration
            ValidateLifetime = true,

            // Signature: Always validate (HS256 - must match PHP)
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret!)),

            // Minimal clock skew for security (allows 1 min drift between servers)
            ClockSkew = TimeSpan.FromMinutes(1)
        };

        // SignalR JWT Authentication
        // WebSockets cannot send custom headers, so the token is sent via query string
        // The client connects with: /hubs/messages?access_token=<jwt>
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];

                // Only read token from query string for hub paths
                var path = context.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                {
                    context.Token = accessToken;
                }

                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy =>
        policy.RequireClaim("role", "admin"));
});

// Health checks
var healthChecks = builder.Services.AddHealthChecks();
var defaultConnectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (!string.IsNullOrEmpty(defaultConnectionString))
    healthChecks.AddNpgSql(defaultConnectionString);
healthChecks.AddCheck<LlamaHealthCheck>("llama", tags: new[] { "ready" });

// CORS - Only browser origins, no internal services
// Note: AllowCredentials() is NOT used since we use JWT Bearer tokens (not cookies)
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? Array.Empty<string>();

// Sanitize origins: remove trailing slashes, empty entries, validate format
allowedOrigins = allowedOrigins
    .Where(o => !string.IsNullOrWhiteSpace(o))
    .Select(o => o.TrimEnd('/'))
    .Where(o => Uri.TryCreate(o, UriKind.Absolute, out var uri)
                && (uri.Scheme == "http" || uri.Scheme == "https")
                && string.IsNullOrEmpty(uri.PathAndQuery.TrimStart('/')))
    .Distinct()
    .ToArray();

// In Production, CORS origins are required; in Development, warn but allow startup
if (allowedOrigins.Length == 0)
{
    if (builder.Environment.IsProduction())
    {
        throw new InvalidOperationException(
            "Cors:AllowedOrigins must be configured in Production. " +
            "Check appsettings.Production.json");
    }
    else
    {
        // Development: log warning, CORS policy will reject all cross-origin requests
        // Swagger/same-origin requests still work
        Console.WriteLine("WARNING: No valid CORS origins configured. Cross-origin requests will be blocked.");
    }
}

builder.Services.AddCors(options =>
{
    options.AddPolicy("Default", policy =>
    {
        if (allowedOrigins.Length > 0)
        {
            policy.WithOrigins(allowedOrigins)
                .AllowAnyMethod()
                // Security: Only allow headers actually needed by the API
                // - Authorization: JWT Bearer token
                // - Content-Type: JSON request bodies
                // - X-Api-Version: API versioning header
                // - X-Requested-With: Required by SignalR client
                // - X-SignalR-User-Agent: SignalR connection metadata
                .WithHeaders("Authorization", "Content-Type", "X-Api-Version", "X-Requested-With", "X-SignalR-User-Agent")
                // Performance: Cache preflight responses for 30 minutes
                // Reduces OPTIONS requests from browsers
                .SetPreflightMaxAge(TimeSpan.FromMinutes(30));
        }
        // Note: Do NOT use AllowCredentials() with JWT Bearer auth
        // AllowCredentials() is only needed for cookie-based auth
    });
});

var app = builder.Build();

// =============================================================================
// STARTUP LOGGING
// =============================================================================
// Log environment and CORS configuration (no sensitive values)
var startupLogger = app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("Startup");
var corsMode = app.Environment.IsProduction() ? "strict" : "permissive";
startupLogger.LogInformation(
    "Environment: {Environment} | CORS origins: {OriginCount} | CORS mode: {CorsMode}",
    app.Environment.EnvironmentName,
    allowedOrigins.Length,
    corsMode);

if (allowedOrigins.Length > 0 && !app.Environment.IsProduction())
{
    // In Development, log the actual origins for debugging (safe - just localhost URLs)
    startupLogger.LogDebug("CORS allowed origins: {Origins}", string.Join(", ", allowedOrigins));
}

// =============================================================================
// DATABASE INITIALIZATION (Development only)
// =============================================================================
if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();

    // Apply migrations
    await db.Database.MigrateAsync();

    // Seed test data
    await SeedData.SeedAsync(db, logger);
}

// =============================================================================
// MIDDLEWARE PIPELINE (order matters!)
// =============================================================================
// 1. Exception Handling - MUST be first to catch all errors
// 2. Response Compression - compress responses early
// 3. Swagger (dev only)
// 4. HTTPS redirect (prod only)
// 5. Rate Limiting - MUST be early to protect all endpoints
// 6. CORS
// 7. Authentication - parses JWT, populates HttpContext.User
// 8. Authorization - checks [Authorize] attributes
// 9. TenantResolution - reads tenant_id from JWT claims (MUST be after auth)
// 10. Controllers
// =============================================================================

// Forwarded Headers - MUST be first to ensure correct client IPs behind reverse proxy (nginx)
// Without this, HttpContext.Connection.RemoteIpAddress shows the proxy IP, not the real client
app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
});

// Global exception handling - MUST be early in pipeline
// In Development: returns full exception details
// In Production: returns generic error message (no sensitive details)
app.UseExceptionHandling();

// Response compression - reduces bandwidth by 70% for JSON payloads
app.UseResponseCompression();

// Development only
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// HTTPS redirection (prod only)
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

// Security headers - add early to apply to all responses
app.UseSecurityHeaders();

// Rate Limiting - early in pipeline to protect all endpoints
app.UseRateLimiter();

// CORS
app.UseCors("Default");

// Authentication - populates HttpContext.User from JWT
app.UseAuthentication();

// Authorization - enforces [Authorize] attributes
app.UseAuthorization();

// Tenant resolution - MUST come after UseAuthentication()
// Reads tenant_id from JWT claims and sets TenantContext
app.UseMiddleware<TenantResolutionMiddleware>();

// Map controllers and health checks
app.MapControllers();
app.MapHealthChecks("/health", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
{
    ResponseWriter = async (context, report) =>
    {
        context.Response.ContentType = "application/json";
        var result = System.Text.Json.JsonSerializer.Serialize(new
        {
            status = report.Status.ToString(),
            checks = report.Entries.Select(e => new
            {
                name = e.Key,
                status = e.Value.Status.ToString(),
                description = e.Value.Description,
                duration = e.Value.Duration.TotalMilliseconds
            })
        });
        await context.Response.WriteAsync(result);
    }
});

// Map SignalR hubs
// Endpoint: /hubs/messages
// WebSocket connection: ws://localhost:5080/hubs/messages?access_token=<jwt>
app.MapHub<MessagesHub>("/hubs/messages");

// =============================================================================
// RUN
// =============================================================================

app.Run();

// Make Program class accessible for integration tests
public partial class Program { }
