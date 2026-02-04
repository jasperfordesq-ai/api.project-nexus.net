# ASP.NET Core Project Structure - Project NEXUS Migration

## Solution Architecture

This scaffold supports the **strangler fig pattern** for incremental migration from PHP.

```
Nexus.sln
│
├── src/
│   ├── Nexus.Api/                      # ASP.NET Core Web API (entry point)
│   ├── Nexus.Application/              # Business logic (services, DTOs, interfaces)
│   ├── Nexus.Domain/                   # Domain entities and enums
│   ├── Nexus.Infrastructure/           # Data access, external services
│   ├── Nexus.Shared/                   # Cross-cutting concerns
│   └── Nexus.GovDesign/                # Design system abstraction for GOV.UK/GOV.IE
│
├── tests/
│   ├── Nexus.Api.Tests/
│   ├── Nexus.Application.Tests/
│   ├── Nexus.Infrastructure.Tests/
│   └── Nexus.Integration.Tests/
│
└── tools/
    └── Nexus.Migration/                # Database migration tools
```

---

## Detailed Project Breakdown

### 1. Nexus.Api (Web API Host)

```
Nexus.Api/
├── Controllers/
│   ├── V1/                             # Legacy API compatibility
│   │   ├── AuthController.cs
│   │   ├── ListingsController.cs
│   │   └── ...
│   │
│   └── V2/                             # Modern RESTful API
│       ├── AuthController.cs
│       ├── ListingsController.cs
│       ├── UsersController.cs
│       ├── MessagesController.cs
│       ├── EventsController.cs
│       ├── GroupsController.cs
│       ├── ConnectionsController.cs
│       ├── WalletController.cs
│       ├── FeedController.cs
│       ├── NotificationsController.cs
│       ├── ReviewsController.cs
│       ├── SearchController.cs
│       ├── PollsController.cs
│       ├── GoalsController.cs
│       ├── GamificationController.cs
│       ├── VolunteeringController.cs
│       └── FederationController.cs
│
├── Middleware/
│   ├── TenantResolutionMiddleware.cs   # Multi-tenant context
│   ├── FeatureGateMiddleware.cs        # Module feature flags
│   ├── RateLimitingMiddleware.cs       # API rate limiting
│   ├── ApiVersioningMiddleware.cs      # V1/V2 routing
│   ├── PhpProxyMiddleware.cs           # STRANGLER FIG: Route to PHP
│   └── ExceptionHandlingMiddleware.cs  # Global error handling
│
├── Filters/
│   ├── ValidateTenantFilter.cs
│   ├── RequireFeatureFilter.cs
│   └── AuditLogFilter.cs
│
├── Extensions/
│   ├── ServiceCollectionExtensions.cs
│   ├── AuthenticationExtensions.cs
│   └── SwaggerExtensions.cs
│
├── Configuration/
│   ├── appsettings.json
│   ├── appsettings.Development.json
│   ├── appsettings.Production.json
│   └── appsettings.Staging.json
│
└── Program.cs
```

### 2. Nexus.Application (Business Logic)

