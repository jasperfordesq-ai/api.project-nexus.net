// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');

const router = express.Router();

const FEATURES = [
  'Find members who can help with what you need, and offer your own skills in return.',
  'Earn and spend time credits - one hour always equals one credit.',
  'Discover and host community events.',
  'Find volunteering opportunities and log your hours.',
  'Join groups of members with shared interests.',
  'Earn badges and see how you are contributing.'
];

const FAQS = [
  {
    question: 'What is a time credit?',
    answer: 'A time credit is one hour of your time. You earn a credit for every hour you give, and spend credits to receive help from others.'
  },
  {
    question: "Is everyone's time worth the same?",
    answer: 'Yes. One hour always equals one time credit, whatever the task. This is what makes timebanking fair.'
  },
  {
    question: 'How do I start?',
    answer: 'Create a listing to offer a skill or ask for help, browse what others are offering, and connect with members near you.'
  },
  {
    question: 'How do I send credits to someone?',
    answer: 'Open your wallet, search for the member, choose an amount and send. Credits move immediately.'
  },
  {
    question: 'Is my information private?',
    answer: 'You control what other members can see in your privacy settings, and you can export or delete your data at any time.'
  }
];

function communityName(res) {
  return res.locals.tenantName || res.locals.serviceName || 'Project NEXUS Accessible';
}

router.get('/guide', (req, res) => {
  res.render('public-info/guide', {
    title: 'How timebanking works',
    activeNav: 'guide',
    communityName: communityName(res),
    isAuthenticated: res.locals.isAuthenticated
  });
});

router.get('/features', (req, res) => {
  res.render('public-info/features', {
    title: 'Features',
    activeNav: 'features',
    communityName: communityName(res),
    features: FEATURES
  });
});

router.get('/faq', (req, res) => {
  res.render('public-info/faq', {
    title: 'Frequently asked questions',
    activeNav: 'faq',
    communityName: communityName(res),
    faqs: FAQS
  });
});

module.exports = router;
