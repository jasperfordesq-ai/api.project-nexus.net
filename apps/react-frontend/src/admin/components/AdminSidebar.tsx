// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Admin Sidebar Navigation — V1 redesign parity port
 *
 * Mirrors the V1 (PHP) admin sidebar redesign:
 *   - Dashboard at top (unzoned)
 *   - Pinned Broker Panel link (links to the dedicated /broker app)
 *   - Recent pages (localStorage, max 5)
 *   - 5 collapsible zones with accordion behavior:
 *        people / content_commerce / safety / growth / platform
 *     (zone label keys use V1 wording; visible labels are literal English)
 *   - Super Admin section at bottom (super-admin role only, unzoned)
 *
 * Caring Community module is intentionally excluded — see CLAUDE.md
 * "V1 Modules Explicitly Excluded From V2 Migration".
 */

import { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button, Input } from '@heroui/react';
import { useAuth, useTenant } from '@/contexts';
import { api } from '@/lib/api';
import { adminBroker } from '../api/adminApi';
import {
  LayoutDashboard,
  Users,
  ListChecks,
  Newspaper,
  Trophy,
  Megaphone,
  Sparkles,
  Coins,
  Building2,
  Globe,
  Settings,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
  UserCheck,
  FileText,
  Menu,
  FolderTree,
  Tags,
  Tag,
  Gamepad2,
  Medal,
  BarChart3,
  Zap,
  Target,
  Brain,
  Bot,
  Search,
  ArrowLeftRight,
  AlertTriangle,
  Clock,
  Wallet,
  CreditCard,
  Shield,
  Key,
  ShieldCheck,
  Heart,
  Cog,
  Timer,
  Contact,
  StickyNote,
  ClipboardList,
  Filter,
  Activity,
  Crown,
  Network,
  ScrollText,
  Mail,
  Wrench,
  Stethoscope,
  MessageSquare,
  MessageCircle,
  Star,
  Flag,
  UserX,
  DollarSign,
  Calendar,
  Lightbulb,
  Briefcase,
  BookOpen,
  Cpu,
  Handshake,
  Database,
  MapPin,
  FileSearch,
  Webhook,
  Puzzle,
  Palette,
  ShoppingBag,
  Store,
  Languages,
  X,
  BellRing,
  type LucideIcon,
} from 'lucide-react';

// Some lucide builds export `BarChart2` under different names — alias safely.
import { BarChart2 } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

interface NavSection {
  key: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  items?: NavItem[];
}

type NavZoneKey = 'people' | 'content_commerce' | 'safety' | 'growth' | 'platform';

interface NavZone {
  key: NavZoneKey;
  label: string;
  sectionKeys: string[];
}

