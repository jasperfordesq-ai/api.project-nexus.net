// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const fs = require('fs/promises');
const { requireAuth } = require('../middleware/auth');
const {
  getConversations,
  getConversation,
  getUnreadCount,
  replyToConversation,
  searchUsers,
  markConversationRead,
  getProfile,
  callMessageApi,
  uploadVoiceMessage,
  uploadMessageAttachments,
  callConversationApi,
  callListingApi,
  ApiError
} = require('../lib/api');
const { asyncRoute } = require('../lib/routeHelpers');
const { flagEnabled } = require('../lib/accessible-shell');
const { audit } = require('../lib/auditLogger');

const router = express.Router();

function tokenFrom(req) {
  return (req.signedCookies && req.signedCookies.token) || req.token || '';
}

function loginRedirect() {
  return '/login?status=auth-required';
}

function trimmed(value, limit = null) {
  const text = String(value || '').trim();
  return limit === null ? text : text.slice(0, limit);
}

function checked(value) {
  return value === true || ['1', 'true', 'on', 'yes'].includes(String(value || '').toLowerCase());
}

function positiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function uploadedFile(req, fieldName) {
  const file = req.files && req.files[fieldName];
  return file && typeof file === 'object' ? file : null;
}

function uploadedFiles(req, fieldName) {
  const files = req.files || {};
  const value = files[fieldName] || files[`${fieldName}[]`];
  if (!value) return [];
  const list = Array.isArray(value) ? value : [value];
  return list.filter(file => file && typeof file === 'object');
}

async function removeUploadedFile(file) {
  if (!file || !file.filepath) return;
  try {
    await fs.unlink(file.filepath);
  } catch {
    // Temporary upload cleanup is best-effort only.
  }
}

async function removeUploadedFiles(files) {
  await Promise.all(files.map(removeUploadedFile));
}

function dataFrom(result) {
  return result && typeof result === 'object' && result.data !== undefined
    ? result.data
    : result;
}

function apiErrorCode(error) {
  const data = error && error.data && typeof error.data === 'object' ? error.data : {};
  const errors = Array.isArray(data.errors) ? data.errors : [];
  return String(data.code || data.error || (errors[0] && errors[0].code) || '').toUpperCase();
}

function isAuthError(error) {
  return error instanceof ApiError && error.status === 401;
}

function redirectOnAuthError(error, res) {
  if (isAuthError(error)) {
    res.redirect(loginRedirect());
    return true;
  }
  return false;
}

async function callMessage(token, method, path, data = undefined) {
  if (data === undefined) {
    return callMessageApi(token, method, path);
  }

  return callMessageApi(token, method, path, data);
}

async function callConversation(token, method, path, data = undefined) {
  if (data === undefined) {
    return callConversationApi(token, method, path);
  }

  return callConversationApi(token, method, path, data);
}

function statusRedirect(path, status, fragment = '') {
  return `${path}?status=${encodeURIComponent(status)}${fragment}`;
}

function messageRedirect(userId, status, fragment = '') {
  return statusRedirect(`/messages/${userId}`, status, fragment);
}

function groupRedirect(conversationId, status, fragment = '') {
  return statusRedirect(`/messages/groups/${conversationId}`, status, fragment);
}

function tenantFeatureEnabled(req, key, fallback = true) {
  const tenant = req.accessibleRouting?.tenant;
  if (!tenant || typeof tenant !== 'object') return fallback;
  return flagEnabled(tenant, key, 'features', fallback);
}

function memberIdsFrom(raw) {
  const values = Array.isArray(raw) ? raw : String(raw || '').split(',');
  const seen = new Set();
  values.forEach((value) => {
    const id = positiveInteger(value);
    if (id !== null) seen.add(id);
  });
  return Array.from(seen);
}

function listFrom(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];
  if (Array.isArray(value.items)) return value.items;
  if (Array.isArray(value.data)) return value.data;
  if (Array.isArray(value.results)) return value.results;
  if (Array.isArray(value.users)) return value.users;
  return [];
}

function selectedGroupMemberIds(query) {
  return memberIdsFrom(query.members || query['members[]']);
}

