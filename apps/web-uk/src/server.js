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
const matchesRoutes = require('./routes/matches');
const exchangeRoutes = require('./routes/exchanges');
const gamificationRoutes = require('./routes/gamification');
const searchRoutes = require('./routes/search');
const reviewsRoutes = require('./routes/reviews');
const adminRoutes = require('./routes/admin');
const exploreRoutes = require('./routes/explore');
const staticPageRoutes = require('./routes/static-pages');
const contactSupportRoutes = require('./routes/contact-support');
const onboardingPostRoutes = require('./routes/onboarding-posts');
const savedCollectionRoutes = require('./routes/saved-collections');
const savedSocialRoutes = require('./routes/saved-social');
const aiChatRoutes = require('./routes/ai-chat');
const laravelPrepRoutes = require('./routes/laravel-prep-pages');
const { errorLogger, finalErrorHandler } = require('./lib/errorHandler');
const { generalLimiter, authLimiter, walletLimiter, formLimiter } = require('./lib/rateLimiter');
const { getContributorGroups, getResearchFoundation } = require('./lib/contributors');
const { buildShellLocals } = require('./lib/accessible-shell');

const app = express();

const PORT = process.env.PORT || 3001;
const COOKIE_SECRET = process.env.COOKIE_SECRET;
const SESSION_SECRET = process.env.SESSION_SECRET || COOKIE_SECRET;
const NODE_ENV = process.env.NODE_ENV || 'development';
const ALPHA_COOKIE_NAME = 'nexus_alpha_cookie_consent';
const ALPHA_COOKIE_MAX_AGE = 180 * 24 * 60 * 60 * 1000;

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
  res.locals.alphaCookieConsent = req.cookies[ALPHA_COOKIE_NAME] || '';
  res.locals.alphaHasCookieChoice = req.cookies[ALPHA_COOKIE_NAME] !== undefined;
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

app.get('/privacy', (req, res) => {
  res.render('privacy', { title: 'Privacy policy' });
});

