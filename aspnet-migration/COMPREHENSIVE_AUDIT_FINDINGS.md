# Comprehensive Audit Findings - NINTH VERIFICATION

**Last Updated:** February 2, 2026
**Audit Pass:** Ninth Comprehensive Verification
**Total PHP Files:** 1,767+ (excluding vendor/node_modules)

This document captures ALL items discovered during the exhaustive ninth audit of the PHP codebase for ASP.NET Core migration. **CRITICAL: Previous audits missed entire directories including govuk-frontend-ref (876 files).**

---

## MASTER INVENTORY SUMMARY

| Component | Count | Previous | Change |
|-----------|-------|----------|--------|
| **PHP Files (Total)** | 1,767+ | 1,767 | ✓ Verified |
| **src/ Directory** | 420 | 420 | ✓ Verified |
| - Services | 127 | 127 | ✓ Verified |
| - Controllers | 169 | 169 | ✓ Verified |
| - Models | 59 | 59 | ✓ Verified |
| - Core Classes | 27 | 27 | ✓ Verified |
| - PageBuilder | 18 | 18 | ✓ Verified |
| - Middleware | 6 | 6 | ✓ Verified |
| - Helpers | 8 | 8 | ✓ Verified |
| - Config | 4 | 4 | ✓ Verified |
| - Admin | 1 | 1 | ✓ Verified |
| **Views** | 1,125 | 1,125 | ✓ Verified |
| **Scripts** | **219** | 140 | **+79 files** |
| **Database Tables** | **236** | 83 migrations | **schema.sql is authoritative** |
| **Tests (PHPUnit)** | **64** | 44 | **+20 files** |
| **E2E Tests (Playwright)** | **40** | 35 | **+5 files** |
| **Routes** | 1,183 | 1,183 | ✓ Verified |
| **JavaScript Files** | **223** | 138 | **+85 files** |
| **CSS Files** | **1,018** | 294 | **+724 files** |
| **Docker Files** | 10 | 10 | ✓ Verified |
| **CI/CD Workflows** | 3 | 3 | ✓ Verified |
| **Config Files** | 6 | 5 | +1 file |
| **Mobile App (Capacitor)** | 78 source | N/A | **NEW: Detailed** |
| **Root Files** | 51 | N/A | **NEW** |
| **app/ Directory** | 1 | N/A | **NEW** |
| **docs/ Directory** | 129 | N/A | **NEW** |
| **govuk-frontend-ref/** | **876** | N/A | **NEW: GOV.UK source** |
| **backups/** | 323 | N/A | Runtime data |
| **uploads/ (root)** | 509 | N/A | **DUPLICATE of httpdocs/uploads** |
| **.claude/** | 4 | N/A | Claude Code config |
| **.githooks/** | 3 | N/A | Git pre-commit hooks |
| **.vscode/** | 2 | N/A | IDE config |
| **.snapshots/** | 3 | N/A | AI context config |
| **.agent/** | 1 | N/A | Workflow templates |

---

## DETAILED COMPONENT BREAKDOWN

### 1. src/ Directory (420 PHP Files)

#### Controllers (169 files)

| Directory | Count | Purpose |
|-----------|-------|---------|
| Root level | 70 | User-facing pages |
| Admin/ | 35 | Tenant administration |
| Admin/Enterprise/ | 9 | GDPR, monitoring, secrets |
| Api/ | 44 | REST API endpoints |
| Api/Ai/ | 5 | AI chat & content |
| SuperAdmin/ | 6 | Multi-tenant platform admin |

**Root Controllers (70):** AchievementsController, AdminController, AiController, AuthController, BlogController, ComposeController, ConnectionController, ConsentController, ContactController, CookiePolicyController, CookiePreferencesController, CronController, DashboardController, DemoController, DigestController, EventController, FederatedEventController, FederatedGroupController, FederatedListingController, FederatedMemberController, FederatedMessageController, FederatedPartnerController, FederatedTransactionController, FederationAdminController, FederationDashboardController, FederationHelpController, FederationHubController, FederationOfflineController, FederationOnboardingController, FederationReviewController, FederationSettingsController, FederationStreamController, FeedController, GoalController, GovernanceController, GroupAnalyticsController, GroupController, GroupDiscussionController, HelpController, HomeController, InsightsController, LeaderboardController, LegalDocumentController, ListingController, MasterController, MatchController, MemberController, MessageController, NewsletterSubscriptionController, NewsletterTrackingController, NexusScoreController, NotificationController, OnboardingController, OrgWalletController, PageController, PollController, ProfileController, ReportController, ResourceController, ReviewController, RobotsController, SearchController, SettingsController, ShareTargetController, SitemapController, SocialAuthController, TotpController, UserPreferenceController, VolunteeringController, WalletController

#### Services (127 files - 19 categories)

| Category | Count | Key Services |
|----------|-------|--------------|
| Core Platform | 13 | UserService, GroupService, ListingService, EventService, MessageService, NotificationService, WalletService, ConnectionService, VolunteerService, ReviewService, PollService, GoalService, CommentService |
| Federation | 15 | FederationGateway, FederationUserService, FederationPartnershipService, FederationDirectoryService, FederatedGroupService, FederatedMessageService, FederatedTransactionService, FederationActivityService, FederationAuditService, FederationEmailService, FederationExternalApiClient, FederationExternalPartnerService, FederationJwtService, FederationFeatureService, FederationRealtimeService |
| Group Management | 11 | GroupAchievementService, GroupApprovalWorkflowService, GroupAssignmentService, GroupAuditService, GroupConfigurationService, GroupFeatureToggleService, GroupModerationService, GroupPermissionManager, GroupPolicyRepository, GroupReportingService, OptimizedGroupQueries |
| Gamification | 11 | GamificationService, AchievementAnalyticsService, AchievementCampaignService, AchievementUnlockablesService, BadgeCollectionService, DailyRewardService, StreakService, GamificationEmailService, GamificationRealtimeService, LeaderboardService, LeaderboardSeasonService |
| Notifications | 9 | NotificationDispatcher, PusherService, RealtimeService, WebPushService, FCMPushService, SocialNotificationService, OrgNotificationService, ProgressNotificationService, DigestService |
| Utilities | 9 | UploadService, RedisCache, GeocodingService, LayoutHelper, LayoutValidator, CSSSanitizer, SchemaService, AuditLogService, SuperAdminAuditService |
| Matching | 8 | MatchingService, SmartMatchingEngine, SmartMatchingAnalyticsService, MatchLearningService, SmartGroupMatchingService, GroupRecommendationEngine, SmartGroupRankingService, SmartSegmentSuggestionService |
| AI (subdirectory) | 7 | AIServiceFactory, AIProviderInterface, BaseProvider, OpenAIProvider, AnthropicProvider, GeminiProvider, OllamaProvider |
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

#### Models (59 files)

**Core:** User, Tenant, Listing, Event, Group, Message, Transaction, Connection
**Newsletter:** Newsletter, NewsletterAnalytics, NewsletterBounce, NewsletterSegment, NewsletterSubscriber, NewsletterTemplate
**Organization:** OrgMember, OrgTransaction, OrgTransferRequest, OrgWallet, VolOrganization
**Content:** FeedPost, Post, Page, Poll, Goal, ResourceItem, HelpArticle
**Gamification:** UserBadge, Gamification
**AI:** AiConversation, AiMessage, AiSettings, AiUsage, AiUserLimit
**Volunteering:** VolApplication, VolLog, VolOpportunity, VolReview, VolShift
**Other:** ActivityLog, Attribute, Category, Deliverable, DeliverableComment, DeliverableMilestone, Error404Log, EventRsvp, GroupDiscussion, GroupDiscussionSubscriber, GroupFeedback, GroupPost, GroupType, Menu, MenuItem, Notification, PayPlan, Report, Review, SeoMetadata, SeoRedirect

#### Core Classes (27 files)

AdminAuth, ApiAuth, ApiErrorCodes, AudioUploader, Auth, Csrf, Database, DatabaseWrapper, DefaultMenus, EmailTemplate, Env, HtmlSanitizer, ImageUploader, Mailer, MenuGenerator, MenuManager, RateLimiter, Router, SearchService, SEO, SimpleOAuth, SmartBlockRenderer, TenantContext, TotpEncryption, Validator, VaultClient, View

#### PageBuilder (18 files)

**Root:** BlockRegistry, PageRenderer
**Blocks:** core-blocks.php
**Renderers (15):** AccordionBlockRenderer, BlockRendererInterface, ButtonBlockRenderer, ColumnsBlockRenderer, CtaCardBlockRenderer, GroupsGridRenderer, HeroBlockRenderer, ImageBlockRenderer, ListingsGridRenderer, MembersGridRenderer, RichTextBlockRenderer, SpacerBlockRenderer, StatsBlockRenderer, TestimonialsBlockRenderer, VideoBlockRenderer

---

### 2. Views Directory (1,125 PHP Files)

| Section | Files | Details |
|---------|-------|---------|
| **Modern Theme** | 408 | Contemporary responsive UI |
| - admin/ | 124 | Admin panel (enterprise, federation, newsletters) |
| - components/ | 82 | 12 component categories |
| - feature modules | 202 | Feed, events, groups, etc. |
| **CivicOne Theme** | 232 | GOV.UK Design System |
| - components/govuk/ | 24 | Official GOV.UK components |
| - components/shared/ | 19 | Shared components |
| **Admin Panel** | 73 | Cross-theme admin |
| **Skeleton Theme** | 22 | Base component library |
| **Layouts** | 61 | Headers, footers, partials |
| **Partials** | 13 | Cross-theme shared |
| **Emails** | 4 | Email templates |
| **Tenant-Specific** | 26 | Custom per-tenant |
| **Archive** | 145 | Backup files |
| **Other** | 21 | Root files, components |

**Risk Analysis:** 478 files contain inline `<script>` tags, 382 contain inline `<style>` tags requiring refactoring.

---

### 3. Scripts Directory (219 Files) - CORRECTED

| Category | Count | Key Scripts |
|----------|-------|-------------|
| **Root-level scripts** | 154 | Main utility scripts |
| Cron Jobs | 7 | run_scheduled_tasks.php, gamification_cron.php, abuse_detection_cron.php, process_recurring_newsletters.php, send_group_digests.php, check_balance_alerts.php, run_newsletters.bat |
| Database Admin | 12 | backup_database.php, restore_database.php, safe_migrate.php, run_migration.php, check_database_schema.php, verify_schema.php, verify_tables.py, verify_persistence.py |
| Seeders | 9 | UserSeeder, GroupSeeder, PostSeeder, EventSeeder, ListingSeeder, TransactionSeeder, BadgeSeeder, NotificationSeeder, seed_permissions.php |
| Deployment | 6 | deploy.sh, deploy.bat, deploy.ps1, claude-deploy.sh, quick-deploy.ps1, validate-optimization.php |
| CSS Build & Optimization | 35 | build-css.js, minify-css.js, minify-js.js, build-core-css.js, bundle-modern-css.php, purgecss-single.js, run-purgecss.js |
| CSS Analysis | 8 | validate-design-tokens.js, analyze-hex-colors.js, analyze-rgba-patterns.js, analyze-undefined-vars.js, deep-css-audit.js, css-dependency-audit.js |
| CSS Fixing | 20+ | fix-css-syntax.js, fix-unclosed-blocks.js, fix-missing-braces.js, fix-unclosed-keyframes.js, fix-all-css-final.js, balance-css-braces.js |
| Migrations (scripts/migrations/) | 29 | SQL and PHP migration files |
| SQL Utilities | 17 | Raw SQL scripts in scripts/sql/ |
| Python Scripts | 17 | Analysis and verification utilities |
| PowerShell Scripts | 11 | Windows deployment and system scripts |
| **Subdirectories** | 7 | cron/, migrations/, seeders/, sql/, utilities/, pilot/, generated/ |

---

### 4. Database Schema (236 Tables) - CORRECTED FROM schema.sql

**Authoritative Sources:**
- `schema.sql` - Complete MariaDB dump with **236 CREATE TABLE statements**
- `schema.prisma` - Prisma ORM schema (68,670 tokens, complete)
- `/migrations/` - 83 incremental migration files (NOT complete schema)

**⚠️ CRITICAL:** Use `schema.sql` or `schema.prisma` for Entity Framework Core migration, NOT the 83 migration files which are incremental changes only.

**Complete Table List (236 tables):**

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
| **Federation** | federation_partners, federation_api_keys, federation_audit_logs, federation_shared_* (multiple) |
| **Admin** | admin_users, admin_actions, permissions, roles, role_permissions, user_roles |
| **Content** | pages, page_blocks, blog_posts, help_articles, help_categories, legal_documents |
| **Analytics** | activity_log, analytics_events, page_views, search_logs, 404_error_logs |
| **Compliance** | cookie_consents, gdpr_requests, gdpr_exports, audit_logs |
| **Config** | settings, feature_flags, menus, menu_items, categories, seo_metadata, seo_redirects |
| **Cron/Jobs** | cron_logs, scheduled_tasks, job_batches, failed_jobs |
| **Misc** | reports, abuse_alerts, deliverables, deliverable_comments, deliverable_milestones, attributes |

**Migration Files (83) - Incremental Changes Only:**

- Located in `/migrations/` directory
- Use for reference on schema evolution history
- Recent changes: 2FA, federation, hierarchical tenancy, AI integration

---

### 5. Test Suites - CORRECTED

#### PHPUnit Tests (64 files)

| Category | Count | Coverage |
|----------|-------|----------|
| Root Level | 11 | TestCase, DatabaseTestCase, ControllerTestCase, bootstrap, run-api-tests, etc. |
| Controllers/Api | 9 | Auth, Core, AI, Social, Wallet, Gamification, Push, WebAuthn, ApiTestCase |
| Controllers | 2 | MatchControllerTest, TotpControllerTest |
| Debug Utilities | 10 | test_tenant, test-menu-debug, verify-production-lockdown, etc. |
| Enterprise | 4 | ConfigService, GdprService, LoggerService, MetricsService |
| Models | 9 | User, Listing, Transaction, Group, Notification, Deliverable, OrgWallet, OrgMember, OrgTransferRequest |
| Services | 15 | Gamification, Wallet, Matching, TOTP, Geocoding, etc. |
| Services/Federation | 4 | FederatedTransaction, FederationAudit, FederationFeature, FederationGateway |

#### Playwright E2E Tests (40 files) - CORRECTED

| Category | Count | Files |
|----------|-------|-------|
| Test Specs | 21 | login, register, dashboard, feed, listings (2), events, groups, members, messages, wallet, compose, connections, reviews, notifications, gamification, federation, search, volunteering, pwa, admin |
| Page Objects | 11 | BasePage, AdminPage, DashboardPage, EventsPage, GroupsPage, ListingsPage, LoginPage, MembersPage, MessagesPage, WalletPage, index.ts |
| Config/Setup | 2 | global.setup.ts, global.teardown.ts |
| Helpers | 1 | test-utils.ts (350+ lines) |
| Auth Fixtures | 3 | admin.json, user-civicone.json, user-modern.json |
| Environment | 2 | .env.example, .env.test |

---

### 6. Frontend Assets - MAJOR CORRECTIONS

#### JavaScript (223 files) - Was 138

| Category | Count |
|----------|-------|
| CivicOne Theme | 56+ |
| Modern Theme | 14+ |
| Core NEXUS | 25+ |
| Federation | 11 |
| Admin | 3 |
| Mobile Navigation | 7+ |
| PWA/Service Worker | 5+ |
| Debug Utilities | 10+ |
| Minified versions | 90+ |

#### CSS (1,018 files) - Was 294

| Category | Count |
|----------|-------|
| Root level (source + minified) | 594 |
| bundles/ | 55 |
| purged/ (PurgeCSS output) | 341 |
| federation/ | 16 |
| admin/ | 2 |
| civicone/ | 2 |
| modern/ | 4 |
| _archive/ | 4 |

**Note:** The large CSS count includes both source (.css) and minified (.min.css) versions, plus PurgeCSS optimized output for production.

---

### 7. Configuration Files

| File | Purpose |
|------|---------|
| config/deployment-version.php | Cache busting (version, timestamp) |
| config/css-bundles.php | CSS code-splitting strategy |
| config/admin-navigation.php | Admin sidebar navigation |
| config/heroes.php | Page hero/banner configuration (50+ routes) |
| config/menu-manager.php | Experimental menu system (beta) |
| composer.json | PHP dependencies (17 packages) |
| package.json | Node.js dependencies and scripts |
| .env.example | Environment variable template (162 lines) |
| phpunit.xml | PHPUnit test configuration |
| playwright.config.ts | Playwright E2E configuration |

---

### 8. Docker Containerization (10 files)

| File | Purpose |
|------|---------|
| Dockerfile | Multi-stage build (PHP 8.1-FPM Alpine, OPcache JIT) |
| docker-compose.yml | Development environment (7 services) |
| docker-compose.prod.yml | Production (Traefik, Vault, 3x replicas) |
| nginx/nginx.conf | Global HTTP config (gzip, rate limiting) |
| nginx/default.conf | Server block (CSP, static caching) |
| php/php.ini | PHP settings (Redis sessions, 256M memory) |
| php/php-fpm.conf | FastCGI pool (dynamic, 50 children) |
| php/opcache.ini | JIT mode 1255, 100M buffer |
| scripts/entrypoint.sh | Container startup |
| scripts/supervisord.conf | Process supervision |

---

### 9. Capacitor Mobile App - DETAILED

**Total Source Files:** 78 (excluding node_modules, build artifacts)

| Component | Count | Details |
|-----------|-------|---------|
| Java Source | 3 | MainActivity.java + test files |
| Android XML | 37 | Resources, layouts, manifest |
| Gradle Config | 7 | Build configuration |
| TypeScript Config | 1 | capacitor.config.ts |
| Documentation | 3 | README, BUILD-INSTRUCTIONS, FIREBASE_SETUP |
| Build Scripts | 3 | build-apk.bat, build-now.bat, verify-apk.ps1 |
| Icon/Splash Images | 24 | Multiple densities for Android |

**Key Configuration:**

- App ID: `com.nexus.timebank`
- Min SDK: 22, Target SDK: 34
- Capacitor Version: 6.0.0
- Deep Linking: hour-timebank.ie + nexus:// scheme
- Firebase FCM: Configured (google-services.json present)
- Biometric Auth: Supported
- Audio Recording: Enabled for voice messages
- iOS: Not configured (needs `npx cap add ios`)

---

### 10. GitHub Actions CI/CD (3 workflows)

| Workflow | Purpose |
|----------|---------|
| ci.yml | 8-stage pipeline: quality, security, tests, build, deploy |
| security-scan.yml | Daily security scans (Trivy, Semgrep, TruffleHog) |
| e2e-tests.yml | Playwright E2E (6 browser/theme combos) |

---

### 11. PHP Dependencies (composer.json)

| Package | Version | .NET Equivalent |
|---------|---------|-----------------|
| guzzlehttp/guzzle | 7.10.0 | HttpClient |
| pusher/pusher-php-server | ^7.2 | Pusher NuGet |
| spomky-labs/otphp | ^11.4 | Otp.NET |
| endroid/qr-code | ^6.0 | QRCoder |
| minishlink/web-push | ^10.0 | WebPush NuGet |
| vlucas/phpdotenv | v5.6.2 | IConfiguration |
| phpunit/phpunit | 10.5.60 | xUnit |

---

### 12. External Services

| Service | Purpose | Required |
|---------|---------|----------|
| MySQL 8.0 | Database | Yes |
| Redis 7+ | Cache/Sessions | Yes |
| Pusher | Real-time messaging | Yes |
| Google Gemini | AI (default) | Optional |
| OpenAI | AI (alternative) | Optional |
| Anthropic | AI (alternative) | Optional |
| Ollama | AI (self-hosted) | Optional |
| Gmail API | Email (primary) | Yes |
| SMTP | Email (fallback) | Yes |
| Mailchimp | Newsletter sync | Optional |
| HashiCorp Vault | Secrets management | Optional |
| FCM | Mobile push | Yes (mobile) |
| VAPID/WebPush | Browser push | Yes (PWA) |
| Meilisearch | Full-text search | Yes |
| Datadog | APM/Metrics | Optional |

---

## ROUTE DEFINITIONS (1,183 Total)

| Category | Count |
|----------|-------|
| Super-Admin Panel | 59 |
| API v1 (Legacy) | 168 |
| API v2 (RESTful) | 280 |
| Federation API | 11 |
| Public/Authenticated Pages | 480+ |
| Admin Dashboard | 340+ |
| Cron/Webhooks | 13 |
| Dev Tools | 4 |

---

## FINAL MIGRATION TIMELINE

| Phase | Duration | Scope |
|-------|----------|-------|
| Phase 0 | 2 weeks | Foundation, project setup, Entity Framework |
| Phase 1-5 | 10 weeks | Core features (auth, users, listings, wallet, messages, feed) |
| Phase 6-9 | 8 weeks | Secondary features (groups, events, gamification, matching) |
| Phase 10 | 6 weeks | Admin panel, enterprise features |
| Newsletter System | 1 week | Queue, segments, analytics |
| Org Wallets | 1 week | Organization credit management |
| Enterprise | 2 weeks | GDPR, config, metrics |
| Admin Controllers | 2 weeks | 44 admin controllers |
| PageBuilder | 1 week | 18 block types |
| Views/Razor | 4 weeks | 1,125 view files |
| Mobile App | 1 week | Capacitor/.NET MAUI bridge |
| Docker/CI | 1 week | Container migration |
| PHPUnit Tests | 2 weeks | xUnit conversion (44 files) |
| E2E Tests | 1 week | Playwright migration (35 files) |
| Buffer/Testing | 2 weeks | Integration testing |
| **TOTAL** | **45 weeks** | **~11.25 months** |

---

## DOCUMENTATION FILES NEEDED

1. NEWSLETTER_SYSTEM.md - Queue, segments, A/B testing
2. ORG_WALLET_SYSTEM.md - Organization wallets, approvals
3. GAMIFICATION_ADVANCED.md - Seasons, challenges, XP shop
4. ADMIN_CONTROLLERS_COMPLETE.md - All 44 admin controllers
5. MIDDLEWARE_ADVANCED.md - SuperPanel, UrlFuzzy, Federation
6. BACKGROUND_JOBS_DETAILED.md - 140 scripts documentation
7. PAGEBUILDER_SYSTEM.md - Block builder architecture
8. VIEWS_MIGRATION_GUIDE.md - 1,125 view files mapping
9. SCRIPTS_CLI_TOOLS.md - Scripts documentation
10. DOCKER_DEPLOYMENT.md - Container architecture
11. CICD_PIPELINES.md - GitHub Actions workflows
12. MOBILE_APP_ARCHITECTURE.md - Capacitor setup
13. TEST_SUITE_CONVERSION.md - PHPUnit to xUnit mapping
14. E2E_TEST_MIGRATION.md - Playwright test specs
15. COMPOSER_DEPENDENCIES.md - PHP to .NET package mapping

---

---

## NEW DISCOVERIES - EIGHTH AUDIT

### 13. Root Directory Files (51 files)

| Category | Count | Key Files |
|----------|-------|-----------|
| Core Application | 8 | bootstrap.php, composer.json, package.json, phpunit.xml, purgecss.config.js |
| Environment | 3 | .env, .env.example, .env.testing |
| Linting Config | 2 | .eslintrc.json, .stylelintrc.json |
| Database Schema | 4 | schema.sql, schema.prisma, schema_production.sql, database.sqlite |
| Documentation | 17 | CLAUDE.md, README-*.md, various proposal docs |
| PDF Documents | 6 | Project proposals and documentation |
| Playwright Config | 1 | playwright.config.ts |

### 14. app/ Directory (1 file)

- `app/Helpers/HeroResolver.php` - CivicOne hero configuration resolver (169 lines)

### 15. docs/ Directory (129 files)

| Subdirectory | Count | Purpose |
|--------------|-------|---------|
| Root docs | 69 | CSS audits, compliance, CivicOne guides |
| aspnet-migration/ | 37 | ASP.NET Core migration documentation + scaffold |
| council-pilot/ | 7 | Local council pilot program docs |
| govuk-components-extracted/ | 6 | GOV.UK component extractions |
| govuk-extracted/ | 9 | GOV.UK reference files |
| audits/ | 1 | Audit documentation |

### 16. httpdocs/ Directory Summary

| Category | Count |
|----------|-------|
| PHP Entry Points | 3 |
| JavaScript Files | 223 |
| CSS Files | 1,018 |
| Image Assets | 40 |
| Font Files | 2 |
| PWA Assets | 26 |
| User Uploads | 791 |

---

---

## NINTH AUDIT - MAJOR NEW DISCOVERIES

### 17. govuk-frontend-ref/ Directory (876 files) - CRITICAL FOR CIVICONE

**This is a complete clone of the official GOV.UK Frontend GitHub repository.**

| File Type | Count | Purpose |
|-----------|-------|---------|
| JavaScript (.mjs) | 196 | ES6 component modules |
| Nunjucks (.njk) | 162 | HTML templates (convert to Razor) |
| SCSS (.scss) | 147 | Design system styles |
| JavaScript (.js) | 109 | Tests and utilities |
| Markdown (.md) | 73 | Documentation |
| YAML (.yaml) | 48 | Component specifications |
| Other | 141 | Config, images, fonts |

**38 GOV.UK Components included:** accordion, back-link, breadcrumbs, button, character-count, checkboxes, cookie-banner, date-input, details, error-message, error-summary, exit-this-page, fieldset, file-upload, footer, header, hint, input, inset-text, label, notification-banner, pagination, panel, password-input, phase-banner, radios, select, service-navigation, skip-link, summary-list, table, tabs, tag, task-list, textarea, warning-text

**Migration Impact:** The 162 Nunjucks templates must be converted to Razor components. The 48 YAML specs define component APIs for C# classes.

### 18. Hidden Directories (Development Tools)

| Directory | Files | Purpose |
|-----------|-------|---------|
| .claude/ | 4 | Claude Code permissions, deployment guide, hooks |
| .githooks/ | 3 | Pre-commit validation (CSS/JS rules from CLAUDE.md) |
| .vscode/ | 2 | VS Code IDE settings |
| .snapshots/ | 3 | AI context snapshot configuration |
| .agent/ | 1 | Reusable workflow templates |

### 19. Runtime Data Directories (DO NOT MIGRATE)

| Directory | Files | Size | Notes |
|-----------|-------|------|-------|
| backups/ | 323 | 182 MB | Historical documentation backups |
| uploads/ (root) | 509 | 175 MB | **DUPLICATE** - consolidate with httpdocs/uploads/ |
| exports/ | 4 | 2.5 MB | One-off SQL exports |
| storage/ | 3 | 16 KB | Application logs |
| cache/ | 5 | 18 KB | Redis fallback cache |

**CRITICAL ISSUE:** Two separate upload directories exist (uploads/ and httpdocs/uploads/) with different file counts. Must consolidate before migration.

---

## CONCLUSION - NINTH AUDIT

This ninth comprehensive audit identified **entire directories missed** in previous audits:

| Component | Previous | Actual | Difference |
|-----------|----------|--------|------------|
| govuk-frontend-ref/ | 0 | **876** | **MISSED ENTIRELY** |
| E2E directory | 40 | **115** | +75 (test artifacts) |
| Scripts | 140 | **219** | +79 (+56%) |
| CSS Files | 294 | **1,012** | +718 (+244%) |
| JavaScript | 138 | **223** | +85 (+62%) |
| PHPUnit Tests | 44 | **64** | +20 (+45%) |
| Hidden dirs | 0 | **13** | .claude, .githooks, etc. |
| Runtime dirs | 0 | **844** | backups, uploads, cache |

| Component | Previous | Actual | Difference |
|-----------|----------|--------|------------|
| Scripts | 140 | **219** | +79 (+56%) |
| CSS Files | 294 | **1,018** | +724 (+246%) |
| JavaScript | 138 | **223** | +85 (+62%) |
| PHPUnit Tests | 44 | **64** | +20 (+45%) |
| E2E Tests | 35 | **40** | +5 (+14%) |

**Verified Accurate:**

- **1,767+ PHP files** (excluding vendor/node_modules)
- **420 src/ files** (fully categorized)
- **127 services** (organized in 19 categories)
- **169 controllers** (across 6 directories)
- **59 models** (verified)
- **1,183 routes** (confirmed)
- **1,125 view files** (with inline code risk analysis)
- **236 database tables** (from schema.sql - authoritative source)
- **10 Docker files** (containerization)
- **3 CI/CD workflows** (GitHub Actions)
- **78 Capacitor source files** (mobile app)
- **129 documentation files** (docs/ directory)
- **51 root-level files** (configuration and docs)

**Migration timeline: 45 weeks (~11.25 months)**

All components have been inventoried for complete ASP.NET Core migration. The significant increase in frontend asset counts (CSS +724, JS +85) reflects the complete build pipeline including source files, minified versions, and PurgeCSS optimized output.
