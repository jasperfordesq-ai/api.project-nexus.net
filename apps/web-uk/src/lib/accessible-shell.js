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
const { createTranslator, isSupportedLocale } = require('./localization');

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
  { key: 'dashboard', label: 'Dashboard', href: '/dashboard', authenticatedOnly: true, moduleKey: 'dashboard' },
  { key: 'feed', label: 'Feed', href: '/feed', moduleKey: 'feed' },
  { key: 'listings', label: 'Listings', href: '/listings', moduleKey: 'listings' },
  { key: 'members', label: 'Members', href: '/members', featureKey: 'connections' },
  { key: 'events', label: 'Events', href: '/events', featureKey: 'events' },
  { key: 'volunteering', label: 'Volunteering', href: '/volunteering', featureKey: 'volunteering' },
  { key: 'explore', label: 'Explore', href: '/explore', authenticatedOnly: true }
];

const footerColumns = [
  {
    key: 'platform',
    heading: 'Platform',
    links: [
      { key: 'listings', label: 'Listings', href: '/listings', moduleKey: 'listings' },
      { key: 'members', label: 'Members', href: '/members', featureKey: 'connections' },
      { key: 'events', label: 'Events', href: '/events', featureKey: 'events' },
      { key: 'volunteering', label: 'Volunteering', href: '/volunteering', featureKey: 'volunteering' },
      { key: 'blog', label: 'Blog', href: '/blog', featureKey: 'blog' }
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

const featureDefaults = {
  events: true,
  groups: true,
  gamification: true,
  goals: true,
  blog: true,
  resources: true,
  caring_community: false,
  volunteering: true,
  exchange_workflow: true,
  organisations: true,
  federation: true,
  connections: true,
  reviews: true,
  polls: true,
  job_vacancies: true,
  ideation_challenges: true,
  direct_messaging: true,
  group_exchanges: true,
  search: true,
  ai_chat: true,
  marketplace: false,
  merchant_coupons: false,
  message_translation: true,
  member_premium: false,
  ai_agents: false,
  partner_api: false,
  fadp_compliance: false,
  local_advertising: false,
  regional_analytics: false,
  newsletter: true,
  identity_verification: true,
  maps: false,
  courses: false,
  podcasts: false
};

const moduleDefaults = {
  listings: true,
  wallet: true,
  messages: true,
  dashboard: true,
  feed: true,
  notifications: true,
  profile: true,
  settings: true
};

const exploreLinks = [
  {
    title: 'Exchanges',
    description: 'See your exchange requests, agreements, and time-credit activity.',
    href: '/exchanges',
    moduleKey: 'listings',
    workflowKey: 'exchange_workflow',
    status: 'placeholder'
  },
  {
    title: 'AI assistant',
    description: 'Get accessible guidance and help with community tasks when enabled.',
    href: '/chat',
    featureKey: 'ai_chat',
    status: 'placeholder'
  },
  {
    title: 'Polls',
    description: 'Vote in community polls and see active questions.',
    href: '/polls',
    featureKey: 'polls'
  },
  {
    title: 'Search',
    description: 'Search across people, listings, events, groups, and community content.',
    href: '/search'
  },
  {
    title: 'Groups',
    description: 'Find groups, join conversations, and take part in shared activities.',
    href: '/groups',
    featureKey: 'groups'
  },
  {
    title: 'Goals',
    description: 'Track goals, progress, and community achievements.',
    href: '/goals',
    featureKey: 'goals'
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
    featureKey: 'volunteering',
    status: 'placeholder'
  },
  {
    title: 'Blog',
    description: 'Read community news, stories, and updates.',
    href: '/blog',
    featureKey: 'blog'
  },
  {
    title: 'Resources',
    description: 'Browse shared documents, links, and community resources.',
    href: '/resources',
    featureKey: 'resources',
    status: 'placeholder'
  },
  {
    title: 'Marketplace',
    description: 'Browse marketplace offers, requests, courses, and local goods.',
    href: '/marketplace',
    featureKey: 'marketplace',
    status: 'placeholder'
  },
  {
    title: 'Jobs',
    description: 'Browse community opportunities and job vacancies when enabled.',
    href: '/jobs',
    featureKey: 'job_vacancies'
  },
  {
    title: 'Courses',
    description: 'Find learning opportunities and community courses.',
    href: '/courses',
    featureKey: 'courses',
    status: 'placeholder'
  },
  {
    title: 'Podcasts',
    description: 'Listen to community audio and podcast episodes.',
    href: '/podcasts',
    featureKey: 'podcasts',
    status: 'placeholder'
  },
  {
    title: 'Coupons',
    description: 'Find merchant coupons and local offers.',
    href: '/coupons',
    featureKey: 'merchant_coupons',
    status: 'placeholder'
  },
  {
    title: 'Premium',
    description: 'Manage member premium features when enabled.',
    href: '/premium',
    featureKey: 'member_premium',
    status: 'placeholder'
  },
  {
    title: 'Ideation',
    description: 'Join challenges and contribute ideas for the community.',
    href: '/ideation',
    featureKey: 'ideation_challenges',
    status: 'placeholder'
  },
  {
    title: 'Federation',
    description: 'Explore cross-community federation features.',
    href: '/federation',
    featureKey: 'federation',
    status: 'placeholder'
  },
  {
    title: 'Clubs',
    description: 'Browse club organisations when available in this community.',
    href: '/clubs',
    tenantKey: 'has_clubs',
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

function flagEnabled(tenant = {}, key, source, fallback = true) {
  if (!key) return true;
  const primary = tenant[source] && typeof tenant[source] === 'object' ? tenant[source] : {};
  const secondarySource = source === 'modules' ? 'features' : 'modules';
  const secondary = tenant[secondarySource] && typeof tenant[secondarySource] === 'object'
    ? tenant[secondarySource]
    : {};

  if (Object.prototype.hasOwnProperty.call(primary, key)) return Boolean(primary[key]);
  if (Object.prototype.hasOwnProperty.call(secondary, key)) return Boolean(secondary[key]);
  if (source === 'features' && Object.prototype.hasOwnProperty.call(featureDefaults, key)) {
    return featureDefaults[key];
  }
  if (source === 'modules' && Object.prototype.hasOwnProperty.call(moduleDefaults, key)) {
    return moduleDefaults[key];
  }
  return fallback;
}

function itemEnabledForTenant(item, tenant = {}) {
  if (item.tenantKey && !tenant[item.tenantKey]) return false;
  if (item.workflowKey && !workflowEnabled(tenant, item.workflowKey)) return false;
  if (item.moduleKey) return flagEnabled(tenant, item.moduleKey, 'modules', true);
  if (item.featureKey) return flagEnabled(tenant, item.featureKey, 'features', true);
  return true;
}

function buildNavItems({ isAuthenticated = false, tenant = {} } = {}) {
  return navItems.filter((item) => {
    if (item.authenticatedOnly && !isAuthenticated) return false;
    if (item.anonymousOnly && isAuthenticated) return false;
    if (!itemEnabledForTenant(item, tenant)) return false;
    return true;
  });
}

function buildFooterColumns({ tenant = {} } = {}) {
  return footerColumns
    .map((column) => {
      if (column.key !== 'platform') return column;
      return {
        ...column,
        links: column.links.filter((link) => itemEnabledForTenant(link, tenant))
      };
    })
    .filter((column) => column.key !== 'platform' || column.links.length > 0);
}

function workflowEnabled(tenant = {}, key) {
  if (Object.prototype.hasOwnProperty.call(tenant, key)) return Boolean(tenant[key]);
  const brokerControls = tenant.config?.broker_controls || tenant.broker_controls || {};
  const workflow = brokerControls[key] || brokerControls.exchange_workflow || {};
  if (Object.prototype.hasOwnProperty.call(workflow, 'enabled')) return Boolean(workflow.enabled);
  return false;
}

function buildExploreLinks({ tenant = {} } = {}) {
  return exploreLinks.filter((item) => itemEnabledForTenant(item, tenant));
}

function prefixLocalPath(pathname, prefix = '') {
  const path = typeof pathname === 'string' && pathname ? pathname : '/';
  if (!prefix || !path.startsWith('/') || path.startsWith('//')) return path;
  if (
    path === prefix
    || path.startsWith(`${prefix}/`)
    || path.startsWith(`${prefix}?`)
    || path.startsWith(`${prefix}#`)
  ) {
    return path;
  }
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

function localizeNavItems(items, t) {
  return items.map((item) => ({
    ...item,
    label: t(`nav.${item.key}`)
  }));
}

function localizeFooterColumns(columns, t) {
  return columns.map((column) => ({
    ...column,
    heading: t(`footer.columns.${column.key}.heading`),
    links: column.links.map((link) => ({
      ...link,
      label: t(`footer.columns.${column.key}.${link.key}`)
    }))
  }));
}

function buildLanguageQueryParams(query = {}) {
  return Object.entries(query)
    .filter(([key, value]) => (
      key !== 'locale'
      && (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
    ))
    .map(([name, value]) => ({
      name,
      value: String(value)
    }));
}

function buildShellLocals(req, isAuthenticated) {
  const routedTenant = req.accessibleRouting?.tenant && typeof req.accessibleRouting.tenant === 'object'
    ? req.accessibleRouting.tenant
    : {};
  const tenantName = routedTenant.name || process.env.ACCESSIBLE_TENANT_NAME || serviceName;
  const queryLocale = typeof req.query?.locale === 'string' ? req.query.locale : '';
  const currentLocale = isSupportedLocale(req.locale)
    ? req.locale
    : (isSupportedLocale(queryLocale) ? queryLocale : 'en');
  const t = typeof req.t === 'function' ? req.t : createTranslator(currentLocale);
  const routePrefix = req.accessibleRouting?.prefix || '';
  const visiblePath = req.originalUrl ? req.originalUrl.split('?')[0] : (req.path || '/');
  const currentPath = visiblePath || '/';
  const currentUrl = req.originalUrl || currentPath;
  const urlFor = (pathname) => prefixLocalPath(pathname, routePrefix);

  return {
    serviceName: t('service_name'),
    phaseText: t('phase'),
    tenantName,
    tenantSlug: req.accessibleRouting?.tenantSlug || '',
    accessibleRoutePrefix: routePrefix,
    urlFor,
    htmlLang: currentLocale,
    htmlDirection: currentLocale === 'ar' ? 'rtl' : 'ltr',
    t,
    alphaCurrentLocale: currentLocale,
    alphaLocaleOptions: localeOptions,
    alphaLanguageQueryParams: buildLanguageQueryParams(req.query),
    alphaTextDirection: currentLocale === 'ar' ? 'rtl' : 'ltr',
    alphaNavItems: prefixNavItems(
      localizeNavItems(buildNavItems({ isAuthenticated, tenant: routedTenant }), t),
      routePrefix
    ),
    alphaActiveNav: activeNavForPath(req.path),
    alphaFooterColumns: prefixFooterColumns(
      localizeFooterColumns(buildFooterColumns({ tenant: routedTenant }), t),
      routePrefix
    ),
    alphaExploreLinks: prefixNavItems(buildExploreLinks({ tenant: routedTenant }), routePrefix),
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
  buildFooterColumns,
  buildExploreLinks,
  buildLanguageQueryParams,
  buildNavItems,
  buildShellLocals,
  exploreLinks,
  featureDefaults,
  flagEnabled,
  footerColumns,
  localeOptions,
  moduleDefaults,
  phaseText,
  prefixLocalPath,
  serviceName
};