function groupStatusMessage(status) {
  const messages = {
    'group-created': 'Your group conversation has been created.',
    'group-disabled': 'Direct messaging is currently turned off, so group conversations are unavailable.',
    'group-create-failed': 'We could not create the group. Add a name and at least two other members, then try again.',
    'group-message-sent': 'Your message has been sent to the group.',
    'group-message-empty': 'Enter a message before sending.',
    'group-message-too-long': 'Your message is too long. Please shorten it and try again.',
    'group-message-failed': 'We could not send your message.',
    'group-message-forbidden': 'You are no longer a member of this group, so you cannot send messages.',
    'group-member-added': 'The member has been added to the group.',
    'group-member-removed': 'The member has been removed from the group.',
    'group-member-invalid': 'Choose a valid member to add.',
    'group-member-forbidden': 'Only group administrators can add or remove members.',
    'group-member-not-found': 'That member could not be found in this community.',
    'group-member-limit': 'This group already has the maximum number of members.',
    'group-member-failed': 'We could not update the group members.',
    'group-left': 'You have left the group.',
    'group-leave-failed': 'We could not remove you from the group.',
    'reaction-added': 'Your reaction has been added.',
    'reaction-removed': 'Your reaction has been removed.',
    'reaction-invalid': 'That reaction is not available.',
    'reaction-forbidden': 'You cannot react to this message.',
    'reaction-failed': 'We could not save your reaction.'
  };
  return messages[trimmed(status)] || '';
}

function directStatusMessage(status) {
  const messages = {
    'message-sent': 'Your message has been sent.',
    'message-edited': 'Your message has been updated.',
    'message-deleted': 'Your message has been deleted.',
    'translate-done': 'The message has been translated.'
  };
  return messages[trimmed(status)] || '';
}

function directErrorMessage(status) {
  const messages = {
    'message-empty': 'Enter a message before sending.',
    'message-disabled': 'Direct messaging is currently turned off.',
    'message-failed': 'We could not send your message.',
    'message-edit-failed': 'We could not update your message.',
    'message-edit-forbidden': 'You cannot update that message.',
    'message-edit-expired': 'That message can no longer be edited.',
    'message-delete-failed': 'We could not delete your message.',
    'translate-unavailable': 'Translation is not available for this message.',
    'translate-empty': 'There is no text to translate.',
    'translate-failed': 'We could not translate the message.',
    'attachment-failed': 'We could not upload the attachment.',
    'voice-required': 'Choose a voice note before sending.',
    'voice-failed': 'We could not upload the voice note.'
  };
  return messages[trimmed(status)] || '';
}

function groupName(group) {
  return trimmed(group && (group.group_name || group.groupName || group.name)) || 'Group conversation';
}

function memberName(member) {
  return trimmed(member && (member.name || member.full_name || member.fullName)) || 'Unknown member';
}

function senderName(message, currentUserId) {
  const senderId = positiveInteger(message && message.sender_id);
  if (senderId !== null && currentUserId !== null && senderId === currentUserId) return 'You';
  const sender = message && message.sender && typeof message.sender === 'object' ? message.sender : {};
  return trimmed(sender.name || sender.full_name || sender.fullName)
    || trimmed(message && (message.sender_name || message.senderName))
    || 'Unknown member';
}

function conversationOtherUser(conversation, fallbackId) {
  const otherUser = conversation && typeof conversation.other_user === 'object'
    ? conversation.other_user
    : (conversation && typeof conversation.otherUser === 'object' ? conversation.otherUser : {});
  return {
    id: positiveInteger(otherUser.id) || positiveInteger(conversation && conversation.other_user_id) || fallbackId,
    name: trimmed(otherUser.name || otherUser.full_name || otherUser.fullName)
      || trimmed(conversation && (conversation.other_user_name || conversation.otherUserName))
      || `Member ${fallbackId}`
  };
}

function conversationApiPath(conversationId, query) {
  const search = new URLSearchParams();
  search.set('per_page', '50');
  search.set('direction', 'older');
  if (query.cursor) search.set('cursor', String(query.cursor));
  return `/${conversationId}/messages?${search.toString()}`;
}

function directConversationApiPath(userId, query) {
  const search = new URLSearchParams();
  search.set('per_page', '50');
  search.set('direction', 'older');
  if (query.cursor) search.set('cursor', String(query.cursor));
  return `/${userId}?${search.toString()}`;
}

