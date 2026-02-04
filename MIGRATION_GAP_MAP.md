# Migration Gap Map

**Purpose**: Cross-reference legacy features against roadmap and implementation status
**Inputs**: LEGACY_FEATURE_INVENTORY.md, ROADMAP.md
**Last Updated**: 2026-02-02

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

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority |
|----------------|---------------|----------------|----------|
| User Registration | Phase 8 | Done | Must-have |
| Login (Session) | N/A | Missing (JWT only) | Must-have |
| Login (Token/JWT) | Phase 0 | Done | Must-have |
| Two-Factor Auth (TOTP) | Backlog (Two-Factor Auth) | Missing | Should-have |
| WebAuthn/Biometric | Not on roadmap | Missing | Should-have |
| Password Reset | Phase 8 | Partial (no email) | Must-have |
| Email Verification | Not on roadmap | Missing | Should-have |
| Social OAuth Login | Not on roadmap | Missing | Nice-to-have |
| Token Revocation | Phase 8 | Done | Should-have |
| Session Heartbeat | N/A | Missing (JWT only) | Should-have |

---

## 2. User Profiles & Settings

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority |
|----------------|---------------|----------------|----------|
| View Profile | Phase 0-2 | Done | Must-have |
| Edit Profile | Phase 2 | Done | Must-have |
| Avatar Upload | Backlog (File Uploads) | Missing | Should-have |
| User Preferences | Backlog (User Preferences) | Missing | Should-have |
| Password Change | Phase 8 | Done | Must-have |
| Account Deletion | Backlog (GDPR) | Missing | Should-have |
| User Status (suspend) | Backlog (Admin) | Missing | Should-have |

---

## 3. Listings (Time Exchange)

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority |
|----------------|---------------|----------------|----------|
| Create Listing | Phase 3 | Done | Must-have |
| View Listings | Phase 1 | Done | Must-have |
| View Listing Detail | Phase 1 | Done | Must-have |
| Edit Listing | Phase 3 | Done | Should-have |
| Delete Listing | Phase 3 | Done | Should-have |
| Listing Images | Backlog (File Uploads) | Missing | Should-have |
| Listing Categories | Phase 1 | Partial (no CRUD) | Should-have |
| Listing Attributes | Not on roadmap | Missing | Nice-to-have |
| Nearby Listings (geo) | Not on roadmap | Missing | Should-have |
| Admin Moderation | Backlog (Admin) | Missing | Should-have |

---

## 4. Messaging & Communication

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority |
|----------------|---------------|----------------|----------|
| Direct Messages | Phase 6-7 | Done | Must-have |
| Typing Indicator | Not on roadmap | Missing | Nice-to-have |
| Voice Messages | Not on roadmap | Missing | Should-have |
| Message Archive | Not on roadmap | Missing | Nice-to-have |
| Unread Count | Phase 6 | Done | Should-have |
| Group Discussions | Phase 11 | Partial (no threads) | Should-have |

---

## 5. Wallet & Time Credits

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority |
|----------------|---------------|----------------|----------|
| View Balance | Phase 4 | Done | Must-have |
| Transaction History | Phase 4 | Done | Must-have |
| Transfer Credits | Phase 5 | Done | Must-have |
| Transaction Details | Phase 4 | Done | Should-have |
| Pending Count | Not on roadmap | Missing | Nice-to-have |
| Org Wallet | Not on roadmap | Missing | Should-have |
| User Search (autocomplete) | Not on roadmap | Missing | Should-have |

---

## 6. Social Feed

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority |
|----------------|---------------|----------------|----------|
| Create Post | Phase 12 | Done | Should-have |
| Like/React | Phase 12 | Done | Should-have |
| Comments | Phase 12 | Done | Should-have |
| Feed Timeline | Phase 12 | Done | Should-have |
| Delete Post/Comment | Phase 12 | Done | Should-have |
| Edit Comment | Not on roadmap | Missing | Nice-to-have |
| Mention Tagging | Not on roadmap | Missing | Nice-to-have |
| Share Posts | Not on roadmap | Missing | Nice-to-have |

