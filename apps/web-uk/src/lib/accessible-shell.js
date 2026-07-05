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

const accountLinks = [
  {
    title: 'Wallet',
    description: 'View your time-credit balance, transactions, donations, and transfers.',
    href: '/wallet'
  },
  {
    title: 'Messages',
    description: 'Read and send direct messages with your community contacts.',
    href: '/messages',
    badgeKey: 'unreadMessageCount'
  },
  {
    title: 'Connections',
    description: 'Manage connection requests and people you are connected with.',
    href: '/connections'
  },
  {
    title: 'Notifications',
    description: 'Review unread notifications and recent account activity.',
    href: '/notifications'
  },
  {
    title: 'Reviews',
    description: 'See reviews you have given or received through community activity.',
    href: '/reviews'
  },
  {
    title: 'Activity',
    description: 'See your recent actions and community participation history.',
    href: '/activity'
  },
  {
    title: 'Saved',
    description: 'Return to saved listings, events, members, and resources.',
    href: '/saved'
  },
  {
    title: 'Jobs',
    description: 'Manage saved jobs, opportunities, and talent profile activity.',
    href: '/jobs'
  },
  {
    title: 'Matches',
    description: 'Review suggested listing and member matches for your community.',
    href: '/matches'
  },
  {
    title: 'Group exchanges',
    description: 'Manage group exchange requests, participants, and confirmations.',
    href: '/group-exchanges'
  },
  {
    title: 'Achievements',
    description: 'Track badges, challenges, rewards, and gamification progress.',
    href: '/achievements'
  },
  {
    title: 'Leaderboard',
    description: 'View community leaderboard progress when gamification is enabled.',
    href: '/leaderboard'
  },
  {
    title: 'NEXUS score',
    description: 'Review the score signals used for your community participation.',
    href: '/nexus-score'
  },
  {
    title: 'Profile',
    description: 'Check and update the public details attached to your account.',
    href: '/profile'
  },
  {
    title: 'Settings',
    description: 'Manage profile settings, notifications, privacy, and account preferences.',
    href: '/profile/settings'
  },
  {
    title: 'Linked accounts',
    description: 'Review account-linking requests and permissions when enabled.',
    href: '/settings/linked-accounts'
  },
  {
    title: 'Appearance',
    description: 'Choose accessible appearance preferences when enabled.',
    href: '/settings/appearance'
  }
];

const faqItems = [
  {
    question: 'What is a time credit?',
    answer: 'A time credit is one hour of your time. You earn a credit for every hour you give, and spend credits to receive help from others.'
  },
  {
    question: 'Is everyone\'s time worth the same?',
    answer: 'Yes. One hour always equals one time credit, whatever the task. This is what makes timebanking fair.'
  },
  {
    question: 'How do I start?',
    answer: 'Create a listing to offer a skill or ask for help, browse what others are offering, and connect with members near you.'
  },
  {
    question: 'How do I send credits to someone?',
    answer: 'Open your wallet, search for the member, choose an amount and send. Credits move immediately.'
  },
  {
    question: 'Is my information private?',
    answer: 'You control what other members can see in your privacy settings, and you can export or delete your data at any time.'
  }
];

const accessibilityFeatures = [
  {
    title: 'Keyboard navigation',
    description: 'Full keyboard support, including a skip link, visible focus indicators, and a logical tab order.'
  },
  {
    title: 'Visual accessibility',
    description: 'A minimum 4.5:1 text contrast ratio, resizable text, and no information conveyed by colour alone.'
  },
  {
    title: 'Screen reader support',
    description: 'Semantic HTML, ARIA labels where needed, and meaningful alternative text for images.'
  },
  {
    title: 'Zoom and responsive layout',
    description: 'Content adapts to all screen sizes and supports up to 200% zoom without loss of functionality.'
  }
];

const featureItems = [
  'Find members who can help with what you need, and offer your own skills in return.',
  'Earn and spend time credits - one hour always equals one credit.',
  'Discover and host community events.',
  'Find volunteering opportunities and log your hours.',
  'Join groups of members with shared interests.',
  'Earn badges and see how you are contributing.'
];

