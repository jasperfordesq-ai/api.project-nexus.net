# Legacy Feature Inventory - Project NEXUS (PHP)

**Source of Truth**: Legacy PHP application (`staging/` directory)
**Purpose**: Document what features the legacy PHP app implements TODAY
**Last Updated**: 2026-02-02

---

## Executive Summary

Project NEXUS is a mature, multi-tenant timebanking and community platform built in PHP. The platform supports:
- **60+ data models**
- **169+ controllers**
- **300+ API endpoints** (v1 and v2)
- **26 feature domains**

---

## Feature Inventory Format

Each feature includes:
- **Description**: What the feature does (not how)
- **User Type**: member | tenant admin | platform admin | public
- **Criticality**: Must-have | Should-have | Nice-to-have
- **Data Sensitivity**: Low | Med | High

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
| Nearby Listings | Find listings by geo-proximity | member | Should-have | Med |
| Admin Moderation | Review, approve, reject listings | tenant admin | Should-have | Med |

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
| User Search | Autocomplete search for transfer recipients | member | Should-have | Low |

---

## 6. SOCIAL FEED

| Feature | Description | User Type | Criticality | Data Sensitivity |
|---------|-------------|-----------|-------------|------------------|
| Create Post | Post status updates, photos to feed | member | Should-have | Med |
| Like/React | Like and emoji-react to posts | member | Should-have | Low |
| Comments | Comment on posts, reply to comments | member | Should-have | Med |
| Feed Timeline | View paginated social feed (cursor-based) | member | Should-have | Low |
| Delete Post/Comment | Delete own posts and comments | member | Should-have | Med |
| Edit Comment | Edit own comments | member | Nice-to-have | Med |
| Mention Tagging | @mention users in posts/comments | member | Nice-to-have | Low |
| Share Posts | Share posts with others | member | Nice-to-have | Low |

---

## 7. GROUPS & COMMUNITIES

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

---

## 8. EVENTS & CALENDAR

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
| Federated Events | View events from federated timebanks | member | Nice-to-have | Med |

---

## 9. VOLUNTEERING MODULE

| Feature | Description | User Type | Criticality | Data Sensitivity |
|---------|-------------|-----------|-------------|------------------|
| Create Opportunity | Create volunteer opportunity with shifts | organization | Should-have | Med |
| Browse Opportunities | List and filter volunteering opportunities | member | Should-have | Low |
| Opportunity Details | View opportunity info, requirements, shifts | member | Should-have | Med |
| Apply | Submit volunteer application | member | Should-have | Med |
| Manage Applications | Accept/reject volunteer applications | organization | Should-have | Med |
| Shifts Management | Create, view, sign up for shifts | member | Should-have | Med |
| Log Hours | Record volunteer hours worked | member | Must-have | High |
| Verify Hours | Approve volunteer hours | organization | Should-have | High |
| Hours Summary | View total volunteer hours and stats | member | Should-have | Med |
| Browse Organizations | Find registered volunteer organizations | member | Should-have | Low |
| Volunteer Reviews | Rate volunteering experiences | member | Should-have | Med |

---

## 10. REVIEWS & TRUST

| Feature | Description | User Type | Criticality | Data Sensitivity |
|---------|-------------|-----------|-------------|------------------|
| Create Review | Leave review/rating after transaction | member | Should-have | Med |
| Pending Reviews | View transactions awaiting review | member | Should-have | Low |
| User Reviews | View all reviews for a user | member | Should-have | Med |
| Review Stats | View aggregated rating stats | member | Should-have | Low |
| Trust Score | Calculate user trust score from reviews | system | Should-have | Low |
| Delete Review | Delete own review (with conditions) | member | Nice-to-have | Med |

---

## 11. NOTIFICATIONS

| Feature | Description | User Type | Criticality | Data Sensitivity |
|---------|-------------|-----------|-------------|------------------|
| In-App Notifications | Display in-app notification list | member | Must-have | Low |
| Badge Count | Display unread notification count | member | Should-have | Low |
| Mark as Read | Mark individual notification as read | member | Should-have | Low |
| Mark All Read | Mark all notifications as read | member | Should-have | Low |
| Delete Notification | Delete individual notification | member | Nice-to-have | Low |
| Clear All | Delete all notifications | member | Nice-to-have | Low |
| Web Push (PWA) | Browser push notifications | member | Should-have | Low |
| Mobile Push (FCM) | Native mobile push notifications | member | Should-have | Low |
| Notification Polling | Lightweight badge update endpoint | member | Should-have | Low |

---

## 12. CONNECTIONS & FRIENDSHIPS

