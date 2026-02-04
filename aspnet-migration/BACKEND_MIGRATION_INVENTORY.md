# Backend Migration Inventory

**Purpose:** Backend-only inventory for PHP to ASP.NET Core migration.
**Last Updated:** February 2, 2026

---

## Summary

| Component | Count | Target |
|-----------|-------|--------|
| PHP Source Files (src/) | 420 | C# Classes |
| PHP Views | 1,125 | Razor Pages |
| Database Tables | 236 | EF Core Entities |
| Routes | 1,183 | ASP.NET Routing |
| PHPUnit Tests | 64 | xUnit Tests |
| External Services | 12 | .NET Integrations |

---

## 1. PHP Source Files (src/ - 420 files)

### Controllers (169 files)

**User-Facing (70):**
AchievementsController, AdminController, AiController, AuthController, BlogController, ComposeController, ConnectionController, ConsentController, ContactController, CookiePolicyController, CookiePreferencesController, CronController, DashboardController, DemoController, DigestController, EventController, FederatedEventController, FederatedGroupController, FederatedListingController, FederatedMemberController, FederatedMessageController, FederatedPartnerController, FederatedTransactionController, FederationAdminController, FederationDashboardController, FederationHelpController, FederationHubController, FederationOfflineController, FederationOnboardingController, FederationReviewController, FederationSettingsController, FederationStreamController, FeedController, GoalController, GovernanceController, GroupAnalyticsController, GroupController, GroupDiscussionController, HelpController, HomeController, InsightsController, LeaderboardController, LegalDocumentController, ListingController, MasterController, MatchController, MemberController, MessageController, NewsletterSubscriptionController, NewsletterTrackingController, NexusScoreController, NotificationController, OnboardingController, OrgWalletController, PageController, PollController, ProfileController, ReportController, ResourceController, ReviewController, RobotsController, SearchController, SettingsController, ShareTargetController, SitemapController, SocialAuthController, TotpController, UserPreferenceController, VolunteeringController, WalletController

**Admin (35):**
Located in `src/Controllers/Admin/`

**Admin Enterprise (9):**
Located in `src/Controllers/Admin/Enterprise/` - GDPR, monitoring, secrets

**API (44):**
AuthController, ConnectionsApiController, EmailVerificationApiController, EventApiController, EventsApiController, GamificationV2ApiController, GdprApiController, GoalApiController, GoalsApiController, GroupRecommendationController, GroupsApiController, LayoutApiController, ListingsApiController, MessagesApiController, NotificationsApiController, OpenApiController, PasswordResetApiController, PollsApiController, PushApiController, RegistrationApiController, ReviewsApiController, SearchApiController, SocialApiController, UploadController, UsersApiController, VoiceMessageController, VolunteerApiController, WalletApiController

**API AI (5):**
AiChatController, AiContentController, AiAdminContentController, AiProviderController, BaseAiController

**SuperAdmin (6):**
Located in `src/Controllers/SuperAdmin/`

### Services (127 files)