function directConversationFrom(result, userId, currentUserId) {
  const data = dataFrom(result);
  const meta = (result && result.meta) || (data && data.meta) || {};
  const rawConversation = meta.conversation || (data && data.conversation) || {};
  const otherUser = conversationOtherUser(rawConversation, userId);
  const messages = listFrom(data).map(message => ({
    ...message,
    body: trimmed(message.body || message.content, 10000),
    displaySenderName: senderName(message, currentUserId),
    isOwn: positiveInteger(message.sender_id) !== null && positiveInteger(message.sender_id) === currentUserId
  }));

  return {
    conversation: {
      ...rawConversation,
      id: userId,
      otherUser
    },
    messages,
    meta: {
      hasMore: Boolean(meta.has_more),
      cursor: trimmed(meta.cursor)
    }
  };
}

function editFailureStatus(error) {
  const code = apiErrorCode(error);
  if (code.includes('FORBIDDEN')) return 'message-edit-forbidden';
  if (code.includes('EDIT_EXPIRED')) return 'message-edit-expired';
  return 'message-edit-failed';
}

function groupMemberFailureStatus(error) {
  const code = apiErrorCode(error);
  if (code.includes('FORBIDDEN')) return 'group-member-forbidden';
  if (code.includes('NOT_FOUND')) return 'group-member-not-found';
  if (code.includes('LIMIT')) return 'group-member-limit';
  return 'group-member-failed';
}

function translateFailureStatus(error) {
  const code = apiErrorCode(error);
  if (code.includes('FEATURE_DISABLED')) return 'translate-unavailable';
  if (code.includes('NO_CONTENT')) return 'translate-empty';
  return 'translate-failed';
}

router.post('/:id(\\d+)/archive', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const id = Number(req.params.id);
  let status = 'conversation-archived';
  try {
    await callMessage(token, 'DELETE', `/conversations/${id}`, { scope: 'self' });
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    status = 'conversation-archive-failed';
  }

  return res.redirect(statusRedirect('/messages', status));
}));

router.post('/:id(\\d+)/restore', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const id = Number(req.params.id);
  let status = 'conversation-restored';
  try {
    await callMessage(token, 'POST', `/conversations/${id}/restore`);
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    status = 'conversation-restore-failed';
  }

  return res.redirect(`/messages?archived=1&status=${encodeURIComponent(status)}`);
}));

router.post('/:userId(\\d+)/m/:messageId(\\d+)/edit', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const userId = Number(req.params.userId);
  const messageId = Number(req.params.messageId);
  const body = trimmed(req.body.body, 10000);
  if (body === '') {
    return res.redirect(messageRedirect(userId, 'message-empty'));
  }

  let status = 'message-edited';
  try {
    await callMessage(token, 'PUT', `/${messageId}`, { body });
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    status = editFailureStatus(error);
  }

  return res.redirect(messageRedirect(userId, status));
}));

router.post('/:userId(\\d+)/m/:messageId(\\d+)/delete', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const userId = Number(req.params.userId);
  const messageId = Number(req.params.messageId);
  const scope = ['self', 'everyone'].includes(req.body.scope) ? req.body.scope : 'everyone';
  let status = 'message-deleted';
  try {
    await callMessage(token, 'DELETE', `/${messageId}`, { scope });
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    status = 'message-delete-failed';
  }

  return res.redirect(messageRedirect(userId, status));
}));

router.post('/:userId(\\d+)/m/:messageId(\\d+)/translate', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const userId = Number(req.params.userId);
  const messageId = Number(req.params.messageId);
  if (!tenantFeatureEnabled(req, 'message_translation', true)) {
    return res.redirect(messageRedirect(userId, 'translate-unavailable', `#m-${messageId}`));
  }

  const targetLanguage = trimmed(req.body.target_language || req.body.target_locale || 'en', 10) || 'en';
  let status = 'translate-done';
  try {
    await callMessage(token, 'POST', `/${messageId}/translate`, {
      target_language: targetLanguage
    });
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    status = translateFailureStatus(error);
  }

  return res.redirect(messageRedirect(userId, status, `#m-${messageId}`));
}));

