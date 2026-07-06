// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const { sendAiChat, ApiError } = require('../lib/api');
const { asyncRoute } = require('../lib/routeHelpers');

const router = express.Router();

function tokenFrom(req) {
  return req.signedCookies.token || '';
}

function normaliseConversationId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function conversationIdFrom(result) {
  const data = result && typeof result === 'object' && result.data && typeof result.data === 'object'
    ? result.data
    : result;
  const id = data && data.conversation_id;
  return normaliseConversationId(id);
}

function isAuthError(error) {
  return error instanceof ApiError && error.status === 401;
}

router.post('/', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) {
    return res.redirect('/login?status=auth-required');
  }

  const message = String(req.body.message || '').trim().slice(0, 4000);
  if (message === '') {
    return res.redirect('/chat?status=empty');
  }

  const payload = { message };
  const conversationId = normaliseConversationId(req.body.conversation_id);
  if (conversationId !== null) {
    payload.conversation_id = conversationId;
  }

  let status = 'sent';
  let nextConversationId = conversationId;

  try {
    const result = await sendAiChat(token, payload);
    nextConversationId = conversationIdFrom(result) || nextConversationId;
  } catch (error) {
    if (isAuthError(error)) throw error;
    status = 'failed';
  }

  const query = new URLSearchParams();
  if (nextConversationId !== null) {
    query.set('c', String(nextConversationId));
  }
  query.set('status', status);

  return res.redirect(`/chat?${query.toString()}`);
}));

module.exports = router;
