// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

require('dotenv').config();

const express = require('express');
const nunjucks = require('nunjucks');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const flash = require('express-flash');
const helmet = require('helmet');
const morgan = require('morgan');
const { doubleCsrf } = require('csrf-csrf');
const path = require('path');
const { URL } = require('url');
const { getApiBaseUrl } = require('./lib/backend-contract');

const authRoutes = require('./routes/auth');
const listingsRoutes = require('./routes/listings');
const profileRoutes = require('./routes/profile');
const activityRoutes = require('./routes/activity');
const walletRoutes = require('./routes/wallet');
const messagesRoutes = require('./routes/messages');
const dashboardRoutes = require('./routes/dashboard');
const settingsRoutes = require('./routes/settings');
const connectionsRoutes = require('./routes/connections');
const membersRoutes = require('./routes/members');
const notificationsRoutes = require('./routes/notifications');
const groupsRoutes = require('./routes/groups');
const jobsRoutes = require('./routes/jobs');
const goalsRoutes = require('./routes/goals');
const coursesRoutes = require('./routes/courses');
const eventsRoutes = require('./routes/events');
const feedRoutes = require('./routes/feed');
const feedActionRoutes = require('./routes/feed-actions');
const marketplaceActionRoutes = require('./routes/marketplace-actions');
const marketplaceRoutes = require('./routes/marketplace');
const volunteeringActionRoutes = require('./routes/volunteering-actions');
const ideationRoutes = require('./routes/ideation');
const ideationActionRoutes = require('./routes/ideation-actions');
const groupExchangeRoutes = require('./routes/group-exchanges');
const groupExchangeActionRoutes = require('./routes/group-exchange-actions');
const matchesRoutes = require('./routes/matches');
const exchangeRoutes = require('./routes/exchanges');
const searchRoutes = require('./routes/search');
const reviewsRoutes = require('./routes/reviews');
const exploreRoutes = require('./routes/explore');
const staticPageRoutes = require('./routes/static-pages');
const kbRoutes = require('./routes/kb');
const supportRoutes = require('./routes/support');
const legalRoutes = require('./routes/legal');
const publicInfoRoutes = require('./routes/public-info');
const contactSupportRoutes = require('./routes/contact-support');
const onboardingPostRoutes = require('./routes/onboarding-posts');
const savedCollectionRoutes = require('./routes/saved-collections');
const savedSocialRoutes = require('./routes/saved-social');
const aiChatRoutes = require('./routes/ai-chat');
const skillsRoutes = require('./routes/skills');
const premiumRoutes = require('./routes/premium');
const couponsRoutes = require('./routes/coupons');
const achievementsRoutes = require('./routes/achievements');
const leaderboardRoutes = require('./routes/leaderboard');
const nexusScoreRoutes = require('./routes/nexus-score');
const resourcesRoutes = require('./routes/resources');
const blogPostRoutes = require('./routes/blog-posts');
const pollActionRoutes = require('./routes/poll-actions');
const clubsRoutes = require('./routes/clubs');
const podcastRoutes = require('./routes/podcasts');
const podcastActionRoutes = require('./routes/podcast-actions');
const federationRoutes = require('./routes/federation');
const federationActionRoutes = require('./routes/federation-actions');
const laravelPrepRoutes = require('./routes/laravel-prep-pages');
const { errorLogger, finalErrorHandler } = require('./lib/errorHandler');
const { ApiError, getExchangeConfig } = require('./lib/api');
const { generalLimiter, authLimiter, walletLimiter, formLimiter } = require('./lib/rateLimiter');
const { handleApiError } = require('./lib/routeHelpers');
const { buildShellLocals } = require('./lib/accessible-shell');
const { formatLocaleDate, translate, translateChoice } = require('./lib/localization');
const { getRequestLocale } = require('./lib/request-locale-context');
const { parseMultipartForm } = require('./middleware/multipart');
const { buildAccountLinks } = require('./lib/account-links');
const { localization } = require('./middleware/localization');
const { tenantFeatureGate } = require('./middleware/tenant-feature-gates');
const { tenantRouting } = require('./middleware/tenant-routing');
const { requestTenantContext } = require('./middleware/request-tenant-context');

const app = express();

const PORT = process.env.PORT || 3001;
const COOKIE_SECRET = process.env.COOKIE_SECRET;
const SESSION_SECRET = process.env.SESSION_SECRET || COOKIE_SECRET;
const NODE_ENV = process.env.NODE_ENV || 'development';
const ACCESSIBLE_COOKIE_NAME = 'nexus_accessible_cookie_consent';
const LEGACY_ALPHA_COOKIE_NAME = 'nexus_alpha_cookie_consent';
const ALPHA_COOKIE_MAX_AGE = 180 * 24 * 60 * 60 * 1000;

const HOME_MODULES = [
  { key: 'dashboard', titleKey: 'dashboard.title', descriptionKey: 'dashboard.description', href: '/dashboard', authRequired: true },
  { key: 'feed', titleKey: 'feed.title', descriptionKey: 'feed.description', href: '/feed', moduleKey: 'feed', defaultEnabled: true },
  { key: 'listings', titleKey: 'listings.title', descriptionKey: 'listings.description', href: '/listings', moduleKey: 'listings', defaultEnabled: false },
  { key: 'members', titleKey: 'members.title', descriptionKey: 'members.description', href: '/members', featureKey: 'connections' },
  { key: 'events', titleKey: 'events.title', descriptionKey: 'events.description', href: '/events', featureKey: 'events' },
  { key: 'volunteering', titleKey: 'volunteering.title', descriptionKey: 'volunteering.description', href: '/volunteering', featureKey: 'volunteering' },
  { key: 'messages', titleKey: 'messages.title', descriptionKey: 'messages.description', href: '/messages', authRequired: true, featureKey: 'direct_messaging' },
  { key: 'exchanges', titleKey: 'exchanges.title', descriptionKey: 'exchanges.description', href: '/exchanges', authRequired: true, moduleKey: 'listings', featureKey: 'exchange_workflow', defaultEnabled: false },
  { key: 'wallet', titleKey: 'wallet.title', descriptionKey: 'wallet.description', href: '/wallet', authRequired: true, moduleKey: 'wallet' },
  { key: 'profile', titleKey: 'nav.profile', descriptionKey: 'profile_settings.description', href: '/profile', authRequired: true }
];

if (!COOKIE_SECRET) {
  console.error('COOKIE_SECRET environment variable is required');
  process.exit(1);
}

// Configure Nunjucks
const nunjucksEnv = nunjucks.configure([
  path.join(__dirname, 'views'),
  path.join(__dirname, '..', 'node_modules', 'govuk-frontend', 'dist')
], {
  autoescape: true,
  express: app,
  watch: NODE_ENV === 'development'
});

// Custom Nunjucks filters
nunjucksEnv.addFilter('parseJson', (str) => {
  if (!str) return {};
  try {
    return JSON.parse(str);
  } catch {
    return {};
  }
});

nunjucksEnv.addFilter('formatDate', (dateStr) => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    const locale = getRequestLocale() || 'en';
    if (diffMins < 1) return translate(locale, 'govuk_alpha_connections.common.just_now');
    if (diffMins < 60) {
      return translateChoice(locale, 'govuk_alpha_connections.common.minutes_ago', diffMins, { count: diffMins });
    }
    if (diffHours < 24) {
      return translateChoice(locale, 'govuk_alpha_connections.common.hours_ago', diffHours, { count: diffHours });
    }
    if (diffDays < 7) {
      return translateChoice(locale, 'govuk_alpha_connections.common.days_ago', diffDays, { count: diffDays });
    }

    return formatLocaleDate(date, locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
});

