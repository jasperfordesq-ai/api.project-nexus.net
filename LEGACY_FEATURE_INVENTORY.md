# Legacy Feature Inventory - Project NEXUS (PHP)

**Source of Truth**: Legacy PHP application (`staging/` directory)
**Purpose**: Document what features the legacy PHP app implements TODAY
**Last Updated**: 2026-03-06

---

## Executive Summary

Project NEXUS is a mature, multi-tenant timebanking and community platform built in PHP with a React 18 + HeroUI + Tailwind CSS 4 frontend. The platform supports:
- **60 data models**
- **111 API controllers + 37 admin controllers = 148 total controllers**
- **206 PHP services**
- **1,715+ API endpoints** (across 14 route files)
- **163 React pages + 226 React admin modules = 389 total frontend components**
- **165 database migrations**
- **7 languages** (en, de, fr, it, pt, es, ga)
- **30+ feature domains**

---

## Platform Statistics (Verified 2026-03-06)

| Metric | Count |
|--------|-------|
| API Routes | 1,715 |
| Route Definition Files | 14 |
| PHP API Controllers | 111 |
| PHP Admin Controllers (Legacy) | 37 |
| PHP Services | 206 |
| PHP Data Models | 60 |
| React Pages (User-Facing) | 163 |
| React Admin Modules | 226 |
| Database Migrations (SQL) | 165 |
| Languages (i18n) | 7 |

### Route Breakdown by File

| Route File | Endpoints | Purpose |
|------------|-----------|---------|
| `misc-api.php` | 833 | Core business logic (listings, messages, exchanges, groups, feed, search, matching, federation) |
| `admin-api.php` | 446 | Admin panel APIs (dashboard, users, config, cache, jobs, CRM, newsletters) |
| `content.php` | 131 | Blog, pages, resources, help center, ideation |
| `users.php` | 64 | Auth, profiles, verification, 2FA, connections |
| `social.php` | 53 | Feed, comments, endorsements, gamification, polls |
| `super-admin.php` | 48 | Tenant management, federation, audit logs |
| `legacy-api.php` | 42 | V1 API compatibility layer |
| `groups.php` | 32 | Group creation, members, policies, approvals |
| `listings.php` | 15 | Listing CRUD, moderation, search |
| `messages.php` | 15 | Direct messaging, reactions, attachments |
| `events.php` | 11 | Event creation, RSVPs, reminders |
| `exchanges.php` | 11 | Exchange management, transaction workflow |
| `federation-api-v1.php` | 10 | Federation directory, messaging, transactions |
| `tenant-bootstrap.php` | 4 | Tenant initialization |

---

## Feature Inventory Format

Each feature includes:
- **Description**: What the feature does (not how)
- **User Type**: member | tenant admin | platform admin | public
- **Criticality**: Must-have | Should-have | Nice-to-have
- **Data Sensitivity**: Low | Med | High
- **Services**: PHP services that implement this feature

---

## 1. ACCOUNTS & AUTHENTICATION

| Feature | Description | User Type | Criticality | Data Sensitivity |
|---------|-------------|-----------|-------------|------------------|
| User Registration | Create account with email/password | public | Must-have | High |
| Login (Session) | Session-based login for web clients | member | Must-have | High |
| Login (Token/JWT) | Bearer token login for mobile/SPA clients | member | Must-have | High |
| Two-Factor Auth (TOTP) | Time-based one-time passwords with backup codes | member | Should-have | High |
| WebAuthn/Biometric | Passwordless login via fingerprint/face/security keys | member | Should-have | High |
| Password Reset | Self-service password reset via email token | public | Must-have | High |
| Email Verification | Confirm email address after registration | public | Should-have | Med |
| Social OAuth Login | Login via Facebook, Google, etc. | public | Nice-to-have | High |
| Token Revocation | Logout from all devices | member | Should-have | Med |
| Session Heartbeat | Keep session alive, detect idle | member | Should-have | Low |

**Services:** TokenService, TotpService, TwoFactorChallengeManager, WebAuthnChallengeStore, SocialAuthService

---

## 2. USER PROFILES & SETTINGS

| Feature | Description | User Type | Criticality | Data Sensitivity |
|---------|-------------|-----------|-------------|------------------|
| View Profile | View user profile (name, bio, avatar, stats) | member | Must-have | Med |
| Edit Profile | Update own profile information | member | Must-have | High |
| Avatar Upload | Upload and manage profile image | member | Should-have | Med |
| User Preferences | Store notification, layout, theme preferences | member | Should-have | Low |
| Password Change | Change password while authenticated | member | Must-have | High |
| Account Deletion | Delete account (GDPR compliance) | member | Should-have | High |
| User Status | Suspend/activate user accounts | tenant admin | Should-have | Med |
| Sub-Accounts | Manage sub-accounts (family/org members) | member | Nice-to-have | Med |
| Member Availability | Set availability schedule | member | Nice-to-have | Low |
| Verification Badges | Earn verification badges through vetting | member | Should-have | Med |
| User Insights | Personal analytics dashboard | member | Nice-to-have | Med |

**Services:** UserService, UserInsightsService, SubAccountService, MemberAvailabilityService, MemberVerificationBadgeService, UploadService

---

## 3. LISTINGS (Time Exchange)