```
Nexus.Application/
├── Common/
│   ├── Interfaces/
│   │   ├── ICurrentTenantService.cs
│   │   ├── ICurrentUserService.cs
│   │   ├── IDateTimeService.cs
│   │   └── ICacheService.cs
│   │
│   ├── Models/
│   │   ├── ServiceResult.cs            # Standardized result type
│   │   ├── PaginatedResult.cs          # Cursor pagination
│   │   ├── ServiceError.cs
│   │   └── CursorPagination.cs
│   │
│   └── Behaviors/
│       ├── ValidationBehavior.cs       # FluentValidation pipeline
│       ├── LoggingBehavior.cs
│       └── PerformanceBehavior.cs
│
├── Features/
│   ├── Auth/
│   │   ├── Commands/
│   │   │   ├── LoginCommand.cs
│   │   │   ├── RegisterCommand.cs
│   │   │   ├── RefreshTokenCommand.cs
│   │   │   ├── RevokeTokenCommand.cs
│   │   │   └── Verify2FACommand.cs
│   │   │
│   │   ├── Queries/
│   │   │   ├── ValidateTokenQuery.cs
│   │   │   └── GetSessionQuery.cs
│   │   │
│   │   ├── Handlers/
│   │   │   ├── LoginCommandHandler.cs
│   │   │   └── ...
│   │   │
│   │   ├── DTOs/
│   │   │   ├── LoginRequestDto.cs
│   │   │   ├── LoginResponseDto.cs
│   │   │   ├── TokenDto.cs
│   │   │   └── UserSessionDto.cs
│   │   │
│   │   └── Validators/
│   │       ├── LoginCommandValidator.cs
│   │       └── RegisterCommandValidator.cs
│   │
│   ├── Listings/
│   │   ├── Commands/
│   │   │   ├── CreateListingCommand.cs
│   │   │   ├── UpdateListingCommand.cs
│   │   │   ├── DeleteListingCommand.cs
│   │   │   └── UploadListingImageCommand.cs
│   │   │
│   │   ├── Queries/
│   │   │   ├── GetListingsQuery.cs
│   │   │   ├── GetListingByIdQuery.cs
│   │   │   └── GetNearbyListingsQuery.cs
│   │   │
│   │   ├── DTOs/
│   │   │   ├── ListingDto.cs
│   │   │   ├── CreateListingDto.cs
│   │   │   └── ListingSearchDto.cs
│   │   │
│   │   └── Validators/
│   │
│   ├── Users/
│   │   ├── Commands/
│   │   │   ├── UpdateProfileCommand.cs
│   │   │   ├── UpdatePreferencesCommand.cs
│   │   │   ├── UpdateAvatarCommand.cs
│   │   │   └── ChangePasswordCommand.cs
│   │   │
│   │   ├── Queries/
│   │   │   ├── GetCurrentUserQuery.cs
│   │   │   └── GetUserProfileQuery.cs
│   │   │
│   │   └── DTOs/
│   │
│   ├── Messages/
│   │   ├── Commands/
│   │   │   ├── SendMessageCommand.cs
│   │   │   ├── MarkReadCommand.cs
│   │   │   ├── ArchiveMessageCommand.cs
│   │   │   └── SendTypingIndicatorCommand.cs
│   │   │
│   │   ├── Queries/
│   │   │   ├── GetConversationsQuery.cs
│   │   │   ├── GetMessageThreadQuery.cs
│   │   │   └── GetUnreadCountQuery.cs
│   │   │
│   │   └── DTOs/
│   │
│   ├── Events/
│   │   ├── Commands/
│   │   │   ├── CreateEventCommand.cs
│   │   │   ├── UpdateEventCommand.cs
│   │   │   ├── DeleteEventCommand.cs
│   │   │   ├── RsvpCommand.cs
│   │   │   └── RemoveRsvpCommand.cs
│   │   │
│   │   ├── Queries/
│   │   │   ├── GetEventsQuery.cs
│   │   │   ├── GetEventByIdQuery.cs
│   │   │   └── GetAttendeesQuery.cs
│   │   │
│   │   └── DTOs/
│   │
│   ├── Groups/
│   │   ├── Commands/
│   │   │   ├── CreateGroupCommand.cs
│   │   │   ├── UpdateGroupCommand.cs
│   │   │   ├── DeleteGroupCommand.cs
│   │   │   ├── JoinGroupCommand.cs
│   │   │   ├── LeaveGroupCommand.cs
│   │   │   ├── HandleJoinRequestCommand.cs
│   │   │   ├── UpdateMemberRoleCommand.cs
│   │   │   └── RemoveMemberCommand.cs
│   │   │
│   │   ├── Queries/
│   │   │   ├── GetGroupsQuery.cs
│   │   │   ├── GetGroupByIdQuery.cs
│   │   │   ├── GetMembersQuery.cs
│   │   │   ├── GetPendingRequestsQuery.cs
│   │   │   └── GetDiscussionsQuery.cs
│   │   │
│   │   └── DTOs/
│   │
│   ├── Wallet/
│   │   ├── Commands/
│   │   │   ├── TransferCommand.cs
│   │   │   └── DeleteTransactionCommand.cs
│   │   │
│   │   ├── Queries/
│   │   │   ├── GetBalanceQuery.cs
│   │   │   ├── GetTransactionsQuery.cs
│   │   │   ├── GetTransactionByIdQuery.cs
│   │   │   └── SearchUsersForTransferQuery.cs
│   │   │
│   │   └── DTOs/
│   │
│   ├── Feed/
│   │   ├── Commands/
│   │   │   ├── CreatePostCommand.cs
│   │   │   ├── LikePostCommand.cs
│   │   │   ├── CommentCommand.cs
│   │   │   ├── SharePostCommand.cs
│   │   │   ├── HidePostCommand.cs
│   │   │   ├── MuteUserCommand.cs
│   │   │   └── ReportPostCommand.cs
│   │   │
│   │   ├── Queries/
│   │   │   ├── GetFeedQuery.cs
│   │   │   └── GetPostCommentsQuery.cs
│   │   │
│   │   └── DTOs/
│   │
│   ├── Notifications/
│   │   ├── Commands/
│   │   │   ├── MarkReadCommand.cs
│   │   │   ├── MarkAllReadCommand.cs
│   │   │   ├── DeleteNotificationCommand.cs
│   │   │   └── DeleteAllNotificationsCommand.cs
│   │   │
│   │   ├── Queries/
│   │   │   ├── GetNotificationsQuery.cs
│   │   │   ├── GetNotificationCountsQuery.cs
│   │   │   └── GetNotificationByIdQuery.cs
│   │   │
│   │   └── DTOs/
│   │
│   ├── Connections/
│   │   ├── Commands/
│   │   │   ├── SendRequestCommand.cs
│   │   │   ├── AcceptRequestCommand.cs
│   │   │   └── RemoveConnectionCommand.cs
│   │   │
│   │   ├── Queries/
│   │   │   ├── GetConnectionsQuery.cs
│   │   │   ├── GetPendingCountsQuery.cs
│   │   │   └── GetConnectionStatusQuery.cs
│   │   │
│   │   └── DTOs/
│   │
│   ├── Reviews/
│   │   ├── Commands/
│   │   │   ├── CreateReviewCommand.cs
│   │   │   └── DeleteReviewCommand.cs
│   │   │
│   │   ├── Queries/
│   │   │   ├── GetPendingReviewsQuery.cs
│   │   │   ├── GetUserReviewsQuery.cs
│   │   │   ├── GetUserStatsQuery.cs
│   │   │   └── GetUserTrustQuery.cs
│   │   │
│   │   └── DTOs/
│   │
│   ├── Search/
│   │   ├── Queries/
│   │   │   ├── UnifiedSearchQuery.cs
│   │   │   └── GetSuggestionsQuery.cs
│   │   │
│   │   └── DTOs/
│   │
│   ├── Polls/
│   │   ├── Commands/
│   │   │   ├── CreatePollCommand.cs
│   │   │   ├── UpdatePollCommand.cs
│   │   │   ├── DeletePollCommand.cs
│   │   │   └── VoteCommand.cs
│   │   │
│   │   ├── Queries/
│   │   │   ├── GetPollsQuery.cs
│   │   │   └── GetPollByIdQuery.cs
│   │   │
│   │   └── DTOs/
│   │
│   ├── Goals/
│   │   ├── Commands/
│   │   │   ├── CreateGoalCommand.cs
│   │   │   ├── UpdateGoalCommand.cs
│   │   │   ├── DeleteGoalCommand.cs
│   │   │   ├── UpdateProgressCommand.cs
│   │   │   └── BecomeGoalBuddyCommand.cs
│   │   │
│   │   ├── Queries/
│   │   │   ├── GetGoalsQuery.cs
│   │   │   ├── GetGoalByIdQuery.cs
│   │   │   └── DiscoverGoalsQuery.cs
│   │   │
│   │   └── DTOs/
│   │
│   ├── Gamification/
│   │   ├── Commands/
│   │   │   ├── ClaimDailyRewardCommand.cs
│   │   │   ├── PurchaseItemCommand.cs
│   │   │   └── UpdateShowcaseCommand.cs
│   │   │
│   │   ├── Queries/
│   │   │   ├── GetProfileQuery.cs
│   │   │   ├── GetBadgesQuery.cs
│   │   │   ├── GetBadgeByKeyQuery.cs
│   │   │   ├── GetLeaderboardQuery.cs
│   │   │   ├── GetChallengesQuery.cs
│   │   │   ├── GetCollectionsQuery.cs
│   │   │   ├── GetDailyRewardStatusQuery.cs
│   │   │   ├── GetShopQuery.cs
│   │   │   ├── GetSeasonsQuery.cs
│   │   │   └── GetCurrentSeasonQuery.cs
│   │   │
│   │   └── DTOs/
│   │
│   ├── Volunteering/
│   │   ├── Commands/
│   │   │   ├── CreateOpportunityCommand.cs
│   │   │   ├── UpdateOpportunityCommand.cs
│   │   │   ├── DeleteOpportunityCommand.cs
│   │   │   ├── ApplyCommand.cs
│   │   │   ├── HandleApplicationCommand.cs
│   │   │   ├── WithdrawApplicationCommand.cs
│   │   │   ├── SignUpForShiftCommand.cs
│   │   │   ├── CancelSignupCommand.cs
│   │   │   ├── LogHoursCommand.cs
│   │   │   ├── VerifyHoursCommand.cs
│   │   │   └── CreateReviewCommand.cs
│   │   │
│   │   ├── Queries/
│   │   │   ├── GetOpportunitiesQuery.cs
│   │   │   ├── GetOpportunityByIdQuery.cs
│   │   │   ├── GetMyApplicationsQuery.cs
│   │   │   ├── GetMyShiftsQuery.cs
│   │   │   ├── GetMyHoursQuery.cs
│   │   │   ├── GetHoursSummaryQuery.cs
│   │   │   ├── GetOrganisationsQuery.cs
│   │   │   └── GetReviewsQuery.cs
│   │   │
│   │   └── DTOs/
│   │
│   └── Federation/
│       ├── Commands/
│       │   ├── SendFederatedMessageCommand.cs
│       │   └── CreateFederatedTransactionCommand.cs
│       │
│       ├── Queries/
│       │   ├── GetFederationInfoQuery.cs
│       │   ├── GetPartnerTimebanksQuery.cs
│       │   ├── GetFederatedMembersQuery.cs
│       │   ├── GetFederatedMemberQuery.cs
│       │   ├── GetFederatedListingsQuery.cs
│       │   └── GetFederatedListingQuery.cs
│       │
│       └── DTOs/
│
├── Services/
│   ├── TokenService.cs                 # JWT generation/validation
│   ├── RateLimitService.cs
│   ├── NotificationService.cs
│   ├── EmailService.cs
│   ├── PushNotificationService.cs
│   ├── RealtimeService.cs              # Pusher/SignalR
│   ├── MatchingService.cs
│   ├── FederationGatewayService.cs
│   └── GamificationService.cs
│
└── Mappings/
    └── MappingProfile.cs               # AutoMapper profiles
```

