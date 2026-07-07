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
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    if (data.data && typeof data.data === 'object' && !Array.isArray(data.data)) return data.data;
    return data;
  }
  return {};
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

function normalizeChallengeForm(item) {
  const challenge = normalizeChallenge(item);
  const row = item && typeof item === 'object' ? item : {};
  return {
    ...challenge,
    description: trimmed(row.description),
    categoryId: positiveInteger(row.category_id ?? row.categoryId),
    prizeDescription: trimmed(row.prize_description ?? row.prizeDescription),
    coverImage: trimmed(row.cover_image ?? row.coverImage),
    tagsText: challenge.tags.join(', ')
  };
}

function challengeTransitions(status) {
  const transitions = {
    draft: ['open'],
    open: ['voting', 'evaluating', 'closed'],
    voting: ['evaluating', 'closed'],
    evaluating: ['closed'],
    closed: ['open', 'archived'],
    archived: ['closed']
  };
  return transitions[trimmed(status).toLowerCase()] || [];
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

function normalizeCategory(item) {
  const row = item && typeof item === 'object' ? item : {};
  const id = positiveInteger(row.id);
  const name = trimmed(row.name || row.title);
  if (id === null || !name) return null;
  return { id, name };
}

function normalizeTemplate(item) {
  const row = item && typeof item === 'object' ? item : {};
  const id = positiveInteger(row.id);
  const title = trimmed(row.title || row.name);
  if (id === null || !title) return null;
  return {
    id,
    title,
    description: limitText(row.description, 120)
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

function normalizeCampaignDetail(item) {
  const campaign = normalizeCampaign(item);
  const row = item && typeof item === 'object' ? item : {};
  return {
    ...campaign,
    description: trimmed(row.description),
    startDate: trimmed(row.start_date ?? row.startDate),
    endDate: trimmed(row.end_date ?? row.endDate),
    challenges: collectionFrom(row.challenges)
      .map(normalizeChallenge)
      .filter((challenge) => challenge.id !== null)
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

function normalizeDraft(item) {
  const row = item && typeof item === 'object' ? item : {};
  const id = positiveInteger(row.id);
  return {
    ...row,
    id,
    title: trimmed(row.title),
    description: trimmed(row.description),
    updatedAt: trimmed(row.updated_at ?? row.updatedAt),
    createdAt: trimmed(row.created_at ?? row.createdAt)
  };
}

function ideaStatusDetails(status) {
  switch (trimmed(status).toLowerCase()) {
    case 'shortlisted':
      return { label: 'Shortlisted', className: 'govuk-tag--yellow' };
    case 'winner':
      return { label: 'Winner', className: 'govuk-tag--green' };
    case 'withdrawn':
      return { label: 'Withdrawn', className: 'govuk-tag--grey' };
    default:
      return { label: 'Submitted', className: 'govuk-tag--blue' };
  }
}

function normalizeIdeaDetail(item, challenge) {
  const idea = normalizeIdea(item);
  const row = item && typeof item === 'object' ? item : {};
  const status = ideaStatusDetails(row.status);
  const challengeStatus = trimmed(challenge?.status).toLowerCase();
  const isOwner = Boolean(row.is_owner || row.isOwner);
  const isAdmin = Boolean(row.is_admin || row.isAdmin);
  const ideaStatus = trimmed(row.status || 'submitted').toLowerCase();
  const hasVoted = Boolean(row.has_voted || row.hasVoted);
  return {
    ...idea,
    challengeId: positiveInteger(row.challenge_id ?? row.challengeId),
    status: ideaStatus || 'submitted',
    statusLabel: status.label,
    statusClass: status.className,
    hasVoted,
    isOwner,
    isAdmin,
    canVote: Boolean(row.can_vote || row.canVote)
      || (['open', 'voting'].includes(challengeStatus) && !isOwner && !['withdrawn', 'draft'].includes(ideaStatus)),
    canComment: row.can_comment !== false && row.canComment !== false && !['withdrawn', 'draft'].includes(ideaStatus),
    canConvert: Boolean(row.can_convert || row.canConvert || ((isAdmin || isOwner) && ['shortlisted', 'winner'].includes(ideaStatus)))
  };
}

function normalizeComment(item) {
  const row = item && typeof item === 'object' ? item : {};
  const author = row.author && typeof row.author === 'object' ? row.author : {};
  return {
    id: positiveInteger(row.id),
    body: trimmed(row.body || row.comment || row.content),
    authorName: trimmed(author.name || row.author_name || row.authorName)
  };
}

function normalizeMedia(item) {
  const row = item && typeof item === 'object' ? item : {};
  const type = trimmed(row.media_type ?? row.mediaType ?? row.type).toLowerCase();
  const typeLabels = {
    image: 'Image',
    video: 'Video',
    document: 'Document',
    link: 'Link'
  };
  return {
    id: positiveInteger(row.id),
    url: trimmed(row.url),
    caption: trimmed(row.caption),
    type: ['image', 'video', 'document', 'link'].includes(type) ? type : 'link',
    typeLabel: typeLabels[type] || 'Link'
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

function ideaDetailStatusMessage(status) {
  const messages = {
    'idea-voted': 'Your vote has been recorded.',
    'idea-status-updated': 'The idea status has been updated.',
    'idea-deleted': 'The idea has been deleted.',
    'comment-added': 'Your comment has been posted.',
    'comment-deleted': 'The comment has been deleted.',
    'media-added': 'The attachment has been added.',
    converted: 'A group has been created from this idea.'
  };
  return messages[trimmed(status)] || '';
}

function ideaDetailErrorMessage(status) {
  const messages = {
    'idea-failed': 'Sorry, that action could not be completed. Please try again.',
    'comment-invalid': 'Enter a comment before posting.',
    'comment-failed': 'Sorry, your comment could not be posted. Please try again.',
    'media-invalid': 'Enter a web address for the attachment.',
    'media-failed': 'Sorry, the attachment could not be added. Please try again.',
    'convert-failed': 'Sorry, the idea could not be turned into a group. Please try again.'
  };
  return messages[trimmed(status)] || '';
}

function draftStatusMessage(status) {
  const messages = {
    'draft-saved': 'Your draft has been saved.'
  };
  return messages[trimmed(status)] || '';
}

function draftErrorMessage(status) {
  const messages = {
    'draft-invalid': 'Enter a title for your draft.',
    'draft-failed': 'Sorry, your draft could not be saved. Please try again.'
  };
  return messages[trimmed(status)] || '';
}

function manageStatusMessage(status) {
  const messages = {
    'challenge-status-updated': 'The challenge status has been updated.',
    'campaign-linked': 'The challenge has been linked to the campaign.',
    favorited: 'The challenge has been added to your favourites.',
    unfavorited: 'The challenge has been removed from your favourites.'
  };
  return messages[trimmed(status)] || '';
}

function manageErrorMessage(status) {
  const messages = {
    'challenge-status-failed': 'The challenge status could not be updated.',
    'challenge-failed': 'Sorry, the challenge action could not be completed.',
    'campaign-link-failed': 'The challenge could not be linked to the campaign.'
  };
  return messages[trimmed(status)] || '';
}

function campaignStatusMessage(status) {
  const messages = {
    'campaign-created': 'The campaign has been created.',
    'campaign-updated': 'The campaign has been updated.',
    'campaign-deleted': 'The campaign has been deleted.',
    'challenge-unlinked': 'The challenge has been unlinked from the campaign.'
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

router.get('/new', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const categoriesResult = await callIdeationApi(token, 'GET', '/ideation-categories');
  const templatesResult = await callIdeationApi(token, 'GET', '/ideation-templates');
  const categories = compact(collectionFrom(categoriesResult).map(normalizeCategory));
  const templates = compact(collectionFrom(templatesResult).map(normalizeTemplate));
  const status = trimmed(req.query.status);

  return res.render('ideation/challenge-form', {
    title: 'Create challenge',
    activeNav: 'explore',
    mode: 'create',
    challenge: {
      status: 'draft',
      tagsText: ''
    },
    categories,
    templates,
    status,
    errorMessage: status === 'challenge-failed' ? 'Sorry, the challenge could not be saved. Please try again.' : ''
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

router.get('/campaigns/:id(\\d+)', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const id = positiveInteger(req.params.id);
  const result = await callIdeationApi(token, 'GET', `/ideation-campaigns/${id}`);
  const campaign = normalizeCampaignDetail({ id, ...itemFrom(result) });
  const status = trimmed(req.query.status);

  return res.render('ideation/campaign-detail', {
    title: campaign.title,
    activeNav: 'explore',
    campaign,
    status,
    successMessage: campaignStatusMessage(status),
    errorMessage: campaignErrorMessage(status)
  });
}, { redirectOn401: loginRedirect(), notFoundTitle: 'Ideation campaign not found' }));

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

router.get('/:id(\\d+)/manage', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const id = positiveInteger(req.params.id);
  const challengeResult = await callIdeationApi(token, 'GET', `/ideation-challenges/${id}`);
  const campaignsResult = await callIdeationApi(token, 'GET', '/ideation-campaigns?per_page=100');
  const challenge = normalizeChallenge({ id, ...itemFrom(challengeResult) });
  const campaigns = collectionFrom(campaignsResult)
    .map(normalizeCampaign)
    .filter((campaign) => campaign.id !== null);
  const status = trimmed(req.query.status);

  return res.render('ideation/manage', {
    title: 'Manage challenge',
    activeNav: 'explore',
    challenge,
    campaigns,
    transitions: challengeTransitions(challenge.status),
    isFavorited: Boolean(challenge.is_favorited || challenge.isFavorited || challenge.has_favorited || challenge.hasFavorited),
    status,
    successMessage: manageStatusMessage(status),
    errorMessage: manageErrorMessage(status)
  });
}, { redirectOn401: loginRedirect(), notFoundTitle: 'Ideation challenge not found' }));

router.get('/:id(\\d+)/drafts', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const id = positiveInteger(req.params.id);
  const challengeResult = await callIdeationApi(token, 'GET', `/ideation-challenges/${id}`);
  const draftsResult = await callIdeationApi(token, 'GET', `/ideation-challenges/${id}/ideas/drafts`);
  const challenge = normalizeChallenge({ id, ...itemFrom(challengeResult) });
  const drafts = collectionFrom(draftsResult)
    .map(normalizeDraft)
    .filter((draft) => draft.id !== null);
  const status = trimmed(req.query.status);

  return res.render('ideation/drafts', {
    title: 'Your draft ideas',
    activeNav: 'explore',
    challenge,
    drafts,
    status,
    successMessage: draftStatusMessage(status),
    errorMessage: draftErrorMessage(status)
  });
}, { redirectOn401: loginRedirect(), notFoundTitle: 'Ideation challenge not found' }));

router.get('/:id(\\d+)/ideas/:ideaId(\\d+)', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const id = positiveInteger(req.params.id);
  const ideaId = positiveInteger(req.params.ideaId);
  const ideaResult = await callIdeationApi(token, 'GET', `/ideation-ideas/${ideaId}`);
  const ideaData = itemFrom(ideaResult);
  if (positiveInteger(ideaData.challenge_id ?? ideaData.challengeId) !== id) {
    return res.status(404).render('errors/404', { title: 'Ideation idea not found' });
  }

  const challengeResult = await callIdeationApi(token, 'GET', `/ideation-challenges/${id}`);
  const commentsResult = await callIdeationApi(token, 'GET', `/ideation-ideas/${ideaId}/comments?per_page=30`);
  const mediaResult = await callIdeationApi(token, 'GET', `/ideation-ideas/${ideaId}/media`);
  const challenge = normalizeChallenge({ id, ...itemFrom(challengeResult) });
  const idea = normalizeIdeaDetail({ id: ideaId, ...ideaData }, challenge);
  const comments = collectionFrom(commentsResult)
    .map(normalizeComment)
    .filter((comment) => comment.id !== null && comment.body);
  const media = collectionFrom(mediaResult)
    .map(normalizeMedia)
    .filter((item) => item.id !== null && item.url);
  const status = trimmed(req.query.status);

  return res.render('ideation/idea-detail', {
    title: idea.title,
    activeNav: 'explore',
    challenge,
    idea,
    comments,
    media,
    status,
    successMessage: ideaDetailStatusMessage(status),
    errorMessage: ideaDetailErrorMessage(status)
  });
}, { redirectOn401: loginRedirect(), notFoundTitle: 'Ideation idea not found' }));

router.get('/:id(\\d+)/edit', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const id = positiveInteger(req.params.id);
  const challengeResult = await callIdeationApi(token, 'GET', `/ideation-challenges/${id}`);
  const categoriesResult = await callIdeationApi(token, 'GET', '/ideation-categories');
  const challenge = normalizeChallengeForm({ id, ...itemFrom(challengeResult) });
  const categories = compact(collectionFrom(categoriesResult).map(normalizeCategory));
  const status = trimmed(req.query.status);

  return res.render('ideation/challenge-form', {
    title: 'Edit challenge',
    activeNav: 'explore',
    mode: 'edit',
    challenge,
    categories,
    templates: [],
    status,
    errorMessage: status === 'challenge-failed' ? 'Sorry, the challenge could not be saved. Please try again.' : ''
  });
}, { redirectOn401: loginRedirect(), notFoundTitle: 'Ideation challenge not found' }));

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
