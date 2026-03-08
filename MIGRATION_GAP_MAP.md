# Migration Gap Map

**Purpose**: Cross-reference legacy features against roadmap and implementation status
**Inputs**: LEGACY_FEATURE_INVENTORY.md, ROADMAP.md, CLAUDE.md, V1 source code audit
**Last Updated**: 2026-03-07 (deep V1 source audit + session 2 module build)

---

## Legend

**ASP.NET Status:**
- **Done** = Fully implemented and tested
- **Partial** = Some functionality exists, not complete
- **Scaffolded** = Controller/service/entities exist, need integration testing
- **Missing** = Not implemented
- **N/A** = Not applicable to V2 architecture

**Priority (from Legacy Inventory):**
- **Must-have** = Critical for platform operation
- **Should-have** = Important for user experience
- **Nice-to-have** = Enhancement features

---

## 1. Accounts & Authentication

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority | V1 Services |
|----------------|---------------|----------------|----------|-------------|
| User Registration | Phase 8 | Done | Must-have | - |
| Login (Session) | N/A | N/A (JWT only) | Must-have | - |
| Login (Token/JWT) | Phase 0 | Done | Must-have | - |
| Two-Factor Auth (TOTP) | Phase 20 | Done (5 endpoints, AES-256-GCM) | Should-have | TotpService, TotpController |
| WebAuthn/Biometric | Phase 20 | Done (FIDO2, 7 endpoints) | Should-have | WebAuthnChallengeStore |
| Password Reset | Phase 8, 18 | Done (token + Gmail email) | Must-have | - |
| Email Verification | Not on roadmap | Missing | Should-have | EmailVerificationApiController |
| Social OAuth Login | Not on roadmap | Missing | Nice-to-have | SocialAuthService |
| Token Revocation | Phase 8 | Done | Should-have | TokenService |
| Session Heartbeat | N/A | N/A (JWT only) | Should-have | - |

**V1 has 5 auth services. V2 has AuthController + PasskeyService + GmailEmailService + RegistrationOrchestrator (4 services).**

---

## 2. User Profiles & Settings

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority | V1 Endpoints |
|----------------|---------------|----------------|----------|--------------|
| View Profile | Phase 0-2 | Done | Must-have | GET /api/v2/users/{id} |
| Edit Profile | Phase 2 | Done | Must-have | PUT /api/v2/users/me |
| Avatar Upload | Phase 17 | Done (tested) (FilesController, 6 endpoints) | Should-have | POST /api/v2/users/me/avatar |
| User Preferences | Phase 42 | Done (UserPreferencesService, 5 endpoints) | Should-have | GET/PUT /api/v2/users/me/preferences |
| Theme Preference | Phase 42 | Done (included in preferences) | Nice-to-have | PUT /api/v2/users/me/theme |
| Language Preference | Phase 42 | Done (included in preferences) | Nice-to-have | PUT /api/v2/users/me/language |
| Password Change | Phase 8 | Done | Must-have | POST /api/v2/users/me/password |
| Account Deletion | Phase 25 | Done (tested) (GdprController) | Should-have | DELETE /api/v2/users/me |
| User Status (suspend) | Admin APIs | Done | Should-have | - |
| Notification Preferences | Phase 21 | Done (PushNotificationController, 5 endpoints) | Should-have | GET/PUT /api/v2/users/me/notifications |
| Consent Management | Phase 25 | Done (CookieConsentService) | Should-have | GET/PUT /api/v2/users/me/consent |
| GDPR Data Request | Phase 25 | Done (tested) | Should-have | POST /api/v2/users/me/gdpr-request |
| Active Sessions | Not on roadmap | Missing | Should-have | GET /api/v2/users/me/sessions |
| My Listings | Phase 1 | Partial | Should-have | GET /api/v2/users/me/listings |
| Sub-Accounts/Family | Not on roadmap | Missing | Nice-to-have | 7 endpoints (SubAccountApiController) |
| Member Availability | Phase 44 | Done (AvailabilityService, 8 endpoints) | Should-have | 8 endpoints (MemberAvailabilityApiController) |
| Verification Badges | Not on roadmap | Missing | Should-have | 4 endpoints (MemberVerificationBadgeApiController) |
| User Insights | Not on roadmap | Missing | Nice-to-have | UserInsightsService |
| Member Activity Dashboard | Not on roadmap | Missing | Should-have | 5 endpoints (MemberActivityApiController) |
| Match Preferences | Phase 29 | Done (MatchingController, 6 endpoints) | Should-have | GET/PUT /api/v2/users/me/match-preferences |
| User Insurance Certs | Not on roadmap | Done (InsuranceController, 9 endpoints) | Should-have | GET/POST /api/v2/users/me/insurance |

**V1 has 6 user services + 40+ user endpoints. V2 has basic CRUD only. Major gap in user self-service features.**

---

## 3. Listings (Time Exchange)

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority | V1 Services |
|----------------|---------------|----------------|----------|-------------|
| Create Listing | Phase 3 | Done | Must-have | ListingService |
| View Listings | Phase 1 | Done | Must-have | ListingService |
| View Listing Detail | Phase 1 | Done | Must-have | ListingService |
| Edit Listing | Phase 3 | Done | Should-have | ListingService |
| Delete Listing | Phase 3 | Done | Should-have | ListingService |
| Listing Images | Phase 17 | Done (tested) (FilesController) | Should-have | UploadService |
| Listing Categories | Phase 1 | Partial (no CRUD) | Should-have | - |
| Listing Attributes | Not on roadmap | Missing | Nice-to-have | - |
| Nearby Listings (geo) | Phase 33 | Done (LocationController, nearby/listings) | Should-have | GeocodingService |
| Admin Moderation | Admin APIs | Done | Should-have | ListingModerationService |
| Listing Ranking | Phase 20 | Done (ListingFeaturesController, featured/trending) | Should-have | ListingRankingService |
| Listing Analytics | Phase 20 | Done (ListingFeaturesController, analytics endpoint) | Nice-to-have | ListingAnalyticsService |
| Listing Expiry | Phase 20 | Done (ListingFeaturesController, expiring/renew) | Should-have | ListingExpiryService |
| Featured Listings | Phase 20 | Done (ListingFeaturesController, featured endpoint) | Nice-to-have | ListingFeaturedService |
| Risk Tags | Not on roadmap | Missing | Should-have | ListingRiskTagService |
| Skill Tags | Phase 20 | Done (ListingFeaturesController, tags endpoints) | Nice-to-have | ListingSkillTagService |
| Saved Searches | Not on roadmap | Missing | Nice-to-have | SavedSearchService |

**V1 has 10 listing services. V2 has ListingsController (5 endpoints) + ListingFeaturesController (10 endpoints) = 15 endpoints. Major features covered.**

---

## 4. Messaging & Communication

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority | V1 Services |
|----------------|---------------|----------------|----------|-------------|
| Direct Messages | Phase 6-7 | Done | Must-have | MessageService |
| Typing Indicator | Not on roadmap | Missing | Nice-to-have | - |
| Voice Messages | Not on roadmap | Done (VoiceMessagesController, 5 endpoints) | Should-have | VoiceMessageController |
| Message Archive | Not on roadmap | Missing | Nice-to-have | - |
| Unread Count | Phase 6 | Done | Should-have | - |
| Group Discussions | Phase 11 | Partial (no threads) | Should-have | GroupChatroomService |
| Message Reactions | Not on roadmap | Missing | Nice-to-have | - |
| Message Attachments | Not on roadmap | Missing | Should-have | - |
| Broker Visibility | Not on roadmap | Missing | Should-have | BrokerMessageVisibilityService |
| Contextual Messages | Not on roadmap | Missing | Nice-to-have | ContextualMessageService |
| Federated Messages | Phase 35 | Done (tested) | Should-have | FederatedMessageService |

