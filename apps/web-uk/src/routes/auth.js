// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const { login, register, logout, forgotPassword, resetPassword, resendVerification, verify2fa, invalidateUserCache, ApiError, ApiOfflineError } = require('../lib/api');
const { setAuthCookies, clearAuthCookies } = require('../middleware/auth');
const { asyncRoute } = require('../lib/routeHelpers');
const { createTranslator } = require('../lib/localization');

const router = express.Router();
const fallbackTranslator = createTranslator('en');

const LOGIN_SUCCESS_STATUS_KEYS = Object.freeze({
  'verification-resent': 'auth.verification_resent',
  'password-reset': 'auth.password_reset',
  'register-created': 'auth.register_created',
  'signed-out': 'auth.signed_out',
  'account-deletion-requested': 'delete_account.success'
});

const LOGIN_ERROR_STATUS_KEYS = Object.freeze({
  'auth-required': 'states.auth_required',
  'login-failed': 'auth.login_failed',
  'two-factor-required': 'auth.two_factor_required',
  'two-factor-expired': 'auth.two_factor_expired',
  'rate-limited': 'auth.rate_limited',
  'email-not-verified': 'auth.email_not_verified',
  'pending-verification': 'auth.pending_verification',
  'account-suspended': 'auth.account_suspended'
});

const TWO_FACTOR_ERROR_STATUS_KEYS = Object.freeze({
  'two-factor-code-required': 'auth.two_factor_code_required',
  'two-factor-invalid': 'auth.two_factor_invalid',
  'two-factor-failed': 'auth.two_factor_failed'
});

const REGISTER_ERROR_STATUS_KEYS = Object.freeze({
  'register-failed': 'auth.register_failed',
  'register-duplicate': 'auth.register_duplicate',
  'register-password-pwned': 'auth.register_password_pwned',
  'register-password-mismatch': 'auth.register_password_mismatch',
  'register-validation': 'auth.register_validation'
});

const RESET_ERROR_STATUS_KEYS = Object.freeze({
  'reset-token-missing': 'auth.reset_link_invalid_title',
  'reset-token-invalid': 'auth.reset_link_invalid_title',
  'reset-weak': 'auth.reset_weak',
  'reset-pwned': 'auth.reset_pwned',
  'reset-reused': 'auth.reset_reused',
  'reset-mismatch': 'auth.reset_mismatch',
  'reset-failed': 'auth.reset_failed',
  'reset-rate-limited': 'auth.reset_rate_limited'
});

function translate(req, key, replacements = {}) {
  const requestTranslator = typeof req.t === 'function' ? req.t : fallbackTranslator;
  return requestTranslator(key, replacements);
}

function statusMessage(req, status, statusKeys) {
  const key = statusKeys[String(status || '')];
  return key ? translate(req, key) : '';
}

function firstFlashValue(req, name) {
  if (typeof req.flash !== 'function') return '';
  const values = req.flash(name);
  return Array.isArray(values) ? values[0] || '' : '';
}

function setAuthStatus(req, status) {
  if (typeof req.flash === 'function') {
    req.flash('authStatus', status);
  }
}

function errorCode(error) {
  const data = error?.data;
  const firstError = Array.isArray(data?.errors) ? data.errors[0] : null;
  return String(firstError?.code || data?.code || '').trim().toUpperCase();
}

function registrationErrorKey(error) {
  const code = errorCode(error);
  if (code === 'VALIDATION_DUPLICATE' || error?.status === 409) return 'auth.register_duplicate';
  if (code === 'PASSWORD_PWNED') return 'auth.register_password_pwned';
  if (code === 'PASSWORD_MISMATCH') return 'auth.register_password_mismatch';
  if (code === 'VALIDATION_ERROR') return 'auth.register_validation';
  return 'auth.register_failed';
}

function resetErrorKey(error) {
  const code = errorCode(error);
  if (code.includes('PWNED')) return 'auth.reset_pwned';
  if (code.includes('REUSED')) return 'auth.reset_reused';
  if (code.includes('WEAK')) return 'auth.reset_weak';
  if (code.includes('TOKEN') || error?.status === 400 || error?.status === 404) {
    return 'auth.reset_link_invalid_title';
  }
  if (error?.status === 429) return 'auth.reset_rate_limited';
  return 'auth.reset_failed';
}