router.post('/:userId(\\d+)/voice', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const userId = Number(req.params.userId);
  const file = uploadedFile(req, 'voice');
  if (!file) {
    return res.redirect(messageRedirect(userId, 'voice-required'));
  }

  try {
    const buffer = await fs.readFile(file.filepath);
    await uploadVoiceMessage(token, {
      recipient_id: userId,
      file: {
        buffer,
        filename: trimmed(file.originalFilename) || 'voice-message',
        contentType: trimmed(file.mimetype) || 'application/octet-stream',
        size: file.size
      }
    });
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    return res.redirect(messageRedirect(userId, 'voice-failed'));
  } finally {
    await removeUploadedFile(file);
  }

  return res.redirect(messageRedirect(userId, 'message-sent'));
}));

router.post('/groups', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const payload = {
    name: trimmed(req.body.name),
    member_ids: memberIdsFrom(req.body.member_ids || req.body.members)
  };

  try {
    const result = await callConversation(token, 'POST', '/groups', payload);
    const data = dataFrom(result);
    const conversationId = positiveInteger(data && (data.id || data.conversation_id || (data.conversation && data.conversation.id)));
    if (conversationId !== null) {
      return res.redirect(groupRedirect(conversationId, 'group-created'));
    }
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
  }

  return res.redirect(statusRedirect('/messages/groups/new', 'group-create-failed'));
}));

router.post('/groups/:conversationId(\\d+)', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const conversationId = Number(req.params.conversationId);
  const body = trimmed(req.body.body, 10000);
  if (body === '') return res.redirect(groupRedirect(conversationId, 'group-message-empty'));
  if (String(req.body.body || '').length > 10000) return res.redirect(groupRedirect(conversationId, 'group-message-too-long'));

  let status = 'group-message-sent';
  try {
    await callConversation(token, 'POST', `/${conversationId}/messages`, { body });
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    status = error instanceof ApiError && error.status === 403 ? 'group-message-forbidden' : 'group-message-failed';
  }

  return res.redirect(groupRedirect(conversationId, status));
}));

router.post('/groups/:conversationId(\\d+)/members', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const conversationId = Number(req.params.conversationId);
  const userId = positiveInteger(req.body.user_id);
  if (userId === null) return res.redirect(groupRedirect(conversationId, 'group-member-invalid'));

  let status = 'group-member-added';
  try {
    await callConversation(token, 'POST', `/${conversationId}/participants`, { user_id: userId });
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    status = groupMemberFailureStatus(error);
  }

  return res.redirect(groupRedirect(conversationId, status));
}));

router.post('/groups/:conversationId(\\d+)/members/:targetUserId(\\d+)/remove', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const conversationId = Number(req.params.conversationId);
  const targetUserId = Number(req.params.targetUserId);
  const selfLeave = checked(req.body.self_leave);
  let status = selfLeave ? 'group-left' : 'group-member-removed';
  try {
    await callConversation(token, 'DELETE', `/${conversationId}/participants/${targetUserId}`);
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    status = selfLeave ? 'group-leave-failed' : groupMemberFailureStatus(error);
  }

  return selfLeave
    ? res.redirect(statusRedirect('/messages/groups', status))
    : res.redirect(groupRedirect(conversationId, status));
}));

router.post('/groups/:conversationId(\\d+)/m/:messageId(\\d+)/react', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const conversationId = Number(req.params.conversationId);
  const messageId = Number(req.params.messageId);
  const emoji = trimmed(req.body.emoji, 16);
  if (emoji === '') return res.redirect(groupRedirect(conversationId, 'reaction-invalid', `#m-${messageId}`));

  let status = 'reaction-added';
  try {
    const result = await callMessage(token, 'POST', `/${messageId}/reactions`, { emoji });
    const data = dataFrom(result);
    status = data && data.action === 'removed' ? 'reaction-removed' : 'reaction-added';
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    status = error instanceof ApiError && error.status === 403 ? 'reaction-forbidden' : 'reaction-failed';
  }

  return res.redirect(groupRedirect(conversationId, status, `#m-${messageId}`));
}));

router.get('/groups', requireAuth, asyncRoute(async (req, res) => {
  let groups = [];
  let error = '';
  try {
    const result = await callConversation(req.token, 'GET', '/groups');
    groups = listFrom(dataFrom(result));
  } catch {
    error = 'There was a problem loading your group conversations.';
  }

  res.render('messages/groups', {
    title: 'Group conversations',
    groups: groups.map(group => ({
      ...group,
      displayName: groupName(group)
    })),
    statusMessage: groupStatusMessage(req.query.status),
    error
  });
}));