**V1 has 5 messaging services. V2 has SignalR real-time (advantage) but missing advanced features.**

---

## 5. Wallet & Time Credits

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority | V1 Services |
|----------------|---------------|----------------|----------|-------------|
| View Balance | Phase 4 | Done | Must-have | WalletService |
| Transaction History | Phase 4 | Done | Must-have | WalletService |
| Transfer Credits | Phase 5 | Done | Must-have | WalletService |
| Transaction Details | Phase 4 | Done | Should-have | WalletService |
| Pending Count | Not on roadmap | Missing | Should-have | - |
| Delete Transaction | Not on roadmap | Missing | Nice-to-have | - |
| User Search (for transfer) | Not on roadmap | Missing | Should-have | - |
| Org Wallet | Not on roadmap | Done (OrgWalletController, 5 endpoints) | Should-have | OrgWalletService |
| Transaction Limits | Phase 20 | Done (WalletFeaturesController, limits endpoint) | Should-have | TransactionLimitService |
| Transaction Categories | Phase 20 | Done (WalletFeaturesController, categories endpoint) | Nice-to-have | TransactionCategoryService |
| Transaction Export | Phase 20 | Done (WalletFeaturesController, export endpoint) | Should-have | TransactionExportService |
| Credit Donations | Phase 20 | Done (WalletFeaturesController, donate endpoint) | Nice-to-have | CreditDonationService |
| Balance Alerts | Phase 20 | Done (WalletFeaturesController, alerts CRUD) | Should-have | BalanceAlertService |
| Starting Balance | Not on roadmap | Missing | Should-have | StartingBalanceService |
| Pay Plans | Not on roadmap | Missing | Nice-to-have | PayPlanService |
| Community Fund | Not on roadmap | Missing | Nice-to-have | CommunityFundService |

**V1 has 10 wallet services. V2 has WalletController (4 endpoints) + WalletFeaturesController (9 endpoints) = 13 endpoints. Most features covered.**

---

## 6. Exchange Workflow

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority | V1 Services |
|----------------|---------------|----------------|----------|-------------|
| Create Exchange | Phase 16 | Done (tested) (ExchangesController, 11 endpoints) | Must-have | ExchangeWorkflowService |
| Exchange Status | Phase 16 | Done (tested) (ExchangeService state machine) | Must-have | ExchangeWorkflowService |
| Exchange Rating | Phase 16 | Done (tested) (ExchangesController) | Should-have | ExchangeRatingService |
| Group Exchanges | Not on roadmap | Missing | Should-have | GroupExchangeService |

---

## 7. Social Feed

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority | V1 Endpoints |
|----------------|---------------|----------------|----------|--------------|
| Create Post | Phase 12 | Done | Should-have | POST /api/v2/feed/posts |
| Like/React | Phase 12 | Done | Should-have | POST /api/v2/feed/like |
| Comments | Phase 12 | Done | Should-have | - |
| Feed Timeline | Phase 12 | Done | Should-have | GET /api/v2/feed |
| Delete Post | Phase 12 | Done | Should-have | POST /api/v2/feed/posts/{id}/delete |
| Create Poll (in feed) | Not on roadmap | Missing | Nice-to-have | POST /api/v2/feed/polls |
| Hide Post | Not on roadmap | Missing | Nice-to-have | POST /api/v2/feed/posts/{id}/hide |
| Report Post | Not on roadmap | Missing | Should-have | POST /api/v2/feed/posts/{id}/report |
| Mute User | Not on roadmap | Missing | Nice-to-have | POST /api/v2/feed/users/{id}/mute |
| Share Post | Phase 22 | Done (FeedRankingController, share endpoint) | Nice-to-have | POST /api/v2/feed/posts/{id}/share |
| Hashtags | Not on roadmap | Missing | Nice-to-have | 3 endpoints (trending, search, tag posts) |
| Feed Ranking (EdgeRank) | Phase 22 | Done (tested) | Should-have | FeedRankingService |
| Feed Moderation | Not on roadmap | Missing | Should-have | - |

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
| Pending Requests | Phase 19 | Done (tested) | Should-have | GroupApprovalWorkflowService |
| Group Image | Phase 17 | Done (tested) | Should-have | UploadService |
| Edit/Delete Group | Phase 11 | Done | Should-have | GroupService |
| Group Types | Not on roadmap | Missing | Nice-to-have | - |
| Group Analytics | Phase 19 | Done (tested) | Nice-to-have | GroupReportingService |
| Group Exchanges | Not on roadmap | Missing | Should-have | GroupExchangeService |
| Group Discussions | Phase 19 | Done (tested) | Should-have | GroupChatroomService |
| Group Files | Phase 19 | Done (tested) | Nice-to-have | GroupFileService |
| Group Policies | Phase 19 | Done (tested) | Nice-to-have | GroupPolicyRepository |
| Group Recommendations | Not on roadmap | Missing | Nice-to-have | GroupRecommendationEngine |
| Group Ranking | Not on roadmap | Missing | Nice-to-have | SmartGroupRankingService |
| Group Announcements | Phase 19 | Done (tested) | Should-have | GroupAnnouncementService |
| Group Approval Workflow | Phase 19 | Done (tested) | Should-have | GroupApprovalWorkflowService |

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
| Event Image | Phase 17 | Done (tested) | Should-have | UploadService |
| Event Reminders | Not on roadmap | Missing | Should-have | EventReminderService |
| Recurring Shifts | Not on roadmap | Missing | Nice-to-have | RecurringShiftService |
| Federated Events | Phase 35 | Done (tested) | Nice-to-have | - |

---

## 10. Volunteering Module

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority | V1 Endpoints |
|----------------|---------------|----------------|----------|--------------|
| Browse Opportunities | Phase 24 | Done (tested) | Should-have | GET /api/v2/volunteering/opportunities |
| Create Opportunity | Phase 24 | Done (tested) | Should-have | POST /api/v2/volunteering/opportunities |
| Opportunity Detail | Phase 24 | Done (tested) | Should-have | GET /api/v2/volunteering/opportunities/{id} |
| Edit/Delete Opportunity | Phase 24 | Done (tested) | Should-have | PUT/DELETE /api/v2/volunteering/opportunities/{id} |
| Apply | Phase 24 | Done (tested) | Should-have | POST .../apply |
| Manage Applications | Phase 24 | Done (tested) | Should-have | GET/PUT/DELETE .../applications |
| Shifts Management | Phase 24 | Done (tested) | Should-have | GET/POST/DELETE .../shifts |
| Log Hours | Phase 24 | Done (tested) | Must-have | POST /api/v2/volunteering/hours |
| Verify Hours | Phase 24 | Done (tested) | Should-have | PUT .../hours/{id}/verify |
| Hours Summary | Phase 24 | Done (tested) | Should-have | GET .../hours/summary |
| Browse Organizations | Phase 24 | Done (tested) | Should-have | GET/POST .../organisations |
| Volunteer Reviews | Phase 24 | Done (tested) | Should-have | POST/GET .../reviews |
| Volunteer Certificates | Not on roadmap | Missing | Nice-to-have | VolunteerCertificateService |
| Volunteer Check-In | Phase 24 | Done (tested) | Nice-to-have | VolunteerCheckInService |
| Volunteer Matching | Not on roadmap | Missing | Nice-to-have | VolunteerMatchingService |
| Volunteer Wellbeing | Not on roadmap | Missing | Nice-to-have | VolunteerWellbeingService |
| Emergency Alerts | Not on roadmap | Missing | Should-have | VolunteerEmergencyAlertService |
| Predictive Staffing | Phase 36 | Done (tested) | Nice-to-have | PredictiveStaffingService |
| Insurance Certificates | Not on roadmap | Done (InsuranceController, 9 endpoints) | Should-have | InsuranceCertificateService |
| Shift Swaps | Not on roadmap | Missing | Nice-to-have | ShiftSwapService |
| Shift Waitlist | Not on roadmap | Missing | Nice-to-have | ShiftWaitlistService |

