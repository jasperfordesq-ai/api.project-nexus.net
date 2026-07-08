// Copyright © 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Shared accessible shell contract for apps/web-uk.
 *
 * Laravel's Blade accessible frontend is the current visual/workflow source of
 * truth. This module keeps the Nunjucks shell data in one place while the app is
 * prepared to become the future shared accessible frontend candidate.
 */

const serviceName = 'Project NEXUS Accessible';
const phaseText = 'Beta';
const feedbackUrl = 'mailto:feedback@project-nexus.ie?subject=NEXUS%20Beta%20feedback';
const sourceCodeUrl = 'https://github.com/jasperfordesq-ai/nexus-v1';

const localeOptions = [
  ['en', 'English'],
  ['ga', 'Gaeilge'],
  ['de', 'Deutsch'],
  ['fr', 'Français'],
  ['it', 'Italiano'],
  ['pt', 'Português'],
  ['es', 'Español'],
  ['nl', 'Nederlands'],
  ['pl', 'Polski'],
  ['ja', '日本語'],
  ['ar', 'العربية']
];

const navItems = [
  { key: 'home', label: 'Home', href: '/', anonymousOnly: true },
  { key: 'dashboard', label: 'Dashboard', href: '/dashboard', authenticatedOnly: true },
  { key: 'feed', label: 'Feed', href: '/feed' },
  { key: 'listings', label: 'Listings', href: '/listings' },
  { key: 'members', label: 'Members', href: '/members' },
  { key: 'events', label: 'Events', href: '/events' },
  { key: 'volunteering', label: 'Volunteering', href: '/volunteering' },
  { key: 'explore', label: 'Explore', href: '/explore', authenticatedOnly: true }
];

const footerColumns = [
  {
    key: 'platform',
    heading: 'Platform',
    links: [
      { key: 'listings', label: 'Listings', href: '/listings' },
      { key: 'members', label: 'Members', href: '/members' },
      { key: 'events', label: 'Events', href: '/events' },
      { key: 'volunteering', label: 'Volunteering', href: '/volunteering' },
      { key: 'blog', label: 'Blog', href: '/blog' }
    ]
  },
  {
    key: 'support',
    heading: 'Support',
    links: [
      { key: 'help', label: 'Help centre', href: '/help' },
      { key: 'kb', label: 'Knowledge base', href: '/kb' },
      { key: 'trust_safety', label: 'Trust and safety', href: '/trust-and-safety' },
      { key: 'contact', label: 'Contact', href: '/contact' },
      { key: 'about', label: 'About', href: '/about' }
    ]
  },
  {
    key: 'legal',
    heading: 'Legal',
    links: [
      { key: 'legal_hub', label: 'Legal', href: '/legal' },
      { key: 'terms', label: 'Terms of service', href: '/legal/terms' },
      { key: 'privacy', label: 'Privacy policy', href: '/legal/privacy' },
      { key: 'community_guidelines', label: 'Community guidelines', href: '/legal/community-guidelines' },
      { key: 'acceptable_use', label: 'Acceptable use', href: '/legal/acceptable-use' },
      { key: 'cookies', label: 'Cookie policy', href: '/legal/cookies' },
      { key: 'accessibility', label: 'Accessibility statement', href: '/accessibility' }
    ]
  }
];

const exploreLinks = [
  {
    title: 'Exchanges',
    description: 'See your exchange requests, agreements, and time-credit activity.',
    href: '/exchanges',
    status: 'placeholder'
  },
  {
    title: 'AI assistant',
    description: 'Get accessible guidance and help with community tasks when enabled.',
    href: '/chat',
    status: 'placeholder'
  },
  {
    title: 'Polls',
    description: 'Vote in community polls and see active questions.',
    href: '/polls'
  },
  {
    title: 'Search',
    description: 'Search across people, listings, events, groups, and community content.',
    href: '/search'
  },
  {
    title: 'Groups',
    description: 'Find groups, join conversations, and take part in shared activities.',
    href: '/groups'
  },
  {
    title: 'Goals',
    description: 'Track goals, progress, and community achievements.',
    href: '/goals'
  },
  {
    title: 'Skills',
    description: 'Browse member skills and capabilities across the community.',
    href: '/skills',
    status: 'placeholder'
  },
  {
    title: 'Organisations',
    description: 'Find community organisations and volunteering groups.',
    href: '/organisations',
    status: 'placeholder'
  },
  {
    title: 'Blog',
    description: 'Read community news, stories, and updates.',
    href: '/blog'
  },
  {
    title: 'Resources',
    description: 'Browse shared documents, links, and community resources.',
    href: '/resources',
    status: 'placeholder'
  },
  {
    title: 'Marketplace',
    description: 'Browse marketplace offers, requests, courses, and local goods.',
    href: '/marketplace',
    status: 'placeholder'
  },
  {
    title: 'Jobs',
    description: 'Browse community opportunities and job vacancies when enabled.',
    href: '/jobs'
  },
  {
    title: 'Courses',
    description: 'Find learning opportunities and community courses.',
    href: '/courses',
    status: 'placeholder'
  },
  {
    title: 'Podcasts',
    description: 'Listen to community audio and podcast episodes.',
    href: '/podcasts',
    status: 'placeholder'
  },
  {
    title: 'Coupons',
    description: 'Find merchant coupons and local offers.',
    href: '/coupons',
    status: 'placeholder'
  },
  {
    title: 'Premium',
    description: 'Manage member premium features when enabled.',
    href: '/premium',
    status: 'placeholder'
  },
  {
    title: 'Ideation',
    description: 'Join challenges and contribute ideas for the community.',
    href: '/ideation',
    status: 'placeholder'
  },
  {
    title: 'Federation',
    description: 'Explore cross-community federation features.',
    href: '/federation',
    status: 'placeholder'
  },
  {
    title: 'Clubs',
    description: 'Browse club organisations when available in this community.',
    href: '/clubs',
    status: 'placeholder'
  },
];

