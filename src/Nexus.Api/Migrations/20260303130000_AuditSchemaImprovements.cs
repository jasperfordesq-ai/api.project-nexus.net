// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Nexus.Api.Migrations
{
    /// <summary>
    /// Applies schema improvements identified during the platform audit:
    /// - New indexes on Listing, Conversation, Message, Group, Event, FeedPost, EventRsvp, Notification
    /// - Composite covering indexes for common query patterns
    /// - Unique constraints on RefreshToken.TokenHash and PasswordResetToken.TokenHash
    /// - Check constraint: Transaction.Amount > 0
    /// </summary>
    public partial class AuditSchemaImprovements : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ── Listings ─────────────────────────────────────────────────────────
            // Index on CreatedAt for sort-by-newest queries
            migrationBuilder.CreateIndex(
                name: "IX_listings_CreatedAt",
                table: "listings",
                column: "CreatedAt");

            // Composite covering index for the main listing feed: tenant + status + newest-first sort
            migrationBuilder.CreateIndex(
                name: "IX_listings_TenantId_Status_CreatedAt",
                table: "listings",
                columns: new[] { "TenantId", "Status", "CreatedAt" });

            // ── Conversations ─────────────────────────────────────────────────────
            // Index on UpdatedAt so conversations can be sorted by most recently active
            migrationBuilder.CreateIndex(
                name: "IX_conversations_UpdatedAt",
                table: "conversations",
                column: "UpdatedAt");

            // ── Messages ──────────────────────────────────────────────────────────
            // Composite covering index for paginated message loads (conversation + chronological)
            migrationBuilder.CreateIndex(
                name: "IX_messages_ConversationId_CreatedAt",
                table: "messages",
                columns: new[] { "ConversationId", "CreatedAt" });

            // ── Refresh Tokens ────────────────────────────────────────────────────
            // Enforce uniqueness on token hash — a token can only be used once
            migrationBuilder.DropIndex(
                name: "IX_refresh_tokens_TokenHash",
                table: "refresh_tokens");

            migrationBuilder.CreateIndex(
                name: "IX_refresh_tokens_TokenHash",
                table: "refresh_tokens",
                column: "TokenHash",
                unique: true);

            // ── Password Reset Tokens ─────────────────────────────────────────────
            // Same — each generated token is unique
            migrationBuilder.DropIndex(
                name: "IX_password_reset_tokens_TokenHash",
                table: "password_reset_tokens");

            migrationBuilder.CreateIndex(
                name: "IX_password_reset_tokens_TokenHash",
                table: "password_reset_tokens",
                column: "TokenHash",
                unique: true);

            // ── Groups ────────────────────────────────────────────────────────────
            // Index on IsPrivate for "list public groups" filter
            migrationBuilder.CreateIndex(
                name: "IX_groups_IsPrivate",
                table: "groups",
                column: "IsPrivate");

            // Composite for tenant-scoped group listings ordered by newest
            migrationBuilder.CreateIndex(
                name: "IX_groups_TenantId_CreatedAt",
                table: "groups",
                columns: new[] { "TenantId", "CreatedAt" });

            // ── Events ────────────────────────────────────────────────────────────
            // Index on EndsAt to support "find ongoing events" queries
            migrationBuilder.CreateIndex(
                name: "IX_events_EndsAt",
                table: "events",
                column: "EndsAt");

            // Composite for the common event listing query (upcoming, non-cancelled, per tenant)
            migrationBuilder.CreateIndex(
                name: "IX_events_TenantId_StartsAt_IsCancelled",
                table: "events",
                columns: new[] { "TenantId", "StartsAt", "IsCancelled" });

            // ── Event RSVPs ───────────────────────────────────────────────────────
            // Index on RespondedAt for time-based RSVP queries
            migrationBuilder.CreateIndex(
                name: "IX_event_rsvps_RespondedAt",
                table: "event_rsvps",
                column: "RespondedAt");

            // ── Feed Posts ────────────────────────────────────────────────────────
            // Composite for feed ordering: pinned-first, then newest, per tenant
            migrationBuilder.CreateIndex(
                name: "IX_feed_posts_TenantId_IsPinned_CreatedAt",
                table: "feed_posts",
                columns: new[] { "TenantId", "IsPinned", "CreatedAt" });

            // ── Notifications ─────────────────────────────────────────────────────
            // Composite covering index for the primary notifications query: unread for user, sorted by date
            migrationBuilder.CreateIndex(
                name: "IX_notifications_UserId_IsRead_CreatedAt",
                table: "notifications",
                columns: new[] { "UserId", "IsRead", "CreatedAt" });

            // ── Transactions ──────────────────────────────────────────────────────
            // Enforce that credit transfers always have a positive amount
            migrationBuilder.Sql(
                "ALTER TABLE transactions ADD CONSTRAINT \"CK_transactions_amount_positive\" CHECK (\"Amount\" > 0);");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Remove check constraint
            migrationBuilder.Sql(
                "ALTER TABLE transactions DROP CONSTRAINT \"CK_transactions_amount_positive\";");

            // Remove notification composite index
            migrationBuilder.DropIndex(
                name: "IX_notifications_UserId_IsRead_CreatedAt",
                table: "notifications");

            // Remove feed post composite index
            migrationBuilder.DropIndex(
                name: "IX_feed_posts_TenantId_IsPinned_CreatedAt",
                table: "feed_posts");

            // Remove event RSVP index
            migrationBuilder.DropIndex(
                name: "IX_event_rsvps_RespondedAt",
                table: "event_rsvps");

            // Remove event indexes
            migrationBuilder.DropIndex(
                name: "IX_events_TenantId_StartsAt_IsCancelled",
                table: "events");

            migrationBuilder.DropIndex(
                name: "IX_events_EndsAt",
                table: "events");

            // Remove group indexes
            migrationBuilder.DropIndex(
                name: "IX_groups_TenantId_CreatedAt",
                table: "groups");

            migrationBuilder.DropIndex(
                name: "IX_groups_IsPrivate",
                table: "groups");

            // Revert password reset token hash back to non-unique
            migrationBuilder.DropIndex(
                name: "IX_password_reset_tokens_TokenHash",
                table: "password_reset_tokens");

            migrationBuilder.CreateIndex(
                name: "IX_password_reset_tokens_TokenHash",
                table: "password_reset_tokens",
                column: "TokenHash");

            // Revert refresh token hash back to non-unique
            migrationBuilder.DropIndex(
                name: "IX_refresh_tokens_TokenHash",
                table: "refresh_tokens");

            migrationBuilder.CreateIndex(
                name: "IX_refresh_tokens_TokenHash",
                table: "refresh_tokens",
                column: "TokenHash");

            // Remove message composite index
            migrationBuilder.DropIndex(
                name: "IX_messages_ConversationId_CreatedAt",
                table: "messages");

            // Remove conversation index
            migrationBuilder.DropIndex(
                name: "IX_conversations_UpdatedAt",
                table: "conversations");

            // Remove listing indexes
            migrationBuilder.DropIndex(
                name: "IX_listings_TenantId_Status_CreatedAt",
                table: "listings");

            migrationBuilder.DropIndex(
                name: "IX_listings_CreatedAt",
                table: "listings");
        }
    }
}
