// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const {
  ApiError,
  ApiOfflineError,
  callFederationApi
} = require('../lib/api');
const { asyncRoute } = require('../lib/routeHelpers');

const router = express.Router();

function tokenFrom(req) {
  return (req.signedCookies && req.signedCookies.token) || '';
}

function dataFrom(result) {
  return result && typeof result === 'object' && Object.prototype.hasOwnProperty.call(result, 'data')
    ? result.data
    : result;
}

function metaFrom(result) {
  return result && typeof result === 'object' && result.meta && typeof result.meta === 'object'
    ? result.meta
    : {};
}

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function asList(value) {
  if (Array.isArray(value)) return value;
  if (value && Array.isArray(value.items)) return value.items;
  if (value && Array.isArray(value.partners)) return value.partners;
  if (value && Array.isArray(value.data)) return value.data;
  return [];
}

function trimmed(value, limit = null) {
  const text = String(value || '').trim();
  return limit === null ? text : text.slice(0, limit);
}

function numberOrZero(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.trunc(number)) : 0;
}

function bool(value) {
  return value === true || value === 1 || value === '1' || value === 'true';
}

function partnerHref(id) {
  const text = trimmed(id, 32);
  return text ? `/federation/partners/${encodeURIComponent(text)}` : '/federation/partners';
}

function normalizePartner(partner, options = {}) {
  const name = trimmed(partner && partner.name) || 'Federated community';
  const id = partner && partner.id !== undefined ? partner.id : '';
  const taglineLimit = Object.prototype.hasOwnProperty.call(options, 'taglineLimit') ? options.taglineLimit : 220;
  const permissions = Array.isArray(partner && partner.permissions)
    ? partner.permissions.map((permission) => trimmed(permission)).filter(Boolean)
    : [];

  return {
    id,
    name,
    href: partnerHref(id),
    tagline: trimmed(partner && partner.tagline, taglineLimit),
    location: trimmed(partner && partner.location),
    country: trimmed(partner && partner.country),
    memberCount: numberOrZero(partner && partner.member_count),
    listingCount: numberOrZero(partner && partner.listing_count),
    levelName: trimmed(partner && (partner.federation_level_name || partner.level_name || partner.level)),
    partnershipSince: partner && partner.partnership_since ? partner.partnership_since : '',
    isExternal: bool(partner && partner.is_external),
    permissions
  };
}

function validPartnerId(id) {
  return /^\d+$/.test(id) || /^ext-\d+$/.test(id);
}

function isInternalPartner(partner) {
  return partner && !partner.isExternal && /^\d+$/.test(String(partner.id || ''));
}

function memberHref(member) {
  const id = trimmed(member && member.id, 32);
  const tenantId = trimmed(member && member.tenantId, 32);
  const query = tenantId ? `?tenant_id=${encodeURIComponent(tenantId)}` : '';
  return id ? `/federation/members/${encodeURIComponent(id)}${query}` : '/federation/members';
}

function normalizeMember(member) {
  const timebank = asObject(member && member.timebank);
  const tenantId = member && member.tenant_id !== undefined ? member.tenant_id : timebank.id;
  const name = trimmed(member && member.name) || trimmed(`${trimmed(member && member.first_name)} ${trimmed(member && member.last_name)}`) || 'Federation member';
  const skills = Array.isArray(member && member.skills)
    ? member.skills.map((skill) => trimmed(skill)).filter(Boolean)
    : [];

  return {
    id: member && member.id !== undefined ? member.id : '',
    name,
    href: memberHref({ id: member && member.id, tenantId }),
    bio: trimmed(member && member.bio, 220),
    location: trimmed(member && member.location),
    serviceReach: trimmed(member && member.service_reach),
    skills,
    tenantId,
    tenantName: trimmed((member && member.tenant_name) || timebank.name),
    messagingEnabled: bool(member && member.messaging_enabled)
  };
}

function federationQuery(req, keys) {
  const params = new URLSearchParams();
  keys.forEach((key) => {
    const value = trimmed(req.query && req.query[key]);
    if (value) params.set(key, value);
  });
  const query = params.toString();
  return query ? `?${query}` : '';
}

