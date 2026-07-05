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

const serviceName = 'Project NEXUS Community';

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
  { key: 'explore', label: 'Explore', href: '/explore' }
];

const footerColumns = [
  {
    key: 'platform',
    heading: 'Platform',
    links: [
      { label: 'Listings', href: '/listings' },
      { label: 'Members', href: '/members' },
      { label: 'Events', href: '/events' },
      { label: 'Explore', href: '/explore' }
    ]
  },
  {
    key: 'support',
    heading: 'Support',
    links: [
      { label: 'Contact', href: '/contact' },
      { label: 'About', href: '/about' },
      { label: 'Report a problem', href: '/contact' }
    ]
  },
  {
    key: 'legal',
    heading: 'Legal',
    links: [
      { label: 'Terms', href: '/terms' },
      { label: 'Privacy', href: '/privacy' }
    ]
  }
];

const exploreLinks = [
  {
    title: 'Exchanges',
    description: 'See your exchange requests, agreements, and time-credit activity.',
    href: '/listings'
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
    href: '/progress'
  },
  {
    title: 'Browse listings',
    description: 'Browse offers and requests from members in your community.',
    href: '/listings'
  },
  {
    title: 'Find members',
    description: 'Find members, view profiles, and build trusted connections.',
    href: '/members'
  },
  {
    title: 'Events',
    description: 'Find upcoming community events and activities.',
    href: '/events'
  },
  {
    title: 'Jobs',
    description: 'Browse community opportunities and job vacancies when enabled.',
    href: '/jobs'
  }
];

function activeNavForPath(pathname = '/') {
  if (pathname === '/') return 'home';
  if (pathname.startsWith('/dashboard')) return 'dashboard';
  if (pathname.startsWith('/feed')) return 'feed';
  if (pathname.startsWith('/listings')) return 'listings';
  if (pathname.startsWith('/members')) return 'members';
  if (pathname.startsWith('/events')) return 'events';
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

function buildShellLocals(req, isAuthenticated) {
  const tenantName = process.env.ACCESSIBLE_TENANT_NAME || serviceName;
  const currentLocale = typeof req.query.locale === 'string' ? req.query.locale : 'en';

  return {
    serviceName,
    tenantName,
    alphaCurrentLocale: currentLocale,
    alphaLocaleOptions: localeOptions,
    alphaTextDirection: currentLocale === 'ar' ? 'rtl' : 'ltr',
    alphaNavItems: buildNavItems({ isAuthenticated }),
    alphaActiveNav: activeNavForPath(req.path),
    alphaFooterColumns: footerColumns,
    alphaExploreLinks: exploreLinks,
    currentUrl: req.originalUrl || req.path,
    feedbackUrl: '/contact',
    mainSiteUrl: process.env.MAIN_FRONTEND_URL || 'https://app.project-nexus.ie',
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
  serviceName
};