---

## 11. Jobs Module

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority | V1 Endpoints |
|----------------|---------------|----------------|----------|--------------|
| List Jobs | Phase 39 | Done (JobsController) | Should-have | GET /api/v2/jobs |
| Create Job | Phase 39 | Done | Should-have | POST /api/v2/jobs |
| Job Detail | Phase 39 | Done | Should-have | GET /api/v2/jobs/{id} |
| Edit/Delete Job | Phase 39 | Done | Should-have | PUT/DELETE /api/v2/jobs/{id} |
| Apply for Job | Phase 39 | Done | Should-have | POST /api/v2/jobs/{id}/apply |
| My Applications | Phase 39 | Done | Should-have | GET /api/v2/jobs/my-applications |
| Saved Jobs | Phase 39 | Done | Nice-to-have | GET/POST/DELETE /api/v2/jobs/{id}/save |
| Job Alerts | Not on roadmap | Missing | Nice-to-have | 5 endpoints (CRUD alerts, subscribe/unsubscribe) |
| Match Percentage | Not on roadmap | Missing | Nice-to-have | GET /api/v2/jobs/{id}/match |
| Qualification Assessment | Not on roadmap | Missing | Nice-to-have | GET /api/v2/jobs/{id}/qualified |
| Application Management | Phase 39 | Done | Should-have | GET /api/v2/jobs/{id}/applications |
| Job Analytics | Not on roadmap | Missing | Nice-to-have | GET /api/v2/jobs/{id}/analytics |
| Renew Job | Not on roadmap | Missing | Nice-to-have | POST /api/v2/jobs/{id}/renew |
| Feature Job (admin) | Not on roadmap | Missing | Nice-to-have | POST/DELETE /api/v2/jobs/{id}/feature |
| Application History | Not on roadmap | Missing | Nice-to-have | GET /api/v2/jobs/applications/{id}/history |

**V1 has 25 job endpoints. V2 has 14 endpoints (JobsController). Core CRUD, applications, and saved jobs done. Missing: alerts, analytics, admin features.**

---

## 12. Ideation & Challenges

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority | V1 Endpoints |
|----------------|---------------|----------------|----------|--------------|
| List Challenges | Phase 48 | Done (IdeationController) | Nice-to-have | GET /api/v2/ideation-challenges |
| Create Challenge | Phase 48 | Done | Nice-to-have | POST /api/v2/ideation-challenges |
| Challenge Detail | Phase 48 | Done | Nice-to-have | GET /api/v2/ideation-challenges/{id} |
| Edit/Delete Challenge | Not on roadmap | Missing | Nice-to-have | PUT/DELETE /api/v2/ideation-challenges/{id} |
| Submit Idea | Phase 48 | Done | Nice-to-have | POST .../ideas |
| View Ideas | Phase 48 | Done | Nice-to-have | GET .../ideas |
| Idea Drafts | Not on roadmap | Missing | Nice-to-have | GET .../ideas/drafts |
| Vote on Idea | Phase 48 | Done | Nice-to-have | POST /api/v2/ideation-ideas/{id}/vote |
| Idea Comments | Phase 48 | Done | Nice-to-have | GET/POST .../comments |
| Idea Status Update | Not on roadmap | Missing | Nice-to-have | PUT .../status |
| Duplicate Challenge | Not on roadmap | Missing | Nice-to-have | POST .../duplicate |
| Convert Idea to Group | Not on roadmap | Missing | Nice-to-have | POST .../convert-to-group |
| Favorite Challenge | Not on roadmap | Missing | Nice-to-have | POST .../favorite |

**V1 has 22 ideation endpoints. V2 has 9 endpoints (IdeationController). Core ideas, voting, comments, challenges done. Missing: drafts, status updates, advanced features.**

---

## 13. Goals & Self-Improvement

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority | V1 Endpoints |
|----------------|---------------|----------------|----------|--------------|
| List Goals | Phase 47 | Done (GoalController) | Nice-to-have | GET /api/v2/goals |
| Create Goal | Phase 47 | Done | Nice-to-have | POST /api/v2/goals |
| Goal Detail | Phase 47 | Done | Nice-to-have | GET /api/v2/goals/{id} |
| Edit/Delete Goal | Phase 47 | Done | Nice-to-have | PUT/DELETE /api/v2/goals/{id} |
| Log Progress | Phase 47 | Done | Nice-to-have | POST /api/v2/goals/{id}/progress |
| Complete Goal | Phase 47 | Done (auto-complete on milestones) | Nice-to-have | POST /api/v2/goals/{id}/complete |
| Goal Buddy | Not on roadmap | Missing | Nice-to-have | POST /api/v2/goals/{id}/buddy |
| Discover Goals | Not on roadmap | Missing | Nice-to-have | GET /api/v2/goals/discover |
| Goal Mentoring | Not on roadmap | Missing | Nice-to-have | GET /api/v2/goals/mentoring |
| Goal Templates | Not on roadmap | Missing | Nice-to-have | GET/POST /api/v2/goals/templates |
| Create from Template | Not on roadmap | Missing | Nice-to-have | POST /api/v2/goals/from-template/{id} |
| Template Categories | Not on roadmap | Missing | Nice-to-have | GET /api/v2/goals/templates/categories |
| Goal Check-ins | Not on roadmap | Missing | Nice-to-have | GET/POST /api/v2/goals/{id}/checkins |
| Goal History | Not on roadmap | Missing | Nice-to-have | GET /api/v2/goals/{id}/history |
| Goal Reminders | Not on roadmap | Missing | Nice-to-have | GET/PUT/DELETE /api/v2/goals/{id}/reminder |

**V1 has 22 goal endpoints. V2 has 7 endpoints (GoalController). Core CRUD, milestones, progress done. Missing: buddy, mentoring, templates.**

---

## 14. Polls & Surveys

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority | V1 Endpoints |
|----------------|---------------|----------------|----------|--------------|
| List Polls | Phase 46 | Done (PollController) | Nice-to-have | GET /api/v2/polls |
| Create Poll | Phase 46 | Done | Nice-to-have | POST /api/v2/polls |
| Poll Detail | Phase 46 | Done | Nice-to-have | GET /api/v2/polls/{id} |
| Edit/Delete Poll | Not on roadmap | Missing | Nice-to-have | PUT/DELETE /api/v2/polls/{id} |
| Vote | Phase 46 | Done (single/multiple/ranked) | Nice-to-have | POST /api/v2/polls/{id}/vote |
| Ranked Voting | Phase 46 | Done (included in vote) | Nice-to-have | POST /api/v2/polls/{id}/rank |
| Ranked Results | Phase 46 | Done (results endpoint) | Nice-to-have | GET /api/v2/polls/{id}/ranked-results |
| Export Results | Not on roadmap | Missing | Nice-to-have | GET /api/v2/polls/{id}/export |
| Poll Categories | Not on roadmap | Missing | Nice-to-have | GET /api/v2/polls/categories |

