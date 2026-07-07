// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const { callIdeationApi } = require('../lib/api');
const { asyncRoute } = require('../lib/routeHelpers');

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

function positiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function dataFrom(result) {
  return result && typeof result === 'object' && result.data !== undefined ? result.data : result;
}

function collectionFrom(result) {
  const data = dataFrom(result);
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  if (data && Array.isArray(data.data)) return data.data;
  if (Array.isArray(result?.items)) return result.items;
  return [];
}

function compact(items) {
  return items.filter(Boolean);
}

function itemFrom(result) {
  const data = dataFrom(result);
  return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
}

function compactQuery(params) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const text = trimmed(value);
    if (text !== '') query.append(key, text);
  }
  return query.toString();
}

function plural(count, singular, pluralText) {
  return count === 1 ? `1 ${singular}` : `${count} ${pluralText}`;
}

function statusDetails(status) {
  switch (trimmed(status).toLowerCase()) {
    case 'open':
      return { label: 'Open', className: 'govuk-tag--green' };
    case 'voting':
      return { label: 'Voting', className: 'govuk-tag--blue' };
    case 'evaluating':
      return { label: 'Evaluating', className: 'govuk-tag--purple' };
    case 'closed':
    case 'archived':
      return { label: 'Closed', className: 'govuk-tag--grey' };
    default:
      return { label: 'Draft', className: 'govuk-tag--grey' };
  }
}

function normalizeTags(value) {
  if (Array.isArray(value)) return value.map((item) => trimmed(item)).filter(Boolean);
  return [];
}

