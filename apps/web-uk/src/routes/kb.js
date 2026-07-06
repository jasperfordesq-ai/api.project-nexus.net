// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const {
  getKnowledgeBaseArticles,
  getKnowledgeBaseArticle
} = require('../lib/api');
const { asyncRoute } = require('../lib/routeHelpers');

const router = express.Router();

function trimmed(value, limit = null) {
  const text = String(value || '').trim();
  return limit === null ? text : text.slice(0, limit);
}

function positiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function dataFrom(result) {
  return result && typeof result === 'object' && result.data !== undefined ? result.data : result;
}

function rowsFrom(result) {
  const data = dataFrom(result);
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
}

function metaFrom(result) {
  if (result && typeof result === 'object' && result.meta && typeof result.meta === 'object') return result.meta;
  const data = dataFrom(result);
  if (data && data.meta && typeof data.meta === 'object') return data.meta;
  return {};
}

function communityName(res) {
  const tenant = res.locals.tenant || {};
  return trimmed(tenant.name) || trimmed(tenant.slug) || 'Project NEXUS Accessible';
}

function viewLabel(count) {
  if (count === 0) return 'No views';
  if (count === 1) return '1 view';
  return `${count} views`;
}

function dateLabel(value) {
  const raw = trimmed(value);
  if (!raw) return '';
  return raw.split('T')[0].split(' ')[0];
}

function normalizeArticleSummary(item) {
  const row = item && typeof item === 'object' ? item : {};
  const views = Number.isFinite(Number(row.views_count ?? row.viewsCount))
    ? Number(row.views_count ?? row.viewsCount)
    : 0;

  return {
    id: positiveInteger(row.id),
    title: trimmed(row.title) || 'Knowledge base article',
    contentPreview: trimmed(row.content_preview ?? row.contentPreview ?? row.summary ?? row.excerpt),
    categoryName: trimmed(row.category_name ?? row.categoryName),
    viewsCount: views,
    viewsLabel: viewLabel(views)
  };
}

function normalizeArticle(result, fallbackId) {
  const row = dataFrom(result) || {};
  const author = row.author && typeof row.author === 'object' ? row.author : {};
  const children = Array.isArray(row.children) ? row.children : [];

  return {
    id: positiveInteger(row.id) || fallbackId,
    title: trimmed(row.title) || 'Knowledge base article',
    content: String(row.content || ''),
    updatedLabel: dateLabel(row.updated_at ?? row.updatedAt ?? row.created_at ?? row.createdAt),
    authorName: trimmed(author.name),
    children: children
      .map((child) => ({
        id: positiveInteger(child && child.id),
        title: trimmed(child && child.title) || 'Related article'
      }))
      .filter((child) => child.id !== null)
  };
}

function listParams(query) {
  const search = trimmed(query.q);
  if (search) return { q: search, limit: 20 };

  const params = { per_page: 12 };
  const cursor = trimmed(query.cursor);
  if (cursor) params.cursor = cursor;
  return params;
}

router.get('/', asyncRoute(async (req, res) => {
  const params = listParams(req.query);
  const result = await getKnowledgeBaseArticles(params);
  const meta = metaFrom(result);
  const searchQuery = trimmed(req.query.q);
  const nextCursor = trimmed(meta.cursor);
  const hasMore = Boolean(meta.has_more ?? meta.hasMore);

  return res.render('kb/index', {
    title: 'Knowledge base',
    activeNav: 'kb',
    communityName: communityName(res),
    articles: rowsFrom(result).map(normalizeArticleSummary).filter((article) => article.id !== null),
    searchQuery,
    hasMore,
    nextCursor,
    nextHref: hasMore && nextCursor
      ? `/kb?${new URLSearchParams({
        ...(searchQuery ? { q: searchQuery } : {}),
        cursor: nextCursor
      }).toString()}`
      : ''
  });
}));

router.get('/:id(\\d+)', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const article = normalizeArticle(await getKnowledgeBaseArticle(id), id);

  return res.render('kb/article', {
    title: article.title,
    activeNav: 'kb',
    communityName: communityName(res),
    article
  });
}, { notFoundTitle: 'Article not found' }));

module.exports = router;