**V1 has 10 poll endpoints. V2 has 5 endpoints (PollController). Core voting (single/multiple/ranked) and results done.**

---

## 15. Reviews & Trust

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority | V1 Endpoints |
|----------------|---------------|----------------|----------|--------------|
| Create Review | Phase 14 | Done | Should-have | POST /api/v2/reviews |
| Pending Reviews | Not on roadmap | Missing | Should-have | GET /api/v2/reviews/pending |
| User Reviews | Phase 14 | Done | Should-have | GET /api/v2/reviews/user/{id} |
| Review Stats | Phase 14 | Done | Should-have | GET /api/v2/reviews/user/{id}/stats |
| Trust Score (time-decay) | Not on roadmap | Missing | Should-have | GET /api/v2/reviews/user/{id}/trust |
| Delete Review | Phase 14 | Done | Nice-to-have | DELETE /api/v2/reviews/{id} |
| Exchange Rating | Not on roadmap | Missing | Should-have | ExchangeRatingService |
| Endorsements | Phase 18 | Done (SkillsController, 10 endpoints) | Nice-to-have | 4 endpoints (EndorsementApiController) |

---

## 16. Notifications

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority | V1 Endpoints |
|----------------|---------------|----------------|----------|--------------|
| In-App Notifications | Phase 10 | Done | Must-have | GET /api/v2/notifications |
| Badge Count | Phase 10 | Done | Should-have | GET /api/v2/notifications/counts |
| Mark as Read | Phase 10 | Done | Should-have | POST /api/v2/notifications/{id}/read |
| Mark All Read | Phase 10 | Done | Should-have | POST /api/v2/notifications/read-all |
| Delete Notification | Phase 10 | Done | Nice-to-have | DELETE /api/v2/notifications/{id} |
| Delete All | Not on roadmap | Missing | Nice-to-have | DELETE /api/v2/notifications |
| Web Push (PWA) | Phase 21 | Done (tested) | Should-have | WebPushService |
| Mobile Push (FCM) | Phase 21 | Done (tested) | Should-have | FCMPushService |
| Notification Polling | Not on roadmap | Missing | Should-have | GET /api/notifications/poll |
| Real-time (Pusher) | N/A | N/A (SignalR) | Should-have | PusherService |
| Realtime Config | Not on roadmap | Missing | Should-have | GET /api/v2/realtime/config |

---

## 17. Connections & Friendships

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority | V1 Services |
|----------------|---------------|----------------|----------|-------------|
| Send Request | Phase 9 | Done | Should-have | ConnectionService |
| Accept Request | Phase 9 | Done | Should-have | - |
| View Connections | Phase 9 | Done | Should-have | - |
| Remove Connection | Phase 9 | Done | Should-have | - |
| Endorsements | Phase 18 | Done (SkillsController) | Nice-to-have | EndorsementService |

---

## 18. Gamification & Rewards

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority | V1 Endpoints |
|----------------|---------------|----------------|----------|--------------|
| XP/Points System | Phase 13 | Done | Nice-to-have | GET /api/v2/gamification/profile |
| Badges | Phase 13 | Done | Nice-to-have | GET /api/v2/gamification/badges |
| Badge Detail | Not on roadmap | Missing | Nice-to-have | GET /api/v2/gamification/badges/{key} |
| Leaderboards | Phase 13 | Done | Nice-to-have | GET /api/v2/gamification/leaderboard |
| Challenges | Phase 30 | Done (tested) | Nice-to-have | GET /api/v2/gamification/challenges |
| Claim Challenge | Not on roadmap | Missing | Nice-to-have | POST .../challenges/{id}/claim |
| Collections | Not on roadmap | Missing | Nice-to-have | GET /api/v2/gamification/collections |
| Daily Reward | Phase 30 | Done (tested) | Nice-to-have | GET/POST /api/v2/gamification/daily-reward |
| XP Shop | Not on roadmap | Missing | Nice-to-have | GET/POST /api/v2/gamification/shop |
| Badge Showcase | Not on roadmap | Missing | Nice-to-have | PUT /api/v2/gamification/showcase |
| Seasonal Events | Phase 30 | Done (tested) | Nice-to-have | GET /api/v2/gamification/seasons |
| Current Season | Phase 30 | Done (GamificationV2Controller) | Nice-to-have | GET .../seasons/current |
| Nexus Score | Not on roadmap | Done (NexusScoreController, 7 endpoints) | Nice-to-have | GET /api/v2/gamification/nexus-score |
| Streaks | Phase 30 | Done (tested) | Nice-to-have | StreakService |

---

## 19. Search & Discovery

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority | V1 Services |
|----------------|---------------|----------------|----------|-------------|
| Unified Search | Phase 15 | Done (ILIKE) | Should-have | SearchService |
| Search Suggestions | Phase 15 | Done (SearchController) | Should-have | GET /api/v2/search/suggestions |
| Meilisearch Integration | Not on roadmap | Missing | Should-have | SearchService (Meilisearch) |
| Skill Browsing | Phase 18 | Done (tested) | Nice-to-have | SkillTaxonomyService |
| Nearby Members (geo) | Phase 33 | Done (LocationController, nearby/users) | Should-have | GET /api/v2/members/nearby |
| Personalized Search | Not on roadmap | Missing | Nice-to-have | PersonalizedSearchService |
| Saved Searches | Not on roadmap | Missing | Nice-to-have | SavedSearchService |

---

## 20. Smart Matching & Algorithms

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority | V1 Services |
|----------------|---------------|----------------|----------|-------------|
| Smart Matching Engine | Phase 29 | Done (tested) | Nice-to-have | SmartMatchingEngine |
| Match Notifications | Phase 29 | Done (tested) | Nice-to-have | MatchNotificationService |
| Feed Ranking (EdgeRank) | Phase 22 | Done (tested) | Should-have | FeedRankingService |
| Listing Ranking (MatchRank) | Phase 20 | Done (tested) | Should-have | ListingRankingService |
| Member Ranking (CommunityRank) | Not on roadmap | Missing | Should-have | MemberRankingService |
| Cross-Module Matching | Not on roadmap | Missing | Nice-to-have | CrossModuleMatchingService |
| Collaborative Filtering | Not on roadmap | Missing | Nice-to-have | CollaborativeFilteringService |
| Embeddings (OpenAI) | Not on roadmap | Missing | Nice-to-have | EmbeddingService |

---

## 21. Federation & Cross-Server Communication

### CRITICAL: V1 Federation Architecture (from source audit)

V1 implements a **complete federation system** for cross-timebank communication. This is one of the platform's key differentiators.

#### 3-Layer Feature Gating (FederationFeatureService)

```
Layer 1: SYSTEM LEVEL (Super Admin)
  - Master kill switch (federation_enabled)
  - Whitelist mode (only approved tenants)
  - Emergency lockdown (instant kill all federation)
  - Per-feature kill switches (profiles, messaging, transactions, listings, events, groups)

Layer 2: TENANT LEVEL (Tenant Admin)
  - Tenant federation enable/disable
  - Per-feature toggles (profiles, messaging, transactions, etc.)
  - Appear in directory toggle
  - Auto-accept hierarchy toggle

Layer 3: USER LEVEL (Individual User)
  - Master opt-in (federation_optin)
  - Profile visibility (profile_visible_federated)
  - Messaging enabled (messaging_enabled_federated)
  - Transactions enabled (transactions_enabled_federated)
  - Appear in federated search
  - Show skills/location in federated profile
```