function activeNavForPath(pathname = '/') {
  if (pathname === '/') return 'home';
  if (pathname.startsWith('/dashboard')) return 'dashboard';
  if (pathname.startsWith('/account')) return 'account';
  if (pathname.startsWith('/feed')) return 'feed';
  if (pathname.startsWith('/listings')) return 'listings';
  if (pathname.startsWith('/members')) return 'members';
  if (pathname.startsWith('/events')) return 'events';
  if (pathname.startsWith('/volunteering')) return 'volunteering';
  if (pathname.startsWith('/explore')) return 'explore';
  if (pathname.startsWith('/login')) return 'login';
  if (pathname.startsWith('/register')) return 'register';
  return '';
}

function buildNavItems({ isAuthenticated = false } = {}) {
  return navItems.filter((item) => {
    if (item.authenticatedOnly && !isAuthenticated) return false;
    if (item.anonymousOnly && isAuthenticated) return false;
    return true;
  });
}

function prefixLocalPath(pathname, prefix = '') {
  const path = typeof pathname === 'string' && pathname ? pathname : '/';
  if (!prefix || !path.startsWith('/') || path.startsWith('//')) return path;
  if (path === '/') return prefix;
  return `${prefix}${path}`;
}

function prefixNavItems(items, prefix) {
  return items.map((item) => ({
    ...item,
    href: prefixLocalPath(item.href, prefix)
  }));
}

function prefixFooterColumns(columns, prefix) {
  return columns.map((column) => ({
    ...column,
    links: column.links.map((link) => ({
      ...link,
      href: prefixLocalPath(link.href, prefix)
    }))
  }));
}

function buildShellLocals(req, isAuthenticated) {
  const tenantName = process.env.ACCESSIBLE_TENANT_NAME || serviceName;
  const currentLocale = typeof req.query.locale === 'string' ? req.query.locale : 'en';
  const routePrefix = req.accessibleRouting?.prefix || '';
  const visiblePath = req.originalUrl ? req.originalUrl.split('?')[0] : (req.path || '/');
  const currentPath = visiblePath || '/';
  const currentUrl = req.originalUrl || currentPath;
  const urlFor = (pathname) => prefixLocalPath(pathname, routePrefix);

  return {
    serviceName,
    phaseText,
    tenantName,
    tenantSlug: req.accessibleRouting?.tenantSlug || '',
    accessibleRoutePrefix: routePrefix,
    urlFor,
    alphaCurrentLocale: currentLocale,
    alphaLocaleOptions: localeOptions,
    alphaTextDirection: currentLocale === 'ar' ? 'rtl' : 'ltr',
    alphaNavItems: prefixNavItems(buildNavItems({ isAuthenticated }), routePrefix),
    alphaActiveNav: activeNavForPath(req.path),
    alphaFooterColumns: prefixFooterColumns(footerColumns, routePrefix),
    alphaExploreLinks: exploreLinks,
    currentPath,
    currentUrl,
    feedbackUrl,
    reportProblemUrl: `${urlFor('/report-a-problem')}?return=${encodeURIComponent(currentUrl)}`,
    cookieSettingsUrl: urlFor('/cookies'),
    mainSiteUrl: process.env.MAIN_FRONTEND_URL || 'https://app.project-nexus.ie',
    sourceCodeUrl,
    sharedAccessibleStatus: 'candidate_not_certified'
  };
}

module.exports = {
  activeNavForPath,
  buildNavItems,
  buildShellLocals,
  exploreLinks,
  footerColumns,
  localeOptions,
  phaseText,
  prefixLocalPath,
  serviceName
};