nunjucksEnv.addFilter('formatEventDate', (dateStr) => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return formatLocaleDate(date, getRequestLocale() || 'en', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateStr;
  }
});

// Alias 'date' to formatDate for convenience
nunjucksEnv.addFilter('date', (dateStr) => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return formatLocaleDate(date, getRequestLocale() || 'en', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
});

nunjucksEnv.addFilter('abs', (num) => Math.abs(num || 0));

nunjucksEnv.addFilter('take', (arr, count) => {
  if (!arr || !Array.isArray(arr)) return [];
  return arr.slice(0, count);
});

nunjucksEnv.addFilter('nl2br', (str) => {
  if (!str) return '';
  // Escape HTML entities first to prevent XSS, then convert newlines to <br>
  const escaped = str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  return escaped.replace(/\n/g, '<br>');
});

app.set('view engine', 'njk');

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

app.use(tenantRouting);
app.use(requestTenantContext);

// Security headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // GOV.UK Frontend requires an inline script to detect JS support
      // Hash is for: document.body.className += ' js-enabled' + ('noModule' in HTMLScriptElement.prototype ? ' govuk-frontend-supported' : '');
      // challenges.cloudflare.com — Cloudflare Turnstile widget script.
      scriptSrc: ["'self'", "'sha256-GUQ5ad8JK5KmEWmROf3LZd9ge94daqNvd8xy9YS1iDw='", "https://challenges.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", new URL(getApiBaseUrl()).origin],
      fontSrc: ["'self'"],
      // challenges.cloudflare.com — Turnstile siteverify (server-side) +
      // browser-side widget telemetry posts back to its own origin.
      // api.pwnedpasswords.com — client-side HIBP k-anonymity check on the
      // register / reset-password forms.
      connectSrc: ["'self'", "https://challenges.cloudflare.com", "https://api.pwnedpasswords.com"],
      // frameSrc: Turnstile renders an iframe to challenges.cloudflare.com
      // to host the bot challenge UI. Was 'none' — that blocked the widget.
      frameSrc: ["https://challenges.cloudflare.com"],
      objectSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// Request logging
if (NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// Static assets (before rate limiter so static file requests don't count against limits)
// Add cache headers for better performance
const staticOptions = {
  maxAge: NODE_ENV === 'production' ? '1d' : 0,
  etag: true,
  lastModified: true
};

app.use('/css', express.static(path.join(__dirname, '..', 'public', 'css'), staticOptions));
app.use('/assets', express.static(
  path.join(__dirname, '..', 'node_modules', 'govuk-frontend', 'dist', 'govuk', 'assets'),
  staticOptions
));
// Serve custom JS from public/js first, then fallback to govuk-frontend
app.use('/js', express.static(path.join(__dirname, '..', 'public', 'js'), staticOptions));
app.use('/js', express.static(
  path.join(__dirname, '..', 'node_modules', 'govuk-frontend', 'dist', 'govuk'),
  staticOptions
));

// General rate limiting (see lib/rateLimiter.js for route-specific limits)
app.use(generalLimiter);

// Body parsing
app.use(express.urlencoded({
  extended: true,
  verify: (req, _res, buffer) => {
    req.rawUrlencodedBody = buffer.toString('utf8');
  }
}));
app.use(express.json());

// Cookies
app.use(cookieParser(COOKIE_SECRET));

// Session for flash messages
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 30 * 60 * 1000, // 30 minutes
    sameSite: 'lax'
  },
  name: 'nexus.sid'
}));

// Flash messages
app.use(flash());

// Laravel-first accessible locale negotiation. This must run after the session
// middleware so an explicit language choice can persist across requests.
app.use(localization);

// CSRF protection
const {
  generateToken,
  doubleCsrfProtection
} = doubleCsrf({
  getSecret: () => COOKIE_SECRET,
  cookieName: 'nexus.csrf',
  cookieOptions: {
    httpOnly: true,
    sameSite: 'lax',
    secure: NODE_ENV === 'production',
    signed: true
  },
  getTokenFromRequest: (req) => req.body._csrf || req.headers['x-csrf-token']
});

// Make CSRF token available to all views
app.use((req, res, next) => {
  req.csrfToken = () => generateToken(req, res);
  next();
});

// Add common variables to all views
app.use(async (req, res, next) => {
  // Check if user is authenticated
  const token = req.signedCookies.token;
  res.locals.isAuthenticated = !!token;
  Object.assign(res.locals, buildShellLocals(req, res.locals.isAuthenticated));

  const alphaCookieChoice = req.session ? req.session.alphaCookieChoice : '';
  if (alphaCookieChoice && req.session) {
    delete req.session.alphaCookieChoice;
  }

  res.locals.alphaCookieChoice = alphaCookieChoice || '';
  res.locals.alphaCookieConsent = req.cookies[ACCESSIBLE_COOKIE_NAME] || req.cookies[LEGACY_ALPHA_COOKIE_NAME] || '';
  res.locals.alphaHasCookieChoice = req.cookies[ACCESSIBLE_COOKIE_NAME] !== undefined
    || req.cookies[LEGACY_ALPHA_COOKIE_NAME] !== undefined;
  res.locals.showAlphaCookieBanner = !!alphaCookieChoice || !res.locals.alphaHasCookieChoice;

  // Make CSRF token available to all views
  res.locals.csrfToken = req.csrfToken ? req.csrfToken() : '';

  // Session timeout warning
  if (req.session && req.session.cookie) {
    const maxAge = req.session.cookie.maxAge;
    res.locals.sessionTimeout = maxAge ? Math.floor(maxAge / 1000 / 60) : null;
  }

  // Fetch notification and message counts for authenticated users
  if (token) {
    try {
      const { getNotificationUnreadCount, getUnreadCount } = require('./lib/api');
      const [notifResult, msgResult] = await Promise.all([
        getNotificationUnreadCount(token).catch(() => ({ unreadCount: 0 })),
        getUnreadCount(token).catch(() => ({ unreadCount: 0 }))
      ]);
      const notificationCounts = notifResult?.data || notifResult || {};
      const messageCounts = msgResult?.data || msgResult || {};
      res.locals.notificationCount = notificationCounts.unread
        || notificationCounts.total
        || notificationCounts.unreadCount
        || notificationCounts.unread_count
        || notificationCounts.count
        || 0;
      res.locals.unreadMessageCount = messageCounts.count
        || messageCounts.unreadCount
        || messageCounts.unread_count
        || 0;
    } catch {
      // Silently fail - don't break the page if counts fail
      res.locals.notificationCount = 0;
      res.locals.unreadMessageCount = 0;
    }
  }

  next();
});

app.use(tenantFeatureGate);

function normalizeTenantChooserCommunities(result) {
  const records = Array.isArray(result?.data)
    ? result.data
    : (Array.isArray(result) ? result : []);

  return records
    .filter((tenant) => tenant && tenant.id !== 1 && tenant.slug)
    .map((tenant) => {
      const slug = String(tenant.slug);
      return {
        id: tenant.id,
        name: tenant.name || slug,
        slug,
        tagline: tenant.tagline || '',
        href: `/${encodeURIComponent(slug)}/accessible`
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name, 'en-GB'));
}

function dataFrom(result) {
  return result?.data || result?.tenant || result || {};
}

function numberLabel(value, formatNumber) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return '0';
  if (typeof formatNumber === 'function') {
    return formatNumber(number, { maximumFractionDigits: 0 });
  }
  return new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 }).format(number);
}