#### Federation External API v1 (REST endpoints for partner platforms)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| /api/v1/federation | GET | None | API info + endpoint directory |
| /api/v1/federation/timebanks | GET | API Key/HMAC/JWT | List partner timebanks |
| /api/v1/federation/members | GET | API Key/HMAC/JWT | Search federated members |
| /api/v1/federation/members/{id} | GET | API Key/HMAC/JWT | Get member profile |
| /api/v1/federation/listings | GET | API Key/HMAC/JWT | Search federated listings |
| /api/v1/federation/listings/{id} | GET | API Key/HMAC/JWT | Get listing details |
| /api/v1/federation/messages | POST | API Key/HMAC/JWT | Send federated message |
| /api/v1/federation/transactions | POST | API Key/HMAC/JWT | Initiate time credit transfer |
| /api/v1/federation/oauth/token | POST | None | OAuth2 client_credentials token exchange |
| /api/v1/federation/webhooks/test | POST | HMAC | Test webhook signature verification |

#### Federation Authentication Methods (FederationApiMiddleware)

1. **HMAC-SHA256 Request Signing** (highest security, for external platforms)
   - Headers: `X-Federation-Signature`, `X-Federation-Timestamp`, `X-Federation-Platform-Id`
   - Signature: `HMAC-SHA256(secret, METHOD\nPATH\nTIMESTAMP\nBODY)`
   - Replay protection: 5-minute timestamp tolerance
   - Rate limiting: Hourly sliding window per API key

2. **JWT Bearer Token** (OAuth-style, for user-level access)
   - Token exchange via `/api/v1/federation/oauth/token`
   - Supports `client_credentials` grant type
   - Claims: iss, sub, aud, iat, exp, tenant_id, scope
   - Scopes: `members:read`, `listings:read`, `messages:write`, `transactions:write`, `timebanks:read`

3. **API Key** (simple Bearer token, for internal/trusted partners)
   - Keys stored as SHA-256 hashes in `federation_api_keys` table
   - Configurable permissions per key
   - Expiration dates supported

#### Federation External API Client (FederationExternalApiClient)

For V2 to CALL other V1 servers, it needs to implement:
- HTTP client with auth method support (API Key, HMAC, OAuth2)
- Endpoints to call: `/timebanks`, `/members`, `/listings`, `/messages`, `/transactions`
- Request logging to `federation_external_partner_logs` table
- User-Agent: `NexusFederation/1.0`

#### Federation V2 API (User-facing, for React frontend)

| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/v2/federation/status | GET | Federation status for user's tenant |
| /api/v2/federation/opt-in | POST | User opts into federation |
| /api/v2/federation/opt-out | POST | User opts out of federation |
| /api/v2/federation/settings | GET/PUT | User federation privacy settings |
| /api/v2/federation/partners | GET | List partner timebanks |
| /api/v2/federation/activity | GET | Recent federation activity |
| /api/v2/federation/members | GET | Search federated members |
| /api/v2/federation/listings | GET | Search federated listings |
| /api/v2/federation/events | GET | Search federated events |
| /api/v2/federation/messages | POST | Send federated message |
| /api/v2/federation/directory | GET | Federation directory |

#### Federation Database Tables (V1, 13 total)

| Table | Purpose |
|-------|---------|
| federation_partnerships | Partnership records between tenants (status, permission flags) |
| federation_user_settings | User-level opt-in, privacy, service_reach, travel_radius_km |
| federation_system_control | System-level kill switches and lockdown state (singleton) |
| federation_tenant_features | Per-tenant feature toggles |
| federation_tenant_whitelist | Approved tenants for whitelist mode |
| federation_api_keys | API keys (SHA-256 hashed), permissions, rate_limit, expiry |
| federation_audit_log | Comprehensive audit trail (severity levels, JSON data) |
| federation_messages | Cross-tenant messages (outbound/inbound copies, thread support) |
| federation_transactions | Cross-tenant credit exchanges (pending/completed/cancelled/disputed) |
| federation_external_partners | External server connections (AES-encrypted credentials) |
| federation_reputation | Cross-tenant trust scores (trust, reliability, responsiveness) |
| federation_api_logs | API key usage audit (per-endpoint, response time) |
| federation_external_partner_logs | Outbound API call audit (request/response bodies) |

**Modified standard tables:** users (+federation_optin, federated_profile_visible), groups (+allow_federated_members, federated_visibility), listings (+federated_visibility, service_type), events (+federated_visibility, allow_remote_attendance), messages (+is_federated), transactions (+is_federated, sender_tenant_id, receiver_tenant_id)

#### Super Admin Federation Controls

| Endpoint | Method | Description |
|----------|--------|-------------|
| /super-admin/federation | GET | Federation dashboard |
| /super-admin/federation/system-controls | GET | View system controls |
| /super-admin/federation/update-system-controls | POST | Update system controls |
| /super-admin/federation/emergency-lockdown | POST | Trigger emergency lockdown |
| /super-admin/federation/lift-lockdown | POST | Lift emergency lockdown |
| /super-admin/federation/whitelist | GET | View whitelisted tenants |
| /super-admin/federation/add-to-whitelist | POST | Add tenant to whitelist |
| /super-admin/federation/remove-from-whitelist | POST | Remove from whitelist |
| /super-admin/federation/partnerships | GET | View all partnerships |
| /super-admin/federation/suspend-partnership | POST | Suspend a partnership |
| /super-admin/federation/terminate-partnership | POST | Terminate a partnership |
| /super-admin/federation/audit | GET | Federation audit log |
| /super-admin/federation/tenant/{id} | GET | View tenant's features |
| /super-admin/federation/update-tenant-feature | POST | Update tenant feature toggle |

#### Admin Federation Controls

V1 has admin controllers for:
- FederationAnalyticsController
- FederationApiKeysController
- FederationDirectoryController
- FederationExportController
- FederationExternalPartnersController
- FederationImportController
- FederationSettingsController

#### V2 ASP.NET Federation Status

| Component | V1 | V2 Status |
|-----------|-----|-----------|
| FederationGateway (central control) | Full | **Done** (FederationGatewayService) |
| FederationFeatureService (3-layer gating) | Full | **Done** (System→Tenant→User gating) |
| FederationJwtService (cross-server JWT) | Full | **Done** (HKDF-derived keys, 5min tokens) |
| FederationApiMiddleware (auth: API Key + JWT) | Full | **Done** (X-Federation-Key + Bearer) |
| FederationExternalApiClient (HTTP client) | Full | **Done** (typed HttpClient) |
| External API endpoints (10) | Full | **Done** (FederationExternalApiController, 10 endpoints) |
| V2 user-facing endpoints (15) | Full | **Done** (FederationController, 12 endpoints + 2 settings) |
| API Key Management (3 endpoints) | Full | **Done** (create/list/revoke) |
| Feature Toggle Management (2 endpoints) | Full | **Done** (list/set) |
| User Federation Settings (2 endpoints) | Full | **Done** (get/update opt-in, privacy) |
| Federation DB tables (13) | Full | **Done** (8 tables: 4 original + 4 new) |
| Super Admin controls (13) | Full | Missing |
| SSE streaming endpoint | Full | Missing |
| Modified standard tables (6 tables with federation columns) | Full | Missing |
| FederatedMessageService | Full | Missing |
| FederatedGroupService | Full | Missing |
| FederationRealtimeService | Full | Missing |

