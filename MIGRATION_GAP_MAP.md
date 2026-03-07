# Migration Gap Map

**Purpose**: Cross-reference legacy features against roadmap and implementation status
**Inputs**: LEGACY_FEATURE_INVENTORY.md, ROADMAP.md, CLAUDE.md
**Last Updated**: 2026-03-07

---

## Legend

**ASP.NET Status:**
- **Done** = Fully implemented and tested
- **Partial** = Some functionality exists, not complete
- **Missing** = Not implemented
- **Unknown** = Cannot confirm without code inspection

**Priority (from Legacy Inventory):**
- **Must-have** = Critical for platform operation
- **Should-have** = Important for user experience
- **Nice-to-have** = Enhancement features

---

## 1. Accounts & Authentication

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority | V1 Services |
|----------------|---------------|----------------|----------|-------------|
| User Registration | Phase 8 | Done | Must-have | - |
| Login (Session) | N/A | Missing (JWT only) | Must-have | - |
| Login (Token/JWT) | Phase 0 | Done | Must-have | - |
| Two-Factor Auth (TOTP) | Phase 20 | Done (5 endpoints, AES-256-GCM) | Should-have | TotpService, TotpController |
| WebAuthn/Biometric | Phase 20 | Done (FIDO2, 7 endpoints) | Should-have | WebAuthnChallengeStore |
| Password Reset | Phase 8, 18 | Done (token + Gmail email) | Must-have | - |
| Email Verification | Not on roadmap | Missing | Should-have | EmailVerificationController |
| Social OAuth Login | Not on roadmap | Missing | Nice-to-have | SocialAuthService |
| Token Revocation | Phase 8 | Done | Should-have | TokenService |
| Session Heartbeat | N/A | Missing (JWT only) | Should-have | - |

**V1 has 5 auth services. V2 has AuthController + PasskeyService + GmailEmailService + RegistrationOrchestrator (4 services).**

---

## 2. User Profiles & Settings

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority | V1 Services |
|----------------|---------------|----------------|----------|-------------|
| View Profile | Phase 0-2 | Done | Must-have | UserService |
| Edit Profile | Phase 2 | Done | Must-have | UserService |
| Avatar Upload | Backlog (File Uploads) | Missing | Should-have | UploadService |
| User Preferences | Backlog | Missing | Should-have | - |
| Password Change | Phase 8 | Done | Must-have | - |
| Account Deletion | Backlog (GDPR) | Missing | Should-have | GdprService |
| User Status (suspend) | Admin APIs | Done | Should-have | - |
| Sub-Accounts | Not on roadmap | Missing | Nice-to-have | SubAccountService |
| Member Availability | Not on roadmap | Missing | Nice-to-have | MemberAvailabilityService |
| Verification Badges | Not on roadmap | Missing | Should-have | MemberVerificationBadgeService |
| User Insights | Not on roadmap | Missing | Nice-to-have | UserInsightsService |

**V1 has 6 user services. V2 has 0 dedicated user services.**

---

## 3. Listings (Time Exchange)

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority | V1 Services |
|----------------|---------------|----------------|----------|-------------|
| Create Listing | Phase 3 | Done | Must-have | ListingService |
| View Listings | Phase 1 | Done | Must-have | ListingService |
| View Listing Detail | Phase 1 | Done | Must-have | ListingService |
| Edit Listing | Phase 3 | Done | Should-have | ListingService |
| Delete Listing | Phase 3 | Done | Should-have | ListingService |
| Listing Images | Backlog (File Uploads) | Missing | Should-have | UploadService |
| Listing Categories | Phase 1 | Partial (no CRUD) | Should-have | - |
| Listing Attributes | Not on roadmap | Missing | Nice-to-have | - |
| Nearby Listings (geo) | Not on roadmap | Missing | Should-have | GeocodingService |
| Admin Moderation | Admin APIs | Done | Should-have | ListingModerationService |
| Listing Ranking | Not on roadmap | Missing | Should-have | ListingRankingService |
| Listing Analytics | Not on roadmap | Missing | Nice-to-have | ListingAnalyticsService |
| Listing Expiry | Not on roadmap | Missing | Should-have | ListingExpiryService, ListingExpiryReminderService |
| Featured Listings | Not on roadmap | Missing | Nice-to-have | ListingFeaturedService |
| Risk Tags | Not on roadmap | Missing | Should-have | ListingRiskTagService |
| Skill Tags | Not on roadmap | Missing | Nice-to-have | ListingSkillTagService |
| Saved Searches | Not on roadmap | Missing | Nice-to-have | SavedSearchService |

**V1 has 10 listing services. V2 has basic CRUD only.**

---

## 4. Messaging & Communication

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority | V1 Services |
|----------------|---------------|----------------|----------|-------------|
| Direct Messages | Phase 6-7 | Done | Must-have | MessageService |
| Typing Indicator | Not on roadmap | Missing | Nice-to-have | - |
| Voice Messages | Not on roadmap | Missing | Should-have | VoiceMessageController |
| Message Archive | Not on roadmap | Missing | Nice-to-have | - |
| Unread Count | Phase 6 | Done | Should-have | - |
| Group Discussions | Phase 11 | Partial (no threads) | Should-have | GroupChatroomService |
| Message Reactions | Not on roadmap | Missing | Nice-to-have | - |
| Message Attachments | Not on roadmap | Missing | Should-have | - |
| Broker Visibility | Not on roadmap | Missing | Should-have | BrokerMessageVisibilityService |
| Contextual Messages | Not on roadmap | Missing | Nice-to-have | ContextualMessageService |
| Federated Messages | Not on roadmap | Missing | Should-have | FederatedMessageService |