| Feature | Description | User Type | Criticality | Data Sensitivity |
|---------|-------------|-----------|-------------|------------------|
| Create Listing | Create offer or request for time exchange | member | Must-have | Med |
| View Listings | Browse listings with filters, search, pagination | member | Must-have | Low |
| View Listing Detail | View full listing with creator info | member | Must-have | Low |
| Edit Listing | Edit own listing | member | Should-have | Med |
| Delete Listing | Delete own listing | member | Should-have | Med |
| Listing Images | Upload images to listings | member | Should-have | Low |
| Listing Categories | Categorize listings by type | system | Should-have | Low |
| Listing Attributes | Add flexible tags/attributes | member | Nice-to-have | Low |
| Nearby Listings (geo) | Find listings by geo-proximity | member | Should-have | Med |
| Admin Moderation | Review, approve, reject listings | tenant admin | Should-have | Med |
| Listing Ranking | MatchRank algorithm (Bayesian avg, Wilson quality, CF) | system | Should-have | Low |
| Listing Analytics | View count, response rate, engagement metrics | member | Nice-to-have | Low |
| Listing Expiry | Auto-expire stale listings with reminders | system | Should-have | Low |
| Featured Listings | Promote listings in search results | tenant admin | Nice-to-have | Low |
| Risk Tags | Flag risky listings for review | system | Should-have | Med |
| Skill Tags | Tag listings with skills taxonomy | member | Nice-to-have | Low |
| Saved Searches | Save search queries for later | member | Nice-to-have | Low |

**Services:** ListingService, ListingAnalyticsService, ListingExpiryService, ListingExpiryReminderService, ListingFeaturedService, ListingModerationService, ListingRankingService, ListingRiskTagService, ListingSkillTagService, SavedSearchService

---

## 4. MESSAGING & COMMUNICATION

| Feature | Description | User Type | Criticality | Data Sensitivity |
|---------|-------------|-----------|-------------|------------------|
| Direct Messages | Send/receive private messages between members | member | Must-have | High |
| Typing Indicator | Show when user is typing | member | Nice-to-have | Low |
| Voice Messages | Record and send voice messages | member | Should-have | Med |
| Message Archive | Archive/soft delete messages | member | Nice-to-have | Med |
| Unread Count | Track unread message badge count | member | Should-have | Low |
| Group Discussions | Threaded discussions within groups | member | Should-have | Med |
| Message Reactions | React to messages with emojis | member | Nice-to-have | Low |
| Message Attachments | Attach files to messages | member | Should-have | Med |
| Broker Visibility | Coordinator message visibility controls | tenant admin | Should-have | Med |
| Contextual Messages | Auto-generate context for messages (listing, exchange) | system | Nice-to-have | Low |
| Federated Messages | Message users from other timebanks | member | Should-have | High |

**Services:** MessageService, BrokerMessageVisibilityService, FederatedMessageService, ContextualMessageService, VoiceMessageController

---

## 5. WALLET & TIME CREDITS

| Feature | Description | User Type | Criticality | Data Sensitivity |
|---------|-------------|-----------|-------------|------------------|
| View Balance | View current time credit balance | member | Must-have | High |
| Transaction History | View all transactions with filters | member | Must-have | High |
| Transfer Credits | Send time credits to another user | member | Must-have | High |
| Transaction Details | View detailed transaction info | member | Should-have | High |
| Pending Count | Badge showing pending transactions | member | Nice-to-have | Low |
| Org Wallet | Time credits for organizational accounts | tenant admin | Should-have | High |
| Transaction Limits | Configurable daily/weekly/monthly limits | tenant admin | Should-have | Med |
| Transaction Categories | Categorize transactions | member | Nice-to-have | Low |
| Transaction Export | Export transaction history (CSV/PDF) | member | Should-have | Med |
| Credit Donations | Donate credits to community fund | member | Nice-to-have | Low |
| Balance Alerts | Notify on low balance or large transactions | member | Should-have | Low |
| Starting Balance | Configurable starting balance for new members | tenant admin | Should-have | Med |
| Pay Plans | Subscription/payment plans for premium features | tenant admin | Nice-to-have | High |
| Community Fund | Pooled credits for community projects | tenant admin | Nice-to-have | Med |

**Services:** WalletService, TransactionLimitService, TransactionCategoryService, TransactionExportService, OrgWalletService, CreditDonationService, BalanceAlertService, StartingBalanceService, PayPlanService, CommunityFundService

---

## 6. EXCHANGE WORKFLOW

| Feature | Description | User Type | Criticality | Data Sensitivity |
|---------|-------------|-----------|-------------|------------------|
| Create Exchange | Initiate a time exchange from a listing | member | Must-have | Med |
| Exchange Status | Track exchange through workflow stages | member | Must-have | Med |
| Exchange Rating | Rate exchange experience | member | Should-have | Med |
| Group Exchanges | Multi-party exchanges within groups | member | Should-have | Med |

**Services:** ExchangeWorkflowService, ExchangeRatingService, GroupExchangeService

---

## 7. SOCIAL FEED

| Feature | Description | User Type | Criticality | Data Sensitivity |
|---------|-------------|-----------|-------------|------------------|
| Create Post | Post status updates, photos to feed | member | Should-have | Med |
| Like/React | Like and emoji-react to posts | member | Should-have | Low |
| Comments | Comment on posts, reply to comments | member | Should-have | Med |
| Feed Timeline | View paginated social feed with EdgeRank algorithm | member | Should-have | Low |
| Delete Post/Comment | Delete own posts and comments | member | Should-have | Med |
| Edit Comment | Edit own comments | member | Nice-to-have | Med |
| Mention Tagging | @mention users in posts/comments | member | Nice-to-have | Low |
| Share Posts | Share posts with others | member | Nice-to-have | Low |
| Hashtags | Tag posts with hashtags, browse by tag | member | Nice-to-have | Low |
| Feed Ranking | EdgeRank: time decay, affinity, type weights | system | Should-have | Low |
| Feed Moderation | Admin review of flagged feed content | tenant admin | Should-have | Med |

**Services:** FeedService, FeedActivityService, FeedRankingService, HashtagService, PostSharingService, CommentService

