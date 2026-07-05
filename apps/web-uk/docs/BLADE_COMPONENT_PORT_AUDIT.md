# Blade Component Port Audit

Last reviewed: 2026-07-05

## Purpose

This audit lists reusable Laravel Blade accessible frontend patterns that should
be ported into `apps/web-uk` while preserving the Express/Nunjucks/GOV.UK
Frontend stack.

## Ported Or Started

| Blade pattern | Laravel source | ASP.NET target | Status |
| --- | --- | --- | --- |
| Custom dark header | `accessible-frontend/views/layout.blade.php` | `src/views/layouts/base.njk` | Started. Text brand, language selector, My account link, and service navigation are present. |
| Header visual layer | `accessible-frontend/src/app.scss` | `src/assets/scss/main.scss` | Started. Dark header, accent strip, language form, nav badge, card list, and link-button patterns are present. |
| Service navigation | `AlphaController::alphaNavItems()` | `src/lib/accessible-shell.js` | Started. Header labels now mirror Blade IA. Feature-gate behavior is not implemented yet. |
| Footer columns | `AlphaController::alphaFooterColumns()` | `src/lib/accessible-shell.js` and `partials/footer.njk` | Started. Platform, Support, and Legal columns mirror Blade labels and local path equivalents. |
| Footer meta | `layout.blade.php` | `partials/footer.njk` | Started. Report problem, Cookies, POST sign-out, AGPL attribution, and source link are present. |
| Explore gateway | `views/explore.blade.php` | `src/views/explore.njk` | Started. Card order and live-content section structure now mirror Blade. |
| Feature summary | `views/features.blade.php` | `src/views/features.njk` and `GET /features` | Started. Caption, lead copy, spaced bullet list, and CTA to the guide page mirror the Blade page shape. Laravel feature/module gates and runtime rendering are not certified yet. |
| Timebanking guide | `views/guide.blade.php` | `src/views/guide.njk` and `GET /guide` | Started. Caption, lead copy, equality section, ordered three-step list, getting-started copy, and CTA button group mirror the Blade page shape. Laravel feature/module gates, auth/session behaviour, and runtime rendering are not certified yet. |
| No-JS locale preservation | `layout.blade.php` | `src/lib/accessible-shell.js` and `layouts/base.njk` | Started. Language switcher preserves scalar non-locale query parameters as hidden inputs, matching Blade's no-JS GET form pattern. Locale persistence middleware/backend behavior is not certified yet. |
| Cookie banner | `partials/cookie-banner.blade.php` | `partials/cookie-banner.njk` and `POST /cookie-consent` | Started. No-JS banner renders before the skip link, records a local consent cookie, and preserves a safe local return URL. Laravel backend/session parity is not certified yet. |
| Cookie settings | `views/cookie-settings.blade.php` | `src/views/cookie-settings.njk` | Started. Page layout, essential/analytics sections, radio controls, saved notification, and policy link mirror the Blade workflow. Laravel tenant persistence is not certified yet. |
| Contact form | `views/contact.blade.php` | `src/views/contact.njk` and `POST /contact` | Started. No-JS form, report-problem prefill, validation summary, subject choices, signed-out account hint, and success state mirror Blade. Laravel Turnstile/backend delivery is not certified yet. |
| Report a problem | `views/report-problem.blade.php` | `src/views/report-problem.njk` and `POST /report-a-problem` | Started. Signed-out redirect, signed-in form, validation summary, impact radios, safe page URL, and confirmation reference mirror the Blade workflow. Laravel `support_reports` persistence is not certified yet. |
| Account hub | `views/account.blade.php` | `src/views/account.njk` and `GET /account` | Started. Caption, intro, card-list hub, tenant-prefixed links, unread-message badge hook, and POST sign-out form mirror the Blade page shape. Laravel feature/module gates, auth enforcement, live counts, and backend workflows are not certified yet. |
| Help centre | `views/help.blade.php` | `src/views/help.njk` and `GET /help` | Started. Caption, search form, search hint, empty/no-results inset, contact CTA, and tenant-prefixed contact link mirror the Blade page shape. Live FAQ groups/search behaviour and Laravel runtime rendering are not certified yet. |
| Knowledge base index | `views/kb-index.blade.php` | `src/views/kb-index.njk` and `GET /kb` | Started. Caption, search form, search hint, articles heading, empty/no-results inset, and tenant-prefixed form action mirror the Blade page shape. Live article data, pagination, `/kb/{id}` article detail, and Laravel runtime rendering are not certified yet. |
| Blog index | `views/blog-index.blade.php` | `src/views/blog-index.njk` and `GET /blog` | Started. Caption, lead copy, search form, search hint, posts heading, empty/no-results inset, and tenant-prefixed form action mirror the Blade page shape. Live posts/categories, feature gate, pagination, `/blog/{slug}`, `/blog/feed.xml`, comments/likes, and Laravel runtime rendering are not certified yet. |
| Volunteering index | `views/volunteering.blade.php` | `src/views/volunteering.njk` and `GET /volunteering` | Started. Caption, lead copy, organisation browse link, how-it-works inset, organisation gateway, hours summary shell, tools links, tabs, filters, result count, empty/no-results inset, and tenant-prefixed links mirror the Blade page shape. Live opportunities, applications, hours, organisations, shifts, feature gate, post workflows, and Laravel runtime rendering are not certified yet. |
| Skills directory | `views/skills.blade.php` | `src/views/skills.njk` and `GET /skills` | Started. Caption, lead copy, skill search form, searched-skill empty state, browse-by-category heading, and category empty state mirror the Blade page shape. Live skill tree, category drill-down tables, member search results, profile links, and Laravel runtime rendering are not certified yet. |
| Exchanges index | `views/exchanges.blade.php` | `src/views/exchanges.njk` and `GET /exchanges` | Started. Caption, lead copy, disabled-workflow banner, tab filter, result count, and empty state mirror the Blade page shape. Auth enforcement, module gates, live exchange data, detail/action/rating workflows, broker review, pagination, and Laravel runtime rendering are not certified yet. |
| Group exchanges index | `views/group-exchanges.blade.php` | `src/views/group-exchanges.njk` and `GET /group-exchanges` | Started. Caption, lead copy, create button, cancelled success state, status filter tabs, and empty state mirror the Blade page shape. Auth enforcement, feature gate, live group exchange data, create/detail/participant/action workflows, time-credit movement, and Laravel runtime rendering are not certified yet. |
| Polls index | `views/polls.blade.php` | `src/views/polls.njk` and `GET /polls` | Started. Caption, lead copy, status messages, how-it-works inset, my-polls filter, create-poll details form, and empty state mirror the Blade page shape. Auth enforcement, feature gate, live polls/categories, voting, results, deletion, and Laravel runtime rendering are not certified yet. |
| Achievements index | `views/achievements.blade.php` | `src/views/achievements.njk` and `GET /achievements` | Started. Caption, level/XP/badge summary, progress bar, daily reward status/form, challenges empty state, earned-badges empty state, and tenant-prefixed form actions mirror the Blade page shape. Auth enforcement, gamification feature gate, live profile/badge/challenge data, reward claim workflows, and Laravel runtime rendering are not certified yet. |
| Leaderboard index | `views/leaderboard.blade.php` | `src/views/leaderboard.njk` and `GET /leaderboard` | Started. Caption, lead copy, community-impact stat grid, metric/period filter form, and empty state mirror the Blade page shape. Auth enforcement, gamification feature gate, live ranking rows, score formatting, member links, community-impact service data, and Laravel runtime rendering are not certified yet. |
| NEXUS score | `views/nexus-score.blade.php` | `src/views/nexus-score.njk` and `GET /nexus-score` | Started. Caption, lead copy, related tiers link, unavailable-score empty state, and future score/breakdown/insights structure mirror the Blade page shape. Auth enforcement, gamification feature gate, live score data, tier ladder, breakdowns, insights, and Laravel runtime rendering are not certified yet. |
| Activity summary | `views/activity.blade.php` | `src/views/activity.njk` and `GET /activity` | Started. Caption, lead copy, related activity insights link, stat grid, optional engagement/skills/monthly sections, and recent activity empty state mirror the Blade page shape. Auth enforcement, MemberActivityService data, engagement/skills/monthly/timeline data, activity insights, and Laravel runtime rendering are not certified yet. |
| Saved items | `views/saved.blade.php` | `src/views/saved.njk` and `GET /saved` | Started. Caption, lead copy, type filter, clear-filter link, saved item list structure, removal form shape, and empty state mirror the Blade page shape. Auth enforcement, BookmarkService data, removal persistence, saved collections, appreciations, and Laravel runtime rendering are not certified yet. |
| Resources index | `views/resources.blade.php` | `src/views/resources.njk` and `GET /resources` | Started. Caption, lead copy, full library link, search form, resource card-list structure, download link shape, and empty state mirror the Blade page shape. Auth enforcement, resources feature gate, live resource data, library/upload/download/comment workflows, and Laravel runtime rendering are not certified yet. |
| Legal hub | `views/legal-hub.blade.php` | `src/views/legal-hub.njk` and `GET /legal` | Started. Caption, lead copy, legal document card list, and tenant-prefixed legal/accessibility links mirror the Blade page shape. Tenant-managed legal document data and runtime rendering are not certified yet. |
| Legal document fallback | `views/legal-document.blade.php` | `src/views/legal-document.njk` and `GET /legal/*` | Started. Back link, caption, fallback notice, policy fallback copy, section headings/lists, and tenant-prefixed contact link mirror the Blade fallback path. Tenant-managed document loading, version metadata, sanitized rich content, and Laravel runtime rendering are not certified yet. |
| FAQ accordion | `views/faq.blade.php` | `src/views/faq.njk` and `GET /faq` | Started. Caption, heading, intro, and five question accordion sections mirror the Blade FAQ page. Localization persistence and Laravel runtime rendering are not certified yet. |
| Accessibility statement | `views/accessibility.blade.php` | `src/views/accessibility.njk` and `GET /accessibility` | Started. Back link, caption, statement copy, WCAG summary list, support feature sections, feedback link, and testing section mirror the Blade page. Laravel localization/runtime behaviour is not certified yet. |
| Trust and safety | `views/trust-safety.blade.php` | `src/views/trust-safety.njk` and `GET /trust-and-safety` | Started. Warning text, section headings/lists, contact CTA button, and community guidelines link mirror the Blade page. Laravel localization/runtime behaviour is not certified yet. |