interface RecentPage {
  label: string;
  href: string;
  visitedAt: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Zone config — V1 parity (caring_community deliberately omitted)
// ─────────────────────────────────────────────────────────────────────────────

const ZONES: NavZone[] = [
  {
    key: 'people',
    label: 'People',
    sectionKeys: ['users', 'crm'],
  },
  {
    key: 'content_commerce',
    label: 'Content & Commerce',
    sectionKeys: ['community', 'listings', 'content', 'jobs', 'marketplace', 'advertising'],
  },
  {
    key: 'safety',
    label: 'Safety',
    sectionKeys: ['moderation', 'matching'],
  },
  {
    key: 'growth',
    label: 'Growth',
    sectionKeys: ['engagement', 'marketing', 'analytics'],
  },
  {
    key: 'platform',
    label: 'Platform',
    sectionKeys: ['financial', 'enterprise', 'advanced', 'federation', 'integrations', 'system'],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Recent pages (localStorage)
// ─────────────────────────────────────────────────────────────────────────────

const RECENT_PAGES_KEY = 'admin_recent_pages';
const RECENT_PAGES_MAX = 5;

function readRecentPages(): RecentPage[] {
  try {
    const raw = localStorage.getItem(RECENT_PAGES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return (parsed as RecentPage[]).filter(
      (p) =>
        p !== null &&
        typeof p === 'object' &&
        typeof (p as RecentPage).label === 'string' &&
        typeof (p as RecentPage).href === 'string',
    );
  } catch {
    return [];
  }
}

function saveRecentPage(page: RecentPage): RecentPage[] {
  const existing = readRecentPages();
  const updated = [page, ...existing.filter((p) => p.href !== page.href)].slice(
    0,
    RECENT_PAGES_MAX,
  );
  try {
    localStorage.setItem(RECENT_PAGES_KEY, JSON.stringify(updated));
  } catch {
    /* quota errors silently ignored */
  }
  return updated;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fuzzy search
// ─────────────────────────────────────────────────────────────────────────────

function fuzzyMatch(query: string, target: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase();
  if (t.includes(q)) return true;
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length;
}

// ─────────────────────────────────────────────────────────────────────────────
// Nav data
// ─────────────────────────────────────────────────────────────────────────────

function useAdminNav(): NavSection[] {
  const { hasFeature, hasModule } = useTenant();
  const { user } = useAuth();

  const userRecord = user as Record<string, unknown> | null;
  const isSuperAdmin =
    (user?.role as string) === 'super_admin' ||
    userRecord?.is_super_admin === true ||
    userRecord?.is_tenant_super_admin === true;
  const isPlatformSuperAdmin =
    (user?.role as string) === 'super_admin' ||
    userRecord?.is_super_admin === true;

  return useMemo(() => {
    const communityItems: NavItem[] = [
      ...(hasFeature('groups') ? [
        { label: 'Groups', href: '/admin/groups', icon: Users },
        { label: 'Group Types', href: '/admin/groups/types', icon: FolderTree },
        { label: 'Group Recommendations', href: '/admin/groups/recommendations', icon: Brain },
        { label: 'Group Ranking', href: '/admin/groups/ranking', icon: Trophy },
      ] : []),
      ...(hasFeature('events') ? [
        { label: 'Events', href: '/admin/events', icon: Calendar },
      ] : []),
      ...(hasFeature('polls') ? [
        { label: 'Polls', href: '/admin/polls', icon: BarChart2 },
      ] : []),
      ...(hasFeature('goals') ? [
        { label: 'Goals', href: '/admin/goals', icon: Target },
      ] : []),
      ...(hasFeature('ideation_challenges') ? [
        { label: 'Ideation Challenges', href: '/admin/ideation', icon: Lightbulb },
      ] : []),
      ...(hasFeature('volunteering') ? [
        { label: 'Volunteering', href: '/admin/volunteering', icon: Heart },
        // Phase 73 — surfaced real Phase 65 volunteer-admin pages
        { label: 'Volunteer Expenses', href: '/admin/volunteering/expenses', icon: Heart },
        { label: 'Volunteer Wellbeing', href: '/admin/volunteering/wellbeing', icon: Heart },
        { label: 'Volunteer Certificates', href: '/admin/volunteering/certificates', icon: Heart },
        { label: 'Volunteer Alerts', href: '/admin/volunteering/alerts', icon: AlertTriangle },
      ] : []),
    ];

    // Matching & Safety — broker sub-pages live in the dedicated /broker app
    const matchingItems: NavItem[] = [
      ...(hasFeature('exchange_workflow') ? [
        { label: 'Smart Matching', href: '/admin/smart-matching', icon: Brain },
        { label: 'Match Approvals', href: '/admin/match-approvals', icon: UserCheck, badge: 'NEW' },
        { label: 'Broker Panel', href: '/broker', icon: Shield },
      ] : []),
      { label: 'Safeguarding', href: '/admin/safeguarding', icon: ShieldCheck },
      { label: 'Member Safeguarding', href: '/admin/safeguarding?tab=preferences', icon: Users },
      { label: 'Safeguarding Options', href: '/admin/safeguarding-options', icon: Shield },
    ];

    const moderationItems: NavItem[] = [
      { label: 'Content Queue', href: '/admin/moderation/queue', icon: Shield, badge: 'NEW' },
      ...(hasModule('feed') ? [
        { label: 'Feed Posts', href: '/admin/moderation/feed', icon: MessageSquare },
      ] : []),
      { label: 'Comments', href: '/admin/moderation/comments', icon: MessageCircle },
      ...(hasFeature('reviews') ? [
        { label: 'Reviews', href: '/admin/moderation/reviews', icon: Star },
      ] : []),
      { label: 'Reports', href: '/admin/moderation/reports', icon: Flag },
    ];

    const contentItems: NavItem[] = [
      ...(hasFeature('blog') ? [
        { label: 'Blog Posts', href: '/admin/blog', icon: FileText },
      ] : []),
      ...(hasFeature('resources') ? [
        { label: 'Resources', href: '/admin/resources', icon: BookOpen },
      ] : []),
      { label: 'Pages', href: '/admin/pages', icon: FileText },
      { label: 'Landing Page', href: '/admin/landing-page', icon: Palette },
      { label: 'Menus', href: '/admin/menus', icon: Menu },
      { label: 'Categories', href: '/admin/categories', icon: FolderTree },
      { label: 'Attributes', href: '/admin/attributes', icon: Tags },
    ];

    const financialItems: NavItem[] = [
      ...(hasModule('wallet') ? [
        { label: 'Timebanking', href: '/admin/timebanking', icon: Clock },
        { label: 'Fraud Alerts', href: '/admin/timebanking/alerts', icon: AlertTriangle },
        { label: 'Organisation Wallets', href: '/admin/timebanking/org-wallets', icon: Wallet },
        { label: 'Starting Balances', href: '/admin/timebanking/starting-balances', icon: Wallet },
      ] : []),
      { label: 'Plans & Pricing', href: '/admin/plans', icon: CreditCard },
      { label: 'Billing', href: '/admin/billing', icon: CreditCard },
      // Phase 73 — Phase 72 fiat donations admin
      { label: 'Donations', href: '/admin/donations', icon: CreditCard },
      ...(hasFeature('member_premium') ? [
        { label: 'Member Premium', href: '/admin/member-premium', icon: Crown },
        { label: 'Premium Subscribers', href: '/admin/member-premium/subscribers', icon: Users },
      ] : []),
    ];

    const advancedItems: NavItem[] = [
      ...(hasFeature('ai_chat') ? [
        { label: 'AI Settings', href: '/admin/ai-settings', icon: Brain },
        // Phase 69 — multi-provider abstraction (Anthropic / OpenAI / Gemini / Ollama)
        { label: 'AI Providers', href: '/admin/ai-providers', icon: Cpu },
        { label: 'AI Agents', href: '/admin/ai/agents', icon: Bot },
      ] : []),
      ...(hasFeature('ai_agents') ? [
        { label: 'AI Agents', href: '/admin/agents', icon: Bot },
        { label: 'Agent Proposals', href: '/admin/agents/proposals', icon: Bot },
        { label: 'Agent Runs', href: '/admin/agents/runs', icon: Bot },
      ] : []),
      { label: 'Email Settings', href: '/admin/email-settings', icon: Mail },
      { label: 'Algorithm Settings', href: '/admin/algorithm-settings', icon: Cpu },
      { label: 'SEO Overview', href: '/admin/seo', icon: Search },
      { label: '404 Error Tracking', href: '/admin/404-errors', icon: AlertTriangle },
      { label: 'Diagnostics', href: '/admin/matching-diagnostic', icon: Stethoscope },
      { label: 'Match Debug Panel', href: '/admin/match-debug', icon: Target },
    ];

    const sections: NavSection[] = [
      { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/admin' },
      {
        key: 'users',
        label: 'Users',
        icon: Users,
        items: [
          { label: 'All Users', href: '/admin/users', icon: Users },
          { label: 'Pending Approvals', href: '/admin/users?filter=pending', icon: UserCheck },
        ],
      },
      {
        key: 'crm',
        label: 'CRM',
        icon: Contact,
        items: [
          { label: 'CRM Dashboard', href: '/admin/crm', icon: Contact },
          { label: 'Member Notes', href: '/admin/crm/notes', icon: StickyNote },
          { label: 'Coordinator Tasks', href: '/admin/crm/tasks', icon: ClipboardList },
          { label: 'Member Tags', href: '/admin/crm/tags', icon: Tag },
          { label: 'Activity Timeline', href: '/admin/crm/timeline', icon: Activity },
          { label: 'Onboarding Funnel', href: '/admin/crm/funnel', icon: Filter },
        ],
      },
      ...(communityItems.length > 0 ? [{
        key: 'community',
        label: 'Community',
        icon: Users,
        items: communityItems,
      }] as NavSection[] : []),
      ...(hasModule('listings') ? [{
        key: 'listings',
        label: 'Listings',
        icon: ListChecks,
        items: [{ label: 'All Content', href: '/admin/listings', icon: ListChecks }],
      }] as NavSection[] : []),
      { key: 'content', label: 'Content', icon: Newspaper, items: contentItems },
      ...(hasFeature('job_vacancies') ? [{
        key: 'jobs',
        label: 'Jobs',
        icon: Briefcase,
        items: [
          { label: 'Job Vacancies', href: '/admin/jobs', icon: Briefcase },
          { label: 'Job Moderation', href: '/admin/jobs/moderation', icon: ShieldCheck },
          { label: 'Job Pipeline', href: '/admin/jobs/pipeline', icon: Handshake },
          { label: 'Job Bias Audit', href: '/admin/jobs/bias-audit', icon: BarChart3 },
          { label: 'Job Templates', href: '/admin/jobs/templates', icon: FileText },
        ],
      }] as NavSection[] : []),
      ...(hasFeature('marketplace') ? [{
        key: 'marketplace',
        label: 'Marketplace',
        icon: ShoppingBag,
        items: [
          { label: 'Dashboard', href: '/admin/marketplace', icon: ShoppingBag },
          { label: 'Moderation', href: '/admin/marketplace/moderation', icon: ShieldCheck },
          { label: 'Sellers', href: '/admin/marketplace/sellers', icon: Store },
        ],
      }] as NavSection[] : []),
      ...(hasFeature('local_advertising') ? [{
        key: 'advertising',
        label: 'Advertising',
        icon: Megaphone,
        items: [
          { label: 'Ad Campaigns', href: '/admin/advertising/campaigns', icon: Megaphone },
          { label: 'Push Campaigns', href: '/admin/advertising/push-campaigns', icon: BellRing },
        ],
      }] as NavSection[] : []),
      { key: 'moderation', label: 'Moderation', icon: Shield, items: moderationItems },
      { key: 'matching', label: 'Matching & Safety', icon: Zap, items: matchingItems },
      ...(hasFeature('gamification') ? [{
        key: 'engagement',
        label: 'Engagement',
        icon: Trophy,
        items: [
          { label: 'Gamification Hub', href: '/admin/gamification', icon: Gamepad2 },
          { label: 'Campaigns', href: '/admin/gamification/campaigns', icon: Target },
          { label: 'Custom Badges', href: '/admin/custom-badges', icon: Medal },
          { label: 'Analytics', href: '/admin/gamification/analytics', icon: BarChart3 },
        ],
      }] as NavSection[] : []),
      {
        key: 'marketing',
        label: 'Marketing',
        icon: Megaphone,
        items: [
          ...(hasFeature('newsletter') ? [
            { label: 'Newsletters', href: '/admin/newsletters', icon: Megaphone },
            { label: 'Subscribers', href: '/admin/newsletters/subscribers', icon: Users },
            { label: 'Templates', href: '/admin/newsletters/templates', icon: FileText },
            { label: 'Bounces', href: '/admin/newsletters/bounces', icon: AlertTriangle },
            { label: 'Send-Time Optimizer', href: '/admin/newsletters/send-time-optimizer', icon: Clock },
            { label: 'Diagnostics', href: '/admin/newsletters/diagnostics', icon: Stethoscope },
          ] : []),
          { label: 'Deliverability', href: '/admin/deliverability', icon: Mail },
        ],
      },
      {
        key: 'analytics',
        label: 'Analytics & Reporting',
        icon: BarChart3,
        items: [
          { label: 'Community Analytics', href: '/admin/community-analytics', icon: BarChart3 },
          { label: 'Impact Report', href: '/admin/impact-report', icon: FileText },
          { label: 'Social Value / SROI', href: '/admin/reports/social-value', icon: DollarSign },
          { label: 'Member Reports', href: '/admin/reports/members', icon: Users },
          ...(hasModule('wallet') ? [
            { label: 'Hours Reports', href: '/admin/reports/hours', icon: Clock },
          ] : []),
          { label: 'Inactive Members', href: '/admin/reports/inactive-members', icon: UserX },
        ],
      },
      { key: 'financial', label: 'Financial', icon: Coins, items: financialItems },
      {
        key: 'enterprise',
        label: 'Enterprise',
        icon: Building2,
        items: [
          { label: 'Enterprise Dashboard', href: '/admin/enterprise', icon: Building2 },
          { label: 'Roles & Permissions', href: '/admin/enterprise/roles', icon: Key },
          { label: 'GDPR Dashboard', href: '/admin/enterprise/gdpr', icon: ShieldCheck },
          { label: 'GDPR Deletions', href: '/admin/enterprise/gdpr/deletions', icon: ShieldCheck },
          { label: 'Legal Documents', href: '/admin/legal-documents', icon: FileText },
          { label: 'Compliance Dashboard', href: '/admin/legal-documents/compliance', icon: ShieldCheck },
          { label: 'Monitoring', href: '/admin/enterprise/monitoring', icon: Heart },
          { label: 'System Configuration', href: '/admin/enterprise/config', icon: Cog },
          { label: 'Feature Flags', href: '/admin/enterprise/config/features', icon: Settings },
          { label: 'Secrets Vault', href: '/admin/enterprise/config/secrets', icon: Key },
        ],
      },
      { key: 'advanced', label: 'Advanced', icon: Sparkles, items: advancedItems },
      ...(hasFeature('federation') ? [{
        key: 'federation',
        label: 'Partner Timebanks',
        icon: Globe,
        items: [
          { label: 'Federation Settings', href: '/admin/federation', icon: Settings },
          { label: 'Partnerships', href: '/admin/federation/partnerships', icon: ArrowLeftRight },
          { label: 'Directory', href: '/admin/federation/directory', icon: Globe },
          // Phase 68 — federation protocol layer (CreditCommons / Komunitin / hour transfers)
          { label: 'Protocol Transfers', href: '/admin/federation/transfers', icon: Handshake },
          { label: 'Credit Agreements', href: '/admin/federation/credit-agreements', icon: Handshake },
          { label: 'Neighborhoods', href: '/admin/federation/neighborhoods', icon: MapPin },
          { label: 'Analytics', href: '/admin/federation/analytics', icon: BarChart3 },
          { label: 'API Keys', href: '/admin/federation/api-keys', icon: Key },
          { label: 'API Docs', href: '/admin/federation/api-docs', icon: BookOpen },
          { label: 'External Partners', href: '/admin/federation/external-partners', icon: Globe },
          { label: 'CC Config', href: '/admin/federation/cc-config', icon: Network },
          { label: 'Webhooks', href: '/admin/federation/webhooks', icon: Webhook },
          { label: 'Activity', href: '/admin/federation/activity', icon: Activity },
          { label: 'Audit Log', href: '/admin/federation/audit', icon: ScrollText },
          { label: 'Partners (System)', href: '/admin/federation/partners-admin', icon: Globe },
          { label: 'Data Management', href: '/admin/federation/data', icon: Database },
        ],
      }] as NavSection[] : []),
      ...(hasFeature('partner_api') ? [{
        key: 'integrations',
        label: 'Integrations',
        icon: Webhook,
        items: [{ label: 'API Partners', href: '/admin/api-partners', icon: Key }],
      }] as NavSection[] : []),
      {
        key: 'system',
        label: 'System',
        icon: Settings,
        items: [
          { label: 'Settings', href: '/admin/settings', icon: Settings },
          { label: 'Onboarding Settings', href: '/admin/onboarding-settings', icon: Sparkles },
          { label: 'Tenant Features', href: '/admin/tenant-features', icon: Cog },
          { label: 'Module Configuration', href: '/admin/module-configuration', icon: Puzzle, badge: 'BETA' },
          { label: 'Translation Settings', href: '/admin/translation-config', icon: Languages },
          { label: 'Activity Log', href: '/admin/activity-log', icon: Activity },
          { label: 'Cron Jobs', href: '/admin/cron-jobs', icon: Timer },
          // Phase 73 — Phase 63 scheduled hosted-services observability
          { label: 'Scheduled Jobs', href: '/admin/scheduled-jobs', icon: Timer },
          { label: 'Cron Logs', href: '/admin/cron-jobs/logs', icon: FileText },
          { label: 'Cron Setup', href: '/admin/cron-jobs/setup', icon: Wrench },
          ...(isPlatformSuperAdmin
            ? [{ label: 'Cron Settings', href: '/admin/cron-jobs/settings', icon: Settings }]
            : []),
          { label: 'Tools', href: '/admin/seed-generator', icon: Wrench },
        ],
      },
    ];

    if (isSuperAdmin) {
      sections.push({
        key: 'super-admin',
        label: 'Super Admin',
        icon: Crown,
        items: [
          { label: 'Super Dashboard', href: '/admin/super', icon: Crown },
          // National KISS Dashboard intentionally omitted — Caring-Community-adjacent / OOS.
          { label: 'Provisioning Queue', href: '/admin/provisioning-requests', icon: Building2 },
          { label: 'All Tenants', href: '/admin/super/tenants', icon: Building2 },
          { label: 'Tenant Hierarchy', href: '/admin/super/tenants/hierarchy', icon: Network },
          { label: 'Cross-Tenant Users', href: '/admin/super/users', icon: Users },
          { label: 'Bulk Operations', href: '/admin/super/bulk', icon: ListChecks },
          { label: 'Audit Log', href: '/admin/super/audit', icon: ScrollText },
          { label: 'Super Federation Controls', href: '/admin/super/federation', icon: Globe },
          { label: 'Super Federation Whitelist', href: '/admin/super/federation/whitelist', icon: Shield },
          { label: 'Super Federation Partnerships', href: '/admin/super/federation/partnerships', icon: Handshake },
          { label: 'Super Federation Audit', href: '/admin/super/federation/audit', icon: FileSearch },
          // Regional Analytics intentionally omitted — Caring-Community-adjacent / OOS.
        ],
      });
    }

    return sections;
  }, [hasFeature, hasModule, isPlatformSuperAdmin, isSuperAdmin]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar component
// ─────────────────────────────────────────────────────────────────────────────

interface AdminSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface FilteredNavItem extends NavItem {
  sectionLabel: string;
}

export function AdminSidebar({ collapsed, onToggle }: AdminSidebarProps) {
  const sections = useAdminNav();
  const location = useLocation();
  const { tenantPath } = useTenant();

  // Auto-expand the active section on mount
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => {
    const active = new Set<string>();
    for (const section of sections) {
      if (section.href && location.pathname === tenantPath(section.href)) {
        active.add(section.key);
      }
      for (const item of section.items ?? []) {
        const path = item.href.split('?')[0] ?? '';
        if (path && location.pathname.startsWith(tenantPath(path))) {
          active.add(section.key);
        }
      }
    }
    return active;
  });

  const [collapsedZones, setCollapsedZones] = useState<Set<NavZoneKey>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [recentPages, setRecentPages] = useState<RecentPage[]>(() => readRecentPages());

  // Live badge counts
  const [unreviewedCount, setUnreviewedCount] = useState(0);
  const [safeguardingFlagCount, setSafeguardingFlagCount] = useState(0);

  const fetchUnreviewedCount = useCallback(async () => {
    try {
      const res = await adminBroker.getUnreviewedCount();
      if (res.success && res.data) setUnreviewedCount(res.data.count);
    } catch {
      /* silent */
    }
  }, []);

  const fetchSafeguardingFlags = useCallback(async () => {
    try {
      const res = await api.get<{ unreviewed_flags?: number } | { data: { unreviewed_flags?: number } }>(
        '/v2/admin/safeguarding/dashboard',
      );
      if (res.success && res.data) {
        const payload = 'data' in res.data ? res.data.data : res.data;
        setSafeguardingFlagCount(Number(payload?.unreviewed_flags ?? 0));
      }
    } catch {
      /* silent — feature not enabled */
    }
  }, []);

  useEffect(() => {
    fetchUnreviewedCount();
    fetchSafeguardingFlags();
    const i = setInterval(() => { fetchUnreviewedCount(); fetchSafeguardingFlags(); }, 60000);
    return () => clearInterval(i);
  }, [fetchUnreviewedCount, fetchSafeguardingFlags]);

  const sectionMap = useMemo(() => new Map(sections.map((s) => [s.key, s])), [sections]);

  // Section → zone lookup
  const sectionZone = useMemo(() => {
    const map = new Map<string, NavZoneKey>();
    for (const z of ZONES) for (const k of z.sectionKeys) map.set(k, z.key);
    return map;
  }, []);

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        const zone = sectionZone.get(key);
        if (zone) {
          const z = ZONES.find((zz) => zz.key === zone);
          z?.sectionKeys.forEach((sk) => next.delete(sk));
        }
        next.add(key);
      }
      return next;
    });
  };

  const toggleZone = (key: NavZoneKey) => {
    setCollapsedZones((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const isActive = (href: string) => {
    const [path, rawQuery] = href.split('?');
    const cleanPath = path ?? '';
    const fullPath = tenantPath(cleanPath);
    if (cleanPath === '/admin') return location.pathname === fullPath;
    if (!location.pathname.startsWith(fullPath)) return false;
    if (rawQuery) {
      const required = new URLSearchParams(rawQuery);
      const current = new URLSearchParams(location.search);
      for (const [k, v] of required.entries()) {
        if (current.get(k) !== v) return false;
      }
      return true;
    }
    const currentFilter = new URLSearchParams(location.search).get('filter');
    if (currentFilter && currentFilter !== 'all') return false;
    return true;
  };

  const trackVisit = (label: string, href: string) => {
    const updated = saveRecentPage({ label, href, visitedAt: Date.now() });
    setRecentPages(updated);
  };

  const filteredResults = useMemo((): FilteredNavItem[] => {
    if (!searchQuery.trim()) return [];
    return sections.flatMap((section) =>
      (section.items ?? [])
        .filter((item) => fuzzyMatch(searchQuery, item.label))
        .map((item) => ({ ...item, sectionLabel: section.label })),
    );
  }, [sections, searchQuery]);

  // ── Render helpers ──────────────────────────────────────────────────────

  const renderNavItem = (item: NavItem) => {
    const ItemIcon = item.icon;
    const isMessageReview = item.href === '/admin/broker-controls/messages';
    const isSafeguardingRoot = item.href === '/admin/safeguarding';
    const dynamicBadge = isMessageReview && unreviewedCount > 0
      ? String(unreviewedCount)
      : isSafeguardingRoot && safeguardingFlagCount > 0
        ? String(safeguardingFlagCount)
        : item.badge;
    const isUrgent = (isMessageReview && unreviewedCount > 0) || (isSafeguardingRoot && safeguardingFlagCount > 0);

    return (
      <li key={item.href}>
        <Link
          to={tenantPath(item.href)}
          onClick={() => trackVisit(item.label, item.href)}
          className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors ${
            isActive(item.href)
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-default-500 hover:bg-default-100 hover:text-foreground'
          }`}
        >
          <ItemIcon size={16} className="shrink-0" />
          <span>{item.label}</span>
          {dynamicBadge && (
            <span
              className={`ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                isUrgent ? 'bg-danger text-danger-foreground' : 'bg-primary text-primary-foreground'
              }`}
            >
              {dynamicBadge}
            </span>
          )}
        </Link>
      </li>
    );
  };

  const renderSection = (section: NavSection) => {
    const Icon = section.icon;
    const isExpanded = expandedSections.has(section.key);
    const sectionActive = section.href ? isActive(section.href) : section.items?.some((it) => isActive(it.href));
    const isSuperSection = section.key === 'super-admin';

    if (section.href && !section.items) {
      return (
        <li key={section.key}>
          <Link
            to={tenantPath(section.href)}
            onClick={() => trackVisit(section.label, section.href!)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              sectionActive ? 'bg-primary/10 text-primary' : 'text-default-600 hover:bg-default-100 hover:text-foreground'
            }`}
            title={collapsed ? section.label : undefined}
          >
            <Icon size={20} className="shrink-0" />
            {!collapsed && <span>{section.label}</span>}
          </Link>
        </li>
      );
    }

    return (
      <li key={section.key}>
        {isSuperSection && !collapsed && <div className="my-2 border-t border-warning/30" />}
        <div className={isSuperSection ? 'rounded-lg bg-primary/5 py-1 px-1' : ''}>
          <Button
            variant="light"
            onPress={() => toggleSection(section.key)}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors h-auto min-w-0 justify-start ${
              sectionActive ? 'text-primary' : 'text-default-600 hover:bg-default-100 hover:text-foreground'
            }`}
            title={collapsed ? section.label : undefined}
          >
            <Icon size={20} className="shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">{section.label}</span>
                {isExpanded ? <ChevronDown size={16} className="shrink-0" /> : <ChevronRight size={16} className="shrink-0" />}
              </>
            )}
          </Button>
          {!collapsed && isExpanded && section.items && (
            <ul className="ml-4 mt-1 space-y-0.5 border-l border-divider pl-3">
              {section.items.map(renderNavItem)}
            </ul>
          )}
        </div>
      </li>
    );
  };

  // ── Build zoned section list (sections not in any zone render unzoned at top) ──
  const dashboardSection = sectionMap.get('dashboard');
  const superAdminSection = sectionMap.get('super-admin');
  const zonedSectionKeys = new Set(ZONES.flatMap((z) => z.sectionKeys));

  return (
    <aside
      className={`fixed left-0 top-0 z-40 h-screen border-r border-divider bg-content1 transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-divider px-4">
        {!collapsed && (
          <Link to={tenantPath('/admin')} className="text-lg font-bold text-foreground">
            Admin
          </Link>
        )}
        <Button
          variant="light"
          isIconOnly
          onPress={onToggle}
          className="rounded-lg p-2 text-default-500 hover:bg-default-100 hover:text-foreground min-w-0 h-auto"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeft size={20} /> : <PanelLeftClose size={20} />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="h-[calc(100vh-4rem)] overflow-y-auto px-2 py-3">
        {/* Search */}
        {!collapsed && (
          <div className="mb-3 px-1">
            <Input
              size="sm"
              variant="bordered"
              placeholder="Search admin…"
              value={searchQuery}
              onValueChange={setSearchQuery}
              startContent={<Search size={14} className="text-default-400" />}
              endContent={searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-default-400 hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
              aria-label="Search admin navigation"
            />
          </div>
        )}

        {/* Search results */}
        {!collapsed && searchQuery.trim() && (
          <div className="mb-3 px-1">
            {filteredResults.length === 0 ? (
              <p className="px-3 py-2 text-xs text-default-400">No matches</p>
            ) : (
              <ul className="space-y-0.5">
                {filteredResults.map((item) => (
                  <li key={item.href}>
                    <Link
                      to={tenantPath(item.href)}
                      onClick={() => { trackVisit(item.label, item.href); setSearchQuery(''); }}
                      className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-default-600 hover:bg-default-100 hover:text-foreground"
                    >
                      <item.icon size={14} className="shrink-0 text-default-400" />
                      <span>{item.label}</span>
                      <span className="ml-auto text-[10px] text-default-400">{item.sectionLabel}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {!searchQuery.trim() && (
          <ul className="space-y-1">
            {/* Dashboard (unzoned, always at top) */}
            {dashboardSection && renderSection(dashboardSection)}

            {/* Pinned: Broker Panel link → dedicated /broker app */}
            <li>
              <Link
                to={tenantPath('/broker')}
                onClick={() => trackVisit('Broker Panel', '/broker')}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-default-600 transition-colors hover:bg-default-100 hover:text-foreground"
                title={collapsed ? 'Broker Panel' : undefined}
              >
                <ShieldCheck size={20} className="shrink-0 text-primary" />
                {!collapsed && (
                  <>
                    <span>Broker Panel</span>
                    {unreviewedCount > 0 && (
                      <span className="ml-auto rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-bold text-danger-foreground">
                        {unreviewedCount}
                      </span>
                    )}
                  </>
                )}
              </Link>
            </li>

            {/* Recent pages */}
            {!collapsed && recentPages.length > 0 && (
              <li className="pt-3">
                <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-default-400">
                  Recent
                </p>
                <ul className="space-y-0.5">
                  {recentPages.map((p) => (
                    <li key={p.href}>
                      <Link
                        to={tenantPath(p.href)}
                        className="flex items-center gap-2 rounded-lg px-3 py-1 text-xs text-default-500 hover:bg-default-100 hover:text-foreground"
                      >
                        <Clock size={12} className="shrink-0 text-default-400" />
                        <span className="truncate">{p.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            )}

            {/* Zones */}
            {ZONES.map((zone) => {
              const zoneSections = zone.sectionKeys
                .map((k) => sectionMap.get(k))
                .filter((s): s is NavSection => Boolean(s));
              if (zoneSections.length === 0) return null;
              const zoneCollapsed = collapsedZones.has(zone.key);

              return (
                <Fragment key={zone.key}>
                  {!collapsed && (
                    <li className="pt-3">
                      <button
                        type="button"
                        onClick={() => toggleZone(zone.key)}
                        className="flex w-full items-center gap-1 px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-default-400 hover:text-default-600"
                      >
                        {zoneCollapsed ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
                        <span>{zone.label}</span>
                      </button>
                    </li>
                  )}
                  {!zoneCollapsed && zoneSections.map(renderSection)}
                </Fragment>
              );
            })}

            {/* Sections not assigned to any zone (defensive — should be empty) */}
            {sections
              .filter((s) => s.key !== 'dashboard' && s.key !== 'super-admin' && !zonedSectionKeys.has(s.key))
              .map(renderSection)}

            {/* Super Admin (unzoned, always at bottom) */}
            {superAdminSection && renderSection(superAdminSection)}
          </ul>
        )}
      </nav>
    </aside>
  );
}

export default AdminSidebar;
