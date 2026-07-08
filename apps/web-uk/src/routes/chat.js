// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const {
  getAiChatStarters,
  sendAiChatMessage,
  sendAiChatFeedback,
  getAiConversations,
  getAiConversation,
  createAiConversation,
  deleteAiConversation,
  getAiProviders,
  getAiLimits,
  ApiError,
  ApiOfflineError
} = require('../lib/api');
const { requireAuth } = require('../middleware/auth');
const { asyncRoute } = require('../lib/routeHelpers');

const router = express.Router();

router.use(requireAuth);

function unwrapObject(payload) {
  if (!payload || typeof payload !== 'object') return {};
  return payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)
    ? payload.data
    : payload;
}

function unwrapList(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.data)) return payload.data;
  if (payload.data && Array.isArray(payload.data.items)) return payload.data.items;
  if (payload.data && Array.isArray(payload.data.data)) return payload.data.data;
  return [];
}

function normalizeMessage(message = {}) {
  const role = message.role === 'user' ? 'user' : 'assistant';

  return {
    ...message,
    id: message.id,
    role,
    roleLabel: role === 'user' ? 'You' : 'Assistant',
    tagClass: role === 'user' ? 'govuk-tag--blue' : 'govuk-tag--green',
    content: String(message.content || ''),
    createdAt: message.created_at || message.createdAt || ''
  };
}

function normalizeConversation(conversation = {}) {
  const title = String(conversation.title || 'Conversation').trim();

  return {
    ...conversation,
    id: conversation.id,
    title: title.length > 60 ? `${title.slice(0, 57)}...` : title,
    updatedAt: conversation.updated_at || conversation.updatedAt || ''
  };
}

function messagesFromConversation(payload) {
  const data = unwrapObject(payload);
  if (Array.isArray(data.messages)) return data.messages;
  if (data.conversation && Array.isArray(data.conversation.messages)) {
    return data.conversation.messages;
  }
  if (Array.isArray(payload?.messages)) return payload.messages;
  return [];
}

function conversationIdFromSend(payload, fallback = '') {
  const data = unwrapObject(payload);
  return data.conversation_id || data.conversationId || data.id || fallback;
}

function selectedConversationId(req) {
  const value = typeof req.query.c === 'string'
    ? req.query.c
    : (typeof req.query.conversation_id === 'string' ? req.query.conversation_id : '');
  return /^\d+$/.test(value) && Number(value) > 0 ? value : '';
}

function formConversationId(req) {
  const value = typeof req.body.conversation_id === 'string' ? req.body.conversation_id : '';
  return /^\d+$/.test(value) && Number(value) > 0 ? Number(value) : null;
}

function isRecoverableApiError(error) {
  return error instanceof ApiOfflineError || (error instanceof ApiError && error.status !== 401);
}

function statusMessage(status) {
  switch (status) {
    case 'sent':
      return 'Message sent.';
    case 'deleted':
      return 'Conversation deleted.';
    case 'feedback-sent':
      return 'Feedback sent.';
    case 'empty':
      return 'Enter a message to send.';
    case 'failed':
      return 'Message could not be sent. Try again.';
    case 'delete-failed':
      return 'Conversation could not be deleted. Try again.';
    case 'feedback-failed':
      return 'Feedback could not be sent. Try again.';
    default:
      return '';
  }
}

async function safeLoad(loader, fallback, onError) {
  try {
    return await loader();
  } catch (error) {
    if (isRecoverableApiError(error)) {
      if (onError) onError(error);
      return fallback;
    }
    throw error;
  }
}