function normalizeRequestHost(req) {
  const forwardedHost = String(req.headers['x-forwarded-host'] || '').split(',')[0].trim();
  const raw = String(forwardedHost || req.hostname || req.headers.host || '').trim().toLowerCase();
  if (!raw) return '';

  const withoutProtocol = raw.replace(/^https?:\/\//, '');
  const withoutPath = withoutProtocol.split('/')[0];
  const withoutPort = withoutPath.startsWith('[')
    ? withoutPath.replace(/^\[|\](?::\d+)?$/g, '')
    : withoutPath.split(':')[0];

  return withoutPort.replace(/^www\./, '');
}

function networkCommunityHref(item, req) {
  const rawUrl = String(item?.url || '').trim();
  if (!rawUrl) {
    return item?.slug ? `/${encodeURIComponent(String(item.slug))}` : '';
  }

  if (rawUrl.startsWith('/') && !rawUrl.startsWith('//')) {
    return rawUrl;
  }

  try {
    const parsed = new URL(rawUrl);
    const host = normalizeRequestHost(req);
    const parsedHost = parsed.hostname.toLowerCase().replace(/^www\./, '');
    if (host && parsedHost === host) {
      return `${parsed.pathname || '/'}${parsed.search || ''}${parsed.hash || ''}`;
    }
    return rawUrl;
  } catch {
    return item?.slug ? `/${encodeURIComponent(String(item.slug))}` : '';
  }
}

function normalizeNetworkCommunities(tenant, req) {
  const items = Array.isArray(tenant?.tenant_switcher?.items)
    ? tenant.tenant_switcher.items
    : [];

  return items
    .map((item) => ({
      name: item?.name || item?.slug || '',
      slug: item?.slug || '',
      tagline: item?.tagline || '',
      href: networkCommunityHref(item, req)
    }))
    .filter((item) => item.name && item.href);
}

function featureEnabled(tenant, key, fallback = true) {
  const features = tenant.features && typeof tenant.features === 'object' ? tenant.features : {};
  const modules = tenant.modules && typeof tenant.modules === 'object' ? tenant.modules : {};
  if (Object.prototype.hasOwnProperty.call(features, key)) return Boolean(features[key]);
  if (Object.prototype.hasOwnProperty.call(modules, key)) return Boolean(modules[key]);
  return fallback;
}

function buildHomeModules(tenant, isAuthenticated, t) {
  return HOME_MODULES.map((module) => {
    const fallback = module.defaultEnabled !== undefined ? module.defaultEnabled : true;
    const moduleEnabled = module.moduleKey
      ? featureEnabled(tenant, module.moduleKey, fallback)
      : true;
    const featureOn = module.featureKey
      ? featureEnabled(tenant, module.featureKey, fallback)
      : true;
    const tenantEnabled = moduleEnabled && featureOn;
    const needsSignIn = tenantEnabled && module.authRequired && !isAuthenticated;
    const available = tenantEnabled && (!module.authRequired || isAuthenticated);

    return {
      ...module,
      title: t(module.titleKey),
      description: t(module.descriptionKey),
      href: needsSignIn ? '/login?status=auth-required' : module.href,
      available,
      needsSignIn,
      linked: available || needsSignIn
    };
  });
}

function platformStatsOptionsForRequest(req, tenant) {
  const routing = req.accessibleRouting || {};
  if (routing.mode === 'custom-domain') {
    return { host: normalizeRequestHost(req) || tenant.accessible_domain || '' };
  }

  const slug = tenant.slug || routing.tenantSlug || '';
  return slug ? { slug } : {};
}

async function loadTenantHomeData(req, res) {
  const { ApiOfflineError, getPlatformStats, getTenantBootstrap } = require('./lib/api');
  const routedTenant = req.accessibleRouting?.tenant && typeof req.accessibleRouting.tenant === 'object'
    ? req.accessibleRouting.tenant
    : {};
  let tenant = routedTenant;

  if (!tenant.slug && req.accessibleRouting?.tenantSlug) {
    try {
      tenant = dataFrom(await getTenantBootstrap({ slug: req.accessibleRouting.tenantSlug }));
      req.accessibleRouting.tenant = tenant;
      Object.assign(res.locals, buildShellLocals(req, res.locals.isAuthenticated));
    } catch (error) {
      if (!(error instanceof ApiOfflineError)) {
        throw error;
      }
      tenant = { slug: req.accessibleRouting.tenantSlug, name: req.accessibleRouting.tenantSlug };
    }
  }

  let stats = {};
  try {
    stats = dataFrom(await getPlatformStats(platformStatsOptionsForRequest(req, tenant)));
  } catch (error) {
    if (!(error instanceof ApiOfflineError)) {
      throw error;
    }
  }

  const communityName = tenant.name || tenant.slug || req.accessibleRouting?.tenantSlug || res.locals.tenantName;
  const networkCommunities = normalizeNetworkCommunities(tenant, req);
  const usesNetworkLanding = networkCommunities.length > 0 || Number(tenant.id) === 1;
  const configuredHomeHeading = usesNetworkLanding ? tenant.seo?.h1_headline : '';
  const homeHeading = configuredHomeHeading || 'Accessible';
  const homeHeadingKey = configuredHomeHeading ? '' : 'home.title';
  const configuredHomeDescription = usesNetworkLanding ? tenant.seo?.hero_intro : '';
  const homeDescription = configuredHomeDescription || '';
  const homeDescriptionKey = configuredHomeDescription ? '' : 'home.description';

  return {
    tenant,
    communityName,
    homeHeading,
    homeHeadingKey,
    homeDescription,
    homeDescriptionKey,
    tagline: tenant.tagline || '',
    networkCommunities,
    stats: {
      members: numberLabel(stats.members, res.locals.formatLocaleNumber),
      hoursExchanged: numberLabel(stats.hours_exchanged ?? stats.hoursExchanged, res.locals.formatLocaleNumber),
      listings: numberLabel(stats.listings, res.locals.formatLocaleNumber),
      communities: numberLabel(stats.communities, res.locals.formatLocaleNumber)
    },
    modules: buildHomeModules(tenant, res.locals.isAuthenticated, res.locals.t)
  };
}

// Public routes (no CSRF needed for GET)
app.get('/', async (req, res) => {
  if (req.accessibleRouting?.mode) {
    const homeData = await loadTenantHomeData(req, res);
    return res.render('home', {
      title: 'Accessible',
      titleKey: 'home.title',
      activeNav: 'home',
      status: typeof req.query.status === 'string' ? req.query.status : '',
      ...homeData
    });
  }

  const { ApiOfflineError, getTenants } = require('./lib/api');

  try {
    const result = await getTenants({ includeMaster: false });
    return res.render('tenant-chooser', {
      title: 'Choose a community',
      activeNav: '',
      tenants: normalizeTenantChooserCommunities(result),
      tenantLoadError: false
    });
  } catch (error) {
    if (error instanceof ApiOfflineError) {
      return res.render('tenant-chooser', {
        title: 'Choose a community',
        activeNav: '',
        tenants: [],
        tenantLoadError: true
      });
    }

    return res.status(503).render('errors/503', { title: 'Service unavailable' });
  }
});

app.get('/health', (req, res) => {
  res.type('text/plain').send('OK');
});

// Session touch endpoint - called by timeout-warning.js to extend the session
// Touching this endpoint is enough to reset the express-session rolling window
app.post('/session/touch', doubleCsrfProtection, (req, res) => {
  // express-session resave:false means we must mark it dirty to reset maxAge
  if (req.session) {
    req.session.touch = Date.now();
  }
  res.json({ ok: true });
});

app.get('/cookies', (req, res) => {
  res.render('cookie-settings', {
    title: 'Cookies',
    activeNav: '',
    status: typeof req.query.status === 'string' ? req.query.status : '',
    analyticsOn: (req.cookies[ACCESSIBLE_COOKIE_NAME] || req.cookies[LEGACY_ALPHA_COOKIE_NAME]) === 'all'
  });
});

app.post('/cookie-consent', doubleCsrfProtection, (req, res) => {
  const choice = typeof req.body.cookies === 'string' ? req.body.cookies : '';
  const analyticsOn = choice === 'accept' || (choice === 'save' && req.body.analytics === 'yes');
  const cookieValue = analyticsOn ? 'all' : 'essential';

  res.cookie(ACCESSIBLE_COOKIE_NAME, cookieValue, {
    path: '/',
    maxAge: ALPHA_COOKIE_MAX_AGE,
    sameSite: 'lax',
    secure: NODE_ENV === 'production',
    httpOnly: false
  });

  if (choice === 'save') {
    return redirectTo(res, '/cookies?status=saved');
  }

  if (req.session) {
    req.session.alphaCookieChoice = analyticsOn ? 'accepted' : 'rejected';
  }

  const returnPath = safeLocalPath(req.body.return, '');
  if (!returnPath) {
    return redirectTo(res, '/');
  }

  return redirectTo(res, returnPath);
});

app.get('/account', async (req, res) => {
  const token = req.signedCookies?.token;

  if (!token) {
    return redirectTo(res, '/login?status=auth-required');
  }

  const tenant = req.accessibleRouting?.tenant && typeof req.accessibleRouting.tenant === 'object'
    ? req.accessibleRouting.tenant
    : {};
  let directMessagingEnabled = false;
  try {
    const exchangeConfig = dataFrom(await getExchangeConfig(token));
    directMessagingEnabled = exchangeConfig.direct_messaging_enabled === true;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      handleApiError(error, req, res, { redirectOn401: '/login?status=auth-required' });
      return undefined;
    }
    // Fail closed: Laravel Blade hides this card when broker messaging is off.
  }

  res.render('account', {
    title: 'My account',
    titleKey: 'account.title',
    activeNav: 'account',
    accountLinks: buildAccountLinks({
      tenant,
      unreadMessageCount: res.locals.unreadMessageCount,
      directMessagingEnabled,
      t: req.t || res.locals.t
    })
  });
});

