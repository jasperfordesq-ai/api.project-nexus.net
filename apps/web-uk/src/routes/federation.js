// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const {
  ApiError,
  ApiOfflineError,
  callFederationApi,
  getBalance
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

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
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

function normalizeMember(member, options = {}) {
  const timebank = asObject(member && member.timebank);
  const tenantId = member && member.tenant_id !== undefined ? member.tenant_id : timebank.id;
  const name = trimmed(member && member.name) || trimmed(`${trimmed(member && member.first_name)} ${trimmed(member && member.last_name)}`) || 'Federation member';
  const bioLimit = Object.prototype.hasOwnProperty.call(options, 'bioLimit') ? options.bioLimit : 220;
  const skills = Array.isArray(member && member.skills)
    ? member.skills.map((skill) => trimmed(skill)).filter(Boolean)
    : [];
  const connectionStatus = asObject(member && member.connection_status);

  return {
    id: member && member.id !== undefined ? member.id : '',
    name,
    href: memberHref({ id: member && member.id, tenantId }),
    avatar: trimmed(member && member.avatar),
    bio: trimmed(member && member.bio, bioLimit),
    location: trimmed(member && member.location),
    serviceReach: trimmed(member && member.service_reach),
    skills,
    tenantId,
    tenantName: trimmed((member && member.tenant_name) || timebank.name),
    messagingEnabled: bool(member && member.messaging_enabled),
    transactionsEnabled: bool(member && member.transactions_enabled),
    reputationScore: numberOrNull(member && (member.reputation_score || member.trust_score)),
    reputationCount: numberOrZero(member && member.reputation_count),
    connectionStatus: trimmed(connectionStatus.status || 'none'),
    connectionId: connectionStatus.connection_id || null
  };
}

function normalizeReview(review) {
  const reviewer = asObject(review && review.reviewer);
  const partner = asObject(review && review.partner);

  return {
    id: review && review.id,
    rating: numberOrZero(review && review.rating),
    comment: trimmed(review && review.comment),
    createdAt: review && review.created_at ? review.created_at : '',
    reviewerName: trimmed((review && review.reviewer_name) || reviewer.name) || 'Anonymous',
    partnerName: trimmed((review && review.partner_name) || partner.name),
    verified: bool(review && review.verified)
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

function memberStatusBanner(status) {
  const banners = {
    'connect-sent': { type: 'success', message: 'Connection request sent' },
    'connect-failed': { type: 'error', message: 'Connection request failed' },
    'message-sent': { type: 'success', message: 'Message sent' },
    'message-empty': { type: 'error', message: 'Enter a message before sending' },
    'message-too-long': { type: 'error', message: 'Message is too long' },
    'message-failed': { type: 'error', message: 'Message could not be sent' },
    'message-not-enabled': { type: 'error', message: 'Messaging is not enabled' },
    'message-recipient-unavailable': { type: 'error', message: 'This member cannot receive federation messages' },
    'transfer-sent': { type: 'success', message: 'Transfer sent' }
  };

  return banners[trimmed(status)] || null;
}

function transferStatusBanner(status) {
  const banners = {
    'transfer-sent': { type: 'success', message: 'Transfer sent' },
    'transfer-not-enabled': { type: 'error', message: 'Federation transfers are not enabled' },
    'transfer-amount-invalid': { type: 'error', message: 'Enter a transfer amount from 1 to 100' },
    'transfer-description-required': { type: 'error', message: 'Enter a transfer description' },
    'transfer-description-too-long': { type: 'error', message: 'Transfer description is too long' },
    'transfer-recipient-unavailable': { type: 'error', message: 'This member cannot receive a federation transfer' },
    'transfer-self': { type: 'error', message: 'You cannot transfer time credits to yourself' },
    'transfer-insufficient': { type: 'error', message: 'You do not have enough time credits' },
    'transfer-failed': { type: 'error', message: 'Transfer could not be sent' }
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

router.get('/members/:id/transfer', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) {
    return res.redirect('/login?status=auth-required');
  }

  const id = trimmed(req.params.id, 32);
  if (!/^\d+$/.test(id)) {
    return res.status(404).render('errors/404', { title: 'Page not found' });
  }

  const tenantId = trimmed(req.query.tenant_id, 32);
  const tenantQuery = tenantId ? `?tenant_id=${encodeURIComponent(tenantId)}` : '';

  let memberResult;
  let settingsResult;
  let balanceResult;
  try {
    memberResult = await callFederationApi(token, 'GET', `/members/${id}${tenantQuery}`);
    settingsResult = await callFederationApi(token, 'GET', '/settings');
    balanceResult = await getBalance(token);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return res.status(404).render('errors/404', { title: 'Page not found' });
    }
    if (renderFederationError(error, res)) return undefined;
    throw error;
  }

  const member = normalizeMember(asObject(dataFrom(memberResult)), { bioLimit: null });
  if (!member.transactionsEnabled) {
    return res.status(404).render('errors/404', { title: 'Page not found' });
  }

  const settingsData = asObject(dataFrom(settingsResult));
  const settings = asObject(settingsData.settings);
  const balanceData = dataFrom(balanceResult);
  const balanceObject = asObject(balanceData);
  const balance = numberOrZero(balanceObject.balance !== undefined ? balanceObject.balance : balanceData);

  return res.render('federation/transfer', {
    title: 'Transfer time credits',
    activeNav: 'explore',
    federationActiveTab: 'members',
    member,
    balance,
    viewerEnabled: (bool(settings.federation_optin) || bool(settingsData.enabled)) && bool(settings.transactions_enabled_federated),
    statusBanner: transferStatusBanner(req.query.status)
  });
}));

router.get('/members/:id', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) {
    return res.redirect('/login?status=auth-required');
  }

  const id = trimmed(req.params.id, 32);
  if (!/^\d+$/.test(id)) {
    return res.status(404).render('errors/404', { title: 'Page not found' });
  }

  const tenantId = trimmed(req.query.tenant_id, 32);
  const tenantQuery = tenantId ? `?tenant_id=${encodeURIComponent(tenantId)}` : '';

  let memberResult;
  let settingsResult;
  try {
    memberResult = await callFederationApi(token, 'GET', `/members/${id}${tenantQuery}`);
    settingsResult = await callFederationApi(token, 'GET', '/settings');
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return res.status(404).render('errors/404', { title: 'Page not found' });
    }
    if (renderFederationError(error, res)) return undefined;
    throw error;
  }

  const member = normalizeMember(asObject(dataFrom(memberResult)), { bioLimit: null });
  const settingsData = asObject(dataFrom(settingsResult));
  const settings = asObject(settingsData.settings);
  let reviews = [];

  if (member.reputationCount > 0) {
    try {
      const reviewsResult = await callFederationApi(token, 'GET', `/members/${id}/reviews${tenantQuery}`);
      reviews = asList(dataFrom(reviewsResult)).map(normalizeReview);
    } catch (error) {
      if (!(error instanceof ApiError && [403, 404].includes(error.status))) {
        throw error;
      }
    }
  }

  return res.render('federation/member', {
    title: member.name,
    activeNav: 'explore',
    federationActiveTab: 'members',
    member,
    reviews,
    viewer: {
      optedIn: bool(settings.federation_optin) || bool(settingsData.enabled),
      messagingEnabled: bool(settings.messaging_enabled_federated),
      transactionsEnabled: bool(settings.transactions_enabled_federated)
    },
    statusBanner: memberStatusBanner(req.query.status)
  });
}));

module.exports = router;