---

## 7. Groups & Communities

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority |
|----------------|---------------|----------------|----------|
| Create Group | Phase 11 | Done | Should-have |
| View Groups | Phase 11 | Done | Should-have |
| Group Details | Phase 11 | Done | Should-have |
| Join Group | Phase 11 | Done | Should-have |
| Leave Group | Phase 11 | Done | Should-have |
| Manage Members | Phase 11 | Done | Should-have |
| Pending Requests | Phase 11 | Missing | Should-have |
| Group Image | Backlog (File Uploads) | Missing | Should-have |
| Edit/Delete Group | Phase 11 | Done | Should-have |
| Group Types | Not on roadmap | Missing | Nice-to-have |
| Group Analytics | Not on roadmap | Missing | Nice-to-have |
| Group Feedback | Not on roadmap | Missing | Nice-to-have |

---

## 8. Events & Calendar

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority |
|----------------|---------------|----------------|----------|
| Create Event | Phase 11 | Done | Should-have |
| View Events | Phase 11 | Done | Should-have |
| Event Details | Phase 11 | Done | Should-have |
| RSVP | Phase 11 | Done | Should-have |
| Cancel RSVP | Phase 11 | Done | Should-have |
| Attendees List | Phase 11 | Done | Should-have |
| Edit Event | Phase 11 | Done | Should-have |
| Delete Event | Phase 11 | Done | Should-have |
| Event Image | Backlog (File Uploads) | Missing | Should-have |
| Federated Events | Backlog (Federation) | Missing | Nice-to-have |

---

## 9. Volunteering Module

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority |
|----------------|---------------|----------------|----------|
| Create Opportunity | Backlog (Volunteering) | Missing | Should-have |
| Browse Opportunities | Backlog (Volunteering) | Missing | Should-have |
| Opportunity Details | Backlog (Volunteering) | Missing | Should-have |
| Apply | Backlog (Volunteering) | Missing | Should-have |
| Manage Applications | Backlog (Volunteering) | Missing | Should-have |
| Shifts Management | Backlog (Volunteering) | Missing | Should-have |
| Log Hours | Backlog (Volunteering) | Missing | Must-have |
| Verify Hours | Backlog (Volunteering) | Missing | Should-have |
| Hours Summary | Backlog (Volunteering) | Missing | Should-have |
| Browse Organizations | Backlog (Volunteering) | Missing | Should-have |
| Volunteer Reviews | Backlog (Volunteering) | Missing | Should-have |

---

## 10. Reviews & Trust

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority |
|----------------|---------------|----------------|----------|
| Create Review | Phase 14 | Done | Should-have |
| Pending Reviews | Not on roadmap | Missing | Should-have |
| User Reviews | Phase 14 | Done | Should-have |
| Review Stats | Phase 14 | Done | Should-have |
| Trust Score | Not on roadmap | Missing | Should-have |
| Delete Review | Phase 14 | Done | Nice-to-have |

---

## 11. Notifications

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority |
|----------------|---------------|----------------|----------|
| In-App Notifications | Phase 10 | Done | Must-have |
| Badge Count | Phase 10 | Done | Should-have |
| Mark as Read | Phase 10 | Done | Should-have |
| Mark All Read | Phase 10 | Done | Should-have |
| Delete Notification | Phase 10 | Done | Nice-to-have |
| Clear All | Not on roadmap | Missing | Nice-to-have |
| Web Push (PWA) | Backlog (Push Notifications) | Missing | Should-have |
| Mobile Push (FCM) | Backlog (Push Notifications) | Missing | Should-have |
| Notification Polling | Not on roadmap | Missing | Should-have |

---

