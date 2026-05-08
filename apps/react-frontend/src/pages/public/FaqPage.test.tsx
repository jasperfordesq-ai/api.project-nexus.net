// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Tests for FaqPage
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'faq.title': 'Frequently Asked Questions',
        'faq.subtitle_before_link': 'Find answers below or visit the',
        'faq.help_center_link': 'help center',
        'faq.subtitle_after_link': 'for more support.',
        'faq.search_placeholder': 'Search questions...',
        'faq.no_results': 'No results found.',
        'faq.cta_title': 'Still need help?',
        'faq.cta_description': 'Contact the team for support.',
        'faq.cta_button': 'Get help',
      };

      if (key.endsWith('.title')) return translations[key] ?? 'General';
      if (key.endsWith('.question')) return 'How does NEXUS work?';
      if (key.endsWith('_bold')) return 'Step';
      if (key.endsWith('_link')) return 'settings';
      return translations[key] ?? 'NEXUS information';
    },
  }),
}));

vi.mock('@/contexts', () => ({
  useTenant: vi.fn(() => ({
    tenant: { id: 2, name: 'Test Tenant', slug: 'test' },
    branding: { name: 'Test Community' },
    tenantPath: (p: string) => `/test${p}`,
    hasFeature: vi.fn(() => true),
  })),
}));

vi.mock('@/hooks', () => ({ usePageTitle: vi.fn() }));
vi.mock('@/components/seo', () => ({ PageMeta: () => null }));
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: Record<string, unknown>) => {
      const motionKeys = new Set(["variants", "initial", "animate", "transition", "whileInView", "viewport", "layout", "exit", "whileHover", "whileTap"]);
      const rest: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(props)) { if (!motionKeys.has(k)) rest[k] = v; }
      return <div {...rest}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { FaqPage } from './FaqPage';

describe('FaqPage', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders without crashing', () => {
    render(<FaqPage />);
    expect(screen.getByText('Frequently Asked Questions')).toBeInTheDocument();
  });
});