app.use('/explore', exploreRoutes);

app.get('/volunteering', (req, res) => {
  const { callVolunteeringApi, getVolunteeringOpportunities } = require('./lib/api');
  const token = req.signedCookies.token || '';
  const selectedTab = token && req.query.tab === 'applications' ? 'applications' : 'opportunities';
  const applicationStatus = ['pending', 'approved', 'declined', 'withdrawn'].includes(req.query.app_status)
    ? req.query.app_status
    : '';
  const applicationCursor = typeof req.query.app_cursor === 'string' ? req.query.app_cursor.trim() : '';
  const volunteeringQuery = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const categoryId = typeof req.query.category_id === 'string' ? req.query.category_id.trim() : '';
  const cursor = typeof req.query.cursor === 'string' ? req.query.cursor.trim() : '';
  const remoteValue = typeof req.query.is_remote === 'string'
    ? req.query.is_remote
    : (typeof req.query.remote === 'string' ? req.query.remote : '');
  const isRemote = ['1', 'true', 'on', 'yes'].includes(String(remoteValue).toLowerCase());
  const filters = { per_page: 20 };

  if (volunteeringQuery) {
    filters.search = volunteeringQuery;
  }

  if (categoryId) {
    filters.category_id = categoryId;
  }

  if (isRemote) {
    filters.is_remote = true;
  }

  if (cursor) {
    filters.cursor = cursor;
  }

  const normalizeOpportunity = (opportunity) => {
    const organization = opportunity.organization && typeof opportunity.organization === 'object'
      ? opportunity.organization
      : {};
    const category = opportunity.category && typeof opportunity.category === 'object'
      ? opportunity.category
      : {};
    const description = opportunity.description || opportunity.summary || '';

    return {
      ...opportunity,
      organizationName: opportunity.org_name || opportunity.organisation_name || organization.name || '',
      categoryName: category.name || (typeof opportunity.category === 'string' ? opportunity.category : ''),
      summary: description.length > 220 ? `${description.slice(0, 217)}...` : description
    };
  };

  const buildLoadMoreHref = (nextCursor) => {
    const loadMoreParams = new URLSearchParams();
    if (volunteeringQuery) loadMoreParams.set('q', volunteeringQuery);
    if (categoryId) loadMoreParams.set('category_id', categoryId);
    if (isRemote) loadMoreParams.set('is_remote', '1');
    if (nextCursor) loadMoreParams.set('cursor', nextCursor);
    const queryString = loadMoreParams.toString();

    return queryString ? `/volunteering?${queryString}` : '';
  };

  const applicationsQuery = new URLSearchParams({ per_page: '10' });
  if (applicationStatus) applicationsQuery.set('status', applicationStatus);
  if (applicationCursor) applicationsQuery.set('cursor', applicationCursor);
  const applicationsPromise = selectedTab === 'applications'
    ? callVolunteeringApi(token, 'GET', `/applications?${applicationsQuery.toString()}`)
    : Promise.resolve({ data: [], meta: {} });

  Promise.all([getVolunteeringOpportunities(filters, token), applicationsPromise])
    .then(([result, applicationsResult]) => {
      const opportunities = Array.isArray(result?.data)
        ? result.data
        : (Array.isArray(result?.items) ? result.items : []);
      const meta = result?.meta && typeof result.meta === 'object' ? result.meta : {};
      const nextCursor = typeof meta.cursor === 'string' ? meta.cursor : '';
      const applications = Array.isArray(applicationsResult?.data)
        ? applicationsResult.data
        : (Array.isArray(applicationsResult?.items) ? applicationsResult.items : []);
      const normalizedApplications = applications.map((application) => ({
        ...application,
        appliedOnLabel: application?.created_at
          ? formatLocaleDate(new Date(application.created_at), getRequestLocale() || 'en', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          })
          : ''
      }));
      const applicationsMeta = applicationsResult?.meta && typeof applicationsResult.meta === 'object'
        ? applicationsResult.meta
        : {};
      const applicationsLoadMore = new URLSearchParams({ tab: 'applications' });
      if (applicationStatus) applicationsLoadMore.set('app_status', applicationStatus);
      if (applicationsMeta.cursor) applicationsLoadMore.set('app_cursor', applicationsMeta.cursor);

      res.render('volunteering', {
        title: res.locals.t('volunteering.title'),
        activeNav: 'volunteering',
        opportunities: opportunities.map(normalizeOpportunity),
        applications: normalizedApplications,
        applicationsMeta,
        applicationsLoadMoreHref: `/volunteering?${applicationsLoadMore.toString()}`,
        applicationStatus,
        selectedTab,
        status: typeof req.query.status === 'string' ? req.query.status : '',
        volunteeringQuery,
        categoryId,
        isRemote,
        error: false,
        hasMore: !!meta.has_more && !!nextCursor,
        loadMoreHref: buildLoadMoreHref(nextCursor),
        authRequired: !token,
        csrfToken: req.csrfToken ? req.csrfToken() : ''
      });
    })
    .catch(() => {
      res.render('volunteering', {
        title: res.locals.t('volunteering.title'),
        activeNav: 'volunteering',
        opportunities: [],
        applications: [],
        applicationsMeta: {},
        applicationsLoadMoreHref: '',
        applicationStatus,
        selectedTab,
        status: typeof req.query.status === 'string' ? req.query.status : '',
        volunteeringQuery,
        categoryId,
        isRemote,
        error: true,
        hasMore: false,
        loadMoreHref: '',
        authRequired: !token,
        csrfToken: req.csrfToken ? req.csrfToken() : ''
      });
    });
});