## 12. Connections & Friendships

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority |
|----------------|---------------|----------------|----------|
| Send Request | Phase 9 | Done | Should-have |
| Accept Request | Phase 9 | Done | Should-have |
| View Connections | Phase 9 | Done | Should-have |
| Check Status | Not on roadmap | Missing | Nice-to-have |
| Pending Counts | Phase 9 | Partial | Should-have |
| Remove Connection | Phase 9 | Done | Should-have |

---

## 13. Polls & Surveys

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority |
|----------------|---------------|----------------|----------|
| Create Poll | Not on roadmap | Missing | Nice-to-have |
| View Polls | Not on roadmap | Missing | Nice-to-have |
| Poll Details | Not on roadmap | Missing | Nice-to-have |
| Vote | Not on roadmap | Missing | Nice-to-have |
| Edit Poll | Not on roadmap | Missing | Nice-to-have |
| Delete Poll | Not on roadmap | Missing | Nice-to-have |

---

## 14. Goals & Self-Improvement

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority |
|----------------|---------------|----------------|----------|
| Create Goal | Not on roadmap | Missing | Nice-to-have |
| View Goals | Not on roadmap | Missing | Nice-to-have |
| Goal Discovery | Not on roadmap | Missing | Nice-to-have |
| Goal Details | Not on roadmap | Missing | Nice-to-have |
| Update Progress | Not on roadmap | Missing | Nice-to-have |
| Goal Buddy | Not on roadmap | Missing | Nice-to-have |
| Edit/Delete Goal | Not on roadmap | Missing | Nice-to-have |

---

## 15. Gamification & Rewards

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority |
|----------------|---------------|----------------|----------|
| XP/Points System | Phase 13 | Done | Nice-to-have |
| Badges | Phase 13 | Done | Nice-to-have |
| Leaderboards | Phase 13 | Done | Nice-to-have |
| Gamification Profile | Phase 13 | Done | Nice-to-have |
| Challenges | Not on roadmap | Missing | Nice-to-have |
| Collections | Not on roadmap | Missing | Nice-to-have |
| Daily Reward | Not on roadmap | Missing | Nice-to-have |
| Reward Shop | Not on roadmap | Missing | Nice-to-have |
| Badge Showcase | Not on roadmap | Missing | Nice-to-have |
| Seasonal Events | Not on roadmap | Missing | Nice-to-have |

---

## 16. Search & Discovery

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority |
|----------------|---------------|----------------|----------|
| Unified Search | Phase 15 (Search) | Missing | Should-have |
| Autocomplete | Phase 15 (Search) | Missing | Should-have |
| Search Filters | Phase 15 (Search) | Missing | Should-have |
| Member Directory | Phase 15 (Search) | Missing | Should-have |

---

## 17. Admin Panel

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority |
|----------------|---------------|----------------|----------|
| Dashboard | Backlog (Admin) | Missing | Must-have |
| User Management | Backlog (Admin) | Missing | Must-have |
| Listing Moderation | Backlog (Admin) | Missing | Should-have |
| Content Moderation | Backlog (Reporting & Moderation) | Missing | Should-have |
| Category Management | Backlog (Admin) | Missing | Should-have |
| Blog/CMS | Not on roadmap | Missing | Nice-to-have |
| Page Builder | Not on roadmap | Missing | Nice-to-have |
| Menu Management | Not on roadmap | Missing | Should-have |
| Tenant Config | Backlog (Admin) | Missing | Must-have |
| Roles & Permissions | Backlog (Admin) | Missing | Should-have |
| Newsletter Management | Not on roadmap | Missing | Should-have |
| Newsletter Templates | Not on roadmap | Missing | Nice-to-have |
| Newsletter Analytics | Not on roadmap | Missing | Should-have |
| SEO Management | Not on roadmap | Missing | Should-have |
| Gamification Admin | Not on roadmap | Missing | Nice-to-have |
| Cron Jobs | Not on roadmap | Missing | Should-have |
| Activity Logging | Not on roadmap | Missing | Should-have |