| Category | Count | Services |
|----------|-------|----------|
| Core Platform | 13 | UserService, GroupService, ListingService, EventService, MessageService, NotificationService, WalletService, ConnectionService, VolunteerService, ReviewService, PollService, GoalService, CommentService |
| Federation | 15 | FederationGateway, FederationUserService, FederationPartnershipService, FederationDirectoryService, FederatedGroupService, FederatedMessageService, FederatedTransactionService, FederationActivityService, FederationAuditService, FederationEmailService, FederationExternalApiClient, FederationExternalPartnerService, FederationJwtService, FederationFeatureService, FederationRealtimeService |
| Group Management | 11 | GroupAchievementService, GroupApprovalWorkflowService, GroupAssignmentService, GroupAuditService, GroupConfigurationService, GroupFeatureToggleService, GroupModerationService, GroupPermissionManager, GroupPolicyRepository, GroupReportingService, OptimizedGroupQueries |
| Gamification | 11 | GamificationService, AchievementAnalyticsService, AchievementCampaignService, AchievementUnlockablesService, BadgeCollectionService, DailyRewardService, StreakService, GamificationEmailService, GamificationRealtimeService, LeaderboardService, LeaderboardSeasonService |
| Notifications | 9 | NotificationDispatcher, PusherService, RealtimeService, WebPushService, FCMPushService, SocialNotificationService, OrgNotificationService, ProgressNotificationService, DigestService |
| Utilities | 9 | UploadService, RedisCache, GeocodingService, LayoutHelper, LayoutValidator, CSSSanitizer, SchemaService, AuditLogService, SuperAdminAuditService |
| Matching | 8 | MatchingService, SmartMatchingEngine, SmartMatchingAnalyticsService, MatchLearningService, SmartGroupMatchingService, GroupRecommendationEngine, SmartGroupRankingService, SmartSegmentSuggestionService |
| AI | 7 | AIServiceFactory, AIProviderInterface, BaseProvider, OpenAIProvider, AnthropicProvider, GeminiProvider, OllamaProvider |
| Authentication | 6 | TokenService, TotpService, WebAuthnChallengeStore, TwoFactorChallengeManager, SocialAuthService, CookieConsentService |
| Email/Newsletter | 5 | NewsletterService, NewsletterTemplates, MailchimpService, EmailTemplateBuilder, DeliverabilityTrackingService |
| Ranking/Scoring | 5 | RankingService, ListingRankingService, MemberRankingService, NexusScoreService, NexusScoreCacheService |
| Enterprise | 5 | ConfigService, GdprService, LoggerService, MetricsService, PermissionService |
| Search | 4 | UnifiedSearchService, SearchAnalyzerService, PersonalizedSearchService, FederationSearchService |
| Admin/Analytics | 4 | AdminAnalyticsService, AdminBadgeCountService, UserInsightsService, TenantHierarchyService |
| Wallet/Finance | 4 | OrgWalletService, TransactionExportService, TransactionLimitService, PayPlanService |
| Abuse/Safety | 3 | AbuseDetectionService, BalanceAlertService, CookieInventoryService |
| Feed/Social | 3 | FeedService, FeedRankingService, SocialGamificationService |
| Rewards | 2 | ReferralService, XPShopService |
| Legal | 2 | LegalDocumentService, TenantVisibilityService |

### Models (59 files)

**Core:** User, Tenant, Listing, Event, Group, Message, Transaction, Connection

**Newsletter:** Newsletter, NewsletterAnalytics, NewsletterBounce, NewsletterSegment, NewsletterSubscriber, NewsletterTemplate

**Organization:** OrgMember, OrgTransaction, OrgTransferRequest, OrgWallet, VolOrganization

**Content:** FeedPost, Post, Page, Poll, Goal, ResourceItem, HelpArticle

**Gamification:** UserBadge, Gamification

**AI:** AiConversation, AiMessage, AiSettings, AiUsage, AiUserLimit

**Volunteering:** VolApplication, VolLog, VolOpportunity, VolReview, VolShift

**Other:** ActivityLog, Attribute, Category, Deliverable, DeliverableComment, DeliverableMilestone, Error404Log, EventRsvp, GroupDiscussion, GroupDiscussionSubscriber, GroupFeedback, GroupPost, GroupType, Menu, MenuItem, Notification, PayPlan, Report, Review, SeoMetadata, SeoRedirect

### Core Classes (27 files)

AdminAuth, ApiAuth, ApiErrorCodes, AudioUploader, Auth, Csrf, Database, DatabaseWrapper, DefaultMenus, EmailTemplate, Env, HtmlSanitizer, ImageUploader, Mailer, MenuGenerator, MenuManager, RateLimiter, Router, SearchService, SEO, SimpleOAuth, SmartBlockRenderer, TenantContext, TotpEncryption, Validator, VaultClient, View

### Middleware (6 files)

ApiRateLimitMiddleware, CorsMiddleware, FederationAuthMiddleware, SuperPanelMiddleware, TenantMiddleware, UrlFuzzyMiddleware

### PageBuilder (18 files)

BlockRegistry, PageRenderer, core-blocks.php, and 15 block renderers

### Helpers (8 files)

ImageUploader, UrlHelper, and utility functions

### Config (4 files)

ai.php, pusher.php, config.php, ApiDeprecation.php

---

## 2. Database Schema (236 tables)

**Source:** `schema.sql` (authoritative) or `schema.prisma`