app.get('/volunteering/opportunities/:id(\\d+)', (req, res) => {
  const token = req.signedCookies.token || '';
  const { ApiError, getVolunteerOpportunity } = require('./lib/api');

  const normalizeOpportunity = (result) => {
    const opportunity = result?.data && typeof result.data === 'object' ? result.data : {};
    const organization = opportunity.organization && typeof opportunity.organization === 'object'
      ? opportunity.organization
      : {};
    const category = opportunity.category && typeof opportunity.category === 'object'
      ? opportunity.category
      : {};
    const organisationId = opportunity.organization_id || opportunity.organisation_id || organization.id || 0;
    const organisationName = opportunity.org_name || opportunity.organisation_name || organization.name || '';
    const shifts = Array.isArray(opportunity.shifts) ? opportunity.shifts : [];

    return {
      ...opportunity,
      organisationId,
      organisationName,
      categoryName: category.name || (typeof opportunity.category === 'string' ? opportunity.category : ''),
      shifts,
      hasApplied: !!opportunity.has_applied
    };
  };

  return getVolunteerOpportunity(req.params.id, token)
    .then((result) => {
      const opportunity = normalizeOpportunity(result);

      res.render('volunteer-opportunity', {
        title: opportunity.title || 'Volunteering opportunity',
        activeNav: 'volunteering',
        opportunity,
        opportunityId: req.params.id,
        authRequired: !token
      });
    })
    .catch((error) => {
      if (error instanceof ApiError && error.status === 404) {
        return res.status(404).render('errors/404', { title: 'Page not found' });
      }

      return res.status(503).render('errors/503', { title: 'Service unavailable' });
    });
});

function requireOrganisationAuth(req, res, next) {
  if (!req.signedCookies || !req.signedCookies.token) {
    return redirectTo(res, '/login?status=auth-required');
  }
  return next();
}

app.get('/organisations', requireOrganisationAuth, (req, res) => {
  const organisationsQuery = typeof req.query.q === 'string' ? req.query.q : '';
  const status = typeof req.query.status === 'string' ? req.query.status : '';

  const { getVolunteerOrganisations } = require('./lib/api');
  const filters = { per_page: 30 };
  if (organisationsQuery.trim()) {
    filters.search = organisationsQuery.trim();
  }

  getVolunteerOrganisations(filters)
    .then((result) => {
      const organisations = Array.isArray(result?.data) ? result.data : [];

      res.render('organisations', {
        title: 'Organisations',
        activeNav: 'explore',
        organisations,
        organisationsQuery,
        status,
        organisationsLoadFailed: false
      });
    })
    .catch(() => {
      res.render('organisations', {
        title: 'Organisations',
        activeNav: 'explore',
        organisations: [],
        organisationsQuery,
        status,
        organisationsLoadFailed: true
      });
    });
});

app.get('/organisations/browse', requireOrganisationAuth, (req, res) => {
  const organisationsQuery = typeof req.query.q === 'string' ? req.query.q : '';
  const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : '';
  const token = req.signedCookies.token;
  const { getMyVolunteerOrganisations, getVolunteerOrganisations } = require('./lib/api');
  const filters = { per_page: 20 };

  if (organisationsQuery.trim()) {
    filters.search = organisationsQuery.trim();
  }

  if (cursor.trim()) {
    filters.cursor = cursor.trim();
  }

  Promise.allSettled([
    getVolunteerOrganisations(filters),
    getMyVolunteerOrganisations(token, { per_page: 50 })
  ])
    .then(([directoryResult, mineResult]) => {
      if (directoryResult.status === 'rejected') {
        throw directoryResult.reason;
      }

      const result = directoryResult.value;
      const organisations = Array.isArray(result?.data) ? result.data : [];
      const meta = result?.meta && typeof result.meta === 'object' ? result.meta : {};
      const nextCursor = typeof meta.cursor === 'string' ? meta.cursor : '';
      const minePayload = mineResult.status === 'fulfilled' ? mineResult.value : {};
      const mine = Array.isArray(minePayload?.items)
        ? minePayload.items
        : (Array.isArray(minePayload?.data) ? minePayload.data : []);
      const manageableCount = mine.filter((organisation) => {
        const status = String(organisation.status || '');
        const role = String(organisation.member_role || organisation.role || '');
        return ['approved', 'active'].includes(status) && ['owner', 'admin'].includes(role);
      }).length;
      const loadMoreParams = new URLSearchParams();

      if (organisationsQuery.trim()) {
        loadMoreParams.set('q', organisationsQuery.trim());
      }

      if (nextCursor) {
        loadMoreParams.set('cursor', nextCursor);
      }

      const loadMoreQuery = loadMoreParams.toString();

      res.render('organisations-browse', {
        title: res.locals.t('govuk_alpha_organisations.browse.title'),
        activeNav: 'explore',
        organisations: organisations.map((organisation) => {
          const publicContract = organisation.public_contract && typeof organisation.public_contract === 'object'
            ? organisation.public_contract
            : {};
          const stats = publicContract.stats && typeof publicContract.stats === 'object'
            ? publicContract.stats
            : (organisation.stats && typeof organisation.stats === 'object' ? organisation.stats : {});
          const description = organisation.description || organisation.excerpt || '';
          const totalHours = Number(stats.total_hours || organisation.total_hours || 0);
          const averageRating = Number(stats.average_rating || organisation.average_rating || 0);

          return {
            ...organisation,
            description,
            summary: description.length > 160 ? `${description.slice(0, 157)}...` : description,
            opportunityCount: stats.opportunity_count || organisation.opportunity_count || 0,
            volunteerCount: stats.volunteer_count || organisation.volunteer_count || 0,
            totalHours,
            totalHoursLabel: res.locals.formatLocaleNumber(totalHours, {
              minimumFractionDigits: Number.isInteger(totalHours) ? 0 : 1,
              maximumFractionDigits: 1
            }),
            averageRating,
            averageRatingLabel: res.locals.formatLocaleNumber(averageRating, {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1
            }),
            hasWebsite: !!organisation.website
          };
        }),
        organisationsQuery,
        error: false,
        manageableCount,
        hasMore: !!meta.has_more && !!nextCursor,
        loadMoreHref: loadMoreQuery ? `/organisations/browse?${loadMoreQuery}` : ''
      });
    })
    .catch(() => {
      res.render('organisations-browse', {
        title: res.locals.t('govuk_alpha_organisations.browse.title'),
        activeNav: 'explore',
        organisations: [],
        organisationsQuery,
        error: true,
        manageableCount: 0,
        hasMore: false,
        loadMoreHref: ''
      });
    });
});