---

## 8. GROUPS & COMMUNITIES

| Feature | Description | User Type | Criticality | Data Sensitivity |
|---------|-------------|-----------|-------------|------------------|
| Create Group | Create a community group | member | Should-have | Med |
| View Groups | List and search available groups | member | Should-have | Low |
| Group Details | View group info, members, posts | member | Should-have | Low |
| Join Group | Join public or request to join private group | member | Should-have | Med |
| Leave Group | Leave a group | member | Should-have | Med |
| Manage Members | Add, remove, change roles of members | group admin | Should-have | Med |
| Pending Requests | Approve/reject join requests | group admin | Should-have | Low |
| Group Image | Upload group cover/avatar | group admin | Should-have | Low |
| Edit/Delete Group | Edit settings or delete group | group admin | Should-have | High |
| Group Types | Categorize groups by type | system | Nice-to-have | Low |
| Group Analytics | View group stats and activity | tenant admin | Nice-to-have | Low |
| Group Feedback | Collect member feedback | group admin | Nice-to-have | Med |
| Group Exchanges | Multi-party exchanges within groups | member | Should-have | Med |
| Group Discussions | Threaded discussions within groups | member | Should-have | Med |
| Group Files | Shared file storage for group members | member | Nice-to-have | Med |
| Group Policies | Configurable group rules and policies | group admin | Nice-to-have | Low |
| Group Recommendations | AI-powered group suggestions | system | Nice-to-have | Low |
| Group Ranking | Smart group ranking algorithm | system | Nice-to-have | Low |
| Group Announcements | Admin announcements to group members | group admin | Should-have | Low |
| Group Chatroom | Real-time group chat | member | Nice-to-have | Med |
| Group Approval Workflow | Multi-step approval for group actions | group admin | Should-have | Med |

**Services:** GroupService, GroupAnnouncementService, GroupApprovalWorkflowService, GroupAssignmentService, GroupAuditService, GroupChatroomService, GroupConfigurationService, GroupEventService, GroupExchangeService, GroupFeatureToggleService, GroupFileService, GroupModerationService, GroupNotificationService, GroupPermissionManager, GroupPolicyRepository, GroupRecommendationEngine, GroupReportingService, OptimizedGroupQueries, SmartGroupMatchingService, SmartGroupRankingService, GroupAchievementService

---

## 9. EVENTS & CALENDAR

| Feature | Description | User Type | Criticality | Data Sensitivity |
|---------|-------------|-----------|-------------|------------------|
| Create Event | Create event with date, time, location | member | Should-have | Med |
| View Events | List and filter events | member | Should-have | Low |
| Event Details | View event info, attendees, description | member | Should-have | Low |
| RSVP | Confirm event attendance | member | Should-have | Low |
| Cancel RSVP | Withdraw attendance confirmation | member | Should-have | Low |
| Attendees List | View confirmed attendees | member | Should-have | Low |
| Edit Event | Edit event details | event organizer | Should-have | Med |
| Delete Event | Cancel/delete event | event organizer | Should-have | Med |
| Event Image | Upload event cover image | event organizer | Should-have | Low |
| Event Reminders | Automated reminders before events | system | Should-have | Low |
| Recurring Shifts | Recurring event shift scheduling | event organizer | Nice-to-have | Med |
| Federated Events | View events from federated timebanks | member | Nice-to-have | Med |

**Services:** EventService, EventReminderService, EventNotificationService, RecurringShiftService

---

## 10. VOLUNTEERING MODULE

| Feature | Description | User Type | Criticality | Data Sensitivity |
|---------|-------------|-----------|-------------|------------------|
| Create Opportunity | Create volunteer opportunity with shifts | organization | Should-have | Med |
| Browse Opportunities | List and filter volunteering opportunities | member | Should-have | Low |
| Opportunity Details | View opportunity info, requirements, shifts | member | Should-have | Med |
| Apply | Submit volunteer application | member | Should-have | Med |
| Manage Applications | Accept/reject volunteer applications | organization | Should-have | Med |
| Shifts Management | Create, view, sign up for shifts | member | Should-have | Med |
| Shift Swaps | Request and approve shift swaps | member | Nice-to-have | Low |
| Shift Waitlist | Join waitlist for full shifts | member | Nice-to-have | Low |
| Log Hours | Record volunteer hours worked | member | Must-have | High |
| Verify Hours | Approve volunteer hours | organization | Should-have | High |
| Hours Summary | View total volunteer hours and stats | member | Should-have | Med |
| Browse Organizations | Find registered volunteer organizations | member | Should-have | Low |
| Volunteer Reviews | Rate volunteering experiences | member | Should-have | Med |
| Volunteer Certificates | Generate PDF certificates for hours | member | Nice-to-have | Med |
| Volunteer Check-In | Check in/out at volunteer sites | member | Nice-to-have | Low |
| Volunteer Matching | Match volunteers to opportunities | system | Nice-to-have | Low |
| Volunteer Wellbeing | Track volunteer wellbeing indicators | organization | Nice-to-have | Med |
| Emergency Alerts | Urgent volunteer request notifications | organization | Should-have | Med |
| Predictive Staffing | AI-powered staffing predictions | organization | Nice-to-have | Low |
| Insurance Certificates | Upload and verify insurance documents | organization | Should-have | High |

**Services:** VolunteerService, VolunteerMatchingService, VolunteerCertificateService, VolunteerCheckInService, VolunteerEmergencyAlertService, VolunteerWellbeingService, ShiftGroupReservationService, ShiftSwapService, ShiftWaitlistService, InsuranceCertificateService, PredictiveStaffingService

---

## 11. JOBS MODULE

