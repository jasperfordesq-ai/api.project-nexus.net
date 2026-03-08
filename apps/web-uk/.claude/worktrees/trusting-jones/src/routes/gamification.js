const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { asyncRoute } = require('../lib/routeHelpers');
const {
  getGamificationProfile,
  getAllBadges,
  getMyBadges,
  getLeaderboard,
  getXpHistory
} = require('../lib/api');

router.use(requireAuth);

// Badges page - show all badges with earned status
router.get('/badges', asyncRoute(async (req, res) => {
  const [badgesResult, profileResult] = await Promise.all([
    getAllBadges(req.token),
    getGamificationProfile(req.token)
  ]);

  res.render('gamification/badges', {
    title: 'Badges',
    badges: badgesResult.data || [],
    summary: badgesResult.summary || { total: 0, earned: 0, progress_percent: 0 },
    profile: profileResult.profile || {},
    successMessage: req.query.success
  });
}));

// Leaderboard page
router.get('/leaderboard', asyncRoute(async (req, res) => {
  const period = req.query.period || 'all';
  const page = parseInt(req.query.page) || 1;

  const result = await getLeaderboard(req.token, {
    period,
    page,
    limit: 20
  });

  res.render('gamification/leaderboard', {
    title: 'Leaderboard',
    leaderboard: result.data || [],
    currentUserRank: result.current_user_rank,
    period,
    pagination: result.pagination || { page: 1, total_pages: 1 }
  });
}));

// XP History page
router.get('/xp-history', asyncRoute(async (req, res) => {
  const page = parseInt(req.query.page) || 1;

  const [historyResult, profileResult] = await Promise.all([
    getXpHistory(req.token, { page, limit: 20 }),
    getGamificationProfile(req.token)
  ]);

  res.render('gamification/xp-history', {
    title: 'XP History',
    xpHistory: historyResult.data || [],
    profile: profileResult.profile || {},
    pagination: historyResult.pagination || { page: 1, total_pages: 1 }
  });
}));

// My progress overview page
router.get('/', asyncRoute(async (req, res) => {
  const [profileResult, badgesResult] = await Promise.all([
    getGamificationProfile(req.token),
    getMyBadges(req.token)
  ]);

  res.render('gamification/index', {
    title: 'My Progress',
    profile: profileResult.profile || {},
    recentXp: profileResult.recent_xp || [],
    badges: badgesResult.data || [],
    successMessage: req.query.success
  });
}));

module.exports = router;
