// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { Link, useLocation } from 'react-router-dom';
import { Button, Chip } from '@heroui/react';
import {
  ArrowLeft,
  ArrowRight,
  BadgePercent,
  BookOpen,
  Briefcase,
  Building2,
  CheckCircle2,
  Code2,
  Compass,
  CreditCard,
  FileText,
  HeartHandshake,
  LineChart,
  MapPinned,
  Megaphone,
  Receipt,
  Route as RouteIcon,
  Search,
  ShieldCheck,
  ShoppingBag,
  Star,
  Users,
  WalletCards,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { GlassCard } from '@/components/ui';
import { useTenant } from '@/contexts';
import { usePageTitle } from '@/hooks';

interface ParityAction {
  label: string;
  to: string;
  icon: LucideIcon;
  primary?: boolean;
}

interface ParityConfig {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string;
  highlights: string[];
  actions: ParityAction[];
}

const parityConfigs: Record<string, ParityConfig> = {
  advertising: {
    eyebrow: 'Local advertising',
    title: 'Campaign workspace',
    description: 'Self-serve campaign links from V1 are preserved here while the V2 campaign builder is completed.',
    icon: Megaphone,
    accent: 'from-sky-500 to-emerald-500',
    highlights: [
      'Campaign and push-campaign deep links resolve inside the production member app.',
      'Campaign creation, budgets, reach estimates, and reporting remain a focused commercial workflow.',
      'Related community discovery pages are available from this route.',
    ],
    actions: [
      { label: 'Explore community activity', to: '/explore', icon: Compass, primary: true },
      { label: 'Open analytics', to: '/regional-analytics', icon: LineChart },
    ],
  },
  clubs: {
    eyebrow: 'Clubs and Vereine',
    title: 'Association workspace',
    description: 'Club directory, member import, dues, and invitation routes are wired for V1 deep-link compatibility.',
    icon: Users,
    accent: 'from-emerald-500 to-teal-600',
    highlights: [
      'Club directory and Verein administration URLs are accepted by the V2 member router.',
      'Dues and cross-invitation member pages keep their legacy route shape.',
      'Group and organisation pages remain the active V2 collaboration surfaces.',
    ],
    actions: [
      { label: 'Browse groups', to: '/groups', icon: Users, primary: true },
      { label: 'Browse organisations', to: '/organisations', icon: Building2 },
    ],
  },
  collections: {
    eyebrow: 'Saved member content',
    title: 'Collections and saved items',
    description: 'Saved collections, public member collections, appreciation walls, and bookmarks now land on a stable member page.',
    icon: Star,
    accent: 'from-amber-500 to-rose-500',
    highlights: [
      'Saved collection and appreciation URLs no longer fall through to 404.',
      'Bookmarks, collections, and appreciation walls are grouped as member profile-adjacent surfaces.',
      'Search and member profile pages remain available as the canonical browse paths.',
    ],
    actions: [
      { label: 'Search the community', to: '/search', icon: Search, primary: true },
      { label: 'Open profile', to: '/profile', icon: Users },
    ],
  },
  coupons: {
    eyebrow: 'Coupons',
    title: 'Coupons and merchant offers',
    description: 'Coupon browse, detail, and merchant coupon management routes are preserved for marketplace parity.',
    icon: BadgePercent,
    accent: 'from-rose-500 to-orange-500',
    highlights: [
      'Public coupon links and seller coupon edit links resolve in V2.',
      'Coupon pages are grouped with marketplace offers and merchant tools.',
      'Marketplace order and seller routes are available from the same parity surface.',
    ],
    actions: [
      { label: 'Open marketplace', to: '/marketplace', icon: ShoppingBag, primary: true },
      { label: 'Seller tools', to: '/marketplace/seller/coupons', icon: BadgePercent },
    ],
  },
  developers: {
    eyebrow: 'Partner API',
    title: 'Developer documentation',
    description: 'Developer portal routes for auth, endpoints, and webhooks are wired for partners using V1 documentation links.',
    icon: Code2,
    accent: 'from-cyan-500 to-blue-600',
    highlights: [
      'Partner API overview, authentication, endpoint, and webhook URLs resolve in the member app.',
      'The ASP.NET backend remains the canonical API implementation.',
      'These pages keep public documentation deep links stable while richer docs are rebuilt.',
    ],
    actions: [
      { label: 'Open help center', to: '/help', icon: BookOpen, primary: true },
      { label: 'Contact support', to: '/contact', icon: HeartHandshake },
    ],
  },
  'donation-receipt': {
    eyebrow: 'Donations',
    title: 'Donation receipt',
    description: 'Receipt URLs are preserved for volunteer donation and community-giving flows.',
    icon: Receipt,
    accent: 'from-emerald-500 to-lime-600',
    highlights: [
      'Receipt deep links resolve with the original V1 route shape.',
      'Volunteering and organisation wallet pages remain the related V2 workflows.',
      'Receipts can be connected to persisted donation data as the full UI lands.',
    ],
    actions: [
      { label: 'Open volunteering', to: '/volunteering', icon: HeartHandshake, primary: true },
      { label: 'Browse organisations', to: '/organisations', icon: Building2 },
    ],
  },
  explore: {
    eyebrow: 'Discovery',
    title: 'Explore',
    description: 'The V1 explore route now resolves to a discovery surface with links into active V2 community modules.',
    icon: Compass,
    accent: 'from-blue-500 to-teal-500',
    highlights: [
      'Explore links are preserved as a public member route.',
      'Members can jump into listings, events, groups, jobs, and search.',
      'The route is ready for a richer curated discovery feed.',
    ],
    actions: [
      { label: 'Search now', to: '/search', icon: Search, primary: true },
      { label: 'Browse listings', to: '/listings', icon: ShoppingBag },
      { label: 'Browse events', to: '/events', icon: Compass },
    ],
  },
  'federation-groups': {
    eyebrow: 'Federation',
    title: 'Federated groups',
    description: 'Federated group discovery keeps its V1 route while V2 federation group browsing is expanded.',
    icon: RouteIcon,
    accent: 'from-indigo-500 to-cyan-500',
    highlights: [
      'The federated groups URL now resolves alongside partners, members, listings, and events.',
      'Local groups and federation hub pages are linked from this route.',
      'Protocol-specific group behavior can be attached without changing the route contract.',
    ],
    actions: [
      { label: 'Federation hub', to: '/federation', icon: RouteIcon, primary: true },
      { label: 'Local groups', to: '/groups', icon: Users },
    ],
  },
  'feed-detail': {
    eyebrow: 'Feed',
    title: 'Feed item',
    description: 'Post and feed item deep links are accepted and connected back to the active V2 feed.',
    icon: FileText,
    accent: 'from-orange-500 to-amber-500',
    highlights: [
      'V1 post and typed feed item URLs no longer fall through to 404.',
      'The active feed remains available for surrounding context.',
      'Dedicated item rendering can be attached later without changing incoming links.',
    ],
    actions: [
      { label: 'Open feed', to: '/feed', icon: FileText, primary: true },
      { label: 'Search', to: '/search', icon: Search },
    ],
  },
  'jobs-workspace': {
    eyebrow: 'Jobs',
    title: 'Employer and hiring tools',
    description: 'Advanced jobs routes for kanban, employer brand, talent search, bias audit, and onboarding now resolve in V2.',
    icon: Briefcase,
    accent: 'from-blue-500 to-indigo-600',
    highlights: [
      'Advanced employer and candidate workflow links are preserved.',
      'Core job browsing, alerts, applications, creation, details, and analytics are already active V2 pages.',
      'Pipeline-specific screens can be replaced route-by-route as their full modules land.',
    ],
    actions: [
      { label: 'Browse jobs', to: '/jobs', icon: Briefcase, primary: true },
      { label: 'My applications', to: '/jobs/my-applications', icon: FileText },
      { label: 'Job alerts', to: '/jobs/alerts', icon: ShieldCheck },
    ],
  },
  marketplace: {
    eyebrow: 'Marketplace',
    title: 'Marketplace',
    description: 'Marketplace browsing, seller tools, orders, pickup slots, free items, maps, offers, and collections are wired as V1-compatible member routes.',
    icon: ShoppingBag,
    accent: 'from-emerald-500 to-cyan-600',
    highlights: [
      'All priority marketplace route shapes now resolve in the production member frontend.',
      'Existing listings remain the active V2 exchange surface while marketplace-specific screens are rebuilt.',
      'Seller, buyer order, collection, map, coupon, and pickup deep links have stable landing pages.',
    ],
    actions: [
      { label: 'Browse listings', to: '/listings', icon: Search, primary: true },
      { label: 'Create listing', to: '/listings/create', icon: ShoppingBag },
      { label: 'Coupons', to: '/coupons', icon: BadgePercent },
    ],
  },
  pilot: {
    eyebrow: 'Pilot programme',
    title: 'Pilot applications',
    description: 'Pilot inquiry, application, and status URLs are preserved for communities entering the platform.',
    icon: ShieldCheck,
    accent: 'from-slate-500 to-sky-600',
    highlights: [
      'Public pilot intake links now resolve in the V2 SPA.',
      'Application status URLs keep their token route shape.',
      'Contact and help pages are available for manual follow-up.',
    ],
    actions: [
      { label: 'Contact the team', to: '/contact', icon: HeartHandshake, primary: true },
      { label: 'Help center', to: '/help', icon: BookOpen },
    ],
  },
  premium: {
    eyebrow: 'Premium',
    title: 'Member subscription',
    description: 'Premium pricing, return, and management routes are wired for member subscription parity.',
    icon: CreditCard,
    accent: 'from-violet-500 to-sky-500',
    highlights: [
      'Member premium URLs resolve without changing V1 deep links.',
      'Pricing, checkout return, and subscription management can be connected independently.',
      'Billing-critical routes stay isolated from the admin panel.',
    ],
    actions: [
      { label: 'Open account settings', to: '/settings', icon: CreditCard, primary: true },
      { label: 'View benefits', to: '/premium', icon: Star },
    ],
  },
  'regional-analytics': {
    eyebrow: 'Regional analytics',
    title: 'Regional analytics',
    description: 'Regional analytics and partner dashboard routes are available for public and partner-facing reporting links.',
    icon: LineChart,
    accent: 'from-teal-500 to-blue-600',
    highlights: [
      'Public analytics and partner dashboard URLs now resolve in V2.',
      'The surface is ready for regional impact metrics, trends, and partner reporting.',
      'Regional points are linked as the member wallet-adjacent route.',
    ],
    actions: [
      { label: 'Regional points', to: '/wallet/regional-points', icon: WalletCards, primary: true },
      { label: 'Dashboard', to: '/dashboard', icon: LineChart },
    ],
  },
  'regional-points': {
    eyebrow: 'Wallet',
    title: 'Regional points',
    description: 'Regional points deep links are preserved as a wallet-adjacent member route.',
    icon: WalletCards,
    accent: 'from-lime-500 to-emerald-600',
    highlights: [
      'The regional points URL resolves inside the protected member area.',
      'Wallet balance and transaction pages remain the active V2 money movement surface.',
      'Regional point ledgers can be attached without changing the route shape.',
    ],
    actions: [
      { label: 'Open wallet', to: '/wallet', icon: WalletCards, primary: true },
      { label: 'Regional analytics', to: '/regional-analytics', icon: LineChart },
    ],
  },
  reviews: {
    eyebrow: 'Reviews',
    title: 'Reviews',
    description: 'Member review links are preserved for completed exchanges and trust workflows.',
    icon: ShieldCheck,
    accent: 'from-amber-500 to-emerald-600',
    highlights: [
      'The reviews route resolves in the protected member area.',
      'Exchange details remain available for completed transaction context.',
      'Trust and review summaries can be promoted here as the dedicated UI is completed.',
    ],
    actions: [
      { label: 'Open exchanges', to: '/exchanges', icon: RouteIcon, primary: true },
      { label: 'View profile', to: '/profile', icon: Users },
    ],
  },
  'volunteering-org': {
    eyebrow: 'Volunteering',
    title: 'Organisation dashboard',
    description: 'Volunteering organisation dashboards, organisation lists, and receipt links are wired for V1 route parity.',
    icon: HeartHandshake,
    accent: 'from-rose-500 to-emerald-500',
    highlights: [
      'Volunteer organisation dashboard and my-organisation links resolve in V2.',
      'Core opportunities, applications, and volunteering pages remain active.',
      'Organisation-specific tabs can be connected to real data behind the same URLs.',
    ],
    actions: [
      { label: 'Open volunteering', to: '/volunteering', icon: HeartHandshake, primary: true },
      { label: 'Browse organisations', to: '/organisations', icon: Building2 },
    ],
  },
};

const fallbackConfig: ParityConfig = {
  eyebrow: 'Member route',
  title: 'Member parity route',
  description: 'This V1 member route is wired into the V2 production frontend and ready for the full screen implementation.',
  icon: RouteIcon,
  accent: 'from-slate-500 to-blue-600',
  highlights: [
    'The route resolves in the member app.',
    'Tenant-prefixed links continue to work.',
    'The route can be replaced with a dedicated screen without changing deep links.',
  ],
  actions: [
    { label: 'Open dashboard', to: '/dashboard', icon: LineChart, primary: true },
    { label: 'Search', to: '/search', icon: Search },
  ],
};

interface MemberParityPageProps {
  pageKey: string;
}

export function MemberParityPage({ pageKey }: MemberParityPageProps) {
  const config = parityConfigs[pageKey] ?? fallbackConfig;
  const { tenantPath } = useTenant();
  const location = useLocation();
  const Icon = config.icon;
  usePageTitle(config.title);

  return (
    <section className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
        <div className="min-w-0 max-w-3xl">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${config.accent} flex items-center justify-center shadow-lg shadow-black/10`}>
              <Icon className="w-6 h-6 text-white" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <Chip size="sm" variant="flat" className="bg-theme-elevated text-theme-muted">
                {config.eyebrow}
              </Chip>
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-theme-primary tracking-normal">
            {config.title}
          </h1>
          <p className="text-theme-muted mt-2 leading-relaxed">
            {config.description}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row lg:flex-col gap-2 sm:items-stretch lg:w-56">
          <Button
            variant="flat"
            className="bg-theme-elevated text-theme-primary justify-start"
            startContent={<ArrowLeft className="w-4 h-4" aria-hidden="true" />}
            onPress={() => window.history.back()}
          >
            Back
          </Button>
          <Link to={tenantPath('/dashboard')}>
            <Button
              className="w-full bg-gradient-to-r from-indigo-500 to-sky-600 text-white justify-start"
              startContent={<LineChart className="w-4 h-4" aria-hidden="true" />}
            >
              Dashboard
            </Button>
          </Link>
        </div>
      </div>

      <GlassCard className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-theme-elevated flex items-center justify-center flex-shrink-0">
            <RouteIcon className="w-5 h-5 text-theme-muted" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-theme-primary">Current route</p>
            <p className="text-sm text-theme-muted font-mono break-all">{location.pathname}</p>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)] gap-4">
        <GlassCard className="p-5">
          <h2 className="text-lg font-semibold text-theme-primary mb-4">Parity status</h2>
          <div className="space-y-3">
            {config.highlights.map((highlight) => (
              <div key={highlight} className="flex gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-sm text-theme-muted leading-relaxed">{highlight}</p>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <h2 className="text-lg font-semibold text-theme-primary mb-4">Related paths</h2>
          <div className="space-y-2">
            {config.actions.map((action) => {
              const ActionIcon = action.icon;
              return (
                <Link key={`${action.to}-${action.label}`} to={tenantPath(action.to)} className="block">
                  <Button
                    variant={action.primary ? 'solid' : 'flat'}
                    className={
                      action.primary
                        ? 'w-full justify-between bg-gradient-to-r from-indigo-500 to-sky-600 text-white'
                        : 'w-full justify-between bg-theme-elevated text-theme-primary'
                    }
                    startContent={<ActionIcon className="w-4 h-4" aria-hidden="true" />}
                    endContent={<ArrowRight className="w-4 h-4" aria-hidden="true" />}
                  >
                    {action.label}
                  </Button>
                </Link>
              );
            })}
          </div>
        </GlassCard>
      </div>

      <GlassCard className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-sm text-theme-muted">
          <MapPinned className="w-5 h-5 text-sky-500 flex-shrink-0" aria-hidden="true" />
          <p>
            This is a route-preserving V2 surface for V1 member links. The page is intentionally scoped to the member frontend and does not use embedded admin routes.
          </p>
        </div>
      </GlassCard>
    </section>
  );
}

export default MemberParityPage;
