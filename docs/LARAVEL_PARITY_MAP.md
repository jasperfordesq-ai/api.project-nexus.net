# Laravel Full-Parity Map

Last reviewed: 2026-07-03

Canonical source: `C:\platforms\htdocs\staging` (read-only).

## Inventory Baseline

| Surface | Laravel Edition | .NET Edition |
| --- | ---: | ---: |
| Controllers | 308 | 207 |
| Services | 479 | 181 |
| Models/entities | 200 Laravel models | 186 EF entity files |
| Migrations | 318 | 85 EF migration classes excluding designers/snapshot |
| OpenAPI operations | 891 | 3,350 static controller operations from parity script |
| Schema tables | 361 Laravel source tables | 309 .NET static table names |
| Frontend routes | 589 React / 607 accessible | 462 React / 136 accessible |
| Localization | 11 locales / 605 locale namespaces | 7 locales / 280 locale namespaces |
| Module guides | 24 curated Laravel module guides | maintained .NET parity docs recreated in this pass |
| Locales | 11 | 7 |

These counts are directional. They are not a parity score.

`scripts/compare-laravel-api-parity.ps1` generated
`artifacts/parity/api/api-parity.json` on 2026-07-04 with 2,427 Laravel source
operations after supplemental API route parsing and de-duplication, 2,205 static
matches, and 222 missing operations. Laravel `govuk-alpha*` accessible page
routes are excluded from the API comparator and tracked in the frontend
comparator. The artifact is ignored by git; regenerate it before using the
numbers for implementation planning.

`scripts/compare-laravel-schema-parity.ps1` generated
`artifacts/parity/schema/schema-parity.json` on 2026-07-04 with 361 Laravel
source tables, 309 .NET table names, 119 exact matches, 242 missing Laravel-side
names, and 190 .NET-only names. The artifact is ignored by git; regenerate it
before using the numbers for schema implementation planning.

`scripts/compare-laravel-frontend-parity.ps1` generated
`artifacts/parity/frontend/frontend-parity.json` on 2026-07-04 with 589 Laravel
React routes, 462 .NET React routes, 393 React matches, 196 missing Laravel-side
React routes, 607 Laravel accessible routes, 136 `apps/web-uk` routes, 53
accessible matches, and 554 missing Laravel-side accessible routes. The artifact
is ignored by git; regenerate it before using the numbers for frontend
implementation planning.

`scripts/compare-laravel-localization-parity.ps1` generated
`artifacts/parity/localization/localization-parity.json` on 2026-07-04 with 11
Laravel locales, 7 .NET locales, 605 Laravel locale namespaces, 280 .NET locale
namespaces, 49 namespace matches, and an English key scan showing 17,280 Laravel
keys, 5,575 .NET keys, 157 matched keys, and 4,942 missing Laravel-side keys in
matched namespaces. The artifact is ignored by git; regenerate it before using
the numbers for localization implementation planning.

`scripts/export-laravel-parity-backlog.ps1` generated
`artifacts/parity/backlog/parity-backlog.json` on 2026-07-04 with 6,716 open
implementation items across API, schema, frontend, and localization artifacts.
The artifact is ignored by git; `docs/PARITY_BACKLOG.md` is the curated rollup.

## Source Evidence For Former Exclusions

