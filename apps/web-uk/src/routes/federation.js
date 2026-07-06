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

function connectionHref(connection) {
  const id = trimmed(connection && connection.userId, 32);
  const tenantId = trimmed(connection && connection.tenantId, 32);
  const query = tenantId ? `?tenant_id=${encodeURIComponent(tenantId)}` : '';
  return id ? `/federation/members/${encodeURIComponent(id)}${query}` : '/federation/members';
}

function normalizeConnection(connection) {
  const normalized = {
    id: connection && connection.id,
    userId: connection && (connection.user_id || connection.userId),
    name: trimmed(connection && connection.name) || 'Unknown member',
    tenantId: connection && (connection.tenant_id || connection.tenantId),
    tenantName: trimmed(connection && (connection.tenant_name || connection.tenantName)),
    status: trimmed(connection && connection.status),
    direction: trimmed(connection && connection.direction),
    message: trimmed(connection && connection.message, 500),
    createdAt: connection && connection.created_at ? connection.created_at : ''
  };

  normalized.href = connectionHref(normalized);
  normalized.isReceived = normalized.status === 'pending' && normalized.direction === 'incoming';
  normalized.isSent = normalized.status === 'pending' && normalized.direction === 'outgoing';
  normalized.isAccepted = normalized.status === 'accepted';
  return normalized;
}

function participantName(participant) {
  return trimmed(participant && participant.name)
    || trimmed(`${trimmed(participant && participant.first_name)} ${trimmed(participant && participant.last_name)}`)
    || 'A member';
}

function threadHref(thread) {
  const id = trimmed(thread && thread.partnerUserId, 32);
  const tenantId = trimmed(thread && thread.partnerTenantId, 32);
  const query = tenantId ? `?tenant_id=${encodeURIComponent(tenantId)}` : '';
  return id ? `/federation/messages/conversation/${encodeURIComponent(id)}${query}` : '/federation/messages';
}

function normalizeMessageThreads(messages, query = '') {
  const byThread = new Map();

  asList(messages).forEach((message) => {
    const sender = asObject(message && message.sender);
    const receiver = asObject(message && message.receiver);
    const outbound = trimmed(message && message.direction) === 'outbound';
    const partner = outbound ? receiver : sender;
    const partnerUserId = partner.id !== undefined ? partner.id : '';
    const partnerTenantId = partner.tenant_id !== undefined ? partner.tenant_id : partner.tenantId;
    const key = `${partnerUserId}-${partnerTenantId}`;
    const body = trimmed(message && message.body, 120);

    if (!byThread.has(key)) {
      byThread.set(key, {
        partnerUserId,
        partnerTenantId,
        partnerName: participantName(partner),
        partnerTenantName: trimmed(partner.tenant_name || partner.tenantName),
        lastSubject: trimmed(message && message.subject),
        lastPreview: body,
        lastCreatedAt: message && message.created_at ? message.created_at : '',
        lastOutbound: outbound,
        unreadCount: 0
      });
    }

    const thread = byThread.get(key);
    const unreadInbound = !outbound && trimmed(message && message.status) !== 'read' && !message.read_at;
    if (unreadInbound) {
      thread.unreadCount += 1;
    }
  });

  const needle = trimmed(query).toLowerCase();
  return Array.from(byThread.values())
    .map((thread) => ({ ...thread, href: threadHref(thread) }))
    .filter((thread) => {
      if (!needle) return true;
      return [thread.partnerName, thread.partnerTenantName, thread.lastSubject]
        .some((value) => trimmed(value).toLowerCase().includes(needle));
    });
}