---

## 18. Federation & Multi-Tenant

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority |
|----------------|---------------|----------------|----------|
| Federation Setup | Backlog (Federation) | Missing | Should-have |
| Federated Search | Backlog (Federation) | Missing | Should-have |
| Federated Members | Backlog (Federation) | Missing | Nice-to-have |
| Federated Messaging | Backlog (Federation) | Missing | Should-have |
| Federated Transactions | Backlog (Federation) | Missing | Must-have |
| Federated Events | Backlog (Federation) | Missing | Should-have |
| Federation Dashboard | Backlog (Federation) | Missing | Should-have |
| Federation API Keys | Not on roadmap | Missing | Should-have |
| Federation Directory | Backlog (Federation) | Missing | Should-have |
| Federation Analytics | Not on roadmap | Missing | Nice-to-have |
| Federation Import/Export | Not on roadmap | Missing | Should-have |
| Federation Settings | Backlog (Federation) | Missing | Should-have |
| External Partners | Not on roadmap | Missing | Nice-to-have |

---

## 19. Super Admin (Platform-Level)

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority |
|----------------|---------------|----------------|----------|
| Super Dashboard | Backlog (Super Admin) | Missing | Must-have |
| Tenant Management | Backlog (Super Admin) | Missing | Must-have |
| Tenant Hierarchy | Not on roadmap | Missing | Should-have |
| Bulk Operations | Not on roadmap | Missing | Should-have |
| Cross-Tenant Users | Backlog (Super Admin) | Missing | Must-have |
| Global Roles | Backlog (Super Admin) | Missing | Must-have |
| Federation Control | Not on roadmap | Missing | Should-have |
| Emergency Lockdown | Backlog (Super Admin) | Missing | Must-have |
| Whitelist Management | Not on roadmap | Missing | Should-have |
| Audit Logging | Not on roadmap | Missing | Should-have |

---

## 20. Enterprise & Governance

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority |
|----------------|---------------|----------------|----------|
| Enterprise Dashboard | Not on roadmap | Missing | Should-have |
| Enterprise Config | Not on roadmap | Missing | Should-have |
| GDPR Compliance | Backlog (GDPR) | Missing | Must-have |
| GDPR Audit Trail | Not on roadmap | Missing | Should-have |
| GDPR Breach Reporting | Not on roadmap | Missing | Should-have |
| Consent Management | Backlog (GDPR) | Missing | Should-have |
| Cookie Consent | Not on roadmap | Missing | Should-have |
| Legal Documents | Backlog (GDPR) | Missing | Should-have |
| Monitoring | Not on roadmap | Missing | Should-have |
| Secrets Management | Not on roadmap | Missing | Should-have |

---

## 21. AI Features

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority |
|----------------|---------------|----------------|----------|
| AI Chat | Not on roadmap | Missing | Nice-to-have |
| AI Streaming | Not on roadmap | Missing | Nice-to-have |
| Conversation History | Not on roadmap | Missing | Nice-to-have |
| AI Listing Generation | Not on roadmap | Missing | Nice-to-have |
| AI Event Generation | Not on roadmap | Missing | Nice-to-have |
| AI Message Generation | Not on roadmap | Missing | Nice-to-have |
| AI Bio Generation | Not on roadmap | Missing | Nice-to-have |
| AI Newsletter Generation | Not on roadmap | Missing | Nice-to-have |
| AI Blog Generation | Not on roadmap | Missing | Nice-to-have |
| AI Page Generation | Not on roadmap | Missing | Nice-to-have |
| AI Provider Management | Not on roadmap | Missing | Should-have |
| AI Usage Limits | Not on roadmap | Missing | Should-have |
| AI Settings | Not on roadmap | Missing | Should-have |

---

