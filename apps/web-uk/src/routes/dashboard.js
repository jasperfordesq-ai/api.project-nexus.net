// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const {
  getProfile,
  getBalance,
  getListings,
  getUnreadCount,
  getTransactions,
  getNotifications,
  getFeedPosts,
  getMyEvents,
  getMyGroups,
  getGamificationProfile
} = require('../lib/api');
const { asyncRoute } = require('../lib/routeHelpers');

const router = express.Router();

router.use(requireAuth);

// Dashboard
router.get('/', asyncRoute(async (req, res) => {
  // Fetch all data in parallel
  const [
    profile,
    balanceData,
    listingsData,
    unreadData,
    transactionsData,
    notificationsData,
    feedData,
    eventsData,
    groupsData,
    gamificationData
  ] = await Promise.all([
    getProfile(req.token),
    getBalance(req.token).catch(() => ({ balance: 0 })),
    getListings(req.token, { limit: 5 }).catch(() => ({ data: [] })),
    getUnreadCount(req.token).catch(() => ({ unreadCount: 0 })),
    getTransactions(req.token, { limit: 5 }).catch(() => ({ data: [] })),
    getNotifications(req.token, { limit: 5 }).catch(() => ({ data: [] })),
    getFeedPosts(req.token, { limit: 5 }).catch(() => ({ data: [] })),
    getMyEvents(req.token).catch(() => ({ data: [] })),
    getMyGroups(req.token).catch(() => ({ data: [] })),
    getGamificationProfile(req.token).catch(() => ({ profile: { level: 1, total_xp: 0, totalXp: 0 } }))
  ]);

  // Build activity feed from various sources
  const activityItems = [];

  // Add recent notifications
  const notifications = notificationsData.items || notificationsData.data || [];
  notifications.slice(0, 3).forEach(n => {
    activityItems.push({
      type: 'notification',
      icon: '🔔',
      content: n.message || n.content,
      link: n.link || '/notifications',
      time: n.createdAt || n.created_at,
      read: (n.readAt || n.read_at) != null
    });
  });

  // Add recent feed posts
  const posts = feedData.items || feedData.data || [];
  posts.slice(0, 3).forEach(p => {
    activityItems.push({
      type: 'post',
      icon: '📝',
      content: `${p.user?.firstName || p.user?.first_name || 'Someone'} posted: "${(p.content || '').substring(0, 50)}${p.content?.length > 50 ? '...' : ''}"`,
      link: `/feed/${p.id}`,
      time: p.createdAt || p.created_at
    });
  });

  // Sort by time, most recent first
  activityItems.sort((a, b) => new Date(b.time) - new Date(a.time));

  // Get upcoming events (next 3)
  const events = eventsData.items || eventsData.data || [];
  const now = new Date();
  const upcomingEvents = events
    .filter(e => {
      const startsAt = e.starts_at || e.startsAt;
      const isPast = startsAt ? new Date(startsAt) < now : false;
      // my_rsvp is a string from backend (e.g. "Going"), not an object
      const rsvpStatus = (typeof (e.my_rsvp || e.myRsvp) === 'string')
        ? (e.my_rsvp || e.myRsvp)
        : (e.my_rsvp || e.myRsvp)?.status || '';
      return !isPast && rsvpStatus.toLowerCase() === 'going';
    })
    .slice(0, 3);

  res.render('dashboard/index', {
    title: 'Dashboard',
    profile,
    balance: balanceData.balance ?? balanceData,
    listings: listingsData.items || listingsData.data || (Array.isArray(listingsData) ? listingsData : []),
    unreadCount: unreadData.unread_count ?? unreadData.unreadCount ?? unreadData.count ?? 0,
    recentTransactions: transactionsData.items || transactionsData.data || (Array.isArray(transactionsData) ? transactionsData : []),
    activityItems: activityItems.slice(0, 5),
    upcomingEvents,
    myGroups: (groupsData.items || groupsData.data || []).slice(0, 3),
    gamification: gamificationData.profile || { level: 1, total_xp: 0, totalXp: 0 },
    successMessage: req.flash ? req.flash('success')[0] : null
  });
}));

module.exports = router;
