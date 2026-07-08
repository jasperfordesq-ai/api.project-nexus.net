// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const SHARED_MOUNT_RE = /^\/([A-Za-z0-9_-]+)\/(accessible|alpha)(?=\/|$)/;

function withQuery(path, queryIndex, originalUrl) {
  if (queryIndex === -1) return path;
  return `${path}${originalUrl.slice(queryIndex)}`;
}

function tenantRouting(req, res, next) {
  const originalUrl = req.url || '/';
  const queryIndex = originalUrl.indexOf('?');
  const pathname = queryIndex === -1 ? originalUrl : originalUrl.slice(0, queryIndex);
  const match = pathname.match(SHARED_MOUNT_RE);

  if (!match) {
    return next();
  }

  const [, tenantSlug, mount] = match;
  const rest = pathname.slice(match[0].length) || '/';
  const accessiblePrefix = `/${tenantSlug}/accessible`;

  if (mount === 'alpha') {
    return res.redirect(301, withQuery(`${accessiblePrefix}${rest === '/' ? '' : rest}`, queryIndex, originalUrl));
  }

  req.accessibleRouting = {
    mode: 'shared',
    tenantSlug,
    prefix: accessiblePrefix,
    routePath: rest
  };
  req.url = withQuery(rest, queryIndex, originalUrl);

  return next();
}

module.exports = {
  tenantRouting
};
