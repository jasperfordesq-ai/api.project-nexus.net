// Copyright © 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
  res.render('explore', {
    title: 'Explore',
    activeNav: 'explore'
  });
});

module.exports = router;
