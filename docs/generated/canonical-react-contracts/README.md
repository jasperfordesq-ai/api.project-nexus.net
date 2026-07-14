# Canonical React API Contract Matrix

Generated: 2026-07-14T20:53:34.4117469+01:00

- Laravel SHA: `903d03d3db78bbf87129ad35728be3b72819acaf`
- ASP.NET SHA: `e14897a25d3c765d383ee3147b3e02ba266ee306`
- Static call-site rows: 2320
- Unique method/path contracts: 2008
- Method-evidenced contracts: 1836
- Method-unresolved contracts: 172
- ASP.NET static route/method gaps: 72
- Laravel static route/method gaps: 22

This is static call-site evidence, not a parity score. Payloads, response envelopes, status codes, auth, tenancy, uploads, side effects, and unchanged-client runtime remain separate semantic and certification gates.

## ASP.NET static gaps

| Method | Path | Laravel | ASP.NET | Call sites | Representative source |
| --- | --- | --- | --- | ---: | --- |
| POST | `/api/v2/admin/events/{id}/{id}` | missing  | missing  | 1 | `admin/modules/events/EventsAdmin.tsx` |
| PUT | `/api/v2/admin/marketplace/reports/{id}/{id}` | missing  | missing  | 1 | `admin/modules/marketplace/MarketplaceCasesPage.tsx` |
| UNRESOLVED | `/api/v2/events/{id}/agenda` | exists-unambiguous-method GET | missing  | 1 | `lib/events-api.ts` |
| UNRESOLVED | `/api/v2/events/{id}/agenda/order` | exists-unambiguous-method PUT | missing  | 1 | `lib/events-api.ts` |
| UNRESOLVED | `/api/v2/events/{id}/agenda/sessions` | exists-unambiguous-method POST | missing  | 1 | `lib/events-api.ts` |
| UNRESOLVED | `/api/v2/events/{id}/agenda/sessions/{id}` | exists-unambiguous-method PUT | missing  | 1 | `lib/events-api.ts` |
| UNRESOLVED | `/api/v2/events/{id}/agenda/sessions/{id}/cancel` | exists-unambiguous-method POST | missing  | 1 | `lib/events-api.ts` |
| UNRESOLVED | `/api/v2/events/{id}/agenda/sessions/{id}/registration` | exists-unambiguous-method POST | missing  | 1 | `lib/events-api.ts` |
| UNRESOLVED | `/api/v2/events/{id}/agenda/sessions/{id}/registration/withdraw` | exists-unambiguous-method POST | missing  | 1 | `lib/events-api.ts` |
| GET | `/api/v2/events/{id}/calendar.ics` | exists GET | missing  | 1 | `lib/events-api.ts` |
| UNRESOLVED | `/api/v2/events/{id}/calendar-actions` | exists-unambiguous-method GET | missing  | 1 | `lib/events-api.ts` |
| UNRESOLVED | `/api/v2/events/{id}/offline-checkin` | exists-unambiguous-method GET | missing  | 1 | `lib/event-offline-checkin-api.ts` |
| UNRESOLVED | `/api/v2/events/{id}/offline-checkin/batches/{id}` | exists-unambiguous-method GET | missing  | 1 | `lib/event-offline-checkin-api.ts` |
| UNRESOLVED | `/api/v2/events/{id}/offline-checkin/conflicts` | exists-unambiguous-method GET | missing  | 1 | `lib/event-offline-checkin-api.ts` |
| UNRESOLVED | `/api/v2/events/{id}/offline-checkin/conflicts/{id}` | exists-unambiguous-method POST | missing  | 1 | `lib/event-offline-checkin-api.ts` |
| UNRESOLVED | `/api/v2/events/{id}/offline-checkin/credentials` | exists-unambiguous-method POST | missing  | 1 | `lib/event-offline-checkin-api.ts` |
| UNRESOLVED | `/api/v2/events/{id}/offline-checkin/credentials/{id}/revoke` | exists-unambiguous-method POST | missing  | 1 | `lib/event-offline-checkin-api.ts` |
| UNRESOLVED | `/api/v2/events/{id}/offline-checkin/credentials/{id}/rotate` | exists-unambiguous-method POST | missing  | 1 | `lib/event-offline-checkin-api.ts` |
| UNRESOLVED | `/api/v2/events/{id}/offline-checkin/credentials/me` | exists-unambiguous-method GET | missing  | 1 | `lib/event-offline-checkin-api.ts` |
| UNRESOLVED | `/api/v2/events/{id}/offline-checkin/devices` | exists-unambiguous-method POST | missing  | 1 | `lib/event-offline-checkin-api.ts` |
| UNRESOLVED | `/api/v2/events/{id}/offline-checkin/devices/{id}/revoke` | exists-unambiguous-method POST | missing  | 1 | `lib/event-offline-checkin-api.ts` |
| UNRESOLVED | `/api/v2/events/{id}/offline-checkin/devices/{id}/rotate` | exists-unambiguous-method POST | missing  | 1 | `lib/event-offline-checkin-api.ts` |
| UNRESOLVED | `/api/v2/events/{id}/offline-checkin/manifest` | exists-unambiguous-method POST | missing  | 1 | `lib/event-offline-checkin-api.ts` |
| UNRESOLVED | `/api/v2/events/{id}/offline-checkin/sync` | exists-unambiguous-method POST | missing  | 1 | `lib/event-offline-checkin-api.ts` |
| GET | `/api/v2/events/{id}/registration-product` | exists GET | missing  | 1 | `lib/event-registration-api.ts` |
| POST | `/api/v2/events/{id}/registration-product/campaigns/{id}/cancel` | exists POST | missing  | 1 | `lib/event-registration-api.ts` |
| POST | `/api/v2/events/{id}/registration-product/campaigns/{id}/issue` | exists POST | missing  | 1 | `lib/event-registration-api.ts` |
| POST | `/api/v2/events/{id}/registration-product/campaigns/{id}/schedule` | exists POST | missing  | 1 | `lib/event-registration-api.ts` |
| POST | `/api/v2/events/{id}/registration-product/campaigns/preview` | exists POST | missing  | 1 | `lib/event-registration-api.ts` |
| POST | `/api/v2/events/{id}/registration-product/forms` | exists POST | missing  | 1 | `lib/event-registration-api.ts` |
| PUT | `/api/v2/events/{id}/registration-product/forms/{id}` | exists PUT | missing  | 1 | `lib/event-registration-api.ts` |
| POST | `/api/v2/events/{id}/registration-product/forms/{id}/fork` | exists POST | missing  | 1 | `lib/event-registration-api.ts` |
| POST | `/api/v2/events/{id}/registration-product/forms/{id}/publish` | exists POST | missing  | 1 | `lib/event-registration-api.ts` |
| POST | `/api/v2/events/{id}/registration-product/guests/{id}/attendance/{id}` | exists POST | missing  | 1 | `lib/event-registration-api.ts` |
| POST | `/api/v2/events/{id}/registration-product/guests/{id}/cancel` | exists POST | missing  | 1 | `lib/event-registration-api.ts` |
| POST | `/api/v2/events/{id}/registration-product/invitations/{id}/accept` | exists POST | missing  | 1 | `lib/event-registration-api.ts` |
| GET | `/api/v2/events/{id}/registration-product/manage` | exists GET | missing  | 1 | `lib/event-registration-api.ts` |
| POST | `/api/v2/events/{id}/registration-product/registrations/{id}/guests` | exists POST | missing  | 1 | `lib/event-registration-api.ts` |
| POST | `/api/v2/events/{id}/registration-product/retention/{id}/apply` | exists POST | missing  | 1 | `lib/event-registration-api.ts` |
| POST | `/api/v2/events/{id}/registration-product/retention/dry-run` | exists POST | missing  | 1 | `lib/event-registration-api.ts` |
| PUT | `/api/v2/events/{id}/registration-product/settings` | exists PUT | missing  | 1 | `lib/event-registration-api.ts` |
| POST | `/api/v2/events/{id}/registration-product/settings/publish` | exists POST | missing  | 1 | `lib/event-registration-api.ts` |
| POST | `/api/v2/events/{id}/registration-product/submissions` | exists POST | missing  | 1 | `lib/event-registration-api.ts` |
| POST | `/api/v2/events/{id}/registration-product/submissions/{id}/amend` | exists POST | missing  | 1 | `lib/event-registration-api.ts` |
| POST | `/api/v2/events/{id}/registration-product/submissions/{id}/answers` | exists POST | missing  | 1 | `lib/event-registration-api.ts` |
| POST | `/api/v2/events/{id}/registration-product/submissions/{id}/submit` | exists POST | missing  | 1 | `lib/event-registration-api.ts` |
| GET | `/api/v2/events/{id}/registration-product/submissions/export` | method-mismatch POST | missing  | 1 | `lib/event-registration-api.ts` |
| UNRESOLVED | `/api/v2/events/{id}/safety` | exists-unambiguous-method GET | missing  | 1 | `lib/event-safety-api.ts` |
| UNRESOLVED | `/api/v2/events/{id}/safety/code-of-conduct/acknowledgements` | exists-unambiguous-method POST | missing  | 1 | `lib/event-safety-api.ts` |
| UNRESOLVED | `/api/v2/events/{id}/safety/code-of-conduct/acknowledgements/{id}` | exists-unambiguous-method DELETE | missing  | 1 | `lib/event-safety-api.ts` |
| UNRESOLVED | `/api/v2/events/{id}/safety/guardian-consents` | exists-unambiguous-method POST | missing  | 1 | `lib/event-safety-api.ts` |
| UNRESOLVED | `/api/v2/events/{id}/safety/guardian-consents/{id}` | exists-unambiguous-method DELETE | missing  | 1 | `lib/event-safety-api.ts` |
| UNRESOLVED | `/api/v2/events/{id}/safety/requirements` | exists-unambiguous-method PUT | missing  | 1 | `lib/event-safety-api.ts` |
| UNRESOLVED | `/api/v2/events/{id}/safety/requirements/archive` | exists-unambiguous-method POST | missing  | 1 | `lib/event-safety-api.ts` |
| UNRESOLVED | `/api/v2/events/{id}/safety/requirements/publish` | exists-unambiguous-method POST | missing  | 1 | `lib/event-safety-api.ts` |
| UNRESOLVED | `/api/v2/events/{id}/safety/reviews` | exists-any-method GET;POST | missing  | 2 | `lib/event-safety-api.ts` |
| UNRESOLVED | `/api/v2/events/{id}/safety/reviews/{id}` | exists-unambiguous-method DELETE | missing  | 1 | `lib/event-safety-api.ts` |
| UNRESOLVED | `/api/v2/events/{id}/staff` | exists-any-method GET;POST | missing  | 2 | `lib/events-api.ts` |
| UNRESOLVED | `/api/v2/events/{id}/staff/{id}` | exists-unambiguous-method DELETE | missing  | 1 | `lib/events-api.ts` |
| UNRESOLVED | `/api/v2/events/{id}/ticket-entitlements/{id}/cancel` | exists-unambiguous-method POST | missing  | 1 | `lib/event-tickets-api.ts` |
| UNRESOLVED | `/api/v2/events/{id}/tickets` | exists-unambiguous-method GET | missing  | 1 | `lib/event-tickets-api.ts` |
| UNRESOLVED | `/api/v2/events/{id}/tickets/{id}/allocate` | exists-unambiguous-method POST | missing  | 1 | `lib/event-tickets-api.ts` |
| UNRESOLVED | `/api/v2/events/{id}/tickets/{id}/quote` | exists-unambiguous-method POST | missing  | 1 | `lib/event-tickets-api.ts` |
| UNRESOLVED | `/api/v2/events/{id}/tickets/reconciliation` | exists-unambiguous-method GET | missing  | 1 | `lib/event-tickets-api.ts` |
| UNRESOLVED | `/api/v2/events/{id}/ticket-types` | exists-unambiguous-method POST | missing  | 1 | `lib/event-tickets-api.ts` |
| UNRESOLVED | `/api/v2/events/{id}/ticket-types/{id}` | exists-unambiguous-method PUT | missing  | 1 | `lib/event-tickets-api.ts` |
| UNRESOLVED | `/api/v2/events/{id}/ticket-types/{id}/{id}` | exists-unambiguous-method POST | missing  | 1 | `lib/event-tickets-api.ts` |
| UNRESOLVED | `/api/v2/events/calendar` | exists-unambiguous-method GET | missing  | 1 | `lib/events-api.ts` |
| GET | `/api/v2/events/calendar/feed.ics` | exists GET | missing  | 1 | `lib/events-api.ts` |
| UNRESOLVED | `/api/v2/events/calendar/feed-tokens` | exists-any-method GET;POST | missing  | 2 | `lib/events-api.ts` |
| UNRESOLVED | `/api/v2/events/calendar/feed-tokens/{id}` | exists-unambiguous-method DELETE | missing  | 1 | `lib/events-api.ts` |
| GET | `/api/v2/groups/{id}/analytics/export/{id}` | missing  | missing  | 1 | `pages/groups/api/analytics.ts` |

The complete deduplicated matrix is `canonical-react-api-contract-matrix.csv`; machine-readable metadata and both gap sets are in `canonical-react-api-contract-summary.json`.