| Feature | Description | User Type | Criticality | Data Sensitivity |
|---------|-------------|-----------|-------------|------------------|
| Create Job Vacancy | Post job listings | tenant admin | Should-have | Med |
| Browse Jobs | Search and filter job vacancies | member | Should-have | Low |
| Job Alerts | Subscribe to job category alerts | member | Nice-to-have | Low |
| Job Applications | Apply to job vacancies | member | Should-have | Med |
| Predictive Staffing | AI-powered staffing demand prediction | tenant admin | Nice-to-have | Low |

**Services:** JobVacancyService, PredictiveStaffingService

---

## 12. REVIEWS & TRUST

| Feature | Description | User Type | Criticality | Data Sensitivity |
|---------|-------------|-----------|-------------|------------------|
| Create Review | Leave review/rating after transaction | member | Should-have | Med |
| Pending Reviews | View transactions awaiting review | member | Should-have | Low |
| User Reviews | View all reviews for a user | member | Should-have | Med |
| Review Stats | View aggregated rating stats | member | Should-have | Low |
| Trust Score | Calculate user trust score from reviews with time-decay | system | Should-have | Low |
| Delete Review | Delete own review (with conditions) | member | Nice-to-have | Med |
| Exchange Rating | Rate exchange experience specifically | member | Should-have | Med |
| Endorsements | Endorse other members' skills | member | Nice-to-have | Low |

**Services:** ReviewService, ExchangeRatingService, EndorsementService

---

## 13. NOTIFICATIONS

| Feature | Description | User Type | Criticality | Data Sensitivity |
|---------|-------------|-----------|-------------|------------------|
| In-App Notifications | Display in-app notification list | member | Must-have | Low |
| Badge Count | Display unread notification count | member | Should-have | Low |
| Mark as Read | Mark individual notification as read | member | Should-have | Low |
| Mark All Read | Mark all notifications as read | member | Should-have | Low |
| Delete Notification | Delete individual notification | member | Nice-to-have | Low |
| Clear All | Delete all notifications | member | Nice-to-have | Low |
| Web Push (PWA) | Browser push notifications via VAPID | member | Should-have | Low |
| Mobile Push (FCM) | Native mobile push notifications | member | Should-have | Low |
| Notification Polling | Lightweight badge update endpoint | member | Should-have | Low |
| Real-time (Pusher) | WebSocket-based instant notifications | member | Should-have | Low |
| Social Notifications | Notifications for likes, comments, mentions | member | Should-have | Low |
| Org Notifications | Organization-level notifications | organization | Nice-to-have | Low |
| Progress Notifications | Goal/challenge progress updates | member | Nice-to-have | Low |

**Services:** NotificationService, SocialNotificationService, OrgNotificationService, ProgressNotificationService, FCMPushService, WebPushService, PusherService, RealtimeService, NotificationDispatcher

---

## 14. CONNECTIONS & FRIENDSHIPS

| Feature | Description | User Type | Criticality | Data Sensitivity |
|---------|-------------|-----------|-------------|------------------|
| Send Request | Send friend/connection request | member | Should-have | Low |
| Accept Request | Accept pending connection request | member | Should-have | Low |
| View Connections | View list of accepted connections | member | Should-have | Low |
| Check Status | Check if two users are connected | member | Nice-to-have | Low |
| Pending Counts | View count of pending requests | member | Should-have | Low |
| Remove Connection | Unfriend/disconnect | member | Should-have | Low |
| Endorsements | Skill endorsements between connected users | member | Nice-to-have | Low |

**Services:** ConnectionService, EndorsementService

---

## 15. POLLS & SURVEYS

| Feature | Description | User Type | Criticality | Data Sensitivity |
|---------|-------------|-----------|-------------|------------------|
| Create Poll | Create multiple choice poll | member | Nice-to-have | Low |
| View Polls | List available polls | member | Nice-to-have | Low |
| Poll Details | View poll with options and vote counts | member | Nice-to-have | Low |
| Vote | Cast vote on poll option | member | Nice-to-have | Low |
| Edit Poll | Edit poll options and settings | poll creator | Nice-to-have | Low |
| Delete Poll | Delete poll | poll creator | Nice-to-have | Low |
| Poll Export | Export poll results (CSV) | tenant admin | Nice-to-have | Low |
| Poll Ranking | Rank polls by engagement | system | Nice-to-have | Low |

**Services:** PollService, PollExportService, PollRankingService

---

## 16. GOALS & SELF-IMPROVEMENT

| Feature | Description | User Type | Criticality | Data Sensitivity |
|---------|-------------|-----------|-------------|------------------|
| Create Goal | Create personal or community goal | member | Nice-to-have | Med |
| View Goals | Browse personal and community goals | member | Nice-to-have | Low |
| Goal Discovery | Discover popular/recommended goals | member | Nice-to-have | Low |
| Goal Details | View goal with progress, participants | member | Nice-to-have | Low |
| Update Progress | Log progress toward goal completion | member | Nice-to-have | Med |
| Goal Buddy | Find accountability partner | member | Nice-to-have | Med |
| Edit/Delete Goal | Modify or remove goal | member | Nice-to-have | Med |
| Goal Check-ins | Regular check-in prompts | member | Nice-to-have | Low |
| Goal Templates | Pre-built goal templates | system | Nice-to-have | Low |
| Goal Reminders | Automated progress reminders | system | Nice-to-have | Low |

**Services:** GoalService, GoalCheckinService, GoalProgressService, GoalReminderService, GoalTemplateService

---

## 17. GAMIFICATION & REWARDS