router.get('/', asyncRoute(async (req, res) => {
  const selectedId = selectedConversationId(req);
  let loadError = false;

  const [conversationPayload, startersPayload, providersPayload, limitsPayload, selectedPayload] = await Promise.all([
    safeLoad(() => getAiConversations(req.token, { limit: 20 }), { data: [] }, () => { loadError = true; }),
    safeLoad(() => getAiChatStarters(req.token), { data: { starters: [] } }, () => { loadError = true; }),
    safeLoad(() => getAiProviders(req.token), { data: { enabled: true, providers: [] } }, () => { loadError = true; }),
    safeLoad(() => getAiLimits(req.token), { data: { limits: null } }, () => { loadError = true; }),
    selectedId
      ? safeLoad(() => getAiConversation(req.token, selectedId), { data: { messages: [] } }, () => { loadError = true; })
      : Promise.resolve({ data: { messages: [] } })
  ]);

  const providers = unwrapObject(providersPayload);
  const limits = unwrapObject(limitsPayload).limits || null;
  const starterData = unwrapObject(startersPayload);
  const starters = Array.isArray(starterData.starters) ? starterData.starters : unwrapList(startersPayload);
  const conversations = unwrapList(conversationPayload).map(normalizeConversation);
  const messages = messagesFromConversation(selectedPayload).map(normalizeMessage);
  const status = typeof req.query.status === 'string' ? req.query.status : '';
  const message = statusMessage(status);
  const errorMessage = req.flash ? req.flash('error')[0] : null;

  res.render('chat/index', {
    title: 'AI assistant',
    activeNav: 'explore',
    conversations,
    selectedId,
    messages,
    starters,
    limits,
    aiEnabled: providers.enabled !== false,
    status,
    statusMessage: ['sent', 'deleted', 'feedback-sent'].includes(status) ? message : '',
    validationMessage: status === 'empty' ? message : '',
    errorMessage: errorMessage || (['failed', 'delete-failed', 'feedback-failed'].includes(status) ? message : ''),
    loadError
  });
}));

router.post('/', asyncRoute(async (req, res) => {
  const message = String(req.body.message || '').trim();
  const conversationId = formConversationId(req);
  const selectedQuery = conversationId ? `?c=${conversationId}` : '';

  if (!message) {
    return res.redirect(`/chat${selectedQuery}${selectedQuery ? '&' : '?'}status=empty`);
  }

  try {
    const payload = await sendAiChatMessage(req.token, {
      ...(conversationId ? { conversation_id: conversationId } : {}),
      message: message.slice(0, 4000)
    });
    const targetConversationId = conversationIdFromSend(payload, conversationId || '');
    const query = targetConversationId ? `?c=${encodeURIComponent(targetConversationId)}&status=sent` : '?status=sent';
    return res.redirect(`/chat${query}`);
  } catch (error) {
    if (isRecoverableApiError(error)) {
      if (req.flash) {
        req.flash('error', error.message || 'Message could not be sent. Try again.');
      }
      const query = conversationId ? `?c=${conversationId}&status=failed` : '?status=failed';
      return res.redirect(`/chat${query}`);
    }
    throw error;
  }
}));

router.post('/conversations', asyncRoute(async (req, res) => {
  const title = String(req.body.title || 'New Chat').trim() || 'New Chat';
  const payload = await createAiConversation(req.token, { title });
  const conversationId = conversationIdFromSend(payload, '');

  return res.redirect(conversationId ? `/chat?c=${encodeURIComponent(conversationId)}` : '/chat');
}));

router.post('/conversations/:id/delete', asyncRoute(async (req, res) => {
  try {
    await deleteAiConversation(req.token, req.params.id);
    return res.redirect('/chat?status=deleted');
  } catch (error) {
    if (isRecoverableApiError(error)) {
      return res.redirect('/chat?status=delete-failed');
    }
    throw error;
  }
}));

router.post('/feedback', asyncRoute(async (req, res) => {
  const feedback = req.body.feedback === 'down' ? 'down' : 'up';
  const messageId = String(req.body.message_id || '').trim();
  const traceId = String(req.body.trace_id || '').trim();
  const conversationId = formConversationId(req);
  const returnPath = conversationId ? `/chat?c=${conversationId}` : '/chat';

  try {
    await sendAiChatFeedback(req.token, {
      feedback,
      ...(messageId ? { message_id: Number(messageId) } : {}),
      ...(traceId ? { trace_id: Number(traceId) } : {}),
      note: String(req.body.note || '').trim() || null
    });
    return res.redirect(`${returnPath}${returnPath.includes('?') ? '&' : '?'}status=feedback-sent`);
  } catch (error) {
    if (isRecoverableApiError(error)) {
      return res.redirect(`${returnPath}${returnPath.includes('?') ? '&' : '?'}status=feedback-failed`);
    }
    throw error;
  }
}));

module.exports = router;