| Area | Laravel evidence | .NET evidence | Current gap |
| --- | --- | --- | --- |
| Caring Community | 260 matched files including `app/Services/CaringCommunity/*`, `CaringCommunityApiController.php`, `FutureCareFundService.php`, `AhvPensionExportService.php`, `AdminCaringCommunityController::workflow/tandemSuggestions/dismissTandemSuggestion/assistedOnboarding`, `MunicipalSurveyController.php`, `TrustTierController.php`, `WarmthPassController.php`, `CaregiverApiController.php`, `VereinFederationMemberController.php`, KISS/municipal/civic services, caring admin pages | Initial .NET parity now covers emergency alerts, external integration backlog, federation peers plus member federation-directory, sub-regions, care providers, success stories, caregiver links plus burnout/schedule and cover-request reads, public municipality events-calendar default/code routes, admin assisted onboarding, admin workflow dashboard read route, admin tandem suggestions read/dismiss routes with suppression log, project announcements, category coefficients, commercial boundary, municipal copilot, data-quality reads, civic digest member digest/prefs plus admin cadence, disclosure packs, operating policy, member statements, municipal ROI, nudge analytics, paper onboarding, pilot scoreboard, recipient circle, regional-points admin plus member summary/history/marketplace quote, research reads plus member consent, role-preset status, trust-tier member/admin routes, warmth-pass member/admin reads, safeguarding reads, SLA/support reads, member relationship lifecycle, member GDPR/FADP data export, member Future Care Fund summary, member AHV pension evidence-pack export, integration showcase, favours, forecast dashboard, KPI baseline, launch readiness, lead nurture, loyalty, municipality feedback, municipality surveys, legacy hour estate, same-platform hour transfer, hour-gift inbox/sent reads, KISS Treffen member list/detail reads, Caring Community Markt member feed, invite codes, and isolated-node decision gates. Evidence includes represented tables/settings such as `caring_federation_peers`, `caring_cover_requests`, `caring_municipality_feedback`, `caring_tandem_suggestion_log`, `caring_trust_tier_config`, `caring_hour_gifts`, `caring_kiss_treffen`, `municipality_surveys`, `municipality_survey_questions`, `municipality_survey_responses`, `verein_federation_consents`, regional-points/research/loyalty tables, shared `categories.substitution_coefficient`, `users.trust_tier`, listing geo/image fields for the Markt feed, `TenantConfig` civic digest/user prefs and workflow policy keys, `MunicipalSurveyService`, `TrustTierService`, `WarmthPassService`, `CaregiverSupportService`, `CaringCommunityWorkflowService`, `CaringCommunityDataExportService`, `CaringCommunityFutureCareFundService`, `CaringCommunityAhvPensionExportService`, `CaringRegionalPointService`, `CaringResearchPartnershipService`, `CaringTandemMatchingService`, `CaringHourGiftService`, `KissTreffenService`, `CaringCommunityMarktService`, `MunicipalityEventsCalendarController`, and `AdminCaringCommunityAssistedOnboardingController`. | These tiers have initial parity only. Workflow policy update/review assignment/escalation/decision routes, KISS Treffen admin upsert/minutes mutations, research partner writes/dataset mutations/agreement-template render, role-preset install, safeguarding report submit/admin mutations, admin support-relationship writes/hour logging, hour-gift send/accept/decline/revert mutations, regional-points transfer/redeem mutations, caregiver on-behalf and cover-request create/assign mutations, frontend, accessible, nudge dispatch/config, civic digest email dispatch/delivery claims, remote federation transfer delivery, missing `caring_help_requests.category_id` category derivation for warmth pass, and broader caring backend/admin workflows still need parity. |
| Marketplace / commerce | 244 matched files including `Marketplace*Controller.php`, `Marketplace*Service.php`, marketplace models, merchant/coupon/ads routes | 10 matched files including `MarketplaceController.cs`, `MarketplaceService.cs`, `MarketplaceEntities.cs`; `CaringCommunityMarktController.cs` now aggregates marketplace items into the caring-community feed | Deep workflow and contract parity needed |
| Verein / Clubs | 47 matched Laravel files including `app/Http/Controllers/Api/Verein/*`, dues/federation services, club controller | `VereineParityController.cs` and auth tests | Mostly compatibility shell; domain model/workflows need audit |
| Regional Analytics | route file, services, PDF generator, billing, admin pages | no matched backend implementation | Full module gap |
| National KISS | `NationalKissDashboardController.php`, KISS services | no matched implementation | Full super-admin/reporting gap |
| Non-Stripe ID providers | `VeriffProvider.php`, `OnfidoProvider.php`, `JumioProvider.php`, `IdenfyProvider.php`, `RegistrationPolicyController::listProviders`, `TenantProviderCredentialService.php` | `NonStripeIdentityProviders.cs` adds Veriff, Onfido, Jumio, and iDenfy adapters; `ReactFrontendCompatibilityController` now returns Laravel-style admin provider list/policy payloads and saves encrypted tenant provider credentials in `tenant_provider_credentials` | Live/sandbox HTTP contract, provider-specific webhook end-to-end verification, and full admin workflow parity still need verification |
| Tenant SSO providers | `AdminSsoProvidersController.php`, `SsoOidcService.php`, `tenant_sso_providers` migration | `AdminSsoProvidersController.cs`, `TenantSsoProviderService.cs`, `TenantSsoProvider.cs`, `tenant_sso_providers` migration | Admin provider CRUD/test surface now matched; public SSO redirect/callback, PKCE state, token validation, domain guard, and account-linking flow still need full parity |
| Mailchimp-like behavior | `MailchimpService.php` | no matched provider files; email templates exist | Decide equivalent behavior and implement or document replacement |
| Partner API / portal | `app/Http/Controllers/Api/PartnerApi`, `app/Services/PartnerApi`, `react-frontend/src/partners` | API partner admin entity/service/controller | External partner API/auth/webhook parity incomplete |
| Accessible frontend | `accessible-frontend/`, `routes/govuk-alpha.php`, `routes/govuk-alpha-parity/*` | `apps/web-uk/` exists | Route/workflow parity map and implementation needed |