app.get('/organisations/register', requireOrganisationAuth, (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : '';
  const errorMap = {
    'org-name-invalid': {
      field: 'name',
      message: 'Enter an organisation name of at least 3 characters'
    },
    'org-description-invalid': {
      field: 'description',
      message: 'Enter a description of at least 20 characters'
    },
    'org-email-invalid': {
      field: 'email',
      message: 'Enter a valid contact email address'
    },
    'org-website-invalid': {
      field: 'website',
      message: 'Enter a valid website address starting with http:// or https://'
    },
    'org-terms-required': {
      field: 'agreed_terms',
      message: 'You must confirm and agree before registering'
    },
    'org-failed': {
      field: 'name',
      message: 'We could not register your organisation. Please check your details and try again.'
    }
  };
  const activeError = errorMap[status] || null;

  res.render('organisations-register', {
    title: 'Register an organisation',
    activeNav: 'explore',
    activeErrorField: activeError ? activeError.field : '',
    activeErrorMessage: activeError ? activeError.message : ''
  });
});

function trimBodyValue(body, field) {
  const value = body && typeof body[field] === 'string' ? body[field] : '';
  return value.trim();
}

function buildOrganisationRegistrationPayload(body) {
  return {
    name: trimBodyValue(body, 'name'),
    description: trimBodyValue(body, 'description'),
    contact_email: trimBodyValue(body, 'contact_email') || trimBodyValue(body, 'email'),
    website: trimBodyValue(body, 'website')
  };
}

function acceptedOrganisationTerms(value) {
  return ['1', 'on', 'true'].includes(String(value || '').toLowerCase());
}

function organisationRegistrationStatus(payload, agreedTerms) {
  if (payload.name.length < 3) return 'org-name-invalid';
  if (payload.description.length < 20) return 'org-description-invalid';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.contact_email)) return 'org-email-invalid';
  if (payload.website && !/^https?:\/\//i.test(payload.website)) return 'org-website-invalid';
  if (!agreedTerms) return 'org-terms-required';
  return '';
}

async function handleOrganisationRegistrationPost(req, res, options = {}) {
  const token = req.signedCookies.token;
  if (!token) {
    return redirectTo(res, '/login?status=auth-required');
  }

  const payload = buildOrganisationRegistrationPayload(req.body);
  const invalidStatus = organisationRegistrationStatus(
    payload,
    acceptedOrganisationTerms(req.body.agreed_terms)
  );

  if (invalidStatus) {
    const invalidRedirect = options.coarseInvalid
      ? '/organisations?status=org-invalid'
      : `/organisations/register?status=${invalidStatus}`;
    return redirectTo(res, invalidRedirect);
  }

  const { ApiOfflineError, createVolunteerOrganisation } = require('./lib/api');
  try {
    await createVolunteerOrganisation(token, {
      name: payload.name,
      description: payload.description,
      contact_email: payload.contact_email,
      website: payload.website || undefined
    });
  } catch (error) {
    if (error instanceof ApiOfflineError) {
      return res.status(503).render('errors/503', { title: 'Service unavailable' });
    }

    const failedRedirect = options.coarseInvalid
      ? '/organisations?status=org-failed'
      : '/organisations/register?status=org-failed';
    return redirectTo(res, failedRedirect);
  }

  return redirectTo(res, '/organisations?status=org-submitted');
}

app.post('/organisations', formLimiter, doubleCsrfProtection, (req, res) => {
  return handleOrganisationRegistrationPost(req, res, { coarseInvalid: true });
});

app.post('/organisations/register', formLimiter, doubleCsrfProtection, handleOrganisationRegistrationPost);

app.get('/organisations/manage', requireOrganisationAuth, (req, res) => {
  const token = req.signedCookies.token;
  const renderManage = ({ organisations = [], error = false, authRequired = false } = {}) => {
    const manageableOrganisations = organisations.filter((organisation) => {
      const status = String(organisation.status || '');
      const role = String(organisation.member_role || organisation.role || '');
      return ['approved', 'active'].includes(status) && ['owner', 'admin'].includes(role);
    });
    const pendingOrganisations = organisations.filter((organisation) => {
      const status = String(organisation.status || '');
      return status === 'pending';
    });

    res.render('organisations-manage', {
      title: 'Manage my organisations',
      activeNav: 'explore',
      manageableOrganisations,
      pendingOrganisations,
      error,
      authRequired
    });
  };

  if (!token) {
    return renderManage({ authRequired: true });
  }

  const { getMyVolunteerOrganisations } = require('./lib/api');
  return getMyVolunteerOrganisations(token, { per_page: 50 })
    .then((result) => {
      const organisations = Array.isArray(result?.items)
        ? result.items
        : (Array.isArray(result?.data) ? result.data : []);
      renderManage({ organisations });
    })
    .catch(() => {
      renderManage({ error: true });
    });
});

app.get('/organisations/:id(\\d+)/jobs', requireOrganisationAuth, (req, res) => {
  const token = req.signedCookies.token;
  const { ApiError, getOrganisationJobs, getVolunteerOrganisation } = require('./lib/api');

  const normalizeOrganisation = (result) => {
    const data = result?.data && typeof result.data === 'object' ? result.data : {};
    const publicContract = data.public_contract && typeof data.public_contract === 'object'
      ? data.public_contract
      : {};

    return {
      ...data,
      ...publicContract
    };
  };

  const normalizeJob = (job) => {
    const type = String(job.type || '');
    const typeLabels = {
      paid: 'Paid',
      volunteer: 'Volunteer',
      timebank: 'Time credits'
    };
    const typeTagClasses = {
      paid: 'govuk-tag--green',
      volunteer: 'govuk-tag--blue',
      timebank: 'govuk-tag--yellow'
    };

    return {
      ...job,
      typeLabel: typeLabels[type] || type,
      typeTagClass: typeTagClasses[type] || 'govuk-tag--blue'
    };
  };

  const renderJobs = ({ organisation, jobs = [], error = false, authRequired = false }) => {
    res.render('organisations-jobs', {
      title: `Job openings at ${organisation.name || 'Organisations'}`,
      activeNav: 'explore',
      organisation,
      jobs,
      error,
      authRequired
    });
  };

  return getVolunteerOrganisation(req.params.id)
    .then((result) => {
      const organisation = normalizeOrganisation(result);

      if (!token) {
        return renderJobs({ organisation, authRequired: true });
      }

      return getOrganisationJobs(req.params.id, token, { limit: 20 })
        .then((jobsResult) => {
          const jobs = Array.isArray(jobsResult?.items)
            ? jobsResult.items
            : (Array.isArray(jobsResult?.data) ? jobsResult.data : []);

          renderJobs({
            organisation,
            jobs: jobs.map(normalizeJob)
          });
        })
        .catch(() => {
          renderJobs({ organisation, error: true });
        });
    })
    .catch((error) => {
      if (error instanceof ApiError && error.status === 404) {
        return res.status(404).render('errors/404', { title: 'Page not found' });
      }

      return res.status(503).render('errors/503', { title: 'Service unavailable' });
    });
});

