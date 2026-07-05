# Accessible Backend Contract Matrix

Last generated: 2026-07-05

This is a preparation matrix for future Laravel/ASP.NET accessible backend switching. It does not implement adapters and does not certify backend readiness.

## Required Proof Per Family

- Tenant resolution: shared slug paths and custom accessible domains.
- Auth/session: login, logout, refresh, two-factor, redirects, signed-in state.
- CSRF/forms: token fields, POST handlers, validation failures, replay handling.
- Feature/module gates: hidden links, disabled pages, 403/404 behavior.
- Request shape: query params, form fields, multipart names, route params.
- Response/page data: lists, pagination, empty states, status codes, errors.
- Uploads: avatar, listing images, resources, media constraints.
- Localization: locale selection, RTL, translated labels, validation copy.

## Family Matrix

| Family | GET routes | POST routes | Mutating routes | Tenant | Auth | CSRF | Feature/module gates |
| --- | ---: | ---: | ---: | --- | --- | --- | --- |
| about | 1 |  |  | needs-audit | needs-audit | needs-audit | needs-audit |
| accessibility | 1 |  |  | needs-audit | needs-audit | needs-audit | needs-audit |
| account | 1 |  |  | needs-audit | needs-audit | needs-audit | needs-audit |
| achievements | 6 | 4 | 4 | needs-audit | needs-audit | needs-audit | needs-audit |
| activity | 2 |  |  | needs-audit | needs-audit | needs-audit | needs-audit |
| appreciations |  | 1 | 1 | needs-audit | needs-audit | needs-audit | needs-audit |
| blog | 5 | 7 | 7 | needs-audit | needs-audit | needs-audit | needs-audit |
| chat | 1 | 1 | 1 | needs-audit | needs-audit | needs-audit | needs-audit |
| clubs | 1 |  |  | needs-audit | needs-audit | needs-audit | needs-audit |
| connections | 2 | 3 | 3 | needs-audit | needs-audit | needs-audit | needs-audit |
| contact | 1 | 1 | 1 | needs-audit | needs-audit | needs-audit | needs-audit |
| cookie-consent |  | 1 | 1 | needs-audit | needs-audit | needs-audit | needs-audit |
| cookies | 1 |  |  | needs-audit | needs-audit | needs-audit | needs-audit |
| coupons | 2 |  |  | needs-audit | needs-audit | needs-audit | needs-audit |
| courses | 10 | 16 | 16 | needs-audit | needs-audit | needs-audit | needs-audit |
| dashboard | 1 |  |  | needs-audit | needs-audit | needs-audit | needs-audit |
| events | 9 | 12 | 12 | needs-audit | needs-audit | needs-audit | needs-audit |
| exchanges | 2 | 2 | 2 | needs-audit | needs-audit | needs-audit | needs-audit |
| explore | 1 |  |  | needs-audit | needs-audit | needs-audit | needs-audit |
| faq | 1 |  |  | needs-audit | needs-audit | needs-audit | needs-audit |
| features | 1 |  |  | needs-audit | needs-audit | needs-audit | needs-audit |
| federation | 17 | 11 | 11 | needs-audit | needs-audit | needs-audit | needs-audit |
| feed | 5 | 17 | 17 | needs-audit | needs-audit | needs-audit | needs-audit |
| goals | 12 | 15 | 15 | needs-audit | needs-audit | needs-audit | needs-audit |
| group-exchanges | 3 | 6 | 6 | needs-audit | needs-audit | needs-audit | needs-audit |
| groups | 15 | 21 | 21 | needs-audit | needs-audit | needs-audit | needs-audit |
| guide | 1 |  |  | needs-audit | needs-audit | needs-audit | needs-audit |
| help | 1 |  |  | needs-audit | needs-audit | needs-audit | needs-audit |
| home | 2 |  |  | needs-audit | needs-audit | needs-audit | needs-audit |
| ideation | 12 | 22 | 22 | needs-audit | needs-audit | needs-audit | needs-audit |
| jobs | 21 | 17 | 17 | needs-audit | needs-audit | needs-audit | needs-audit |
| kb | 2 |  |  | needs-audit | needs-audit | needs-audit | needs-audit |
| leaderboard | 5 |  |  | needs-audit | needs-audit | needs-audit | needs-audit |
| legal | 6 |  |  | needs-audit | needs-audit | needs-audit | needs-audit |
| listings | 8 | 11 | 11 | needs-audit | needs-audit | needs-audit | needs-audit |
| login | 3 | 4 | 4 | needs-audit | needs-audit | needs-audit | needs-audit |
| logout |  | 1 | 1 | needs-audit | needs-audit | needs-audit | needs-audit |
| marketplace | 23 | 25 | 25 | needs-audit | needs-audit | needs-audit | needs-audit |
| matches | 2 | 2 | 2 | needs-audit | needs-audit | needs-audit | needs-audit |
| me | 2 | 4 | 4 | needs-audit | needs-audit | needs-audit | needs-audit |
| members | 5 | 6 | 6 | needs-audit | needs-audit | needs-audit | needs-audit |
| messages | 6 | 12 | 12 | needs-audit | needs-audit | needs-audit | needs-audit |
| newsletter | 1 |  |  | needs-audit | needs-audit | needs-audit | needs-audit |
| nexus-score | 2 |  |  | needs-audit | needs-audit | needs-audit | needs-audit |
| notifications | 1 | 5 | 5 | needs-audit | needs-audit | needs-audit | needs-audit |
| onboarding | 2 | 2 | 2 | needs-audit | needs-audit | needs-audit | needs-audit |
| organisations | 7 | 2 | 2 | needs-audit | needs-audit | needs-audit | needs-audit |
| password | 1 | 1 | 1 | needs-audit | needs-audit | needs-audit | needs-audit |
| podcasts | 6 | 8 | 8 | needs-audit | needs-audit | needs-audit | needs-audit |
| polls | 6 | 7 | 7 | needs-audit | needs-audit | needs-audit | needs-audit |
| premium | 3 | 3 | 3 | needs-audit | needs-audit | needs-audit | needs-audit |
| profile | 5 | 16 | 16 | needs-audit | needs-audit | needs-audit | needs-audit |
| register | 1 | 1 | 1 | needs-audit | needs-audit | needs-audit | needs-audit |
| report-a-problem | 1 | 1 | 1 | needs-audit | needs-audit | needs-audit | needs-audit |
| resources | 6 | 6 | 6 | needs-audit | needs-audit | needs-audit | needs-audit |
| reviews | 3 | 4 | 4 | needs-audit | needs-audit | needs-audit | needs-audit |
| saved | 1 | 1 | 1 | needs-audit | needs-audit | needs-audit | needs-audit |
| search | 3 | 3 | 3 | needs-audit | needs-audit | needs-audit | needs-audit |
| settings | 5 | 8 | 8 | needs-audit | needs-audit | needs-audit | needs-audit |
| skills | 1 |  |  | needs-audit | needs-audit | needs-audit | needs-audit |
| trust-and-safety | 1 |  |  | needs-audit | needs-audit | needs-audit | needs-audit |
| users | 2 | 1 | 1 | needs-audit | needs-audit | needs-audit | needs-audit |
| verify-email | 1 |  |  | needs-audit | needs-audit | needs-audit | needs-audit |
| volunteering | 24 | 28 | 28 | needs-audit | needs-audit | needs-audit | needs-audit |
| wallet | 4 | 2 | 2 | needs-audit | needs-audit | needs-audit | needs-audit |

## Next Step

Replace each `needs-audit` cell with a tested contract note during module-by-module parity work. ASP.NET should match Laravel behavior before `apps/web-uk` adds backend-specific branches.
