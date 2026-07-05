# Laravel Accessible Route Inventory

Last generated: 2026-07-05

This generated inventory is preparation evidence only. It does not certify route parity, workflow parity, backend compatibility, or production readiness.

## Summary

| Metric | Count |
| --- | ---: |
| Laravel accessible route declarations | 608 |
| ASP.NET static skeleton paths | 20 |
| Candidate route declarations and mounted families | 85 |
| candidate-family | 59 |
| candidate-route | 48 |
| candidate-workflow | 8 |
| candidate-workflow-family | 119 |
| missing | 350 |
| skeleton | 24 |

## Family Summary

| Family | Total | GET | POST | Candidate | Skeleton | Missing |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| about | 1 | 1 |  | 1 |  |  |
| accessibility | 1 | 1 |  | 1 |  |  |
| account | 1 | 1 |  | 1 |  |  |
| achievements | 10 | 6 | 4 | 1 |  | 9 |
| activity | 2 | 2 |  | 1 |  | 1 |
| appreciations | 1 |  | 1 |  |  | 1 |
| blog | 12 | 5 | 7 | 1 |  | 11 |
| chat | 2 | 1 | 1 |  | 2 |  |
| clubs | 1 | 1 |  |  | 1 |  |
| connections | 5 | 2 | 3 | 5 |  |  |
| contact | 2 | 1 | 1 | 2 |  |  |
| cookie-consent | 1 |  | 1 | 1 |  |  |
| cookies | 1 | 1 |  | 1 |  |  |
| coupons | 2 | 2 |  |  | 1 | 1 |
| courses | 26 | 10 | 16 |  | 1 | 25 |
| dashboard | 1 | 1 |  | 1 |  |  |
| events | 21 | 9 | 12 | 21 |  |  |
| exchanges | 4 | 2 | 2 | 1 |  | 3 |
| explore | 1 | 1 |  | 1 |  |  |
| faq | 1 | 1 |  | 1 |  |  |
| features | 1 | 1 |  | 1 |  |  |
| federation | 28 | 17 | 11 |  | 1 | 27 |
| feed | 22 | 5 | 17 | 22 |  |  |
| goals | 27 | 12 | 15 |  | 2 | 25 |
| group-exchanges | 9 | 3 | 6 | 1 |  | 8 |
| groups | 36 | 15 | 21 | 36 |  |  |
| guide | 1 | 1 |  | 1 |  |  |
| help | 1 | 1 |  | 1 |  |  |
| home | 2 | 2 |  | 2 |  |  |
| ideation | 34 | 12 | 22 |  | 1 | 33 |
| jobs | 38 | 21 | 17 |  | 2 | 36 |
| kb | 2 | 2 |  | 1 |  | 1 |
| leaderboard | 5 | 5 |  | 1 |  | 4 |
| legal | 6 | 6 |  | 6 |  |  |
| listings | 19 | 8 | 11 | 19 |  |  |
| login | 7 | 3 | 4 | 2 | 2 | 3 |
| logout | 1 |  | 1 | 1 |  |  |
| marketplace | 48 | 23 | 25 |  | 1 | 47 |
| matches | 4 | 2 | 2 |  | 1 | 3 |
| me | 6 | 2 | 4 |  |  | 6 |
| members | 11 | 5 | 6 | 11 |  |  |
| messages | 18 | 6 | 12 | 18 |  |  |
| newsletter | 1 | 1 |  |  | 1 |  |
| nexus-score | 2 | 2 |  | 1 |  | 1 |
| notifications | 6 | 1 | 5 | 6 |  |  |
| onboarding | 4 | 2 | 2 |  | 1 | 3 |
| organisations | 9 | 7 | 2 |  | 2 | 7 |
| password | 2 | 1 | 1 |  | 2 |  |
| podcasts | 14 | 6 | 8 |  | 1 | 13 |
| polls | 13 | 6 | 7 | 2 |  | 11 |
| premium | 6 | 3 | 3 |  | 1 | 5 |
| profile | 21 | 5 | 16 | 21 |  |  |
| register | 2 | 1 | 1 | 2 |  |  |
| report-a-problem | 2 | 1 | 1 | 2 |  |  |
| resources | 12 | 6 | 6 | 1 |  | 11 |
| reviews | 7 | 3 | 4 | 7 |  |  |
| saved | 2 | 1 | 1 | 1 |  | 1 |
| search | 6 | 3 | 3 | 6 |  |  |
| settings | 13 | 5 | 8 | 13 |  |  |
| skills | 1 | 1 |  | 1 |  |  |
| trust-and-safety | 1 | 1 |  | 1 |  |  |
| users | 3 | 2 | 1 |  |  | 3 |
| verify-email | 1 | 1 |  |  | 1 |  |
| volunteering | 52 | 24 | 28 | 1 |  | 51 |
| wallet | 6 | 4 | 2 | 6 |  |  |

## Full Route Inventory