### 3. Nexus.Domain (Entities)

```
Nexus.Domain/
├── Entities/
│   ├── Tenant.cs
│   ├── User.cs
│   ├── Listing.cs
│   ├── Transaction.cs
│   ├── FeedPost.cs
│   ├── Comment.cs
│   ├── Message.cs
│   ├── Notification.cs
│   ├── Event.cs
│   ├── EventRsvp.cs
│   ├── Group.cs
│   ├── GroupMember.cs
│   ├── GroupDiscussion.cs
│   ├── GroupMessage.cs
│   ├── Connection.cs
│   ├── Review.cs
│   ├── Poll.cs
│   ├── PollOption.cs
│   ├── PollVote.cs
│   ├── Goal.cs
│   ├── GoalProgress.cs
│   ├── Badge.cs
│   ├── UserBadge.cs
│   ├── UserXpLog.cs
│   ├── Challenge.cs
│   ├── VolunteerOpportunity.cs
│   ├── VolunteerApplication.cs
│   ├── VolunteerShift.cs
│   ├── VolunteerHours.cs
│   ├── RefreshToken.cs
│   ├── RevokedToken.cs
│   ├── LoginAttempt.cs
│   ├── WebAuthnCredential.cs
│   ├── TotpDevice.cs
│   ├── FederationPartner.cs
│   ├── FederationApiKey.cs
│   ├── CookieConsent.cs
│   └── ...
│
├── Enums/
│   ├── UserStatus.cs
│   ├── UserRole.cs
│   ├── ListingType.cs
│   ├── ListingStatus.cs
│   ├── TransactionStatus.cs
│   ├── EventStatus.cs
│   ├── GroupMemberRole.cs
│   ├── ConnectionStatus.cs
│   ├── BadgeRarity.cs
│   ├── GoalStatus.cs
│   ├── ApplicationStatus.cs
│   └── ...
│
├── Events/                             # Domain events
│   ├── UserRegisteredEvent.cs
│   ├── TransactionCompletedEvent.cs
│   ├── BadgeEarnedEvent.cs
│   ├── LevelUpEvent.cs
│   └── ...
│
└── Common/
    ├── BaseEntity.cs
    ├── AuditableEntity.cs
    ├── ITenantEntity.cs
    └── ISoftDelete.cs
```

