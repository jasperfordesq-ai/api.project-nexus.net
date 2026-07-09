// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const { flagEnabled } = require('../lib/accessible-shell');

const FEATURE_ROUTE_GATES = [
  { prefix: '/marketplace', featureKey: 'marketplace' },
  { prefix: '/courses', featureKey: 'courses' },
  { prefix: '/podcasts', featureKey: 'podcasts' },
  { prefix: '/coupons', featureKey: 'merchant_coupons' },
  { prefix: '/premium', featureKey: 'member_premium' }
];

function pathMatchesPrefix(pathname, prefix) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function routeGateForPath(pathname = '') {
  return FEATURE_ROUTE_GATES.find((gate) => pathMatchesPrefix(pathname, gate.prefix)) || null;
}

function tenantFeatureGate(req, res, next) {
  const tenant = req.accessibleRouting?.tenant;
  if (!tenant || typeof tenant !== 'object') {
    return next();
  }

  const gate = routeGateForPath(req.path || '/');
  if (!gate) {
    return next();
  }

  if (flagEnabled(tenant, gate.featureKey, 'features', true)) {
    return next();
  }

  return res.status(403).render('errors/403', {
    title: 'Forbidden',
    message: 'This feature is not enabled for this community.'
  });
}

module.exports = {
  FEATURE_ROUTE_GATES,
  tenantFeatureGate
};
