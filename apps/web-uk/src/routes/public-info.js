// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const { getContributors } = require('../lib/contributors');

const router = express.Router();

const ABOUT_STEPS = [
  {
    title: 'Create your profile',
    description: 'Sign up for free and list the skills you can offer to your community.'
  },
  {
    title: 'Find what you need',
    description: 'Browse listings to discover services offered by members near you.'
  },
  {
    title: 'Exchange services',
    description: 'Connect with members and arrange skill exchanges that work for both of you.'
  },
  {
    title: 'Earn and spend credits',
    description: 'Earn one time credit for every hour you give, and spend them on services you need.'
  }
];

const ABOUT_VALUES = [
  {
    title: 'Equality',
    description: "Every person's time is valued equally. One hour of gardening is worth the same as one hour of tutoring."
  },
  {
    title: 'Community',
    description: 'We believe in building strong local connections. Every exchange strengthens the fabric of your neighbourhood.'
  },
  {
    title: 'Trust and safety',
    description: 'Reviews, ratings, and broker oversight ensure a safe environment for all members to participate.'
  },
  {
    title: 'Sustainability',
    description: 'By sharing skills locally, we reduce waste, support circular economies, and strengthen local resilience.'
  }
];

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

function aboutContributorsByType() {
  return getContributors().reduce((groups, person) => {
    const type = person.type && Object.prototype.hasOwnProperty.call(groups, person.type)
      ? person.type
      : 'contributor';
    groups[type].push(person);
    return groups;
  }, {
    creator: [],
    founder: [],
    contributor: [],
    acknowledgement: []
  });
}

router.get('/about', (req, res) => {
  const name = communityName(res);
  const contributorGroups = aboutContributorsByType();
  const hasResearchNote = contributorGroups.contributor.some((person) => (
    person.note && person.note.toLowerCase().includes('study')
  ));

  res.render('public-info/about', {
    title: `About ${name}`,
    activeNav: 'about',
    communityName: name,
    steps: ABOUT_STEPS,
    values: ABOUT_VALUES,
    contributorGroups,
    hasResearchNote,
    isAuthenticated: res.locals.isAuthenticated
  });
});

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