**V1 has 5 messaging services. V2 has SignalR real-time (advantage) but missing advanced features.**

---

## 5. Wallet & Time Credits

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority | V1 Services |
|----------------|---------------|----------------|----------|-------------|
| View Balance | Phase 4 | Done | Must-have | WalletService |
| Transaction History | Phase 4 | Done | Must-have | WalletService |
| Transfer Credits | Phase 5 | Done | Must-have | WalletService |
| Transaction Details | Phase 4 | Done | Should-have | WalletService |
| Pending Count | Not on roadmap | Missing | Nice-to-have | - |
| Org Wallet | Not on roadmap | Missing | Should-have | OrgWalletService |
| Transaction Limits | Not on roadmap | Missing | Should-have | TransactionLimitService |
| Transaction Categories | Not on roadmap | Missing | Nice-to-have | TransactionCategoryService |
| Transaction Export | Not on roadmap | Missing | Should-have | TransactionExportService |
| Credit Donations | Not on roadmap | Missing | Nice-to-have | CreditDonationService |
| Balance Alerts | Not on roadmap | Missing | Should-have | BalanceAlertService |
| Starting Balance | Not on roadmap | Missing | Should-have | StartingBalanceService |
| Pay Plans | Not on roadmap | Missing | Nice-to-have | PayPlanService |
| Community Fund | Not on roadmap | Missing | Nice-to-have | CommunityFundService |

**V1 has 10 wallet services. V2 has basic balance + transfer with optimistic concurrency (good).**

---

## 6. Exchange Workflow

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority | V1 Services |
|----------------|---------------|----------------|----------|-------------|
| Create Exchange | Not on roadmap | Missing | Must-have | ExchangeWorkflowService |
| Exchange Status | Not on roadmap | Missing | Must-have | ExchangeWorkflowService |
| Exchange Rating | Not on roadmap | Missing | Should-have | ExchangeRatingService |
| Group Exchanges | Not on roadmap | Missing | Should-have | GroupExchangeService |

**V1 has 3 exchange services. V2 has none. This is a critical gap — exchanges are core to timebanking.**

---

## 7. Social Feed

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority | V1 Services |
|----------------|---------------|----------------|----------|-------------|
| Create Post | Phase 12 | Done | Should-have | FeedService |
| Like/React | Phase 12 | Done | Should-have | - |
| Comments | Phase 12 | Done | Should-have | CommentService |
| Feed Timeline | Phase 12 | Done | Should-have | FeedService |
| Delete Post/Comment | Phase 12 | Done | Should-have | - |
| Edit Comment | Not on roadmap | Missing | Nice-to-have | - |
| Mention Tagging | Not on roadmap | Missing | Nice-to-have | - |
| Share Posts | Not on roadmap | Missing | Nice-to-have | PostSharingService |
| Hashtags | Not on roadmap | Missing | Nice-to-have | HashtagService |
| Feed Ranking (EdgeRank) | Not on roadmap | Missing | Should-have | FeedRankingService |
| Feed Moderation | Not on roadmap | Missing | Should-have | - |

**V1 has 6 feed services + EdgeRank algorithm. V2 has basic CRUD without ranking.**

---

## 8. Groups & Communities

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority | V1 Services |
|----------------|---------------|----------------|----------|-------------|
| Create Group | Phase 11 | Done | Should-have | GroupService |
| View Groups | Phase 11 | Done | Should-have | GroupService |
| Group Details | Phase 11 | Done | Should-have | GroupService |
| Join Group | Phase 11 | Done | Should-have | GroupService |
| Leave Group | Phase 11 | Done | Should-have | GroupService |
| Manage Members | Phase 11 | Done | Should-have | GroupService |
| Pending Requests | Phase 11 | Missing | Should-have | GroupApprovalWorkflowService |
| Group Image | Backlog (File Uploads) | Missing | Should-have | UploadService |
| Edit/Delete Group | Phase 11 | Done | Should-have | GroupService |
| Group Types | Not on roadmap | Missing | Nice-to-have | - |
| Group Analytics | Not on roadmap | Missing | Nice-to-have | GroupReportingService |
| Group Feedback | Not on roadmap | Missing | Nice-to-have | - |
| Group Exchanges | Not on roadmap | Missing | Should-have | GroupExchangeService |
| Group Discussions | Not on roadmap | Missing | Should-have | GroupChatroomService |
| Group Files | Not on roadmap | Missing | Nice-to-have | GroupFileService |
| Group Policies | Not on roadmap | Missing | Nice-to-have | GroupPolicyRepository |
| Group Recommendations | Not on roadmap | Missing | Nice-to-have | GroupRecommendationEngine |
| Group Ranking | Not on roadmap | Missing | Nice-to-have | SmartGroupRankingService |
| Group Announcements | Not on roadmap | Missing | Should-have | GroupAnnouncementService |
| Group Chatroom | Not on roadmap | Missing | Nice-to-have | GroupChatroomService |
| Group Approval Workflow | Not on roadmap | Missing | Should-have | GroupApprovalWorkflowService |

