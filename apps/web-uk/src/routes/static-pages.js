// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');

const router = express.Router();

const pages = {
  '/guide': {
    title: 'Guide',
    body: 'Guide content will be ported from the Laravel accessible frontend.'
  },
  '/features': {
    title: 'Features',
    body: 'Feature guidance will be ported from the Laravel accessible frontend.'
  },
  '/marketplace': {
    title: 'Marketplace',
    body: 'Marketplace pages will follow the Laravel accessible frontend contract.'
  },
  '/podcasts': {
    title: 'Podcasts',
    body: 'Podcast pages will follow the Laravel accessible frontend contract.'
  },
};

router.get(Object.keys(pages), (req, res) => {
  const page = pages[req.path];
  res.render('static-page', {
    title: page.title,
    body: page.body,
    returnUrl: req.query.return || ''
  });
});

module.exports = router;
module.exports.pages = pages;