const guideSteps = [
  {
    title: 'Give your time',
    body: 'Offer a skill or lend a hand to another member - anything from teaching a language to helping in a garden.'
  },
  {
    title: 'Earn time credits',
    body: 'For every hour you give, you earn one time credit, recorded in your wallet.'
  },
  {
    title: 'Spend your credits',
    body: 'Use your credits to receive help from anyone in the community, whenever you need it.'
  }
];

const trustSafetySections = [
  {
    heading: 'How exchanges work',
    intro: 'Exchanges are arranged between members. Here is the usual flow.',
    items: [
      'Find a member offering what you need, or post a request describing what you are looking for.',
      'Message them through the platform to agree the details - time, place, and what is involved.',
      'Complete the exchange. You only meet in person if you both want to.',
      'Log the hours. Both members confirm - that is the receipt.',
      'Time credits transfer automatically. One hour of help is one time credit, no matter what skill was shared.'
    ]
  },
  {
    heading: 'What we do',
    items: [
      'Verify every member\'s email address at registration, and offer optional photo-ID verification with a Verified Member badge.',
      'Show reviews and ratings on member profiles so the community can see who has been a reliable exchange partner.',
      'Ask every member to accept our community guidelines and acceptable use policy, and to keep to them.',
      'Give every listing, message, and profile a report button that goes straight to coordinators.',
      'Have human coordinators who can mediate, support, and step in when something goes wrong.',
      'Connect with other timebanks across regions through federation, so reputation can travel with you.'
    ]
  },
  {
    heading: 'What we do not do',
    intro: 'It is important to be clear about the limits of the service.',
    items: [
      'We do not vet, train, or certify members for specific services. We are not a recruitment agency.',
      'We do not provide insurance cover for the work members do for each other.',
      'We do not supervise exchanges or act as anyone\'s employer or service provider.',
      'We do not guarantee any specific outcome, level of skill, or punctuality. Reviews are how the community keeps itself accountable.'
    ]
  },
  {
    heading: 'Precautions you should take',
    intro: 'A few sensible steps keep everyone safer.',
    items: [
      'Get to know someone through the platform before you meet.',
      'Meet in a public place where you can, especially the first time.',
      'Tell someone you trust where you are going and when.',
      'Trust your instincts - if something does not feel right, stop and tell us.'
    ]
  },
  {
    heading: 'Background checks and vetting',
    intro: 'Some services need vetting by law.',
    items: [
      'Some exchanges, for example childcare, elderly care, or support for vulnerable adults, may legally require a background check or vetting under local law.',
      'Members offering these services are responsible for holding current, valid vetting where their jurisdiction requires it.',
      'You are entitled to ask to see vetting before you agree to an exchange.',
      'The platform does not hold vetting on members\' behalf and does not verify it.'
    ]
  },
  {
    heading: 'Insurance',
    items: [
      'The platform does not provide insurance for exchanges.',
      'Members are responsible for their own insurance where they need it.',
      'You remain legally responsible for your own actions during an exchange.',
      'Check whether your existing cover applies before taking part in higher-risk activities.'
    ]
  },
  {
    heading: 'Dispute resolution',
    intro: 'If something goes wrong, here is how we help.',
    items: [
      'Talk to the other member first - most issues are simple misunderstandings.',
      'If you cannot resolve it, report it and a coordinator will look into it.',
      'Coordinators can mediate, adjust logged hours, or take action on accounts.',
      'Serious matters may be escalated outside the platform where necessary.'
    ]
  },
  {
    heading: 'Your responsibilities',
    intro: 'As a member of the community you agree to:',
    items: [
      'Be honest about what you offer and what you need.',
      'Treat other members with respect.',
      'Turn up when you say you will, or give as much notice as you can.',
      'Log hours accurately and confirm exchanges promptly.',
      'Report anything unsafe or against the guidelines.'
    ]
  },
  {
    heading: 'Your rights',
    items: [
      'To be treated with respect and kept safe.',
      'To control your personal information and privacy settings.',
      'To report concerns and have them taken seriously.',
      'To leave the community and delete your account at any time.'
    ]
  }
];