function limitText(value, maxLength = 160) {
  const text = trimmed(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trim()}...`;
}

function normalizeChallenge(item) {
  const row = item && typeof item === 'object' ? item : {};
  const id = positiveInteger(row.id);
  const status = statusDetails(row.status);
  const ideasCount = Number(row.ideas_count ?? row.ideasCount ?? 0) || 0;
  return {
    ...row,
    id,
    title: trimmed(row.title) || 'Ideas',
    description: trimmed(row.description),
    statusLabel: status.label,
    statusClass: status.className,
    ideasCount,
    ideasCountText: ideasCount === 0 ? 'No ideas yet' : plural(ideasCount, 'idea', 'ideas'),
    tags: normalizeTags(row.tags),
    category: trimmed(row.category),
    submissionDeadline: trimmed(row.submission_deadline ?? row.submissionDeadline),
    votingDeadline: trimmed(row.voting_deadline ?? row.votingDeadline),
    maxIdeasPerUser: row.max_ideas_per_user ?? row.maxIdeasPerUser ?? null,
    viewsCount: Number(row.views_count ?? row.viewsCount ?? 0) || 0,
    favoritesCount: Number(row.favorites_count ?? row.favoritesCount ?? 0) || 0,
    prizeDescription: trimmed(row.prize_description ?? row.prizeDescription),
    isOpenForIdeas: ['open', 'voting'].includes(trimmed(row.status).toLowerCase()),
    isOpenForVotes: ['open', 'voting'].includes(trimmed(row.status).toLowerCase())
  };
}

function normalizeTag(item) {
  const row = item && typeof item === 'object' ? item : {};
  const name = trimmed(row.tag || row.name);
  const count = Number(row.count ?? row.challenge_count ?? row.challengeCount ?? 0) || 0;
  if (!name) return null;
  return {
    name,
    count,
    countText: plural(count, 'challenge', 'challenges')
  };
}

function campaignStatusDetails(status) {
  switch (trimmed(status).toLowerCase()) {
    case 'active':
      return { label: 'Active', className: 'govuk-tag--green' };
    case 'completed':
      return { label: 'Completed', className: 'govuk-tag--blue' };
    case 'archived':
      return { label: 'Archived', className: 'govuk-tag--grey' };
    default:
      return { label: 'Draft', className: 'govuk-tag--grey' };
  }
}

function normalizeCampaign(item) {
  const row = item && typeof item === 'object' ? item : {};
  const id = positiveInteger(row.id);
  const status = campaignStatusDetails(row.status);
  const challengeCount = Number(row.challenge_count ?? row.challengeCount ?? 0) || 0;
  const creator = row.creator && typeof row.creator === 'object' ? row.creator : {};
  return {
    ...row,
    id,
    title: trimmed(row.title) || 'Campaigns',
    description: limitText(row.description),
    statusLabel: status.label,
    statusClass: status.className,
    challengeCount,
    challengeCountText: plural(challengeCount, 'challenge', 'challenges'),
    creatorName: trimmed(creator.name || row.creator_name || row.creatorName)
  };
}

function outcomeStatusDetails(status) {
  switch (trimmed(status).toLowerCase()) {
    case 'implemented':
      return { label: 'Implemented', className: 'govuk-tag--green' };
    case 'in_progress':
      return { label: 'In progress', className: 'govuk-tag--blue' };
    case 'abandoned':
      return { label: 'Abandoned', className: 'govuk-tag--red' };
    default:
      return { label: 'Not started', className: 'govuk-tag--grey' };
  }
}

function dashboardFrom(result) {
  const data = dataFrom(result);
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    if (data.data && typeof data.data === 'object' && !Array.isArray(data.data)) return data.data;
    return data;
  }
  return {};
}

function normalizeStats(stats) {
  const row = stats && typeof stats === 'object' ? stats : {};
  return {
    total: Number(row.total ?? 0) || 0,
    implemented: Number(row.implemented ?? 0) || 0,
    inProgress: Number(row.in_progress ?? row.inProgress ?? 0) || 0,
    notStarted: Number(row.not_started ?? row.notStarted ?? 0) || 0,
    abandoned: Number(row.abandoned ?? 0) || 0
  };
}

function normalizeOutcome(item) {
  const row = item && typeof item === 'object' ? item : {};
  const challengeId = positiveInteger(row.challenge_id ?? row.challengeId);
  const status = outcomeStatusDetails(row.status);
  return {
    ...row,
    challengeId,
    challengeTitle: trimmed(row.challenge_title ?? row.challengeTitle) || 'Challenges',
    ideaTitle: trimmed(row.idea_title ?? row.ideaTitle) || 'Not set',
    statusLabel: status.label,
    statusClass: status.className
  };
}

function normalizeIdea(item) {
  const row = item && typeof item === 'object' ? item : {};
  const id = positiveInteger(row.id);
  const votes = Number(row.vote_count ?? row.voteCount ?? row.votes_count ?? 0) || 0;
  const creator = row.creator && typeof row.creator === 'object' ? row.creator : {};
  return {
    ...row,
    id,
    title: trimmed(row.title) || 'Your idea',
    description: trimmed(row.description),
    voteCount: votes,
    voteText: votes === 0 ? 'No votes' : plural(votes, 'vote', 'votes'),
    authorName: trimmed(creator.name || row.creator_name || row.creatorName)
  };
}

function statusMessage(status) {
  const messages = {
    'idea-submitted': 'Thank you - your idea has been submitted.',
    'idea-voted': 'Your vote has been recorded.'
  };
  return messages[trimmed(status)] || '';
}

function errorMessage(status) {
  const messages = {
    'idea-invalid': 'Enter your idea.',
    'idea-failed': 'Something went wrong. Please try again.'
  };
  return messages[trimmed(status)] || '';
}

function campaignStatusMessage(status) {
  const messages = {
    'campaign-created': 'The campaign has been created.',
    'campaign-updated': 'The campaign has been updated.',
    'campaign-deleted': 'The campaign has been deleted.'
  };
  return messages[trimmed(status)] || '';
}

function campaignErrorMessage(status) {
  const messages = {
    'campaign-invalid': 'Check the campaign details and try again.',
    'campaign-failed': 'Sorry, that action could not be completed. Please try again.'
  };
  return messages[trimmed(status)] || '';
}

router.get('/', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const status = trimmed(req.query.status);
  const query = trimmed(req.query.q);
  const queryString = compactQuery({
    limit: 30,
    status,
    search: query
  });
  const result = await callIdeationApi(token, 'GET', `/ideation-challenges?${queryString}`);
  const challenges = collectionFrom(result)
    .map(normalizeChallenge)
    .filter((challenge) => challenge.id !== null);

  return res.render('ideation/index', {
    title: 'Ideas',
    activeNav: 'explore',
    challenges,
    activeStatus: status,
    activeQuery: query
  });
}, { redirectOn401: loginRedirect() }));

router.get('/campaigns', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const result = await callIdeationApi(token, 'GET', '/ideation-campaigns?per_page=50');
  const campaigns = collectionFrom(result)
    .map(normalizeCampaign)
    .filter((campaign) => campaign.id !== null);
  const status = trimmed(req.query.status);

  return res.render('ideation/campaigns', {
    title: 'Campaigns',
    activeNav: 'explore',
    campaigns,
    status,
    successMessage: campaignStatusMessage(status),
    errorMessage: campaignErrorMessage(status)
  });
}, { redirectOn401: loginRedirect() }));

router.get('/outcomes', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const result = await callIdeationApi(token, 'GET', '/ideation-outcomes/dashboard');
  const dashboard = dashboardFrom(result);
  const outcomes = collectionFrom(dashboard.outcomes)
    .map(normalizeOutcome)
    .filter((outcome) => outcome.challengeId !== null);

  return res.render('ideation/outcomes', {
    title: 'Outcomes',
    activeNav: 'explore',
    stats: normalizeStats(dashboard.stats),
    outcomes
  });
}, { redirectOn401: loginRedirect() }));

router.get('/tags', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const selectedTag = trimmed(req.query.tag, 100);
  const tagsResult = await callIdeationApi(token, 'GET', '/ideation-tags/popular');
  const tags = compact(collectionFrom(tagsResult).map(normalizeTag));
  let matches = [];

  if (selectedTag) {
    const selected = selectedTag.toLowerCase();
    const challengesResult = await callIdeationApi(token, 'GET', '/ideation-challenges?limit=100');
    matches = collectionFrom(challengesResult)
      .map(normalizeChallenge)
      .filter((challenge) => challenge.id !== null)
      .filter((challenge) => challenge.tags.some((tag) => tag.toLowerCase() === selected))
      .map((challenge) => ({
        ...challenge,
        description: limitText(challenge.description)
      }));
  }

  return res.render('ideation/tags', {
    title: 'Browse by tag',
    activeNav: 'explore',
    tags,
    selectedTag,
    matches
  });
}, { redirectOn401: loginRedirect() }));

router.get('/:id(\\d+)', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const id = positiveInteger(req.params.id);
  const challengeResult = await callIdeationApi(token, 'GET', `/ideation-challenges/${id}`);
  const ideasResult = await callIdeationApi(token, 'GET', `/ideation-challenges/${id}/ideas?limit=30&sort=votes`);
  const challenge = normalizeChallenge({ id, ...itemFrom(challengeResult) });
  const ideas = collectionFrom(ideasResult)
    .map(normalizeIdea)
    .filter((idea) => idea.id !== null);
  const status = trimmed(req.query.status);

  return res.render('ideation/detail', {
    title: challenge.title,
    activeNav: 'explore',
    challenge,
    ideas,
    status,
    successMessage: statusMessage(status),
    errorMessage: errorMessage(status)
  });
}, { redirectOn401: loginRedirect(), notFoundTitle: 'Ideation challenge not found' }));

module.exports = router;