**V1 has 21 group services. V2 has basic CRUD + members only.**

---

## 9. Events & Calendar

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority | V1 Services |
|----------------|---------------|----------------|----------|-------------|
| Create Event | Phase 11 | Done | Should-have | EventService |
| View Events | Phase 11 | Done | Should-have | EventService |
| Event Details | Phase 11 | Done | Should-have | EventService |
| RSVP | Phase 11 | Done | Should-have | - |
| Cancel RSVP | Phase 11 | Done | Should-have | - |
| Attendees List | Phase 11 | Done | Should-have | - |
| Edit Event | Phase 11 | Done | Should-have | EventService |
| Delete Event | Phase 11 | Done | Should-have | EventService |
| Event Image | Backlog (File Uploads) | Missing | Should-have | UploadService |
| Event Reminders | Not on roadmap | Missing | Should-have | EventReminderService |
| Recurring Shifts | Not on roadmap | Missing | Nice-to-have | RecurringShiftService |
| Federated Events | Backlog (Federation) | Missing | Nice-to-have | - |

**V1 has 4 event services. V2 has basic CRUD + RSVPs.**

---

## 10. Volunteering Module

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority | V1 Services |
|----------------|---------------|----------------|----------|-------------|
| Create Opportunity | Backlog | Missing | Should-have | VolunteerService |
| Browse Opportunities | Backlog | Missing | Should-have | VolunteerService |
| Opportunity Details | Backlog | Missing | Should-have | VolunteerService |
| Apply | Backlog | Missing | Should-have | VolunteerService |
| Manage Applications | Backlog | Missing | Should-have | VolunteerService |
| Shifts Management | Backlog | Missing | Should-have | VolunteerService |
| Shift Swaps | Not on roadmap | Missing | Nice-to-have | ShiftSwapService |
| Shift Waitlist | Not on roadmap | Missing | Nice-to-have | ShiftWaitlistService |
| Log Hours | Backlog | Missing | Must-have | VolunteerService |
| Verify Hours | Backlog | Missing | Should-have | VolunteerService |
| Hours Summary | Backlog | Missing | Should-have | VolunteerService |
| Browse Organizations | Backlog | Missing | Should-have | VolunteerService |
| Volunteer Reviews | Backlog | Missing | Should-have | VolunteerService |
| Volunteer Certificates | Not on roadmap | Missing | Nice-to-have | VolunteerCertificateService |
| Volunteer Check-In | Not on roadmap | Missing | Nice-to-have | VolunteerCheckInService |
| Volunteer Matching | Not on roadmap | Missing | Nice-to-have | VolunteerMatchingService |
| Volunteer Wellbeing | Not on roadmap | Missing | Nice-to-have | VolunteerWellbeingService |
| Emergency Alerts | Not on roadmap | Missing | Should-have | VolunteerEmergencyAlertService |
| Predictive Staffing | Not on roadmap | Missing | Nice-to-have | PredictiveStaffingService |
| Insurance Certificates | Not on roadmap | Missing | Should-have | InsuranceCertificateService |

**V1 has 11 volunteering services. V2 has 0. Entire module missing.**

---

## 11. Jobs Module

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority | V1 Services |
|----------------|---------------|----------------|----------|-------------|
| Job Vacancies | Not on roadmap | Missing | Should-have | JobVacancyService |
| Job Alerts | Not on roadmap | Missing | Nice-to-have | - |
| Job Applications | Not on roadmap | Missing | Should-have | - |
| Predictive Staffing | Not on roadmap | Missing | Nice-to-have | PredictiveStaffingService |

**V1 has 2 job services. V2 has 0. Entire module missing.**

---

## 12. Reviews & Trust

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority | V1 Services |
|----------------|---------------|----------------|----------|-------------|
| Create Review | Phase 14 | Done | Should-have | ReviewService |
| Pending Reviews | Not on roadmap | Missing | Should-have | - |
| User Reviews | Phase 14 | Done | Should-have | ReviewService |
| Review Stats | Phase 14 | Done | Should-have | - |
| Trust Score (time-decay) | Not on roadmap | Missing | Should-have | MemberRankingService |
| Delete Review | Phase 14 | Done | Nice-to-have | - |
| Exchange Rating | Not on roadmap | Missing | Should-have | ExchangeRatingService |
| Endorsements | Not on roadmap | Missing | Nice-to-have | EndorsementService |

**V1 has 3 review/trust services. V2 has basic CRUD reviews.**

---