app.get('/organisations/opportunities/:id(\\d+)/apply', requireOrganisationAuth, (req, res) => {
  const token = req.signedCookies.token || '';
  const { ApiError, getVolunteerOpportunity } = require('./lib/api');

  const normalizeOpportunity = (result) => {
    const opportunity = result?.data && typeof result.data === 'object' ? result.data : {};
    const organization = opportunity.organization && typeof opportunity.organization === 'object'
      ? opportunity.organization
      : {};
    const organisationId = opportunity.organization_id || opportunity.organisation_id || organization.id || 0;
    const organisationName = opportunity.org_name || opportunity.organisation_name || organization.name || '';

    return {
      ...opportunity,
      organisationId,
      organisationName,
      hasApplied: !!opportunity.has_applied
    };
  };

  return getVolunteerOpportunity(req.params.id, token)
    .then((result) => {
      const opportunity = normalizeOpportunity(result);

      res.render('organisations-apply', {
        title: 'Apply to volunteer',
        activeNav: 'explore',
        opportunity,
        opportunityId: req.params.id,
        authRequired: !token
      });
    })
    .catch((error) => {
      if (error instanceof ApiError && error.status === 404) {
        return res.status(404).render('errors/404', { title: 'Page not found' });
      }

      return res.status(503).render('errors/503', { title: 'Service unavailable' });
    });
});