function normalizeConversation(messages, partnerId, partnerTenantId) {
  const partnerIdText = trimmed(partnerId);
  const partnerTenantIdText = trimmed(partnerTenantId);
  const conversationMessages = [];
  const unreadIds = [];
  let partnerName = '';
  let partnerTenantName = '';

  asList(messages).forEach((message) => {
    const sender = asObject(message && message.sender);
    const receiver = asObject(message && message.receiver);
    const outbound = trimmed(message && message.direction) === 'outbound';
    const partner = outbound ? receiver : sender;
    const userMatches = trimmed(partner.id) === partnerIdText;
    const tenantMatches = trimmed(partner.tenant_id !== undefined ? partner.tenant_id : partner.tenantId) === partnerTenantIdText;
    if (!userMatches || !tenantMatches) return;

    if (!partnerName) {
      partnerName = participantName(partner);
      partnerTenantName = trimmed(partner.tenant_name || partner.tenantName);
    }

    const read = trimmed(message && message.status) === 'read' || Boolean(message && message.read_at);
    const id = message && message.id;
    if (!outbound && !read && id !== undefined) {
      unreadIds.push(Number(id));
    }

    conversationMessages.push({
      id,
      subject: trimmed(message && message.subject),
      body: trimmed(message && message.body, 10000),
      outbound,
      read,
      createdAt: message && message.created_at ? message.created_at : ''
    });
  });

  conversationMessages.sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime() || 0;
    const bTime = new Date(b.createdAt).getTime() || 0;
    if (aTime !== bTime) return aTime - bTime;
    return numberOrZero(a.id) - numberOrZero(b.id);
  });

  return {
    partnerId: partnerIdText,
    partnerTenantId: partnerTenantIdText,
    partnerName: partnerName || 'A member',
    partnerTenantName,
    messages: conversationMessages,
    unreadIds: unreadIds.filter((id) => Number.isFinite(id) && id > 0).slice(0, 100),
    referenceMessageId: conversationMessages.length ? conversationMessages[conversationMessages.length - 1].id : ''
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

function settingsStatusBanner(status) {
  const banners = {
    'settings-saved': { type: 'success', message: 'Federation settings saved' },
    'settings-failed': { type: 'error', message: 'Federation settings could not be saved' }
  };

  return banners[trimmed(status)] || null;
}

function optInStatusBanner(status) {
  const banners = {
    'optin-failed': { type: 'error', message: 'We could not opt you in. Please try again.' },
    unavailable: { type: 'error', message: 'Federation is not currently available for this community.' }
  };

  return banners[trimmed(status)] || null;
}

function connectionStatusBanner(status) {
  const banners = {
    'connection-accepted': { type: 'success', message: 'Connection request accepted.' },
    'connection-rejected': { type: 'success', message: 'Connection request declined.' },
    'connection-removed': { type: 'success', message: 'Connection removed.' },
    'connection-action-failed': { type: 'error', message: 'We could not complete that action. Please try again.' }
  };

  return banners[trimmed(status)] || null;
}

function messagesStatusBanner(status) {
  const banners = {
    'message-sent': { type: 'success', message: 'Your message has been sent.' },
    'message-empty': { type: 'error', message: 'Enter a message before sending.' },
    'message-too-long': { type: 'error', message: 'Your message is too long.' },
    'message-failed': { type: 'error', message: 'We could not send your message. Please try again.' },
    'message-not-enabled': { type: 'error', message: 'Turn on federated messaging in your settings to send messages.' },
    'message-recipient-unavailable': { type: 'error', message: 'This member is not accepting federated messages.' },
    'message-unavailable': { type: 'error', message: 'Federated messaging is not available right now.' },
    'translate-unavailable': { type: 'error', message: 'Translation is not available right now.' },
    'translate-failed': { type: 'error', message: 'We could not translate that message. Please try again.' }
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

router.get('/opt-in', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) {
    return res.redirect('/login?status=auth-required');
  }

  let settingsResult;
  let partnersResult;
  try {
    settingsResult = await callFederationApi(token, 'GET', '/settings');
    const settingsData = asObject(dataFrom(settingsResult));
    const settings = asObject(settingsData.settings);
    if (bool(settings.federation_optin)) {
      return res.redirect('/federation/settings');
    }

    partnersResult = await callFederationApi(token, 'GET', '/partners');
  } catch (error) {
    if (renderFederationError(error, res)) return undefined;
    throw error;
  }

  const partners = asList(dataFrom(partnersResult)).map(normalizePartner).slice(0, 5);

  return res.render('federation/opt-in', {
    title: 'Opt in to federation',
    activeNav: 'explore',
    federationActiveTab: 'overview',
    partners,
    statusBanner: optInStatusBanner(req.query.status)
  });
}));