| Feature | Description | User Type | Criticality | Data Sensitivity |
|---------|-------------|-----------|-------------|------------------|
| XP/Points System | Earn experience points for activities | member | Nice-to-have | Low |
| Badges | Unlock badges for achievements | member | Nice-to-have | Low |
| Leaderboards | View rankings by XP (weekly/monthly/all-time) | member | Nice-to-have | Low |
| Gamification Profile | View personal stats (level, XP, badges) | member | Nice-to-have | Low |
| Challenges | Time-limited challenges for XP/badges | member | Nice-to-have | Low |
| Challenge Templates | Pre-built challenge templates | system | Nice-to-have | Low |
| Challenge Categories | Categorize challenges by type | system | Nice-to-have | Low |
| Collections | Collect related badges/items | member | Nice-to-have | Low |
| Daily Reward | Daily login bonus | member | Nice-to-have | Low |
| Reward Shop | Purchase items with XP | member | Nice-to-have | Med |
| Badge Showcase | Display favorite badges on profile | member | Nice-to-have | Low |
| Seasonal Events | Seasonal challenges and leaderboards | member | Nice-to-have | Low |
| Streaks | Track consecutive daily activity | member | Nice-to-have | Low |
| Achievement Campaigns | Multi-badge campaigns with milestones | tenant admin | Nice-to-have | Low |
| Achievement Unlockables | Cosmetic rewards from achievements | member | Nice-to-have | Low |
| Achievement Analytics | Track achievement engagement metrics | tenant admin | Nice-to-have | Low |
| Nexus Score | Quantified community contribution score | member | Nice-to-have | Low |
| Social Gamification | XP for social interactions | system | Nice-to-have | Low |

**Services:** GamificationService, GamificationEmailService, GamificationRealtimeService, AchievementAnalyticsService, AchievementCampaignService, AchievementUnlockablesService, BadgeCollectionService, ChallengeService, ChallengeCategoryService, ChallengeOutcomeService, ChallengeTagService, ChallengeTemplateService, StreakService, DailyRewardService, LeaderboardService, LeaderboardSeasonService, NexusScoreService, NexusScoreCacheService, SocialGamificationService, XPShopService

---

## 18. SEARCH & DISCOVERY

| Feature | Description | User Type | Criticality | Data Sensitivity |
|---------|-------------|-----------|-------------|------------------|
| Unified Search | Search across listings, users, groups, events via Meilisearch | member | Should-have | Low |
| Autocomplete | Search suggestions while typing | member | Should-have | Low |
| Search Filters | Filter by type, date, category, etc. | member | Should-have | Low |
| Member Directory | Find members by name, skills, location | member | Should-have | Low |
| Personalized Search | Search results weighted by user preferences | member | Nice-to-have | Low |
| Saved Searches | Save and re-run search queries | member | Nice-to-have | Low |
| Search Analytics | Track search queries and click-through | system | Nice-to-have | Low |
| Typo Tolerance | Fuzzy matching for misspelled queries | system | Should-have | Low |
| Synonyms | 14 synonym groups for common terms | system | Should-have | Low |
| Skill Browsing | Browse listings by skill taxonomy | member | Nice-to-have | Low |

**Services:** SearchService, PersonalizedSearchService, SearchAnalyzerService, SearchLogService, UnifiedSearchService, SavedSearchService, SkillTaxonomyService

---

## 19. SMART MATCHING & ALGORITHMS

| Feature | Description | User Type | Criticality | Data Sensitivity |
|---------|-------------|-----------|-------------|------------------|
| Smart Matching | Embedding-based + collaborative filtering matching | system | Nice-to-have | Low |
| Cross-Module Matching | Match across listings, jobs, volunteering, groups | system | Nice-to-have | Low |
| Match Learning | Learn from user interactions (views, contacts, completions) | system | Nice-to-have | Low |
| Match Approval Workflow | Manual approval for sensitive matches | tenant admin | Nice-to-have | Med |
| Match Notifications | Digest notifications for new matches | member | Nice-to-have | Low |
| Match Debug Panel | Admin diagnostic tool for match scoring | tenant admin | Nice-to-have | Low |
| Matching Analytics | Track match quality and conversion rates | tenant admin | Nice-to-have | Low |
| Collaborative Filtering | Item-based CF with KNN cache | system | Nice-to-have | Low |
| Embeddings | OpenAI text-embedding-3-small for semantic similarity | system | Nice-to-have | Low |
| Feed Ranking (EdgeRank) | Time decay, affinity, type weights, cold-start boost | system | Should-have | Low |
| Listing Ranking (MatchRank) | Bayesian avg, Wilson quality, CF +15% | system | Should-have | Low |
| Member Ranking (CommunityRank) | Wilson Score 95% CI, CF +15%, time-decay reviews | system | Should-have | Low |
| Group Recommendation | CF + temporal trend + tenant-scoped suggestions | system | Nice-to-have | Low |
| Smart Segments | AI-suggested newsletter segments | system | Nice-to-have | Low |

**Services:** SmartMatchingEngine, MatchingService, MatchApprovalWorkflowService, MatchLearningService, MatchNotificationService, MatchDigestService, SmartMatchingAnalyticsService, CrossModuleMatchingService, CollaborativeFilteringService, EmbeddingService, FeedRankingService, ListingRankingService, MemberRankingService, RankingService, GroupRecommendationEngine, SmartGroupMatchingService, SmartGroupRankingService, SmartSegmentSuggestionService, VolunteerMatchingService

---

## 20. ADMIN PANEL