### 4. Nexus.Infrastructure (Data Access)

```
Nexus.Infrastructure/
├── Persistence/
│   ├── NexusDbContext.cs
│   │
│   ├── Configurations/                 # Entity type configurations
│   │   ├── TenantConfiguration.cs
│   │   ├── UserConfiguration.cs
│   │   ├── ListingConfiguration.cs
│   │   ├── TransactionConfiguration.cs
│   │   └── ...
│   │
│   ├── Interceptors/
│   │   ├── AuditableEntityInterceptor.cs
│   │   ├── SoftDeleteInterceptor.cs
│   │   └── TenantInterceptor.cs
│   │
│   ├── Repositories/
│   │   ├── UserRepository.cs
│   │   ├── ListingRepository.cs
│   │   ├── TransactionRepository.cs
│   │   └── ...
│   │
│   └── Migrations/
│
├── Services/
│   ├── CurrentTenantService.cs
│   ├── CurrentUserService.cs
│   ├── DateTimeService.cs
│   ├── EmailSender.cs
│   ├── PusherService.cs
│   ├── WebPushService.cs
│   ├── StorageService.cs
│   ├── CacheService.cs
│   └── ...
│
├── Identity/
│   ├── JwtTokenGenerator.cs
│   ├── JwtTokenValidator.cs
│   ├── RefreshTokenService.cs
│   ├── WebAuthnService.cs
│   └── TotpService.cs
│
├── External/
│   ├── OpenAI/
│   │   └── OpenAIService.cs
│   │
│   ├── Pusher/
│   │   └── PusherClient.cs
│   │
│   └── Stripe/
│       └── StripeService.cs
│
└── DependencyInjection.cs
```