function loadMoreHref(basePath, req, cursor) {
  const params = new URLSearchParams();
  ['q', 'skills', 'partner_id', 'service_reach'].forEach((key) => {
    const value = trimmed(req.query && req.query[key]);
    if (value) params.set(key, value);
  });
  if (cursor) params.set('cursor', cursor);
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

function normalizeActivity(item) {
  const actor = asObject(item && item.actor);

  return {
    title: trimmed(item && item.title) || 'Federation activity',
    description: trimmed(item && item.description),
    community: trimmed(actor.tenant_name || actor.name || item && item.community),
    createdAt: item && item.created_at ? item.created_at : ''
  };
}

function statusBanner(status) {
  const banners = {
    'opted-in': { type: 'success', message: 'You are connected to the federation network.' },
    'opted-out': { type: 'success', message: 'You have left the federation network.' },
    'optin-failed': { type: 'error', message: 'We could not turn on federation. Please try again.' },
    'optout-failed': { type: 'error', message: 'We could not turn off federation. Please try again.' }
  };

  return banners[trimmed(status)] || null;
}

function renderFederationError(error, res) {
  if (error instanceof ApiError && error.status === 401) {
    res.redirect('/login?status=auth-required');
    return true;
  }

  if (error instanceof ApiOfflineError || error instanceof ApiError) {
    res.status(503).render('errors/503', { title: 'Federation' });
    return true;
  }

  return false;
}

router.get('/', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) {
    return res.redirect('/login?status=auth-required');
  }

  let statusResult;
  let partnersResult;
  let activityResult;
  try {
    statusResult = await callFederationApi(token, 'GET', '/status');
    partnersResult = await callFederationApi(token, 'GET', '/partners');
    activityResult = await callFederationApi(token, 'GET', '/activity');
  } catch (error) {
    if (renderFederationError(error, res)) return undefined;
    throw error;
  }

  const stats = asObject(dataFrom(statusResult));
  const partnerData = dataFrom(partnersResult);
  const partners = asList(partnerData).map(normalizePartner).slice(0, 6);
  const activity = asList(dataFrom(activityResult)).map(normalizeActivity).slice(0, 5);
  const partnerMeta = metaFrom(partnersResult);
  const partnerTotal = numberOrZero(partnerMeta.total || (partnerData && partnerData.total) || partners.length);

  return res.render('federation/index', {
    title: 'Federation',
    activeNav: 'explore',
    federationActiveTab: 'overview',
    stats: {
      tenantEnabled: bool(stats.tenant_federation_enabled),
      optedIn: bool(stats.federation_optin),
      partnershipsCount: numberOrZero(stats.partnerships_count),
      messagesCount: numberOrZero(stats.messages_count),
      transactionsCount: numberOrZero(stats.transactions_count)
    },
    partners,
    partnerTotal,
    activity,
    statusBanner: statusBanner(req.query.status)
  });
}));

router.get('/partners', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) {
    return res.redirect('/login?status=auth-required');
  }

  let partnersResult;
  try {
    partnersResult = await callFederationApi(token, 'GET', '/partners');
  } catch (error) {
    if (renderFederationError(error, res)) return undefined;
    throw error;
  }

  const partners = asList(dataFrom(partnersResult)).map(normalizePartner);

  return res.render('federation/partners', {
    title: 'Federation partners',
    activeNav: 'explore',
    federationActiveTab: 'partners',
    partners
  });
}));

router.get('/partners/:id', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) {
    return res.redirect('/login?status=auth-required');
  }

  const id = trimmed(req.params.id, 32);
  if (!validPartnerId(id)) {
    return res.status(404).render('errors/404', { title: 'Page not found' });
  }

  let partnerResult;
  try {
    partnerResult = await callFederationApi(token, 'GET', `/partners/${id}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return res.status(404).render('errors/404', { title: 'Page not found' });
    }
    if (renderFederationError(error, res)) return undefined;
    throw error;
  }

  const partner = normalizePartner(asObject(dataFrom(partnerResult)), { taglineLimit: null });
  partner.id = id;
  partner.href = partnerHref(id);
  partner.isInternal = isInternalPartner(partner);

  return res.render('federation/partner', {
    title: partner.name,
    activeNav: 'explore',
    federationActiveTab: 'partners',
    partner
  });
}));

router.get('/members', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) {
    return res.redirect('/login?status=auth-required');
  }

  let membersResult;
  let partnersResult;
  try {
    partnersResult = await callFederationApi(token, 'GET', '/partners');
    membersResult = await callFederationApi(token, 'GET', `/members${federationQuery(req, ['q', 'skills', 'partner_id', 'service_reach', 'cursor'])}`);
  } catch (error) {
    if (renderFederationError(error, res)) return undefined;
    throw error;
  }

  const members = asList(dataFrom(membersResult)).map(normalizeMember);
  const meta = metaFrom(membersResult);
  const partnerOptions = asList(dataFrom(partnersResult)).map(normalizePartner).filter(isInternalPartner);
  const nextCursor = trimmed(meta.cursor);

  return res.render('federation/members', {
    title: 'Federation members',
    activeNav: 'explore',
    federationActiveTab: 'members',
    members,
    partnerOptions,
    total: meta.total_items !== undefined ? numberOrZero(meta.total_items) : null,
    nextCursor,
    loadMoreHref: nextCursor ? loadMoreHref('/federation/members', req, nextCursor) : '',
    filters: {
      q: trimmed(req.query.q),
      skills: trimmed(req.query.skills),
      partnerId: trimmed(req.query.partner_id),
      serviceReach: trimmed(req.query.service_reach)
    }
  });
}));

module.exports = router;
