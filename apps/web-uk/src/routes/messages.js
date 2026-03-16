// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { getConversations, getConversation, getUnreadCount, sendMessage, replyToConversation, startConversation, getUser, getConnections, markConversationRead, getProfile, ApiError } = require('../lib/api');
const { asyncRoute } = require('../lib/routeHelpers');
const { audit } = require('../lib/auditLogger');

const router = express.Router();

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
  const { content } = req.body;
  const conversationId = req.params.id;

  if (!content || !content.trim()) {
    if (req.flash) {
      req.flash('error', 'Enter a message');
    }
    return res.redirect(`/messages/${conversationId}`);
  }

  try {
    await replyToConversation(req.token, conversationId, content.trim());

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
  }
}));

module.exports = router;
