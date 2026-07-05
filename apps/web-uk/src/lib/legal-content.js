// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const legalDocuments = [
  {
    type: 'terms',
    path: '/legal/terms',
    title: 'Terms of service',
    summary: 'The agreement between you and the community when you use the service.'
  },
  {
    type: 'privacy',
    path: '/legal/privacy',
    title: 'Privacy policy',
    summary: 'What personal data we collect, why we collect it, and your data protection rights.'
  },
  {
    type: 'cookies',
    path: '/legal/cookies',
    title: 'Cookie policy',
    summary: 'The cookies and similar technologies we use, and how to control them.'
  },
  {
    type: 'community_guidelines',
    path: '/legal/community-guidelines',
    title: 'Community guidelines',
    summary: 'How we expect members to treat each other to keep the community safe and welcoming.'
  },
  {
    type: 'acceptable_use',
    path: '/legal/acceptable-use',
    title: 'Acceptable use policy',
    summary: 'What you can and cannot do when using the service.'
  },
  {
    type: 'accessibility',
    path: '/accessibility',
    title: 'Accessibility statement',
    summary: 'How accessible this service is, and how to report a problem.'
  }
];

const legalFallbacks = {
  terms: {
    title: 'Terms of service',
    intro: 'These terms set out the agreement between you and :name when you use this community. By creating an account or using the service you accept them.',
    points: [
      'Who can use the service and what you need to do to keep your account secure.',
      'How time credits work: one hour of help is worth one time credit, whatever the skill.',
      'What you may and may not do when offering or requesting help (see the acceptable use policy).',
      'That members arrange exchanges between themselves, and the community connects people rather than employing or supervising them.',
      'How disputes are handled, and how either side can stop using the service.',
      'That we may update these terms, and will tell you about significant changes.'
    ]
  },
  privacy: {
    title: 'Privacy policy',
    intro: 'This notice explains what personal data :name collects, why we collect it, and the rights you have over it under data protection law.',
    points: [
      'What we collect: the details you give us (such as your name, email and location) and information created as you use the service.',
      'Why we use it: to operate your account, run the community, keep members safe, and contact you about the service.',
      'Who we share it with: other members see only what your privacy settings allow; we do not sell your data.',
      'How long we keep it: only as long as we need it, or as the law requires.',
      'Your rights: you can ask for a copy of your data, correct it, or ask us to delete your account.',
      'How to contact us about your data or to make a complaint.'
    ]
  },
  cookies: {
    title: 'Cookie policy',
    intro: 'This policy explains the cookies and similar technologies :name uses, and how you can control them.',
    heading: 'Types of cookies we use',
    points: [
      'Essential cookies keep you signed in and the service secure. These are always on.',
      'Analytics cookies help us understand how the service is used so we can improve it. These are optional.',
      'Preference cookies remember choices such as your language. These are optional.'
    ],
    closing: 'You can control optional cookies in your browser settings at any time. Turning off essential cookies may stop parts of the service working.'
  },
  community_guidelines: {
    title: 'Community guidelines',
    intro: 'These guidelines keep :name a safe and welcoming place. They apply to everyone, everywhere on the service.',
    sections: [
      {
        heading: 'Respectful communication',
        body: 'Treat other members with courtesy. Harassment, hate speech, discrimination and bullying are not allowed.'
      },
      {
        heading: 'Safety and wellbeing',
        body: 'Look after your own safety and the safety of others. Meet in public where you can, and tell us if something does not feel right.'
      },
      {
        heading: 'Authentic profiles',
        body: 'Use your real identity and accurate information. Do not impersonate other people or organisations.'
      },
      {
        heading: 'Fair exchange',
        body: 'Be honest about what you offer and need, turn up when you say you will, and log hours accurately.'
      },
      {
        heading: 'Reporting and consequences',
        body: 'Report anything that breaks these guidelines. We may warn, restrict or remove members who do not keep to them.'
      }
    ]
  },
  acceptable_use: {
    title: 'Acceptable use policy',
    intro: 'This policy explains what you may and may not do when using :name.',
    sections: [
      {
        heading: 'Prohibited activities',
        body: 'Do not use the service for anything unlawful, harmful, fraudulent or abusive, and do not post content you do not have the right to share.'
      },
      {
        heading: 'Service use restrictions',
        body: 'Do not attempt to disrupt, overload, scrape or gain unauthorised access to the service, and do not misuse other members\' information.'
      },
      {
        heading: 'Intellectual property',
        body: 'Respect other people\'s intellectual property. Only post content you own or are allowed to use.'
      },
      {
        heading: 'Enforcement',
        body: 'If you break this policy we may restrict or remove your access. Serious breaches may be reported to the relevant authorities.'
      }
    ]
  }
};

module.exports = {
  legalDocuments,
  legalFallbacks
};