function redirectTo(res, pathname) {
  const urlFor = typeof res.locals.urlFor === 'function' ? res.locals.urlFor : (value) => value;
  return res.redirect(urlFor(pathname));
}

function tenantSlugForRequest(req) {
  const routedTenantSlug = String(req.accessibleRouting?.tenantSlug || '').trim();
  if (routedTenantSlug) {
    return routedTenantSlug;
  }

  return String(req.body?.tenant_slug || '').trim();
}

router.get('/login', (req, res) => {
  const flashedStatus = firstFlashValue(req, 'authStatus');
  const legacySuccessMessage = firstFlashValue(req, 'success');
  const status = String(req.query.status || flashedStatus || '');
  res.render('login', {
    title: translate(req, 'auth.login_title'),
    csrfToken: req.csrfToken ? req.csrfToken() : '',
    successMessage: statusMessage(req, status, LOGIN_SUCCESS_STATUS_KEYS)
      || legacySuccessMessage
      || null,
    error: statusMessage(req, status, LOGIN_ERROR_STATUS_KEYS) || null,
    turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || ''
  });
});

router.post('/login', asyncRoute(async (req, res) => {
  const { email, password } = req.body;
  const tenantSlug = tenantSlugForRequest(req);

  if (!email || !password || !tenantSlug) {
    return res.render('login', {
      title: translate(req, 'auth.login_title'),
      error: 'Enter your email, password and tenant',
      values: { email, tenant_slug: tenantSlug },
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || ''
    });
  }

  // Turnstile gate intentionally removed from login (2026-05-15). It was
  // blocking legitimate members on browsers that couldn't reach
  // challenges.cloudflare.com. Express-rate-limit (10/15min on auth routes)
  // is the active defence here. Registration + contact keep Turnstile.

  try {
    const result = await login(email.toLowerCase(), password, tenantSlug);

    // Handle 2FA requirement — store pending token in session for verification
    if (result.requires_2fa) {
      const pendingToken = result.two_factor_token || result.temp_token || result.access_token;
      if (!pendingToken || !req.session) {
        return redirectTo(res, '/login?status=two-factor-required');
      }

      req.session.pending2faToken = pendingToken;
      return redirectTo(res, '/login/two-factor');
    }

    if (!result.access_token) {
      throw new Error('No access token received');
    }

    setAuthCookies(res, result.access_token, result.refresh_token);

    return redirectTo(res, '/dashboard');
  } catch (error) {
    // Handle ApiOfflineError specially for 503
    if (error instanceof ApiOfflineError) {
      return res.status(503).render('errors/503', { title: 'Service unavailable' });
    }

    let errorMessage = translate(req, 'auth.login_failed');

    if (error instanceof ApiError) {
      const code = errorCode(error);
      if (error.status === 429 || ['RATE_LIMIT_EXCEEDED', 'RATE_LIMITED'].includes(code)) {
        errorMessage = translate(req, 'auth.rate_limited');
      } else if (code === 'AUTH_EMAIL_NOT_VERIFIED') {
        errorMessage = translate(req, 'auth.email_not_verified');
      } else if (code === 'AUTH_PENDING_VERIFICATION') {
        errorMessage = translate(req, 'auth.pending_verification');
      } else if (code === 'AUTH_ACCOUNT_SUSPENDED') {
        errorMessage = translate(req, 'auth.account_suspended');
      }
    }

    res.render('login', {
      title: translate(req, 'auth.login_title'),
      error: errorMessage,
      values: { email, tenant_slug: tenantSlug },
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || ''
    });
  }
}));