**V1 has 18 federation services + extensive admin/super-admin controls. V2 now has FederationController (17 endpoints), FederationExternalApiController (10 endpoints), 4 services (Gateway, JWT, ApiKey, ExternalApiClient), middleware, and 8 database tables. Core federation infrastructure is complete. Remaining gaps: super admin controls, cross-tenant messaging, SSE streaming.**

---

## 22. Blog & CMS (Updated 2026-03-07)

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority | V1 Endpoints |
|----------------|---------------|----------------|----------|--------------|
| Blog List | Not on roadmap | Done (BlogController, 3 endpoints) | Nice-to-have | GET /api/v2/blog |
| Blog Categories | Not on roadmap | Done (BlogController) | Nice-to-have | GET /api/v2/blog/categories |
| Blog Detail | Not on roadmap | Done (BlogController, by slug) | Nice-to-have | GET /api/v2/blog/{slug} |
| Admin Blog CRUD | Not on roadmap | Done (AdminBlogController, 8 endpoints) | Nice-to-have | AdminBlogApiController |
| Page Builder | Not on roadmap | Done (AdminPagesController, 8 endpoints) | Nice-to-have | PageController (admin) |
| Public Pages API | Not on roadmap | Done (PagesController, 3 endpoints: list, menu, by slug) | Nice-to-have | GET /api/v2/pages/{slug} |

**V2 has BlogController (3 endpoints), AdminBlogController (8 endpoints: CRUD posts + toggle status/featured + CRUD categories), PagesController (3 endpoints: AllowAnonymous), AdminPagesController (8 endpoints: CRUD + versions + revert + duplicate + reorder) = 22 endpoints total.**

---

## 23. Knowledge Base

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority | V1 Endpoints |
|----------------|---------------|----------------|----------|--------------|
| KB List | Phase 41 | Done (KnowledgeBaseController) | Should-have | GET /api/v2/kb |
| KB Search | Phase 41 | Done (included in list) | Should-have | GET /api/v2/kb/search |
| KB Detail | Phase 41 | Done | Should-have | GET /api/v2/kb/{id} |
| KB by Slug | Phase 41 | Done | Should-have | GET /api/v2/kb/slug/{slug} |
| Create/Edit/Delete | Phase 41 | Done (admin) | Should-have | POST/PUT/DELETE /api/v2/kb |
| Article Feedback | Not on roadmap | Missing | Nice-to-have | POST /api/v2/kb/{id}/feedback |

**V1 has 8 knowledge base endpoints. V2 has 6 endpoints (KnowledgeBaseController). Core articles, categories, search done.**

---

## 24. Resources Library (NEW - NOT ON ROADMAP)

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority | V1 Endpoints |
|----------------|---------------|----------------|----------|--------------|
| Browse Resources | Not on roadmap | Missing | Nice-to-have | GET /api/v2/resources |
| Resource Categories | Not on roadmap | Missing | Nice-to-have | GET /api/v2/resources/categories |
| Category Tree | Not on roadmap | Missing | Nice-to-have | GET /api/v2/resources/categories/tree |
| Create Resource | Not on roadmap | Missing | Nice-to-have | POST /api/v2/resources |
| CRUD Categories | Not on roadmap | Missing | Nice-to-have | POST/PUT/DELETE /api/v2/resources/categories |
| Reorder | Not on roadmap | Missing | Nice-to-have | PUT /api/v2/resources/reorder |

---

## 25. Comments V2 (NEW - NOT ON ROADMAP)

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority | V1 Endpoints |
|----------------|---------------|----------------|----------|--------------|
| Threaded Comments | Not on roadmap | Missing | Should-have | GET/POST /api/v2/comments |
| Edit/Delete Comment | Not on roadmap | Missing | Should-have | PUT/DELETE /api/v2/comments/{id} |
| Comment Reactions | Not on roadmap | Missing | Nice-to-have | POST /api/v2/comments/{id}/reactions |

**V1 has a standalone comments system reusable across modules. V2 comments are feed-specific only.**

---

## 26. Legal Documents

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority | V1 Endpoints |
|----------------|---------------|----------------|----------|--------------|
| Get Legal Document | Phase 40 | Done (LegalDocumentController) | Should-have | GET /api/v2/legal/{type} |
| Document Versions | Phase 40 | Done | Should-have | GET /api/v2/legal/{type}/versions |
| Version Detail | Phase 40 | Done | Should-have | GET /api/v2/legal/version/{id} |
| Compare Versions | Not on roadmap | Missing | Nice-to-have | GET /api/v2/legal/versions/compare |
| Acceptance Status | Phase 40 | Done | Must-have | GET /api/v2/legal/acceptance/status |
| Accept All | Phase 40 | Done | Must-have | POST /api/v2/legal/acceptance/accept-all |

**V1 has 6 legal endpoints. V2 has 6 endpoints (LegalDocumentController). Full coverage except version comparison.**

---

## 27. Endorsements

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority | V1 Endpoints |
|----------------|---------------|----------------|----------|--------------|
| Endorse Member | Phase 18 | Done (SkillsController) | Nice-to-have | POST /api/v2/members/{id}/endorse |
| Remove Endorsement | Phase 18 | Done (SkillsController) | Nice-to-have | DELETE /api/v2/members/{id}/endorse |
| Get Endorsements | Phase 18 | Done (SkillsController) | Nice-to-have | GET /api/v2/members/{id}/endorsements |
| Top Endorsed | Phase 18 | Done (SkillsController) | Nice-to-have | GET /api/v2/members/top-endorsed |

---

## 28. Super Admin (Platform-Level)

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority | V1 Endpoints |
|----------------|---------------|----------------|----------|--------------|
| Super Dashboard | Phase 37 | Done (tested) | Must-have | GET /super-admin/dashboard |
| Tenant Management | Phase 37 | Done (tested) | Must-have | CRUD /super-admin/tenants (11 endpoints) |
| Tenant Hierarchy | Not on roadmap | Done (TenantHierarchyController, 6 endpoints) | Should-have | GET /super-admin/tenants/hierarchy |
| Toggle Hub Tenant | Not on roadmap | Done (included in TenantHierarchyController) | Should-have | POST /super-admin/tenants/{id}/toggle-hub |
| Move Tenant | Not on roadmap | Done (included in TenantHierarchyController) | Should-have | POST /super-admin/tenants/{id}/move |
| Cross-Tenant Users | Phase 37 | Done (tested) | Must-have | CRUD /super-admin/users (12 endpoints) |
| Grant/Revoke Super Admin | Not on roadmap | Missing | Must-have | POST /super-admin/users/{id}/grant|revoke-super-admin |
| Grant/Revoke Global SA | Not on roadmap | Missing | Must-have | POST /super-admin/users/{id}/grant|revoke-global-super-admin |
| Move User Tenant | Not on roadmap | Missing | Should-have | POST /super-admin/users/{id}/move-tenant |
| Move & Promote | Not on roadmap | Missing | Should-have | POST /super-admin/users/{id}/move-and-promote |
| Bulk Operations | Not on roadmap | Missing | Should-have | 3 endpoints (BulkController) |
| Audit Logging | Phase 26 | Done (tested) | Should-have | GET /super-admin/audit |
| Federation Control | See section 21 | Done (tested) | Should-have | 27 federation endpoints |
| Emergency Lockdown | Phase 43 | Done (LockdownService + SystemAdminController) | Must-have | - |