### 5. Nexus.Shared (Cross-Cutting)

```
Nexus.Shared/
├── Constants/
│   ├── CacheKeys.cs
│   ├── Permissions.cs
│   ├── Features.cs
│   └── ErrorCodes.cs
│
├── Extensions/
│   ├── StringExtensions.cs
│   ├── DateTimeExtensions.cs
│   ├── EnumerableExtensions.cs
│   └── HttpContextExtensions.cs
│
├── Helpers/
│   ├── CursorHelper.cs
│   ├── SlugHelper.cs
│   └── ImageHelper.cs
│
└── Guards/
    └── Guard.cs
```

### 6. Nexus.GovDesign (Design System Abstraction)

```
Nexus.GovDesign/
├── Abstractions/
│   ├── IDesignSystem.cs
│   ├── IComponentRenderer.cs
│   └── ILayoutProvider.cs
│
├── GovUK/                              # GOV.UK Frontend implementation
│   ├── GovUKDesignSystem.cs
│   ├── Components/
│   │   ├── ButtonComponent.cs
│   │   ├── InputComponent.cs
│   │   ├── ErrorSummaryComponent.cs
│   │   └── ...
│   └── Layouts/
│
├── GovIE/                              # GOV.IE implementation
│   ├── GovIEDesignSystem.cs
│   ├── Components/
│   └── Layouts/
│
└── Common/
    ├── DesignSystemFactory.cs
    └── ComponentBase.cs
```

---

## Key Architecture Decisions