// 2FA verification
async function handleTwoFactorPost(req, res) {
  const { code } = req.body;
  const pendingToken = req.session?.pending2faToken;

  if (!pendingToken) {
    return redirectTo(res, '/login?status=two-factor-expired');
  }

  if (!code || !code.trim()) {
    return res.render('login', {
      title: translate(req, 'auth.two_factor_title'),
      show2fa: true,
      error: translate(req, 'auth.two_factor_code_required'),
      csrfToken: req.csrfToken ? req.csrfToken() : ''
    });
  }

  try {
    const result = await verify2fa(pendingToken, code.trim());

    // Clear pending token from session
    delete req.session.pending2faToken;

    const accessToken = result.access_token || pendingToken;
    setAuthCookies(res, accessToken, result.refresh_token);

    return redirectTo(res, '/dashboard');
  } catch (error) {
    if (error instanceof ApiOfflineError) {
      return res.status(503).render('errors/503', { title: 'Service unavailable' });
    }

    res.render('login', {
      title: translate(req, 'auth.two_factor_title'),
      show2fa: true,
      error: translate(req, 'auth.two_factor_invalid'),
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || ''
    });
  }
}

router.get('/login/two-factor', (req, res) => {
  if (!req.session?.pending2faToken) {
    return redirectTo(res, '/login?status=two-factor-expired');
  }

  res.render('login', {
    title: translate(req, 'auth.two_factor_title'),
    show2fa: true,
    error: statusMessage(req, req.query.status, TWO_FACTOR_ERROR_STATUS_KEYS),
    csrfToken: req.csrfToken ? req.csrfToken() : '',
    turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || ''
  });
});

router.post('/login/two-factor', asyncRoute(handleTwoFactorPost));

router.post('/login/resend-verification', asyncRoute(async (req, res) => {
  try {
    await resendVerification((req.body.email || '').trim().toLowerCase());
  } catch (error) {
    if (error instanceof ApiOfflineError) {
      return res.status(503).render('errors/503', { title: 'Service unavailable' });
    }
  }

  return redirectTo(res, '/login?status=verification-resent');
}));

// Cloudflare Turnstile siteverify. Returns true when the env secret is
// unset (dev mode) so local dev keeps working without Cloudflare.
async function verifyTurnstile(token, remoteIp) {
  const secret = process.env.TURNSTILE_SECRET_KEY || '';
  if (!secret || secret === '1x0000000000000000000000000000000AA') {
    return true;
  }
  if (!token) return false;

  const form = new URLSearchParams({ secret, response: token });
  if (remoteIp) form.set('remoteip', remoteIp);

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    const resp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!resp.ok) return false;
    const body = await resp.json();
    return !!body.success;
  } catch (err) {
    console.info('[security] turnstile.network_error', { error: err.message });
    return false;
  }
}

// Registration
router.get('/register', (req, res) => {
  const statusError = statusMessage(req, req.query.status, REGISTER_ERROR_STATUS_KEYS);
  res.render('register', {
    title: translate(req, 'auth.register_title'),
    errors: statusError ? [{ text: statusError }] : [],
    csrfToken: req.csrfToken ? req.csrfToken() : '',
    turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || ''
  });
});

