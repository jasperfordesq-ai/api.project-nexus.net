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
const crypto = require('crypto');

const authRoutes = require('./routes/auth');
const listingsRoutes = require('./routes/listings');
const profileRoutes = require('./routes/profile');
const walletRoutes = require('./routes/wallet');
const messagesRoutes = require('./routes/messages');
const dashboardRoutes = require('./routes/dashboard');
const settingsRoutes = require('./routes/settings');
const connectionsRoutes = require('./routes/connections');
const membersRoutes = require('./routes/members');
const notificationsRoutes = require('./routes/notifications');
const groupsRoutes = require('./routes/groups');
const eventsRoutes = require('./routes/events');
const feedRoutes = require('./routes/feed');
const reportsRoutes = require('./routes/reports');
const gamificationRoutes = require('./routes/gamification');
const searchRoutes = require('./routes/search');
const reviewsRoutes = require('./routes/reviews');
const adminRoutes = require('./routes/admin');
const exploreRoutes = require('./routes/explore');
const staticPageRoutes = require('./routes/static-pages');
const { errorLogger, finalErrorHandler } = require('./lib/errorHandler');
const { generalLimiter, authLimiter, walletLimiter, formLimiter } = require('./lib/rateLimiter');
const { getContributorGroups, getResearchFoundation } = require('./lib/contributors');
const { buildShellLocals } = require('./lib/accessible-shell');
const { legalDocuments, legalFallbacks } = require('./lib/legal-content');

const app = express();

const PORT = process.env.PORT || 3001;
const COOKIE_SECRET = process.env.COOKIE_SECRET;
const SESSION_SECRET = process.env.SESSION_SECRET || COOKIE_SECRET;
const NODE_ENV = process.env.NODE_ENV || 'development';

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
  watch: NODE_ENV !== 'production'
});

// Custom Nunjucks filters
nunjucksEnv.addFilter('parseJson', (str) => {
  if (!str) return {};
  try {
    return JSON.parse(str);
  } catch (e) {
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

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;

    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch (e) {
    return dateStr;
  }
});

nunjucksEnv.addFilter('formatEventDate', (dateStr) => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return dateStr;
  }
});

// Alias 'date' to formatDate for convenience
nunjucksEnv.addFilter('date', (dateStr) => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch (e) {
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
      imgSrc: ["'self'", "data:"],
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
app.use(express.urlencoded({ extended: true }));
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

app.use((req, res, next) => {
  const match = req.url.match(/^\/([A-Za-z0-9_-]+)\/alpha(?=\/|\?|$)/);

  if (!match) {
    return next();
  }

  const routePrefix = `/${match[1]}/alpha`;
  const localUrl = req.url.slice(routePrefix.length);

  req.accessibleTenantSlug = match[1];
  req.accessibleRoutePrefix = routePrefix;
  req.accessibleCurrentUrl = req.url;
  req.accessibleCurrentPath = req.url.split('?')[0] || routePrefix;
  req.url = localUrl === '' ? '/' : (localUrl.startsWith('?') ? `/${localUrl}` : localUrl);

  return next();
});

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
      res.locals.notificationCount = notifResult.unreadCount || notifResult.unread_count || 0;
      res.locals.unreadMessageCount = msgResult.unreadCount || msgResult.unread_count || 0;
    } catch (error) {
      // Silently fail - don't break the page if counts fail
      res.locals.notificationCount = 0;
      res.locals.unreadMessageCount = 0;
    }
  }

  next();
});

