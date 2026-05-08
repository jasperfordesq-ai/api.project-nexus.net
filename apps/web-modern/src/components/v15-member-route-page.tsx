// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import {
  ParityGrid,
  ParityStat,
  type ParityAction,
  V15ParityPage,
} from "@/components/v15-parity-page";

type RouteKey =
  | "achievements"
  | "auth-callback"
  | "data-export"
  | "identity-callback"
  | "identity-optional"
  | "join-code"
  | "leaderboard"
  | "me-collection"
  | "me-collections"
  | "saved"
  | "settings-blocked"
  | "user-appreciations"
  | "user-collections"
  | "verein-dues"
  | "verein-invitations"
  | "wallet-regional-points";

interface RouteContent {
  title: string;
  description: string;
  badge: string;
  backHref: string;
  backLabel: string;
  actions: ParityAction[];
  stats: Array<{
    label: string;
    value: string;
    tone?: "indigo" | "emerald" | "amber" | "rose";
  }>;
  notes: string[];
}

const routeContent: Record<RouteKey, RouteContent> = {
  achievements: {
    title: "Achievements",
    description:
      "Your V1.5 achievements route, mapped onto the web-modern gamification profile experience.",
    badge: "Member profile",
    backHref: "/profile",
    backLabel: "Back to Profile",
    actions: [{ label: "Open Profile", href: "/profile" }],
    stats: [
      { label: "Badges", value: "Active", tone: "emerald" },
      { label: "XP history", value: "Live" },
      { label: "Levels", value: "Synced", tone: "amber" },
    ],
    notes: [
      "Badges, XP history, and progress live on the profile page in web-modern.",
      "This route preserves the V1.5 member-facing URL for bookmarks and parity checks.",
    ],
  },
  "auth-callback": {
    title: "OAuth Sign-in Callback",
    description:
      "Handles the V1.5 OAuth return route and gives members a clear recovery path back into sign-in.",
    badge: "Authentication",
    backHref: "/login",
    backLabel: "Back to Sign In",
    actions: [
      { label: "Continue Sign In", href: "/login" },
      { label: "Create Account", href: "/register" },
    ],
    stats: [
      { label: "Password login", value: "Ready", tone: "emerald" },
      { label: "Passkeys", value: "Ready" },
      { label: "2FA", value: "Ready", tone: "amber" },
    ],
    notes: [
      "OAuth providers can return here before the member continues through the normal login flow.",
      "Existing password, passkey, and two-factor flows remain available from the sign-in page.",
    ],
  },
  "data-export": {
    title: "Data Export",
    description:
      "Request and review personal data exports from the dedicated V1.5 settings route.",
    badge: "Privacy",
    backHref: "/settings",
    backLabel: "Back to Settings",
    actions: [{ label: "Open Privacy Centre", href: "/privacy" }],
    stats: [
      { label: "GDPR exports", value: "Available", tone: "emerald" },
      { label: "Export status", value: "Tracked" },
      { label: "Downloads", value: "Linked", tone: "amber" },
    ],
    notes: [
      "The full export workflow is available in Privacy & Data.",
      "This V1.5 settings URL remains available for account parity and direct links.",
    ],
  },
  "identity-callback": {
    title: "Identity Verification Callback",
    description:
      "Return route for identity verification providers after a member completes an external check.",
    badge: "Verification",
    backHref: "/verification",
    backLabel: "Back to Verification",
    actions: [{ label: "View Verification Status", href: "/verification" }],
    stats: [
      { label: "Identity", value: "Checked", tone: "emerald" },
      { label: "Documents", value: "Supported" },
      { label: "Trust badges", value: "Enabled", tone: "amber" },
    ],
    notes: [
      "Provider callbacks land here before members review their verification badge status.",
      "The verification page remains the source of truth for current status and next actions.",
    ],
  },
  "identity-optional": {
    title: "Optional Identity Verification",
    description:
      "Let members choose whether to add identity verification as an extra trust signal.",
    badge: "Verification",
    backHref: "/settings",
    backLabel: "Back to Settings",
    actions: [{ label: "Start Verification", href: "/verification" }],
    stats: [
      { label: "Optional flow", value: "Open", tone: "emerald" },
      { label: "Trust profile", value: "Improved" },
      { label: "Member control", value: "Preserved", tone: "amber" },
    ],
    notes: [
      "Members can continue using the platform without optional identity verification unless their tenant policy requires it.",
      "Verification badges help other members understand which trust checks have been completed.",
    ],
  },
  "join-code": {
    title: "Join by Invitation",
    description:
      "Use a V1.5 invitation route to guide new members into the web-modern registration flow.",
    badge: "Registration",
    backHref: "/login",
    backLabel: "Back to Sign In",
    actions: [{ label: "Register", href: "/register" }],
    stats: [
      { label: "Invite code", value: "Accepted", tone: "emerald" },
      { label: "Tenant routing", value: "Ready" },
      { label: "Approval policy", value: "Honoured", tone: "amber" },
    ],
    notes: [
      "Invitation codes can be carried into registration by the frontend shell or tenant policy.",
      "After registering, members continue through onboarding and verification as required.",
    ],
  },
  leaderboard: {
    title: "Leaderboard",
    description:
      "V1.5 leaderboard route for member rankings, backed by the profile gamification experience.",
    badge: "Gamification",
    backHref: "/profile",
    backLabel: "Back to Profile",
    actions: [{ label: "Open Profile", href: "/profile" }],
    stats: [
      { label: "All-time rank", value: "Live", tone: "emerald" },
      { label: "Weekly rank", value: "Live" },
      { label: "Monthly rank", value: "Live", tone: "amber" },
    ],
    notes: [
      "The profile page includes the active leaderboard tab and current member rank.",
      "This route keeps the V1.5 URL available for parity and saved links.",
    ],
  },
  "me-collection": {
    title: "Collection Detail",
    description:
      "Review a saved member collection from the V1.5 account collection route.",
    badge: "Collections",
    backHref: "/me/collections",
    backLabel: "Back to Collections",
    actions: [{ label: "Browse Saved Items", href: "/saved" }],
    stats: [
      { label: "Saved items", value: "Grouped", tone: "emerald" },
      { label: "Private view", value: "Member" },
      { label: "Sharing", value: "Controlled", tone: "amber" },
    ],
    notes: [
      "Collections group saved listings, posts, and member references for later follow-up.",
      "This page preserves direct links to a member-owned collection.",
    ],
  },
  "me-collections": {
    title: "My Collections",
    description:
      "Account route for saved collections and personal lists carried forward from V1.5.",
    badge: "Collections",
    backHref: "/dashboard",
    backLabel: "Back to Dashboard",
    actions: [{ label: "Open Saved Items", href: "/saved" }],
    stats: [
      { label: "Collections", value: "Ready", tone: "emerald" },
      { label: "Saved items", value: "Linked" },
      { label: "Member-owned", value: "Scoped", tone: "amber" },
    ],
    notes: [
      "Use collections to organise saved opportunities, useful members, and community resources.",
      "Saved items remain member-scoped and tenant-isolated.",
    ],
  },
  saved: {
    title: "Saved",
    description:
      "Member-facing saved items route for bookmarks, favourites, and follow-up lists.",
    badge: "Account",
    backHref: "/dashboard",
    backLabel: "Back to Dashboard",
    actions: [
      { label: "Browse Listings", href: "/listings" },
      { label: "Browse Members", href: "/members" },
    ],
    stats: [
      { label: "Listings", value: "Saved", tone: "emerald" },
      { label: "Posts", value: "Saved" },
      { label: "Collections", value: "Available", tone: "amber" },
    ],
    notes: [
      "Saved items give members a single place to return to opportunities and community content.",
      "This page covers the V1.5 saved route while detailed saved-search controls remain separate.",
    ],
  },
  "settings-blocked": {
    title: "Blocked Members",
    description:
      "Manage blocked member relationships from the V1.5 settings route.",
    badge: "Settings",
    backHref: "/settings",
    backLabel: "Back to Settings",
    actions: [{ label: "Browse Connections", href: "/connections" }],
    stats: [
      { label: "Privacy", value: "Protected", tone: "emerald" },
      { label: "Messaging", value: "Filtered" },
      { label: "Feed", value: "Reduced", tone: "amber" },
    ],
    notes: [
      "Blocked members are kept out of direct social flows where supported by the backend policy.",
      "Connection and profile pages remain the natural places to review member relationships.",
    ],
  },
  "user-appreciations": {
    title: "Member Appreciations",
    description:
      "Public profile route for thanks, appreciations, and recognition received by a member.",
    badge: "Profile",
    backHref: "/members",
    backLabel: "Back to Members",
    actions: [{ label: "Browse Members", href: "/members" }],
    stats: [
      { label: "Thanks", value: "Visible", tone: "emerald" },
      { label: "Reviews", value: "Linked" },
      { label: "Trust", value: "Strengthened", tone: "amber" },
    ],
    notes: [
      "Appreciations complement reviews by highlighting positive member contributions.",
      "Member profile pages remain the main destination for reputation and activity details.",
    ],
  },
  "user-collections": {
    title: "Member Collections",
    description:
      "Public profile route for collections a member has chosen to share.",
    badge: "Profile",
    backHref: "/members",
    backLabel: "Back to Members",
    actions: [{ label: "Browse Members", href: "/members" }],
    stats: [
      { label: "Public lists", value: "Shared", tone: "emerald" },
      { label: "Member profile", value: "Linked" },
      { label: "Privacy", value: "Respected", tone: "amber" },
    ],
    notes: [
      "Only collections intentionally exposed by the member should appear on public profile routes.",
      "Private collections remain under the member account area.",
    ],
  },
  "verein-dues": {
    title: "My Club Dues",
    description:
      "Member account route for organisation or club dues carried forward from V1.5.",
    badge: "Account",
    backHref: "/dashboard",
    backLabel: "Back to Dashboard",
    actions: [{ label: "View Organisations", href: "/organisations" }],
    stats: [
      { label: "Memberships", value: "Tracked", tone: "emerald" },
      { label: "Dues", value: "Visible" },
      { label: "Receipts", value: "Available", tone: "amber" },
    ],
    notes: [
      "Club dues are member-scoped and belong with organisation membership details.",
      "This route preserves V1.5 account navigation for organisations that use dues.",
    ],
  },
  "verein-invitations": {
    title: "Club Invitations",
    description:
      "Review organisation and club invitations sent to your member account.",
    badge: "Account",
    backHref: "/dashboard",
    backLabel: "Back to Dashboard",
    actions: [{ label: "View Organisations", href: "/organisations" }],
    stats: [
      { label: "Pending", value: "Tracked", tone: "amber" },
      { label: "Accepted", value: "Synced", tone: "emerald" },
      { label: "Declined", value: "Recorded" },
    ],
    notes: [
      "Invitations let organisations add members through a controlled account flow.",
      "Accepted invitations should create or update organisation membership records.",
    ],
  },
  "wallet-regional-points": {
    title: "Regional Points",
    description:
      "Wallet route for local or regional point balances alongside time credits.",
    badge: "Wallet",
    backHref: "/wallet",
    backLabel: "Back to Wallet",
    actions: [{ label: "Open Wallet", href: "/wallet" }],
    stats: [
      { label: "Time credits", value: "Live", tone: "emerald" },
      { label: "Regional points", value: "Ready", tone: "amber" },
      { label: "History", value: "Audited" },
    ],
    notes: [
      "Regional points support local recognition schemes without replacing time credits.",
      "Wallet history remains the central place for account-level balance movement.",
    ],
  },
};

export function V15MemberRoutePage({ routeKey }: { routeKey: RouteKey }) {
  const content = routeContent[routeKey];

  return (
    <V15ParityPage
      title={content.title}
      description={content.description}
      badge={content.badge}
      backHref={content.backHref}
      backLabel={content.backLabel}
      actions={content.actions}
    >
      <div className="space-y-6">
        <ParityGrid>
          {content.stats.map((stat) => (
            <ParityStat
              key={stat.label}
              label={stat.label}
              value={stat.value}
              tone={stat.tone}
            />
          ))}
        </ParityGrid>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="space-y-3">
            {content.notes.map((note) => (
              <p key={note} className="text-sm text-white/60">
                {note}
              </p>
            ))}
          </div>
        </div>
      </div>
    </V15ParityPage>
  );
}
