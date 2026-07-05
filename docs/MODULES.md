# Laravel-to-.NET Module Map

Last reviewed: 2026-07-03

Laravel source of truth: `C:\platforms\htdocs\staging`.

Status values:

- **Mapped**: .NET has an identifiable implementation surface, but parity still
  needs contract/workflow verification.
- **Partial**: .NET has some implementation, but Laravel has significant
  additional controllers, services, routes, frontend, or data model.
- **Gap**: no meaningful .NET implementation found in the source scan.

| Laravel module | Laravel source paths | .NET target paths | Status |
| --- | --- | --- | --- |
| Admin | `app/Http/Controllers/Api/Admin*`, `react-frontend/src/admin`, `docs/modules/admin.md` | `src/Nexus.Api/Controllers/Admin*`, `apps/react-frontend/src/admin` | Partial |
| AI chat | `app/Services/AI`, `docs/modules/ai-chat.md` | `src/Nexus.Api/Services/*Ai*`, `src/Nexus.Api/Controllers/*Ai*` | Mapped |
| Blog and resources | `docs/modules/blog-and-resources.md`, `app/Services/*Blog*`, resource routes | `AdminBlogController`, resources/admin compatibility controllers | Partial |
| Connections and reviews | `docs/modules/connections-and-reviews.md`, connection/review services | connection, endorsement, review controllers/services | Mapped |
| Courses | `docs/modules/courses.md`, commerce/course frontend and services | no dedicated .NET course module found | Gap |
| Events | `docs/modules/events.md`, `EventsController`, event services | `EventsController`, admin event controllers | Mapped |
| Gamification | `docs/modules/gamification.md`, gamification services/controllers | gamification controllers/services and locale files | Mapped |
| Goals and impact | `docs/modules/goals-and-impact.md`, goals/regional impact services | goals controllers/services; regional analytics missing | Partial |
| Groups | `docs/modules/groups.md`, group services/controllers | groups controllers/services | Mapped |
| Ideation challenges | `docs/modules/ideation-challenges.md`, `IdeationChallengeService.php` | ideation controllers/services | Mapped |
| Identity verification | `docs/modules/identity-verification.md`, `app/Services/Identity/*Provider.php`, `RegistrationPolicyController`, `TenantProviderCredentialService.php` | registration engine plus Mock, Stripe Identity, Veriff, Onfido, Jumio, and iDenfy adapters; React admin read/write compatibility contracts; encrypted tenant provider credential store | Partial |
| Tenant SSO / OIDC | `AdminSsoProvidersController.php`, `SsoOidcService.php`, `tenant_sso_providers` migration | `AdminSsoProvidersController.cs`, `TenantSsoProviderService.cs`, `TenantSsoProvider.cs`, `tenant_sso_providers` migration | Partial |
| Jobs | `docs/modules/jobs.md`, jobs controllers/services | jobs controllers/services | Mapped |
| Listings | `docs/modules/listings.md`, listings services/controllers | listings controllers/services | Mapped |
| Marketplace | `docs/modules/marketplace.md`, `Marketplace*Controller.php`, `Marketplace*Service.php`, marketplace models | `MarketplaceController.cs`, `MarketplaceService.cs`, `MarketplaceEntities.cs` | Partial |
| Members and GDPR | `docs/modules/members-and-gdpr.md`, member/GDPR services | user, GDPR, consent, deletion controllers/services | Mapped |
| Messaging | `docs/modules/messaging.md`, message services, Pusher auth | messages controllers/services, SignalR/RabbitMQ surfaces | Mapped |
| Monetization | `docs/modules/monetization.md`, subscriptions, coupons, ads | donations/plans/coupons/ad pages exist; verify contracts | Partial |
| Notifications | `docs/modules/notifications.md`, notification/email/push services | notification, push, email services/controllers | Mapped |
| Organisations | `docs/modules/organisations.md`, organisation services/controllers | organisation controllers/services | Mapped |
| Podcasts | `docs/modules/podcasts.md`, podcast frontend/services | no dedicated .NET podcast module found | Gap |
| Search | `docs/modules/search.md`, Meilisearch and SQL fallback | search/semantic search controllers/services | Mapped |
| Social feed | `docs/modules/social-feed.md`, feed/poll/story services | feed, poll, comments, moderation controllers/services | Mapped |
| Volunteering | `docs/modules/volunteering.md`, volunteering services/admin pages | volunteer long-tail services/controllers | Partial |
| Wallet and exchanges | `docs/modules/wallet-exchanges.md`, wallet/exchange services | wallet/exchange services/controllers | Mapped |
| Caring Community | `app/Services/CaringCommunity`, `CaringCommunity*`, `AdminCaringCommunityController::workflow/tandemSuggestions/dismissTandemSuggestion/assistedOnboarding`, `MunicipalSurveyController.php`, `TrustTierController.php`, `WarmthPassController.php`, `CaregiverApiController.php`, `VereinFederationMemberController.php`, KISS/municipal routes/admin pages | .NET has initial member/admin parity for emergency alerts, external integration backlog, federation peers plus member federation-directory, sub-regions, care providers, success stories, caregiver links plus burnout/schedule and cover-request reads/create/assign, public municipality events-calendar default/code routes, admin assisted onboarding, admin workflow dashboard read route, admin tandem suggestions read/dismiss routes with suppression log, project announcements, category coefficients, commercial boundary, municipal copilot, data-quality, civic digest member digest/prefs and admin cadence, disclosure packs, integration showcase, favours, forecasts, KPI baselines, pilot scoreboard, recipient circle, regional-points admin, research reads/writes, role-preset status/install, trust-tier config/recompute/member-breakdown, warmth-pass member/admin reads, safeguarding reads plus report assignment/escalation/note/status actions, SLA/support reads plus admin support-relationship create/hour logging, admin Verein member import/preview and admin assignment, member relationship lifecycle, launch readiness, operating policy, member statements, municipal ROI, nudge analytics plus tandem-candidate dispatch, paper onboarding, lead nurture, loyalty, municipality feedback, municipality surveys, hour estates, hour transfers, hour-gift inbox/sent reads, KISS Treffen member list/detail reads plus admin minutes upload, Caring Community Markt member feed, invite codes, and isolated-node gates. Evidence includes corresponding controllers/services plus represented tables/settings such as `caring_federation_peers`, `caring_cover_requests`, `caring_municipality_feedback`, `caring_tandem_suggestion_log`, `caring_trust_tier_config`, `caring_hour_gifts`, `caring_kiss_treffen`, `caring_smart_nudges`, `municipality_surveys`, `municipality_survey_questions`, `municipality_survey_responses`, `verein_federation_consents`, regional-points/research/loyalty tables, `TenantConfig` civic digest/user prefs and workflow policy keys, listing geo/image fields for the Markt feed, `CaringCommunityWorkflowService`, `CaringCommunityRolePresetService`, `CaringSafeguardingService`, `CaringSupportRelationshipService`, `CaringCommunityVereineAdminService`, `CaringTandemMatchingService`, `CaringNudgeAnalyticsService`, `CaringHourGiftService`, `KissTreffenService`, `CaringCommunityMarktService`, `MunicipalityEventsCalendarController`, `AdminCaringCommunityAssistedOnboardingController`, `AdminCaringCommunitySupportController`, `AdminCaringCommunityVereineController`, `AdminCaringCommunityKissTreffenController`, and shared columns/settings. Workflow policy update/review assignment/escalation/decision routes, KISS Treffen admin upsert mutation, safeguarding member report submit mutation, admin support-relationship update, member-facing scoped Verein import/preview aliases, hour-gift send/accept/decline/revert mutations, regional-points member/marketplace routes, caregiver on-behalf mutation, warmth-pass category derivation until `caring_help_requests.category_id` exists, nudge config update and non-tandem trigger parity, civic digest email delivery/background claims, frontend survey/trust-tier/warmth-pass/workflow/civic-digest routes, accessible coverage, and many deeper caring services/routes still need parity. | Partial |
| Verein / Clubs | `app/Http/Controllers/Api/Verein`, `app/Services/Verein`, `ClubsApiController.php` | `VereineParityController.cs`, `AdminCaringCommunityVereineController.cs`, `CaringCommunityVereineAdminService.cs`, focused auth/admin-assignment tests | Partial |
| Regional Analytics | `routes/regional-analytics-routes.txt`, `app/Services/RegionalAnalytics*` | no .NET implementation found | Gap |
| National KISS | `NationalKissDashboardController.php`, caring/KISS services | no .NET implementation found | Gap |
| Partner API and portal | `app/Http/Controllers/Api/PartnerApi`, `app/Services/PartnerApi`, `react-frontend/src/partners` | `AdminApiPartnersController`, API partner entity/service | Partial |
| Accessible frontend | `accessible-frontend/`, `routes/govuk-alpha.php`, `routes/govuk-alpha-parity/*` | `apps/web-uk/`; see `docs/FRONTEND_PARITY.md` | Partial |

## Notes

- The Laravel repo has 24 curated module guides in `docs/modules/`; those guides
  should be read before implementing each corresponding .NET module.
- "Mapped" does not mean complete. It means the .NET repo has enough surface to
  start a detailed contract/workflow parity audit.
- Full parity requires the gap register in `LARAVEL_PARITY_MAP.md` to close, not
  merely for a controller name to exist.
