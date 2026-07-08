// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const SHARED_MOUNT_RE = /^\/([A-Za-z0-9_-]+)\/(accessible|alpha)(?=\/|$)/;
const UNPREFIXED_PATHS = [
  '/api',
  '/assets',
  '/css',
  '/downloads',
  '/favicon.ico',
  '/health',
  '/js',
  '/manifest.json',
  '/robots.txt',
  '/service-unavailable',
  '/service-worker.js',
  '/session/touch',
  '/uploads',
  '/v2'
];

function withQuery(path, queryIndex, originalUrl) {
  if (queryIndex === -1) return path;
  return `${path}${originalUrl.slice(queryIndex)}`;
}

function splitPathSuffix(value) {
  const match = String(value || '').match(/^([^?#]*)(.*)$/);
  return {
    pathname: match ? match[1] : '',
    suffix: match ? match[2] : ''
  };
}

function shouldPrefixLocalPath(value, prefix) {
  if (!prefix || typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return false;
  }

  const { pathname } = splitPathSuffix(value);
  if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
    return false;
  }

  return !UNPREFIXED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function prefixLocalPath(value, prefix) {
  if (!shouldPrefixLocalPath(value, prefix)) {
    return value;
  }

  const { pathname, suffix } = splitPathSuffix(value);
  return pathname === '/'
    ? `${prefix}${suffix}`
    : `${prefix}${pathname}${suffix}`;
}

function rewriteHtmlLinks(content, prefix) {
  if (!prefix || typeof content !== 'string' || content === '') {
    return content;
  }

  return content.replace(/\b(href|action)=(["'])(\/[^"']*)\2/g, (match, attribute, quote, value) => {
    return `${attribute}=${quote}${prefixLocalPath(value, prefix)}${quote}`;
  });
}

function looksLikeHtml(content) {
  return /<(?:!doctype|html|head|body|main|form|a)\b/i.test(content);
}

function installSharedMountResponseRewriter(res, prefix) {
  const originalRedirect = res.redirect.bind(res);
  res.redirect = (statusOrUrl, maybeUrl) => {
    if (typeof statusOrUrl === 'number') {
      return originalRedirect(statusOrUrl, prefixLocalPath(maybeUrl, prefix));
    }
    return originalRedirect(prefixLocalPath(statusOrUrl, prefix));
  };

  const originalSend = res.send.bind(res);
  res.send = (body) => {
    const contentType = String(res.get('Content-Type') || '');
    if (typeof body === 'string' && (contentType.includes('text/html') || looksLikeHtml(body))) {
      return originalSend(rewriteHtmlLinks(body, prefix));
    }
    return originalSend(body);
  };
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
  installSharedMountResponseRewriter(res, accessiblePrefix);
  req.url = withQuery(rest, queryIndex, originalUrl);

  return next();
}

module.exports = {
  prefixLocalPath,
  rewriteHtmlLinks,
  tenantRouting
};
