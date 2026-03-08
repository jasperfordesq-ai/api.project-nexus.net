const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { getProfile } = require('../lib/api');
const { asyncRoute } = require('../lib/routeHelpers');

const router = express.Router();

router.use(requireAuth);

// Settings overview
router.get('/', asyncRoute(async (req, res) => {
  const profile = await getProfile(req.token);

  res.render('settings/index', {
    title: 'Settings',
    profile,
    successMessage: req.flash ? req.flash('success')[0] : null
  });
}));

// Notification settings
router.get('/notifications', asyncRoute(async (req, res) => {
  const profile = await getProfile(req.token);

  res.render('settings/notifications', {
    title: 'Notification settings',
    profile,
    csrfToken: req.csrfToken ? req.csrfToken() : '',
    successMessage: req.flash ? req.flash('success')[0] : null
  });
}));

// Privacy settings
router.get('/privacy', asyncRoute(async (req, res) => {
  const profile = await getProfile(req.token);

  res.render('settings/privacy', {
    title: 'Privacy settings',
    profile,
    csrfToken: req.csrfToken ? req.csrfToken() : '',
    successMessage: req.flash ? req.flash('success')[0] : null
  });
}));

module.exports = router;