## Backlog Order

1. **Contract inventory and tooling**
   - Generate a .NET OpenAPI snapshot from the running API.
   - Normalize Laravel `/api/v2` paths against .NET `/api` and compatibility
     prefixes.
   - Build explicit schema alias mapping for renamed tables, especially
     Laravel `vol_*` tables versus .NET `volunteer_*` names.
   - Build route alias mapping for frontend redirects and intentionally renamed
     accessible paths.
   - Build namespace alias mapping for Laravel backend/email/accessible
     translation namespaces versus React and future .NET backend targets.
   - Use `scripts/export-laravel-parity-backlog.ps1` after every artifact refresh
     so missing API/schema/frontend/localization rows remain ordered and
     acceptance-criteria backed.
   - Acceptance: `docs/API_PARITY.md` can list matched, missing, extra, and
     intentionally-renamed endpoints from generated artifacts, and
     `docs/SCHEMA_PARITY.md` can distinguish exact matches, accepted aliases,
     missing tables, and extra .NET tables. `docs/FRONTEND_PARITY.md` can
     distinguish React route gaps from accessible HTML route gaps, and
     `docs/LOCALIZATION_PARITY.md` can distinguish missing locales, namespaces,
     and keys.

2. **User-facing API gaps**
   - Prioritize endpoints used by Laravel React frontend pages and accessible
     frontend routes.
   - Acceptance: route, auth, tenant scoping, request validation, response
     shape, and error shape match Laravel or have documented .NET-compatible
     aliases.

3. **Caring Community and National KISS**
   - Port domain entities, services, admin routes, member routes, scheduled
     tasks, locale keys, and frontend surfaces.
   - Acceptance: Laravel caring/KISS tests or equivalent .NET integration tests
     cover workflows, tenant isolation, and admin authorization.

4. **Marketplace / commerce / monetization**
   - Complete marketplace listing, order, payment, escrow, pickup, coupon,
     merchant onboarding, local advertising, and promotion workflows.
   - Acceptance: member/admin APIs and React/admin pages match Laravel
     workflows, with payment-provider safety tests.

5. **Verein / Clubs and Regional Analytics**
   - Replace compatibility shells with real domain models, services, reports,
     dues/federation workflows, and admin pages.
   - Acceptance: integration tests cover dues, federation consent, analytics
     reports, billing/export, and tenant isolation.

6. **Identity provider parity**
   - Verify Veriff, Onfido, Jumio, and Idenfy adapters against live or sandbox
     HTTP contracts and tenant-level provider configuration.
   - Extend the React admin workflow tests beyond controller-level contracts,
     including browser/API round trips for credential save/delete and
     registration-policy writes.
   - Acceptance: provider config persistence, webhook signature validation,
     sanitized audit events, fallback behavior, and admin settings are tested end
     to end against provider sandbox contracts.

7. **Partner API and accessible frontend**
   - Complete external partner API auth, rate limiting, webhooks, and portal
     workflows.
   - Map `apps/web-uk/` against Laravel `accessible-frontend/` route by route.
   - Acceptance: accessible route tests cover tenant, auth, feature gates, and
     core workflows.

8. **Localization, docs, and operational readiness**
   - Close locale count/key gaps and update all docs after each module batch.
   - Acceptance: docs maps reflect source state; test commands pass or failures
     are documented with owners.

## Acceptance Criteria For 100% Parity

- Every Laravel OpenAPI operation and route-file endpoint is matched,
  intentionally renamed with compatibility behavior, or documented as replaced
  by an equivalent .NET workflow.
- Every Laravel module guide has a corresponding .NET implementation note and
  test plan.
- React admin/member pages and accessible frontend routes have equivalent .NET
  API support.
- Formerly excluded modules have real implementations or explicitly approved product
  decisions outside this technical parity goal.
- `dotnet test Nexus.sln --configuration Release` and relevant frontend checks
  pass for the implemented surfaces.