router.post('/register', asyncRoute(async (req, res) => {
  const tenantSlug = tenantSlugForRequest(req);

  // Bot honeypot — `website` is a hidden field in register.njk that real
  // users never see or fill. Bots auto-fill every input and give themselves
  // away. Render the same "check your email" success page so the bot
  // can't distinguish rejection from real registration.
  const honeypotValue = req.body && (req.body.website || req.body.honeypot);
  if (honeypotValue && String(honeypotValue).trim() !== '') {
    console.info('[security] registration.honeypot_triggered', {
      ip: req.ip,
      ua: (req.headers['user-agent'] || '').slice(0, 200),
      value: String(honeypotValue).slice(0, 100),
    });
    return res.render('register-success', {
      title: 'Check your email',
      email: (req.body.email || '').trim(),
    });
  }

  // Cloudflare Turnstile. Rejecting here saves a backend round-trip when
  // the user's challenge has expired or wasn't completed. The .NET API
  // will also verify independently as a defence-in-depth backstop.
  const turnstileToken = (req.body && req.body['cf-turnstile-response']) || '';
  if (!(await verifyTurnstile(turnstileToken, req.ip))) {
    return res.render('register', {
      title: translate(req, 'auth.register_title'),
      errors: [{ text: 'Bot verification failed. Please retry the challenge and submit again.', href: '#' }],
      fieldErrors: {},
      values: { ...(req.body || {}), tenant_slug: tenantSlug },
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || ''
    });
  }

  const { email, password, confirm_password, first_name, last_name } = req.body;

  const errors = [];
  const fieldErrors = {};

  if (!first_name || !first_name.trim()) {
    errors.push({ text: 'Enter your first name', href: '#first_name' });
    fieldErrors.first_name = 'Enter your first name';
  }

  if (!last_name || !last_name.trim()) {
    errors.push({ text: 'Enter your last name', href: '#last_name' });
    fieldErrors.last_name = 'Enter your last name';
  }

  if (!email || !email.trim()) {
    const message = translate(req, 'auth.forgot_invalid');
    errors.push({ text: message, href: '#email' });
    fieldErrors.email = message;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const message = translate(req, 'auth.forgot_invalid');
    errors.push({ text: message, href: '#email' });
    fieldErrors.email = message;
  }

  if (!tenantSlug) {
    errors.push({ text: 'Enter your community code', href: '#tenant_slug' });
    fieldErrors.tenant_slug = 'Enter your community code';
  }

  if (!password) {
    errors.push({ text: 'Enter a password', href: '#password' });
    fieldErrors.password = 'Enter a password';
  } else if (password.length < 8) {
    errors.push({ text: 'Password must be at least 8 characters', href: '#password' });
    fieldErrors.password = 'Password must be at least 8 characters';
  }

  if (password !== confirm_password) {
    const message = translate(req, 'auth.register_password_mismatch');
    errors.push({ text: message, href: '#confirm_password' });
    fieldErrors.confirm_password = message;
  }

  if (errors.length > 0) {
    return res.render('register', {
      title: translate(req, 'auth.register_title'),
      errors,
      fieldErrors,
      values: { email, first_name, last_name, tenant_slug: tenantSlug },
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || ''
    });
  }

  try {
    await register({
      email: email.trim().toLowerCase(),
      password,
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      tenant_slug: tenantSlug
    });

    // Auto-login after registration
    const result = await login(email.trim().toLowerCase(), password, tenantSlug);

    if (result.access_token) {
      setAuthCookies(res, result.access_token, result.refresh_token);

      if (req.flash) {
        req.flash('success', 'Account created successfully. Welcome!');
      }
      return redirectTo(res, '/dashboard');
    }

    // If auto-login fails, redirect to login page
    setAuthStatus(req, 'register-created');
    return redirectTo(res, '/login');
  } catch (error) {
    // Handle ApiOfflineError specially for 503
    if (error instanceof ApiOfflineError) {
      return res.status(503).render('errors/503', { title: 'Service unavailable' });
    }

    let errorMessage = translate(req, 'auth.register_failed');

    if (error instanceof ApiError) {
      errorMessage = translate(req, registrationErrorKey(error));
    }

    res.render('register', {
      title: translate(req, 'auth.register_title'),
      errors: [{ text: errorMessage }],
      fieldErrors: error.data?.errors || {},
      values: { email, first_name, last_name, tenant_slug: tenantSlug },
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || ''
    });
  }
}));

router.post('/logout', asyncRoute(async (req, res) => {
  const token = req.signedCookies.token;

  // Call API to revoke tokens server-side
  if (token) {
    try {
      await logout(token);
    } catch (error) {
      // Ignore errors - we still want to clear local cookies
      console.error('Logout API error:', error.message);
    }

    // Clear cached data for this user
    invalidateUserCache(token);
  }

  // Destroy session to prevent session fixation
  if (req.session) {
    req.session.destroy((err) => { if (err) console.error('Session destroy error:', err); });
  }

  clearAuthCookies(res);
  return redirectTo(res, '/login');
}));

// Forgot password
function renderForgotPassword(req, res) {
  const status = req.query.status || '';
  const errorKey = status === 'forgot-rate-limited'
    ? 'auth.forgot_rate_limited'
    : (status === 'forgot-invalid' ? 'auth.forgot_invalid' : '');
  res.render('forgot-password', {
    title: translate(req, 'auth.forgot_title'),
    csrfToken: req.csrfToken ? req.csrfToken() : '',
    successMessage: status === 'forgot-sent'
      ? translate(req, 'auth.forgot_sent_detail')
      : null,
    errors: errorKey ? [{ text: translate(req, errorKey), href: '#email' }] : [],
    fieldErrors: errorKey ? { email: translate(req, errorKey) } : {},
    formAction: '/login/forgot-password',
    turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || ''
  });
}

