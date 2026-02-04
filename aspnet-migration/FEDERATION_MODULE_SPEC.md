# Federation Module - Complete Specification

This document provides comprehensive documentation of the legacy PHP Federation module for ASP.NET Core implementation.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [Core Services](#core-services)
5. [API Endpoints](#api-endpoints)
6. [Authentication Methods](#authentication-methods)
7. [Permission System](#permission-system)
8. [User Settings](#user-settings)
9. [Implementation Recommendations](#implementation-recommendations)

---

## Overview

Federation enables cross-tenant operations between independent timebanks. It allows members from different timebanks to:

- **View profiles** across partnered timebanks
- **Send messages** to members in other timebanks
- **Transfer time credits** between timebanks
- **Browse listings** from partner timebanks
- **Join events** hosted by partner timebanks
- **Participate in groups** that span multiple timebanks

### Key Design Principles

1. **Opt-in at every level**: System → Tenant → Partnership → User
2. **Fail-safe defaults**: Everything defaults to OFF
3. **Multi-layer permission checking**: Every operation validates permissions at all levels
4. **Comprehensive audit logging**: Every cross-tenant interaction is logged
5. **Emergency lockdown capability**: Instant system-wide disable

---

## Architecture

### Permission Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                    SYSTEM LEVEL                              │
│  - Global federation enabled?                                │
│  - Whitelist mode active?                                    │
│  - Emergency lockdown?                                       │
│  - Feature-level kill switches                               │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    TENANT LEVEL                              │
│  - Tenant federation enabled?                                │
│  - Tenant whitelisted?                                       │
│  - Tenant feature toggles                                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  PARTNERSHIP LEVEL                           │
│  - Active partnership exists?                                │
│  - Partnership feature permissions                           │
│  - Federation level (1-4)                                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     USER LEVEL                               │
│  - User opted into federation?                               │
│  - User-level feature toggles                                │
│  - Profile visibility settings                               │
└─────────────────────────────────────────────────────────────┘
```

### Core Service Relationships

```
FederationGateway (Central Controller)
    ├── FederationFeatureService (System/Tenant flags)
    ├── FederationPartnershipService (Partnership management)
    ├── FederationUserService (User preferences)
    └── FederationAuditService (Logging)

FederatedTransactionService → FederationGateway.canPerformTransaction()
FederatedMessageService → FederationGateway.canSendMessage()
FederationApiController → FederationApiMiddleware → FederationJwtService
```

---

## Database Schema

### federation_system_control

Single-row table for system-wide settings.

```sql
CREATE TABLE federation_system_control (
    id INT UNSIGNED NOT NULL DEFAULT 1 PRIMARY KEY,

    -- Master controls
    federation_enabled TINYINT(1) NOT NULL DEFAULT 0,
    whitelist_mode_enabled TINYINT(1) NOT NULL DEFAULT 1,
    max_federation_level TINYINT UNSIGNED NOT NULL DEFAULT 0,

    -- Feature kill switches
    cross_tenant_profiles_enabled TINYINT(1) NOT NULL DEFAULT 0,
    cross_tenant_messaging_enabled TINYINT(1) NOT NULL DEFAULT 0,
    cross_tenant_transactions_enabled TINYINT(1) NOT NULL DEFAULT 0,
    cross_tenant_listings_enabled TINYINT(1) NOT NULL DEFAULT 0,
    cross_tenant_events_enabled TINYINT(1) NOT NULL DEFAULT 0,
    cross_tenant_groups_enabled TINYINT(1) NOT NULL DEFAULT 0,

    -- Emergency lockdown
    emergency_lockdown_active TINYINT(1) NOT NULL DEFAULT 0,
    emergency_lockdown_reason TEXT NULL,
    emergency_lockdown_at TIMESTAMP NULL,
    emergency_lockdown_by INT UNSIGNED NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL,
    updated_by INT UNSIGNED NULL
);
```

### federation_tenant_whitelist

Tenants approved for federation (when whitelist mode is active).

```sql
CREATE TABLE federation_tenant_whitelist (
    tenant_id INT UNSIGNED PRIMARY KEY,
    approved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_by INT UNSIGNED NOT NULL,
    notes VARCHAR(500) NULL,

    INDEX idx_approved_at (approved_at)
);
```

### federation_tenant_features

Per-tenant feature toggles.

```sql
CREATE TABLE federation_tenant_features (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT UNSIGNED NOT NULL,
    feature_key VARCHAR(100) NOT NULL,
    is_enabled TINYINT(1) NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by INT UNSIGNED NULL,

    UNIQUE KEY unique_tenant_feature (tenant_id, feature_key),
    INDEX idx_tenant (tenant_id)
);
```

**Feature Keys:**
- `tenant_federation_enabled` - Master enable for tenant
- `tenant_appear_in_directory` - Show in federation directory
- `tenant_auto_accept_hierarchy` - Auto-accept from parent/child tenants
- `tenant_profiles_enabled` - Allow cross-tenant profiles
- `tenant_messaging_enabled` - Allow cross-tenant messaging
- `tenant_transactions_enabled` - Allow cross-tenant transactions
- `tenant_listings_enabled` - Allow cross-tenant listing visibility
- `tenant_events_enabled` - Allow cross-tenant event visibility
- `tenant_groups_enabled` - Allow cross-tenant group membership

### federation_partnerships

Relationships between tenants.

```sql
CREATE TABLE federation_partnerships (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT UNSIGNED NOT NULL,
    partner_tenant_id INT UNSIGNED NOT NULL,

    -- Status lifecycle
    status ENUM('pending', 'active', 'suspended', 'terminated') NOT NULL DEFAULT 'pending',
    federation_level TINYINT UNSIGNED NOT NULL DEFAULT 1,

    -- Feature permissions (per-partnership override)
    profiles_enabled TINYINT(1) DEFAULT 1,
    messaging_enabled TINYINT(1) DEFAULT 0,
    transactions_enabled TINYINT(1) DEFAULT 0,
    listings_enabled TINYINT(1) DEFAULT 0,
    events_enabled TINYINT(1) DEFAULT 0,
    groups_enabled TINYINT(1) DEFAULT 0,

    -- Request tracking
    requested_at TIMESTAMP NULL,
    requested_by INT UNSIGNED NULL,
    notes TEXT NULL,

    -- Approval tracking
    approved_at TIMESTAMP NULL,
    approved_by INT UNSIGNED NULL,

    -- Counter-proposal support
    counter_proposed_at TIMESTAMP NULL,
    counter_proposed_by INT UNSIGNED NULL,
    counter_proposal_message TEXT NULL,
    counter_proposed_level TINYINT UNSIGNED NULL,
    counter_proposed_permissions JSON NULL,

    -- Termination tracking
    terminated_at TIMESTAMP NULL,
    terminated_by INT UNSIGNED NULL,
    termination_reason VARCHAR(500) NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL,

    UNIQUE KEY unique_partnership (tenant_id, partner_tenant_id),
    INDEX idx_status (status),
    INDEX idx_partner (partner_tenant_id)
);
```

### federation_user_settings

Per-user federation preferences.

```sql
CREATE TABLE federation_user_settings (
    user_id INT UNSIGNED PRIMARY KEY,

    -- Master opt-in
    federation_optin TINYINT(1) NOT NULL DEFAULT 0,
    opted_in_at TIMESTAMP NULL,

    -- Visibility settings
    profile_visible_federated TINYINT(1) DEFAULT 0,
    appear_in_federated_search TINYINT(1) DEFAULT 0,
    show_skills_federated TINYINT(1) DEFAULT 0,
    show_location_federated TINYINT(1) DEFAULT 0,

    -- Feature toggles
    messaging_enabled_federated TINYINT(1) DEFAULT 0,
    transactions_enabled_federated TINYINT(1) DEFAULT 0,

    -- Service reach preference
    service_reach ENUM('local_only', 'remote_ok', 'travel_ok') DEFAULT 'local_only',
    travel_radius_km INT UNSIGNED NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL
);
```

### federation_messages

Cross-tenant messaging.

```sql
CREATE TABLE federation_messages (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    -- Sender/receiver (cross-tenant)
    sender_tenant_id INT UNSIGNED NOT NULL,
    sender_user_id INT UNSIGNED NOT NULL,
    receiver_tenant_id INT UNSIGNED NOT NULL,
    receiver_user_id INT UNSIGNED NOT NULL,

    -- Content
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,

    -- Direction and status
    direction ENUM('inbound', 'outbound') NOT NULL,
    status ENUM('unread', 'read', 'delivered') NOT NULL DEFAULT 'unread',
    read_at TIMESTAMP NULL,

    -- External partner support
    external_partner_id INT UNSIGNED NULL,
    external_receiver_name VARCHAR(255) NULL,
    external_message_id VARCHAR(255) NULL,

    -- Threading
    reference_message_id BIGINT UNSIGNED NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_receiver (receiver_tenant_id, receiver_user_id, direction),
    INDEX idx_sender (sender_tenant_id, sender_user_id, direction),
    INDEX idx_status (status)
);
```

### federation_transactions

Cross-tenant time credit transfers.

```sql
CREATE TABLE federation_transactions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    -- Parties
    sender_user_id INT UNSIGNED NOT NULL,
    sender_tenant_id INT UNSIGNED NOT NULL,
    receiver_user_id INT UNSIGNED NOT NULL,
    receiver_tenant_id INT UNSIGNED NOT NULL,

    -- Transaction details
    amount DECIMAL(10,2) NOT NULL,
    description VARCHAR(500) NOT NULL,
    status ENUM('pending', 'completed', 'failed', 'reversed') NOT NULL DEFAULT 'pending',

    -- Local transaction references (in each tenant)
    sender_transaction_id BIGINT UNSIGNED NULL,
    receiver_transaction_id BIGINT UNSIGNED NULL,

    -- External partner support
    external_partner_id INT UNSIGNED NULL,
    external_sender_name VARCHAR(255) NULL,
    external_message_id VARCHAR(255) NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,

    INDEX idx_sender (sender_tenant_id, sender_user_id),
    INDEX idx_receiver (receiver_tenant_id, receiver_user_id),
    INDEX idx_status (status)
);
```

### federation_api_keys

API keys for external partners.

```sql
CREATE TABLE federation_api_keys (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT UNSIGNED NOT NULL,

    -- Key identification
    name VARCHAR(100) NOT NULL,
    platform_id VARCHAR(100) NULL UNIQUE,
    api_key_hash VARCHAR(64) NOT NULL,

    -- HMAC signing (for webhook verification)
    signing_secret VARCHAR(64) NULL,

    -- Permissions (JSON array of scopes)
    permissions JSON NULL,

    -- Status
    status ENUM('active', 'revoked', 'expired') NOT NULL DEFAULT 'active',
    last_used_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT UNSIGNED NOT NULL,

    INDEX idx_tenant (tenant_id),
    INDEX idx_status (status)
);
```

### federation_audit_log

Comprehensive audit trail.

```sql
CREATE TABLE federation_audit_log (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    -- Action classification
    action_type VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    level ENUM('debug', 'info', 'warning', 'critical') NOT NULL DEFAULT 'info',

    -- Tenant context
    source_tenant_id INT UNSIGNED NULL,
    target_tenant_id INT UNSIGNED NULL,

    -- Actor info
    actor_user_id INT UNSIGNED NULL,
    actor_name VARCHAR(200) NULL,
    actor_email VARCHAR(255) NULL,

    -- Additional context
    data JSON NULL,

    -- Request metadata
    ip_address VARCHAR(45) NULL,
    user_agent VARCHAR(500) NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_action_type (action_type),
    INDEX idx_category (category),
    INDEX idx_level (level),
    INDEX idx_source_tenant (source_tenant_id),
    INDEX idx_target_tenant (target_tenant_id),
    INDEX idx_created_at (created_at)
);
```

---

## Core Services

### FederationGateway

The central "kill switch controller" that wraps ALL cross-tenant operations.

**Key Methods:**

```csharp
public interface IFederationGateway
{
    // Permission checks - return {allowed, reason, level}
    Task<FederationPermissionResult> CanViewProfileAsync(
        int viewerId, int viewerTenantId,
        int targetId, int targetTenantId);

    Task<FederationPermissionResult> CanSendMessageAsync(
        int senderId, int senderTenantId,
        int receiverId, int receiverTenantId);

    Task<FederationPermissionResult> CanPerformTransactionAsync(
        int senderId, int senderTenantId,
        int receiverId, int receiverTenantId,
        decimal amount);

    Task<FederationPermissionResult> CanViewListingsAsync(
        int viewerId, int viewerTenantId,
        int targetTenantId);

    Task<FederationPermissionResult> CanViewEventsAsync(
        int viewerId, int viewerTenantId,
        int targetTenantId);

    Task<FederationPermissionResult> CanJoinGroupAsync(
        int userId, int userTenantId,
        int groupId, int groupTenantId);
}
```

**Permission Check Flow:**

```csharp
public async Task<FederationPermissionResult> CanViewProfileAsync(...)
{
    // 1. Check system-level
    var systemCheck = await _featureService.IsOperationAllowedAsync("profiles", viewerTenantId);
    if (!systemCheck.Allowed) return systemCheck;

    // 2. Check target tenant allows inbound
    var targetCheck = await _featureService.IsOperationAllowedAsync("profiles", targetTenantId);
    if (!targetCheck.Allowed) return targetCheck;

    // 3. Check partnership exists and is active with profiles enabled
    var partnership = await _partnershipService.GetPartnershipAsync(viewerTenantId, targetTenantId);
    if (partnership?.Status != PartnershipStatus.Active)
        return new FederationPermissionResult(false, "No active partnership", "partnership");

    if (!partnership.ProfilesEnabled)
        return new FederationPermissionResult(false, "Profiles not enabled for this partnership", "partnership");

    // 4. Check target user settings
    var targetSettings = await _userService.GetUserSettingsAsync(targetId);
    if (!targetSettings.FederationOptin)
        return new FederationPermissionResult(false, "User has not opted into federation", "user");

    if (!targetSettings.ProfileVisibleFederated)
        return new FederationPermissionResult(false, "User profile is not visible to federated members", "user");

    return new FederationPermissionResult(true, null);
}
```

### FederationFeatureService

Manages system and tenant-level feature toggles.

**Key Methods:**

```csharp
public interface IFederationFeatureService
{
    // System controls
    Task<FederationSystemControls> GetSystemControlsAsync();
    bool IsGloballyEnabled();
    bool IsEmergencyLockdownActive();
    bool IsWhitelistModeActive();
    Task<bool> IsTenantWhitelistedAsync(int tenantId);

    // Feature checks
    Task<bool> IsSystemFeatureEnabledAsync(string feature);
    Task<bool> IsTenantFeatureEnabledAsync(string feature, int tenantId);
    Task<FederationPermissionResult> IsOperationAllowedAsync(string operation, int tenantId);

    // Emergency controls
    Task TriggerEmergencyLockdownAsync(int adminId, string reason);
    Task LiftEmergencyLockdownAsync(int adminId);

    // Whitelist management
    Task AddToWhitelistAsync(int tenantId, int adminId, string? notes);
    Task RemoveFromWhitelistAsync(int tenantId, int adminId);
}
```

### FederationPartnershipService

Manages partnerships between tenants.

**Partnership Statuses:**
- `pending` - Request sent, awaiting approval
- `active` - Partnership is live
- `suspended` - Temporarily disabled (can be reactivated)
- `terminated` - Permanently ended

**Federation Levels:**
1. **Discovery** - Can see tenant exists, view basic profiles
2. **Social** - Can message and view listings/events
3. **Economic** - Can exchange time credits
4. **Integrated** - Full integration including groups

**Default Permissions by Level:**

| Level | Profiles | Messaging | Transactions | Listings | Events | Groups |
|-------|----------|-----------|--------------|----------|--------|--------|
| 1     | ✓        |           |              |          |        |        |
| 2     | ✓        | ✓         |              | ✓        | ✓      |        |
| 3     | ✓        | ✓         | ✓            | ✓        | ✓      |        |
| 4     | ✓        | ✓         | ✓            | ✓        | ✓      | ✓      |

**Key Methods:**

```csharp
public interface IFederationPartnershipService
{
    // Request lifecycle
    Task<Result> RequestPartnershipAsync(
        int requestingTenantId, int targetTenantId,
        int requestedBy, int federationLevel, string? notes);

    Task<Result> ApprovePartnershipAsync(
        int partnershipId, int approvedBy, Dictionary<string, bool>? permissions);

    Task<Result> CounterProposeAsync(
        int partnershipId, int proposedBy, int newLevel,
        Dictionary<string, bool>? proposedPermissions, string? message);

    Task<Result> AcceptCounterProposalAsync(int partnershipId, int acceptedBy);
    Task<Result> RejectPartnershipAsync(int partnershipId, int rejectedBy, string? reason);

    // Status changes
    Task<Result> SuspendPartnershipAsync(int partnershipId, int suspendedBy, string? reason);
    Task<Result> ReactivatePartnershipAsync(int partnershipId, int reactivatedBy);
    Task<Result> TerminatePartnershipAsync(int partnershipId, int terminatedBy, string? reason);

    // Permission management
    Task<Result> UpdatePermissionsAsync(
        int partnershipId, Dictionary<string, bool> permissions, int updatedBy);

    // Queries
    Task<Partnership?> GetPartnershipAsync(int tenantId1, int tenantId2);
    Task<List<Partnership>> GetTenantPartnershipsAsync(int tenantId, string? status);
    Task<List<Partnership>> GetPendingRequestsAsync(int tenantId);
    Task<PartnershipStats> GetStatsAsync();
}
```

### FederatedTransactionService

Handles cross-tenant time credit transfers.

**Transaction Flow:**

1. Validate all permission layers
2. Check sender has sufficient balance
3. Begin database transaction
4. Deduct from sender's balance (local transaction)
5. Credit to receiver's balance (local transaction)
6. Create federation_transactions record
7. Commit and send notifications

**Key Methods:**

```csharp
public interface IFederatedTransactionService
{
    Task<Result<int>> CreateTransactionAsync(
        int senderId, int senderTenantId,
        int receiverId, int receiverTenantId,
        decimal amount, string description);

    Task<List<FederatedTransaction>> GetHistoryAsync(
        int tenantId, int? userId = null,
        DateTime? since = null, int limit = 50);

    Task<FederatedTransactionStats> GetStatsAsync(int tenantId, int? userId = null);
}
```

**Amount Limits:**
- Minimum: 0.01 hours
- Maximum: 100 hours per transaction

### FederatedMessageService

Handles cross-tenant messaging.

**Message Flow:**

1. Validate all permission layers
2. Create outbound message record (sender's side)
3. Create inbound message record (receiver's side)
4. Log to audit
5. Send email notification (async)
6. Send real-time notification via Pusher (async)
7. Create in-app notification

**Key Methods:**

```csharp
public interface IFederatedMessageService
{
    Task<Result<int>> SendMessageAsync(
        int senderId, int receiverId, int receiverTenantId,
        string subject, string body);

    Task<List<FederatedConversation>> GetInboxAsync(
        int userId, int limit = 50, int offset = 0);

    Task<List<FederatedMessage>> GetThreadAsync(
        int userId, int otherUserId, int otherTenantId, int limit = 100);

    Task<bool> MarkAsReadAsync(int messageId, int userId);
    Task<int> MarkThreadAsReadAsync(int userId, int otherUserId, int otherTenantId);
    Task<int> GetUnreadCountAsync(int userId);
}
```

### FederationUserService

Manages individual user federation settings.

**Service Reach Options:**
- `local_only` - Only available locally
- `remote_ok` - Can work remotely
- `travel_ok` - Can travel (with radius)

**Key Methods:**

```csharp
public interface IFederationUserService
{
    Task<FederationUserSettings> GetUserSettingsAsync(int userId);
    Task<bool> UpdateSettingsAsync(int userId, FederationUserSettings settings);
    Task<bool> HasOptedInAsync(int userId);
    Task<bool> OptOutAsync(int userId);
    Task<List<FederatedUser>> GetFederatedUsersAsync(int tenantId, FederatedUserFilters? filters);
    Task<bool> IsFederationAvailableForUserAsync(int userId);
    Task<FederatedReviews> GetFederatedReviewsAsync(int userId, int viewerTenantId, int limit = 5);
    Task<TrustScore> GetTrustScoreAsync(int userId);
}
```

### FederationAuditService

Comprehensive audit logging for all federation operations.

**Log Levels:**
- `debug` - Search queries, profile views
- `info` - Messages, transactions, settings changes
- `warning` - Suspensions, permission changes
- `critical` - Emergency lockdowns, security events

**Categories:**
- `system` - Emergency lockdowns, feature toggles
- `tenant` - Tenant federation settings
- `partnership` - Partnership requests/approvals
- `profile` - Profile visibility
- `messaging` - Cross-tenant messages
- `transaction` - Cross-tenant exchanges
- `listing` - Listing visibility
- `event` - Event sharing
- `group` - Group federation
- `search` - Federated searches

**Key Methods:**

```csharp
public interface IFederationAuditService
{
    Task<bool> LogAsync(
        string actionType,
        int? sourceTenantId,
        int? targetTenantId,
        int? actorUserId,
        Dictionary<string, object>? data = null,
        string level = "info");

    Task LogSearchAsync(string searchType, object filters, int resultsCount, int? actorUserId);
    Task LogProfileViewAsync(int viewerId, int viewerTenantId, int viewedId, int viewedTenantId);
    Task LogMessageAsync(int senderId, int senderTenantId, int recipientId, int recipientTenantId, int? messageId);
    Task LogTransactionAsync(int initiatorId, int initiatorTenantId, int counterpartyId, int counterpartyTenantId, int txId, string txType, decimal amount);

    Task<List<AuditLogEntry>> GetLogAsync(AuditLogFilters filters);
    Task<AuditStats> GetStatsAsync(int days = 30);
    Task<List<AuditLogEntry>> GetRecentCriticalAsync(int limit = 10);
    Task<int> PurgeOldAsync(int retentionDays = 365);
}
```

---

## API Endpoints

### External Federation API

Base URL: `/api/v1/federation`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | No | API info and available endpoints |
| GET | `/timebanks` | Yes | List partner timebanks |
| GET | `/members` | Yes | Search federated members |
| GET | `/members/{id}` | Yes | Get member profile |
| GET | `/listings` | Yes | Search federated listings |
| GET | `/listings/{id}` | Yes | Get listing details |
| POST | `/messages` | Yes | Send federated message |
| POST | `/transactions` | Yes | Initiate time credit transfer |
| POST | `/oauth/token` | No | OAuth token endpoint |
| POST | `/webhooks/test` | Yes | Test webhook signature |

### Query Parameters

**Search Members:**
- `q` - Search query (name, skills)
- `timebank_id` - Filter by specific timebank
- `skills` - Comma-separated skill tags
- `location` - City/region filter
- `page`, `per_page` - Pagination

**Search Listings:**
- `q` - Search query
- `type` - offer|request
- `timebank_id` - Filter by timebank
- `category` - Category filter
- `page`, `per_page` - Pagination

---

## Authentication Methods

The Federation API supports three authentication methods:

### 1. JWT Bearer Token (Primary)

```http
Authorization: Bearer <jwt>
```

**JWT Claims:**
- `iss` - Issuer (timebank domain)
- `sub` - Partner/platform ID
- `aud` - Target tenant ID
- `iat` - Issued at (Unix timestamp)
- `exp` - Expiration (Unix timestamp)
- `tenant_id` - Source tenant ID
- `scope` - Array of granted permissions

**Token Lifetime:** 1 hour (default), 24 hours (maximum)

### 2. HMAC-SHA256 Signing (Highest Security)

```http
X-Federation-Platform-ID: <partner_id>
X-Federation-Timestamp: <ISO8601_or_unix_timestamp>
X-Federation-Signature: <hmac_signature>
```

**Signature Generation:**
```
string_to_sign = METHOD + "\n" + PATH + "\n" + TIMESTAMP + "\n" + BODY
signature = HMAC-SHA256(string_to_sign, signing_secret)
```

**Validation Rules:**
- Timestamp must be within 5 minutes (prevents replay attacks)
- Signature verified with timing-safe comparison

### 3. API Key (Simple)

Locations checked in order:
1. `Authorization: Bearer <key>`
2. `X-API-Key` header
3. `?api_key=<key>` query param (testing only)

**Storage:** SHA256 hash in `federation_api_keys` table

### OAuth Token Endpoint

```http
POST /api/v1/federation/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
&client_id=<platform_id>
&client_secret=<signing_secret>
&scope=members:read listings:read
```

**Response:**
```json
{
  "access_token": "<jwt>",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "members:read listings:read"
}
```

---

## Permission System

### Permission Scopes

| Scope | Description |
|-------|-------------|
| `timebanks:read` | List partner timebanks |
| `members:read` | Search and view member profiles |
| `listings:read` | Search and view listings |
| `messages:read` | Read federated messages |
| `messages:write` | Send federated messages |
| `transactions:read` | View transaction history |
| `transactions:write` | Initiate transactions |

### External vs Internal Partners

The API behaves differently based on partner type:

**External Partners** (have `platform_id`):
- Get members/listings FROM the tenant that issued the API key
- Used for integrations with external timebanking networks

**Internal Partners** (other tenants):
- Get members/listings from all partnered tenants via `federation_partnerships`
- Used for tenant-to-tenant federation

---

## User Settings

### Available Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `federation_optin` | bool | false | Master opt-in for all federation |
| `profile_visible_federated` | bool | false | Profile visible to partners |
| `appear_in_federated_search` | bool | false | Show in federated search |
| `messaging_enabled_federated` | bool | false | Accept federated messages |
| `transactions_enabled_federated` | bool | false | Accept federated transactions |
| `show_skills_federated` | bool | false | Show skills to partners |
| `show_location_federated` | bool | false | Show location to partners |
| `service_reach` | enum | local_only | Service availability |
| `travel_radius_km` | int? | null | Travel radius if service_reach=travel_ok |

### Trust Score System

Combines multiple factors (0-100 score):

| Component | Max Points | Calculation |
|-----------|------------|-------------|
| Reviews | 40 | (avg_rating/5)*30 + min(count/10,1)*10 |
| Transactions | 40 | completion_rate*25 + min(count/20,1)*15 |
| Federation Bonus | 20 | min(cross_tenant_activity/5,1)*20 |

**Trust Levels:**
- `excellent` - 80+
- `trusted` - 60-79
- `established` - 40-59
- `growing` - 20-39
- `new` - 0-19

---

## Implementation Recommendations

### ASP.NET Core Architecture

```
Nexus.Api/
  Controllers/
    V2/Federation/
      FederationController.cs       # API endpoints
      PartnershipsController.cs     # Partnership management
      SettingsController.cs         # User settings

Nexus.Application/
  Features/Federation/
    Commands/
      RequestPartnershipCommand.cs
      ApprovePartnershipCommand.cs
      SendFederatedMessageCommand.cs
      CreateFederatedTransactionCommand.cs
    Queries/
      GetFederatedMembersQuery.cs
      GetFederatedListingsQuery.cs
      GetPartnershipStatusQuery.cs

Nexus.Domain/
  Entities/
    FederationPartnership.cs
    FederationUserSettings.cs
    FederatedMessage.cs
    FederatedTransaction.cs
    FederationApiKey.cs
    FederationAuditLog.cs

  Services/
    IFederationGateway.cs
    IFederationFeatureService.cs
    IFederationPartnershipService.cs
    IFederatedMessageService.cs
    IFederatedTransactionService.cs
    IFederationUserService.cs
    IFederationAuditService.cs
    IFederationJwtService.cs

Nexus.Infrastructure/
  Services/
    FederationGateway.cs
    FederationFeatureService.cs
    FederationPartnershipService.cs
    ...

  Authentication/
    FederationAuthenticationHandler.cs
    FederationApiMiddleware.cs
```

### Authentication Handler

```csharp
public class FederationAuthenticationHandler : AuthenticationHandler<FederationAuthOptions>
{
    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        // Try HMAC first (highest security)
        if (TryValidateHmac(out var hmacResult))
            return hmacResult;

        // Try JWT
        if (TryValidateJwt(out var jwtResult))
            return jwtResult;

        // Try API Key
        if (TryValidateApiKey(out var apiKeyResult))
            return apiKeyResult;

        return AuthenticateResult.NoResult();
    }
}
```

### Caching Strategy

Use distributed cache (Redis) for:
- System controls (5 minute TTL)
- Tenant feature flags (5 minute TTL)
- Whitelist status (5 minute TTL)
- Partnership status (1 minute TTL)
- User settings (1 minute TTL)

### Background Jobs (Hangfire)

| Job | Schedule | Purpose |
|-----|----------|---------|
| `FederationAuditPurge` | Daily | Purge old audit logs (365 days retention) |
| `FederationStatsAggregate` | Hourly | Aggregate federation statistics |
| `FederationHealthCheck` | Every 5 min | Check partnership health, send alerts |

### Feature Flags Configuration

```csharp
// appsettings.json
{
  "Federation": {
    "Enabled": false,
    "WhitelistMode": true,
    "MaxLevel": 0,
    "Features": {
      "Profiles": false,
      "Messaging": false,
      "Transactions": false,
      "Listings": false,
      "Events": false,
      "Groups": false
    },
    "Jwt": {
      "Secret": "...",
      "Issuer": "nexus",
      "TokenLifetimeMinutes": 60,
      "MaxTokenLifetimeMinutes": 1440
    }
  }
}
```

### Notifications Integration

Federation events should trigger:
1. In-app notifications (via existing notification system)
2. Email notifications (for partnership requests/approvals)
3. Real-time notifications (via Pusher for messages)
4. Push notifications (for new federated messages)

---

## Migration Priority

**Recommended Order:**

1. Database schema (all federation tables)
2. FederationFeatureService (system/tenant flags)
3. FederationUserService (user settings)
4. FederationPartnershipService (partnership management)
5. FederationGateway (central permission checks)
6. FederationAuditService (logging)
7. FederatedMessageService (cross-tenant messaging)
8. FederatedTransactionService (cross-tenant transfers)
9. FederationApiController (external API)
10. FederationJwtService (API authentication)

**Estimated Endpoints:** 25-30 endpoints
**Estimated Effort:** 4-6 weeks
