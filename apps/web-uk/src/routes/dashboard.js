// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const {
  getProfile,
  getBalance,
  getListings,
  getFeedPosts,
  getMyEvents,
  getGamificationProfile,
  getAllBadges
} = require('../lib/api');
const { asyncRoute } = require('../lib/routeHelpers');

const router = express.Router();

router.use(requireAuth);

function unwrapList(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.data)) return payload.data;
  if (payload.data && Array.isArray(payload.data.items)) return payload.data.items;
  if (payload.data && Array.isArray(payload.data.data)) return payload.data.data;
  return [];
}

function unwrapObject(payload) {
  if (!payload || typeof payload !== 'object') return {};
  return payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)
    ? payload.data
    : payload;
}

function firstPresent(...values) {
  return values.find(value => value !== undefined && value !== null && value !== '');
}

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function formatDecimal(value, places = 1) {
  return toNumber(value).toFixed(places);
}

function stripHtml(value) {
  return String(value || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function truncate(value, maxLength = 180) {
  const clean = stripHtml(value);
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength - 3).trim()}...`;
}

function normalizeFeedItem(item) {
  const type = firstPresent(item.type, item.item_type, 'post');
  const author = item.author || item.user || {};
  const media = Array.isArray(item.media) ? item.media : [];
  const title = firstPresent(item.title, item.name, type === 'post' ? 'Post' : 'Activity');

  return {
    id: item.id,
    type,
    typeLabel: type === 'request' ? 'Request' : type === 'offer' ? 'Offer' : type === 'event' ? 'Event' : type === 'listing' ? 'Listing' : 'Post',
    title,
    url: '/feed',
    authorName: firstPresent(author.name, author.full_name, author.firstName, author.first_name, item.author_name, 'Unknown author'),
    authorAvatar: firstPresent(author.avatar_url, author.avatarUrl),
    content: truncate(firstPresent(item.content, item.body, item.description, ''), 180),
    imageUrl: firstPresent(item.image_url, item.imageUrl, media[0]?.thumbnail_url, media[0]?.file_url)
  };
}

function normalizeListing(listing) {
  const type = firstPresent(listing.type, listing.listing_type, 'offer') === 'request' ? 'request' : 'offer';

  return {
    id: listing.id,
    type,
    typeLabel: type === 'request' ? 'Request' : 'Offer',
    typeClass: type === 'request' ? 'govuk-tag--purple' : 'govuk-tag--blue',
    title: firstPresent(listing.title, listing.name, 'Untitled listing'),
    description: truncate(firstPresent(listing.description, listing.summary, ''), 180),
    imageUrl: firstPresent(listing.image_url, listing.imageUrl)
  };
}

function normalizeEvent(event) {
  return {
    id: event.id,
    title: firstPresent(event.title, event.name, 'Untitled event'),
    startsAt: firstPresent(event.start_time, event.starts_at, event.startsAt, event.date),
    location: firstPresent(event.location, event.venue, event.address)
  };
}

function normalizeBadge(badge) {
  return {
    icon: firstPresent(badge.icon, badge.emoji, ''),
    name: firstPresent(badge.name, badge.title, 'Badge')
  };
}

router.get('/', asyncRoute(async (req, res) => {
  const [
    profileData,
    balanceData,
    listingsData,
    feedData,
    eventsData,
    gamificationData,
    badgesData
  ] = await Promise.all([
    getProfile(req.token).catch(() => ({})),
    getBalance(req.token).catch(() => ({ balance: 0 })),
    getListings(req.token, { limit: 5 }).catch(() => ({ data: [] })),
    getFeedPosts(req.token, { limit: 5 }).catch(() => ({ data: [] })),
    getMyEvents(req.token).catch(() => ({ data: [] })),
    getGamificationProfile(req.token).catch(() => ({ profile: { level: 1, xp: 0 } })),
    getAllBadges(req.token).catch(() => ({ badges: [] }))
  ]);

  const profile = unwrapObject(profileData);
  const profileStats = profile.stats || {};
  const walletBalance = balanceData != null ? firstPresent(balanceData.balance, balanceData.wallet_balance, balanceData) : 0;
  const gamification = unwrapObject(gamificationData.profile || gamificationData);
  const progress = gamification.level_progress || gamification.levelProgress || {};
  const progressPercent = Math.max(0, Math.min(100, Math.round(toNumber(firstPresent(
    progress.progress_percentage,
    progress.progressPercentage
  )))));
  const badges = unwrapList(firstPresent(badgesData.badges, badgesData.items, badgesData.data, badgesData))
    .map(normalizeBadge)
    .slice(0, 8);
  const firstName = firstPresent(profile.first_name, profile.firstName, profile.name, profile.email);
  const now = new Date();

  res.render('dashboard/index', {
    title: 'Dashboard',
    activeNav: 'dashboard',
    communityName: res.locals.tenantName || res.locals.serviceName || 'Project NEXUS Accessible',
    firstName,
    profile,
    profileStats: {
      hoursGiven: formatDecimal(firstPresent(
        profileStats.hours_given,
        profileStats.hoursGiven,
        profile.hours_given,
        profile.hoursGiven
      )),
      hoursReceived: formatDecimal(firstPresent(
        profileStats.hours_received,
        profileStats.hoursReceived,
        profile.hours_received,
        profile.hoursReceived
      )),
      listingsCount: Math.round(toNumber(firstPresent(
        profileStats.listings_count,
        profileStats.listingsCount,
        profile.listings_count,
        profile.listingsCount
      )))
    },
    wallet: {
      balance: formatDecimal(walletBalance)
    },
    listings: unwrapList(listingsData).map(normalizeListing).slice(0, 5),
    feedItems: unwrapList(feedData).map(normalizeFeedItem).slice(0, 5),
    upcomingEvents: unwrapList(eventsData)
      .map(normalizeEvent)
      .filter(event => !event.startsAt || new Date(event.startsAt) >= now)
      .slice(0, 3),
    endorsements: [],
    gamification: {
      level: Math.round(toNumber(gamification.level, 1)),
      levelName: firstPresent(gamification.level_name, gamification.levelName, ''),
      xp: Math.round(toNumber(firstPresent(gamification.xp, gamification.total_xp, gamification.totalXp))),
      progressPercent,
      badgesCount: Math.round(toNumber(firstPresent(
        gamification.badges_count,
        gamification.badgesCount,
        badges.length
      ), badges.length))
    },
    badges,
    onboardingCompleted: firstPresent(profile.onboarding_completed, profile.onboardingCompleted, true) !== false,
    exchangeAttentionCount: 0,
    status: req.query.status,
    successMessage: req.flash ? req.flash('success')[0] : null
  });
}));

module.exports = router;