## 13. Notifications

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority | V1 Services |
|----------------|---------------|----------------|----------|-------------|
| In-App Notifications | Phase 10 | Done | Must-have | NotificationService |
| Badge Count | Phase 10 | Done | Should-have | - |
| Mark as Read | Phase 10 | Done | Should-have | - |
| Mark All Read | Phase 10 | Done | Should-have | - |
| Delete Notification | Phase 10 | Done | Nice-to-have | - |
| Clear All | Not on roadmap | Missing | Nice-to-have | - |
| Web Push (PWA) | Backlog | Missing | Should-have | WebPushService |
| Mobile Push (FCM) | Backlog | Missing | Should-have | FCMPushService |
| Notification Polling | Not on roadmap | Missing | Should-have | - |
| Real-time (Pusher) | Not on roadmap | Missing | Should-have | PusherService, RealtimeService |
| Social Notifications | Not on roadmap | Missing | Should-have | SocialNotificationService |
| Org Notifications | Not on roadmap | Missing | Nice-to-have | OrgNotificationService |
| Progress Notifications | Not on roadmap | Missing | Nice-to-have | ProgressNotificationService |

**V1 has 9 notification services. V2 has basic in-app only. V2 has SignalR which could replace Pusher.**

---

## 14. Connections & Friendships

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority | V1 Services |
|----------------|---------------|----------------|----------|-------------|
| Send Request | Phase 9 | Done | Should-have | ConnectionService |
| Accept Request | Phase 9 | Done | Should-have | - |
| View Connections | Phase 9 | Done | Should-have | - |
| Check Status | Not on roadmap | Missing | Nice-to-have | - |
| Pending Counts | Phase 9 | Partial | Should-have | - |
| Remove Connection | Phase 9 | Done | Should-have | - |
| Endorsements | Not on roadmap | Missing | Nice-to-have | EndorsementService |

**V1 has 2 services. V2 covers basic functionality.**

---

## 15. Polls & Surveys

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority | V1 Services |
|----------------|---------------|----------------|----------|-------------|
| Create Poll | Not on roadmap | Missing | Nice-to-have | PollService |
| View Polls | Not on roadmap | Missing | Nice-to-have | PollService |
| Poll Details | Not on roadmap | Missing | Nice-to-have | PollService |
| Vote | Not on roadmap | Missing | Nice-to-have | PollService |
| Edit Poll | Not on roadmap | Missing | Nice-to-have | PollService |
| Delete Poll | Not on roadmap | Missing | Nice-to-have | PollService |
| Poll Export | Not on roadmap | Missing | Nice-to-have | PollExportService |
| Poll Ranking | Not on roadmap | Missing | Nice-to-have | PollRankingService |

**V1 has 3 poll services. V2 has 0.**

---

## 16. Goals & Self-Improvement

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority | V1 Services |
|----------------|---------------|----------------|----------|-------------|
| Create Goal | Not on roadmap | Missing | Nice-to-have | GoalService |
| View Goals | Not on roadmap | Missing | Nice-to-have | GoalService |
| Goal Discovery | Not on roadmap | Missing | Nice-to-have | GoalService |
| Goal Details | Not on roadmap | Missing | Nice-to-have | GoalService |
| Update Progress | Not on roadmap | Missing | Nice-to-have | GoalProgressService |
| Goal Buddy | Not on roadmap | Missing | Nice-to-have | GoalService |
| Edit/Delete Goal | Not on roadmap | Missing | Nice-to-have | GoalService |
| Goal Check-ins | Not on roadmap | Missing | Nice-to-have | GoalCheckinService |
| Goal Templates | Not on roadmap | Missing | Nice-to-have | GoalTemplateService |
| Goal Reminders | Not on roadmap | Missing | Nice-to-have | GoalReminderService |

**V1 has 5 goal services. V2 has 0.**

---

## 17. Gamification & Rewards

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority | V1 Services |
|----------------|---------------|----------------|----------|-------------|
| XP/Points System | Phase 13 | Done | Nice-to-have | GamificationService |
| Badges | Phase 13 | Done | Nice-to-have | GamificationService |
| Leaderboards | Phase 13 | Done | Nice-to-have | LeaderboardService |
| Gamification Profile | Phase 13 | Done | Nice-to-have | GamificationService |
| Challenges | Not on roadmap | Missing | Nice-to-have | ChallengeService |
| Challenge Templates | Not on roadmap | Missing | Nice-to-have | ChallengeTemplateService |
| Collections | Not on roadmap | Missing | Nice-to-have | BadgeCollectionService |
| Daily Reward | Not on roadmap | Missing | Nice-to-have | DailyRewardService |
| Reward Shop | Not on roadmap | Missing | Nice-to-have | XPShopService |
| Badge Showcase | Not on roadmap | Missing | Nice-to-have | - |
| Seasonal Events | Not on roadmap | Missing | Nice-to-have | LeaderboardSeasonService |
| Streaks | Not on roadmap | Missing | Nice-to-have | StreakService |
| Achievement Campaigns | Not on roadmap | Missing | Nice-to-have | AchievementCampaignService |
| Achievement Unlockables | Not on roadmap | Missing | Nice-to-have | AchievementUnlockablesService |
| Achievement Analytics | Not on roadmap | Missing | Nice-to-have | AchievementAnalyticsService |
| Nexus Score | Not on roadmap | Missing | Nice-to-have | NexusScoreService |
| Social Gamification | Not on roadmap | Missing | Nice-to-have | SocialGamificationService |

**V1 has 20 gamification services. V2 has basic XP + badges + leaderboard (1 service).**

---