| Feature | Description | User Type | Criticality | Data Sensitivity |
|---------|-------------|-----------|-------------|------------------|
| Send Request | Send friend/connection request | member | Should-have | Low |
| Accept Request | Accept pending connection request | member | Should-have | Low |
| View Connections | View list of accepted connections | member | Should-have | Low |
| Check Status | Check if two users are connected | member | Nice-to-have | Low |
| Pending Counts | View count of pending requests | member | Should-have | Low |
| Remove Connection | Unfriend/disconnect | member | Should-have | Low |

---

## 13. POLLS & SURVEYS

| Feature | Description | User Type | Criticality | Data Sensitivity |
|---------|-------------|-----------|-------------|------------------|
| Create Poll | Create multiple choice poll | member | Nice-to-have | Low |
| View Polls | List available polls | member | Nice-to-have | Low |
| Poll Details | View poll with options and vote counts | member | Nice-to-have | Low |
| Vote | Cast vote on poll option | member | Nice-to-have | Low |
| Edit Poll | Edit poll options and settings | poll creator | Nice-to-have | Low |
| Delete Poll | Delete poll | poll creator | Nice-to-have | Low |

---

## 14. GOALS & SELF-IMPROVEMENT

| Feature | Description | User Type | Criticality | Data Sensitivity |
|---------|-------------|-----------|-------------|------------------|
| Create Goal | Create personal or community goal | member | Nice-to-have | Med |
| View Goals | Browse personal and community goals | member | Nice-to-have | Low |
| Goal Discovery | Discover popular/recommended goals | member | Nice-to-have | Low |
| Goal Details | View goal with progress, participants | member | Nice-to-have | Low |
| Update Progress | Log progress toward goal completion | member | Nice-to-have | Med |
| Goal Buddy | Find accountability partner | member | Nice-to-have | Med |
| Edit/Delete Goal | Modify or remove goal | member | Nice-to-have | Med |

---

## 15. GAMIFICATION & REWARDS

| Feature | Description | User Type | Criticality | Data Sensitivity |
|---------|-------------|-----------|-------------|------------------|
| XP/Points System | Earn experience points for activities | member | Nice-to-have | Low |
| Badges | Unlock badges for achievements | member | Nice-to-have | Low |
| Leaderboards | View rankings by XP | member | Nice-to-have | Low |
| Gamification Profile | View personal stats (level, XP, badges) | member | Nice-to-have | Low |
| Challenges | Time-limited challenges for XP/badges | member | Nice-to-have | Low |
| Collections | Collect related badges/items | member | Nice-to-have | Low |
| Daily Reward | Daily login bonus | member | Nice-to-have | Low |
| Reward Shop | Purchase items with XP | member | Nice-to-have | Med |
| Badge Showcase | Display favorite badges on profile | member | Nice-to-have | Low |
| Seasonal Events | Seasonal challenges and rewards | member | Nice-to-have | Low |

---

## 16. SEARCH & DISCOVERY

| Feature | Description | User Type | Criticality | Data Sensitivity |
|---------|-------------|-----------|-------------|------------------|
| Unified Search | Search across listings, users, groups, events | member | Should-have | Low |
| Autocomplete | Search suggestions while typing | member | Should-have | Low |
| Search Filters | Filter by type, date, category, etc. | member | Should-have | Low |
| Member Directory | Find members by name, skills, location | member | Should-have | Low |

---

## 17. ADMIN PANEL

| Feature | Description | User Type | Criticality | Data Sensitivity |
|---------|-------------|-----------|-------------|------------------|
| Dashboard | Admin overview with key metrics | tenant admin | Must-have | Low |
| User Management | View, edit, create, delete users | tenant admin | Must-have | High |
| Listing Moderation | Review, approve, reject listings | tenant admin | Should-have | Med |
| Content Moderation | Review flagged content | tenant admin | Should-have | High |
| Category Management | Manage listing/group categories | tenant admin | Should-have | Low |
| Blog/CMS | Create and manage blog posts | tenant admin | Nice-to-have | Med |
| Page Builder | Create custom pages (drag-and-drop) | tenant admin | Nice-to-have | Med |
| Menu Management | Configure navigation menus | tenant admin | Should-have | Low |
| Tenant Config | Configure tenant settings, branding | tenant admin | Must-have | High |
| Roles & Permissions | Manage user roles and permissions | tenant admin | Should-have | High |
| Newsletter Management | Create, send, track newsletters | tenant admin | Should-have | High |
| Newsletter Templates | Pre-built newsletter templates | tenant admin | Nice-to-have | Low |
| Newsletter Analytics | Track opens, clicks, bounces | tenant admin | Should-have | Med |
| SEO Management | Manage SEO metadata for pages | tenant admin | Should-have | Low |
| Gamification Admin | Configure badges, XP settings | tenant admin | Nice-to-have | Low |
| Cron Jobs | Configure scheduled tasks | platform admin | Should-have | High |
| Activity Logging | Audit log of admin actions | tenant admin | Should-have | Med |