| Category | Tables |
|----------|--------|
| **Core User** | users, user_profiles, user_settings, user_preferences, user_badges, user_xp_logs, user_levels, user_streaks, user_sessions, user_devices |
| **Authentication** | password_resets, email_verification_tokens, revoked_tokens, webauthn_credentials, totp_secrets, trusted_devices, backup_codes, social_logins |
| **Tenancy** | tenants, tenant_settings, tenant_features, tenant_hierarchy, tenant_domains |
| **Listings** | listings, listing_categories, listing_images, listing_views, listing_favorites, listing_matches |
| **Transactions** | transactions, transaction_disputes, balance_history, pending_transactions |
| **Messages** | messages, conversations, conversation_participants, message_attachments, voice_messages |
| **Groups** | groups, group_members, group_posts, group_discussions, group_events, group_settings, group_invites, group_types, group_categories |
| **Events** | events, event_rsvps, event_reminders, event_categories, recurring_events |
| **Feed/Social** | feed_posts, feed_comments, feed_likes, feed_shares, feed_media, polls, poll_options, poll_votes |
| **Connections** | connections, connection_requests, blocked_users |
| **Notifications** | notifications, notification_preferences, push_subscriptions, email_digests |
| **Gamification** | badges, achievements, challenges, challenge_participants, xp_logs, leaderboards, leaderboard_seasons, daily_rewards, streaks |
| **Goals** | goals, goal_milestones, goal_participants, goal_progress |
| **Volunteering** | vol_opportunities, vol_applications, vol_shifts, vol_logs, vol_reviews, vol_organizations |
| **Organizations** | organizations, org_members, org_wallets, org_transactions, org_transfer_requests |
| **Reviews** | reviews, review_responses |
| **Resources** | resources, resource_categories, resource_downloads |
| **AI System** | ai_conversations, ai_messages, ai_settings, ai_usage, ai_user_limits, ai_providers |
| **Newsletter** | newsletters, newsletter_subscribers, newsletter_segments, newsletter_analytics, newsletter_bounces, newsletter_templates |
| **Federation** | federation_partners, federation_api_keys, federation_audit_logs, federation_shared_* |
| **Admin** | admin_users, admin_actions, permissions, roles, role_permissions, user_roles |
| **Content** | pages, page_blocks, blog_posts, help_articles, help_categories, legal_documents |
| **Analytics** | activity_log, analytics_events, page_views, search_logs, 404_error_logs |
| **Compliance** | cookie_consents, gdpr_requests, gdpr_exports, audit_logs |
| **Config** | settings, feature_flags, menus, menu_items, categories, seo_metadata, seo_redirects |
| **Cron/Jobs** | cron_logs, scheduled_tasks, job_batches, failed_jobs |

---

## 3. Views (1,125 PHP files)

| Theme | Files | Target |
|-------|-------|--------|
| Modern | 408 | Razor Pages |
| CivicOne | 232 | Razor Pages (GOV.UK components) |
| Admin | 73 | Razor Pages |
| Layouts | 61 | _Layout.cshtml |
| Skeleton | 22 | Component library |
| Partials | 13 | Partial views |
| Emails | 4 | Email templates |
| Other | 312 | Various |

**Risk:** 478 files contain inline `<script>`, 382 contain inline `<style>` - need refactoring.

---

## 4. Routes (1,183 total)

**Source:** `httpdocs/routes.php`

| Category | Count |
|----------|-------|
| API v2 (RESTful) | 280 |
| API v1 (Legacy) | 168 |
| Public/Auth Pages | 480+ |
| Admin Dashboard | 340+ |
| Super-Admin | 59 |
| Federation API | 11 |
| Cron/Webhooks | 13 |

---

## 5. Tests (64 PHPUnit files)

| Category | Count | Files |
|----------|-------|-------|
| Controllers/Api | 9 | Auth, Core, AI, Social, Wallet, Gamification, Push, WebAuthn |
| Controllers | 2 | MatchController, TotpController |
| Services | 15 | Gamification, Wallet, Matching, TOTP, Geocoding, etc. |
| Services/Federation | 4 | FederatedTransaction, FederationAudit, FederationFeature, FederationGateway |
| Models | 9 | User, Listing, Transaction, Group, Notification, Deliverable, OrgWallet |
| Enterprise | 4 | ConfigService, GdprService, LoggerService, MetricsService |
| Base Classes | 11 | TestCase, DatabaseTestCase, ControllerTestCase, bootstrap |
| Debug/Utilities | 10 | Various verification scripts |

---

## 6. External Service Integrations