router.get('/login/forgot-password', renderForgotPassword);

async function handleForgotPasswordPost(req, res) {
  const { email } = req.body;
  const tenantSlug = tenantSlugForRequest(req);
  const formAction = '/login/forgot-password';

  // Turnstile gate intentionally removed from forgot-password (2026-05-15).
  // It was silently rejecting legitimate reset requests, so users saw the
  // success page but never received an email. Always-200 + rate-limit
  // (10/15min on auth routes) remain as defences against enumeration.

  const errors = [];
  const fieldErrors = {};

  if (!email || !email.trim()) {
    const message = translate(req, 'auth.forgot_invalid');
    errors.push({ text: message, href: '#email' });
    fieldErrors.email = message;
  }

  if (!tenantSlug) {
    errors.push({ text: 'Enter your community code', href: '#tenant_slug' });
    fieldErrors.tenant_slug = 'Enter your community code';
  }

  if (errors.length > 0) {
    return res.render('forgot-password', {
      title: translate(req, 'auth.forgot_title'),
      errors,
      fieldErrors,
      values: { email, tenant_slug: tenantSlug },
      formAction,
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || ''
    });
  }

  try {
    await forgotPassword(email.trim(), tenantSlug);
  } catch (error) {
    // Handle ApiOfflineError specially for 503
    if (error instanceof ApiOfflineError) {
      return res.status(503).render('errors/503', { title: 'Service unavailable' });
    }
    // For other errors, fall through to show success message (security: don't reveal if email exists)
  }

  // Always show success message (security: don't reveal if email exists)
  return redirectTo(res, '/login/forgot-password?status=forgot-sent');
}

router.post('/login/forgot-password', asyncRoute(handleForgotPasswordPost));

// Reset password (with token from email)
function renderResetPassword(req, res) {
  const { token } = req.query;

  if (!token) {
    return redirectTo(res, '/login/forgot-password');
  }

  const statusError = statusMessage(req, req.query.status, RESET_ERROR_STATUS_KEYS);
  res.render('reset-password', {
    title: translate(req, 'auth.reset_title'),
    resetToken: token,
    errors: statusError ? [{ text: statusError }] : [],
    formAction: '/password/reset',
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}

router.get('/password/reset', renderResetPassword);

async function handleResetPasswordPost(req, res) {
  const token = req.body.token;
  const password = req.body.password;
  const confirmPassword = req.body.password_confirmation || req.body.confirm_password;
  const formAction = '/password/reset';

  const errors = [];
  const fieldErrors = {};

  if (!token) {
    errors.push({ text: translate(req, 'auth.reset_link_invalid_title'), href: '#' });
  }

  if (!password) {
    errors.push({ text: 'Enter a new password', href: '#password' });
    fieldErrors.password = 'Enter a new password';
  } else if (password.length < 8) {
    errors.push({ text: 'Password must be at least 8 characters', href: '#password' });
    fieldErrors.password = 'Password must be at least 8 characters';
  }

  if (password !== confirmPassword) {
    const message = translate(req, 'auth.reset_mismatch');
    errors.push({ text: message, href: '#password_confirmation' });
    fieldErrors.password_confirmation = message;
  }

  if (errors.length > 0) {
    return res.render('reset-password', {
      title: translate(req, 'auth.reset_title'),
      errors,
      fieldErrors,
      resetToken: token,
      formAction,
      csrfToken: req.csrfToken ? req.csrfToken() : ''
    });
  }

  try {
    await resetPassword(token, password, confirmPassword);

    setAuthStatus(req, 'password-reset');
    return redirectTo(res, '/login');
  } catch (error) {
    // Handle ApiOfflineError specially for 503
    if (error instanceof ApiOfflineError) {
      return res.status(503).render('errors/503', { title: 'Service unavailable' });
    }

    const errorMessage = translate(req, resetErrorKey(error));

    res.render('reset-password', {
      title: translate(req, 'auth.reset_title'),
      errors: [{ text: errorMessage }],
      fieldErrors: {},
      resetToken: token,
      formAction,
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || ''
    });
  }
}

router.post('/password/reset', asyncRoute(handleResetPasswordPost));

module.exports = router;