---

## 18. FEDERATION & MULTI-TENANT

| Feature | Description | User Type | Criticality | Data Sensitivity |
|---------|-------------|-----------|-------------|------------------|
| Federation Setup | Configure timebank partnerships | platform admin | Should-have | High |
| Federated Search | Search listings across timebanks | member | Should-have | Med |
| Federated Members | Find members from other timebanks | member | Nice-to-have | Med |
| Federated Messaging | Message users from other timebanks | member | Should-have | High |
| Federated Transactions | Exchange credits across timebanks | member | Must-have | High |
| Federated Events | Attend events from other timebanks | member | Should-have | Med |
| Federation Dashboard | View federation status, partners | federation admin | Should-have | Med |
| Federation API Keys | Manage federation credentials | federation admin | Should-have | High |
| Federation Directory | Browse participating timebanks | member | Should-have | Low |
| Federation Analytics | View federation statistics | federation admin | Nice-to-have | Low |
| Federation Import/Export | Import/export user and listing data | platform admin | Should-have | High |
| Federation Settings | Configure federation rules | platform admin | Should-have | High |
| External Partners | Manage partner integrations | platform admin | Nice-to-have | High |

---

## 19. SUPER ADMIN (Platform-Level)

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

---

## 20. ENTERPRISE & GOVERNANCE

| Feature | Description | User Type | Criticality | Data Sensitivity |
|---------|-------------|-----------|-------------|------------------|
| Enterprise Dashboard | Enterprise-level overview | enterprise admin | Should-have | Low |
| Enterprise Config | Configure enterprise settings | enterprise admin | Should-have | High |
| GDPR Compliance | Data export, deletion, consent | member | Must-have | High |
| GDPR Audit Trail | Log of data access and changes | enterprise admin | Should-have | High |
| GDPR Breach Reporting | Report and manage data breaches | enterprise admin | Should-have | High |
| Consent Management | Track user consent | enterprise admin | Should-have | High |
| Cookie Consent | Cookie consent banner and API | public | Should-have | Med |
| Legal Documents | ToS, privacy policy acceptance | member | Should-have | High |
| Monitoring | System monitoring, error tracking | enterprise admin | Should-have | Low |
| Secrets Management | Store API keys, secrets | enterprise admin | Should-have | High |

---

## 21. AI FEATURES

| Feature | Description | User Type | Criticality | Data Sensitivity |
|---------|-------------|-----------|-------------|------------------|
| AI Chat | Conversational AI chatbot | member | Nice-to-have | Med |
| AI Streaming | Real-time streaming AI responses | member | Nice-to-have | Med |
| Conversation History | Save and manage AI conversations | member | Nice-to-have | Med |
| AI Listing Generation | AI-assisted listing descriptions | member | Nice-to-have | Low |
| AI Event Generation | AI-assisted event descriptions | member | Nice-to-have | Low |
| AI Message Generation | AI-assisted message composition | member | Nice-to-have | Low |
| AI Bio Generation | AI-assisted profile bios | member | Nice-to-have | Low |
| AI Newsletter Generation | AI-assisted newsletters | tenant admin | Nice-to-have | Low |
| AI Blog Generation | AI-assisted blog posts | tenant admin | Nice-to-have | Low |
| AI Page Generation | AI-assisted page content | tenant admin | Nice-to-have | Low |
| AI Provider Management | Configure AI providers (OpenAI, etc.) | platform admin | Should-have | High |
| AI Usage Limits | Per-user AI usage limits | member | Should-have | Low |
| AI Settings | Configure AI feature toggles | tenant admin | Should-have | High |

---

## 22. HELP & DOCUMENTATION

| Feature | Description | User Type | Criticality | Data Sensitivity |
|---------|-------------|-----------|-------------|------------------|
| Help Articles | Self-service knowledge base | member | Should-have | Low |
| Onboarding Wizard | Step-by-step setup for new users | member | Should-have | Med |

---

## 23. REPORTING & MODERATION

| Feature | Description | User Type | Criticality | Data Sensitivity |
|---------|-------------|-----------|-------------|------------------|
| Report Content | Flag inappropriate content | member | Should-have | Med |
| Moderation Queue | Review reported content | tenant admin | Should-have | Med |
| Error Tracking | Log 404 and other errors | system | Should-have | Low |

