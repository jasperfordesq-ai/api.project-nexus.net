// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');

const router = express.Router();

const FEATURES = [
  'Find members who can help with what you need, and offer your own skills in return.',
  'Earn and spend time credits - one hour always equals one credit.',
  'Discover and host community events.',
  'Find volunteering opportunities and log your hours.',
  'Join groups of members with shared interests.',
  'Earn badges and see how you are contributing.'
];

function communityName(res) {
  return res.locals.tenantName || res.locals.serviceName || 'Project NEXUS Accessible';
}

router.get('/guide', (req, res) => {
  res.render('public-info/guide', {
    title: 'How timebanking works',
    activeNav: 'guide',
    communityName: communityName(res),
    isAuthenticated: res.locals.isAuthenticated
  });
});

router.get('/features', (req, res) => {
  res.render('public-info/features', {
    title: 'Features',
    activeNav: 'features',
    communityName: communityName(res),
    features: FEATURES
  });
});

module.exports = router;
