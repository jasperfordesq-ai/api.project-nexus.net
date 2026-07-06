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
  startConversation,
  getUser,
  getConnections,
  markConversationRead,
  getProfile,
  callMessageApi,
  uploadVoiceMessage,
  uploadMessageAttachments,
  callConversationApi,
  ApiError
} = require('../lib/api');
const { asyncRoute } = require('../lib/routeHelpers');
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

function memberIdsFrom(raw) {
  const values = Array.isArray(raw) ? raw : String(raw || '').split(',');
  const seen = new Set();
  values.forEach((value) => {
    const id = positiveInteger(value);
    if (id !== null) seen.add(id);
  });
  return Array.from(seen);
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

router.use(requireAuth);

// List conversations
router.get('/', asyncRoute(async (req, res) => {
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

// New conversation form
router.get('/new', asyncRoute(async (req, res) => {
  const { user_id } = req.query;

  // Get connected users to populate recipient dropdown
  const connectionsResult = await getConnections(req.token, 'accepted');
  const rawConns = connectionsResult.items || connectionsResult.data || connectionsResult.connections || connectionsResult;
  const connections = Array.isArray(rawConns) ? rawConns : [];

  // If user_id provided, get that user's info
  let selectedUser = null;
  if (user_id) {
    try {
      selectedUser = await getUser(req.token, user_id);
    } catch (e) {
      // Ignore - user may not exist or not be connected
    }
  }

  res.render('messages/new', {
    title: 'New message',
    connections,
    selectedUser,
    selectedUserId: user_id,
    csrfToken: req.csrfToken ? req.csrfToken() : '',
    error: req.flash ? req.flash('error')[0] : null
  });
}));

// Start new conversation
router.post('/new', audit.conversationCreate(), asyncRoute(async (req, res, next) => {
  const { recipient_id, content } = req.body;

  const errors = [];

  if (!recipient_id) {
    errors.push({ text: 'Select a recipient', href: '#recipient_id' });
  }

  if (!content || !content.trim()) {
    errors.push({ text: 'Enter a message', href: '#content' });
  }

  if (errors.length > 0) {
    const connectionsResult = await getConnections(req.token, 'accepted');
    const rawConns = connectionsResult.items || connectionsResult.data || connectionsResult.connections || connectionsResult;
    const connections = Array.isArray(rawConns) ? rawConns : [];

    return res.render('messages/new', {
      title: 'New message',
      connections,
      selectedUserId: recipient_id,
      values: { content },
      errors,
      csrfToken: req.csrfToken ? req.csrfToken() : ''
    });
  }

  try {
    const result = await startConversation(req.token, recipient_id, content.trim());

    if (req.flash) {
      req.flash('success', 'Message sent');
    }

    // Redirect to the new conversation if ID is returned
    const conversationId = result.conversationId || result.conversation_id || result.id;
    if (conversationId) {
      return res.redirect(`/messages/${conversationId}`);
    }

    res.redirect('/messages');
  } catch (error) {
    // Handle API errors by re-rendering form with error message
    if (error instanceof ApiError && error.status !== 401) {
      const connectionsResult = await getConnections(req.token, 'accepted');
      const rawConns = connectionsResult.items || connectionsResult.data || connectionsResult.connections || connectionsResult;
      const connections = Array.isArray(rawConns) ? rawConns : [];

      return res.render('messages/new', {
        title: 'New message',
        connections,
        selectedUserId: recipient_id,
        values: { content },
        errors: [{ text: error.message || 'Unable to send message' }],
        csrfToken: req.csrfToken ? req.csrfToken() : ''
      });
    }
    throw error; // Re-throw for asyncRoute to handle 401/503
  }
}));

// View conversation
router.get('/:id', asyncRoute(async (req, res) => {
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
router.post('/:id', audit.messageSend(), asyncRoute(async (req, res) => {
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