## 18. Search & Discovery

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority | V1 Services |
|----------------|---------------|----------------|----------|-------------|
| Unified Search | Phase 15 | Done (ILIKE) | Should-have | SearchService |
| Autocomplete | Phase 15 | Done | Should-have | - |
| Search Filters | Phase 15 | Done | Should-have | - |
| Member Directory | Phase 15 | Done | Should-have | - |
| Personalized Search | Not on roadmap | Missing | Nice-to-have | PersonalizedSearchService |
| Saved Searches | Not on roadmap | Missing | Nice-to-have | SavedSearchService |
| Search Analytics | Not on roadmap | Missing | Nice-to-have | SearchLogService |
| Typo Tolerance | Not on roadmap | Missing | Should-have | SearchService (Meilisearch) |
| Synonyms | Not on roadmap | Missing | Should-have | SearchService |
| Skill Browsing | Not on roadmap | Missing | Nice-to-have | SkillTaxonomyService |

**V1 has 7 search services + Meilisearch. V2 has ILIKE-based search (basic).**

---

## 19. Smart Matching & Algorithms

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority | V1 Services |
|----------------|---------------|----------------|----------|-------------|
| Smart Matching Engine | Not on roadmap | Missing | Nice-to-have | SmartMatchingEngine |
| Cross-Module Matching | Not on roadmap | Missing | Nice-to-have | CrossModuleMatchingService |
| Match Learning | Not on roadmap | Missing | Nice-to-have | MatchLearningService |
| Match Approval Workflow | Not on roadmap | Missing | Nice-to-have | MatchApprovalWorkflowService |
| Match Notifications | Not on roadmap | Missing | Nice-to-have | MatchNotificationService |
| Match Debug Panel | Not on roadmap | Missing | Nice-to-have | SmartMatchingAnalyticsService |
| Matching Analytics | Not on roadmap | Missing | Nice-to-have | SmartMatchingAnalyticsService |
| Collaborative Filtering | Not on roadmap | Missing | Nice-to-have | CollaborativeFilteringService |
| Embeddings (OpenAI) | Not on roadmap | Missing | Nice-to-have | EmbeddingService |
| Feed Ranking (EdgeRank) | Not on roadmap | Missing | Should-have | FeedRankingService |
| Listing Ranking (MatchRank) | Not on roadmap | Missing | Should-have | ListingRankingService |
| Member Ranking (CommunityRank) | Not on roadmap | Missing | Should-have | MemberRankingService |
| Group Recommendations | Not on roadmap | Missing | Nice-to-have | GroupRecommendationEngine |
| Smart Segments | Not on roadmap | Missing | Nice-to-have | SmartSegmentSuggestionService |

**V1 has 19 matching/algorithm services. V2 has 0. Entire subsystem missing.**

---

## 20. Admin Panel

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority | V1 Scale |
|----------------|---------------|----------------|----------|----------|
| Dashboard | Admin APIs | Done | Must-have | 1 endpoint |
| User Management | Admin APIs | Done | Must-have | 6 endpoints |
| Listing Moderation | Admin APIs | Done | Should-have | 3 endpoints |
| Category Management | Admin APIs | Done | Should-have | 4 endpoints |
| Tenant Config | Admin APIs | Done | Must-have | 2 endpoints |
| Roles & Permissions | Admin APIs | Done | Should-have | 4 endpoints |
| Content Moderation | Not on roadmap | Missing | Should-have | V1: 446 admin endpoints |
| Blog/CMS | Not on roadmap | Missing | Nice-to-have | V1: full blog system |
| Page Builder | Not on roadmap | Missing | Nice-to-have | V1: drag-and-drop V2 |
| Menu Management | Not on roadmap | Missing | Should-have | V1: menu builder |
| Newsletter Management | Not on roadmap | Missing | Should-have | V1: full newsletter system |
| Newsletter Templates | Not on roadmap | Missing | Nice-to-have | V1: template builder |
| Newsletter Analytics | Not on roadmap | Missing | Should-have | V1: deliverability tracking |
| Newsletter Segments | Not on roadmap | Missing | Should-have | V1: segment builder |
| SEO Management | Not on roadmap | Missing | Should-have | V1: meta + redirects + 404s |
| Gamification Admin | Not on roadmap | Missing | Nice-to-have | V1: custom badges, settings |
| Cron Jobs | Not on roadmap | Missing | Should-have | V1: cron management UI |
| Activity Logging | Not on roadmap | Missing | Should-have | V1: audit logs |
| CRM Dashboard | Not on roadmap | Missing | Should-have | V1: notes, tasks, tags |
| Matching Admin | Not on roadmap | Missing | Nice-to-have | V1: config + monitoring |
| Algorithm Settings | Not on roadmap | Missing | Nice-to-have | V1: weight sliders |
| Email Settings | Not on roadmap | Missing | Should-have | V1: SMTP/SendGrid/Gmail config |
| Deliverability Dashboard | Not on roadmap | Missing | Should-have | V1: bounce tracking |
| Impact Reports | Not on roadmap | Missing | Nice-to-have | V1: community impact reports |
| Vetting Records | Not on roadmap | Missing | Should-have | V1: background check tracking |
| Safeguarding Dashboard | Not on roadmap | Missing | Should-have | V1: safeguarding monitoring |

**V1 has 446 admin API endpoints + 37 legacy admin controllers + 226 React admin modules. V2 has 19 admin endpoints. This is the largest gap.**

---