| Feature | Description | User Type | Criticality | Data Sensitivity |
|---------|-------------|-----------|-------------|------------------|
| Dashboard | Admin overview with key metrics and trends | tenant admin | Must-have | Low |
| User Management | View, edit, create, suspend, ban, impersonate users | tenant admin | Must-have | High |
| Listing Moderation | Review, approve, reject listings queue | tenant admin | Should-have | Med |
| Content Moderation | Review flagged feed/comment content | tenant admin | Should-have | High |
| Category Management | Manage listing/group categories and attributes | tenant admin | Should-have | Low |
| Blog/CMS | Create and manage blog posts with restore system | tenant admin | Nice-to-have | Med |
| Page Builder | Create custom pages (drag-and-drop, V2) | tenant admin | Nice-to-have | Med |
| Menu Management | Configure navigation menus | tenant admin | Should-have | Low |
| Tenant Config | Configure tenant settings, features, branding | tenant admin | Must-have | High |
| Roles & Permissions | Manage user roles and granular permissions | tenant admin | Should-have | High |
| Newsletter Management | Create, send, track newsletters with templates | tenant admin | Should-have | High |
| Newsletter Templates | Pre-built newsletter templates | tenant admin | Nice-to-have | Low |
| Newsletter Analytics | Track opens, clicks, bounces, deliverability | tenant admin | Should-have | Med |
| Newsletter Segments | Target newsletters to member segments | tenant admin | Should-have | Low |
| Newsletter Bounce Management | Track and manage email bounces | tenant admin | Should-have | Med |
| Newsletter Send Optimization | AI-powered send time optimization | tenant admin | Nice-to-have | Low |
| SEO Management | Manage SEO metadata, redirects, 404 tracking | tenant admin | Should-have | Low |
| Gamification Admin | Configure badges, XP settings, custom badges | tenant admin | Nice-to-have | Low |
| Cron Jobs | Configure and monitor scheduled tasks | platform admin | Should-have | High |
| Activity Logging | Audit log of admin actions and timelines | tenant admin | Should-have | Med |
| CRM Dashboard | Coordinator relationship management | tenant admin | Should-have | Med |
| CRM Notes | Member notes and interaction tracking | tenant admin | Should-have | Med |
| CRM Tasks | Coordinator task management | tenant admin | Should-have | Low |
| Matching Admin | Configure and monitor smart matching | tenant admin | Nice-to-have | Low |
| Algorithm Settings | Tune ranking algorithm weights and toggles | tenant admin | Nice-to-have | Low |
| Algorithm Health | Monitor algorithm performance metrics | tenant admin | Nice-to-have | Low |
| Email Settings | Configure SMTP/SendGrid/Gmail API settings | tenant admin | Should-have | High |
| Image Settings | Configure image processing and WebP conversion | tenant admin | Nice-to-have | Low |
| Data Management | Bulk data operations and cleanup | tenant admin | Should-have | High |
| Deliverability Dashboard | Monitor email deliverability metrics | tenant admin | Should-have | Med |
| Impact Reports | Generate community impact reports | tenant admin | Nice-to-have | Low |
| Hours Reports | Generate volunteer hours reports | tenant admin | Should-have | Med |
| Community Analytics | Deep analytics on community engagement | tenant admin | Nice-to-have | Low |
| Vetting Records | Track member vetting/background checks | tenant admin | Should-have | High |
| Safeguarding Dashboard | Monitor safeguarding concerns | tenant admin | Should-have | High |
| Fraud Alerts | Track suspicious activity patterns | tenant admin | Should-have | Med |

**Controllers:** 37 legacy admin controllers + 35 API admin controllers = 72 total admin controllers

---

## 21. FEDERATION & MULTI-TENANT

| Feature | Description | User Type | Criticality | Data Sensitivity |
|---------|-------------|-----------|-------------|------------------|
| Federation Setup | Configure timebank partnerships (5-phase system) | platform admin | Should-have | High |
| Federated Search | Search listings across timebanks | member | Should-have | Med |
| Federated Members | Find members from other timebanks | member | Nice-to-have | Med |
| Federated Messaging | Message users from other timebanks | member | Should-have | High |
| Federated Transactions | Exchange credits across timebanks | member | Must-have | High |
| Federated Events | Attend events from other timebanks | member | Should-have | Med |
| Federation Dashboard | View federation status, partners | federation admin | Should-have | Med |
| Federation API Keys | Manage federation credentials with HMAC signing | federation admin | Should-have | High |
| Federation Directory | Browse participating timebanks | member | Should-have | Low |
| Federation Analytics | View federation statistics and trends | federation admin | Nice-to-have | Low |
| Federation Import/Export | Import/export user and listing data | platform admin | Should-have | High |
| Federation Settings | Configure federation rules and controls | platform admin | Should-have | High |
| External Partners | Manage partner integrations | platform admin | Nice-to-have | High |
| Federation Audit | Track all federation activity | platform admin | Should-have | Med |
| Federation Email | Cross-tenant email notifications | system | Should-have | Med |
| Federation Neighborhoods | Geographic grouping of timebanks | platform admin | Nice-to-have | Low |
| Federation Real-time Queue | Async federation event processing | system | Should-have | Low |
| Federation JWT | Secure cross-tenant token exchange | system | Must-have | High |
| Federation Gateway | Central routing for federation requests | system | Should-have | Med |
| 3-Layer Feature Gating | System control + whitelist + per-tenant features | system | Must-have | Med |

**Services:** FederationUserService, FederationActivityService, FederationAuditService, FederationCreditService, FederationDirectoryService, FederationEmailService, FederationExternalApiClient, FederationExternalPartnerService, FederationFeatureService, FederationGateway, FederationJwtService, FederationNeighborhoodService, FederationPartnershipService, FederationRealtimeService, FederationSearchService, FederatedGroupService, FederatedMessageService, FederatedTransactionService

---

## 22. SUPER ADMIN (Platform-Level)