## 22. Help & Documentation

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority |
|----------------|---------------|----------------|----------|
| Help Articles | Not on roadmap | Missing | Should-have |
| Onboarding Wizard | Not on roadmap | Missing | Should-have |

---

## 23. Reporting & Moderation

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority |
|----------------|---------------|----------------|----------|
| Report Content | Backlog (Reporting & Moderation) | Missing | Should-have |
| Moderation Queue | Backlog (Reporting & Moderation) | Missing | Should-have |
| Error Tracking | Not on roadmap | Missing | Should-have |

---

## 24. Mobile & PWA

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority |
|----------------|---------------|----------------|----------|
| Web Push | Not on roadmap | Missing | Should-have |
| Mobile Push | Not on roadmap | Missing | Should-have |
| Share Target | Not on roadmap | Missing | Nice-to-have |
| App Version Check | Not on roadmap | Missing | Should-have |
| Mobile Logging | Not on roadmap | Missing | Should-have |
| Real-time (Pusher) | Not on roadmap | Missing | Should-have |

---

## 25. Integrations

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority |
|----------------|---------------|----------------|----------|
| API Documentation | Not on roadmap | Missing | Should-have |
| File Upload API | Not on roadmap | Missing | Should-have |
| Federation API | Backlog (Federation) | Missing | Should-have |

---

## 26. Advanced Features

| Legacy Feature | Roadmap Phase | ASP.NET Status | Priority |
|----------------|---------------|----------------|----------|
| Smart Matching | Not on roadmap | Missing | Nice-to-have |
| Matching Diagnostics | Not on roadmap | Missing | Nice-to-have |
| Resource Management | Not on roadmap | Missing | Nice-to-have |
| Deliverables | Not on roadmap | Missing | Nice-to-have |
| Nexus Score | Not on roadmap | Missing | Nice-to-have |
| User Insights | Not on roadmap | Missing | Nice-to-have |
| Governance | Not on roadmap | Missing | Nice-to-have |
| Contact Form | Not on roadmap | Missing | Should-have |
| Sitemap | Not on roadmap | Missing | Should-have |
| Robots.txt | Not on roadmap | Missing | Should-have |

---

## Summary Statistics

| Category | Count |
|----------|-------|
| Total Legacy Features | ~140 |
| Done in ASP.NET | 58 |
| Partial in ASP.NET | 4 |
| Missing from ASP.NET | 78 |
| On Roadmap (Phase 15 or Backlog) | 45 |
| Not on Roadmap | 33 |

---

## Top 20 Missing Features

Prioritized by criticality (Must-have first, then Should-have).

### Must-Have (Critical)

| # | Feature | Domain | On Roadmap? |
|---|---------|--------|-------------|
| 1 | Password Reset Email | Auth | Yes (DEFERRED) |
| 2 | Admin Dashboard | Admin | Yes (Backlog) |
| 3 | User Management (Admin) | Admin | Yes (Backlog) |
| 4 | Tenant Management | Admin | Yes (Backlog) |
| 5 | Tenant Config | Admin | Yes (Backlog) |
| 6 | GDPR Compliance | Enterprise | Yes (Backlog) |
| 7 | Super Admin Dashboard | Super Admin | Yes (Backlog) |
| 8 | Cross-Tenant User Mgmt | Super Admin | Yes (Backlog) |
| 9 | Global Role Assignment | Super Admin | Yes (Backlog) |
| 10 | Emergency Lockdown | Super Admin | Yes (Backlog) |
| 11 | Log Volunteer Hours | Volunteering | Yes (Backlog) |
| 12 | Federated Transactions | Federation | Yes (Backlog) |

### Should-Have (High Impact)