## 21. Federation & Multi-Tenant

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority | V1 Services |
|----------------|---------------|----------------|----------|-------------|
| Federation Setup | Backlog | Missing | Should-have | FederationPartnershipService |
| Federated Search | Backlog | Missing | Should-have | FederationSearchService |
| Federated Members | Backlog | Missing | Nice-to-have | FederationUserService |
| Federated Messaging | Backlog | Missing | Should-have | FederatedMessageService |
| Federated Transactions | Backlog | Missing | Must-have | FederatedTransactionService |
| Federated Events | Backlog | Missing | Should-have | - |
| Federation Dashboard | Backlog | Missing | Should-have | FederationActivityService |
| Federation API Keys | Not on roadmap | Missing | Should-have | FederationExternalApiClient |
| Federation Directory | Backlog | Missing | Should-have | FederationDirectoryService |
| Federation Analytics | Not on roadmap | Missing | Nice-to-have | FederationAuditService |
| Federation Import/Export | Not on roadmap | Missing | Should-have | FederationExternalPartnerService |
| Federation Settings | Backlog | Missing | Should-have | FederationFeatureService |
| External Partners | Not on roadmap | Missing | Nice-to-have | FederationExternalPartnerService |
| Federation Audit | Not on roadmap | Missing | Should-have | FederationAuditService |
| Federation Email | Not on roadmap | Missing | Should-have | FederationEmailService |
| Federation Neighborhoods | Not on roadmap | Missing | Nice-to-have | FederationNeighborhoodService |
| Federation Real-time Queue | Not on roadmap | Missing | Should-have | FederationRealtimeService |
| Federation JWT | Not on roadmap | Missing | Must-have | FederationJwtService |
| Federation Gateway | Not on roadmap | Missing | Should-have | FederationGateway |
| 3-Layer Feature Gating | Not on roadmap | Missing | Must-have | FederationFeatureService |

**V1 has 18 federation services with 5-phase rollout complete. V2 has 0. Entire subsystem missing.**

---

## 22. Super Admin (Platform-Level)

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority | V1 Services |
|----------------|---------------|----------------|----------|-------------|
| Super Dashboard | Backlog | Missing | Must-have | - |
| Tenant Management | Backlog | Missing | Must-have | TenantHierarchyService |
| Tenant Hierarchy | Not on roadmap | Missing | Should-have | TenantHierarchyService |
| Bulk Operations | Not on roadmap | Missing | Should-have | - |
| Cross-Tenant Users | Backlog | Missing | Must-have | - |
| Global Roles | Backlog | Missing | Must-have | - |
| Federation Control | Not on roadmap | Missing | Should-have | FederationFeatureService |
| Emergency Lockdown | Backlog | Missing | Must-have | - |
| Whitelist Management | Not on roadmap | Missing | Should-have | - |
| Audit Logging | Not on roadmap | Missing | Should-have | SuperAdminAuditService |
| Tenant Features | Not on roadmap | Missing | Must-have | TenantFeatureConfig |

**V1 has 5 tenant management services. V2 has 0.**

---

## 23. Enterprise & Governance

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority | V1 Services |
|----------------|---------------|----------------|----------|-------------|
| Enterprise Dashboard | Not on roadmap | Missing | Should-have | - |
| Enterprise Config | Not on roadmap | Missing | Should-have | - |
| GDPR Compliance | Backlog | Missing | Must-have | GdprService |
| GDPR Audit Trail | Not on roadmap | Missing | Should-have | AuditLogService |
| GDPR Breach Reporting | Not on roadmap | Missing | Should-have | - |
| Consent Management | Backlog | Missing | Should-have | CookieConsentService |
| Cookie Consent | Not on roadmap | Missing | Should-have | CookieConsentService, CookieInventoryService |
| Legal Documents | Backlog | Missing | Should-have | LegalDocumentService |
| Legal Compliance Dashboard | Not on roadmap | Missing | Should-have | - |
| Monitoring | Not on roadmap | Missing | Should-have | PerformanceMonitorService, SentryService |
| Secrets Management | Not on roadmap | Missing | Should-have | - |

**V1 has 7 enterprise/compliance services. V2 has 0.**

---

## 24. AI Features

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority | V1 Provider |
|----------------|---------------|----------------|----------|-------------|
| AI Chat | Not on roadmap | Done (LLaMA) | Nice-to-have | OpenAI GPT |
| AI Streaming | Not on roadmap | Missing | Nice-to-have | OpenAI |
| Conversation History | Not on roadmap | Done | Nice-to-have | - |
| AI Listing Generation | Not on roadmap | Done | Nice-to-have | OpenAI |
| AI Event Generation | Not on roadmap | Missing | Nice-to-have | OpenAI |
| AI Message Generation | Not on roadmap | Missing | Nice-to-have | OpenAI |
| AI Bio Generation | Not on roadmap | Done | Nice-to-have | OpenAI |
| AI Newsletter Generation | Not on roadmap | Missing | Nice-to-have | OpenAI |
| AI Blog Generation | Not on roadmap | Missing | Nice-to-have | OpenAI |
| AI Page Generation | Not on roadmap | Missing | Nice-to-have | OpenAI |
| AI Provider Management | Not on roadmap | Missing | Should-have | - |
| AI Usage Limits | Not on roadmap | Missing | Should-have | - |
| AI Settings | Not on roadmap | Missing | Should-have | - |