| Method | Laravel path | Laravel shared-domain path | Laravel custom-domain path | Route name | Controller | Family | ASP.NET preparation status | Source |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| GET | / | /{tenantSlug}/alpha | / | govuk-alpha.tenant-chooser | tenantChooser | home | candidate-route | routes/govuk-alpha.php:12 |
| GET | / | /{tenantSlug}/alpha | / | home | home | home | candidate-route | routes/govuk-alpha.php:29 |
| GET | /contact | /{tenantSlug}/alpha/contact | /contact | contact | contact | contact | candidate-route | routes/govuk-alpha.php:31 |
| POST | /contact | /{tenantSlug}/alpha/contact | /contact | contact.store | storeContact | contact | candidate-workflow | routes/govuk-alpha.php:32 |
| POST | /cookie-consent | /{tenantSlug}/alpha/cookie-consent | /cookie-consent | cookies.store | storeCookieConsent | cookie-consent | candidate-workflow | routes/govuk-alpha.php:35 |
| GET | /cookies | /{tenantSlug}/alpha/cookies | /cookies | cookies | cookieSettings | cookies | candidate-route | routes/govuk-alpha.php:36 |
| GET | /report-a-problem | /{tenantSlug}/alpha/report-a-problem | /report-a-problem | report-problem | reportProblem | report-a-problem | candidate-route | routes/govuk-alpha.php:38 |
| POST | /report-a-problem | /{tenantSlug}/alpha/report-a-problem | /report-a-problem | report-problem.store | storeReportProblem | report-a-problem | candidate-workflow | routes/govuk-alpha.php:39 |
| GET | /about | /{tenantSlug}/alpha/about | /about | about | about | about | candidate-route | routes/govuk-alpha.php:44 |
| GET | /guide | /{tenantSlug}/alpha/guide | /guide | guide | guide | guide | candidate-route | routes/govuk-alpha.php:45 |
| GET | /features | /{tenantSlug}/alpha/features | /features | features | features | features | candidate-route | routes/govuk-alpha.php:46 |
| GET | /faq | /{tenantSlug}/alpha/faq | /faq | faq | faq | faq | candidate-route | routes/govuk-alpha.php:47 |
| GET | /trust-and-safety | /{tenantSlug}/alpha/trust-and-safety | /trust-and-safety | trust-safety | trustSafety | trust-and-safety | candidate-route | routes/govuk-alpha.php:48 |
| GET | /accessibility | /{tenantSlug}/alpha/accessibility | /accessibility | accessibility | accessibility | accessibility | candidate-route | routes/govuk-alpha.php:49 |
| GET | /legal | /{tenantSlug}/alpha/legal | /legal | legal.hub | legalHub | legal | candidate-route | routes/govuk-alpha.php:50 |
| GET | /legal/terms | /{tenantSlug}/alpha/legal/terms | /legal/terms | legal.terms | legalDocument | legal | candidate-route | routes/govuk-alpha.php:51 |
| GET | /legal/privacy | /{tenantSlug}/alpha/legal/privacy | /legal/privacy | legal.privacy | legalDocument | legal | candidate-route | routes/govuk-alpha.php:52 |
| GET | /legal/cookies | /{tenantSlug}/alpha/legal/cookies | /legal/cookies | legal.cookies | legalDocument | legal | candidate-route | routes/govuk-alpha.php:53 |
| GET | /legal/community-guidelines | /{tenantSlug}/alpha/legal/community-guidelines | /legal/community-guidelines | legal.community-guidelines | legalDocument | legal | candidate-route | routes/govuk-alpha.php:54 |
| GET | /legal/acceptable-use | /{tenantSlug}/alpha/legal/acceptable-use | /legal/acceptable-use | legal.acceptable-use | legalDocument | legal | candidate-route | routes/govuk-alpha.php:55 |
| GET | /help | /{tenantSlug}/alpha/help | /help | help | help | help | candidate-route | routes/govuk-alpha.php:58 |
| GET | /kb | /{tenantSlug}/alpha/kb | /kb | kb.index | kb | kb | candidate-route | routes/govuk-alpha.php:59 |
| GET | /kb/{id} | /{tenantSlug}/alpha/kb/{id} | /kb/{id} | kb.show | kbArticle | kb | missing | routes/govuk-alpha.php:60 |
| GET | /blog | /{tenantSlug}/alpha/blog | /blog | blog.index | blog | blog | candidate-route | routes/govuk-alpha.php:61 |
| GET | /blog/feed.xml | /{tenantSlug}/alpha/blog/feed.xml | /blog/feed.xml | blog.feed | blogFeed | blog | missing | routes/govuk-alpha.php:62 |
| GET | /blog/{slug} | /{tenantSlug}/alpha/blog/{slug} | /blog/{slug} | blog.show | blogPost | blog | missing | routes/govuk-alpha.php:63 |
| POST | /blog/{slug}/comments | /{tenantSlug}/alpha/blog/{slug}/comments | /blog/{slug}/comments | blog.comments.store | storeBlogComment | blog | missing | routes/govuk-alpha.php:64 |
| POST | /blog/{slug}/like | /{tenantSlug}/alpha/blog/{slug}/like | /blog/{slug}/like | blog.like | blogTogglePostLike | blog | missing | routes/govuk-alpha.php:65 |
| GET | /login | /{tenantSlug}/alpha/login | /login | login | login | login | candidate-route | routes/govuk-alpha.php:66 |
| POST | /login | /{tenantSlug}/alpha/login | /login | login.store | storeLogin | login | candidate-workflow | routes/govuk-alpha.php:67 |
| POST | /login/resend-verification | /{tenantSlug}/alpha/login/resend-verification | /login/resend-verification | login.resend | resendVerification | login | missing | routes/govuk-alpha.php:68 |
| POST | /logout | /{tenantSlug}/alpha/logout | /logout | logout | logout | logout | candidate-workflow | routes/govuk-alpha.php:69 |
| GET | /login/two-factor | /{tenantSlug}/alpha/login/two-factor | /login/two-factor | login.twofactor | twoFactor | login | skeleton | routes/govuk-alpha.php:70 |
| POST | /login/two-factor | /{tenantSlug}/alpha/login/two-factor | /login/two-factor | login.twofactor.store | storeTwoFactor | login | skeleton | routes/govuk-alpha.php:71 |
| GET | /login/forgot-password | /{tenantSlug}/alpha/login/forgot-password | /login/forgot-password | login.forgot | forgotPassword | login | missing | routes/govuk-alpha.php:72 |
| POST | /login/forgot-password | /{tenantSlug}/alpha/login/forgot-password | /login/forgot-password | login.forgot.store | sendPasswordReset | login | missing | routes/govuk-alpha.php:73 |
| GET | /password/reset | /{tenantSlug}/alpha/password/reset | /password/reset | password.reset | showResetPassword | password | skeleton | routes/govuk-alpha.php:74 |
| POST | /password/reset | /{tenantSlug}/alpha/password/reset | /password/reset | password.reset.store | storeResetPassword | password | skeleton | routes/govuk-alpha.php:75 |
| GET | /register | /{tenantSlug}/alpha/register | /register | register | register | register | candidate-route | routes/govuk-alpha.php:76 |
| POST | /register | /{tenantSlug}/alpha/register | /register | register.store | storeRegister | register | candidate-workflow | routes/govuk-alpha.php:77 |
| GET | /verify-email | /{tenantSlug}/alpha/verify-email | /verify-email | verify-email | verifyEmail | verify-email | skeleton | routes/govuk-alpha.php:79 |
| GET | /newsletter/unsubscribe | /{tenantSlug}/alpha/newsletter/unsubscribe | /newsletter/unsubscribe | newsletter.unsubscribe | newsletterUnsubscribe | newsletter | skeleton | routes/govuk-alpha.php:80 |
| GET | /dashboard | /{tenantSlug}/alpha/dashboard | /dashboard | dashboard | dashboard | dashboard | candidate-route | routes/govuk-alpha.php:82 |
| GET | /onboarding | /{tenantSlug}/alpha/onboarding | /onboarding | onboarding | onboarding | onboarding | skeleton | routes/govuk-alpha.php:84 |
| GET | /onboarding/{step} | /{tenantSlug}/alpha/onboarding/{step} | /onboarding/{step} | onboarding.step | onboardingStep | onboarding | missing | routes/govuk-alpha.php:85 |
| POST | /onboarding/avatar | /{tenantSlug}/alpha/onboarding/avatar | /onboarding/avatar | onboarding.avatar | onboardingAvatar | onboarding | missing | routes/govuk-alpha.php:86 |
| POST | /onboarding/{step} | /{tenantSlug}/alpha/onboarding/{step} | /onboarding/{step} | onboarding.step.post | onboardingStepPost | onboarding | missing | routes/govuk-alpha.php:87 |
| GET | /events | /{tenantSlug}/alpha/events | /events | events.index | events | events | candidate-route | routes/govuk-alpha.php:88 |
| GET | /events/new | /{tenantSlug}/alpha/events/new | /events/new | events.create | createEvent | events | candidate-family | routes/govuk-alpha.php:89 |
| POST | /events/new | /{tenantSlug}/alpha/events/new | /events/new | events.store | storeEvent | events | candidate-workflow-family | routes/govuk-alpha.php:90 |
| GET | /events/{id}/edit | /{tenantSlug}/alpha/events/{id}/edit | /events/{id}/edit | events.edit | editEvent | events | candidate-family | routes/govuk-alpha.php:91 |
| POST | /events/{id}/edit | /{tenantSlug}/alpha/events/{id}/edit | /events/{id}/edit | events.update | updateEvent | events | candidate-workflow-family | routes/govuk-alpha.php:92 |
| POST | /events/{id}/cancel | /{tenantSlug}/alpha/events/{id}/cancel | /events/{id}/cancel | events.cancel | cancelEvent | events | candidate-workflow-family | routes/govuk-alpha.php:93 |
| POST | /events/{id}/delete | /{tenantSlug}/alpha/events/{id}/delete | /events/{id}/delete | events.delete | deleteEvent | events | candidate-workflow-family | routes/govuk-alpha.php:94 |
| GET | /events/{id} | /{tenantSlug}/alpha/events/{id} | /events/{id} | events.show | event | events | candidate-family | routes/govuk-alpha.php:95 |
| POST | /events/{id}/rsvp | /{tenantSlug}/alpha/events/{id}/rsvp | /events/{id}/rsvp | events.rsvp.store | storeEventRsvp | events | candidate-workflow-family | routes/govuk-alpha.php:96 |
| POST | /events/{id}/waitlist | /{tenantSlug}/alpha/events/{id}/waitlist | /events/{id}/waitlist | events.waitlist.join | joinEventWaitlist | events | candidate-workflow-family | routes/govuk-alpha.php:97 |
| POST | /events/{id}/waitlist/leave | /{tenantSlug}/alpha/events/{id}/waitlist/leave | /events/{id}/waitlist/leave | events.waitlist.leave | leaveEventWaitlist | events | candidate-workflow-family | routes/govuk-alpha.php:98 |
| POST | /events/{id}/polls/{pollId}/vote | /{tenantSlug}/alpha/events/{id}/polls/{pollId}/vote | /events/{id}/polls/{pollId}/vote | events.polls.vote | storeEventPollVote | events | candidate-workflow-family | routes/govuk-alpha.php:99 |
| POST | /events/{id}/attendees/{attendeeId}/check-in | /{tenantSlug}/alpha/events/{id}/attendees/{attendeeId}/check-in | /events/{id}/attendees/{attendeeId}/check-in | events.checkin | storeEventCheckin | events | candidate-workflow-family | routes/govuk-alpha.php:101 |
| GET | /volunteering | /{tenantSlug}/alpha/volunteering | /volunteering | volunteering.index | volunteering | volunteering | candidate-route | routes/govuk-alpha.php:102 |
| GET | /volunteering/hours | /{tenantSlug}/alpha/volunteering/hours | /volunteering/hours | volunteering.hours | volunteeringHours | volunteering | missing | routes/govuk-alpha.php:103 |
| GET | /volunteering/accessibility | /{tenantSlug}/alpha/volunteering/accessibility | /volunteering/accessibility | volunteering.accessibility | volunteerAccessibility | volunteering | missing | routes/govuk-alpha.php:104 |
| POST | /volunteering/accessibility | /{tenantSlug}/alpha/volunteering/accessibility | /volunteering/accessibility | volunteering.accessibility.update | updateVolunteerAccessibility | volunteering | missing | routes/govuk-alpha.php:105 |
| POST | /volunteering/hours | /{tenantSlug}/alpha/volunteering/hours | /volunteering/hours | volunteering.hours.store | storeVolunteeringHours | volunteering | missing | routes/govuk-alpha.php:106 |
| GET | /volunteering/opportunities/{id} | /{tenantSlug}/alpha/volunteering/opportunities/{id} | /volunteering/opportunities/{id} | volunteering.show | volunteerOpportunity | volunteering | missing | routes/govuk-alpha.php:107 |
| POST | /volunteering/opportunities/{id}/apply | /{tenantSlug}/alpha/volunteering/opportunities/{id}/apply | /volunteering/opportunities/{id}/apply | volunteering.apply.store | applyVolunteerOpportunity | volunteering | missing | routes/govuk-alpha.php:108 |
| POST | /volunteering/applications/{id}/withdraw | /{tenantSlug}/alpha/volunteering/applications/{id}/withdraw | /volunteering/applications/{id}/withdraw | volunteering.applications.withdraw | withdrawVolunteerApplication | volunteering | missing | routes/govuk-alpha.php:109 |
| POST | /volunteering/opportunities/{id}/shifts/{shiftId}/signup | /{tenantSlug}/alpha/volunteering/opportunities/{id}/shifts/{shiftId}/signup | /volunteering/opportunities/{id}/shifts/{shiftId}/signup | volunteering.shifts.signup | signUpForVolunteerShift | volunteering | missing | routes/govuk-alpha.php:110 |
| POST | /volunteering/opportunities/{id}/shifts/{shiftId}/cancel | /{tenantSlug}/alpha/volunteering/opportunities/{id}/shifts/{shiftId}/cancel | /volunteering/opportunities/{id}/shifts/{shiftId}/cancel | volunteering.shifts.cancel | cancelVolunteerShift | volunteering | missing | routes/govuk-alpha.php:111 |
| GET | /volunteering/organisations/{id}/manage | /{tenantSlug}/alpha/volunteering/organisations/{id}/manage | /volunteering/organisations/{id}/manage | volunteering.org.manage | manageVolunteerOrg | volunteering | missing | routes/govuk-alpha.php:117 |
| POST | /volunteering/organisations/{id}/applications/{appId} | /{tenantSlug}/alpha/volunteering/organisations/{id}/applications/{appId} | /volunteering/organisations/{id}/applications/{appId} | volunteering.org.applications.handle | handleVolunteerOrgApplication | volunteering | missing | routes/govuk-alpha.php:118 |
| POST | /volunteering/organisations/{id}/hours/{logId} | /{tenantSlug}/alpha/volunteering/organisations/{id}/hours/{logId} | /volunteering/organisations/{id}/hours/{logId} | volunteering.org.hours.verify | verifyVolunteerOrgHours | volunteering | missing | routes/govuk-alpha.php:119 |
| GET | /feed | /{tenantSlug}/alpha/feed | /feed | feed | feed | feed | candidate-route | routes/govuk-alpha.php:120 |
| POST | /feed/posts | /{tenantSlug}/alpha/feed/posts | /feed/posts | feed.posts.store | storeFeedPost | feed | candidate-workflow-family | routes/govuk-alpha.php:121 |
| POST | /feed/polls/{pollId}/vote | /{tenantSlug}/alpha/feed/polls/{pollId}/vote | /feed/polls/{pollId}/vote | feed.polls.vote | storeFeedPollVote | feed | candidate-workflow-family | routes/govuk-alpha.php:122 |
| POST | /feed/items/{type}/{id}/like | /{tenantSlug}/alpha/feed/items/{type}/{id}/like | /feed/items/{type}/{id}/like | feed.items.like | storeFeedLike | feed | candidate-workflow-family | routes/govuk-alpha.php:123 |
| POST | /feed/items/{type}/{id}/comments | /{tenantSlug}/alpha/feed/items/{type}/{id}/comments | /feed/items/{type}/{id}/comments | feed.items.comments.store | storeFeedComment | feed | candidate-workflow-family | routes/govuk-alpha.php:128 |
| POST | /feed/posts/{id}/update | /{tenantSlug}/alpha/feed/posts/{id}/update | /feed/posts/{id}/update | feed.posts.update | updateFeedPost | feed | candidate-workflow-family | routes/govuk-alpha.php:133 |
| POST | /feed/posts/{id}/delete | /{tenantSlug}/alpha/feed/posts/{id}/delete | /feed/posts/{id}/delete | feed.posts.delete | deleteFeedPost | feed | candidate-workflow-family | routes/govuk-alpha.php:134 |
| POST | /feed/posts/{id}/hide | /{tenantSlug}/alpha/feed/posts/{id}/hide | /feed/posts/{id}/hide | feed.hide | hideFeedItem | feed | candidate-workflow-family | routes/govuk-alpha.php:135 |
| POST | /feed/users/{id}/mute | /{tenantSlug}/alpha/feed/users/{id}/mute | /feed/users/{id}/mute | feed.mute | muteFeedUser | feed | candidate-workflow-family | routes/govuk-alpha.php:136 |
| POST | /feed/posts/{id}/report | /{tenantSlug}/alpha/feed/posts/{id}/report | /feed/posts/{id}/report | feed.report | reportFeedItem | feed | candidate-workflow-family | routes/govuk-alpha.php:137 |
| POST | /feed/comments/{id}/update | /{tenantSlug}/alpha/feed/comments/{id}/update | /feed/comments/{id}/update | feed.comments.update | updateFeedComment | feed | candidate-workflow-family | routes/govuk-alpha.php:138 |
| POST | /feed/comments/{id}/delete | /{tenantSlug}/alpha/feed/comments/{id}/delete | /feed/comments/{id}/delete | feed.comments.delete | deleteFeedComment | feed | candidate-workflow-family | routes/govuk-alpha.php:139 |
| GET | /feed/posts/{id} | /{tenantSlug}/alpha/feed/posts/{id} | /feed/posts/{id} | feed.posts.show | feedPost | feed | candidate-family | routes/govuk-alpha.php:141 |
| POST | /feed/posts/{id}/react | /{tenantSlug}/alpha/feed/posts/{id}/react | /feed/posts/{id}/react | feed.posts.react | storeFeedPostReaction | feed | candidate-workflow-family | routes/govuk-alpha.php:142 |
| POST | /feed/comments/{id}/react | /{tenantSlug}/alpha/feed/comments/{id}/react | /feed/comments/{id}/react | feed.comments.react | storeFeedCommentReaction | feed | candidate-workflow-family | routes/govuk-alpha.php:143 |
| POST | /feed/posts/{id}/share | /{tenantSlug}/alpha/feed/posts/{id}/share | /feed/posts/{id}/share | feed.posts.share | storeFeedPostShare | feed | candidate-workflow-family | routes/govuk-alpha.php:144 |
| POST | /feed/posts/{id}/save | /{tenantSlug}/alpha/feed/posts/{id}/save | /feed/posts/{id}/save | feed.posts.save | storeFeedPostSave | feed | candidate-workflow-family | routes/govuk-alpha.php:145 |
| GET | /listings | /{tenantSlug}/alpha/listings | /listings | listings.index | listings | listings | candidate-route | routes/govuk-alpha.php:146 |
| GET | /listings/new | /{tenantSlug}/alpha/listings/new | /listings/new | listings.create | createListing | listings | candidate-family | routes/govuk-alpha.php:147 |
| POST | /listings/new | /{tenantSlug}/alpha/listings/new | /listings/new | listings.store | storeListing | listings | candidate-workflow-family | routes/govuk-alpha.php:148 |
| GET | /listings/{id}/edit | /{tenantSlug}/alpha/listings/{id}/edit | /listings/{id}/edit | listings.edit | editListing | listings | candidate-family | routes/govuk-alpha.php:149 |
| POST | /listings/{id}/edit | /{tenantSlug}/alpha/listings/{id}/edit | /listings/{id}/edit | listings.update | updateListing | listings | candidate-workflow-family | routes/govuk-alpha.php:150 |
| POST | /listings/{id}/delete | /{tenantSlug}/alpha/listings/{id}/delete | /listings/{id}/delete | listings.delete | deleteListing | listings | candidate-workflow-family | routes/govuk-alpha.php:151 |
| GET | /listings/{listingId}/exchange-request | /{tenantSlug}/alpha/listings/{listingId}/exchange-request | /listings/{listingId}/exchange-request | exchanges.request | requestExchange | listings | candidate-family | routes/govuk-alpha.php:152 |
| POST | /listings/{listingId}/exchange-request | /{tenantSlug}/alpha/listings/{listingId}/exchange-request | /listings/{listingId}/exchange-request | exchanges.request.store | storeExchangeRequest | listings | candidate-workflow-family | routes/govuk-alpha.php:153 |
| GET | /listings/{id} | /{tenantSlug}/alpha/listings/{id} | /listings/{id} | listings.show | listing | listings | candidate-family | routes/govuk-alpha.php:154 |
| GET | /exchanges | /{tenantSlug}/alpha/exchanges | /exchanges | exchanges.index | exchanges | exchanges | candidate-route | routes/govuk-alpha.php:155 |
| GET | /exchanges/{id} | /{tenantSlug}/alpha/exchanges/{id} | /exchanges/{id} | exchanges.show | exchange | exchanges | missing | routes/govuk-alpha.php:156 |
| POST | /exchanges/{id} | /{tenantSlug}/alpha/exchanges/{id} | /exchanges/{id} | exchanges.action.store | storeExchangeAction | exchanges | missing | routes/govuk-alpha.php:157 |
| POST | /exchanges/{id}/rate | /{tenantSlug}/alpha/exchanges/{id}/rate | /exchanges/{id}/rate | exchanges.rate.store | storeExchangeRating | exchanges | missing | routes/govuk-alpha.php:158 |
| GET | /group-exchanges | /{tenantSlug}/alpha/group-exchanges | /group-exchanges | group-exchanges.index | groupExchanges | group-exchanges | candidate-route | routes/govuk-alpha.php:159 |
| GET | /group-exchanges/new | /{tenantSlug}/alpha/group-exchanges/new | /group-exchanges/new | group-exchanges.create | createGroupExchange | group-exchanges | missing | routes/govuk-alpha.php:160 |
| POST | /group-exchanges/new | /{tenantSlug}/alpha/group-exchanges/new | /group-exchanges/new | group-exchanges.store | storeGroupExchange | group-exchanges | missing | routes/govuk-alpha.php:161 |
| GET | /group-exchanges/{id} | /{tenantSlug}/alpha/group-exchanges/{id} | /group-exchanges/{id} | group-exchanges.show | groupExchange | group-exchanges | missing | routes/govuk-alpha.php:162 |
| POST | /group-exchanges/{id}/participants | /{tenantSlug}/alpha/group-exchanges/{id}/participants | /group-exchanges/{id}/participants | group-exchanges.participants.add | addGroupExchangeParticipant | group-exchanges | missing | routes/govuk-alpha.php:163 |
| POST | /group-exchanges/{id}/participants/{participantUserId}/remove | /{tenantSlug}/alpha/group-exchanges/{id}/participants/{participantUserId}/remove | /group-exchanges/{id}/participants/{participantUserId}/remove | group-exchanges.participants.remove | removeGroupExchangeParticipant | group-exchanges | missing | routes/govuk-alpha.php:164 |
| POST | /group-exchanges/{id}/confirm | /{tenantSlug}/alpha/group-exchanges/{id}/confirm | /group-exchanges/{id}/confirm | group-exchanges.confirm | confirmGroupExchange | group-exchanges | missing | routes/govuk-alpha.php:165 |
| POST | /group-exchanges/{id}/complete | /{tenantSlug}/alpha/group-exchanges/{id}/complete | /group-exchanges/{id}/complete | group-exchanges.complete | completeGroupExchange | group-exchanges | missing | routes/govuk-alpha.php:166 |
| POST | /group-exchanges/{id}/cancel | /{tenantSlug}/alpha/group-exchanges/{id}/cancel | /group-exchanges/{id}/cancel | group-exchanges.cancel | cancelGroupExchange | group-exchanges | missing | routes/govuk-alpha.php:167 |
| GET | /matches | /{tenantSlug}/alpha/matches | /matches | matches.index | matches | matches | skeleton | routes/govuk-alpha.php:168 |
| GET | /polls | /{tenantSlug}/alpha/polls | /polls | polls.index | polls | polls | candidate-route | routes/govuk-alpha.php:169 |
| POST | /polls | /{tenantSlug}/alpha/polls | /polls | polls.store | storePoll | polls | candidate-workflow | routes/govuk-alpha.php:170 |
| POST | /polls/{pollId}/vote | /{tenantSlug}/alpha/polls/{pollId}/vote | /polls/{pollId}/vote | polls.vote | storePollVote | polls | missing | routes/govuk-alpha.php:171 |
| GET | /wallet | /{tenantSlug}/alpha/wallet | /wallet | wallet.index | wallet | wallet | candidate-route | routes/govuk-alpha.php:172 |
| GET | /wallet/export.csv | /{tenantSlug}/alpha/wallet/export.csv | /wallet/export.csv | wallet.export | exportTransactions | wallet | candidate-family | routes/govuk-alpha.php:176 |
| POST | /wallet/donate | /{tenantSlug}/alpha/wallet/donate | /wallet/donate | wallet.donate | donateCredits | wallet | candidate-workflow-family | routes/govuk-alpha.php:177 |
| POST | /wallet/transfer | /{tenantSlug}/alpha/wallet/transfer | /wallet/transfer | wallet.transfer | transferCredits | wallet | candidate-workflow-family | routes/govuk-alpha.php:178 |
| GET | /wallet/recipients | /{tenantSlug}/alpha/wallet/recipients | /wallet/recipients | wallet.recipients | walletRecipients | wallet | candidate-family | routes/govuk-alpha.php:179 |
| GET | /messages | /{tenantSlug}/alpha/messages | /messages | messages.index | messages | messages | candidate-route | routes/govuk-alpha.php:180 |
| GET | /messages/new/{userId} | /{tenantSlug}/alpha/messages/new/{userId} | /messages/new/{userId} | messages.new | conversation | messages | candidate-family | routes/govuk-alpha.php:181 |
| GET | /messages/{userId} | /{tenantSlug}/alpha/messages/{userId} | /messages/{userId} | messages.show | conversation | messages | candidate-family | routes/govuk-alpha.php:182 |
| POST | /messages/{userId} | /{tenantSlug}/alpha/messages/{userId} | /messages/{userId} | messages.store | storeMessage | messages | candidate-workflow-family | routes/govuk-alpha.php:183 |
| POST | /messages/{userId}/archive | /{tenantSlug}/alpha/messages/{userId}/archive | /messages/{userId}/archive | messages.archive | archiveConversation | messages | candidate-workflow-family | routes/govuk-alpha.php:184 |
| POST | /messages/{userId}/restore | /{tenantSlug}/alpha/messages/{userId}/restore | /messages/{userId}/restore | messages.restore | restoreConversation | messages | candidate-workflow-family | routes/govuk-alpha.php:185 |
| POST | /messages/{userId}/m/{messageId}/edit | /{tenantSlug}/alpha/messages/{userId}/m/{messageId}/edit | /messages/{userId}/m/{messageId}/edit | messages.edit | updateMessage | messages | candidate-workflow-family | routes/govuk-alpha.php:186 |
| POST | /messages/{userId}/m/{messageId}/delete | /{tenantSlug}/alpha/messages/{userId}/m/{messageId}/delete | /messages/{userId}/m/{messageId}/delete | messages.delete | deleteMessage | messages | candidate-workflow-family | routes/govuk-alpha.php:187 |
| GET | /members | /{tenantSlug}/alpha/members | /members | members.index | members | members | candidate-route | routes/govuk-alpha.php:188 |
| GET | /members/{id} | /{tenantSlug}/alpha/members/{id} | /members/{id} | members.show | memberProfile | members | candidate-family | routes/govuk-alpha.php:189 |
| POST | /members/{id}/connection | /{tenantSlug}/alpha/members/{id}/connection | /members/{id}/connection | members.connection | updateMemberConnection | members | candidate-workflow-family | routes/govuk-alpha.php:190 |
| POST | /members/{id}/endorse | /{tenantSlug}/alpha/members/{id}/endorse | /members/{id}/endorse | members.endorse | endorseMemberSkill | members | candidate-workflow-family | routes/govuk-alpha.php:191 |
| POST | /members/{id}/block | /{tenantSlug}/alpha/members/{id}/block | /members/{id}/block | members.block | blockMember | members | candidate-workflow-family | routes/govuk-alpha.php:193 |
| POST | /members/{id}/unblock | /{tenantSlug}/alpha/members/{id}/unblock | /members/{id}/unblock | members.unblock | unblockMember | members | candidate-workflow-family | routes/govuk-alpha.php:194 |
| GET | /connections | /{tenantSlug}/alpha/connections | /connections | connections.index | connections | connections | candidate-route | routes/govuk-alpha.php:195 |
| POST | /connections/{id}/accept | /{tenantSlug}/alpha/connections/{id}/accept | /connections/{id}/accept | connections.accept | acceptConnection | connections | candidate-workflow-family | routes/govuk-alpha.php:196 |
| POST | /connections/{id}/decline | /{tenantSlug}/alpha/connections/{id}/decline | /connections/{id}/decline | connections.decline | declineConnection | connections | candidate-workflow-family | routes/govuk-alpha.php:197 |
| POST | /connections/{id}/remove | /{tenantSlug}/alpha/connections/{id}/remove | /connections/{id}/remove | connections.remove | cancelConnection | connections | candidate-workflow-family | routes/govuk-alpha.php:198 |
| GET | /account | /{tenantSlug}/alpha/account | /account | account | account | account | candidate-route | routes/govuk-alpha.php:199 |
| GET | /achievements | /{tenantSlug}/alpha/achievements | /achievements | achievements | achievements | achievements | candidate-route | routes/govuk-alpha.php:200 |
| POST | /achievements/daily-reward | /{tenantSlug}/alpha/achievements/daily-reward | /achievements/daily-reward | achievements.daily-reward | dailyReward | achievements | missing | routes/govuk-alpha.php:202 |
| POST | /achievements/challenges/{id}/claim | /{tenantSlug}/alpha/achievements/challenges/{id}/claim | /achievements/challenges/{id}/claim | achievements.claim-challenge | claimChallengeReward | achievements | missing | routes/govuk-alpha.php:203 |
| GET | /leaderboard | /{tenantSlug}/alpha/leaderboard | /leaderboard | leaderboard | leaderboard | leaderboard | candidate-route | routes/govuk-alpha.php:204 |
| GET | /nexus-score | /{tenantSlug}/alpha/nexus-score | /nexus-score | nexus-score | nexusScore | nexus-score | candidate-route | routes/govuk-alpha.php:205 |
| GET | /notifications | /{tenantSlug}/alpha/notifications | /notifications | notifications.index | notifications | notifications | candidate-route | routes/govuk-alpha.php:206 |
| POST | /notifications/read-all | /{tenantSlug}/alpha/notifications/read-all | /notifications/read-all | notifications.read-all | markAllNotificationsRead | notifications | candidate-workflow-family | routes/govuk-alpha.php:207 |
| POST | /notifications/{id}/delete | /{tenantSlug}/alpha/notifications/{id}/delete | /notifications/{id}/delete | notifications.delete | deleteNotification | notifications | candidate-workflow-family | routes/govuk-alpha.php:208 |
| POST | /notifications/{id}/read | /{tenantSlug}/alpha/notifications/{id}/read | /notifications/{id}/read | notifications.mark-read | markNotificationRead | notifications | candidate-workflow-family | routes/govuk-alpha.php:209 |
| POST | /notifications/delete-all | /{tenantSlug}/alpha/notifications/delete-all | /notifications/delete-all | notifications.delete-all | deleteAllNotifications | notifications | candidate-workflow-family | routes/govuk-alpha.php:210 |
| POST | /notifications/group/read | /{tenantSlug}/alpha/notifications/group/read | /notifications/group/read | notifications.group-read | markGroupNotificationsRead | notifications | candidate-workflow-family | routes/govuk-alpha.php:211 |
| GET | /activity | /{tenantSlug}/alpha/activity | /activity | activity | activity | activity | candidate-route | routes/govuk-alpha.php:212 |
| GET | /reviews | /{tenantSlug}/alpha/reviews | /reviews | reviews.index | reviews | reviews | candidate-route | routes/govuk-alpha.php:213 |
| POST | /reviews | /{tenantSlug}/alpha/reviews | /reviews | reviews.store | storeReview | reviews | candidate-workflow | routes/govuk-alpha.php:214 |
| GET | /explore | /{tenantSlug}/alpha/explore | /explore | explore | explore | explore | candidate-route | routes/govuk-alpha.php:215 |
| GET | /search | /{tenantSlug}/alpha/search | /search | search | search | search | candidate-route | routes/govuk-alpha.php:216 |
| GET | /skills | /{tenantSlug}/alpha/skills | /skills | skills.index | skills | skills | candidate-route | routes/govuk-alpha.php:217 |
| GET | /groups | /{tenantSlug}/alpha/groups | /groups | groups.index | groups | groups | candidate-route | routes/govuk-alpha.php:218 |
| GET | /groups/new | /{tenantSlug}/alpha/groups/new | /groups/new | groups.create | createGroup | groups | candidate-family | routes/govuk-alpha.php:220 |
| POST | /groups/new | /{tenantSlug}/alpha/groups/new | /groups/new | groups.store | storeGroup | groups | candidate-workflow-family | routes/govuk-alpha.php:221 |
| GET | /groups/{id} | /{tenantSlug}/alpha/groups/{id} | /groups/{id} | groups.show | group | groups | candidate-family | routes/govuk-alpha.php:222 |
| POST | /groups/{id}/join | /{tenantSlug}/alpha/groups/{id}/join | /groups/{id}/join | groups.join | joinGroup | groups | candidate-workflow-family | routes/govuk-alpha.php:223 |
| POST | /groups/{id}/leave | /{tenantSlug}/alpha/groups/{id}/leave | /groups/{id}/leave | groups.leave | leaveGroup | groups | candidate-workflow-family | routes/govuk-alpha.php:224 |
| GET | /groups/{id}/edit | /{tenantSlug}/alpha/groups/{id}/edit | /groups/{id}/edit | groups.edit | editGroup | groups | candidate-family | routes/govuk-alpha.php:226 |
| POST | /groups/{id}/edit | /{tenantSlug}/alpha/groups/{id}/edit | /groups/{id}/edit | groups.update | updateGroup | groups | candidate-workflow-family | routes/govuk-alpha.php:227 |
| POST | /groups/{id}/delete | /{tenantSlug}/alpha/groups/{id}/delete | /groups/{id}/delete | groups.delete | deleteGroup | groups | candidate-workflow-family | routes/govuk-alpha.php:228 |
| GET | /groups/{id}/manage | /{tenantSlug}/alpha/groups/{id}/manage | /groups/{id}/manage | groups.manage | manageGroup | groups | candidate-family | routes/govuk-alpha.php:229 |
| POST | /groups/{id}/members/{memberId} | /{tenantSlug}/alpha/groups/{id}/members/{memberId} | /groups/{id}/members/{memberId} | groups.members.update | updateGroupMember | groups | candidate-workflow-family | routes/govuk-alpha.php:230 |
| POST | /groups/{id}/requests/{requesterId} | /{tenantSlug}/alpha/groups/{id}/requests/{requesterId} | /groups/{id}/requests/{requesterId} | groups.requests.handle | handleGroupRequest | groups | candidate-workflow-family | routes/govuk-alpha.php:231 |
| GET | /groups/{id}/discussions | /{tenantSlug}/alpha/groups/{id}/discussions | /groups/{id}/discussions | groups.discussions.index | groupDiscussions | groups | candidate-family | routes/govuk-alpha.php:233 |
| GET | /groups/{id}/discussions/new | /{tenantSlug}/alpha/groups/{id}/discussions/new | /groups/{id}/discussions/new | groups.discussions.create | createGroupDiscussion | groups | candidate-family | routes/govuk-alpha.php:234 |
| POST | /groups/{id}/discussions/new | /{tenantSlug}/alpha/groups/{id}/discussions/new | /groups/{id}/discussions/new | groups.discussions.store | storeGroupDiscussion | groups | candidate-workflow-family | routes/govuk-alpha.php:235 |
| GET | /groups/{id}/discussions/{discussionId} | /{tenantSlug}/alpha/groups/{id}/discussions/{discussionId} | /groups/{id}/discussions/{discussionId} | groups.discussions.show | groupDiscussion | groups | candidate-family | routes/govuk-alpha.php:236 |
| POST | /groups/{id}/discussions/{discussionId}/reply | /{tenantSlug}/alpha/groups/{id}/discussions/{discussionId}/reply | /groups/{id}/discussions/{discussionId}/reply | groups.discussions.reply | replyGroupDiscussion | groups | candidate-workflow-family | routes/govuk-alpha.php:237 |
| POST | /groups/{id}/feed | /{tenantSlug}/alpha/groups/{id}/feed | /groups/{id}/feed | groups.feed.store | storeGroupFeedPost | groups | candidate-workflow-family | routes/govuk-alpha.php:241 |
| GET | /goals | /{tenantSlug}/alpha/goals | /goals | goals.index | goals | goals | skeleton | routes/govuk-alpha.php:242 |
| POST | /goals | /{tenantSlug}/alpha/goals | /goals | goals.store | storeGoal | goals | skeleton | routes/govuk-alpha.php:243 |
| GET | /goals/templates | /{tenantSlug}/alpha/goals/templates | /goals/templates | goals.templates | goalTemplates | goals | missing | routes/govuk-alpha.php:246 |
| POST | /goals/templates/{id} | /{tenantSlug}/alpha/goals/templates/{id} | /goals/templates/{id} | goals.templates.use | storeGoalFromTemplate | goals | missing | routes/govuk-alpha.php:247 |
| GET | /goals/buddying | /{tenantSlug}/alpha/goals/buddying | /goals/buddying | goals.buddying | goalBuddying | goals | missing | routes/govuk-alpha.php:248 |
| GET | /goals/discover | /{tenantSlug}/alpha/goals/discover | /goals/discover | goals.discover | goalDiscover | goals | missing | routes/govuk-alpha.php:250 |
| GET | /goals/{id} | /{tenantSlug}/alpha/goals/{id} | /goals/{id} | goals.show | goal | goals | missing | routes/govuk-alpha.php:251 |
| GET | /goals/{id}/edit | /{tenantSlug}/alpha/goals/{id}/edit | /goals/{id}/edit | goals.edit | editGoalForm | goals | missing | routes/govuk-alpha.php:252 |
| POST | /goals/{id}/edit | /{tenantSlug}/alpha/goals/{id}/edit | /goals/{id}/edit | goals.update | updateGoal | goals | missing | routes/govuk-alpha.php:253 |
| POST | /goals/{id}/delete | /{tenantSlug}/alpha/goals/{id}/delete | /goals/{id}/delete | goals.delete | deleteGoal | goals | missing | routes/govuk-alpha.php:254 |
| POST | /goals/{id}/buddy | /{tenantSlug}/alpha/goals/{id}/buddy | /goals/{id}/buddy | goals.buddy | becomeGoalBuddy | goals | missing | routes/govuk-alpha.php:255 |
| POST | /goals/{id}/buddy-nudge | /{tenantSlug}/alpha/goals/{id}/buddy-nudge | /goals/{id}/buddy-nudge | goals.buddy-nudge | buddyNudge | goals | missing | routes/govuk-alpha.php:256 |
| POST | /goals/{id}/progress | /{tenantSlug}/alpha/goals/{id}/progress | /goals/{id}/progress | goals.progress | incrementGoal | goals | missing | routes/govuk-alpha.php:257 |
| POST | /goals/{id}/complete | /{tenantSlug}/alpha/goals/{id}/complete | /goals/{id}/complete | goals.complete | completeGoal | goals | missing | routes/govuk-alpha.php:258 |
| GET | /organisations | /{tenantSlug}/alpha/organisations | /organisations | organisations.index | organisations | organisations | skeleton | routes/govuk-alpha.php:259 |
| POST | /organisations | /{tenantSlug}/alpha/organisations | /organisations | organisations.store | storeOrganisation | organisations | skeleton | routes/govuk-alpha.php:260 |
| GET | /organisations/{id} | /{tenantSlug}/alpha/organisations/{id} | /organisations/{id} | organisations.show | organisation | organisations | missing | routes/govuk-alpha.php:261 |
| GET | /saved | /{tenantSlug}/alpha/saved | /saved | saved.index | saved | saved | candidate-route | routes/govuk-alpha.php:262 |
| POST | /saved/destroy | /{tenantSlug}/alpha/saved/destroy | /saved/destroy | saved.destroy | destroySaved | saved | missing | routes/govuk-alpha.php:263 |
| GET | /resources | /{tenantSlug}/alpha/resources | /resources | resources.index | resources | resources | candidate-route | routes/govuk-alpha.php:264 |
| GET | /jobs | /{tenantSlug}/alpha/jobs | /jobs | jobs.index | jobs | jobs | skeleton | routes/govuk-alpha.php:265 |
| GET | /jobs/saved | /{tenantSlug}/alpha/jobs/saved | /jobs/saved | jobs.saved | savedJobs | jobs | missing | routes/govuk-alpha.php:267 |
| GET | /jobs/applications | /{tenantSlug}/alpha/jobs/applications | /jobs/applications | jobs.applications | myJobApplications | jobs | missing | routes/govuk-alpha.php:268 |
| POST | /jobs/applications/{appId}/withdraw | /{tenantSlug}/alpha/jobs/applications/{appId}/withdraw | /jobs/applications/{appId}/withdraw | jobs.applications.withdraw | withdrawJobApplication | jobs | missing | routes/govuk-alpha.php:269 |
| GET | /jobs/mine | /{tenantSlug}/alpha/jobs/mine | /jobs/mine | jobs.mine | myJobPostings | jobs | missing | routes/govuk-alpha.php:270 |
| GET | /jobs/create | /{tenantSlug}/alpha/jobs/create | /jobs/create | jobs.create | createJobForm | jobs | missing | routes/govuk-alpha.php:271 |
| POST | /jobs | /{tenantSlug}/alpha/jobs | /jobs | jobs.store | storeJob | jobs | skeleton | routes/govuk-alpha.php:272 |
| GET | /jobs/alerts | /{tenantSlug}/alpha/jobs/alerts | /jobs/alerts | jobs.alerts | jobAlerts | jobs | missing | routes/govuk-alpha.php:273 |
| POST | /jobs/alerts | /{tenantSlug}/alpha/jobs/alerts | /jobs/alerts | jobs.alerts.subscribe | subscribeJobAlert | jobs | missing | routes/govuk-alpha.php:274 |
| POST | /jobs/alerts/{alertId}/pause | /{tenantSlug}/alpha/jobs/alerts/{alertId}/pause | /jobs/alerts/{alertId}/pause | jobs.alerts.pause | pauseJobAlert | jobs | missing | routes/govuk-alpha.php:275 |
| POST | /jobs/alerts/{alertId}/resume | /{tenantSlug}/alpha/jobs/alerts/{alertId}/resume | /jobs/alerts/{alertId}/resume | jobs.alerts.resume | resumeJobAlert | jobs | missing | routes/govuk-alpha.php:276 |
| POST | /jobs/alerts/{alertId}/delete | /{tenantSlug}/alpha/jobs/alerts/{alertId}/delete | /jobs/alerts/{alertId}/delete | jobs.alerts.delete | deleteJobAlert | jobs | missing | routes/govuk-alpha.php:277 |
| GET | /jobs/{id} | /{tenantSlug}/alpha/jobs/{id} | /jobs/{id} | jobs.show | job | jobs | missing | routes/govuk-alpha.php:278 |
| GET | /jobs/{id}/edit | /{tenantSlug}/alpha/jobs/{id}/edit | /jobs/{id}/edit | jobs.edit | editJobForm | jobs | missing | routes/govuk-alpha.php:279 |
| POST | /jobs/{id}/update | /{tenantSlug}/alpha/jobs/{id}/update | /jobs/{id}/update | jobs.update | updateJob | jobs | missing | routes/govuk-alpha.php:280 |
| POST | /jobs/{id}/delete | /{tenantSlug}/alpha/jobs/{id}/delete | /jobs/{id}/delete | jobs.delete | deleteJob | jobs | missing | routes/govuk-alpha.php:281 |
| POST | /jobs/{id}/renew | /{tenantSlug}/alpha/jobs/{id}/renew | /jobs/{id}/renew | jobs.renew | renewJobPosting | jobs | missing | routes/govuk-alpha.php:282 |
| GET | /jobs/{id}/applications/export.csv | /{tenantSlug}/alpha/jobs/{id}/applications/export.csv | /jobs/{id}/applications/export.csv | jobs.applicants.export | exportJobApplications | jobs | missing | routes/govuk-alpha.php:283 |
| GET | /jobs/{id}/applications | /{tenantSlug}/alpha/jobs/{id}/applications | /jobs/{id}/applications | jobs.applicants | jobApplicants | jobs | missing | routes/govuk-alpha.php:284 |
| POST | /jobs/{id}/applications/{appId}/status | /{tenantSlug}/alpha/jobs/{id}/applications/{appId}/status | /jobs/{id}/applications/{appId}/status | jobs.applicants.status | setApplicationStatus | jobs | missing | routes/govuk-alpha.php:285 |
| POST | /jobs/{id}/apply | /{tenantSlug}/alpha/jobs/{id}/apply | /jobs/{id}/apply | jobs.apply | applyJob | jobs | missing | routes/govuk-alpha.php:286 |
| POST | /jobs/{id}/save | /{tenantSlug}/alpha/jobs/{id}/save | /jobs/{id}/save | jobs.save | saveJobBookmark | jobs | missing | routes/govuk-alpha.php:287 |
| POST | /jobs/{id}/unsave | /{tenantSlug}/alpha/jobs/{id}/unsave | /jobs/{id}/unsave | jobs.unsave | unsaveJobBookmark | jobs | missing | routes/govuk-alpha.php:288 |
| GET | /ideation | /{tenantSlug}/alpha/ideation | /ideation | ideation.index | ideation | ideation | skeleton | routes/govuk-alpha.php:289 |
| GET | /ideation/{id} | /{tenantSlug}/alpha/ideation/{id} | /ideation/{id} | ideation.show | ideationChallenge | ideation | missing | routes/govuk-alpha.php:290 |
| POST | /ideation/{id}/ideas | /{tenantSlug}/alpha/ideation/{id}/ideas | /ideation/{id}/ideas | ideation.ideas.store | submitIdea | ideation | missing | routes/govuk-alpha.php:291 |
| POST | /ideation/{id}/ideas/{ideaId}/vote | /{tenantSlug}/alpha/ideation/{id}/ideas/{ideaId}/vote | /ideation/{id}/ideas/{ideaId}/vote | ideation.ideas.vote | voteIdea | ideation | missing | routes/govuk-alpha.php:292 |
| GET | /marketplace | /{tenantSlug}/alpha/marketplace | /marketplace | marketplace.index | marketplace | marketplace | skeleton | routes/govuk-alpha.php:294 |
| GET | /marketplace/{id} | /{tenantSlug}/alpha/marketplace/{id} | /marketplace/{id} | marketplace.show | marketplaceItem | marketplace | missing | routes/govuk-alpha.php:295 |
| GET | /courses | /{tenantSlug}/alpha/courses | /courses | courses.index | courses | courses | skeleton | routes/govuk-alpha.php:296 |
| GET | /courses/{id} | /{tenantSlug}/alpha/courses/{id} | /courses/{id} | courses.show | course | courses | missing | routes/govuk-alpha.php:297 |
| POST | /courses/{id}/enrol | /{tenantSlug}/alpha/courses/{id}/enrol | /courses/{id}/enrol | courses.enrol | enrolCourse | courses | missing | routes/govuk-alpha.php:298 |
| GET | /courses/{id}/certificate | /{tenantSlug}/alpha/courses/{id}/certificate | /courses/{id}/certificate | courses.certificate | courseCertificate | courses | missing | routes/govuk-alpha.php:299 |
| POST | /courses/{id}/reviews | /{tenantSlug}/alpha/courses/{id}/reviews | /courses/{id}/reviews | courses.reviews.store | submitCourseReview | courses | missing | routes/govuk-alpha.php:300 |
| GET | /podcasts | /{tenantSlug}/alpha/podcasts | /podcasts | podcasts.index | podcasts | podcasts | skeleton | routes/govuk-alpha.php:301 |
| GET | /podcasts/{id} | /{tenantSlug}/alpha/podcasts/{id} | /podcasts/{id} | podcasts.show | podcast | podcasts | missing | routes/govuk-alpha.php:302 |
| GET | /coupons | /{tenantSlug}/alpha/coupons | /coupons | coupons.index | coupons | coupons | skeleton | routes/govuk-alpha.php:303 |
| GET | /premium | /{tenantSlug}/alpha/premium | /premium | premium.index | premium | premium | skeleton | routes/govuk-alpha.php:304 |
| POST | /premium/subscribe | /{tenantSlug}/alpha/premium/subscribe | /premium/subscribe | premium.subscribe | subscribePremium | premium | missing | routes/govuk-alpha.php:305 |
| GET | /clubs | /{tenantSlug}/alpha/clubs | /clubs | clubs.index | clubs | clubs | skeleton | routes/govuk-alpha.php:306 |
| GET | /federation | /{tenantSlug}/alpha/federation | /federation | federation.index | federation | federation | skeleton | routes/govuk-alpha.php:307 |
| GET | /federation/opt-in | /{tenantSlug}/alpha/federation/opt-in | /federation/opt-in | federation.opt-in | federationOptIn | federation | missing | routes/govuk-alpha.php:310 |
| POST | /federation/opt-in | /{tenantSlug}/alpha/federation/opt-in | /federation/opt-in | federation.opt-in.store | storeFederationOptIn | federation | missing | routes/govuk-alpha.php:311 |
| GET | /federation/opt-out | /{tenantSlug}/alpha/federation/opt-out | /federation/opt-out | federation.opt-out | federationOptOut | federation | missing | routes/govuk-alpha.php:312 |
| POST | /federation/opt-out | /{tenantSlug}/alpha/federation/opt-out | /federation/opt-out | federation.opt-out.store | storeFederationOptOut | federation | missing | routes/govuk-alpha.php:313 |
| GET | /federation/settings | /{tenantSlug}/alpha/federation/settings | /federation/settings | federation.settings | federationSettings | federation | missing | routes/govuk-alpha.php:314 |
| POST | /federation/settings | /{tenantSlug}/alpha/federation/settings | /federation/settings | federation.settings.update | updateFederationSettings | federation | missing | routes/govuk-alpha.php:315 |
| GET | /federation/members | /{tenantSlug}/alpha/federation/members | /federation/members | federation.members.index | federationMembers | federation | missing | routes/govuk-alpha.php:316 |
| GET | /federation/members/{id} | /{tenantSlug}/alpha/federation/members/{id} | /federation/members/{id} | federation.members.show | federationMember | federation | missing | routes/govuk-alpha.php:317 |
| GET | /federation/listings | /{tenantSlug}/alpha/federation/listings | /federation/listings | federation.listings.index | federationListings | federation | missing | routes/govuk-alpha.php:318 |
| GET | /federation/listings/{tenantId}/{id} | /{tenantSlug}/alpha/federation/listings/{tenantId}/{id} | /federation/listings/{tenantId}/{id} | federation.listings.show | federationListingShow | federation | missing | routes/govuk-alpha.php:321 |
| GET | /federation/events | /{tenantSlug}/alpha/federation/events | /federation/events | federation.events.index | federationEvents | federation | missing | routes/govuk-alpha.php:322 |
| GET | /federation/groups | /{tenantSlug}/alpha/federation/groups | /federation/groups | federation.groups.index | federationGroups | federation | missing | routes/govuk-alpha.php:323 |
| GET | /federation/partners | /{tenantSlug}/alpha/federation/partners | /federation/partners | federation.partners.index | federationPartners | federation | missing | routes/govuk-alpha.php:326 |
| GET | /federation/partners/{id} | /{tenantSlug}/alpha/federation/partners/{id} | /federation/partners/{id} | federation.partners.show | federationPartner | federation | missing | routes/govuk-alpha.php:327 |
| GET | /federation/connections | /{tenantSlug}/alpha/federation/connections | /federation/connections | federation.connections.index | federationConnections | federation | missing | routes/govuk-alpha.php:331 |
| POST | /federation/connections | /{tenantSlug}/alpha/federation/connections | /federation/connections | federation.connections.store | storeFederationConnection | federation | missing | routes/govuk-alpha.php:332 |
| POST | /federation/connections/{id}/accept | /{tenantSlug}/alpha/federation/connections/{id}/accept | /federation/connections/{id}/accept | federation.connections.accept | acceptFederationConnection | federation | missing | routes/govuk-alpha.php:333 |
| POST | /federation/connections/{id}/reject | /{tenantSlug}/alpha/federation/connections/{id}/reject | /federation/connections/{id}/reject | federation.connections.reject | rejectFederationConnection | federation | missing | routes/govuk-alpha.php:334 |
| POST | /federation/connections/{id}/remove | /{tenantSlug}/alpha/federation/connections/{id}/remove | /federation/connections/{id}/remove | federation.connections.remove | removeFederationConnection | federation | missing | routes/govuk-alpha.php:335 |
| GET | /federation/messages | /{tenantSlug}/alpha/federation/messages | /federation/messages | federation.messages.index | federationMessages | federation | missing | routes/govuk-alpha.php:336 |
| GET | /federation/messages/conversation/{partnerId} | /{tenantSlug}/alpha/federation/messages/conversation/{partnerId} | /federation/messages/conversation/{partnerId} | federation.messages.conversation | federationConversation | federation | missing | routes/govuk-alpha.php:340 |
| POST | /federation/messages | /{tenantSlug}/alpha/federation/messages | /federation/messages | federation.messages.store | storeFederationMessage | federation | missing | routes/govuk-alpha.php:341 |
| POST | /federation/messages/translate/{id} | /{tenantSlug}/alpha/federation/messages/translate/{id} | /federation/messages/translate/{id} | federation.messages.translate | translateFederationMessage | federation | missing | routes/govuk-alpha.php:342 |
| GET | /federation/members/{id}/transfer | /{tenantSlug}/alpha/federation/members/{id}/transfer | /federation/members/{id}/transfer | federation.transfer | federationTransfer | federation | missing | routes/govuk-alpha.php:343 |
| POST | /federation/members/{id}/transfer | /{tenantSlug}/alpha/federation/members/{id}/transfer | /federation/members/{id}/transfer | federation.transfer.store | storeFederationTransfer | federation | missing | routes/govuk-alpha.php:344 |
| GET | /profile | /{tenantSlug}/alpha/profile | /profile | profile.me | myProfile | profile | candidate-route | routes/govuk-alpha.php:345 |
| GET | /profile/settings | /{tenantSlug}/alpha/profile/settings | /profile/settings | profile.settings | profileSettings | profile | candidate-family | routes/govuk-alpha.php:346 |
| POST | /profile/settings | /{tenantSlug}/alpha/profile/settings | /profile/settings | profile.settings.update | updateProfileSettings | profile | candidate-workflow-family | routes/govuk-alpha.php:347 |
| GET | /profile/two-factor | /{tenantSlug}/alpha/profile/two-factor | /profile/two-factor | profile.2fa | twoFactorSetup | profile | candidate-family | routes/govuk-alpha.php:349 |
| POST | /profile/two-factor/verify | /{tenantSlug}/alpha/profile/two-factor/verify | /profile/two-factor/verify | profile.2fa.verify | verifyTwoFactorSetup | profile | candidate-workflow-family | routes/govuk-alpha.php:350 |
| POST | /profile/two-factor/disable | /{tenantSlug}/alpha/profile/two-factor/disable | /profile/two-factor/disable | profile.2fa.disable | disableTwoFactor | profile | candidate-workflow-family | routes/govuk-alpha.php:351 |
| GET | /profile/blocked | /{tenantSlug}/alpha/profile/blocked | /profile/blocked | profile.blocked | blockedUsers | profile | candidate-family | routes/govuk-alpha.php:352 |
| POST | /profile/email | /{tenantSlug}/alpha/profile/email | /profile/email | profile.email.update | updateProfileEmail | profile | candidate-workflow-family | routes/govuk-alpha.php:353 |
| POST | /profile/password | /{tenantSlug}/alpha/profile/password | /profile/password | profile.password.update | updateProfilePassword | profile | candidate-workflow-family | routes/govuk-alpha.php:354 |
| POST | /profile/language | /{tenantSlug}/alpha/profile/language | /profile/language | profile.language.update | updateProfileLanguage | profile | candidate-workflow-family | routes/govuk-alpha.php:355 |
| POST | /profile/notifications | /{tenantSlug}/alpha/profile/notifications | /profile/notifications | profile.notifications.update | updateProfileNotifications | profile | candidate-workflow-family | routes/govuk-alpha.php:356 |
| POST | /profile/passkeys/rename | /{tenantSlug}/alpha/profile/passkeys/rename | /profile/passkeys/rename | profile.passkeys.rename | renameProfilePasskey | profile | candidate-workflow-family | routes/govuk-alpha.php:357 |
| POST | /profile/passkeys/remove | /{tenantSlug}/alpha/profile/passkeys/remove | /profile/passkeys/remove | profile.passkeys.remove | removeProfilePasskey | profile | candidate-workflow-family | routes/govuk-alpha.php:358 |
| POST | /profile/personalisation | /{tenantSlug}/alpha/profile/personalisation | /profile/personalisation | profile.personalisation.update | updateProfilePersonalisation | profile | candidate-workflow-family | routes/govuk-alpha.php:359 |
| POST | /profile/match-preferences | /{tenantSlug}/alpha/profile/match-preferences | /profile/match-preferences | profile.match-preferences.update | updateProfileMatchPreferences | profile | candidate-workflow-family | routes/govuk-alpha.php:360 |
| POST | /profile/skills/add | /{tenantSlug}/alpha/profile/skills/add | /profile/skills/add | profile.skills.add | addProfileSkill | profile | candidate-workflow-family | routes/govuk-alpha.php:361 |
| POST | /profile/skills/remove | /{tenantSlug}/alpha/profile/skills/remove | /profile/skills/remove | profile.skills.remove | removeProfileSkill | profile | candidate-workflow-family | routes/govuk-alpha.php:362 |
| POST | /profile/safeguarding/revoke | /{tenantSlug}/alpha/profile/safeguarding/revoke | /profile/safeguarding/revoke | profile.safeguarding.revoke | revokeProfileSafeguarding | profile | candidate-workflow-family | routes/govuk-alpha.php:363 |
| POST | /profile/data-export | /{tenantSlug}/alpha/profile/data-export | /profile/data-export | profile.data-export | requestDataExport | profile | candidate-workflow-family | routes/govuk-alpha.php:364 |
| GET | /profile/delete-account | /{tenantSlug}/alpha/profile/delete-account | /profile/delete-account | profile.delete | confirmDeleteAccount | profile | candidate-family | routes/govuk-alpha.php:365 |
| POST | /profile/delete-account | /{tenantSlug}/alpha/profile/delete-account | /profile/delete-account | profile.delete.store | deleteAccount | profile | candidate-workflow-family | routes/govuk-alpha.php:366 |
| GET | /volunteering/certificates | /{tenantSlug}/alpha/volunteering/certificates | /volunteering/certificates | volunteering.certificates | volunteeringCertificates | volunteering | missing | routes/govuk-alpha.php:378 |
| POST | /volunteering/certificates/generate | /{tenantSlug}/alpha/volunteering/certificates/generate | /volunteering/certificates/generate | volunteering.certificates.generate | generateVolunteerCertificate | volunteering | missing | routes/govuk-alpha.php:379 |
| GET | /volunteering/certificates/{code}/download | /{tenantSlug}/alpha/volunteering/certificates/{code}/download | /volunteering/certificates/{code}/download | volunteering.certificates.download | downloadVolunteerCertificate | volunteering | missing | routes/govuk-alpha.php:380 |
| GET | /volunteering/waitlist | /{tenantSlug}/alpha/volunteering/waitlist | /volunteering/waitlist | volunteering.waitlist | volunteeringWaitlist | volunteering | missing | routes/govuk-alpha.php:381 |
| POST | /volunteering/waitlist/{shiftId}/leave | /{tenantSlug}/alpha/volunteering/waitlist/{shiftId}/leave | /volunteering/waitlist/{shiftId}/leave | volunteering.waitlist.leave | leaveVolunteerWaitlist | volunteering | missing | routes/govuk-alpha.php:382 |
| GET | /volunteering/swaps | /{tenantSlug}/alpha/volunteering/swaps | /volunteering/swaps | volunteering.swaps | volunteeringSwaps | volunteering | missing | routes/govuk-alpha.php:383 |
| POST | /volunteering/swaps | /{tenantSlug}/alpha/volunteering/swaps | /volunteering/swaps | volunteering.swaps.request | requestVolunteerSwap | volunteering | missing | routes/govuk-alpha.php:384 |
| POST | /volunteering/swaps/{id}/respond | /{tenantSlug}/alpha/volunteering/swaps/{id}/respond | /volunteering/swaps/{id}/respond | volunteering.swaps.respond | respondVolunteerSwap | volunteering | missing | routes/govuk-alpha.php:385 |
| POST | /volunteering/swaps/{id}/cancel | /{tenantSlug}/alpha/volunteering/swaps/{id}/cancel | /volunteering/swaps/{id}/cancel | volunteering.swaps.cancel | cancelVolunteerSwap | volunteering | missing | routes/govuk-alpha.php:386 |
| GET | /premium/return | /{tenantSlug}/alpha/premium/return | /premium/return | premium.return | premiumReturn | premium | missing | routes/govuk-alpha.php:390 |
| POST | /podcasts/{id}/subscribe | /{tenantSlug}/alpha/podcasts/{id}/subscribe | /podcasts/{id}/subscribe | podcasts.subscribe | podcastSubscribe | podcasts | missing | routes/govuk-alpha.php:391 |
| GET | /podcasts/{showId}/episodes/{id} | /{tenantSlug}/alpha/podcasts/{showId}/episodes/{id} | /podcasts/{showId}/episodes/{id} | podcasts.episode | podcastEpisode | podcasts | missing | routes/govuk-alpha.php:392 |
| GET | /coupons/{id} | /{tenantSlug}/alpha/coupons/{id} | /coupons/{id} | coupons.show | couponShow | coupons | missing | routes/govuk-alpha.php:393 |
| POST | /listings/{id}/like | /{tenantSlug}/alpha/listings/{id}/like | /listings/{id}/like | listings.like | listingsToggleLike | listings | candidate-workflow-family | routes/govuk-alpha.php:398 |
| POST | /listings/{id}/save | /{tenantSlug}/alpha/listings/{id}/save | /listings/{id}/save | listings.save | saveListing | listings | candidate-workflow-family | routes/govuk-alpha.php:399 |
| POST | /listings/{id}/unsave | /{tenantSlug}/alpha/listings/{id}/unsave | /listings/{id}/unsave | listings.unsave | unsaveListing | listings | candidate-workflow-family | routes/govuk-alpha.php:400 |
| POST | /listings/{id}/renew | /{tenantSlug}/alpha/listings/{id}/renew | /listings/{id}/renew | listings.renew | renewListing | listings | candidate-workflow-family | routes/govuk-alpha.php:401 |
| GET | /listings/{id}/report | /{tenantSlug}/alpha/listings/{id}/report | /listings/{id}/report | listings.report | listingReport | listings | candidate-family | routes/govuk-alpha.php:402 |
| POST | /listings/{id}/report | /{tenantSlug}/alpha/listings/{id}/report | /listings/{id}/report | listings.report.store | storeListingReport | listings | candidate-workflow-family | routes/govuk-alpha.php:403 |
| POST | /matches/{id}/dismiss | /{tenantSlug}/alpha/matches/{id}/dismiss | /matches/{id}/dismiss | matches.dismiss | dismissMatch | matches | missing | routes/govuk-alpha.php:404 |
| POST | /members/{id}/review | /{tenantSlug}/alpha/members/{id}/review | /members/{id}/review | profile.review.store | storeProfileReview | members | candidate-workflow-family | routes/govuk-alpha.php:408 |
| POST | /members/{id}/transfer | /{tenantSlug}/alpha/members/{id}/transfer | /members/{id}/transfer | profile.transfer | profileTransferCredits | members | candidate-workflow-family | routes/govuk-alpha.php:409 |
| POST | /reviews/{id}/delete | /{tenantSlug}/alpha/reviews/{id}/delete | /reviews/{id}/delete | reviews.delete | deleteReview | reviews | candidate-workflow-family | routes/govuk-alpha.php:410 |
| GET | /activity/insights | /{tenantSlug}/alpha/activity/insights | /activity/insights | activity.insights | activityInsights | activity | missing | routes/govuk-alpha-parity/activity.php:28 |
| GET | /chat | /{tenantSlug}/alpha/chat | /chat | chat.index | aiChat | chat | skeleton | routes/govuk-alpha-parity/aichat.php:18 |
| POST | /chat | /{tenantSlug}/alpha/chat | /chat | chat.send | aiChatSend | chat | skeleton | routes/govuk-alpha-parity/aichat.php:19 |
| POST | /blog/comments/{id}/update | /{tenantSlug}/alpha/blog/comments/{id}/update | /blog/comments/{id}/update | blogreviews.blog.comments.update | blogReviewsUpdateComment | blog | missing | routes/govuk-alpha-parity/blogreviews.php:27 |
| POST | /blog/comments/{id}/delete | /{tenantSlug}/alpha/blog/comments/{id}/delete | /blog/comments/{id}/delete | blogreviews.blog.comments.delete | blogReviewsDeleteComment | blog | missing | routes/govuk-alpha-parity/blogreviews.php:31 |
| POST | /blog/comments/{id}/react | /{tenantSlug}/alpha/blog/comments/{id}/react | /blog/comments/{id}/react | blogreviews.blog.comments.react | blogReviewsCommentReaction | blog | missing | routes/govuk-alpha-parity/blogreviews.php:35 |
| GET | /blog/{slug}/comments | /{tenantSlug}/alpha/blog/{slug}/comments | /blog/{slug}/comments | blogreviews.blog.comments | blogReviewsPostComments | blog | missing | routes/govuk-alpha-parity/blogreviews.php:41 |
| POST | /blog/{slug}/comments/add | /{tenantSlug}/alpha/blog/{slug}/comments/add | /blog/{slug}/comments/add | blogreviews.blog.comments.store | blogReviewsStorePostComment | blog | missing | routes/govuk-alpha-parity/blogreviews.php:47 |
| POST | /blog/{slug}/react | /{tenantSlug}/alpha/blog/{slug}/react | /blog/{slug}/react | blogreviews.blog.react | blogReviewsPostReaction | blog | missing | routes/govuk-alpha-parity/blogreviews.php:51 |
| GET | /blog/{slug}/likers/{reaction} | /{tenantSlug}/alpha/blog/{slug}/likers/{reaction} | /blog/{slug}/likers/{reaction} | blogreviews.blog.likers | blogReviewsPostLikers | blog | missing | routes/govuk-alpha-parity/blogreviews.php:55 |
| GET | /reviews/list | /{tenantSlug}/alpha/reviews/list | /reviews/list | blogreviews.reviews.list | blogReviewsList | reviews | candidate-family | routes/govuk-alpha-parity/blogreviews.php:62 |
| GET | /reviews/{id}/comments | /{tenantSlug}/alpha/reviews/{id}/comments | /reviews/{id}/comments | blogreviews.reviews.comments | blogReviewsReviewComments | reviews | candidate-family | routes/govuk-alpha-parity/blogreviews.php:67 |
| POST | /reviews/{id}/comments | /{tenantSlug}/alpha/reviews/{id}/comments | /reviews/{id}/comments | blogreviews.reviews.comments.store | blogReviewsStoreReviewComment | reviews | candidate-workflow-family | routes/govuk-alpha-parity/blogreviews.php:70 |
| POST | /reviews/{id}/react | /{tenantSlug}/alpha/reviews/{id}/react | /reviews/{id}/react | blogreviews.reviews.react | blogReviewsReviewReaction | reviews | candidate-workflow-family | routes/govuk-alpha-parity/blogreviews.php:74 |
| GET | /marketplace/create | /{tenantSlug}/alpha/marketplace/create | /marketplace/create | marketplace.create | commerceCreateListingForm | marketplace | missing | routes/govuk-alpha-parity/commerce.php:24 |
| POST | /marketplace/create | /{tenantSlug}/alpha/marketplace/create | /marketplace/create | marketplace.store | commerceStoreListing | marketplace | missing | routes/govuk-alpha-parity/commerce.php:25 |
| GET | /marketplace/mine | /{tenantSlug}/alpha/marketplace/mine | /marketplace/mine | marketplace.mine | commerceMyListings | marketplace | missing | routes/govuk-alpha-parity/commerce.php:26 |
| GET | /marketplace/saved | /{tenantSlug}/alpha/marketplace/saved | /marketplace/saved | marketplace.saved | commerceSavedListings | marketplace | missing | routes/govuk-alpha-parity/commerce.php:27 |
| GET | /marketplace/free | /{tenantSlug}/alpha/marketplace/free | /marketplace/free | marketplace.free | commerceFreeItems | marketplace | missing | routes/govuk-alpha-parity/commerce.php:28 |
| GET | /marketplace/offers | /{tenantSlug}/alpha/marketplace/offers | /marketplace/offers | marketplace.offers | commerceMyOffers | marketplace | missing | routes/govuk-alpha-parity/commerce.php:31 |
| POST | /marketplace/offers/{id}/accept | /{tenantSlug}/alpha/marketplace/offers/{id}/accept | /marketplace/offers/{id}/accept | marketplace.offers.accept | commerceAcceptOffer | marketplace | missing | routes/govuk-alpha-parity/commerce.php:32 |
| POST | /marketplace/offers/{id}/decline | /{tenantSlug}/alpha/marketplace/offers/{id}/decline | /marketplace/offers/{id}/decline | marketplace.offers.decline | commerceDeclineOffer | marketplace | missing | routes/govuk-alpha-parity/commerce.php:33 |
| POST | /marketplace/offers/{id}/withdraw | /{tenantSlug}/alpha/marketplace/offers/{id}/withdraw | /marketplace/offers/{id}/withdraw | marketplace.offers.withdraw | commerceWithdrawOffer | marketplace | missing | routes/govuk-alpha-parity/commerce.php:34 |
| GET | /marketplace/orders | /{tenantSlug}/alpha/marketplace/orders | /marketplace/orders | marketplace.orders.buyer | commerceBuyerOrders | marketplace | missing | routes/govuk-alpha-parity/commerce.php:37 |
| GET | /marketplace/sales | /{tenantSlug}/alpha/marketplace/sales | /marketplace/sales | marketplace.orders.seller | commerceSellerOrders | marketplace | missing | routes/govuk-alpha-parity/commerce.php:38 |
| POST | /marketplace/orders/{id}/ship | /{tenantSlug}/alpha/marketplace/orders/{id}/ship | /marketplace/orders/{id}/ship | marketplace.orders.ship | commerceShipOrder | marketplace | missing | routes/govuk-alpha-parity/commerce.php:39 |
| POST | /marketplace/orders/{id}/confirm | /{tenantSlug}/alpha/marketplace/orders/{id}/confirm | /marketplace/orders/{id}/confirm | marketplace.orders.confirm | commerceConfirmOrder | marketplace | missing | routes/govuk-alpha-parity/commerce.php:40 |
| POST | /marketplace/orders/{id}/cancel | /{tenantSlug}/alpha/marketplace/orders/{id}/cancel | /marketplace/orders/{id}/cancel | marketplace.orders.cancel | commerceCancelOrder | marketplace | missing | routes/govuk-alpha-parity/commerce.php:41 |
| POST | /marketplace/orders/{id}/pay | /{tenantSlug}/alpha/marketplace/orders/{id}/pay | /marketplace/orders/{id}/pay | marketplace.orders.pay | commerceCheckoutCardPay | marketplace | missing | routes/govuk-alpha-parity/commerce.php:42 |
| POST | /marketplace/orders/{id}/rate | /{tenantSlug}/alpha/marketplace/orders/{id}/rate | /marketplace/orders/{id}/rate | marketplace.orders.rate | commerceRateOrder | marketplace | missing | routes/govuk-alpha-parity/commerce.php:43 |
| GET | /marketplace/search | /{tenantSlug}/alpha/marketplace/search | /marketplace/search | marketplace.search | commerceMarketplaceAdvancedSearch | marketplace | missing | routes/govuk-alpha-parity/commerce.php:47 |
| GET | /marketplace/seller/{sellerId} | /{tenantSlug}/alpha/marketplace/seller/{sellerId} | /marketplace/seller/{sellerId} | marketplace.seller | commerceSellerProfile | marketplace | missing | routes/govuk-alpha-parity/commerce.php:50 |
| GET | /marketplace/{id}/edit | /{tenantSlug}/alpha/marketplace/{id}/edit | /marketplace/{id}/edit | marketplace.edit | commerceEditListingForm | marketplace | missing | routes/govuk-alpha-parity/commerce.php:53 |
| POST | /marketplace/{id}/update | /{tenantSlug}/alpha/marketplace/{id}/update | /marketplace/{id}/update | marketplace.update | commerceUpdateListing | marketplace | missing | routes/govuk-alpha-parity/commerce.php:54 |
| POST | /marketplace/{id}/delete | /{tenantSlug}/alpha/marketplace/{id}/delete | /marketplace/{id}/delete | marketplace.delete | commerceDeleteListing | marketplace | missing | routes/govuk-alpha-parity/commerce.php:55 |
| POST | /marketplace/{id}/renew | /{tenantSlug}/alpha/marketplace/{id}/renew | /marketplace/{id}/renew | marketplace.renew | commerceRenewListing | marketplace | missing | routes/govuk-alpha-parity/commerce.php:56 |
| POST | /marketplace/{id}/save | /{tenantSlug}/alpha/marketplace/{id}/save | /marketplace/{id}/save | marketplace.save | commerceSaveListing | marketplace | missing | routes/govuk-alpha-parity/commerce.php:57 |
| POST | /marketplace/{id}/unsave | /{tenantSlug}/alpha/marketplace/{id}/unsave | /marketplace/{id}/unsave | marketplace.unsave | commerceUnsaveListing | marketplace | missing | routes/govuk-alpha-parity/commerce.php:58 |
| GET | /marketplace/{id}/buy | /{tenantSlug}/alpha/marketplace/{id}/buy | /marketplace/{id}/buy | marketplace.buy | commerceBuyForm | marketplace | missing | routes/govuk-alpha-parity/commerce.php:59 |
| POST | /marketplace/{id}/buy | /{tenantSlug}/alpha/marketplace/{id}/buy | /marketplace/{id}/buy | marketplace.buy.store | commerceStoreBuy | marketplace | missing | routes/govuk-alpha-parity/commerce.php:60 |
| GET | /marketplace/{id}/offer | /{tenantSlug}/alpha/marketplace/{id}/offer | /marketplace/{id}/offer | marketplace.offer | commerceOfferForm | marketplace | missing | routes/govuk-alpha-parity/commerce.php:61 |
| POST | /marketplace/{id}/offer | /{tenantSlug}/alpha/marketplace/{id}/offer | /marketplace/{id}/offer | marketplace.offer.store | commerceStoreOffer | marketplace | missing | routes/govuk-alpha-parity/commerce.php:62 |
| GET | /marketplace/{id}/report | /{tenantSlug}/alpha/marketplace/{id}/report | /marketplace/{id}/report | marketplace.report | commerceReportForm | marketplace | missing | routes/govuk-alpha-parity/commerce.php:63 |
| POST | /marketplace/{id}/report | /{tenantSlug}/alpha/marketplace/{id}/report | /marketplace/{id}/report | marketplace.report.store | commerceStoreReport | marketplace | missing | routes/govuk-alpha-parity/commerce.php:64 |
| GET | /courses/mine | /{tenantSlug}/alpha/courses/mine | /courses/mine | courses.mine | commerceMyLearning | courses | missing | routes/govuk-alpha-parity/commerce.php:67 |
| GET | /courses/{id}/learn | /{tenantSlug}/alpha/courses/{id}/learn | /courses/{id}/learn | courses.learn | commerceCourseLearn | courses | missing | routes/govuk-alpha-parity/commerce.php:68 |
| POST | /courses/{id}/lessons/{lessonId}/complete | /{tenantSlug}/alpha/courses/{id}/lessons/{lessonId}/complete | /courses/{id}/lessons/{lessonId}/complete | courses.lessons.complete | commerceCompleteLesson | courses | missing | routes/govuk-alpha-parity/commerce.php:69 |
| POST | /courses/{id}/lessons/{lessonId}/quiz | /{tenantSlug}/alpha/courses/{id}/lessons/{lessonId}/quiz | /courses/{id}/lessons/{lessonId}/quiz | courses.quiz.submit | commerceCourseQuizSubmit | courses | missing | routes/govuk-alpha-parity/commerce.php:70 |
| GET | /premium/manage | /{tenantSlug}/alpha/premium/manage | /premium/manage | premium.manage | commercePremiumManage | premium | missing | routes/govuk-alpha-parity/commerce.php:73 |
| POST | /premium/cancel | /{tenantSlug}/alpha/premium/cancel | /premium/cancel | premium.cancel | commercePremiumCancel | premium | missing | routes/govuk-alpha-parity/commerce.php:74 |
| POST | /premium/portal | /{tenantSlug}/alpha/premium/portal | /premium/portal | premium.portal | commercePremiumPortal | premium | missing | routes/govuk-alpha-parity/commerce.php:75 |
| GET | /courses/instructor | /{tenantSlug}/alpha/courses/instructor | /courses/instructor | courses.instructor | commerceInstructorCourses | courses | missing | routes/govuk-alpha-parity/commerce.php:81 |
| GET | /courses/instructor/new | /{tenantSlug}/alpha/courses/instructor/new | /courses/instructor/new | courses.instructor.create | commerceCreateCourseForm | courses | missing | routes/govuk-alpha-parity/commerce.php:82 |
| POST | /courses/instructor/new | /{tenantSlug}/alpha/courses/instructor/new | /courses/instructor/new | courses.instructor.store | commerceStoreCourse | courses | missing | routes/govuk-alpha-parity/commerce.php:83 |
| GET | /courses/instructor/{id}/edit | /{tenantSlug}/alpha/courses/instructor/{id}/edit | /courses/instructor/{id}/edit | courses.instructor.edit | commerceEditCourseForm | courses | missing | routes/govuk-alpha-parity/commerce.php:84 |
| POST | /courses/instructor/{id}/update | /{tenantSlug}/alpha/courses/instructor/{id}/update | /courses/instructor/{id}/update | courses.instructor.update | commerceUpdateCourse | courses | missing | routes/govuk-alpha-parity/commerce.php:85 |
| POST | /courses/instructor/{id}/publish | /{tenantSlug}/alpha/courses/instructor/{id}/publish | /courses/instructor/{id}/publish | courses.instructor.publish | commercePublishCourse | courses | missing | routes/govuk-alpha-parity/commerce.php:86 |
| POST | /courses/instructor/{id}/unpublish | /{tenantSlug}/alpha/courses/instructor/{id}/unpublish | /courses/instructor/{id}/unpublish | courses.instructor.unpublish | commerceUnpublishCourse | courses | missing | routes/govuk-alpha-parity/commerce.php:87 |
| POST | /courses/instructor/{id}/delete | /{tenantSlug}/alpha/courses/instructor/{id}/delete | /courses/instructor/{id}/delete | courses.instructor.delete | commerceDeleteCourse | courses | missing | routes/govuk-alpha-parity/commerce.php:88 |
| GET | /courses/instructor/{id}/analytics | /{tenantSlug}/alpha/courses/instructor/{id}/analytics | /courses/instructor/{id}/analytics | courses.instructor.analytics | commerceCourseAnalytics | courses | missing | routes/govuk-alpha-parity/commerce.php:89 |
| GET | /courses/instructor/{id}/grading | /{tenantSlug}/alpha/courses/instructor/{id}/grading | /courses/instructor/{id}/grading | courses.instructor.grading | commerceCourseGrading | courses | missing | routes/govuk-alpha-parity/commerce.php:90 |
| POST | /courses/instructor/{id}/grading/{attemptId} | /{tenantSlug}/alpha/courses/instructor/{id}/grading/{attemptId} | /courses/instructor/{id}/grading/{attemptId} | courses.instructor.grading.grade | commerceGradeAttempt | courses | missing | routes/govuk-alpha-parity/commerce.php:91 |
| POST | /courses/instructor/{id}/sections | /{tenantSlug}/alpha/courses/instructor/{id}/sections | /courses/instructor/{id}/sections | courses.instructor.sections.store | commerceStoreCourseSection | courses | missing | routes/govuk-alpha-parity/commerce.php:96 |
| POST | /courses/instructor/{id}/sections/{sectionId}/update | /{tenantSlug}/alpha/courses/instructor/{id}/sections/{sectionId}/update | /courses/instructor/{id}/sections/{sectionId}/update | courses.instructor.sections.update | commerceUpdateCourseSection | courses | missing | routes/govuk-alpha-parity/commerce.php:97 |
| POST | /courses/instructor/{id}/sections/{sectionId}/delete | /{tenantSlug}/alpha/courses/instructor/{id}/sections/{sectionId}/delete | /courses/instructor/{id}/sections/{sectionId}/delete | courses.instructor.sections.delete | commerceDeleteCourseSection | courses | missing | routes/govuk-alpha-parity/commerce.php:98 |
| POST | /courses/instructor/{id}/lessons | /{tenantSlug}/alpha/courses/instructor/{id}/lessons | /courses/instructor/{id}/lessons | courses.instructor.lessons.store | commerceStoreCourseLesson | courses | missing | routes/govuk-alpha-parity/commerce.php:99 |
| POST | /courses/instructor/{id}/lessons/{lessonId}/update | /{tenantSlug}/alpha/courses/instructor/{id}/lessons/{lessonId}/update | /courses/instructor/{id}/lessons/{lessonId}/update | courses.instructor.lessons.update | commerceUpdateCourseLesson | courses | missing | routes/govuk-alpha-parity/commerce.php:100 |
| POST | /courses/instructor/{id}/lessons/{lessonId}/delete | /{tenantSlug}/alpha/courses/instructor/{id}/lessons/{lessonId}/delete | /courses/instructor/{id}/lessons/{lessonId}/delete | courses.instructor.lessons.delete | commerceDeleteCourseLesson | courses | missing | routes/govuk-alpha-parity/commerce.php:101 |
| GET | /marketplace/pickups | /{tenantSlug}/alpha/marketplace/pickups | /marketplace/pickups | marketplace.pickups | commerceMyPickups | marketplace | missing | routes/govuk-alpha-parity/commerce.php:107 |
| GET | /marketplace/onboarding | /{tenantSlug}/alpha/marketplace/onboarding | /marketplace/onboarding | marketplace.onboarding | commerceMerchantOnboarding | marketplace | missing | routes/govuk-alpha-parity/commerce.php:108 |
| POST | /marketplace/onboarding | /{tenantSlug}/alpha/marketplace/onboarding | /marketplace/onboarding | marketplace.onboarding.store | commerceStoreMerchantOnboarding | marketplace | missing | routes/govuk-alpha-parity/commerce.php:109 |
| GET | /marketplace/category/{slug} | /{tenantSlug}/alpha/marketplace/category/{slug} | /marketplace/category/{slug} | marketplace.category | commerceCategoryListings | marketplace | missing | routes/govuk-alpha-parity/commerce.php:110 |
| GET | /marketplace/slots | /{tenantSlug}/alpha/marketplace/slots | /marketplace/slots | marketplace.slots | commerceSellerPickupSlots | marketplace | missing | routes/govuk-alpha-parity/commerce.php:115 |
| POST | /marketplace/slots | /{tenantSlug}/alpha/marketplace/slots | /marketplace/slots | marketplace.slots.store | commerceStorePickupSlot | marketplace | missing | routes/govuk-alpha-parity/commerce.php:116 |
| POST | /marketplace/slots/scan | /{tenantSlug}/alpha/marketplace/slots/scan | /marketplace/slots/scan | marketplace.slots.scan | commerceScanPickup | marketplace | missing | routes/govuk-alpha-parity/commerce.php:118 |
| GET | /marketplace/slots/{id}/edit | /{tenantSlug}/alpha/marketplace/slots/{id}/edit | /marketplace/slots/{id}/edit | marketplace.slots.edit | commerceEditPickupSlot | marketplace | missing | routes/govuk-alpha-parity/commerce.php:119 |
| POST | /marketplace/slots/{id}/update | /{tenantSlug}/alpha/marketplace/slots/{id}/update | /marketplace/slots/{id}/update | marketplace.slots.update | commerceUpdatePickupSlot | marketplace | missing | routes/govuk-alpha-parity/commerce.php:120 |
| POST | /marketplace/slots/{id}/delete | /{tenantSlug}/alpha/marketplace/slots/{id}/delete | /marketplace/slots/{id}/delete | marketplace.slots.delete | commerceDeletePickupSlot | marketplace | missing | routes/govuk-alpha-parity/commerce.php:121 |
| GET | /marketplace/coupons | /{tenantSlug}/alpha/marketplace/coupons | /marketplace/coupons | marketplace.coupons | commerceSellerCoupons | marketplace | missing | routes/govuk-alpha-parity/commerce.php:124 |
| GET | /marketplace/coupons/new | /{tenantSlug}/alpha/marketplace/coupons/new | /marketplace/coupons/new | marketplace.coupons.create | commerceCreateCouponForm | marketplace | missing | routes/govuk-alpha-parity/commerce.php:125 |
| POST | /marketplace/coupons/new | /{tenantSlug}/alpha/marketplace/coupons/new | /marketplace/coupons/new | marketplace.coupons.store | commerceStoreCoupon | marketplace | missing | routes/govuk-alpha-parity/commerce.php:126 |
| GET | /marketplace/coupons/{id}/edit | /{tenantSlug}/alpha/marketplace/coupons/{id}/edit | /marketplace/coupons/{id}/edit | marketplace.coupons.edit | commerceEditCouponForm | marketplace | missing | routes/govuk-alpha-parity/commerce.php:127 |
| POST | /marketplace/coupons/{id}/update | /{tenantSlug}/alpha/marketplace/coupons/{id}/update | /marketplace/coupons/{id}/update | marketplace.coupons.update | commerceUpdateCoupon | marketplace | missing | routes/govuk-alpha-parity/commerce.php:128 |
| POST | /marketplace/coupons/{id}/delete | /{tenantSlug}/alpha/marketplace/coupons/{id}/delete | /marketplace/coupons/{id}/delete | marketplace.coupons.delete | commerceDeleteCoupon | marketplace | missing | routes/govuk-alpha-parity/commerce.php:129 |
| GET | /podcasts/studio | /{tenantSlug}/alpha/podcasts/studio | /podcasts/studio | podcasts.studio | commercePodcastStudio | podcasts | missing | routes/govuk-alpha-parity/commerce.php:134 |
| GET | /podcasts/studio/new | /{tenantSlug}/alpha/podcasts/studio/new | /podcasts/studio/new | podcasts.studio.create | commerceCreatePodcastForm | podcasts | missing | routes/govuk-alpha-parity/commerce.php:135 |
| POST | /podcasts/studio/new | /{tenantSlug}/alpha/podcasts/studio/new | /podcasts/studio/new | podcasts.studio.store | commerceStorePodcast | podcasts | missing | routes/govuk-alpha-parity/commerce.php:136 |
| GET | /podcasts/studio/{id} | /{tenantSlug}/alpha/podcasts/studio/{id} | /podcasts/studio/{id} | podcasts.studio.manage | commercePodcastManage | podcasts | missing | routes/govuk-alpha-parity/commerce.php:137 |
| POST | /podcasts/studio/{id}/update | /{tenantSlug}/alpha/podcasts/studio/{id}/update | /podcasts/studio/{id}/update | podcasts.studio.update | commerceUpdatePodcast | podcasts | missing | routes/govuk-alpha-parity/commerce.php:138 |
| POST | /podcasts/studio/{id}/publish | /{tenantSlug}/alpha/podcasts/studio/{id}/publish | /podcasts/studio/{id}/publish | podcasts.studio.publish | commercePublishPodcast | podcasts | missing | routes/govuk-alpha-parity/commerce.php:139 |
| POST | /podcasts/studio/{id}/delete | /{tenantSlug}/alpha/podcasts/studio/{id}/delete | /podcasts/studio/{id}/delete | podcasts.studio.delete | commerceDeletePodcast | podcasts | missing | routes/govuk-alpha-parity/commerce.php:140 |
| POST | /podcasts/studio/{id}/episodes | /{tenantSlug}/alpha/podcasts/studio/{id}/episodes | /podcasts/studio/{id}/episodes | podcasts.studio.episodes.store | commerceStorePodcastEpisode | podcasts | missing | routes/govuk-alpha-parity/commerce.php:141 |
| POST | /podcasts/studio/{id}/episodes/{episodeId}/publish | /{tenantSlug}/alpha/podcasts/studio/{id}/episodes/{episodeId}/publish | /podcasts/studio/{id}/episodes/{episodeId}/publish | podcasts.studio.episodes.publish | commercePublishPodcastEpisode | podcasts | missing | routes/govuk-alpha-parity/commerce.php:142 |
| POST | /podcasts/studio/{id}/episodes/{episodeId}/delete | /{tenantSlug}/alpha/podcasts/studio/{id}/episodes/{episodeId}/delete | /podcasts/studio/{id}/episodes/{episodeId}/delete | podcasts.studio.episodes.delete | commerceDeletePodcastEpisode | podcasts | missing | routes/govuk-alpha-parity/commerce.php:143 |
| GET | /connections/network | /{tenantSlug}/alpha/connections/network | /connections/network | connections.network | connectionsNetwork | connections | candidate-family | routes/govuk-alpha-parity/connections.php:23 |
| GET | /matches/board | /{tenantSlug}/alpha/matches/board | /matches/board | connections.matches-board | connectionsMatchesBoard | matches | missing | routes/govuk-alpha-parity/connections.php:27 |
| POST | /matches/board/{listingId}/dismiss | /{tenantSlug}/alpha/matches/board/{listingId}/dismiss | /matches/board/{listingId}/dismiss | connections.matches-board.dismiss | connectionsDismissMatch | matches | missing | routes/govuk-alpha-parity/connections.php:30 |
| GET | /events/browse | /{tenantSlug}/alpha/events/browse | /events/browse | events.browse | eventsBrowse | events | candidate-family | routes/govuk-alpha-parity/events.php:28 |
| GET | /events/{id}/map | /{tenantSlug}/alpha/events/{id}/map | /events/{id}/map | events.map | eventsMap | events | candidate-family | routes/govuk-alpha-parity/events.php:32 |
| GET | /events/{id}/recurring-edit | /{tenantSlug}/alpha/events/{id}/recurring-edit | /events/{id}/recurring-edit | events.recurring.edit | eventsRecurringEdit | events | candidate-family | routes/govuk-alpha-parity/events.php:36 |
| POST | /events/{id}/recurring-edit | /{tenantSlug}/alpha/events/{id}/recurring-edit | /events/{id}/recurring-edit | events.recurring.update | eventsUpdateRecurring | events | candidate-workflow-family | routes/govuk-alpha-parity/events.php:38 |
| GET | /events/{id}/polls | /{tenantSlug}/alpha/events/{id}/polls | /events/{id}/polls | events.polls | eventsPolls | events | candidate-family | routes/govuk-alpha-parity/events.php:42 |
| POST | /events/{id}/polls | /{tenantSlug}/alpha/events/{id}/polls | /events/{id}/polls | events.polls.update | eventsUpdatePolls | events | candidate-workflow-family | routes/govuk-alpha-parity/events.php:44 |
| GET | /events/{id}/translate | /{tenantSlug}/alpha/events/{id}/translate | /events/{id}/translate | events.translate | eventsTranslate | events | candidate-family | routes/govuk-alpha-parity/events.php:48 |
| POST | /events/{id}/translate | /{tenantSlug}/alpha/events/{id}/translate | /events/{id}/translate | events.translate.run | eventsRunTranslate | events | candidate-workflow-family | routes/govuk-alpha-parity/events.php:50 |
| GET | /federation/onboarding | /{tenantSlug}/alpha/federation/onboarding | /federation/onboarding | federation.onboarding | federationOnboarding | federation | missing | routes/govuk-alpha-parity/federation.php:26 |
| POST | /federation/onboarding | /{tenantSlug}/alpha/federation/onboarding | /federation/onboarding | federation.onboarding.store | federationOnboardingStore | federation | missing | routes/govuk-alpha-parity/federation.php:29 |
| GET | /feed/hashtags | /{tenantSlug}/alpha/feed/hashtags | /feed/hashtags | feed.hashtags | feedHashtagsDiscovery | feed | candidate-family | routes/govuk-alpha-parity/feed.php:31 |
| GET | /feed/hashtag/{tag} | /{tenantSlug}/alpha/feed/hashtag/{tag} | /feed/hashtag/{tag} | feed.hashtag | feedHashtag | feed | candidate-family | routes/govuk-alpha-parity/feed.php:34 |
| GET | /feed/item/{type}/{id} | /{tenantSlug}/alpha/feed/item/{type}/{id} | /feed/item/{type}/{id} | feed.item | feedItemDetail | feed | candidate-family | routes/govuk-alpha-parity/feed.php:39 |
| POST | /feed/items/{type}/{id}/not-interested | /{tenantSlug}/alpha/feed/items/{type}/{id}/not-interested | /feed/items/{type}/{id}/not-interested | feed.items.not-interested | feedItemNotInterested | feed | candidate-workflow-family | routes/govuk-alpha-parity/feed.php:45 |
| POST | /feed/items/{type}/{id}/react | /{tenantSlug}/alpha/feed/items/{type}/{id}/react | /feed/items/{type}/{id}/react | feed.items.react | feedItemReaction | feed | candidate-workflow-family | routes/govuk-alpha-parity/feed.php:51 |
| GET | /achievements/shop | /{tenantSlug}/alpha/achievements/shop | /achievements/shop | gamification.shop | gamificationShop | achievements | missing | routes/govuk-alpha-parity/gamification.php:23 |
| POST | /achievements/shop/purchase | /{tenantSlug}/alpha/achievements/shop/purchase | /achievements/shop/purchase | gamification.shop.purchase | gamificationPurchase | achievements | missing | routes/govuk-alpha-parity/gamification.php:25 |
| GET | /achievements/collections | /{tenantSlug}/alpha/achievements/collections | /achievements/collections | gamification.collections | gamificationCollections | achievements | missing | routes/govuk-alpha-parity/gamification.php:29 |
| GET | /achievements/showcase | /{tenantSlug}/alpha/achievements/showcase | /achievements/showcase | gamification.showcase | gamificationShowcase | achievements | missing | routes/govuk-alpha-parity/gamification.php:33 |
| POST | /achievements/showcase | /{tenantSlug}/alpha/achievements/showcase | /achievements/showcase | gamification.showcase.update | gamificationUpdateShowcase | achievements | missing | routes/govuk-alpha-parity/gamification.php:35 |
| GET | /achievements/engagement | /{tenantSlug}/alpha/achievements/engagement | /achievements/engagement | gamification.engagement | gamificationEngagement | achievements | missing | routes/govuk-alpha-parity/gamification.php:39 |
| GET | /achievements/badges/{key} | /{tenantSlug}/alpha/achievements/badges/{key} | /achievements/badges/{key} | gamification.badge | gamificationBadgeDetail | achievements | missing | routes/govuk-alpha-parity/gamification.php:43 |
| GET | /leaderboard/competitive | /{tenantSlug}/alpha/leaderboard/competitive | /leaderboard/competitive | gamification.competitive | gamificationCompetitive | leaderboard | missing | routes/govuk-alpha-parity/gamification.php:47 |
| GET | /leaderboard/seasons | /{tenantSlug}/alpha/leaderboard/seasons | /leaderboard/seasons | gamification.seasons | gamificationSeasons | leaderboard | missing | routes/govuk-alpha-parity/gamification.php:50 |
| GET | /leaderboard/journey | /{tenantSlug}/alpha/leaderboard/journey | /leaderboard/journey | gamification.journey | gamificationPersonalJourney | leaderboard | missing | routes/govuk-alpha-parity/gamification.php:53 |
| GET | /leaderboard/spotlight | /{tenantSlug}/alpha/leaderboard/spotlight | /leaderboard/spotlight | gamification.spotlight | gamificationSpotlight | leaderboard | missing | routes/govuk-alpha-parity/gamification.php:56 |
| GET | /nexus-score/tiers | /{tenantSlug}/alpha/nexus-score/tiers | /nexus-score/tiers | gamification.tiers | gamificationTierLadder | nexus-score | missing | routes/govuk-alpha-parity/gamification.php:60 |
| GET | /polls/parity/create | /{tenantSlug}/alpha/polls/parity/create | /polls/parity/create | gamification.poll.create | gamificationCreatePoll | polls | missing | routes/govuk-alpha-parity/gamification.php:64 |
| POST | /polls/parity/create | /{tenantSlug}/alpha/polls/parity/create | /polls/parity/create | gamification.poll.store | gamificationStorePoll | polls | missing | routes/govuk-alpha-parity/gamification.php:66 |
| GET | /polls/parity/manage | /{tenantSlug}/alpha/polls/parity/manage | /polls/parity/manage | gamification.poll.manage | gamificationManagePolls | polls | missing | routes/govuk-alpha-parity/gamification.php:68 |
| GET | /polls/{pollId}/rank | /{tenantSlug}/alpha/polls/{pollId}/rank | /polls/{pollId}/rank | gamification.poll.rank | gamificationRankedVote | polls | missing | routes/govuk-alpha-parity/gamification.php:72 |
| POST | /polls/{pollId}/rank | /{tenantSlug}/alpha/polls/{pollId}/rank | /polls/{pollId}/rank | gamification.poll.rank.store | gamificationStoreRankedVote | polls | missing | routes/govuk-alpha-parity/gamification.php:74 |
| GET | /polls/{pollId}/export | /{tenantSlug}/alpha/polls/{pollId}/export | /polls/{pollId}/export | gamification.poll.export | gamificationExportPoll | polls | missing | routes/govuk-alpha-parity/gamification.php:76 |
| POST | /polls/{pollId}/delete | /{tenantSlug}/alpha/polls/{pollId}/delete | /polls/{pollId}/delete | gamification.poll.delete | gamificationDeletePoll | polls | missing | routes/govuk-alpha-parity/gamification.php:78 |
| POST | /polls/{pollId}/like | /{tenantSlug}/alpha/polls/{pollId}/like | /polls/{pollId}/like | gamification.poll.like | gamificationPollLike | polls | missing | routes/govuk-alpha-parity/gamification.php:84 |
| POST | /polls/{pollId}/comment | /{tenantSlug}/alpha/polls/{pollId}/comment | /polls/{pollId}/comment | gamification.poll.comment | gamificationPollComment | polls | missing | routes/govuk-alpha-parity/gamification.php:86 |
| GET | /polls/{pollId} | /{tenantSlug}/alpha/polls/{pollId} | /polls/{pollId} | gamification.poll.detail | gamificationPollDetail | polls | missing | routes/govuk-alpha-parity/gamification.php:88 |
| GET | /goals/{id}/insights | /{tenantSlug}/alpha/goals/{id}/insights | /goals/{id}/insights | goals.insights | goalsInsights | goals | missing | routes/govuk-alpha-parity/goals.php:31 |
| GET | /goals/{id}/checkin | /{tenantSlug}/alpha/goals/{id}/checkin | /goals/{id}/checkin | goals.checkin | goalsCheckin | goals | missing | routes/govuk-alpha-parity/goals.php:36 |
| POST | /goals/{id}/checkin | /{tenantSlug}/alpha/goals/{id}/checkin | /goals/{id}/checkin | goals.checkin.store | goalsStoreCheckin | goals | missing | routes/govuk-alpha-parity/goals.php:39 |
| GET | /goals/{id}/reminder | /{tenantSlug}/alpha/goals/{id}/reminder | /goals/{id}/reminder | goals.reminder | goalsReminder | goals | missing | routes/govuk-alpha-parity/goals.php:45 |
| POST | /goals/{id}/reminder | /{tenantSlug}/alpha/goals/{id}/reminder | /goals/{id}/reminder | goals.reminder.save | goalsSaveReminder | goals | missing | routes/govuk-alpha-parity/goals.php:48 |
| POST | /goals/{id}/reminder/delete | /{tenantSlug}/alpha/goals/{id}/reminder/delete | /goals/{id}/reminder/delete | goals.reminder.delete | goalsDeleteReminder | goals | missing | routes/govuk-alpha-parity/goals.php:52 |
| GET | /goals/{id}/buddy-actions | /{tenantSlug}/alpha/goals/{id}/buddy-actions | /goals/{id}/buddy-actions | goals.buddy-actions | goalsBuddyActions | goals | missing | routes/govuk-alpha-parity/goals.php:58 |
| POST | /goals/{id}/buddy-actions | /{tenantSlug}/alpha/goals/{id}/buddy-actions | /goals/{id}/buddy-actions | goals.buddy-actions.send | goalsStoreBuddyAction | goals | missing | routes/govuk-alpha-parity/goals.php:61 |
| GET | /goals/{id}/history | /{tenantSlug}/alpha/goals/{id}/history | /goals/{id}/history | goals.history | goalsHistory | goals | missing | routes/govuk-alpha-parity/goals.php:68 |
| GET | /goals/{id}/social | /{tenantSlug}/alpha/goals/{id}/social | /goals/{id}/social | goals.social | goalsSocial | goals | missing | routes/govuk-alpha-parity/goals.php:74 |
| POST | /goals/{id}/like | /{tenantSlug}/alpha/goals/{id}/like | /goals/{id}/like | goals.like | goalsToggleLike | goals | missing | routes/govuk-alpha-parity/goals.php:77 |
| POST | /goals/{id}/comments | /{tenantSlug}/alpha/goals/{id}/comments | /goals/{id}/comments | goals.comments.store | goalsStoreComment | goals | missing | routes/govuk-alpha-parity/goals.php:81 |
| POST | /goals/{id}/comments/{commentId}/delete | /{tenantSlug}/alpha/goals/{id}/comments/{commentId}/delete | /goals/{id}/comments/{commentId}/delete | goals.comments.delete | goalsDeleteComment | goals | missing | routes/govuk-alpha-parity/goals.php:85 |
| GET | /groups/{id}/invite | /{tenantSlug}/alpha/groups/{id}/invite | /groups/{id}/invite | groups.invite | groupsInvite | groups | candidate-family | routes/govuk-alpha-parity/groups.php:22 |
| POST | /groups/{id}/invite/link | /{tenantSlug}/alpha/groups/{id}/invite/link | /groups/{id}/invite/link | groups.invite.link | groupsCreateInviteLink | groups | candidate-workflow-family | routes/govuk-alpha-parity/groups.php:24 |
| POST | /groups/{id}/invite/email | /{tenantSlug}/alpha/groups/{id}/invite/email | /groups/{id}/invite/email | groups.invite.email | groupsSendInvites | groups | candidate-workflow-family | routes/govuk-alpha-parity/groups.php:26 |
| POST | /groups/{id}/invite/{inviteId}/revoke | /{tenantSlug}/alpha/groups/{id}/invite/{inviteId}/revoke | /groups/{id}/invite/{inviteId}/revoke | groups.invite.revoke | groupsRevokeInvite | groups | candidate-workflow-family | routes/govuk-alpha-parity/groups.php:28 |
| GET | /groups/{id}/notifications | /{tenantSlug}/alpha/groups/{id}/notifications | /groups/{id}/notifications | groups.notifications | groupsNotificationPrefs | groups | candidate-family | routes/govuk-alpha-parity/groups.php:32 |
| POST | /groups/{id}/notifications | /{tenantSlug}/alpha/groups/{id}/notifications | /groups/{id}/notifications | groups.notifications.update | groupsUpdateNotificationPrefs | groups | candidate-workflow-family | routes/govuk-alpha-parity/groups.php:34 |
| GET | /groups/{id}/image | /{tenantSlug}/alpha/groups/{id}/image | /groups/{id}/image | groups.image | groupsImage | groups | candidate-family | routes/govuk-alpha-parity/groups.php:38 |
| POST | /groups/{id}/image | /{tenantSlug}/alpha/groups/{id}/image | /groups/{id}/image | groups.image.update | groupsUpdateImage | groups | candidate-workflow-family | routes/govuk-alpha-parity/groups.php:40 |
| GET | /groups/{id}/files | /{tenantSlug}/alpha/groups/{id}/files | /groups/{id}/files | groups.files.index | groupsFiles | groups | candidate-family | routes/govuk-alpha-parity/groups.php:44 |
| POST | /groups/{id}/files | /{tenantSlug}/alpha/groups/{id}/files | /groups/{id}/files | groups.files.upload | groupsUploadFile | groups | candidate-workflow-family | routes/govuk-alpha-parity/groups.php:46 |
| GET | /groups/{id}/files/{fileId}/download | /{tenantSlug}/alpha/groups/{id}/files/{fileId}/download | /groups/{id}/files/{fileId}/download | groups.files.download | groupsDownloadFile | groups | candidate-family | routes/govuk-alpha-parity/groups.php:48 |
| POST | /groups/{id}/files/{fileId}/delete | /{tenantSlug}/alpha/groups/{id}/files/{fileId}/delete | /groups/{id}/files/{fileId}/delete | groups.files.delete | groupsDeleteFile | groups | candidate-workflow-family | routes/govuk-alpha-parity/groups.php:50 |
| GET | /groups/{id}/announcements | /{tenantSlug}/alpha/groups/{id}/announcements | /groups/{id}/announcements | groups.announcements | groupsAnnouncements | groups | candidate-family | routes/govuk-alpha-parity/groups.php:54 |
| POST | /groups/{id}/announcements | /{tenantSlug}/alpha/groups/{id}/announcements | /groups/{id}/announcements | groups.announcements.create | groupsCreateAnnouncement | groups | candidate-workflow-family | routes/govuk-alpha-parity/groups.php:56 |
| GET | /groups/{id}/announcements/{annId}/edit | /{tenantSlug}/alpha/groups/{id}/announcements/{annId}/edit | /groups/{id}/announcements/{annId}/edit | groups.announcements.edit | groupsEditAnnouncement | groups | candidate-family | routes/govuk-alpha-parity/groups.php:58 |
| POST | /groups/{id}/announcements/{annId}/edit | /{tenantSlug}/alpha/groups/{id}/announcements/{annId}/edit | /groups/{id}/announcements/{annId}/edit | groups.announcements.update | groupsUpdateAnnouncement | groups | candidate-workflow-family | routes/govuk-alpha-parity/groups.php:60 |
| POST | /groups/{id}/announcements/{annId}/delete | /{tenantSlug}/alpha/groups/{id}/announcements/{annId}/delete | /groups/{id}/announcements/{annId}/delete | groups.announcements.delete | groupsDeleteAnnouncement | groups | candidate-workflow-family | routes/govuk-alpha-parity/groups.php:62 |
| POST | /groups/{id}/announcements/{annId}/pin | /{tenantSlug}/alpha/groups/{id}/announcements/{annId}/pin | /groups/{id}/announcements/{annId}/pin | groups.announcements.pin | groupsPinAnnouncement | groups | candidate-workflow-family | routes/govuk-alpha-parity/groups.php:64 |
| GET | /ideation/campaigns | /{tenantSlug}/alpha/ideation/campaigns | /ideation/campaigns | ideation.campaigns | ideationCampaigns | ideation | missing | routes/govuk-alpha-parity/ideation.php:20 |
| POST | /ideation/campaigns | /{tenantSlug}/alpha/ideation/campaigns | /ideation/campaigns | ideation.campaigns.store | ideationStoreCampaign | ideation | missing | routes/govuk-alpha-parity/ideation.php:22 |
| GET | /ideation/campaigns/{id} | /{tenantSlug}/alpha/ideation/campaigns/{id} | /ideation/campaigns/{id} | ideation.campaign | ideationCampaignDetail | ideation | missing | routes/govuk-alpha-parity/ideation.php:24 |
| POST | /ideation/campaigns/{id} | /{tenantSlug}/alpha/ideation/campaigns/{id} | /ideation/campaigns/{id} | ideation.campaign.update | ideationUpdateCampaign | ideation | missing | routes/govuk-alpha-parity/ideation.php:26 |
| POST | /ideation/campaigns/{id}/delete | /{tenantSlug}/alpha/ideation/campaigns/{id}/delete | /ideation/campaigns/{id}/delete | ideation.campaign.delete | ideationDeleteCampaign | ideation | missing | routes/govuk-alpha-parity/ideation.php:28 |
| POST | /ideation/campaigns/{id}/challenges/{challengeId}/unlink | /{tenantSlug}/alpha/ideation/campaigns/{id}/challenges/{challengeId}/unlink | /ideation/campaigns/{id}/challenges/{challengeId}/unlink | ideation.campaign.unlink | ideationUnlinkCampaignChallenge | ideation | missing | routes/govuk-alpha-parity/ideation.php:30 |
| GET | /ideation/outcomes | /{tenantSlug}/alpha/ideation/outcomes | /ideation/outcomes | ideation.outcomes | ideationOutcomes | ideation | missing | routes/govuk-alpha-parity/ideation.php:34 |
| GET | /ideation/tags | /{tenantSlug}/alpha/ideation/tags | /ideation/tags | ideation.tags | ideationPopularTags | ideation | missing | routes/govuk-alpha-parity/ideation.php:38 |
| GET | /ideation/new | /{tenantSlug}/alpha/ideation/new | /ideation/new | ideation.create | ideationCreateChallenge | ideation | missing | routes/govuk-alpha-parity/ideation.php:42 |
| POST | /ideation/new | /{tenantSlug}/alpha/ideation/new | /ideation/new | ideation.store | ideationStoreChallenge | ideation | missing | routes/govuk-alpha-parity/ideation.php:44 |
| GET | /ideation/{id}/manage | /{tenantSlug}/alpha/ideation/{id}/manage | /ideation/{id}/manage | ideation.manage | ideationManageChallenge | ideation | missing | routes/govuk-alpha-parity/ideation.php:48 |
| GET | /ideation/{id}/edit | /{tenantSlug}/alpha/ideation/{id}/edit | /ideation/{id}/edit | ideation.edit | ideationEditChallenge | ideation | missing | routes/govuk-alpha-parity/ideation.php:50 |
| POST | /ideation/{id}/edit | /{tenantSlug}/alpha/ideation/{id}/edit | /ideation/{id}/edit | ideation.update | ideationUpdateChallenge | ideation | missing | routes/govuk-alpha-parity/ideation.php:52 |
| POST | /ideation/{id}/status | /{tenantSlug}/alpha/ideation/{id}/status | /ideation/{id}/status | ideation.challenge.status | ideationChallengeStatus | ideation | missing | routes/govuk-alpha-parity/ideation.php:54 |
| POST | /ideation/{id}/favorite | /{tenantSlug}/alpha/ideation/{id}/favorite | /ideation/{id}/favorite | ideation.favorite | ideationToggleFavorite | ideation | missing | routes/govuk-alpha-parity/ideation.php:56 |
| POST | /ideation/{id}/duplicate | /{tenantSlug}/alpha/ideation/{id}/duplicate | /ideation/{id}/duplicate | ideation.duplicate | ideationDuplicateChallenge | ideation | missing | routes/govuk-alpha-parity/ideation.php:58 |
| POST | /ideation/{id}/delete | /{tenantSlug}/alpha/ideation/{id}/delete | /ideation/{id}/delete | ideation.delete | ideationDeleteChallenge | ideation | missing | routes/govuk-alpha-parity/ideation.php:60 |
| POST | /ideation/{id}/link-campaign | /{tenantSlug}/alpha/ideation/{id}/link-campaign | /ideation/{id}/link-campaign | ideation.link-campaign | ideationLinkCampaign | ideation | missing | routes/govuk-alpha-parity/ideation.php:62 |
| GET | /ideation/{id}/outcome | /{tenantSlug}/alpha/ideation/{id}/outcome | /ideation/{id}/outcome | ideation.outcome | ideationOutcomeEdit | ideation | missing | routes/govuk-alpha-parity/ideation.php:64 |
| POST | /ideation/{id}/outcome | /{tenantSlug}/alpha/ideation/{id}/outcome | /ideation/{id}/outcome | ideation.outcome.store | ideationStoreOutcome | ideation | missing | routes/govuk-alpha-parity/ideation.php:66 |
| GET | /ideation/{id}/drafts | /{tenantSlug}/alpha/ideation/{id}/drafts | /ideation/{id}/drafts | ideation.drafts | ideationDrafts | ideation | missing | routes/govuk-alpha-parity/ideation.php:70 |
| POST | /ideation/{id}/drafts/{ideaId} | /{tenantSlug}/alpha/ideation/{id}/drafts/{ideaId} | /ideation/{id}/drafts/{ideaId} | ideation.drafts.update | ideationUpdateDraftIdea | ideation | missing | routes/govuk-alpha-parity/ideation.php:72 |
| GET | /ideation/{id}/ideas/{ideaId} | /{tenantSlug}/alpha/ideation/{id}/ideas/{ideaId} | /ideation/{id}/ideas/{ideaId} | ideation.idea | ideationIdeaDetail | ideation | missing | routes/govuk-alpha-parity/ideation.php:76 |
| POST | /ideation/{id}/ideas/{ideaId}/comments | /{tenantSlug}/alpha/ideation/{id}/ideas/{ideaId}/comments | /ideation/{id}/ideas/{ideaId}/comments | ideation.idea.comments.store | ideationStoreComment | ideation | missing | routes/govuk-alpha-parity/ideation.php:78 |
| POST | /ideation/{id}/ideas/{ideaId}/comments/{commentId}/delete | /{tenantSlug}/alpha/ideation/{id}/ideas/{ideaId}/comments/{commentId}/delete | /ideation/{id}/ideas/{ideaId}/comments/{commentId}/delete | ideation.idea.comments.delete | ideationDeleteComment | ideation | missing | routes/govuk-alpha-parity/ideation.php:80 |
| POST | /ideation/{id}/ideas/{ideaId}/toggle-vote | /{tenantSlug}/alpha/ideation/{id}/ideas/{ideaId}/toggle-vote | /ideation/{id}/ideas/{ideaId}/toggle-vote | ideation.idea.vote | ideationIdeaVote | ideation | missing | routes/govuk-alpha-parity/ideation.php:82 |
| POST | /ideation/{id}/ideas/{ideaId}/status | /{tenantSlug}/alpha/ideation/{id}/ideas/{ideaId}/status | /ideation/{id}/ideas/{ideaId}/status | ideation.idea.status | ideationIdeaStatus | ideation | missing | routes/govuk-alpha-parity/ideation.php:84 |
| POST | /ideation/{id}/ideas/{ideaId}/delete | /{tenantSlug}/alpha/ideation/{id}/ideas/{ideaId}/delete | /ideation/{id}/ideas/{ideaId}/delete | ideation.idea.delete | ideationDeleteIdea | ideation | missing | routes/govuk-alpha-parity/ideation.php:86 |
| POST | /ideation/{id}/ideas/{ideaId}/media | /{tenantSlug}/alpha/ideation/{id}/ideas/{ideaId}/media | /ideation/{id}/ideas/{ideaId}/media | ideation.idea.media.store | ideationAddMedia | ideation | missing | routes/govuk-alpha-parity/ideation.php:88 |
| POST | /ideation/{id}/ideas/{ideaId}/convert | /{tenantSlug}/alpha/ideation/{id}/ideas/{ideaId}/convert | /ideation/{id}/ideas/{ideaId}/convert | ideation.idea.convert | ideationConvertToGroup | ideation | missing | routes/govuk-alpha-parity/ideation.php:90 |
| GET | /jobs/bias-audit | /{tenantSlug}/alpha/jobs/bias-audit | /jobs/bias-audit | jobs.bias-audit | jobsBiasAudit | jobs | missing | routes/govuk-alpha-parity/jobs.php:31 |
| GET | /jobs/talent-search | /{tenantSlug}/alpha/jobs/talent-search | /jobs/talent-search | jobs.talent | jobsTalentSearch | jobs | missing | routes/govuk-alpha-parity/jobs.php:36 |
| GET | /jobs/talent-search/{candidateId} | /{tenantSlug}/alpha/jobs/talent-search/{candidateId} | /jobs/talent-search/{candidateId} | jobs.talent.profile | jobsTalentProfile | jobs | missing | routes/govuk-alpha-parity/jobs.php:38 |
| GET | /jobs/employers/{employerId} | /{tenantSlug}/alpha/jobs/employers/{employerId} | /jobs/employers/{employerId} | jobs.employer | jobsEmployerBrand | jobs | missing | routes/govuk-alpha-parity/jobs.php:43 |
| GET | /jobs/employer-onboarding | /{tenantSlug}/alpha/jobs/employer-onboarding | /jobs/employer-onboarding | jobs.onboarding | jobsEmployerOnboarding | jobs | missing | routes/govuk-alpha-parity/jobs.php:49 |
| GET | /jobs/responses | /{tenantSlug}/alpha/jobs/responses | /jobs/responses | jobs.responses | jobsResponses | jobs | missing | routes/govuk-alpha-parity/jobs.php:53 |
| GET | /jobs/{id}/analytics | /{tenantSlug}/alpha/jobs/{id}/analytics | /jobs/{id}/analytics | jobs.analytics | jobsAnalytics | jobs | missing | routes/govuk-alpha-parity/jobs.php:57 |
| GET | /jobs/{id}/pipeline | /{tenantSlug}/alpha/jobs/{id}/pipeline | /jobs/{id}/pipeline | jobs.pipeline | jobsPipeline | jobs | missing | routes/govuk-alpha-parity/jobs.php:60 |
| GET | /jobs/{id}/qualified | /{tenantSlug}/alpha/jobs/{id}/qualified | /jobs/{id}/qualified | jobs.qualified | jobsQualification | jobs | missing | routes/govuk-alpha-parity/jobs.php:65 |
| GET | /jobs/applications/{applicationId}/cv | /{tenantSlug}/alpha/jobs/applications/{applicationId}/cv | /jobs/applications/{applicationId}/cv | jobs.applications.cv | jobsDownloadCv | jobs | missing | routes/govuk-alpha-parity/jobs.php:71 |
| GET | /jobs/applications/{applicationId}/history | /{tenantSlug}/alpha/jobs/applications/{applicationId}/history | /jobs/applications/{applicationId}/history | jobs.applications.history | jobsApplicationHistory | jobs | missing | routes/govuk-alpha-parity/jobs.php:78 |
| POST | /jobs/interviews/{interviewId}/accept | /{tenantSlug}/alpha/jobs/interviews/{interviewId}/accept | /jobs/interviews/{interviewId}/accept | jobs.interviews.accept | jobsAcceptInterview | jobs | missing | routes/govuk-alpha-parity/jobs.php:84 |
| POST | /jobs/interviews/{interviewId}/decline | /{tenantSlug}/alpha/jobs/interviews/{interviewId}/decline | /jobs/interviews/{interviewId}/decline | jobs.interviews.decline | jobsDeclineInterview | jobs | missing | routes/govuk-alpha-parity/jobs.php:88 |
| POST | /jobs/offers/{offerId}/accept | /{tenantSlug}/alpha/jobs/offers/{offerId}/accept | /jobs/offers/{offerId}/accept | jobs.offers.accept | jobsAcceptOffer | jobs | missing | routes/govuk-alpha-parity/jobs.php:92 |
| POST | /jobs/offers/{offerId}/reject | /{tenantSlug}/alpha/jobs/offers/{offerId}/reject | /jobs/offers/{offerId}/reject | jobs.offers.reject | jobsRejectOffer | jobs | missing | routes/govuk-alpha-parity/jobs.php:96 |
| GET | /listings/{id}/analytics | /{tenantSlug}/alpha/listings/{id}/analytics | /listings/{id}/analytics | listings.analytics | listingsAnalytics | listings | candidate-family | routes/govuk-alpha-parity/listings.php:24 |
| POST | /listings/generate-description | /{tenantSlug}/alpha/listings/generate-description | /listings/generate-description | listings.generate-description | listingsGenerateDescription | listings | candidate-workflow-family | routes/govuk-alpha-parity/listings.php:30 |
| GET | /listings/{id}/comments | /{tenantSlug}/alpha/listings/{id}/comments | /listings/{id}/comments | listings.comments | listingsComments | listings | candidate-family | routes/govuk-alpha-parity/listings.php:36 |
| POST | /listings/{id}/comments | /{tenantSlug}/alpha/listings/{id}/comments | /listings/{id}/comments | listings.comments.store | listingsStoreComment | listings | candidate-workflow-family | routes/govuk-alpha-parity/listings.php:39 |
| GET | /members/discover | /{tenantSlug}/alpha/members/discover | /members/discover | members.discover | membersDiscover | members | candidate-family | routes/govuk-alpha-parity/members.php:34 |
| GET | /members/nearby | /{tenantSlug}/alpha/members/nearby | /members/nearby | members.nearby | membersNearby | members | candidate-family | routes/govuk-alpha-parity/members.php:37 |
| GET | /members/{id}/insights | /{tenantSlug}/alpha/members/{id}/insights | /members/{id}/insights | members.insights | membersInsights | members | candidate-family | routes/govuk-alpha-parity/members.php:40 |
| GET | /messages/groups | /{tenantSlug}/alpha/messages/groups | /messages/groups | messages.groups.index | messagesGroupsIndex | messages | candidate-family | routes/govuk-alpha-parity/messages.php:22 |
| GET | /messages/groups/new | /{tenantSlug}/alpha/messages/groups/new | /messages/groups/new | messages.groups.create | messagesCreateGroupForm | messages | candidate-family | routes/govuk-alpha-parity/messages.php:25 |
| POST | /messages/groups | /{tenantSlug}/alpha/messages/groups | /messages/groups | messages.groups.store | messagesStoreGroup | messages | candidate-workflow-family | routes/govuk-alpha-parity/messages.php:28 |
| GET | /messages/groups/{conversationId} | /{tenantSlug}/alpha/messages/groups/{conversationId} | /messages/groups/{conversationId} | messages.groups.show | messagesGroupShow | messages | candidate-family | routes/govuk-alpha-parity/messages.php:33 |
| POST | /messages/groups/{conversationId} | /{tenantSlug}/alpha/messages/groups/{conversationId} | /messages/groups/{conversationId} | messages.groups.message | messagesStoreGroupMessage | messages | candidate-workflow-family | routes/govuk-alpha-parity/messages.php:37 |
| POST | /messages/groups/{conversationId}/members | /{tenantSlug}/alpha/messages/groups/{conversationId}/members | /messages/groups/{conversationId}/members | messages.groups.members.add | messagesGroupAddMember | messages | candidate-workflow-family | routes/govuk-alpha-parity/messages.php:42 |
| POST | /messages/groups/{conversationId}/members/{targetUserId}/remove | /{tenantSlug}/alpha/messages/groups/{conversationId}/members/{targetUserId}/remove | /messages/groups/{conversationId}/members/{targetUserId}/remove | messages.groups.members.remove | messagesGroupRemoveMember | messages | candidate-workflow-family | routes/govuk-alpha-parity/messages.php:47 |
| POST | /messages/groups/{conversationId}/m/{messageId}/react | /{tenantSlug}/alpha/messages/groups/{conversationId}/m/{messageId}/react | /messages/groups/{conversationId}/m/{messageId}/react | messages.groups.react | messagesToggleReaction | messages | candidate-workflow-family | routes/govuk-alpha-parity/messages.php:53 |
| POST | /messages/{userId}/m/{messageId}/translate | /{tenantSlug}/alpha/messages/{userId}/m/{messageId}/translate | /messages/{userId}/m/{messageId}/translate | messages.translate | messagesTranslateMessage | messages | candidate-workflow-family | routes/govuk-alpha-parity/messages.php:62 |
| POST | /messages/{userId}/voice | /{tenantSlug}/alpha/messages/{userId}/voice | /messages/{userId}/voice | messages.voice | storeVoiceMessage | messages | candidate-workflow-family | routes/govuk-alpha-parity/messages.php:71 |
| GET | /organisations/browse | /{tenantSlug}/alpha/organisations/browse | /organisations/browse | organisations.browse | organisationsBrowse | organisations | missing | routes/govuk-alpha-parity/organisations.php:28 |
| GET | /organisations/register | /{tenantSlug}/alpha/organisations/register | /organisations/register | organisations.register.form | organisationsRegisterForm | organisations | missing | routes/govuk-alpha-parity/organisations.php:32 |
| POST | /organisations/register | /{tenantSlug}/alpha/organisations/register | /organisations/register | organisations.register | organisationsRegister | organisations | missing | routes/govuk-alpha-parity/organisations.php:34 |
| GET | /organisations/manage | /{tenantSlug}/alpha/organisations/manage | /organisations/manage | organisations.manage | organisationsManage | organisations | missing | routes/govuk-alpha-parity/organisations.php:39 |
| GET | /organisations/opportunities/{id}/apply | /{tenantSlug}/alpha/organisations/opportunities/{id}/apply | /organisations/opportunities/{id}/apply | organisations.apply.form | organisationsApplyForm | organisations | missing | routes/govuk-alpha-parity/organisations.php:43 |
| GET | /organisations/{id}/jobs | /{tenantSlug}/alpha/organisations/{id}/jobs | /organisations/{id}/jobs | organisations.jobs | organisationsJobs | organisations | missing | routes/govuk-alpha-parity/organisations.php:48 |
| GET | /resources/library | /{tenantSlug}/alpha/resources/library | /resources/library | resources.library | resourcesLibrary | resources | missing | routes/govuk-alpha-parity/resources.php:21 |
| GET | /resources/upload | /{tenantSlug}/alpha/resources/upload | /resources/upload | resources.upload.form | resourcesUploadForm | resources | missing | routes/govuk-alpha-parity/resources.php:25 |
| POST | /resources/upload | /{tenantSlug}/alpha/resources/upload | /resources/upload | resources.upload | resourcesUpload | resources | missing | routes/govuk-alpha-parity/resources.php:27 |
| POST | /resources/reorder | /{tenantSlug}/alpha/resources/reorder | /resources/reorder | resources.reorder | resourcesReorder | resources | missing | routes/govuk-alpha-parity/resources.php:32 |
| GET | /resources/{id}/download | /{tenantSlug}/alpha/resources/{id}/download | /resources/{id}/download | resources.download | resourcesDownload | resources | missing | routes/govuk-alpha-parity/resources.php:37 |
| GET | /resources/{id}/delete | /{tenantSlug}/alpha/resources/{id}/delete | /resources/{id}/delete | resources.delete.confirm | resourcesDeleteConfirm | resources | missing | routes/govuk-alpha-parity/resources.php:40 |
| POST | /resources/{id}/delete | /{tenantSlug}/alpha/resources/{id}/delete | /resources/{id}/delete | resources.delete | resourcesDelete | resources | missing | routes/govuk-alpha-parity/resources.php:43 |
| POST | /resources/{id}/react | /{tenantSlug}/alpha/resources/{id}/react | /resources/{id}/react | resources.react | resourcesReact | resources | missing | routes/govuk-alpha-parity/resources.php:51 |
| GET | /resources/{id}/comments | /{tenantSlug}/alpha/resources/{id}/comments | /resources/{id}/comments | resources.comments | resourcesComments | resources | missing | routes/govuk-alpha-parity/resources.php:55 |
| POST | /resources/{id}/comments/add | /{tenantSlug}/alpha/resources/{id}/comments/add | /resources/{id}/comments/add | resources.comments.store | resourcesStoreComment | resources | missing | routes/govuk-alpha-parity/resources.php:58 |
| POST | /resources/{id}/comments/{commentId}/delete | /{tenantSlug}/alpha/resources/{id}/comments/{commentId}/delete | /resources/{id}/comments/{commentId}/delete | resources.comments.delete | resourcesDeleteComment | resources | missing | routes/govuk-alpha-parity/resources.php:62 |
| GET | /me/collections | /{tenantSlug}/alpha/me/collections | /me/collections | saved.collections | savedMyCollections | me | missing | routes/govuk-alpha-parity/saved.php:28 |
| POST | /me/collections | /{tenantSlug}/alpha/me/collections | /me/collections | saved.collections.store | savedCreateCollection | me | missing | routes/govuk-alpha-parity/saved.php:31 |
| GET | /me/collections/{id} | /{tenantSlug}/alpha/me/collections/{id} | /me/collections/{id} | saved.collection-detail | savedCollectionDetail | me | missing | routes/govuk-alpha-parity/saved.php:38 |
| POST | /me/collections/{id}/update | /{tenantSlug}/alpha/me/collections/{id}/update | /me/collections/{id}/update | saved.collections.update | savedUpdateCollection | me | missing | routes/govuk-alpha-parity/saved.php:42 |
| POST | /me/collections/{id}/delete | /{tenantSlug}/alpha/me/collections/{id}/delete | /me/collections/{id}/delete | saved.collections.delete | savedDeleteCollection | me | missing | routes/govuk-alpha-parity/saved.php:47 |
| POST | /me/collections/{id}/items/{itemId}/remove | /{tenantSlug}/alpha/me/collections/{id}/items/{itemId}/remove | /me/collections/{id}/items/{itemId}/remove | saved.collections.item-remove | savedRemoveItem | me | missing | routes/govuk-alpha-parity/saved.php:52 |
| GET | /users/{userId}/collections | /{tenantSlug}/alpha/users/{userId}/collections | /users/{userId}/collections | saved.public-collections | savedPublicCollections | users | missing | routes/govuk-alpha-parity/saved.php:59 |
| GET | /users/{userId}/appreciations | /{tenantSlug}/alpha/users/{userId}/appreciations | /users/{userId}/appreciations | saved.appreciations | savedAppreciationWall | users | missing | routes/govuk-alpha-parity/saved.php:63 |
| POST | /users/{userId}/appreciations | /{tenantSlug}/alpha/users/{userId}/appreciations | /users/{userId}/appreciations | saved.appreciations.send | savedSendAppreciation | users | missing | routes/govuk-alpha-parity/saved.php:67 |
| POST | /appreciations/{id}/react | /{tenantSlug}/alpha/appreciations/{id}/react | /appreciations/{id}/react | saved.appreciations.react | savedReactAppreciation | appreciations | missing | routes/govuk-alpha-parity/saved.php:72 |
| GET | /search/advanced | /{tenantSlug}/alpha/search/advanced | /search/advanced | search.advanced | searchAdvanced | search | candidate-family | routes/govuk-alpha-parity/search.php:23 |
| POST | /search/saved | /{tenantSlug}/alpha/search/saved | /search/saved | search.saved.save | searchSaveSearch | search | candidate-workflow-family | routes/govuk-alpha-parity/search.php:27 |
| GET | /search/saved/{id}/delete | /{tenantSlug}/alpha/search/saved/{id}/delete | /search/saved/{id}/delete | search.saved.delete.confirm | searchDeleteSavedConfirm | search | candidate-family | routes/govuk-alpha-parity/search.php:32 |
| POST | /search/saved/{id}/delete | /{tenantSlug}/alpha/search/saved/{id}/delete | /search/saved/{id}/delete | search.saved.delete | searchDeleteSaved | search | candidate-workflow-family | routes/govuk-alpha-parity/search.php:35 |
| POST | /search/saved/{id}/run | /{tenantSlug}/alpha/search/saved/{id}/run | /search/saved/{id}/run | search.saved.run | searchRunSaved | search | candidate-workflow-family | routes/govuk-alpha-parity/search.php:39 |
| GET | /settings/linked-accounts | /{tenantSlug}/alpha/settings/linked-accounts | /settings/linked-accounts | settings.linked-accounts | settingsLinkedAccounts | settings | candidate-family | routes/govuk-alpha-parity/settings.php:25 |
| POST | /settings/linked-accounts/request | /{tenantSlug}/alpha/settings/linked-accounts/request | /settings/linked-accounts/request | settings.linked-accounts.request | settingsRequestLinkedAccount | settings | candidate-workflow-family | routes/govuk-alpha-parity/settings.php:28 |
| POST | /settings/linked-accounts/approve | /{tenantSlug}/alpha/settings/linked-accounts/approve | /settings/linked-accounts/approve | settings.linked-accounts.approve | settingsApproveLinkedAccount | settings | candidate-workflow-family | routes/govuk-alpha-parity/settings.php:32 |
| POST | /settings/linked-accounts/permissions | /{tenantSlug}/alpha/settings/linked-accounts/permissions | /settings/linked-accounts/permissions | settings.linked-accounts.permissions | settingsUpdateLinkedPermissions | settings | candidate-workflow-family | routes/govuk-alpha-parity/settings.php:36 |
| POST | /settings/linked-accounts/revoke | /{tenantSlug}/alpha/settings/linked-accounts/revoke | /settings/linked-accounts/revoke | settings.linked-accounts.revoke | settingsRevokeLinkedAccount | settings | candidate-workflow-family | routes/govuk-alpha-parity/settings.php:40 |
| GET | /settings/appearance | /{tenantSlug}/alpha/settings/appearance | /settings/appearance | settings.appearance | settingsAppearance | settings | candidate-family | routes/govuk-alpha-parity/settings.php:45 |
| POST | /settings/appearance | /{tenantSlug}/alpha/settings/appearance | /settings/appearance | settings.appearance.update | settingsUpdateAppearance | settings | candidate-workflow-family | routes/govuk-alpha-parity/settings.php:48 |
| GET | /settings/data-rights | /{tenantSlug}/alpha/settings/data-rights | /settings/data-rights | settings.data-rights | settingsDataRights | settings | candidate-family | routes/govuk-alpha-parity/settings.php:53 |
| POST | /settings/data-rights | /{tenantSlug}/alpha/settings/data-rights | /settings/data-rights | settings.data-rights.request | settingsRequestDataRights | settings | candidate-workflow-family | routes/govuk-alpha-parity/settings.php:56 |
| GET | /settings/insurance | /{tenantSlug}/alpha/settings/insurance | /settings/insurance | settings.insurance | settingsInsurance | settings | candidate-family | routes/govuk-alpha-parity/settings.php:61 |
| POST | /settings/insurance | /{tenantSlug}/alpha/settings/insurance | /settings/insurance | settings.insurance.upload | settingsUploadInsurance | settings | candidate-workflow-family | routes/govuk-alpha-parity/settings.php:64 |
| GET | /settings/availability | /{tenantSlug}/alpha/settings/availability | /settings/availability | settings.availability | settingsAvailability | settings | candidate-family | routes/govuk-alpha-parity/settings.php:69 |
| POST | /settings/availability | /{tenantSlug}/alpha/settings/availability | /settings/availability | settings.availability.update | settingsUpdateAvailability | settings | candidate-workflow-family | routes/govuk-alpha-parity/settings.php:71 |
| GET | /volunteering/my-organisations | /{tenantSlug}/alpha/volunteering/my-organisations | /volunteering/my-organisations | volunteering.my-organisations | volunteeringMyOrganisations | volunteering | missing | routes/govuk-alpha-parity/volunteering.php:25 |
| GET | /volunteering/recommended-shifts | /{tenantSlug}/alpha/volunteering/recommended-shifts | /volunteering/recommended-shifts | volunteering.recommended-shifts | volunteeringRecommendedShifts | volunteering | missing | routes/govuk-alpha-parity/volunteering.php:28 |
| GET | /volunteering/emergency-alerts | /{tenantSlug}/alpha/volunteering/emergency-alerts | /volunteering/emergency-alerts | volunteering.emergency-alerts | volunteeringEmergencyAlerts | volunteering | missing | routes/govuk-alpha-parity/volunteering.php:31 |
| POST | /volunteering/emergency-alerts/{id}/respond | /{tenantSlug}/alpha/volunteering/emergency-alerts/{id}/respond | /volunteering/emergency-alerts/{id}/respond | volunteering.emergency-alerts.respond | volunteeringRespondEmergencyAlert | volunteering | missing | routes/govuk-alpha-parity/volunteering.php:33 |
| GET | /volunteering/credentials | /{tenantSlug}/alpha/volunteering/credentials | /volunteering/credentials | volunteering.credentials | volunteeringCredentials | volunteering | missing | routes/govuk-alpha-parity/volunteering.php:36 |
| POST | /volunteering/credentials | /{tenantSlug}/alpha/volunteering/credentials | /volunteering/credentials | volunteering.credentials.upload | volunteeringUploadCredential | volunteering | missing | routes/govuk-alpha-parity/volunteering.php:38 |
| POST | /volunteering/credentials/{id}/delete | /{tenantSlug}/alpha/volunteering/credentials/{id}/delete | /volunteering/credentials/{id}/delete | volunteering.credentials.delete | volunteeringDeleteCredential | volunteering | missing | routes/govuk-alpha-parity/volunteering.php:40 |
| GET | /volunteering/wellbeing | /{tenantSlug}/alpha/volunteering/wellbeing | /volunteering/wellbeing | volunteering.wellbeing | volunteeringWellbeing | volunteering | missing | routes/govuk-alpha-parity/volunteering.php:43 |
| POST | /volunteering/wellbeing/checkin | /{tenantSlug}/alpha/volunteering/wellbeing/checkin | /volunteering/wellbeing/checkin | volunteering.wellbeing.checkin | volunteeringWellbeingCheckin | volunteering | missing | routes/govuk-alpha-parity/volunteering.php:45 |
| GET | /volunteering/donations | /{tenantSlug}/alpha/volunteering/donations | /volunteering/donations | volunteering.donations | volunteeringDonations | volunteering | missing | routes/govuk-alpha-parity/volunteering.php:49 |
| POST | /volunteering/donations | /{tenantSlug}/alpha/volunteering/donations | /volunteering/donations | volunteering.donations.store | volunteeringStoreDonation | volunteering | missing | routes/govuk-alpha-parity/volunteering.php:51 |
| GET | /volunteering/opportunities/create | /{tenantSlug}/alpha/volunteering/opportunities/create | /volunteering/opportunities/create | volunteering.opportunities.create | volunteeringCreateOpportunity | volunteering | missing | routes/govuk-alpha-parity/volunteering.php:58 |
| POST | /volunteering/opportunities/create | /{tenantSlug}/alpha/volunteering/opportunities/create | /volunteering/opportunities/create | volunteering.opportunities.store | volunteeringStoreOpportunity | volunteering | missing | routes/govuk-alpha-parity/volunteering.php:60 |
| GET | /volunteering/organisations/{id}/dashboard | /{tenantSlug}/alpha/volunteering/organisations/{id}/dashboard | /volunteering/organisations/{id}/dashboard | volunteering.org.dashboard | volunteeringOrgDashboard | volunteering | missing | routes/govuk-alpha-parity/volunteering.php:63 |
| GET | /volunteering/organisations/{id}/volunteers | /{tenantSlug}/alpha/volunteering/organisations/{id}/volunteers | /volunteering/organisations/{id}/volunteers | volunteering.org.volunteers | volunteeringOrgVolunteers | volunteering | missing | routes/govuk-alpha-parity/volunteering.php:66 |
| GET | /volunteering/organisations/{id}/settings | /{tenantSlug}/alpha/volunteering/organisations/{id}/settings | /volunteering/organisations/{id}/settings | volunteering.org.settings | volunteeringOrgSettings | volunteering | missing | routes/govuk-alpha-parity/volunteering.php:69 |
| POST | /volunteering/organisations/{id}/settings | /{tenantSlug}/alpha/volunteering/organisations/{id}/settings | /volunteering/organisations/{id}/settings | volunteering.org.settings.update | volunteeringUpdateOrgSettings | volunteering | missing | routes/govuk-alpha-parity/volunteering.php:71 |
| GET | /volunteering/organisations/{id}/wallet | /{tenantSlug}/alpha/volunteering/organisations/{id}/wallet | /volunteering/organisations/{id}/wallet | volunteering.org.wallet | volunteeringOrgWallet | volunteering | missing | routes/govuk-alpha-parity/volunteering.php:74 |
| POST | /volunteering/organisations/{id}/wallet/deposit | /{tenantSlug}/alpha/volunteering/organisations/{id}/wallet/deposit | /volunteering/organisations/{id}/wallet/deposit | volunteering.org.wallet.deposit | volunteeringOrgWalletDeposit | volunteering | missing | routes/govuk-alpha-parity/volunteering.php:76 |
| POST | /volunteering/organisations/{id}/wallet/auto-pay | /{tenantSlug}/alpha/volunteering/organisations/{id}/wallet/auto-pay | /volunteering/organisations/{id}/wallet/auto-pay | volunteering.org.wallet.auto-pay | volunteeringOrgAutoPay | volunteering | missing | routes/govuk-alpha-parity/volunteering.php:78 |
| GET | /volunteering/group-signups | /{tenantSlug}/alpha/volunteering/group-signups | /volunteering/group-signups | volunteering.group-signups | volunteeringGroupSignups | volunteering | missing | routes/govuk-alpha-parity/volunteering.php:82 |
| POST | /volunteering/group-signups/{id}/members | /{tenantSlug}/alpha/volunteering/group-signups/{id}/members | /volunteering/group-signups/{id}/members | volunteering.group-signups.members.add | volunteeringAddGroupMember | volunteering | missing | routes/govuk-alpha-parity/volunteering.php:84 |
| POST | /volunteering/group-signups/{id}/members/{userId}/remove | /{tenantSlug}/alpha/volunteering/group-signups/{id}/members/{userId}/remove | /volunteering/group-signups/{id}/members/{userId}/remove | volunteering.group-signups.members.remove | volunteeringRemoveGroupMember | volunteering | missing | routes/govuk-alpha-parity/volunteering.php:86 |
| POST | /volunteering/group-signups/{id}/cancel | /{tenantSlug}/alpha/volunteering/group-signups/{id}/cancel | /volunteering/group-signups/{id}/cancel | volunteering.group-signups.cancel | volunteeringCancelGroupReservation | volunteering | missing | routes/govuk-alpha-parity/volunteering.php:88 |
| GET | /volunteering/expenses | /{tenantSlug}/alpha/volunteering/expenses | /volunteering/expenses | volunteering.expenses | volunteeringExpenses | volunteering | missing | routes/govuk-alpha-parity/volunteering.php:92 |
| POST | /volunteering/expenses | /{tenantSlug}/alpha/volunteering/expenses | /volunteering/expenses | volunteering.expenses.submit | volunteeringSubmitExpense | volunteering | missing | routes/govuk-alpha-parity/volunteering.php:94 |
| GET | /volunteering/training | /{tenantSlug}/alpha/volunteering/training | /volunteering/training | volunteering.training | volunteeringSafeguarding | volunteering | missing | routes/govuk-alpha-parity/volunteering.php:100 |
| POST | /volunteering/training | /{tenantSlug}/alpha/volunteering/training | /volunteering/training | volunteering.training.store | volunteeringSafeguardingLogTraining | volunteering | missing | routes/govuk-alpha-parity/volunteering.php:102 |
| GET | /volunteering/incidents | /{tenantSlug}/alpha/volunteering/incidents | /volunteering/incidents | volunteering.incidents | volunteeringSafeguarding | volunteering | missing | routes/govuk-alpha-parity/volunteering.php:105 |
| POST | /volunteering/incidents | /{tenantSlug}/alpha/volunteering/incidents | /volunteering/incidents | volunteering.incidents.store | volunteeringSafeguardingReportIncident | volunteering | missing | routes/govuk-alpha-parity/volunteering.php:107 |
| GET | /wallet/manage | /{tenantSlug}/alpha/wallet/manage | /wallet/manage | wallet.manage | walletManage | wallet | candidate-family | routes/govuk-alpha-parity/wallet.php:29 |
