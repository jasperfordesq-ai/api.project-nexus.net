// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  markNotificationGroupRead,
  deleteAllNotifications: deleteAllNotificationsApi,
  deleteNotification,
  ApiError
} = require('../lib/api');
const { asyncRoute } = require('../lib/routeHelpers');
const { validateReturnUrl } = require('../lib/urlValidator');

const router = express.Router();

router.use(requireAuth);

// List notifications
router.get('/', asyncRoute(async (req, res) => {
  const { page = 1, unread_only } = req.query;

  const result = await getNotifications(req.token, {
    page: parseInt(page, 10),
    limit: 20,
    unread_only: unread_only === 'true'
  });

  const notifications = result.items || result.data || [];
  const unreadCount = result.unreadCount || result.unread_count || 0;
  const pagination = result.pagination || { page: 1, totalPages: 1 };

  res.render('notifications/index', {
    title: 'Notifications',
    notifications,
    unreadCount,
    pagination,
    showUnreadOnly: unread_only === 'true',
    successMessage: req.flash ? req.flash('success')[0] : null
  });
}));

// Laravel accessible alias: mark a grouped notification bucket read.
router.post('/group/read', asyncRoute(async (req, res) => {
  const groupKey = typeof req.body.group_key === 'string' ? req.body.group_key.trim() : '';
  if (!groupKey) {
    return res.redirect('/notifications');
  }

  try {
    await markNotificationGroupRead(req.token, groupKey);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) throw error;
    if (req.flash) req.flash('error', error.message || 'Unable to mark grouped notifications as read');
  }

  return res.redirect('/notifications?status=group-marked-read');
}));

// Mark single notification as read
router.post('/:id/read', asyncRoute(async (req, res) => {
  const { id } = req.params;
  const { redirect } = req.body;

  try {
    await markNotificationRead(req.token, id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) throw error;
    if (req.flash) req.flash('error', error.message || 'Unable to mark notification as read');
    return res.redirect('/notifications');
  }

  // If redirect URL provided, validate it to prevent open redirect attacks
  if (redirect) {
    const safeRedirect = validateReturnUrl(redirect, '/notifications');
    return res.redirect(safeRedirect);
  }

  res.redirect('/notifications');
}));

// Mark all notifications as read
router.post('/read-all', asyncRoute(async (req, res) => {
  try {
    const result = await markAllNotificationsRead(req.token);

    if (req.flash) {
      const count = result.markedCount || result.marked_count || 0;
      req.flash('success', `Marked ${count} notification${count !== 1 ? 's' : ''} as read`);
    }
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) throw error;
    if (req.flash) req.flash('error', error.message || 'Unable to mark notifications as read');
  }

  res.redirect('/notifications');
}));

// Laravel accessible alias: delete every notification for the signed-in user.
router.post('/delete-all', asyncRoute(async (req, res) => {
  try {
    await deleteAllNotificationsApi(req.token);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) throw error;
    if (req.flash) req.flash('error', error.message || 'Unable to delete notifications');
  }

  return res.redirect('/notifications?status=all-notifications-deleted');
}));

// Delete notification
router.post('/:id/delete', asyncRoute(async (req, res) => {
  const { id } = req.params;

  try {
    await deleteNotification(req.token, id);

    if (req.flash) {
      req.flash('success', 'Notification deleted');
    }
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) throw error;
    if (req.flash) req.flash('error', error.message || 'Unable to delete notification');
  }

  res.redirect('/notifications');
}));

// Helper to get notification link based on type
function getNotificationLink(notification) {
  let data = {};
  try { data = notification.data ? JSON.parse(notification.data) : {}; } catch { /* malformed JSON */ }

  switch (notification.type) {
    case 'connection_request':
      return '/connections/network?tab=pending_received';
    case 'connection_accepted':
      return (data.userId || data.user_id) ? `/members/${data.userId || data.user_id}` : '/connections';
    case 'connection_declined':
      return '/connections';
    case 'message_received':
      return (data.conversationId || data.conversation_id) ? `/messages/${data.conversationId || data.conversation_id}` : '/messages';
    case 'transfer_received':
      return (data.transactionId || data.transaction_id) ? `/wallet/transactions/${data.transactionId || data.transaction_id}` : '/wallet';
    default:
      return null;
  }
}

module.exports = router;
module.exports.getNotificationLink = getNotificationLink;