| Service | PHP Implementation | .NET Equivalent |
|---------|-------------------|-----------------|
| **MySQL 8.0** | PDO via Database class | EF Core + Pomelo.EntityFrameworkCore.MySql |
| **Redis 7+** | RedisCache service | StackExchange.Redis |
| **Pusher** | PusherService | PusherServer NuGet |
| **Gmail API** | Mailer class | Google.Apis.Gmail.v1 |
| **SMTP** | PHPMailer fallback | MailKit |
| **Meilisearch** | UnifiedSearchService | Meilisearch SDK |
| **Firebase FCM** | FCMPushService | FirebaseAdmin |
| **WebPush/VAPID** | WebPushService | WebPush NuGet |
| **OpenAI** | OpenAIProvider | Azure.AI.OpenAI |
| **Anthropic** | AnthropicProvider | Anthropic SDK |
| **Google Gemini** | GeminiProvider | Google.Cloud.AIPlatform |
| **HashiCorp Vault** | VaultClient | VaultSharp |

### Integration Details

**Pusher (Real-time):**
- Config: `src/Config/pusher.php`
- Service: `src/Services/PusherService.php`
- Channels: private-user-{id}, presence-group-{id}, private-tenant-{id}

**Redis (Cache/Sessions):**
- Service: `src/Services/RedisCache.php`
- Keys: user:{id}, tenant:{id}:settings, rate_limit:{ip}

**Email (Gmail API primary, SMTP fallback):**
- Core: `src/Core/Mailer.php`
- Templates: `src/Core/EmailTemplate.php`
- Newsletter: `src/Services/NewsletterService.php`

**Search (Meilisearch):**
- Service: `src/Services/UnifiedSearchService.php`
- Indexes: listings, users, groups, events, posts

**AI Providers:**
- Factory: `src/Services/AI/AIServiceFactory.php`
- Default: Gemini, fallbacks: OpenAI, Anthropic, Ollama

---

## 7. Key PHP Patterns to Convert

### Database Access

```php
// PHP Pattern
$stmt = Database::query("SELECT * FROM users WHERE tenant_id = ?", [$tenantId]);
$users = $stmt->fetchAll();

// .NET Equivalent
var users = await _context.Users.Where(u => u.TenantId == tenantId).ToListAsync();
```

### Multi-Tenant Context

```php
// PHP Pattern
$tenantId = TenantContext::getId();
$setting = TenantContext::getSetting('feature_name');

// .NET Equivalent
var tenantId = _tenantContext.TenantId;
var setting = await _tenantService.GetSettingAsync("feature_name");
```

### Authentication

```php
// PHP Pattern
$user = Auth::user();
$token = ApiAuth::authenticate();

// .NET Equivalent
var user = await _userManager.GetUserAsync(User);
// JWT middleware handles API auth
```

### Service Pattern

```php
// PHP: Static methods
class WalletService {
    public static function transfer($from, $to, $amount) { }
}

// .NET: Dependency injection
public class WalletService : IWalletService {
    public async Task TransferAsync(int from, int to, decimal amount) { }
}
```

---

## 8. Migration Priority

### P0 - Critical (Weeks 1-8)
- AuthController + TokenService
- UsersApiController + UserService
- ListingsApiController + ListingService
- WalletApiController + WalletService
- MessagesApiController + MessageService
- Database entities for above

### P1 - Important (Weeks 9-14)
- SocialApiController + FeedService
- GroupsApiController + GroupService
- EventsApiController + EventService
- NotificationsApiController + NotificationService
- ConnectionsApiController + ConnectionService

### P2 - Secondary (Weeks 15-22)
- GamificationV2ApiController + GamificationService
- GoalsApiController + GoalService
- VolunteerApiController + VolunteerService
- SearchApiController + UnifiedSearchService
- PushApiController + WebPushService
- All Federation services

### P3 - Tertiary (Weeks 23-28)
- Admin controllers
- AI controllers
- Legacy V1 API
- PageBuilder system

---

## 9. Files NOT to Migrate

These stay as-is or get copied:

- `httpdocs/assets/css/` - Copy to wwwroot
- `httpdocs/assets/js/` - Copy to wwwroot
- `httpdocs/assets/images/` - Copy to wwwroot
- `govuk-frontend-ref/` - Reference only
- `capacitor/` - Update backend URL only
- `e2e/` - Update test URLs only
