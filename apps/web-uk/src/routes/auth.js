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
    successMessage: req.flash ? req.flash('success')[0] : null
  });
});

router.post('/login', asyncRoute(async (req, res) => {
  const { email, password, tenant_slug } = req.body;

  if (!email || !password || !tenant_slug) {
    return res.render('login', {
      title: 'Sign in',
      error: 'Enter your email, password and tenant',
      values: { email, tenant_slug },
      csrfToken: req.csrfToken ? req.csrfToken() : ''
    });
  }

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
      csrfToken: req.csrfToken ? req.csrfToken() : ''
    });
  }
}));

// 2FA verification
router.post('/verify-2fa', asyncRoute(async (req, res) => {
  const { code } = req.body;
  const pendingToken = req.session?.pending2faToken;

  if (!pendingToken) {
    return res.redirect('/login');
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
      csrfToken: req.csrfToken ? req.csrfToken() : ''
    });
  }
}));

// Registration
router.get('/register', redirectIfAuthenticated, (req, res) => {
  res.render('register', {
    title: 'Create an account',
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
});

router.post('/register', asyncRoute(async (req, res) => {
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
      csrfToken: req.csrfToken ? req.csrfToken() : ''
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
      csrfToken: req.csrfToken ? req.csrfToken() : ''
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

// GET /logout redirects to POST to prevent CSRF via link/image tags
router.get('/logout', (req, res) => {
  res.redirect(307, '/login');
});

// Forgot password
router.get('/forgot-password', redirectIfAuthenticated, (req, res) => {
  res.render('forgot-password', {
    title: 'Reset your password',
    csrfToken: req.csrfToken ? req.csrfToken() : '',
    successMessage: req.flash ? req.flash('success')[0] : null
  });
});

router.post('/forgot-password', asyncRoute(async (req, res) => {
  const { email, tenant_slug } = req.body;

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
      csrfToken: req.csrfToken ? req.csrfToken() : ''
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
  res.redirect('/forgot-password');
}));

// Reset password (with token from email)
router.get('/reset-password', redirectIfAuthenticated, (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.redirect('/forgot-password');
  }

  res.render('reset-password', {
    title: 'Set a new password',
    resetToken: token,
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
});

router.post('/reset-password', asyncRoute(async (req, res) => {
  const { token, password, confirm_password } = req.body;

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

  if (password !== confirm_password) {
    errors.push({ text: 'Passwords do not match', href: '#confirm_password' });
    fieldErrors.confirm_password = 'Passwords do not match';
  }

  if (errors.length > 0) {
    return res.render('reset-password', {
      title: 'Set a new password',
      errors,
      fieldErrors,
      resetToken: token,
      csrfToken: req.csrfToken ? req.csrfToken() : ''
    });
  }

  try {
    await resetPassword(token, password);

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
      csrfToken: req.csrfToken ? req.csrfToken() : ''
    });
  }
}));

module.exports = router;
