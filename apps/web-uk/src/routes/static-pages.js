// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');

const router = express.Router();

const pages = {
  '/help': {
    title: 'Help centre',
    body: 'Help centre content will follow the Laravel accessible frontend route and workflow contract.'
  },
  '/kb': {
    title: 'Knowledge base',
    body: 'Knowledge base articles will be wired after the ASP.NET backend exposes the Laravel-compatible accessible contracts.'
  },
  '/trust-and-safety': {
    title: 'Trust and safety',
    body: 'Trust and safety content will follow the Laravel Blade accessible frontend structure.'
  },
  '/goals': {
    title: 'Goals',
    body: 'Goal pages will follow the Laravel accessible frontend contract after compatible backend endpoints are available.'
  },
  '/guide': {
    title: 'Guide',
    body: 'Guide content will be ported from the Laravel accessible frontend.'
  },
  '/features': {
    title: 'Features',
    body: 'Feature guidance will be ported from the Laravel accessible frontend.'
  },
  '/accessibility': {
    title: 'Accessibility statement',
    body: 'The accessibility statement must match the production Laravel accessible frontend before shared use.'
  },
  '/legal': {
    title: 'Legal',
    body: 'The legal hub will follow the Laravel tenant-scoped legal document behavior.'
  },
  '/legal/terms': {
    title: 'Terms of service',
    body: 'Terms of service content will be supplied from the shared legal document contract.'
  },
  '/legal/privacy': {
    title: 'Privacy policy',
    body: 'Privacy policy content will be supplied from the shared legal document contract.'
  },
  '/legal/community-guidelines': {
    title: 'Community guidelines',
    body: 'Community guideline content will be supplied from the shared legal document contract.'
  },
  '/legal/acceptable-use': {
    title: 'Acceptable use',
    body: 'Acceptable use content will be supplied from the shared legal document contract.'
  },
  '/legal/cookies': {
    title: 'Cookie policy',
    body: 'Cookie policy content will be supplied from the shared legal document contract.'
  },
  '/exchanges': {
    title: 'Exchanges',
    body: 'Exchange workflows are a core Laravel accessible frontend feature and need ASP.NET contract parity before use.'
  },
  '/chat': {
    title: 'AI assistant',
    body: 'AI assistant pages will be wired after the backend contract and feature gates are compatible.'
  },
  '/skills': {
    title: 'Skills',
    body: 'Skills pages will follow the Laravel accessible frontend contract.'
  },
  '/resources': {
    title: 'Resources',
    body: 'Resource library pages will follow the Laravel accessible frontend contract.'
  },
  '/marketplace': {
    title: 'Marketplace',
    body: 'Marketplace pages will follow the Laravel accessible frontend contract.'
  },
  '/podcasts': {
    title: 'Podcasts',
    body: 'Podcast pages will follow the Laravel accessible frontend contract.'
  },
  '/coupons': {
    title: 'Coupons',
    body: 'Coupon pages will follow the Laravel accessible frontend contract.'
  },
  '/ideation': {
    title: 'Ideation',
    body: 'Ideation pages will follow the Laravel accessible frontend contract.'
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
