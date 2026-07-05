// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');

const router = express.Router();

const pages = {
  '/verify-email': {
    title: 'Verify email',
    body: 'Email verification routing must match the Laravel accessible frontend before shared use.'
  },
  '/newsletter/unsubscribe': {
    title: 'Unsubscribe from newsletter',
    body: 'Newsletter unsubscribe routing must match the Laravel accessible frontend before shared use.'
  },
  '/onboarding': {
    title: 'Onboarding',
    body: 'The onboarding wizard must match the Laravel session-backed accessible workflow before shared use.'
  },
  '/matches': {
    title: 'Matches',
    body: 'Match pages must follow the Laravel accessible frontend contract after compatible backend endpoints are available.'
  },
  '/nexus-score': {
    title: 'NEXUS score',
    body: 'NEXUS score pages must follow the Laravel accessible frontend contract after compatible backend endpoints are available.'
  },
  '/activity': {
    title: 'Activity',
    body: 'Activity pages must follow the Laravel accessible frontend contract after compatible backend endpoints are available.'
  },
  '/saved': {
    title: 'Saved',
    body: 'Saved items and collections must follow the Laravel accessible frontend contract after compatible backend endpoints are available.'
  },
  '/me': {
    title: 'Personal data',
    body: 'Personal account data routes must follow the Laravel accessible frontend contract after compatible backend endpoints are available.'
  },
  '/users': {
    title: 'Users',
    body: 'User-facing accessible routes must follow the Laravel accessible frontend contract after compatible backend endpoints are available.'
  },
  '/login/two-factor': {
    title: 'Two-factor authentication',
    body: 'Two-factor authentication pages must match the Laravel accessible frontend before shared use.'
  },
  '/password/reset': {
    title: 'Reset password',
    body: 'Password reset routing must match the Laravel accessible frontend before shared use.'
  },
  '/jobs': {
    title: 'Jobs',
    body: 'Job pages will follow the Laravel accessible frontend contract after compatible backend endpoints are available.'
  },
  '/goals': {
    title: 'Goals',
    body: 'Goal pages will follow the Laravel accessible frontend contract after compatible backend endpoints are available.'
  },
  '/chat': {
    title: 'AI assistant',
    body: 'AI assistant pages will be wired after the backend contract and feature gates are compatible.'
  },
  '/organisations': {
    title: 'Organisations',
    body: 'Organisation pages will follow the Laravel accessible frontend contract.'
  },
  '/resources': {
    title: 'Resources',
    body: 'Resource library pages will follow the Laravel accessible frontend contract.'
  },
  '/marketplace': {
    title: 'Marketplace',
    body: 'Marketplace pages will follow the Laravel accessible frontend contract.'
  },
  '/courses': {
    title: 'Courses',
    body: 'Course pages will follow the Laravel accessible frontend contract.'
  },
  '/podcasts': {
    title: 'Podcasts',
    body: 'Podcast pages will follow the Laravel accessible frontend contract.'
  },
  '/coupons': {
    title: 'Coupons',
    body: 'Coupon pages will follow the Laravel accessible frontend contract.'
  },
  '/premium': {
    title: 'Premium',
    body: 'Premium member pages will follow the Laravel accessible frontend contract.'
  },
  '/ideation': {
    title: 'Ideation',
    body: 'Ideation pages will follow the Laravel accessible frontend contract.'
  },
  '/federation': {
    title: 'Federation',
    body: 'Federation pages will follow the Laravel accessible frontend contract.'
  },
  '/clubs': {
    title: 'Clubs',
    body: 'Club pages will follow the Laravel accessible frontend contract.'
  }
};

router.get(Object.keys(pages), (req, res) => {
  const page = pages[req.path];
  res.render('static-page', {
    title: page.title,
    body: page.body,
    returnUrl: req.query.return || ''
  });
});

module.exports = router;
module.exports.pages = pages;