## Still To Port

| Blade pattern | Why it matters | Suggested ASP.NET implementation |
| --- | --- | --- |
| Tenant logo and shape sizing | Blade supports tenant-uploaded dark logos with aspect-ratio-aware sizing. | Add tenant logo locals after ASP.NET tenant bootstrap exposes compatible logo URLs and validated header colours. |
| Per-tenant header colours | Blade safely validates `#rrggbb` values and picks readable foreground colours. | Add validated colour locals only after tenant setting parity exists. |
| Module and feature gating | Blade only shows modules enabled for the tenant. | Add a feature/module flag local from ASP.NET tenant bootstrap, matching Laravel semantics. |
| Live Explore content | Blade shows recent listings and upcoming events. | Add data loaders after Laravel-compatible listing/event response shapes are proven. |
| Page-specific subnavs | Commerce, federation, gamification, jobs, messages, and ideation have Blade partial navs. | Port each partial into Nunjucks during module-by-module route parity work. |
| Error and validation summaries | Blade uses consistent GOV.UK error summary behavior. | Audit every form after route/workflow parity is mapped. |

## Do Not Port

- GOV.UK crown, logotype, official header identity, OGL block, or Crown
  copyright wording.
- Laravel/PHP implementation details.
- Production traffic routing before certification.
- ASP.NET-specific visual inventions that diverge from the Blade source.