// Public routes (no CSRF needed for GET)
app.get('/', (req, res) => {
  res.render('home', { title: 'Home' });
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

app.get('/components', (req, res) => {
  res.render('components', { title: 'Components Demo' });
});

app.post('/cookie-consent', doubleCsrfProtection, (req, res) => {
  const isSettingsSave = req.body.cookies === 'save';
  const choice = req.body.cookies === 'reject' || (isSettingsSave && req.body.analytics !== 'yes') ? 'rejected' : 'accepted';
  const returnUrl = typeof req.body.return === 'string' && req.body.return.startsWith('/') && !req.body.return.startsWith('//')
    ? req.body.return
    : isSettingsSave ? `${prefixedLocalPath(req, '/cookies')}?status=saved` : prefixedLocalPath(req, '/');

  res.cookie('nexus_alpha_cookie_consent', choice, {
    maxAge: 365 * 24 * 60 * 60 * 1000,
    sameSite: 'lax',
    secure: NODE_ENV === 'production'
  });

  if (req.session) {
    req.session.alphaCookieChoice = choice;
  }

  res.redirect(returnUrl);
});

app.get('/cookies', (req, res) => {
  res.render('cookie-settings', {
    title: 'Cookie settings',
    status: req.query.status || ''
  });
});

const supportImpacts = [
  { value: 'blocked', label: 'I could not complete what I needed to do' },
  { value: 'major', label: 'It caused a major problem' },
  { value: 'minor', label: 'It caused a minor problem' },
  { value: 'cosmetic', label: 'It is a small display or wording problem' }
];

const contactSubjects = [
  { value: 'general', label: 'General' },
  { value: 'account', label: 'Account' },
  { value: 'technical', label: 'Technical problem' },
  { value: 'feedback', label: 'Feedback' },
  { value: 'other', label: 'Other' }
];

function safeLocalPath(value, fallback = '/') {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : fallback;
}

function prefixedLocalPath(req, pathValue) {
  const routePrefix = req.accessibleRoutePrefix || '';
  if (pathValue === '/') {
    return routePrefix || '/';
  }

  return `${routePrefix}${pathValue}`;
}

function buildReportReference() {
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  return `NXR-${date}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

function renderReportProblem(res, options = {}) {
  res.status(options.statusCode || 200).render('report-problem', {
    title: 'Report a problem with this page',
    pageUrl: options.pageUrl || '/',
    status: options.status || '',
    reference: options.reference || '',
    errors: options.errors || {},
    form: options.form || {},
    impacts: supportImpacts
  });
}

app.get('/report-a-problem', (req, res) => {
  const pageUrl = safeLocalPath(req.query.return, '/');

  if (!res.locals.isAuthenticated) {
    return res.redirect(`${prefixedLocalPath(req, '/contact')}?problem_url=${encodeURIComponent(pageUrl)}`);
  }

  return renderReportProblem(res, {
    pageUrl,
    status: req.query.status || '',
    reference: req.query.ref || ''
  });
});

app.post('/report-a-problem', doubleCsrfProtection, (req, res) => {
  if (!res.locals.isAuthenticated) {
    return res.redirect(`${prefixedLocalPath(req, '/login')}?status=auth-required`);
  }

  const form = {
    summary: String(req.body.summary || '').trim(),
    description: String(req.body.description || '').trim(),
    impact: String(req.body.impact || '')
  };
  const pageUrl = safeLocalPath(req.body.page_url, '/');
  const validImpacts = supportImpacts.map((impact) => impact.value);
  const errors = {};

  if (form.summary.length < 3 || form.summary.length > 180) {
    errors.summary = 'Summary must be between 3 and 180 characters.';
  }
  if (form.description.length < 10 || form.description.length > 5000) {
    errors.description = 'Description must be between 10 and 5000 characters.';
  }
  if (!validImpacts.includes(form.impact)) {
    errors.impact = 'Choose how this problem affected you.';
  }

  if (Object.keys(errors).length > 0) {
    return renderReportProblem(res, {
      statusCode: 400,
      pageUrl,
      status: 'invalid',
      errors,
      form
    });
  }

  const reference = buildReportReference();
  return res.redirect(`${prefixedLocalPath(req, '/report-a-problem')}?return=${encodeURIComponent(pageUrl)}&status=sent&ref=${encodeURIComponent(reference)}`);
});

app.get('/privacy', (req, res) => {
  res.render('privacy', { title: 'Privacy policy' });
});

app.get('/terms', (req, res) => {
  res.render('terms', { title: 'Terms and conditions' });
});

function renderContact(res, options = {}) {
  res.status(options.statusCode || 200).render('contact', {
    title: 'Contact us',
    status: options.status || '',
    errors: options.errors || {},
    form: options.form || {},
    subjects: contactSubjects
  });
}

app.get('/contact', (req, res) => {
  const problemUrl = safeLocalPath(req.query.problem_url, '');
  const form = problemUrl
    ? {
        subject: 'technical',
        message: `I want to report a problem with this page: ${problemUrl}\n\n`
      }
    : {};

  renderContact(res, {
    status: req.query.status || '',
    form
  });
});

app.post('/contact', doubleCsrfProtection, (req, res) => {
  const form = {
    name: String(req.body.name || '').trim(),
    email: String(req.body.email || '').trim(),
    subject: String(req.body.subject || '').trim() || 'general',
    message: String(req.body.message || '').trim()
  };
  const errors = {};

  if (form.name === '') {
    errors.name = 'Enter your name.';
  }
  if (form.email === '' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Enter an email address in the correct format.';
  }
  if (form.message === '') {
    errors.message = 'Enter a message.';
  }

  if (Object.keys(errors).length > 0) {
    return renderContact(res, {
      statusCode: 400,
      status: 'contact-validation',
      errors,
      form
    });
  }

  return res.redirect(`${prefixedLocalPath(req, '/contact')}?status=contact-sent`);
});

app.get('/about', (req, res) => {
  const groups = getContributorGroups();
  const researchFoundation = getResearchFoundation();
  // Filter acknowledgements to exclude research foundation (shown separately)
  const otherAcknowledgements = groups.acknowledgements.filter(
    a => a.role !== 'Research Foundation'
  );
  res.render('about', {
    title: 'About',
    groups,
    researchFoundation,
    otherAcknowledgements
  });
});

app.use('/explore', exploreRoutes);

app.get('/account', (req, res) => {
  res.render('account', {
    title: 'My account',
    activeNav: 'account'
  });
});

app.get('/faq', (req, res) => {
  res.render('faq', {
    title: 'Frequently asked questions',
    activeNav: 'faq'
  });
});

app.get('/help', (req, res) => {
  res.render('help', {
    title: 'Help centre',
    activeNav: 'help',
    searchQuery: typeof req.query.q === 'string' ? req.query.q : '',
    contactHref: prefixedLocalPath(req, '/contact')
  });
});

app.get('/kb', (req, res) => {
  res.render('kb-index', {
    title: 'Knowledge base',
    activeNav: 'kb',
    searchQuery: typeof req.query.q === 'string' ? req.query.q : ''
  });
});

app.get('/blog', (req, res) => {
  res.render('blog-index', {
    title: 'Blog',
    activeNav: 'blog',
    searchQuery: typeof req.query.q === 'string' ? req.query.q : ''
  });
});

app.get('/volunteering', (req, res) => {
  res.render('volunteering', {
    title: 'Volunteering',
    activeNav: 'volunteering',
    searchQuery: typeof req.query.q === 'string' ? req.query.q : '',
    isRemote: req.query.is_remote === '1',
    organisationsHref: prefixedLocalPath(req, '/organisations'),
    hoursHref: prefixedLocalPath(req, '/volunteering/hours'),
    accessibilityHref: prefixedLocalPath(req, '/volunteering/accessibility'),
    certificatesHref: prefixedLocalPath(req, '/volunteering/certificates'),
    waitlistHref: prefixedLocalPath(req, '/volunteering/waitlist'),
    swapsHref: prefixedLocalPath(req, '/volunteering/swaps'),
    groupSignupsHref: prefixedLocalPath(req, '/volunteering/group-signups'),
    expensesHref: prefixedLocalPath(req, '/volunteering/expenses'),
    donationsHref: prefixedLocalPath(req, '/volunteering/donations')
  });
});

app.get('/skills', (req, res) => {
  res.render('skills', {
    title: 'Skills directory',
    activeNav: 'skills',
    skillQuery: typeof req.query.skill === 'string' ? req.query.skill : ''
  });
});

app.get('/exchanges', (req, res) => {
  const allowedTabs = ['all', 'active', 'needs_confirmation', 'completed'];
  const requestedTab = typeof req.query.tab === 'string' ? req.query.tab : '';
  const activeTab = allowedTabs.includes(requestedTab) ? requestedTab : 'all';

  res.render('exchanges', {
    title: 'Exchanges',
    activeNav: 'explore',
    activeTab,
    exchangeTabs: [
      { key: 'all', label: 'All' },
      { key: 'active', label: 'Active' },
      { key: 'needs_confirmation', label: 'Needs confirmation' },
      { key: 'completed', label: 'Completed' }
    ]
  });
});

app.get('/group-exchanges', (req, res) => {
  const allowedStates = ['', 'draft', 'pending', 'active', 'completed', 'cancelled'];
  const requestedState = typeof req.query.state === 'string' ? req.query.state : '';
  const exchangeState = allowedStates.includes(requestedState) ? requestedState : '';

  res.render('group-exchanges', {
    title: 'Group exchanges',
    activeNav: 'group_exchanges',
    exchangeState,
    status: typeof req.query.status === 'string' ? req.query.status : '',
    createHref: prefixedLocalPath(req, '/group-exchanges/new'),
    filterTabs: [
      { value: '', label: 'All' },
      { value: 'draft', label: 'Draft' },
      { value: 'pending', label: 'Awaiting approval' },
      { value: 'active', label: 'Active' },
      { value: 'completed', label: 'Completed' },
      { value: 'cancelled', label: 'Cancelled' }
    ]
  });
});

app.get('/polls', (req, res) => {
  res.render('polls', {
    title: 'Polls',
    activeNav: 'explore',
    pollsMine: req.query.mine === '1',
    pollsCategory: typeof req.query.category === 'string' ? req.query.category : '',
    status: typeof req.query.status === 'string' ? req.query.status : ''
  });
});

app.get('/achievements', (req, res) => {
  res.render('achievements', {
    title: 'Achievements',
    activeNav: 'achievements',
    status: typeof req.query.status === 'string' ? req.query.status : '',
    achievementProfile: {
      level: 0,
      levelName: '',
      xp: 0,
      badgesCount: 0,
      levelProgressPercent: 0,
      atMaxLevel: false
    },
    dailyReward: {
      canClaim: true,
      streak: 0,
      nextXp: 5,
      rewardXp: 5
    },
    challenges: [],
    earnedBadges: [],
    badgeProgress: []
  });
});

app.get('/legal', (req, res) => {
  res.render('legal-hub', {
    title: 'Legal',
    activeNav: 'legal',
    legalDocuments: legalDocuments.map((document) => ({
      ...document,
      href: prefixedLocalPath(req, document.path)
    }))
  });
});

const legalDocumentRoutes = {
  '/legal/terms': 'terms',
  '/legal/privacy': 'privacy',
  '/legal/cookies': 'cookies',
  '/legal/community-guidelines': 'community_guidelines',
  '/legal/acceptable-use': 'acceptable_use'
};

function renderLegalDocument(req, res) {
  const docType = legalDocumentRoutes[req.path];
  const fallback = legalFallbacks[docType];

  return res.render('legal-document', {
    title: fallback.title,
    activeNav: 'legal',
    docType,
    fallback: {
      ...fallback,
      intro: fallback.intro.replace(':name', res.locals.tenantName)
    },
    legalHubHref: prefixedLocalPath(req, '/legal'),
    contactHref: prefixedLocalPath(req, '/contact')
  });
}

app.get('/legal/terms', renderLegalDocument);
app.get('/legal/privacy', renderLegalDocument);
app.get('/legal/cookies', renderLegalDocument);
app.get('/legal/community-guidelines', renderLegalDocument);
app.get('/legal/acceptable-use', renderLegalDocument);

app.get('/features', (req, res) => {
  res.render('features', {
    title: 'Features',
    activeNav: 'features',
    guideHref: prefixedLocalPath(req, '/guide')
  });
});

app.get('/guide', (req, res) => {
  res.render('guide', {
    title: 'How timebanking works',
    activeNav: 'guide',
    registerHref: prefixedLocalPath(req, '/register'),
    listingsHref: prefixedLocalPath(req, '/listings'),
    walletHref: prefixedLocalPath(req, '/wallet')
  });
});

app.get('/accessibility', (req, res) => {
  res.render('accessibility', {
    title: 'Accessibility statement',
    activeNav: 'accessibility',
    legalHubUrl: prefixedLocalPath(req, '/legal'),
    contactHref: prefixedLocalPath(req, '/contact')
  });
});

app.get('/trust-and-safety', (req, res) => {
  res.render('trust-safety', {
    title: 'Trust and safety',
    activeNav: 'trust-safety',
    contactHref: prefixedLocalPath(req, '/contact'),
    guidelinesHref: prefixedLocalPath(req, '/legal/community-guidelines')
  });
});

app.use(staticPageRoutes);

app.get('/service-unavailable', (req, res) => {
  res.status(503).render('errors/503', { title: 'Service unavailable' });
});

// Auth routes (with stricter rate limiting on POST)
app.get('/login', authRoutes);
app.post('/login', authLimiter, doubleCsrfProtection, authRoutes);
app.get('/register', authRoutes);
app.post('/register', authLimiter, doubleCsrfProtection, authRoutes);
app.get('/logout', authRoutes);
app.post('/logout', doubleCsrfProtection, authRoutes);
app.get('/forgot-password', authRoutes);
app.post('/forgot-password', authLimiter, doubleCsrfProtection, authRoutes);
app.get('/reset-password', authRoutes);
app.post('/reset-password', authLimiter, doubleCsrfProtection, authRoutes);
app.post('/verify-2fa', authLimiter, doubleCsrfProtection, authRoutes);

// Rate limit only on state-changing methods (POST/PUT/DELETE), not GET
function postOnly(limiter) {
  return (req, res, next) => {
    if (req.method === 'GET' || req.method === 'HEAD') {
      return next();
    }
    return limiter(req, res, next);
  };
}

// Protected routes with CSRF and rate limiting
app.use('/dashboard', doubleCsrfProtection, dashboardRoutes);
app.use('/listings', doubleCsrfProtection, postOnly(formLimiter), listingsRoutes);
app.use('/profile', doubleCsrfProtection, profileRoutes);
app.use('/wallet', doubleCsrfProtection, postOnly(walletLimiter), walletRoutes);
app.use('/messages', doubleCsrfProtection, postOnly(formLimiter), messagesRoutes);
app.use('/connections', doubleCsrfProtection, postOnly(formLimiter), connectionsRoutes);
app.use('/members', doubleCsrfProtection, membersRoutes);
app.use('/notifications', doubleCsrfProtection, notificationsRoutes);
app.use('/settings', doubleCsrfProtection, settingsRoutes);
app.use('/groups', doubleCsrfProtection, postOnly(formLimiter), groupsRoutes);
app.use('/events', doubleCsrfProtection, postOnly(formLimiter), eventsRoutes);
app.use('/feed', doubleCsrfProtection, postOnly(formLimiter), feedRoutes);
app.use('/reports', doubleCsrfProtection, postOnly(formLimiter), reportsRoutes);
app.use('/progress', doubleCsrfProtection, gamificationRoutes);
app.use('/search', doubleCsrfProtection, searchRoutes);
app.use('/reviews', doubleCsrfProtection, postOnly(formLimiter), reviewsRoutes);
app.use('/admin', doubleCsrfProtection, adminRoutes);

// CSRF error handler (must be before 404 handler since 404 is a catch-all)
app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN' || err.code === 'ERR_BAD_CSRF_TOKEN' || (err.message && err.message.includes('csrf'))) {
    return res.status(403).render('errors/403', {
      title: 'Forbidden',
      message: 'Your session has expired. Please try again.'
    });
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