app.get('/terms', (req, res) => {
  res.render('terms', { title: 'Terms and conditions' });
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

app.get('/cookies', (req, res) => {
  res.render('cookie-settings', {
    title: 'Cookies',
    activeNav: '',
    status: typeof req.query.status === 'string' ? req.query.status : '',
    analyticsOn: req.cookies[ALPHA_COOKIE_NAME] === 'all'
  });
});

app.post('/cookie-consent', doubleCsrfProtection, (req, res) => {
  const choice = typeof req.body.cookies === 'string' ? req.body.cookies : '';
  const analyticsOn = choice === 'accept' || (choice === 'save' && req.body.analytics === 'yes');
  const cookieValue = analyticsOn ? 'all' : 'essential';

  res.cookie(ALPHA_COOKIE_NAME, cookieValue, {
    path: '/',
    maxAge: ALPHA_COOKIE_MAX_AGE,
    sameSite: 'lax',
    secure: NODE_ENV === 'production',
    httpOnly: false
  });

  if (choice === 'save') {
    return res.redirect('/cookies?status=saved');
  }

  if (req.session) {
    req.session.alphaCookieChoice = analyticsOn ? 'accepted' : 'rejected';
  }

  return res.redirect(safeLocalPath(req.body.return, '/'));
});

app.get('/account', (req, res) => {
  const token = req.signedCookies.token;

  if (!token) {
    return res.redirect('/login');
  }

  res.render('account', {
    title: 'My account',
    activeNav: 'account',
    accountLinks: [
      {
        title: 'Wallet',
        description: 'View your time-credit balance and history, and send credits to other members.',
        href: '/wallet'
      },
      {
        title: 'Messages',
        description: 'Read and send direct messages with members of this community.',
        href: '/messages',
        badge: res.locals.unreadMessageCount || 0
      },
      {
        title: 'Connections',
        description: 'Accept or decline connection requests and manage your network.',
        href: '/connections'
      },
      {
        title: 'Notifications',
        description: 'Read service notifications and community updates.',
        href: '/notifications'
      },
      {
        title: 'My profile',
        description: 'View and edit how you appear to other members.',
        href: '/profile'
      },
      {
        title: 'Account settings',
        description: 'Email, password, two-factor sign in, language, notifications and privacy.',
        href: '/settings'
      }
    ]
  });
});

app.use('/explore', exploreRoutes);

app.get('/volunteering', (req, res) => {
  const { getVolunteeringOpportunities } = require('./lib/api');
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

  getVolunteeringOpportunities(filters)
    .then((result) => {
      const opportunities = Array.isArray(result?.data)
        ? result.data
        : (Array.isArray(result?.items) ? result.items : []);
      const meta = result?.meta && typeof result.meta === 'object' ? result.meta : {};
      const nextCursor = typeof meta.cursor === 'string' ? meta.cursor : '';

      res.render('volunteering', {
        title: 'Volunteering',
        activeNav: 'volunteering',
        opportunities: opportunities.map(normalizeOpportunity),
        volunteeringQuery,
        categoryId,
        isRemote,
        error: false,
        hasMore: !!meta.has_more && !!nextCursor,
        loadMoreHref: buildLoadMoreHref(nextCursor),
        authRequired: !req.signedCookies.token
      });
    })
    .catch(() => {
      res.render('volunteering', {
        title: 'Volunteering',
        activeNav: 'volunteering',
        opportunities: [],
        volunteeringQuery,
        categoryId,
        isRemote,
        error: true,
        hasMore: false,
        loadMoreHref: '',
        authRequired: !req.signedCookies.token
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

app.get('/organisations', (req, res) => {
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

app.get('/organisations/browse', (req, res) => {
  const organisationsQuery = typeof req.query.q === 'string' ? req.query.q : '';
  const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : '';
  const { getVolunteerOrganisations } = require('./lib/api');
  const filters = { per_page: 20 };

  if (organisationsQuery.trim()) {
    filters.search = organisationsQuery.trim();
  }

  if (cursor.trim()) {
    filters.cursor = cursor.trim();
  }

  getVolunteerOrganisations(filters)
    .then((result) => {
      const organisations = Array.isArray(result?.data) ? result.data : [];
      const meta = result?.meta && typeof result.meta === 'object' ? result.meta : {};
      const nextCursor = typeof meta.cursor === 'string' ? meta.cursor : '';
      const loadMoreParams = new URLSearchParams();

      if (organisationsQuery.trim()) {
        loadMoreParams.set('q', organisationsQuery.trim());
      }

      if (nextCursor) {
        loadMoreParams.set('cursor', nextCursor);
      }

      const loadMoreQuery = loadMoreParams.toString();

      res.render('organisations-browse', {
        title: 'Browse organisations',
        activeNav: 'explore',
        organisations: organisations.map((organisation) => {
          const publicContract = organisation.public_contract && typeof organisation.public_contract === 'object'
            ? organisation.public_contract
            : {};
          const stats = publicContract.stats && typeof publicContract.stats === 'object'
            ? publicContract.stats
            : (organisation.stats && typeof organisation.stats === 'object' ? organisation.stats : {});
          const description = organisation.description || organisation.excerpt || '';

          return {
            ...organisation,
            description,
            summary: description.length > 160 ? `${description.slice(0, 157)}...` : description,
            opportunityCount: stats.opportunity_count || organisation.opportunity_count || 0,
            volunteerCount: stats.volunteer_count || organisation.volunteer_count || 0,
            totalHours: stats.total_hours || organisation.total_hours || 0,
            averageRating: stats.average_rating || organisation.average_rating || 0,
            hasWebsite: !!organisation.website
          };
        }),
        organisationsQuery,
        error: false,
        manageableCount: 0,
        hasMore: !!meta.has_more && !!nextCursor,
        loadMoreHref: loadMoreQuery ? `/organisations/browse?${loadMoreQuery}` : ''
      });
    })
    .catch(() => {
      res.render('organisations-browse', {
        title: 'Browse organisations',
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

app.get('/organisations/register', (req, res) => {
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
    return res.redirect('/login?status=auth-required');
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
    return res.redirect(invalidRedirect);
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
    return res.redirect(failedRedirect);
  }

  return res.redirect('/organisations?status=org-submitted');
}

app.post('/organisations', formLimiter, doubleCsrfProtection, (req, res) => {
  return handleOrganisationRegistrationPost(req, res, { coarseInvalid: true });
});

app.post('/organisations/register', formLimiter, doubleCsrfProtection, handleOrganisationRegistrationPost);

app.get('/organisations/manage', (req, res) => {
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

app.get('/organisations/:id(\\d+)/jobs', (req, res) => {
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

app.get('/organisations/opportunities/:id(\\d+)/apply', (req, res) => {
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

app.get('/organisations/:id(\\d+)', (req, res) => {
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

app.use(doubleCsrfProtection, postOnly(formLimiter), contactSupportRoutes);
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
app.get('/logout', authRoutes);
app.post('/logout', doubleCsrfProtection, authRoutes);
app.get('/login/forgot-password', authRoutes);
app.post('/login/forgot-password', authLimiter, doubleCsrfProtection, authRoutes);
app.get('/forgot-password', authRoutes);
app.post('/forgot-password', authLimiter, doubleCsrfProtection, authRoutes);
app.get('/password/reset', authRoutes);
app.post('/password/reset', authLimiter, doubleCsrfProtection, authRoutes);
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

function safeLocalPath(input, fallback = '/') {
  const value = typeof input === 'string' ? input.trim() : '';
  if (value && value.startsWith('/') && !value.startsWith('//')) {
    return value;
  }
  return fallback;
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
app.use('/matches', doubleCsrfProtection, postOnly(formLimiter), matchesRoutes);
app.use('/exchanges', doubleCsrfProtection, postOnly(formLimiter), exchangeRoutes);
app.use('/chat', doubleCsrfProtection, postOnly(formLimiter), aiChatRoutes);
app.use('/progress', doubleCsrfProtection, gamificationRoutes);
app.use('/onboarding', doubleCsrfProtection, postOnly(formLimiter), onboardingPostRoutes);
app.use('/me/collections', doubleCsrfProtection, postOnly(formLimiter), savedCollectionRoutes);
app.use('/search', doubleCsrfProtection, searchRoutes);
app.use('/reviews', doubleCsrfProtection, postOnly(formLimiter), reviewsRoutes);
app.use('/admin', doubleCsrfProtection, adminRoutes);
app.use(doubleCsrfProtection, postOnly(formLimiter), savedSocialRoutes);
app.use(laravelPrepRoutes);

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