| # | Feature | Domain | On Roadmap? |
|---|---------|--------|-------------|
| 13 | Two-Factor Auth (TOTP) | Auth | Yes (Backlog) |
| 14 | Avatar Upload | Profiles | Yes (Backlog) |
| 15 | Listing Images | Listings | Yes (Backlog) |
| 16 | Web Push Notifications | Notifications | Yes (Backlog) |
| 17 | Mobile Push (FCM) | Notifications | Yes (Backlog) |
| 18 | Unified Search | Search | Yes (Phase 15) |
| 19 | Account Deletion (GDPR) | Profiles | Yes (Backlog) |
| 20 | User Preferences | Profiles | Yes (Backlog) |

---

## Roadmap Fixes Needed

### 1. Add Missing Must-Have Features to Backlog

Add these to the Future Phases (Backlog) section:

```markdown
### GDPR & Compliance (P1)

- GET /api/users/me/data-export - Export user data (GDPR)
- DELETE /api/users/me - Account deletion (GDPR)
- POST /api/consent - Record consent
- GET /api/legal/documents - Get legal documents

### Super Admin (P2)

- GET /api/super-admin/dashboard - Platform metrics
- GET /api/super-admin/tenants - List tenants
- POST /api/super-admin/tenants - Create tenant
- PUT /api/super-admin/tenants/{id} - Update tenant
- POST /api/super-admin/tenants/{id}/suspend - Suspend tenant
- GET /api/super-admin/users - Cross-tenant user list
- PUT /api/super-admin/users/{id}/role - Assign global role
- POST /api/super-admin/emergency-lockdown - Emergency lockdown
```

### 2. Add Missing Should-Have Features to Backlog

```markdown
### Two-Factor Authentication (P2)

- GET /api/auth/totp/setup - Get TOTP setup (QR code, secret)
- POST /api/auth/totp/enable - Enable TOTP with verification
- POST /api/auth/totp/verify - Verify TOTP during login
- DELETE /api/auth/totp - Disable TOTP
- GET /api/auth/totp/backup-codes - Get backup codes

### File/Image Uploads (P2)

- POST /api/upload - General file upload
- POST /api/users/me/avatar - Avatar upload
- POST /api/listings/{id}/images - Listing images
- POST /api/groups/{id}/image - Group image
- POST /api/events/{id}/image - Event image

### Push Notifications (P2)

- POST /api/push/subscribe - Subscribe to web push
- DELETE /api/push/subscribe - Unsubscribe
- POST /api/push/register-device - Register mobile device (FCM)
- DELETE /api/push/register-device - Unregister device

### User Preferences (P2)

- GET /api/users/me/preferences - Get preferences
- PUT /api/users/me/preferences - Update preferences

### Real-Time (P3)

- POST /api/pusher/auth - Pusher WebSocket authentication
- GET /api/notifications/poll - Lightweight polling endpoint
```

### 3. Expand Existing Backlog Sections

#### Search Section - Add Details

```markdown
### Search (P2)

- GET /api/search?q=term&type=listings|users|groups|events
- GET /api/search/suggestions?q=term - Autocomplete
- GET /api/members?q=name - Member directory search
```

#### Admin Section - Add Details

```markdown
### Admin APIs (P3)

**Dashboard:**
- GET /api/admin/dashboard - Key metrics

**User Management:**
- GET /api/admin/users - List users
- GET /api/admin/users/{id} - User details
- PUT /api/admin/users/{id} - Update user
- PUT /api/admin/users/{id}/suspend - Suspend user
- PUT /api/admin/users/{id}/activate - Activate user

**Content Moderation:**
- GET /api/admin/listings/pending - Pending listings
- PUT /api/admin/listings/{id}/approve - Approve listing
- PUT /api/admin/listings/{id}/reject - Reject listing
- GET /api/admin/reports - Content reports
- PUT /api/admin/reports/{id}/resolve - Resolve report

**Categories:**
- GET /api/admin/categories - List categories
- POST /api/admin/categories - Create category
- PUT /api/admin/categories/{id} - Update category
- DELETE /api/admin/categories/{id} - Delete category

**Tenant Config:**
- GET /api/admin/config - Get tenant config
- PUT /api/admin/config - Update tenant config

**Roles & Permissions:**
- GET /api/admin/roles - List roles
- POST /api/admin/roles - Create role
- PUT /api/admin/roles/{id} - Update role
- DELETE /api/admin/roles/{id} - Delete role
```

