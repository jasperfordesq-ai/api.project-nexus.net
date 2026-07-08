// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');

const { getHelpFaqs } = require('../lib/api');
const { asyncRoute } = require('../lib/routeHelpers');

const router = express.Router();

const TRUST_SAFETY_SECTIONS = [
  {
    heading: 'How exchanges work',
    intro: 'Exchanges are arranged between members. Here is the usual flow.',
    items: [
      'Find a member offering what you need, or post a request describing what you are looking for.',
      'Message them through the platform to agree the details - time, place, and what is involved.',
      'Complete the exchange. You only meet in person if you both want to.',
      'Log the hours. Both members confirm - that is the receipt.',
      'Time credits transfer automatically. One hour of help is one time credit, no matter what skill was shared.'
    ]
  },
  {
    heading: 'What we do',
    items: [
      'Verify every member\'s email address at registration, and offer optional photo-ID verification with a Verified Member badge.',
      'Show reviews and ratings on member profiles so the community can see who has been a reliable exchange partner.',
      'Ask every member to accept our community guidelines and acceptable use policy, and to keep to them.',
      'Give every listing, message, and profile a report button that goes straight to coordinators.',
      'Have human coordinators who can mediate, support, and step in when something goes wrong.',
      'Connect with other timebanks across regions through federation, so reputation can travel with you.'
    ]
  },
  {
    heading: 'What we do not do',
    intro: 'It is important to be clear about the limits of the service.',
    items: [
      'We do not vet, train, or certify members for specific services. We are not a recruitment agency.',
      'We do not provide insurance cover for the work members do for each other.',
      'We do not supervise exchanges or act as anyone\'s employer or service provider.',
      'We do not guarantee any specific outcome, level of skill, or punctuality. Reviews are how the community keeps itself accountable.'
    ]
  },
  {
    heading: 'Precautions you should take',
    intro: 'A few sensible steps keep everyone safer.',
    items: [
      'Get to know someone through the platform before you meet.',
      'Meet in a public place where you can, especially the first time.',
      'Tell someone you trust where you are going and when.',
      'Trust your instincts - if something does not feel right, stop and tell us.'
    ]
  },
  {
    heading: 'Background checks and vetting',
    intro: 'Some services need vetting by law.',
    items: [
      'Some exchanges, for example childcare, elderly care, or support for vulnerable adults, may legally require a background check or vetting under local law.',
      'Members offering these services are responsible for holding current, valid vetting where their jurisdiction requires it.',
      'You are entitled to ask to see vetting before you agree to an exchange.',
      'The platform does not hold vetting on members\' behalf and does not verify it.'
    ]
  },
  {
    heading: 'Insurance',
    items: [
      'The platform does not provide insurance for exchanges.',
      'Members are responsible for their own insurance where they need it.',
      'You remain legally responsible for your own actions during an exchange.',
      'Check whether your existing cover applies before taking part in higher-risk activities.'
    ]
  },
  {
    heading: 'Dispute resolution',
    intro: 'If something goes wrong, here is how we help.',
    items: [
      'Talk to the other member first - most issues are simple misunderstandings.',
      'If you cannot resolve it, report it and a coordinator will look into it.',
      'Coordinators can mediate, adjust logged hours, or take action on accounts.',
      'Serious matters may be escalated outside the platform where necessary.'
    ]
  },
  {
    heading: 'Your responsibilities',
    intro: 'As a member of the community you agree to:',
    items: [
      'Be honest about what you offer and what you need.',
      'Treat other members with respect.',
      'Turn up when you say you will, or give as much notice as you can.',
      'Log hours accurately and confirm exchanges promptly.',
      'Report anything unsafe or against the guidelines.'
    ]
  },
  {
    heading: 'Your rights',
    items: [
      'To be treated with respect and kept safe.',
      'To control your personal information and privacy settings.',
      'To report concerns and have them taken seriously.',
      'To leave the community and delete your account at any time.'
    ]
  }
];

function trimmed(value) {
  return String(value || '').trim();
}

function dataFrom(result) {
  return result && typeof result === 'object' && result.data !== undefined ? result.data : result;
}

function rowsFrom(result) {
  const data = dataFrom(result);
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
}

function communityName(res) {
  const tenant = res.locals.tenant || {};
  return trimmed(tenant.name) || trimmed(tenant.slug) || 'Project NEXUS Accessible';
}

function normalizeFaqGroups(result) {
  return rowsFrom(result)
    .map((group) => {
      const row = group && typeof group === 'object' ? group : {};
      const faqs = Array.isArray(row.faqs) ? row.faqs : [];

      return {
        category: trimmed(row.category) || 'Category',
        faqs: faqs
          .map((faq) => ({
            id: faq && faq.id,
            question: trimmed(faq && faq.question),
            answer: String(faq && faq.answer ? faq.answer : '')
          }))
          .filter((faq) => faq.question || faq.answer)
      };
    })
    .filter((group) => group.faqs.length > 0);
}

router.get('/help', asyncRoute(async (req, res) => {
  const searchQuery = trimmed(req.query.q);
  const params = searchQuery ? { q: searchQuery } : {};
  const faqGroups = normalizeFaqGroups(await getHelpFaqs(params));
  const community = communityName(res);

  return res.render('support/help', {
    title: 'Help centre',
    activeNav: 'help',
    communityName: community,
    searchQuery,
    faqGroups
  });
}));

router.get('/trust-and-safety', (req, res) => {
  const community = communityName(res);

  return res.render('support/trust-safety', {
    title: 'Trust and safety',
    activeNav: 'trust-safety',
    communityName: community,
    sections: TRUST_SAFETY_SECTIONS
  });
});

module.exports = router;