router.get('/groups/new', requireAuth, asyncRoute(async (req, res) => {
  const query = trimmed(req.query.q);
  const selectedIds = selectedGroupMemberIds(req.query);
  const selected = new Set(selectedIds);
  let searchResults = [];
  let rawSearchResults = [];
  if (query !== '') {
    const result = await searchUsers(req.token, query, { limit: 10 });
    rawSearchResults = listFrom(dataFrom(result))
      .map(member => ({
        ...member,
        displayName: memberName(member),
        id: positiveInteger(member.id)
      }))
      .filter(member => member.id !== null);
    searchResults = rawSearchResults.filter(member => !selected.has(member.id));
  }
  const namedSelected = new Map(rawSearchResults.map(member => [member.id, member.displayName]));

  res.render('messages/group-create', {
    title: 'Start a group conversation',
    query,
    groupName: trimmed(req.query.name, 100),
    selectedIds,
    selectedMembers: selectedIds.map(id => ({ id, displayName: namedSelected.get(id) || `Member ${id}` })),
    searchResults,
    canCreate: selectedIds.length >= 2,
    statusMessage: groupStatusMessage(req.query.status),
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}));

router.get('/groups/:conversationId(\\d+)', requireAuth, asyncRoute(async (req, res) => {
  const conversationId = Number(req.params.conversationId);
  const [messagesResult, participantsResult, profileResult] = await Promise.all([
    callConversation(req.token, 'GET', conversationApiPath(conversationId, req.query)),
    callConversation(req.token, 'GET', `/${conversationId}/participants`),
    getProfile(req.token).catch(() => null)
  ]);

  const profile = dataFrom(profileResult);
  const currentUserId = positiveInteger(profile && profile.id);
  const meta = (messagesResult && messagesResult.meta) || {};
  const conversation = meta.conversation || { id: conversationId, group_name: 'Group conversation' };
  const participants = listFrom(dataFrom(participantsResult)).map(member => ({
    ...member,
    id: positiveInteger(member.id),
    displayName: memberName(member)
  }));
  const viewer = participants.find(member => member.id !== null && member.id === currentUserId);
  const viewerRole = trimmed(viewer && viewer.role) || 'member';
  const searchQuery = trimmed(req.query.q);
  const messages = listFrom(dataFrom(messagesResult)).map(message => ({
    ...message,
    displaySenderName: senderName(message, currentUserId)
  }));
  const visibleMessages = searchQuery
    ? messages.filter(message => String(message.body || message.content || '').toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  res.render('messages/group-conversation', {
    title: groupName(conversation),
    conversation: {
      ...conversation,
      id: conversationId,
      displayName: groupName(conversation)
    },
    messages: visibleMessages,
    participants,
    currentUserId,
    viewerRole,
    isAdmin: viewerRole === 'admin',
    canSend: true,
    searchQuery,
    meta: {
      hasMore: Boolean(meta.has_more),
      cursor: meta.cursor || ''
    },
    reactionEmojis: ['\u{1F44D}', '\u2764\uFE0F', '\u{1F602}', '\u{1F62E}', '\u{1F622}', '\u{1F64F}'],
    statusMessage: groupStatusMessage(req.query.status),
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}, { notFoundTitle: 'Group conversation not found' }));

// List conversations
router.get('/', requireAuth, asyncRoute(async (req, res) => {
  const [conversationsData, unreadData] = await Promise.all([
    getConversations(req.token),
    getUnreadCount(req.token).catch(() => ({ count: 0 }))
  ]);

  res.render('messages/index', {
    title: 'Messages',
    conversations: conversationsData.items || conversationsData.data || (Array.isArray(conversationsData) ? conversationsData : []),
    unreadCount: unreadData.unread_count ?? unreadData.unreadCount ?? unreadData.count ?? 0,
    successMessage: req.flash ? req.flash('success')[0] : null
  });
}));

router.get('/new/:userId(\\d+)', requireAuth, asyncRoute(async (req, res) => {
  const userId = Number(req.params.userId);
  const listingId = positiveInteger(req.query.listing);
  const [messagesResult, profileResult, restrictionResult, listingResult] = await Promise.all([
    callMessage(req.token, 'GET', directConversationApiPath(userId, req.query)),
    getProfile(req.token).catch(() => null),
    callMessage(req.token, 'GET', '/restriction-status').catch(() => ({ data: {} })),
    listingId === null ? Promise.resolve(null) : callListingApi(req.token, 'GET', `/${listingId}`).catch(() => null)
  ]);

  await callMessage(req.token, 'PUT', `/${userId}/read`).catch(() => {});

  const profile = dataFrom(profileResult);
  const currentUserId = positiveInteger(profile && profile.id);
  const normalized = directConversationFrom(messagesResult, userId, currentUserId);
  const restriction = dataFrom(restrictionResult) || {};
  const listing = listingResult ? dataFrom(listingResult) : null;
  const query = trimmed(req.query.q);
  const olderParams = new URLSearchParams();
  if (listingId !== null) olderParams.set('listing', String(listingId));
  if (query !== '') olderParams.set('q', query);
  if (normalized.meta.cursor) olderParams.set('cursor', normalized.meta.cursor);
  const olderHref = normalized.meta.hasMore && normalized.meta.cursor
    ? `/messages/new/${userId}?${olderParams.toString()}`
    : '';

  res.render('messages/direct-conversation', {
    title: `Conversation with ${normalized.conversation.otherUser.name}`,
    conversation: normalized.conversation,
    messages: normalized.messages,
    meta: normalized.meta,
    olderHref,
    listing,
    listingId,
    query,
    statusMessage: directStatusMessage(req.query.status),
    errorMessage: directErrorMessage(req.query.status),
    currentUserId,
    directMessagingEnabled: restriction.direct_messaging_enabled !== false && restriction.messaging_disabled !== true,
    restricted: Boolean(restriction.restricted || restriction.is_restricted || restriction.broker_messaging_only),
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}, { notFoundTitle: 'Conversation not found' }));

// View conversation
router.get('/:id(\\d+)', requireAuth, asyncRoute(async (req, res) => {
  const [conversation, profile] = await Promise.all([
    getConversation(req.token, req.params.id),
    getProfile(req.token).catch(() => null)
  ]);

  // Auto-mark conversation as read when viewed
  // Fire and forget - don't wait for response or fail the page if this fails
  markConversationRead(req.token, req.params.id).catch(() => {
    // Silently ignore errors - marking as read is not critical
  });

  res.render('messages/conversation', {
    title: 'Conversation',
    conversation,
    messages: conversation.messages || [],
    currentUser: profile,
    csrfToken: req.csrfToken ? req.csrfToken() : '',
    successMessage: req.flash ? req.flash('success')[0] : null,
    error: req.flash ? req.flash('error')[0] : null
  });
}, { notFoundTitle: 'Conversation not found' }));

// Send message
router.post('/:id(\\d+)', requireAuth, audit.messageSend(), asyncRoute(async (req, res) => {
  const content = trimmed(req.body.body || req.body.content, 10000);
  const conversationId = req.params.id;
  const recipientId = Number(conversationId);
  const attachments = uploadedFiles(req, 'attachments');

  if (!content && attachments.length === 0) {
    if (req.flash) {
      req.flash('error', 'Enter a message or add an attachment');
    }
    return res.redirect(`/messages/${conversationId}`);
  }

  try {
    if (attachments.length > 0) {
      const files = await Promise.all(attachments.map(async (file) => ({
        buffer: await fs.readFile(file.filepath),
        filename: trimmed(file.originalFilename) || 'attachment',
        contentType: trimmed(file.mimetype) || 'application/octet-stream',
        size: file.size
      })));
      await uploadMessageAttachments(tokenFrom(req), {
        recipient_id: recipientId,
        body: content,
        files
      });
    } else {
      await replyToConversation(req.token, conversationId, content);
    }

    if (req.flash) {
      req.flash('success', 'Message sent');
    }
    res.redirect(`/messages/${conversationId}`);
  } catch (error) {
    if (error instanceof ApiError && error.status !== 401) {
      if (req.flash) {
        req.flash('error', error.message || 'Unable to send message');
      }
      return res.redirect(`/messages/${conversationId}`);
    }
    throw error; // Re-throw for asyncRoute to handle 401/503
  } finally {
    await removeUploadedFiles(attachments);
  }
}));

module.exports = router;