#### Federation Section - Add Details

```markdown
### Federation (P3)

**Setup:**
- GET /api/federation/partners - List federation partners
- POST /api/federation/partners - Add partner
- DELETE /api/federation/partners/{id} - Remove partner
- GET /api/federation/settings - Get federation settings
- PUT /api/federation/settings - Update settings

**Cross-Tenant Operations:**
- GET /api/federation/listings - Search federated listings
- GET /api/federation/members - Search federated members
- POST /api/federation/transactions - Create federated transaction
- GET /api/federation/events - List federated events

**Admin:**
- GET /api/federation/dashboard - Federation stats
- GET /api/federation/directory - Participating timebanks
```

### 4. Create New Backlog Sections

#### Volunteering (Referenced but Sparse)

```markdown
### Volunteering (P2)

**Opportunities:**
- GET /api/volunteering/opportunities - List opportunities
- GET /api/volunteering/opportunities/{id} - Details
- POST /api/volunteering/opportunities - Create
- PUT /api/volunteering/opportunities/{id} - Update
- DELETE /api/volunteering/opportunities/{id} - Delete

**Applications:**
- POST /api/volunteering/opportunities/{id}/apply - Apply
- GET /api/volunteering/applications - My applications
- PUT /api/volunteering/applications/{id}/accept - Accept (org)
- PUT /api/volunteering/applications/{id}/reject - Reject (org)

**Hours:**
- POST /api/volunteering/hours - Log hours
- GET /api/volunteering/hours - My hours history
- PUT /api/volunteering/hours/{id}/verify - Verify hours (org)
- GET /api/volunteering/hours/summary - Hours summary

**Shifts:**
- GET /api/volunteering/opportunities/{id}/shifts - List shifts
- POST /api/volunteering/shifts/{id}/signup - Sign up for shift
```

#### Reporting & Moderation

```markdown
### Reporting & Moderation (P2)

- POST /api/reports - Report content (user, listing, post, comment)
- GET /api/reports/my - My submitted reports
- GET /api/admin/reports - Moderation queue (admin)
- PUT /api/admin/reports/{id}/resolve - Resolve report (admin)
```

### 5. Update Email Integration

Current text is vague. Make concrete:

```markdown
### Email Integration (P2 - DEFERRED)

**Required for Production:**
- IEmailService abstraction
- SendGrid or SMTP provider implementation

**Email Types:**
- Password reset emails
- Email verification on registration
- Welcome emails
- Connection request notifications (optional)
- Message notifications (optional)
- Event reminder notifications (optional)

**Status:** Blocked on provider selection. Token generation works; email delivery does not.
```

---

## Implementation Priority Recommendation

Based on gap analysis, recommended next phases:

| Phase | Name | Focus Area | Why |
|-------|------|------------|-----|
| 15 | Search | Unified search, autocomplete | High-impact user feature |
| 16 | File Uploads | Avatar, listing images, event images | Blocks UX polish |
| 17 | Admin Core | Dashboard, user mgmt, tenant config | Operational necessity |
| 18 | GDPR | Data export, account deletion, consent | Legal requirement |
| 19 | Push Notifications | Web push, FCM | Engagement feature |
| 20 | Two-Factor Auth | TOTP, backup codes | Security feature |
| 21 | Volunteering | Opportunities, hours, shifts | Domain feature |
| 22 | Super Admin | Platform-level controls | Multi-tenant ops |
| 23 | Federation | Cross-tenant operations | Platform expansion |

---

*This document should be updated as features are implemented or roadmap changes.*