**V1 uses OpenAI (cloud). V2 uses Ollama/LLaMA (self-hosted, no API costs). Both have strengths. V2 has more AI endpoints (21 vs V1's ~10) but V1 has deeper integration (embeddings, content generation for all entity types).**

---

## 25. Help & Documentation

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority | V1 Services |
|----------------|---------------|----------------|----------|-------------|
| Help Articles | Not on roadmap | Missing | Should-have | HelpService |
| Knowledge Base | Not on roadmap | Missing | Should-have | KnowledgeBaseService |
| Onboarding Wizard | Not on roadmap | Missing | Should-have | OnboardingService |

**V1 has 3 help services. V2 has 0.**

---

## 26. Reporting & Moderation

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority | V1 Services |
|----------------|---------------|----------------|----------|-------------|
| Report Content | Backlog | Missing | Should-have | - |
| Moderation Queue | Backlog | Missing | Should-have | ContentModerationService |
| Error Tracking | Not on roadmap | Missing | Should-have | - |
| Content Moderation AI | Not on roadmap | Done (LLaMA) | Nice-to-have | ContentModerationService |
| Abuse Detection | Not on roadmap | Missing | Should-have | AbuseDetectionService |

**V1 has 4 moderation services. V2 has AI moderation (advantage) but no queue/workflow.**

---

## 27. Mobile & PWA

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority | V1 Tech |
|----------------|---------------|----------------|----------|---------|
| Web Push | Not on roadmap | Missing | Should-have | VAPID |
| Mobile Push | Not on roadmap | Missing | Should-have | FCM |
| Share Target | Not on roadmap | Missing | Nice-to-have | Web Share API |
| App Version Check | Not on roadmap | Missing | Should-have | React component |
| Offline Indicator | Not on roadmap | Missing | Should-have | React component |
| Mobile Logging | Not on roadmap | Missing | Should-have | - |
| Real-time (Pusher) | Not on roadmap | Missing | Should-have | Pusher |
| Capacitor App | Not on roadmap | Missing | Nice-to-have | Capacitor |

**V1 has PWA + Capacitor + Pusher. V2 has none (SignalR could replace Pusher).**

---

## 28-32. Additional Modules (All Missing from V2)

| Module | V1 Services | V2 Status |
|--------|-------------|-----------|
| Blog & CMS | 2 services + controllers | Missing |
| Ideation & Campaigns | 4 services | Missing |
| Organizations | OrgWalletService + OrgNotificationService | Missing |
| Deliverables & Project Mgmt | TeamDocumentService, TeamTaskService | Missing |
| Integrations (Gmail, SendGrid, Mailchimp, Meilisearch) | 5+ services | Missing |

---

## Summary Statistics

**Updated 2026-03-07:** Phases 16-37 were scaffolded on 2026-03-06. All feature domains now have code (controllers, services, entities). Status: needs EF migration, integration testing, production hardening.

| Category | Count |
|----------|-------|
| Total Legacy Features | ~250 |
| Done (tested) in ASP.NET | 65 |
| Scaffolded (code exists, needs testing) | ~120 |
| Missing from ASP.NET | ~65 |
| V2 API Endpoints | 339 |
| V2 Controllers | 42 |
| V2 Services | 40 |
| V2 Entities | 91 |

### V1 Services by Module (V2 Comparison)

| Module | V1 Service Count | V2 Service Count | V2 Status |
|--------|-----------------|-----------------|-----------|
| Matching/Algorithms | 19 | 1 | Scaffolded (MatchingService) |
| Groups | 21 | 1 | Scaffolded (GroupFeatureService) |
| Gamification | 20 | 3 | Scaffolded (GamificationService + ChallengeService + DailyRewardService) |
| Federation | 18 | 1 | Scaffolded (FederationService) |
| Volunteering | 11 | 1 | Scaffolded (VolunteerService) |
| Wallet | 10 | 1 | Scaffolded (WalletFeatureService) |
| Listings | 10 | 1 | Scaffolded (ListingFeatureService) |
| Notifications | 9 | 1 | Scaffolded (PushNotificationService) |
| Search | 7 | 1 | Scaffolded (SkillService) |
| Enterprise/GDPR | 7 | 2 | Scaffolded (GdprService + CookieConsentService) |
| Feed | 6 | 1 | Scaffolded (FeedRankingService) |
| User Management | 6 | 0 | Partial (admin endpoints exist) |
| Tenant Management | 5 | 1 | Scaffolded (SystemAdminService) |
| Messaging | 5 | 1 | Done (RealTimeMessagingService) |
| Auth | 5 | 4 | Done (Auth + Passkey + Gmail + Registration) |
| Moderation | 4 | 1 | Scaffolded (ContentReportService) |
| Events | 4 | 0 | Done (EventsController) |
| CRM/Analytics | 10 | 2 | Scaffolded (AdminCrmService + AdminAnalyticsService) |
| Newsletter | 4 | 1 | Scaffolded (NewsletterService) |
| Translation | 0 | 1 | Scaffolded (TranslationService) |
| Location | 0 | 1 | Scaffolded (LocationService) |
| Staffing | 1 | 1 | Scaffolded (PredictiveStaffingService) |
| Exchange | 3 | 1 | Scaffolded (ExchangeService) |
| Reviews/Trust | 3 | 0 | Done (ReviewsController) |
| **Total** | **206** | **40** | **19% coverage** |

---

## Top 30 Missing Features (Prioritized)

### Must-Have (Critical for Production)

| # | Feature | Domain | On Roadmap? | V1 Services |
|---|---------|--------|-------------|-------------|
| 1 | Exchange Workflow | Exchanges | No | 3 services |
| ~~2~~ | ~~Password Reset Email~~ | ~~Auth~~ | ~~DONE~~ | ~~GmailEmailService built~~ |
| 2 | Admin Dashboard (full) | Admin | Partial | 72 controllers |
| 4 | Tenant Management | Super Admin | Yes (Backlog) | 5 services |
| 5 | GDPR Compliance | Enterprise | Yes (Backlog) | 7 services |
| 6 | Federation System | Federation | Yes (Backlog) | 18 services |
| 7 | Federated Transactions | Federation | Yes (Backlog) | FederatedTransactionService |
| 8 | Emergency Lockdown | Super Admin | Yes (Backlog) | - |
| 9 | 3-Layer Feature Gating | Federation | No | FederationFeatureService |
| 10 | Federation JWT | Federation | No | FederationJwtService |

### Should-Have (High Impact)

| # | Feature | Domain | On Roadmap? | V1 Services |
|---|---------|--------|-------------|-------------|
| ~~11~~ | ~~Two-Factor Auth (TOTP)~~ | ~~Auth~~ | ~~DONE~~ | ~~TotpService (5 endpoints)~~ |
| ~~12~~ | ~~WebAuthn/Biometric~~ | ~~Auth~~ | ~~DONE~~ | ~~PasskeyService (7 endpoints)~~ |
| 13 | Avatar/Image Upload | Profiles | Yes (Backlog) | UploadService |
| 14 | Web Push Notifications | Notifications | Yes (Backlog) | 2 services |
| 15 | Volunteering Module | Volunteering | Yes (Backlog) | 11 services |
| 16 | Newsletter System | Admin | No | 4+ services |
| 17 | CRM Dashboard | Admin | No | admin controller |
| 18 | Smart Matching | Algorithms | No | 19 services |
| 19 | Feed Ranking (EdgeRank) | Feed | No | FeedRankingService |
| 20 | Listing Ranking (MatchRank) | Listings | No | ListingRankingService |
| 21 | Email Verification | Auth | No | controller |
| 22 | Vetting & Safeguarding | Admin | No | 2 services |
| 23 | Legal Documents | Enterprise | Yes (Backlog) | LegalDocumentService |
| 24 | Account Deletion (GDPR) | Profiles | Yes (Backlog) | GdprService |
| 25 | User Preferences | Profiles | Yes (Backlog) | - |
| 26 | Event Reminders | Events | No | EventReminderService |
| 27 | Meilisearch Integration | Search | No | SearchService |
| 28 | Jobs Module | Jobs | No | 2 services |
| 29 | Blog/CMS | Content | No | controllers |
| 30 | Organization Wallets | Wallet | No | OrgWalletService |

---

## Implementation Priority Recommendation (Updated)

Based on gap analysis, recommended next phases:

| Phase | Name | Focus Area | Why | V1 Services to Port |
|-------|------|------------|-----|---------------------|
| 16 | Exchange Workflow | Create, track, rate exchanges | Core timebanking feature | 3 |
| 17 | File Uploads | Avatar, listing/group/event images | Blocks UX polish | 1 |
| 18 | GDPR & Compliance | Data export, deletion, consent, legal docs | Legal requirement | 7 |
| ~~19~~ | ~~Two-Factor Auth~~ | ~~TOTP + WebAuthn~~ | ~~DONE~~ | ~~2 (TotpService, PasskeyService)~~ |
| 20 | Push Notifications | Web push (VAPID), FCM | Engagement feature | 4 |
| 21 | Volunteering | Opportunities, hours, shifts, certificates | Domain feature | 11 |
| 22 | Admin Expansion | CRM, newsletter, matching admin, cron jobs | Operational necessity | 10+ |
| 23 | Super Admin | Tenant management, hierarchy, bulk ops | Multi-tenant ops | 5 |
| 24 | Federation | Cross-tenant operations (5 phases) | Platform expansion | 18 |
| 25 | Ranking Algorithms | EdgeRank, MatchRank, CommunityRank | Quality improvement | 5 |
| 26 | Smart Matching | Embeddings, CF, cross-module | Discovery improvement | 19 |
| 27 | Newsletter System | Templates, segments, deliverability | Communication | 4 |
| 28 | Advanced Gamification | Challenges, streaks, seasons, shop | Engagement | 15 |
| 29 | Jobs Module | Vacancies, applications, alerts | Domain feature | 2 |
| 30 | Goals Module | Goals, check-ins, templates | Domain feature | 5 |
| 31 | Polls & Ideation | Polls, idea challenges, campaigns | Community feature | 7 |
| 32 | Blog & CMS | Posts, pages, page builder, resources | Content | 3 |

---

*This document should be updated as features are implemented or roadmap changes.*