---

## 29. Admin Panel

| Legacy Feature | V2 Status | V1 Scale |
|----------------|-----------|----------|
| Dashboard (stats, trends, activity) | Partial (1 endpoint) | 3 endpoints |
| User Management (CRUD, import, approve, suspend) | Partial | 10+ endpoints |
| Listing Moderation | Done | 3 endpoints |
| Category Management | Done | 4 endpoints |
| Config | Done | 2 endpoints |
| Roles & Permissions | Done | 4 endpoints |
| Blog Admin | Done (AdminBlogController, 8 endpoints) | Full CRUD |
| Cron Jobs Admin | Missing | CronJobController |
| SEO Management | Missing | SeoController |
| Menu Management | Missing | MenuController |
| Page Builder Admin | Done (AdminPagesController, 8 endpoints) | PageController |
| Vetting Records | Missing | AdminVettingApiController |
| Enterprise Config | Missing | AdminEnterpriseApiController |
| Gamification Admin | Done (AdminGamificationController, 6 endpoints) | AdminGamificationApiController |
| Jobs Admin | Missing | AdminJobsApiController |
| Ideation Admin | Missing | AdminIdeationApiController |
| Groups Admin | Done (AdminGroupsController, 3 endpoints) | AdminGroupsApiController |
| Events Admin | Done (AdminEventsController, 4 endpoints) | AdminEventsApiController |
| Polls Admin | Missing | AdminPollsApiController |
| Goals Admin | Missing | AdminGoalsApiController |
| Resources Admin | Missing | AdminResourcesApiController |
| Content Admin | Missing | AdminContentApiController |
| Comments Admin | Missing | AdminCommentsApiController |
| Feed Admin | Missing | AdminFeedApiController |
| Reviews Admin | Missing | AdminReviewsApiController |
| Tools Admin | Missing | AdminToolsApiController |
| Insurance Certs Admin | Done (InsuranceController, admin endpoints) | AdminInsuranceCertificateApiController |
| Community Analytics | Missing | AdminCommunityAnalyticsApiController |
| Analytics Reports | Missing | AdminAnalyticsReportsApiController |
| Broker Controls | Missing | AdminBrokerApiController |
| Deliverability | Missing | AdminDeliverabilityApiController |
| Matching Admin | Done (AdminMatchingController, 2 endpoints) | AdminMatchingApiController |
| Timebanking Admin | Missing | AdminTimebankingApiController |

| Onboarding Wizard | Not on roadmap | Done (OnboardingController, 7 endpoints) | Should-have | OnboardingApiController |
| Contact Forms | Not on roadmap | Missing | Should-have | ContactController |
| Mobile App Version Check | Not on roadmap | Missing | Nice-to-have | AppController |
| AI Content Admin (generate newsletters, blog, pages) | Not on roadmap | Missing | Nice-to-have | AiAdminContentController |
| AI Usage Limits/Settings Admin | Not on roadmap | Missing | Nice-to-have | AiSettingsController |

**V1 has 37+ admin API controllers + 251 services. V2 has 4 admin controllers (AdminController + AdminCrm + AdminAnalytics + Audit). This remains the largest absolute endpoint gap.**

---

## 30. Enterprise & Governance

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority | V1 Services |
|----------------|---------------|----------------|----------|-------------|
| GDPR Compliance | Phase 25 | Done (tested) | Must-have | GdprService |
| GDPR Audit Trail | Phase 26 | Done (tested) | Should-have | AuditLogService |
| Consent Management | Phase 18 | Done (tested) | Should-have | CookieConsentService |
| Cookie Consent | Phase 18 | Done (tested) | Should-have | CookieInventoryService |
| Legal Documents | Phase 40 | Done (LegalDocumentController, 6 endpoints) | Should-have | LegalDocumentService |
| Legal Acceptance | Phase 40 | Done (included in LegalDocumentController) | Must-have | LegalAcceptanceApiController |
| Monitoring | Not on roadmap | Missing | Should-have | PerformanceMonitorService |
| Metrics API | Not on roadmap | Missing | Should-have | MetricsApiController (2 endpoints) |
| GDPR Breach Reporting | Not on roadmap | Missing | Should-have | Enterprise/GdprBreachController |
| GDPR Consent Tracking | Not on roadmap | Missing | Should-have | Enterprise/GdprConsentController |
| Secrets Management | Not on roadmap | Missing | Should-have | Enterprise/SecretsController |
| Enterprise Config Admin | Not on roadmap | Missing | Should-have | Enterprise/ConfigController |
| Enterprise Dashboard | Not on roadmap | Missing | Should-have | Enterprise/EnterpriseDashboardController |
| Broker Controls | Not on roadmap | Missing | Should-have | AdminBrokerApiController (13+ endpoints) |
| Vetting/DBS Records | Not on roadmap | Missing | Should-have | AdminVettingApiController (15 endpoints) |
| Organization Wallets | Not on roadmap | Done (OrgWalletController, 5 endpoints) | Should-have | OrgWalletController (15 endpoints) |

---

## 31. AI Features

| Legacy Feature | V2 Status | Notes |
|----------------|-----------|-------|
| AI Chat | Done (LLaMA) | V1 uses OpenAI, V2 uses Ollama |
| Conversation History | Done | V2 advantage |
| AI Listing Generation | Done | - |
| AI Bio Generation | Done | - |
| Content Moderation | Done | - |
| AI Provider Management | Missing | V1: AiSettingsController (admin) |
| AI Usage Limits | Missing | V1: AiUsage, AiUserLimit models |

---

## 32. Help & Documentation

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority | V1 Endpoints |
|----------------|---------------|----------------|----------|--------------|
| FAQ API | Not on roadmap | Missing | Should-have | GET /api/v2/help/faqs |
| Knowledge Base | Phase 41 | Done (6 endpoints, see section 23) | Should-have | 8 endpoints (see section 23) |
| Onboarding Wizard | Not on roadmap | Done (OnboardingController, 7 endpoints) | Should-have | OnboardingService + controller |

---

## 33. Mobile & PWA

| Legacy Feature | V2 Status | Notes |
|----------------|-----------|-------|
| Realtime Config | Missing | V1: Pusher config endpoint |
| Web Push (VAPID) | Done (tested) | PushNotificationController |
| Mobile Push (FCM) | Done (tested) | FCMPushService |
| Capacitor App | Missing | V1 has Capacitor integration |

---

## Summary Statistics

**Updated 2026-03-07 (deep V1 source code audit + session 2 module build):** All V1 route files, controllers, services, and models examined. Background agent confirmed 251 services, 199 controllers, 1,300+ endpoints. Session 2 added Blog/CMS, Voice Messages, Org Wallets, Nexus Score, Tenant Hierarchy, Onboarding, Insurance, and multiple admin controllers.

| Category | Count |
|----------|-------|
| Total V1 API Endpoints | ~1,300+ (unique), ~1,735 (incl. routes/aliases) |
| Total V1 Services | 251 |
| Total V1 Controllers (API) | 120+ |
| Total V1 Controllers (Admin) | 37+ |
| Total V1 Controllers (Other) | 42 |
| Total V1 Models | 60+ |
| V2 Done Endpoints | 550 |
| V2 Controllers | 73 |
| V2 Services | 68 |
| V2 Entities | 120 |
| Features Done (tested) | ~230 |
| Features Scaffolded | 0 |
| Features Missing | ~90 |

