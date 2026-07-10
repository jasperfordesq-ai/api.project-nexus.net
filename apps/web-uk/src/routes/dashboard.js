// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const {
  getBalance,
  getListings,
  getFeedPosts,
  getMyEvents,
  getGamificationProfile,
  getMyBadges,
  getOnboardingStatus,
  getExchangeAttentionCount,
  getMemberEndorsements
} = require('../lib/api');
const { asyncRoute } = require('../lib/routeHelpers');
const { getRequestIntlLocale } = require('../lib/request-intl-locale');
const { getRequestProfile } = require('../lib/request-profile');

const router = express.Router();

router.use(requireAuth);

function dataFrom(result) {
  if (!result || typeof result !== 'object') return result;
  return result.data !== undefined ? result.data : result;
}

function collectionFrom(result) {
  const data = dataFrom(result);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data && data.items)) return data.items;
  if (Array.isArray(data && data.data)) return data.data;
  if (Array.isArray(result && result.items)) return result.items;
  if (Array.isArray(result && result.data)) return result.data;
  return [];
}

function numberFrom(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function integerFrom(value, fallback = 0) {
  return Math.trunc(numberFrom(value, fallback));
}

function formatOneDecimal(value) {
  return numberFrom(value).toFixed(1);
}

function formatInteger(value) {
  return new Intl.NumberFormat(getRequestIntlLocale()).format(integerFrom(value));
}

function displayName(profile) {
  const first = String(profile && (profile.first_name || profile.firstName || '')).trim();
  const last = String(profile && (profile.last_name || profile.lastName || '')).trim();
  const combined = [first, last].filter(Boolean).join(' ').trim();
  return combined || String(profile && (profile.display_name || profile.displayName || profile.name || 'User')).trim();
}

function profileId(profile) {
  const id = Number(profile && (profile.id ?? profile.user_id ?? profile.userId));
  return Number.isInteger(id) && id > 0 ? id : null;
}

function firstName(profile) {
  return String(profile && (profile.first_name || profile.firstName || '')).trim() || displayName(profile);
}

function profileStats(profile) {
  const stats = (profile && (profile.stats || profile.profile_stats || profile.profileStats)) || {};
  const hoursGiven = numberFrom(stats.hours_given ?? stats.hoursGiven ?? profile.hours_given ?? profile.hoursGiven);
  const hoursReceived = numberFrom(stats.hours_received ?? stats.hoursReceived ?? profile.hours_received ?? profile.hoursReceived);
  const listingsCount = integerFrom(stats.listings_count ?? stats.listingsCount ?? profile.listings_count ?? profile.listingsCount);

  return {
    hoursGiven,
    hoursGivenLabel: formatOneDecimal(hoursGiven),
    hoursReceived,
    hoursReceivedLabel: formatOneDecimal(hoursReceived),
    listingsCount,
    listingsCountLabel: formatInteger(listingsCount)
  };
}

function walletBalance(result) {
  const data = dataFrom(result);
  if (typeof data === 'number') return data;
  return numberFrom(data && (data.balance ?? data.available_balance ?? data.availableBalance));
}

function onboardingCompleted(result) {
  const data = dataFrom(result) || {};
  if (data.onboarding_completed !== undefined) return Boolean(data.onboarding_completed);
  if (data.onboardingCompleted !== undefined) return Boolean(data.onboardingCompleted);
  if (data.completed !== undefined) return Boolean(data.completed);
  return true;
}

function normalizedGamification(result, badges) {
  const data = dataFrom(result) || {};
  const profile = data.profile || data.gamification || data;
  const levelProgress = profile.level_progress || profile.levelProgress || {};
  const progressPct = Math.max(0, Math.min(100, integerFrom(
    levelProgress.progress_percentage ?? levelProgress.progressPercentage ?? profile.progress_percentage ?? profile.progressPercentage
  )));

  const level = integerFrom(profile.level, 1);
  const xp = integerFrom(profile.xp ?? profile.total_xp ?? profile.totalXp);
  const badgesCount = integerFrom(profile.badges_count ?? profile.badgesCount ?? badges.length, badges.length);

  return {
    level,
    levelName: String(profile.level_name || profile.levelName || '').trim(),
    xp,
    xpLabel: formatInteger(xp),
    progressPct,
    progressLabel: `${progressPct}% of the way to the next level`,
    badgesCount,
    badgesCountLabel: formatInteger(badgesCount)
  };
}

function feedItemType(item) {
  const type = String(item && item.type ? item.type : 'post');
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function stripTags(value) {
  return String(value || '').replace(/<[^>]*>/g, '').trim();
}

function normalizeFeedItem(item) {
  return {
    id: item && item.id,
    typeLabel: feedItemType(item),
    title: String(item && (item.title || item.heading || feedItemType(item))).trim(),
    content: stripTags(item && (item.content || item.body)),
    authorName: String(item && ((item.author && item.author.name) || item.author_name || item.authorName || 'Unknown author')).trim(),
    imageUrl: item && (item.image_url || item.imageUrl || (item.media && item.media[0] && (item.media[0].thumbnail_url || item.media[0].file_url)))
  };
}

function normalizeListing(listing) {
  const type = String(listing && listing.type ? listing.type : 'offer').toLowerCase() === 'request' ? 'request' : 'offer';
  return {
    id: listing && listing.id,
    title: String(listing && (listing.title || listing.name || 'Untitled')).trim(),
    type,
    description: stripTags(listing && listing.description),
    imageUrl: listing && (listing.image_url || listing.imageUrl)
  };
}

function normalizeEvent(event) {
  return {
    id: event && event.id,
    title: String(event && (event.title || event.name || 'Event')).trim(),
    start: event && (event.start_time || event.startTime || event.starts_at || event.startsAt || event.start_date || event.startDate),
    location: String(event && (event.location || event.venue || '')).trim()
  };
}

function normalizeExchangeAttention(result) {
  const data = dataFrom(result) || {};
  const count = integerFrom(data.count ?? data.total);
  const items = collectionFrom(data.items ? { data: data.items } : data)
    .slice(0, 5)
    .map((item) => ({
      id: item && item.id,
      title: String(item && (item.listing_title || item.listingTitle || item.title || item.description || 'Exchange')).trim()
    }));

  return {
    count,
    items,
    body: count === 1
      ? 'You have 1 exchange that needs your attention.'
      : `You have ${formatInteger(count)} exchanges that need your attention.`
  };
}

function normalizeEndorsements(result) {
  const data = dataFrom(result) || {};
  const endorsements = Array.isArray(data.endorsements)
    ? data.endorsements
    : collectionFrom(data);

  return endorsements
    .map((endorsement) => {
      const skillName = String(endorsement && (endorsement.skill_name || endorsement.skillName || endorsement.name || endorsement.skill || '')).trim();
      const count = integerFrom(endorsement && (endorsement.count ?? endorsement.endorsement_count ?? endorsement.endorsements_count));
      return {
        skillName,
        count,
        countLabel: count === 1 ? '1 endorsement' : `${formatInteger(count)} endorsements`
      };
    })
    .filter((endorsement) => endorsement.skillName && endorsement.count > 0)
    .slice(0, 6);
}

function isGoingEvent(event) {
  const rsvp = event && (event.my_rsvp || event.myRsvp);
  if (!rsvp) return true;
  if (typeof rsvp === 'string') return rsvp.toLowerCase() === 'going';
  return String(rsvp.status || '').toLowerCase() === 'going';
}

router.get('/', asyncRoute(async (req, res) => {
  const [
    profile,
    balanceData,
    onboardingData,
    gamificationData,
    badgesData,
    listingsData,
    feedData,
    eventsData
  ] = await Promise.all([
    getRequestProfile(req, req.token),
    getBalance(req.token).catch(() => ({ balance: 0 })),
    getOnboardingStatus(req.token).catch(() => ({ data: { onboarding_completed: true } })),
    getGamificationProfile(req.token).catch(() => ({ profile: { level: 1, total_xp: 0 } })),
    getMyBadges(req.token).catch(() => ({ data: [] })),
    getListings(req.token, { limit: 5 }).catch(() => ({ data: [] })),
    getFeedPosts(req.token, { limit: 5 }).catch(() => ({ data: [] })),
    getMyEvents(req.token).catch(() => ({ data: [] }))
  ]);

  const safeProfile = dataFrom(profile) || {};
  const badges = collectionFrom(badgesData).slice(0, 8);
  const balance = walletBalance(balanceData);
  const currentProfileId = profileId(safeProfile);
  const [exchangeAttentionData, endorsementsData] = await Promise.all([
    getExchangeAttentionCount(req.token).catch(() => ({ data: { count: 0, items: [] } })),
    currentProfileId
      ? getMemberEndorsements(req.token, currentProfileId).catch(() => ({ data: { endorsements: [] } }))
      : Promise.resolve({ data: { endorsements: [] } })
  ]);

  res.render('dashboard/index', {
    title: 'Dashboard',
    activeNav: 'dashboard',
    profile: safeProfile,
    displayName: displayName(safeProfile),
    firstName: firstName(safeProfile),
    profileStats: profileStats(safeProfile),
    balance,
    balanceLabel: `${formatOneDecimal(balance)} hours`,
    onboardingCompleted: onboardingCompleted(onboardingData),
    exchangeAttention: normalizeExchangeAttention(exchangeAttentionData),
    endorsements: normalizeEndorsements(endorsementsData),
    gamification: normalizedGamification(gamificationData, badges),
    badges,
    listings: collectionFrom(listingsData).slice(0, 5).map(normalizeListing),
    feedItems: collectionFrom(feedData).slice(0, 5).map(normalizeFeedItem),
    upcomingEvents: collectionFrom(eventsData).filter(Boolean).filter(isGoingEvent).slice(0, 3).map(normalizeEvent),
    communityName: res.locals.tenantName || res.locals.serviceName || 'Project NEXUS Accessible',
    status: String(req.query.status || ''),
    successMessage: req.flash ? req.flash('success')[0] : null
  });
}));

module.exports = router;
