// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { getKBArticles, getKBArticle } = require('../lib/api');
const { asyncRoute } = require('../lib/routeHelpers');
const { normalizeResponse } = require('../lib/normalizeResponse');

const router = express.Router();

router.use(requireAuth);

// List articles
router.get('/', asyncRoute(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const category = req.query.category || null;

  const result = await getKBArticles(req.token, { page, limit: 20, category });

  const articles = (result.items || result.data || []).map(normalizeResponse);

  res.render('knowledge-base/index', {
    title: 'Knowledge Base',
    articles,
    category,
    pagination: result.pagination || { page, totalPages: 1 }
  });
}));

// View article
router.get('/:id', asyncRoute(async (req, res) => {
  const result = await getKBArticle(req.token, req.params.id);
  const article = normalizeResponse(result.article || result);

  res.render('knowledge-base/detail', {
    title: article.title || 'Article',
    article
  });
}, { notFoundTitle: 'Article not found' }));

module.exports = router;