| Feature | Description | User Type | Criticality | Data Sensitivity |
|---------|-------------|-----------|-------------|------------------|
| Super Dashboard | Platform-wide overview and metrics | platform admin | Must-have | Low |
| Tenant Management | Create, view, edit, delete tenants | platform admin | Must-have | High |
| Tenant Hierarchy | Organize tenants (parent/child) | platform admin | Should-have | Med |
| Bulk Operations | Move users between tenants, bulk roles | platform admin | Should-have | High |
| Cross-Tenant Users | Manage users across tenants | platform admin | Must-have | High |
| Global Roles | Grant super admin or global roles | platform admin | Must-have | High |
| Federation Control | Configure federation system controls | platform admin | Should-have | High |
| Emergency Lockdown | Suspend federation or block users globally | platform admin | Must-have | High |
| Whitelist Management | Manage federation whitelist | platform admin | Should-have | High |
| Audit Logging | View platform-level audit log | platform admin | Should-have | Med |
| Tenant Features | Per-tenant feature toggle management | platform admin | Must-have | Med |

**Services:** TenantHierarchyService, TenantSettingsService, TenantVisibilityService, TenantFeatureConfig, SuperAdminAuditService

---

## 23. ENTERPRISE & GOVERNANCE

| Feature | Description | User Type | Criticality | Data Sensitivity |
|---------|-------------|-----------|-------------|------------------|
| Enterprise Dashboard | Enterprise-level overview | enterprise admin | Should-have | Low |
| Enterprise Config | Configure enterprise settings | enterprise admin | Should-have | High |
| GDPR Compliance | Data export, deletion, consent | member | Must-have | High |
| GDPR Audit Trail | Log of data access and changes | enterprise admin | Should-have | High |
| GDPR Breach Reporting | Report and manage data breaches | enterprise admin | Should-have | High |
| Consent Management | Track user consent | enterprise admin | Should-have | High |
| Cookie Consent | Cookie consent banner and API | public | Should-have | Med |
| Cookie Inventory | Track all cookies used by platform | system | Should-have | Low |
| Legal Documents | ToS, privacy policy acceptance with versioning | member | Should-have | High |
| Legal Compliance Dashboard | Track compliance across legal docs | enterprise admin | Should-have | Med |
| Monitoring | System monitoring, error tracking, health checks | enterprise admin | Should-have | Low |
| Secrets Management | Store API keys, secrets securely | enterprise admin | Should-have | High |
| Permission Browser | Visual permission hierarchy explorer | enterprise admin | Nice-to-have | Med |

**Services:** GdprService, AuditLogService, CookieConsentService, CookieInventoryService, LegalDocumentService, PerformanceMonitorService, SentryService

---

## 24. AI FEATURES

| Feature | Description | User Type | Criticality | Data Sensitivity |
|---------|-------------|-----------|-------------|------------------|
| AI Chat | Conversational AI chatbot (OpenAI GPT) | member | Nice-to-have | Med |
| AI Streaming | Real-time streaming AI responses | member | Nice-to-have | Med |
| Conversation History | Save and manage AI conversations | member | Nice-to-have | Med |
| AI Listing Generation | AI-assisted listing descriptions | member | Nice-to-have | Low |
| AI Event Generation | AI-assisted event descriptions | member | Nice-to-have | Low |
| AI Message Generation | AI-assisted message composition | member | Nice-to-have | Low |
| AI Bio Generation | AI-assisted profile bios | member | Nice-to-have | Low |
| AI Newsletter Generation | AI-assisted newsletters | tenant admin | Nice-to-have | Low |
| AI Blog Generation | AI-assisted blog posts | tenant admin | Nice-to-have | Low |
| AI Page Generation | AI-assisted page content | tenant admin | Nice-to-have | Low |
| AI Provider Management | Configure AI providers (OpenAI) | platform admin | Should-have | High |
| AI Usage Limits | Per-user AI usage limits | member | Should-have | Low |
| AI Settings | Configure AI feature toggles per tenant | tenant admin | Should-have | High |

**Models:** AiConversation, AiMessage, AiSettings, AiUsage, AiUserLimit

---

## 25. HELP & DOCUMENTATION

| Feature | Description | User Type | Criticality | Data Sensitivity |
|---------|-------------|-----------|-------------|------------------|
| Help Articles | Self-service help center with categories | member | Should-have | Low |
| Knowledge Base | Structured knowledge base with articles | member | Should-have | Low |
| Onboarding Wizard | Step-by-step setup for new users | member | Should-have | Med |

**Services:** HelpService, KnowledgeBaseService, OnboardingService

---

## 26. REPORTING & MODERATION

| Feature | Description | User Type | Criticality | Data Sensitivity |
|---------|-------------|-----------|-------------|------------------|
| Report Content | Flag inappropriate content | member | Should-have | Med |
| Moderation Queue | Review reported content | tenant admin | Should-have | Med |
| Error Tracking | Log 404 and other errors | system | Should-have | Low |
| Content Moderation AI | AI-powered content moderation | system | Nice-to-have | Med |
| Abuse Detection | Automated abuse pattern detection | system | Should-have | Med |

**Services:** ContentModerationService, AbuseDetectionService, SafeguardingService, VettingService

---

## 27. MOBILE & PWA

| Feature | Description | User Type | Criticality | Data Sensitivity |
|---------|-------------|-----------|-------------|------------------|
| Web Push | Web Push API support (VAPID) | member | Should-have | Low |
| Mobile Push | Firebase Cloud Messaging | member | Should-have | Low |
| Share Target | Web Share Target for PWA | member | Nice-to-have | Low |
| App Version Check | Check for app updates (UpdateAvailableBanner) | member | Should-have | Low |
| Offline Indicator | Show offline status to user | member | Should-have | Low |
| Mobile Logging | Client-side error logging | member | Should-have | Low |
| Real-time (Pusher) | WebSocket auth for real-time updates | member | Should-have | Med |
| Capacitor App | Native mobile wrapper | member | Nice-to-have | Low |