### 1. CQRS with MediatR
Using MediatR for command/query separation enables:
- Clean separation of read vs write operations
- Easy addition of cross-cutting concerns (logging, validation)
- Testability

### 2. Multi-Tenant Architecture
- Global query filters in EF Core for tenant isolation
- `ITenantEntity` interface on all tenant-scoped entities
- Tenant resolution via middleware (domain/header/token)

### 3. Feature-Based Organization
- Features grouped by domain (Auth, Listings, Wallet, etc.)
- Each feature contains Commands, Queries, DTOs, Validators
- Mirrors the PHP controller structure for easy migration mapping

### 4. Strangler Fig Support
- `PhpProxyMiddleware` routes unmigrated endpoints to PHP
- Endpoints migrated incrementally
- Both systems share the same database during transition

### 5. Design System Abstraction
- Abstract design system allows switching between GOV.UK and GOV.IE
- Server-rendered components with design system tokens
- WCAG 2.1 AA compliance built into component library

---

## NuGet Packages Required

```xml
<!-- Core -->
<PackageReference Include="MediatR" Version="12.*" />
<PackageReference Include="FluentValidation.AspNetCore" Version="11.*" />
<PackageReference Include="AutoMapper.Extensions.Microsoft.DependencyInjection" Version="12.*" />

<!-- Data Access -->
<PackageReference Include="Microsoft.EntityFrameworkCore" Version="8.*" />
<PackageReference Include="Pomelo.EntityFrameworkCore.MySql" Version="8.*" />
<PackageReference Include="Microsoft.EntityFrameworkCore.Tools" Version="8.*" />

<!-- Authentication -->
<PackageReference Include="Microsoft.AspNetCore.Authentication.JwtBearer" Version="8.*" />
<PackageReference Include="Fido2.AspNet" Version="3.*" />
<PackageReference Include="OtpNet" Version="1.*" />

<!-- API Documentation -->
<PackageReference Include="Swashbuckle.AspNetCore" Version="6.*" />
<PackageReference Include="Microsoft.AspNetCore.Mvc.Versioning" Version="5.*" />

<!-- Caching & Rate Limiting -->
<PackageReference Include="Microsoft.Extensions.Caching.StackExchangeRedis" Version="8.*" />
<PackageReference Include="AspNetCoreRateLimit" Version="5.*" />

<!-- Background Jobs -->
<PackageReference Include="Hangfire.AspNetCore" Version="1.*" />
<PackageReference Include="Hangfire.MySqlStorage" Version="2.*" />

<!-- Real-time -->
<PackageReference Include="PusherServer" Version="5.*" />
<PackageReference Include="WebPush" Version="1.*" />

<!-- Logging -->
<PackageReference Include="Serilog.AspNetCore" Version="8.*" />
<PackageReference Include="Serilog.Sinks.Console" Version="5.*" />
<PackageReference Include="Serilog.Sinks.File" Version="5.*" />

<!-- Testing -->
<PackageReference Include="xunit" Version="2.*" />
<PackageReference Include="Moq" Version="4.*" />
<PackageReference Include="FluentAssertions" Version="6.*" />
<PackageReference Include="Microsoft.AspNetCore.Mvc.Testing" Version="8.*" />
```

---

## File Naming Conventions

| PHP File | ASP.NET Core Equivalent |
|----------|-------------------------|
| `src/Controllers/Api/ListingsApiController.php` | `Nexus.Api/Controllers/V2/ListingsController.cs` |
| `src/Services/WalletService.php` | `Nexus.Application/Features/Wallet/...` |
| `src/Models/User.php` | `Nexus.Domain/Entities/User.cs` |
| `src/Core/Database.php` | `Nexus.Infrastructure/Persistence/NexusDbContext.cs` |
| `src/Core/Auth.php` | `Nexus.Infrastructure/Identity/...` |
| `src/Middleware/*.php` | `Nexus.Api/Middleware/*.cs` |

---

## Database Migration Strategy

1. **Scaffold existing schema** from MySQL using EF Core reverse engineering
2. **Add global query filters** for tenant isolation
3. **Configure relationships** via Fluent API
4. **Create shadow migration** - EF tracks the existing schema without modifying it
5. **Incremental migrations** for any schema changes during .NET development
