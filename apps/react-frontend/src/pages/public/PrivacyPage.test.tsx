// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Tests for PrivacyPage
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'privacy.page_title': 'Privacy Policy',
        'privacy.heading': 'Privacy Policy',
        'privacy.subtitle': 'How we collect, use, and protect your data.',
        'privacy.last_updated': 'Last updated May 2026',
        'privacy.data_collection_title': 'Data we collect',
        'privacy.use_title': 'How we use data',
        'privacy.rights_title': 'Your rights',
        'privacy.contact_title': 'Contact us',
        'privacy.community_specific': `${options?.name ?? 'Test Community'} privacy information.`,
      };
      return translations[key] ?? key;
    },
  }),
}));

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn().mockResolvedValue({ success: true, data: null }) },
  tokenManager: { getTenantId: vi.fn() },
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
vi.mock('@/hooks/useLegalDocument', () => ({
  useLegalDocument: vi.fn(() => ({ document: null, loading: false })),
}));
vi.mock('@/components/seo', () => ({ PageMeta: () => null }));
vi.mock('@/components/legal/CustomLegalDocument', () => ({
  default: () => <div data-testid="custom-legal">Custom Legal Doc</div>,
  CustomLegalDocument: () => <div data-testid="custom-legal">Custom Legal Doc</div>,
}));
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

import { PrivacyPage } from './PrivacyPage';

describe('PrivacyPage', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders without crashing', () => {
    render(<PrivacyPage />);
    expect(screen.getByText(/Privacy Policy/i)).toBeInTheDocument();
  });
});