---

## 28. BLOG & CONTENT MANAGEMENT

| Feature | Description | User Type | Criticality | Data Sensitivity |
|---------|-------------|-----------|-------------|------------------|
| Blog Posts | Create, edit, publish blog articles | tenant admin | Nice-to-have | Med |
| Blog Restore | Recover deleted/archived blog posts | tenant admin | Nice-to-have | Low |
| Pages | Create custom static pages | tenant admin | Nice-to-have | Med |
| Page Builder V2 | Drag-and-drop page layout builder | tenant admin | Nice-to-have | Med |
| Resources | Manage shareable resources/documents | tenant admin | Nice-to-have | Med |
| Resource Categories | Organize resources by category | tenant admin | Nice-to-have | Low |
| Resource Ordering | Drag-and-drop resource ordering | tenant admin | Nice-to-have | Low |

**Services:** ResourceOrderService, ResourceCategoryService

---

## 29. IDEATION & CAMPAIGNS

| Feature | Description | User Type | Criticality | Data Sensitivity |
|---------|-------------|-----------|-------------|------------------|
| Ideation Challenges | Create community idea challenges | tenant admin | Nice-to-have | Low |
| Ideas | Submit ideas to challenges | member | Nice-to-have | Low |
| Idea Voting | Vote on community ideas | member | Nice-to-have | Low |
| Idea Teams | Convert winning ideas to project teams | member | Nice-to-have | Med |
| Campaigns | Community fundraising/awareness campaigns | tenant admin | Nice-to-have | Med |

**Services:** IdeationChallengeService, IdeaMediaService, IdeaTeamConversionService, CampaignService

---

## 30. ORGANIZATIONS

| Feature | Description | User Type | Criticality | Data Sensitivity |
|---------|-------------|-----------|-------------|------------------|
| Register Organization | Create organizational accounts | member | Should-have | Med |
| Organization Members | Manage org member roles | org admin | Should-have | Med |
| Organization Wallets | Separate wallet for organizational credits | org admin | Should-have | High |
| Organization Notifications | Org-level notification management | org admin | Nice-to-have | Low |

**Services:** OrgWalletService, OrgNotificationService

---

## 31. INTEGRATIONS

| Feature | Description | User Type | Criticality | Data Sensitivity |
|---------|-------------|-----------|-------------|------------------|
| API Documentation | OpenAPI/Swagger docs generation | developer | Should-have | Low |
| File Upload API | General-purpose file upload with WebP conversion | member | Should-have | Med |
| Federation API | External API for partner integration | external | Should-have | High |
| Gmail API | Email sending via Gmail API | system | Should-have | High |
| SendGrid | Email delivery and webhook tracking | system | Should-have | High |
| Mailchimp | Newsletter subscriber sync | system | Nice-to-have | Med |
| Pusher | Real-time WebSocket service | system | Should-have | Med |
| Meilisearch | Full-text search engine | system | Should-have | Low |
| OpenAI | AI embeddings and chat completions | system | Nice-to-have | Med |

**Services:** MailchimpService, FCMPushService, WebPushService, PusherService, EmbeddingService

---

## 32. DELIVERABLES & PROJECT MANAGEMENT

| Feature | Description | User Type | Criticality | Data Sensitivity |
|---------|-------------|-----------|-------------|------------------|
| Deliverables | Track project deliverables with milestones | member | Nice-to-have | Med |
| Deliverable Comments | Comment on deliverable progress | member | Nice-to-have | Low |
| Team Documents | Shared documents for project teams | member | Nice-to-have | Med |
| Team Tasks | Task management within teams | member | Nice-to-have | Low |

**Services:** TeamDocumentService, TeamTaskService

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| Feature Domains | 32 |
| Total Features | ~250 |
| Must-Have Features | ~30 |
| Should-Have Features | ~95 |
| Nice-to-Have Features | ~125 |
| PHP Services | 206 |
| Data Models | 60 |
| API Controllers | 111 |
| Admin Controllers | 37 |
| API Endpoints | 1,715+ |
| React Pages | 163 |
| React Admin Modules | 226 |
| Database Migrations | 165 |
| i18n Languages | 7 |

---

## Key Architectural Patterns (Observed)

1. **Multi-Tenancy**: All data scoped to tenants via TenantContext
2. **Federation**: 5-phase cross-timebank integration with 3-layer feature gating
3. **Dual Auth**: Session (web) + Bearer token (mobile/SPA) + TOTP 2FA + WebAuthn
4. **Rate Limiting**: IP and email-based brute force protection
5. **Gamification**: XP, badges, leaderboards, challenges, streaks, seasons, shop
6. **AI Integration**: OpenAI for chat, embeddings, content generation
7. **Push Notifications**: Web Push (VAPID) + FCM for mobile
8. **Activity Logging**: Comprehensive audit trails
9. **GDPR Compliance**: Consent, audit, export, deletion, breach reporting, legal doc versioning
10. **Real-time**: Pusher WebSocket integration
11. **Search**: Meilisearch with FULLTEXT fallback, typo tolerance, synonyms
12. **Ranking Algorithms**: EdgeRank (feed), MatchRank (listings), CommunityRank (members)
13. **Smart Matching**: Embeddings + collaborative filtering + cross-module matching
14. **Newsletter System**: Templates, segments, deliverability tracking, bounce management
15. **CRM**: Coordinator dashboard, notes, tasks, tags, timeline

---

*This inventory documents what the legacy PHP application DOES today as of 2026-03-06. It is not a specification for the new ASP.NET backend.*