app.get('/organisations/:id(\\d+)', requireOrganisationAuth, (req, res) => {
  const token = req.signedCookies.token || '';
  if (!token) {
    return redirectTo(res, '/login?status=auth-required');
  }

  const {
    ApiError,
    getOrganisationOpportunities,
    getOrganisationReviews,
    getVolunteerOrganisation
  } = require('./lib/api');

  getVolunteerOrganisation(req.params.id)
    .then(async (result) => {
      const data = result?.data && typeof result.data === 'object' ? result.data : {};
      const publicContract = data.public_contract && typeof data.public_contract === 'object'
        ? data.public_contract
        : {};
      const stats = publicContract.stats && typeof publicContract.stats === 'object'
        ? publicContract.stats
        : (data.stats && typeof data.stats === 'object' ? data.stats : {});
      const organisation = {
        ...data,
        ...publicContract,
        stats
      };
      const website = typeof organisation.website === 'string' ? organisation.website.trim() : '';
      const websiteHref = website
        ? (/^https?:\/\//i.test(website) ? website : `https://${website}`)
        : '';
      const [opportunitiesResult, reviewsResult] = await Promise.allSettled([
        getOrganisationOpportunities(req.params.id, { per_page: 10 }),
        getOrganisationReviews(req.params.id)
      ]);
      const opportunitiesPayload = opportunitiesResult.status === 'fulfilled' ? opportunitiesResult.value : null;
      const reviewsPayload = reviewsResult.status === 'fulfilled' ? reviewsResult.value : null;
      const opportunities = Array.isArray(opportunitiesPayload?.data)
        ? opportunitiesPayload.data
        : (Array.isArray(opportunitiesPayload?.items) ? opportunitiesPayload.items : []);
      const reviewsData = reviewsPayload?.data && typeof reviewsPayload.data === 'object'
        ? reviewsPayload.data
        : {};
      const reviews = Array.isArray(reviewsData.reviews)
        ? reviewsData.reviews
        : (Array.isArray(reviewsPayload?.reviews) ? reviewsPayload.reviews : []);

      res.render('organisation-detail', {
        title: organisation.name || 'Organisations',
        activeNav: 'explore',
        organisation,
        orgStats: stats,
        orgOpportunities: opportunities.map((opportunity) => {
          const description = opportunity.description || '';
          return {
            ...opportunity,
            summary: description.length > 180 ? `${description.slice(0, 177)}...` : description
          };
        }),
        orgReviews: reviews,
        contactEmail: organisation.contact_email || organisation.email || '',
        website,
        websiteHref
      });
    })
    .catch((error) => {
      if (error instanceof ApiError && error.status === 404) {
        return res.status(404).render('errors/404', { title: 'Page not found' });
      }

      return res.status(503).render('errors/503', { title: 'Service unavailable' });
    });
});

app.use('/resources/upload', parseMultipartForm({ maxFileSize: 10 * 1024 * 1024 }));
app.use('/volunteering/credentials', parseMultipartForm({ maxFileSize: 10 * 1024 * 1024 }));
app.use('/onboarding/avatar', parseMultipartForm({ maxFileSize: 10 * 1024 * 1024 }));
app.use(
  '/settings/insurance',
  parseMultipartForm({ maxFileSize: 10 * 1024 * 1024 }),
  multipartStatusErrorRedirect('/settings/insurance', 'insurance-file-large', 'insurance-file-required')
);
app.use(
  '/profile/settings',
  parseMultipartForm({ maxFileSize: 10 * 1024 * 1024 }),
  multipartStatusErrorRedirect('/profile/settings', 'avatar-invalid', 'avatar-invalid')
);
app.use(
  ['/profile/safeguarding/vetting-review', '/profile/safeguarding/policy-review'],
  parseMultipartForm({ maxFileSize: 1024 }),
  safeguardingEmptyMultipartErrorRedirect
);
app.use('/feed/posts', parseMultipartForm({ maxFileSize: 5 * 1024 * 1024 }));
app.use('/marketplace/create', parseMultipartForm({ maxFileSize: 5 * 1024 * 1024 }));
app.use(/^\/marketplace\/\d+\/update$/, parseMultipartForm({ maxFileSize: 5 * 1024 * 1024 }));
app.use('/events/new', parseMultipartForm({ maxFileSize: 5 * 1024 * 1024 }));
app.use(/^\/events\/\d+\/edit$/, parseMultipartForm({ maxFileSize: 5 * 1024 * 1024 }));
app.use('/groups/new', parseMultipartForm({ maxFileSize: 8 * 1024 * 1024 }));
app.use(/^\/groups\/\d+\/edit$/, parseMultipartForm({ maxFileSize: 8 * 1024 * 1024 }));
app.use('/listings/new', parseMultipartForm({ maxFileSize: 25 * 1024 * 1024 }));
app.use(/^\/listings\/\d+\/edit$/, parseMultipartForm({ maxFileSize: 25 * 1024 * 1024 }));
app.use(/^\/messages\/\d+$/, parseMultipartForm({ maxFileSize: 10 * 1024 * 1024, multiples: true }));
app.use(/^\/messages\/\d+\/voice$/, parseMultipartForm({ maxFileSize: 10 * 1024 * 1024 }));
app.use(
  /^\/groups\/\d+\/image$/,
  parseMultipartForm({ maxFileSize: 8 * 1024 * 1024 }),
  groupMultipartErrorRedirect('image-failed', 'image-missing')
);
app.use(
  /^\/groups\/\d+\/files$/,
  parseMultipartForm({ maxFileSize: 25 * 1024 * 1024 }),
  groupMultipartErrorRedirect('file-too-large', 'file-missing')
);
app.use(/^\/podcasts\/studio\/\d+\/episodes$/, parseMultipartForm({ maxFileSize: 100 * 1024 * 1024 }));
app.use(/^\/jobs\/\d+\/apply$/, parseMultipartForm({ maxFileSize: 5 * 1024 * 1024 }));

app.use(doubleCsrfProtection, postOnly(formLimiter), contactSupportRoutes);
app.use('/jobs', doubleCsrfProtection, postOnly(formLimiter), jobsRoutes);
app.use('/podcasts', doubleCsrfProtection, podcastRoutes);
app.use('/marketplace', doubleCsrfProtection, marketplaceRoutes);
app.use('/courses', doubleCsrfProtection, postOnly(formLimiter), coursesRoutes);
app.use('/premium', doubleCsrfProtection, postOnly(formLimiter), premiumRoutes);
app.use('/coupons', doubleCsrfProtection, postOnly(formLimiter), couponsRoutes);
app.use('/federation', federationRoutes);
app.use('/blog', doubleCsrfProtection, postOnly(formLimiter), blogPostRoutes);
app.use('/polls', doubleCsrfProtection, postOnly(formLimiter), pollActionRoutes);
app.use('/clubs', doubleCsrfProtection, postOnly(formLimiter), clubsRoutes);
app.use('/resources', doubleCsrfProtection, postOnly(formLimiter), resourcesRoutes);
app.use('/chat', doubleCsrfProtection, postOnly(formLimiter), aiChatRoutes);
app.use('/skills', doubleCsrfProtection, postOnly(formLimiter), skillsRoutes);
app.use('/exchanges', doubleCsrfProtection, postOnly(formLimiter), exchangeRoutes);
app.use('/goals', doubleCsrfProtection, postOnly(formLimiter), goalsRoutes);
app.use('/ideation', doubleCsrfProtection, postOnly(formLimiter), ideationRoutes, ideationActionRoutes);
app.use('/group-exchanges', doubleCsrfProtection, postOnly(formLimiter), groupExchangeRoutes, groupExchangeActionRoutes);
app.use('/kb', kbRoutes);
app.use(supportRoutes);
app.use(legalRoutes);
app.use(publicInfoRoutes);
app.use(staticPageRoutes);

app.get('/service-unavailable', (req, res) => {
  res.status(503).render('errors/503', { title: 'Service unavailable' });
});

// Auth routes (with stricter rate limiting on POST)
app.get('/login', authRoutes);
app.post('/login', authLimiter, doubleCsrfProtection, authRoutes);
app.get('/login/two-factor', authRoutes);
app.post('/login/two-factor', authLimiter, doubleCsrfProtection, authRoutes);
app.post('/login/resend-verification', authLimiter, doubleCsrfProtection, authRoutes);
app.get('/register', authRoutes);
app.post('/register', authLimiter, doubleCsrfProtection, authRoutes);
app.post('/logout', doubleCsrfProtection, authRoutes);
app.get('/login/forgot-password', authRoutes);
app.post('/login/forgot-password', authLimiter, doubleCsrfProtection, authRoutes);
app.get('/password/reset', authRoutes);
app.post('/password/reset', authLimiter, doubleCsrfProtection, authRoutes);

// Rate limit only on state-changing methods (POST/PUT/DELETE), not GET
function postOnly(limiter) {
  return (req, res, next) => {
    if (req.method === 'GET' || req.method === 'HEAD') {
      return next();
    }
    return limiter(req, res, next);
  };
}

function safeLocalPath(input, fallback = '/') {
  const value = typeof input === 'string' ? input.trim() : '';
  if (value && value.startsWith('/') && !value.startsWith('//')) {
    return value;
  }
  return fallback;
}

function groupMultipartErrorRedirect(sizeStatus, invalidStatus) {
  return (error, req, res, next) => {
    const match = String(req.originalUrl || req.url || '').match(/\/groups\/(\d+)\/(image|files)(?:[?#]|$)/);
    if (!match) return next(error);

    const isSizeError = Number(error?.httpCode) === 413
      || Number(error?.code) === 1009
      || /max(?:imum)?\s*file\s*size|too large/i.test(String(error?.message || ''));
    const status = isSizeError ? sizeStatus : invalidStatus;
    return redirectTo(res, `/groups/${match[1]}/${match[2]}?status=${encodeURIComponent(status)}`);
  };
}

function multipartStatusErrorRedirect(pathname, sizeStatus, invalidStatus) {
  return (error, req, res, next) => { // eslint-disable-line no-unused-vars
    const isSizeError = Number(error?.httpCode) === 413
      || Number(error?.code) === 1009
      || /max(?:imum)?\s*file\s*size|too large/i.test(String(error?.message || ''));
    const status = isSizeError ? sizeStatus : invalidStatus;
    return redirectTo(res, `${pathname}?status=${encodeURIComponent(status)}`);
  };
}

function safeguardingEmptyMultipartErrorRedirect(error, req, res, next) { // eslint-disable-line no-unused-vars
  const status = String(req.originalUrl || req.url || '').includes('/vetting-review')
    ? 'vetting-review-evidence-prohibited'
    : 'safeguarding-policy-review-failed';
  return redirectTo(res, `/profile/settings?status=${status}#safeguarding`);
}

function redirectTo(res, pathname) {
  const urlFor = typeof res.locals.urlFor === 'function' ? res.locals.urlFor : (value) => value;
  return res.redirect(urlFor(pathname));
}

// Protected routes with CSRF and rate limiting
app.use('/dashboard', doubleCsrfProtection, dashboardRoutes);
app.use('/listings', doubleCsrfProtection, postOnly(formLimiter), listingsRoutes);
app.use('/profile', doubleCsrfProtection, profileRoutes);
app.use('/activity', doubleCsrfProtection, activityRoutes);
app.use('/wallet', doubleCsrfProtection, postOnly(walletLimiter), walletRoutes);
app.use('/messages', doubleCsrfProtection, postOnly(formLimiter), messagesRoutes);
app.use('/podcasts', doubleCsrfProtection, postOnly(formLimiter), podcastActionRoutes);
app.use('/connections', doubleCsrfProtection, postOnly(formLimiter), connectionsRoutes);
app.use('/members', doubleCsrfProtection, membersRoutes);
app.use('/notifications', doubleCsrfProtection, notificationsRoutes);
app.use('/settings', doubleCsrfProtection, settingsRoutes);
app.use('/groups', doubleCsrfProtection, postOnly(formLimiter), groupsRoutes);
app.use('/events', doubleCsrfProtection, postOnly(formLimiter), eventsRoutes);
app.use('/marketplace', doubleCsrfProtection, postOnly(formLimiter), marketplaceActionRoutes);
app.use('/volunteering', doubleCsrfProtection, postOnly(formLimiter), volunteeringActionRoutes);
app.use('/feed', doubleCsrfProtection, postOnly(formLimiter), feedActionRoutes);
app.use('/feed', doubleCsrfProtection, postOnly(formLimiter), feedRoutes);
app.use('/matches', doubleCsrfProtection, postOnly(formLimiter), matchesRoutes);
app.use('/achievements', doubleCsrfProtection, postOnly(formLimiter), achievementsRoutes);
app.use('/leaderboard', doubleCsrfProtection, leaderboardRoutes);
app.use('/nexus-score', doubleCsrfProtection, nexusScoreRoutes);
app.use('/onboarding', doubleCsrfProtection, postOnly(formLimiter), onboardingPostRoutes);
app.use('/me/collections', doubleCsrfProtection, postOnly(formLimiter), savedCollectionRoutes);
app.use('/search', doubleCsrfProtection, searchRoutes);
app.use('/reviews', doubleCsrfProtection, postOnly(formLimiter), reviewsRoutes);
app.use('/federation', doubleCsrfProtection, postOnly(formLimiter), federationActionRoutes);
app.use(doubleCsrfProtection, postOnly(formLimiter), savedSocialRoutes);
app.use(laravelPrepRoutes);

// CSRF error handler (must be before 404 handler since 404 is a catch-all)
app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN' || err.code === 'ERR_BAD_CSRF_TOKEN' || (err.message && err.message.includes('csrf'))) {
    return res.status(419).render('errors/419', { title: 'This page has expired' });
  }
  next(err);
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('errors/404', { title: 'Page not found' });
});

// Error logging middleware
app.use(errorLogger);

// Final error handler
app.use(finalErrorHandler);

// Process-level error handlers to prevent silent crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Only start listening if not in test mode
if (NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`NEXUS UK Frontend running at http://localhost:${PORT}`);
    console.log(`Environment: ${NODE_ENV}`);
  });
}

module.exports = app;
