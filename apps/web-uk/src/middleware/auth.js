// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const { refreshToken: refreshTokenApi, validateToken, ApiError, ApiOfflineError } = require('../lib/api');

const NODE_ENV = process.env.NODE_ENV || 'development';

// Token refresh locks keyed by refresh token to prevent concurrent refresh attempts
// without leaking one user's result to another
const refreshLocks = new Map();

// Helper to set auth cookies
function setAuthCookies(res, accessToken, refreshTokenValue) {
  res.cookie('token', accessToken, {
    httpOnly: true,
    signed: true,
    secure: NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 1000 // 1 hour
  });

  if (refreshTokenValue) {
    res.cookie('refresh_token', refreshTokenValue, {
      httpOnly: true,
      signed: true,
      secure: NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
  }
}

// Helper to clear auth cookies
function clearAuthCookies(res) {
  res.clearCookie('token');
  res.clearCookie('refresh_token');
}

// Middleware to require authentication
// Will attempt to refresh token if access token is missing but refresh token exists
async function requireAuth(req, res, next) {
  let token = req.signedCookies.token;
  const refreshTokenValue = req.signedCookies.refresh_token;

  // If no access token but have refresh token, try to refresh
  if (!token && refreshTokenValue) {
    const tokenKey = refreshTokenValue.substring(0, 40);
    try {
      // Use per-token lock to prevent concurrent refresh attempts
      if (!refreshLocks.has(tokenKey)) {
        refreshLocks.set(tokenKey, refreshTokenApi(refreshTokenValue).finally(() => {
          refreshLocks.delete(tokenKey);
        }));
      }
      const result = await refreshLocks.get(tokenKey);
      if (result.access_token) {
        token = result.access_token;
        setAuthCookies(res, result.access_token, result.refresh_token);
      }
    } catch (error) {
      refreshLocks.delete(tokenKey);
      // Refresh failed - clear cookies and redirect to login
      clearAuthCookies(res);
      return res.redirect('/login');
    }
  }

  if (!token) {
    return res.redirect('/login');
  }

  req.token = token;
  req.refreshToken = refreshTokenValue;
  next();
}

// Middleware to redirect if already authenticated
function redirectIfAuthenticated(req, res, next) {
  const token = req.signedCookies.token;

  if (token) {
    return res.redirect('/dashboard');
  }

  next();
}

// Middleware to handle 401 responses by attempting token refresh
// This wraps async route handlers to catch 401 errors and retry with refreshed token
function withTokenRefresh(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      // If we get a 401 and have a refresh token, try to refresh
      if (error instanceof ApiError && error.status === 401) {
        const refreshTokenValue = req.signedCookies.refresh_token;

        if (refreshTokenValue) {
          try {
            const result = await refreshTokenApi(refreshTokenValue);
            if (result.access_token) {
              // Update cookies
              setAuthCookies(res, result.access_token, result.refresh_token);
              // Update request token
              req.token = result.access_token;
              // Retry the original handler
              return handler(req, res, next);
            }
          } catch (refreshError) {
            // Refresh failed - clear cookies and redirect
            clearAuthCookies(res);
            return res.redirect('/login');
          }
        }

        // No refresh token - redirect to login
        clearAuthCookies(res);
        return res.redirect('/login');
      }

      // Not a 401 error - pass to error handler
      next(error);
    }
  };
}

// Middleware to require admin role
// Must be used after requireAuth
async function requireAdmin(req, res, next) {
  try {
    // Validate token and get user info
    const user = await validateToken(req.token);

    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return res.status(403).render('errors/403', {
        title: 'Access denied',
        message: 'You do not have permission to access this page. Admin access required.'
      });
    }

    // Store user info for use in routes
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      clearAuthCookies(res);
      return res.redirect('/login');
    }
    next(error);
  }
}

module.exports = {
  requireAuth,
  requireAdmin,
  redirectIfAuthenticated,
  withTokenRefresh,
  setAuthCookies,
  clearAuthCookies
};