router.get('/opt-out', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) {
    return res.redirect('/login?status=auth-required');
  }

  return res.render('federation/opt-out', {
    title: 'Opt out of federation',
    activeNav: 'explore',
    federationActiveTab: 'overview'
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

router.get('/settings', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) {
    return res.redirect('/login?status=auth-required');
  }

  let settingsResult;
  try {
    settingsResult = await callFederationApi(token, 'GET', '/settings');
  } catch (error) {
    if (renderFederationError(error, res)) return undefined;
    throw error;
  }

  const settingsData = asObject(dataFrom(settingsResult));
  const settings = asObject(settingsData.settings);

  return res.render('federation/settings', {
    title: 'Federation settings',
    activeNav: 'explore',
    federationActiveTab: 'settings',
    optedIn: bool(settings.federation_optin) || bool(settingsData.enabled),
    settings: {
      profileVisibleFederated: bool(settings.profile_visible_federated),
      appearInFederatedSearch: bool(settings.appear_in_federated_search),
      showSkillsFederated: bool(settings.show_skills_federated),
      showLocationFederated: bool(settings.show_location_federated),
      showReviewsFederated: bool(settings.show_reviews_federated),
      emailNotifications: bool(settings.email_notifications),
      messagingEnabledFederated: bool(settings.messaging_enabled_federated),
      transactionsEnabledFederated: bool(settings.transactions_enabled_federated),
      serviceReach: trimmed(settings.service_reach) || 'local_only',
      travelRadiusKm: numberOrZero(settings.travel_radius_km || 25)
    },
    statusBanner: settingsStatusBanner(req.query.status)
  });
}));

router.get('/connections', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) {
    return res.redirect('/login?status=auth-required');
  }

  let activeTab = trimmed(req.query.tab) || 'accepted';
  if (!['accepted', 'received', 'sent'].includes(activeTab)) {
    activeTab = 'accepted';
  }

  const statusFilter = {
    accepted: 'accepted',
    received: 'pending_received',
    sent: 'pending_sent'
  }[activeTab];

  let connectionsResult;
  try {
    connectionsResult = await callFederationApi(token, 'GET', `/connections?status=${statusFilter}&limit=100&offset=0`);
  } catch (error) {
    if (renderFederationError(error, res)) return undefined;
    throw error;
  }

  const connections = asList(dataFrom(connectionsResult)).map(normalizeConnection);

  return res.render('federation/connections', {
    title: 'Federated connections',
    activeNav: 'explore',
    federationActiveTab: 'connections',
    activeTab,
    connections,
    statusBanner: connectionStatusBanner(req.query.status)
  });
}));

router.get('/messages', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) {
    return res.redirect('/login?status=auth-required');
  }

  let settingsResult;
  let messagesResult;
  try {
    settingsResult = await callFederationApi(token, 'GET', '/settings');
    messagesResult = await callFederationApi(token, 'GET', '/messages');
  } catch (error) {
    if (renderFederationError(error, res)) return undefined;
    throw error;
  }

  const settingsData = asObject(dataFrom(settingsResult));
  const settings = asObject(settingsData.settings);
  const query = trimmed(req.query.q);
  const threads = normalizeMessageThreads(dataFrom(messagesResult), query);
  const optedIn = bool(settings.federation_optin) || bool(settingsData.enabled);

  return res.render('federation/messages', {
    title: 'Federated messages',
    activeNav: 'explore',
    federationActiveTab: 'messages',
    query,
    threads,
    viewerCanMessage: optedIn && bool(settings.messaging_enabled_federated),
    statusBanner: messagesStatusBanner(req.query.status)
  });
}));

router.get('/messages/conversation/:partnerId', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) {
    return res.redirect('/login?status=auth-required');
  }

  const partnerId = trimmed(req.params.partnerId, 32);
  const partnerTenantId = trimmed(req.query.tenant_id, 32);
  if (!/^\d+$/.test(partnerId) || !/^\d+$/.test(partnerTenantId)) {
    return res.redirect('/federation/messages');
  }

  let settingsResult;
  let messagesResult;
  try {
    settingsResult = await callFederationApi(token, 'GET', '/settings');
    messagesResult = await callFederationApi(token, 'GET', '/messages');
  } catch (error) {
    if (renderFederationError(error, res)) return undefined;
    throw error;
  }

  const conversation = normalizeConversation(dataFrom(messagesResult), partnerId, partnerTenantId);
  if (conversation.messages.length === 0) {
    return res.redirect('/federation/messages');
  }

  if (conversation.unreadIds.length > 0) {
    try {
      await callFederationApi(token, 'POST', '/messages/mark-read-batch', { ids: conversation.unreadIds });
    } catch (error) {
      if (!(error instanceof ApiError || error instanceof ApiOfflineError)) {
        throw error;
      }
    }
  }

  const settingsData = asObject(dataFrom(settingsResult));
  const settings = asObject(settingsData.settings);
  const optedIn = bool(settings.federation_optin) || bool(settingsData.enabled);

  return res.render('federation/conversation', {
    title: conversation.partnerName,
    activeNav: 'explore',
    federationActiveTab: 'messages',
    conversation,
    canReply: optedIn && bool(settings.messaging_enabled_federated),
    translateEnabled: true,
    statusBanner: messagesStatusBanner(req.query.status)
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