function activeNavForPath(pathname = '/') {
  if (pathname === '/') return 'home';
  if (pathname.startsWith('/account')) return 'account';
  if (pathname.startsWith('/dashboard')) return 'dashboard';
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

function prefixLocalHref(href, routePrefix = '') {
  if (!routePrefix || typeof href !== 'string' || !href.startsWith('/') || href.startsWith('//')) {
    return href;
  }

  return href === '/' ? routePrefix : `${routePrefix}${href}`;
}

function prefixLinks(items, routePrefix = '') {
  return items.map((item) => ({
    ...item,
    href: prefixLocalHref(item.href, routePrefix)
  }));
}

function prefixFooterColumns(columns, routePrefix = '') {
  return columns.map((column) => ({
    ...column,
    links: prefixLinks(column.links, routePrefix)
  }));
}

function buildLocaleQueryParams(query = {}) {
  return Object.entries(query)
    .filter(([key, value]) => key !== 'locale' && ['string', 'number', 'boolean'].includes(typeof value))
    .map(([key, value]) => ({ key, value: String(value) }));
}

function buildShellLocals(req, isAuthenticated) {
  const tenantName = process.env.ACCESSIBLE_TENANT_NAME || serviceName;
  const currentLocale = typeof req.query.locale === 'string' ? req.query.locale : 'en';
  const routePrefix = req.accessibleRoutePrefix || '';
  const currentPath = req.accessibleCurrentPath || req.path || '/';
  const currentUrl = req.accessibleCurrentUrl || req.originalUrl || currentPath;
  const cookieConsent = req.cookies ? req.cookies.nexus_alpha_cookie_consent : '';
  const cookieChoice = req.session ? req.session.alphaCookieChoice : '';

  if (req.session && req.session.alphaCookieChoice) {
    delete req.session.alphaCookieChoice;
  }

  return {
    serviceName,
    phaseText,
    tenantName,
    alphaCurrentLocale: currentLocale,
    alphaLocaleOptions: localeOptions,
    alphaLocaleQueryParams: buildLocaleQueryParams(req.query),
    alphaTextDirection: currentLocale === 'ar' ? 'rtl' : 'ltr',
    alphaRoutePrefix: routePrefix,
    alphaRouteTenantSlug: req.accessibleTenantSlug || '',
    alphaNavItems: prefixLinks(buildNavItems({ isAuthenticated }), routePrefix),
    alphaActiveNav: activeNavForPath(req.path),
    alphaFooterColumns: prefixFooterColumns(footerColumns, routePrefix),
    alphaExploreLinks: prefixLinks(exploreLinks, routePrefix),
    alphaAccountLinks: prefixLinks(accountLinks, routePrefix),
    alphaFaqItems: faqItems,
    alphaAccessibilityFeatures: accessibilityFeatures,
    alphaFeatureItems: featureItems,
    alphaGuideSteps: guideSteps,
    alphaTrustSafetySections: trustSafetySections,
    currentPath,
    currentUrl,
    alphaCookieChoice: cookieChoice,
    alphaCookieConsent: cookieConsent,
    alphaShowCookieBanner: !!cookieChoice || !cookieConsent,
    homeUrl: prefixLocalHref('/', routePrefix),
    accountUrl: prefixLocalHref('/account', routePrefix),
    loginUrl: prefixLocalHref('/login', routePrefix),
    registerUrl: prefixLocalHref('/register', routePrefix),
    logoutUrl: prefixLocalHref('/logout', routePrefix),
    cookieConsentUrl: prefixLocalHref('/cookie-consent', routePrefix),
    feedbackUrl,
    reportProblemUrl: `${prefixLocalHref('/report-a-problem', routePrefix)}?return=${encodeURIComponent(currentUrl)}`,
    cookieSettingsUrl: prefixLocalHref('/cookies', routePrefix),
    mainSiteUrl: process.env.MAIN_FRONTEND_URL || 'https://app.project-nexus.ie',
    sourceCodeUrl,
    sharedAccessibleStatus: 'candidate_not_certified'
  };
}

module.exports = {
  activeNavForPath,
  buildNavItems,
  buildShellLocals,
  accountLinks,
  accessibilityFeatures,
  exploreLinks,
  featureItems,
  faqItems,
  footerColumns,
  guideSteps,
  localeOptions,
  phaseText,
  serviceName,
  trustSafetySections
};