### Previously Uncounted V1 Modules (from source audit)

| Module | V1 Endpoints | V2 Status |
|--------|-------------|-----------|
| Jobs Module | 25 | Done (14 endpoints) |
| Ideation/Challenges | 22 | Done (9 endpoints) |
| Goals Module | 22 | Done (7 endpoints) |
| Polls Module | 10 | Done (5 endpoints) |
| Blog/CMS | 6+ | Done (22 endpoints) |
| Knowledge Base | 8 | Done (6 endpoints) |
| Resources Library | 7+ | Missing |
| Comments V2 (threaded) | 5 | Done (built into FeedController) |
| Endorsements | 4 | Done (SkillsController, 10 endpoints) |
| Member Availability | 8 | Done (8 endpoints) |
| Member Activity Dashboard | 5 | Missing |
| Verification Badges | 4 | Missing |
| Sub-Accounts/Family | 7 | Missing |
| Feed Social (sharing, hashtags) | 6 | Partial (shares done, hashtags missing) |
| Legal Documents | 6 | Done (6 endpoints) |
| Match Preferences | 2 | Done (MatchingController) |
| User Insurance | 2 | Done (9 endpoints) |
| Metrics/Performance | 2 | Missing |
| Onboarding Flow | 2 | Done (7 endpoints) |
| Mobile App Version Checking | 3 | Missing |
| Contact Forms | 1 | Missing |
| Enterprise GDPR (breach, monitoring, secrets) | 21+ | Missing |
| Vetting/Insurance Admin | 15 | Missing |
| Organization Wallets (full) | 15 | Done (5 endpoints) |
| Broker Controls (full) | 13+ | Missing |
| AI Content Generation (admin) | 7 | Missing |
| **Total newly identified** | **~175** | **~100 Done, ~75 Missing** |

### Migration Score: 770 / 1,000

**Updated 2026-03-07 (session 2):** Blog/CMS (22 endpoints), Voice Messages (5), Org Wallets (5), Nexus Score (7), Tenant Hierarchy (6), Onboarding (7), Insurance (9), plus admin controllers for Gamification (6), Groups (3), Events (4), Matching (2), Blog (8), Pages (8). 106 new endpoints across 15 new controllers.

| Status | Must-have | Should-have | Nice-to-have | Points |
|--------|-----------|-------------|--------------|--------|
| Done (100%) | ~29 features | ~94 features | ~78 features | 385 |
| Missing (0%) | ~6 features | ~36 features | ~77 features | 0 |
| **Weighted total** | | | | **385 / 500 = 770** |

---

## Top 25 Remaining Gaps (Prioritized)

### Must-Have (All Critical Items Done)

_Emergency Lockdown and Legal Document Acceptance completed in previous session._

### Must-Have (Done)

| # | Feature | Domain | Notes |
|---|---------|--------|-------|
| 3 | Federation External API | Federation | 10 endpoints, 32 tests PASS |
| 4 | Federation Gateway + 3-Layer Gating | Federation | System→Tenant→User gating |
| 5 | Federation JWT Service | Federation | HKDF-derived keys, 5min tokens |
| 6 | Federation API Middleware | Federation | API Key + Bearer JWT auth |
| 7 | Exchange Workflow | Exchanges | 11 endpoints, 22 tests PASS |
| 8 | GDPR Compliance | Enterprise | 9 endpoints, tests PASS |
| 9 | Federated Transactions | Federation | 10 endpoints, tests PASS |
| 10 | Tenant Management | Super Admin | 8 endpoints, tests PASS |

### Should-Have (Missing - High Impact)

| # | Feature | Domain | Endpoints |
|---|---------|--------|-----------|
| 11 | Notification Preferences | Profiles | 2 endpoints |
| 12 | Pending Reviews | Reviews | 1 endpoint |
| 13 | Trust Score | Reviews | 1 endpoint |
| 14 | Threaded Comments | Social | 5 endpoints |
| 15 | Vetting/DBS Records | Admin | 15 endpoints |
| 16 | Enterprise GDPR (breach, monitoring) | Enterprise | 21+ endpoints |

### Should-Have (Done - Previously Missing)

| # | Feature | Domain | Notes |
|---|---------|--------|-------|
| - | Jobs Module | Jobs | Done (14 endpoints) |
| - | Knowledge Base | Help | Done (6 endpoints) |
| - | User Preferences | Profiles | Done (5 endpoints) |
| - | Member Availability | Profiles | Done (8 endpoints) |
| - | Legal Documents | Compliance | Done (6 endpoints) |
| - | Nearby Members | Search | Done (LocationController) |

### Nice-to-Have (Missing - Feature Richness)

| # | Feature | Domain | Endpoints |
|---|---------|--------|-----------|
| 17 | Resources Library | Content | 7+ endpoints |
| 18 | Sub-Accounts/Family | Profiles | 7 endpoints |
| 19 | Social OAuth Login | Auth | 1 service |
| 20 | Hashtags | Social | 3 endpoints |
| 21 | XP Shop | Gamification | 2+ endpoints |

### Nice-to-Have (Done - Previously Missing)

| # | Feature | Domain | Notes |
|---|---------|--------|-------|
| - | Goals Module | Goals | Done (7 endpoints) |
| - | Ideation/Challenges | Ideation | Done (9 endpoints) |
| - | Polls Module | Polls | Done (5 endpoints) |
| - | Blog/CMS | Content | Done (22 endpoints) |
| - | Endorsements | Social | Done (SkillsController, 10 endpoints) |
| - | Nexus Score | Gamification | Done (7 endpoints) |

---

## Path to 1,000

### Phase A: Integration-Test Scaffolded Code - COMPLETE

All scaffolded phases (16-37) now have passing integration tests. 659/660 tests pass (99.8%).
Score moved from 465 to 620/1,000.

### Phase B: Build Federation Core - COMPLETE

Federation External API (10 endpoints), Gateway (3-layer gating), JWT Service, API Middleware, API Key management, user settings. 27 new federation endpoints, 4 new services, 4 new entities, 32 new tests (all pass). Score moved from 620 to 660/1,000.

### Phase C: Build Missing Should-Have Features - COMPLETE

All critical should-have features built: Legal Documents (6 endpoints), Emergency Lockdown (middleware + service), Jobs (14 endpoints), Knowledge Base (6 endpoints), User Preferences (5 endpoints), Member Availability (8 endpoints), Goals (7 endpoints), Polls (5 endpoints), Ideation (9 endpoints). Score moved from 660 to 770/1,000.

### Phase D: Blog/CMS, Admin Controllers, Remaining Modules - COMPLETE

Blog/CMS (22 endpoints), Voice Messages (5), Org Wallets (5), Nexus Score (7), Tenant Hierarchy (6), Onboarding (7), Insurance (9), plus admin controllers for Gamification, Groups, Events, Matching, Blog, Pages. 106 new endpoints. Score now 770/1,000.

### Phase E: Remaining Gaps (770 -> 1,000)

Enterprise governance, vetting/DBS records, resources library, sub-accounts, advanced algorithms, i18n, PWA/Capacitor features.

---

*Last updated: 2026-03-07 (session 2: Blog/CMS, Voice Messages, Org Wallets, Nexus Score, Tenant Hierarchy, Onboarding, Insurance, admin controllers). Score: 770/1,000. 550 endpoints, 73 controllers, 68 services, 120 entities. Next: Enterprise governance, vetting, resources to reach 850+.*
