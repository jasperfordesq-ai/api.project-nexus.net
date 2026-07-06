// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const { login, register, logout, forgotPassword, resetPassword, verify2fa, invalidateUserCache, ApiError, ApiOfflineError } = require('../lib/api');
const { redirectIfAuthenticated, setAuthCookies, clearAuthCookies } = require('../middleware/auth');
const { asyncRoute } = require('../lib/routeHelpers');

const router = express.Router();

router.get('/login', redirectIfAuthenticated, (req, res) => {
  res.render('login', {
    title: 'Sign in',
    csrfToken: req.csrfToken ? req.csrfToken() : '',
    successMessage: req.flash ? req.flash('success')[0] : null,
    turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || ''
  });
});

router.post('/login', asyncRoute(async (req, res) => {
  const { email, password, tenant_slug } = req.body;

  if (!email || !password || !tenant_slug) {
    return res.render('login', {
      title: 'Sign in',
      error: 'Enter your email, password and tenant',
      values: { email, tenant_slug },
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || ''
    });
  }

  // Turnstile gate intentionally removed from login (2026-05-15). It was
  // blocking legitimate members on browsers that couldn't reach
  // challenges.cloudflare.com. Express-rate-limit (10/15min on auth routes)
  // is the active defence here. Registration + contact keep Turnstile.

  try {
    const result = await login(email.toLowerCase(), password, tenant_slug);

    // Handle 2FA requirement — store pending token in session for verification
    if (result.requires_2fa) {
      if (req.session) {
        req.session.pending2faToken = result.temp_token || result.access_token;
      }
      return res.render('login', {
        title: 'Sign in',
        show2fa: true,
        values: { email, tenant_slug },
        csrfToken: req.csrfToken ? req.csrfToken() : ''
      });
    }

    if (!result.access_token) {
      throw new Error('No access token received');
    }

    setAuthCookies(res, result.access_token, result.refresh_token);

    res.redirect('/dashboard');
  } catch (error) {
    // Handle ApiOfflineError specially for 503
    if (error instanceof ApiOfflineError) {
      return res.status(503).render('errors/503', { title: 'Service unavailable' });
    }

    let errorMessage = 'Unable to sign in. Check your details and try again.';

    if (error instanceof ApiError) {
      if (error.status === 401) {
        errorMessage = 'Email, password or tenant is incorrect';
      }
    }

    res.render('login', {
      title: 'Sign in',
      error: errorMessage,
      values: { email, tenant_slug },
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
    return res.redirect('/login?status=two-factor-expired');
  }

  if (!code || !code.trim()) {
    return res.render('login', {
      title: 'Sign in',
      show2fa: true,
      error: 'Enter your authentication code',
      csrfToken: req.csrfToken ? req.csrfToken() : ''
    });
  }

  try {
    const result = await verify2fa(pendingToken, code.trim());

    // Clear pending token from session
    delete req.session.pending2faToken;

    const accessToken = result.access_token || pendingToken;
    setAuthCookies(res, accessToken, result.refresh_token);

    res.redirect('/dashboard');
  } catch (error) {
    if (error instanceof ApiOfflineError) {
      return res.status(503).render('errors/503', { title: 'Service unavailable' });
    }

    res.render('login', {
      title: 'Sign in',
      show2fa: true,
      error: 'Invalid code. Please try again.',
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || ''
    });
  }
}

router.get('/login/two-factor', redirectIfAuthenticated, (req, res) => {
  res.render('login', {
    title: 'Two-factor authentication',
    show2fa: true,
    error: req.query.status ? 'Enter your authentication code' : '',
    csrfToken: req.csrfToken ? req.csrfToken() : '',
    turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || ''
  });
});

router.post('/verify-2fa', asyncRoute(handleTwoFactorPost));
router.post('/login/two-factor', asyncRoute(handleTwoFactorPost));

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
router.get('/register', redirectIfAuthenticated, (req, res) => {
  res.render('register', {
    title: 'Create an account',
    csrfToken: req.csrfToken ? req.csrfToken() : '',
    turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || ''
  });
});

router.post('/register', asyncRoute(async (req, res) => {
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
      title: 'Create an account',
      errors: [{ text: 'Bot verification failed. Please retry the challenge and submit again.', href: '#' }],
      fieldErrors: {},
      values: req.body || {},
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || ''
    });
  }

  const { email, password, confirm_password, first_name, last_name, tenant_slug } = req.body;

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
    errors.push({ text: 'Enter your email address', href: '#email' });
    fieldErrors.email = 'Enter your email address';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push({ text: 'Enter a valid email address', href: '#email' });
    fieldErrors.email = 'Enter a valid email address';
  }

  if (!tenant_slug || !tenant_slug.trim()) {
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
    errors.push({ text: 'Passwords do not match', href: '#confirm_password' });
    fieldErrors.confirm_password = 'Passwords do not match';
  }

  if (errors.length > 0) {
    return res.render('register', {
      title: 'Create an account',
      errors,
      fieldErrors,
      values: { email, first_name, last_name, tenant_slug },
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
      tenant_slug: tenant_slug.trim()
    });

    // Auto-login after registration
    const result = await login(email.trim().toLowerCase(), password, tenant_slug.trim());

    if (result.access_token) {
      setAuthCookies(res, result.access_token, result.refresh_token);

      if (req.flash) {
        req.flash('success', 'Account created successfully. Welcome!');
      }
      return res.redirect('/dashboard');
    }

    // If auto-login fails, redirect to login page
    if (req.flash) {
      req.flash('success', 'Account created. Please sign in.');
    }
    res.redirect('/login');
  } catch (error) {
    // Handle ApiOfflineError specially for 503
    if (error instanceof ApiOfflineError) {
      return res.status(503).render('errors/503', { title: 'Service unavailable' });
    }

    let errorMessage = 'Unable to create account. Please try again.';

    if (error instanceof ApiError) {
      if (error.status === 400 || error.status === 409) {
        errorMessage = error.message || 'This email address is already registered';
      }
    }

    res.render('register', {
      title: 'Create an account',
      errors: [{ text: errorMessage }],
      fieldErrors: error.data?.errors || {},
      values: { email, first_name, last_name, tenant_slug },
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
  res.redirect('/login');
}));

// GET /logout revokes tokens server-side then clears cookies
router.get('/logout', asyncRoute(async (req, res) => {
  const token = req.signedCookies.token;

  if (token) {
    try {
      await logout(token);
    } catch (error) {
      // Ignore errors - still clear local cookies
      console.error('Logout API error:', error.message);
    }

    invalidateUserCache(token);
  }

  if (req.session) {
    req.session.destroy((err) => { if (err) console.error('Session destroy error:', err); });
  }

  clearAuthCookies(res);
  res.redirect('/login');
}));

// Forgot password
function renderForgotPassword(req, res) {
  const status = req.query.status || '';
  res.render('forgot-password', {
    title: 'Reset your password',
    csrfToken: req.csrfToken ? req.csrfToken() : '',
    successMessage: status === 'forgot-sent'
      ? 'If an account exists with this email, we have sent password reset instructions.'
      : (req.flash ? req.flash('success')[0] : null),
    formAction: req.path === '/login/forgot-password' ? '/login/forgot-password' : '/forgot-password',
    turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || ''
  });
}

router.get('/forgot-password', redirectIfAuthenticated, renderForgotPassword);
router.get('/login/forgot-password', redirectIfAuthenticated, renderForgotPassword);

async function handleForgotPasswordPost(req, res) {
  const { email, tenant_slug } = req.body;
  const formAction = req.path === '/login/forgot-password' ? '/login/forgot-password' : '/forgot-password';

  // Turnstile gate intentionally removed from forgot-password (2026-05-15).
  // It was silently rejecting legitimate reset requests, so users saw the
  // success page but never received an email. Always-200 + rate-limit
  // (10/15min on auth routes) remain as defences against enumeration.

  const errors = [];
  const fieldErrors = {};

  if (!email || !email.trim()) {
    errors.push({ text: 'Enter your email address', href: '#email' });
    fieldErrors.email = 'Enter your email address';
  }

  if (!tenant_slug || !tenant_slug.trim()) {
    errors.push({ text: 'Enter your community code', href: '#tenant_slug' });
    fieldErrors.tenant_slug = 'Enter your community code';
  }

  if (errors.length > 0) {
    return res.render('forgot-password', {
      title: 'Reset your password',
      errors,
      fieldErrors,
      values: { email, tenant_slug },
      formAction,
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || ''
    });
  }

  try {
    await forgotPassword(email.trim(), tenant_slug.trim());
  } catch (error) {
    // Handle ApiOfflineError specially for 503
    if (error instanceof ApiOfflineError) {
      return res.status(503).render('errors/503', { title: 'Service unavailable' });
    }
    // For other errors, fall through to show success message (security: don't reveal if email exists)
  }

  // Always show success message (security: don't reveal if email exists)
  if (req.flash) {
    req.flash('success', 'If an account exists with this email, we have sent password reset instructions.');
  }
  res.redirect(req.path === '/login/forgot-password' ? '/login/forgot-password?status=forgot-sent' : '/forgot-password');
}

router.post('/forgot-password', asyncRoute(handleForgotPasswordPost));
router.post('/login/forgot-password', asyncRoute(handleForgotPasswordPost));

// Reset password (with token from email)
function renderResetPassword(req, res) {
  const { token } = req.query;

  if (!token) {
    return res.redirect(req.path === '/password/reset' ? '/login/forgot-password' : '/forgot-password');
  }

  res.render('reset-password', {
    title: 'Set a new password',
    resetToken: token,
    formAction: req.path === '/password/reset' ? '/password/reset' : '/reset-password',
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}

router.get('/reset-password', redirectIfAuthenticated, renderResetPassword);
router.get('/password/reset', redirectIfAuthenticated, renderResetPassword);

async function handleResetPasswordPost(req, res) {
  const token = req.body.token;
  const password = req.body.password;
  const confirmPassword = req.body.password_confirmation || req.body.confirm_password;
  const formAction = req.path === '/password/reset' ? '/password/reset' : '/reset-password';

  const errors = [];
  const fieldErrors = {};

  if (!token) {
    errors.push({ text: 'Invalid or expired reset link', href: '#' });
  }

  if (!password) {
    errors.push({ text: 'Enter a new password', href: '#password' });
    fieldErrors.password = 'Enter a new password';
  } else if (password.length < 8) {
    errors.push({ text: 'Password must be at least 8 characters', href: '#password' });
    fieldErrors.password = 'Password must be at least 8 characters';
  }

  if (password !== confirmPassword) {
    errors.push({ text: 'Passwords do not match', href: '#password_confirmation' });
    fieldErrors.password_confirmation = 'Passwords do not match';
  }

  if (errors.length > 0) {
    return res.render('reset-password', {
      title: 'Set a new password',
      errors,
      fieldErrors,
      resetToken: token,
      formAction,
      csrfToken: req.csrfToken ? req.csrfToken() : ''
    });
  }

  try {
    await resetPassword(token, password, confirmPassword);

    if (req.flash) {
      req.flash('success', 'Your password has been reset. Please sign in with your new password.');
    }
    res.redirect('/login');
  } catch (error) {
    // Handle ApiOfflineError specially for 503
    if (error instanceof ApiOfflineError) {
      return res.status(503).render('errors/503', { title: 'Service unavailable' });
    }

    let errorMessage = 'Unable to reset password. The link may have expired.';
    if (error instanceof ApiError && error.message) {
      errorMessage = error.message;
    }

    res.render('reset-password', {
      title: 'Set a new password',
      errors: [{ text: errorMessage }],
      fieldErrors: {},
      resetToken: token,
      formAction,
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || ''
    });
  }
}

router.post('/reset-password', asyncRoute(handleResetPasswordPost));
router.post('/password/reset', asyncRoute(handleResetPasswordPost));

module.exports = router;