---

## 24. MOBILE & PWA

| Feature | Description | User Type | Criticality | Data Sensitivity |
|---------|-------------|-----------|-------------|------------------|
| Web Push | Web Push API support | member | Should-have | Low |
| Mobile Push | Firebase Cloud Messaging | member | Should-have | Low |
| Share Target | Web Share Target for PWA | member | Nice-to-have | Low |
| App Version Check | Check for app updates | member | Should-have | Low |
| Mobile Logging | Client-side error logging | member | Should-have | Low |
| Real-time (Pusher) | WebSocket auth for real-time updates | member | Should-have | Med |

---

## 25. INTEGRATIONS

| Feature | Description | User Type | Criticality | Data Sensitivity |
|---------|-------------|-----------|-------------|------------------|
| API Documentation | OpenAPI/Swagger docs | developer | Should-have | Low |
| File Upload API | General-purpose file upload | member | Should-have | Med |
| Federation API | External API for partner integration | external | Should-have | High |

---

## 26. ADVANCED FEATURES

| Feature | Description | User Type | Criticality | Data Sensitivity |
|---------|-------------|-----------|-------------|------------------|
| Smart Matching | Recommend matching listings | member | Nice-to-have | Low |
| Matching Diagnostics | Debug matching algorithm | tenant admin | Nice-to-have | Low |
| Resource Management | Manage shareable resources/inventory | member | Nice-to-have | Med |
| Deliverables | Project management with milestones | member | Nice-to-have | Med |
| Nexus Score | Quantify user impact/contribution | member | Nice-to-have | Low |
| User Insights | Personal analytics dashboard | member | Nice-to-have | Med |
| Governance | Democratic decision-making tools | member | Nice-to-have | Med |
| Contact Form | General inquiry form | public | Should-have | Med |
| Sitemap | XML sitemap generation | system | Should-have | Low |
| Robots.txt | Search engine crawling config | system | Should-have | Low |

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| Feature Domains | 26 |
| Total Features | ~140 |
| Must-Have Features | ~25 |
| Should-Have Features | ~65 |
| Nice-to-Have Features | ~50 |
| Data Models | 60+ |
| Controllers | 169+ |
| API Endpoints | 300+ |

---

## Key Architectural Patterns (Observed)

1. **Multi-Tenancy**: All data scoped to tenants
2. **Federation**: Cross-timebank integration framework
3. **Dual Auth**: Session (web) + Bearer token (mobile/SPA)
4. **Rate Limiting**: IP and email-based brute force protection
5. **Gamification**: XP, badges, leaderboards, challenges
6. **AI Integration**: LLM provider support (OpenAI, etc.)
7. **Push Notifications**: Web Push + FCM for mobile
8. **Activity Logging**: Comprehensive audit trails
9. **GDPR Compliance**: Consent, audit, export, deletion workflows
10. **Real-time**: Pusher WebSocket integration

---

## Migration Priority Mapping

### Already Implemented in ASP.NET (Phases 0-14)
- Authentication (JWT, login, password reset)
- User profiles (CRUD, avatar, preferences)
- Listings (CRUD, categories, images)
- Messaging (conversations, CRUD)
- Wallet (balance, transactions, transfers)
- Social feed (posts, comments, likes)
- Groups (CRUD, membership, discussions)
- Events (CRUD, RSVP, attendees)
- Notifications (CRUD, badge counts)
- Connections (friend requests, CRUD)
- Reviews (user reviews, listing reviews)
- Gamification (badges, XP, leaderboards)
- Search (unified search)
- Admin (dashboard, user management)

### Not Yet Implemented (Future Phases)
- Two-Factor Authentication (TOTP, WebAuthn)
- Social OAuth Login
- Volunteering Module
- Polls & Surveys
- Goals & Self-Improvement
- Federation System
- Super Admin Panel
- Enterprise/GDPR Features
- AI Features
- Push Notifications (Web Push, FCM)
- Smart Matching Algorithm
- Resource Management
- Deliverables/Project Management
- Governance Tools

---

## Unknown / Needs Clarification

| Item | Question |
|------|----------|
| Federation scope | Is federation required for initial launch? |
| AI priority | Are AI features needed for MVP? |
| Volunteering | Is this a core feature or optional module? |
| GDPR compliance | Which EU markets require full GDPR? |
| Enterprise tier | Is enterprise a separate product tier? |
| Mobile app | Native app vs PWA priority? |

---

*This inventory documents what the legacy PHP application DOES today. It is not a specification for the new ASP.NET backend.*
