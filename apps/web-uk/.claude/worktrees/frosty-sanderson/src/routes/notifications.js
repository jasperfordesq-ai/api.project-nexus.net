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
  deleteNotification
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

  const notifications = result.data || [];
  const unreadCount = result.unread_count || 0;
  const pagination = result.pagination || { page: 1, total_pages: 1 };

  res.render('notifications/index', {
    title: 'Notifications',
    notifications,
    unreadCount,
    pagination,
    showUnreadOnly: unread_only === 'true',
    successMessage: req.flash ? req.flash('success')[0] : null
  });
}));

// Mark single notification as read
router.post('/:id/read', asyncRoute(async (req, res) => {
  const { id } = req.params;
  const { redirect } = req.body;

  await markNotificationRead(req.token, id);

  // If redirect URL provided, validate it to prevent open redirect attacks
  if (redirect) {
    const safeRedirect = validateReturnUrl(redirect, '/notifications');
    return res.redirect(safeRedirect);
  }

  res.redirect('/notifications');
}));

// Mark all notifications as read
router.post('/read-all', asyncRoute(async (req, res) => {
  const result = await markAllNotificationsRead(req.token);

  if (req.flash) {
    const count = result.marked_count || 0;
    req.flash('success', `Marked ${count} notification${count !== 1 ? 's' : ''} as read`);
  }

  res.redirect('/notifications');
}));

// Delete notification
router.post('/:id/delete', asyncRoute(async (req, res) => {
  const { id } = req.params;

  await deleteNotification(req.token, id);

  if (req.flash) {
    req.flash('success', 'Notification deleted');
  }

  res.redirect('/notifications');
}));

// Helper to get notification link based on type
function getNotificationLink(notification) {
  const data = notification.data ? JSON.parse(notification.data) : {};

  switch (notification.type) {
    case 'connection_request':
      return '/connections/pending';
    case 'connection_accepted':
      return data.user_id ? `/members/${data.user_id}` : '/connections';
    case 'connection_declined':
      return '/connections';
    case 'message_received':
      return data.conversation_id ? `/messages/${data.conversation_id}` : '/messages';
    case 'transfer_received':
      return data.transaction_id ? `/wallet/transactions/${data.transaction_id}` : '/wallet';
    default:
      return null;
  }
}

module.exports = router;
module.exports.getNotificationLink = getNotificationLink;
