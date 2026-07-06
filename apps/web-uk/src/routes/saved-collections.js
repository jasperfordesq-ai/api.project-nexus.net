// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const {
  createSavedCollection,
  updateSavedCollection,
  deleteSavedCollection,
  deleteSavedItem,
  ApiError
} = require('../lib/api');
const { asyncRoute } = require('../lib/routeHelpers');

const router = express.Router();

function isChecked(value) {
  return ['1', 'on', 'true', 'yes'].includes(String(value || '').toLowerCase());
}

function collectionPayload(body) {
  const payload = {
    name: String(body.name || '').trim(),
    description: String(body.description || '').trim() || null,
    is_public: isChecked(body.is_public)
  };

  if (body.color !== undefined && String(body.color).trim()) {
    payload.color = String(body.color).trim();
  }
  if (body.icon !== undefined && String(body.icon).trim()) {
    payload.icon = String(body.icon).trim();
  }

  return payload;
}

function isAuthError(error) {
  return error instanceof ApiError && error.status === 401;
}

function isNotFound(error) {
  return error instanceof ApiError && error.status === 404;
}

router.post('/', requireAuth, asyncRoute(async (req, res) => {
  const payload = collectionPayload(req.body);
  if (!payload.name) {
    return res.redirect('/me/collections?status=collection-name-required');
  }

  let status = 'collection-created';
  try {
    await createSavedCollection(req.token, payload);
  } catch (error) {
    if (isAuthError(error)) throw error;
    status = 'collection-failed';
  }

  return res.redirect(`/me/collections?status=${status}`);
}));

router.post('/:id(\\d+)/update', requireAuth, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const payload = collectionPayload(req.body);
  if (!payload.name) {
    return res.redirect(`/me/collections/${id}?status=collection-name-required`);
  }

  let status = 'collection-updated';
  try {
    await updateSavedCollection(req.token, id, payload);
  } catch (error) {
    if (isAuthError(error) || isNotFound(error)) throw error;
    status = 'collection-failed';
  }

  return res.redirect(`/me/collections/${id}?status=${status}`);
}));

router.post('/:id(\\d+)/delete', requireAuth, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  let status = 'collection-deleted';

  try {
    await deleteSavedCollection(req.token, id);
  } catch (error) {
    if (isAuthError(error) || isNotFound(error)) throw error;
    status = 'collection-failed';
  }

  return res.redirect(`/me/collections?status=${status}`);
}));

router.post('/:id(\\d+)/items/:itemId(\\d+)/remove', requireAuth, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const itemId = Number(req.params.itemId);
  let status = 'item-removed';

  try {
    await deleteSavedItem(req.token, itemId);
  } catch (error) {
    if (isAuthError(error)) throw error;
    status = 'item-remove-failed';
  }

  return res.redirect(`/me/collections/${id}?status=${status}`);
}));

module.exports = router;
