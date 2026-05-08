// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Tests for CookiesPage
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'cookies.page_title': 'Cookie Policy',
        'cookies.heading': 'Cookie Policy',
        'cookies.subtitle': 'How we use cookies and similar technologies.',
        'cookies.last_updated': 'Last updated May 2026',
        'cookies.what_are_title': 'What are cookies?',
        'cookies.what_are_body_1': 'Cookies help websites remember useful preferences.',
        'cookies.what_are_body_2': `${options?.name ?? 'Test Community'} uses essential cookies to run securely.`,
        'cookies.categories_title': 'Cookie categories',
        'cookies.always_active': 'Always active',
        'cookies.optional': 'Optional',
        'cookies.no_marketing': 'We do not use marketing cookies.',
        'cookies.list_title': 'Cookies we use',
        'cookies.third_party_title': 'Third-party services',
        'cookies.third_party_intro': 'Some services may set their own cookies.',
        'cookies.third_party_compliance': 'We review these services for compliance.',
        'cookies.manage_title': 'Manage cookies',
        'cookies.manage_intro': 'You can control cookies in your browser.',
        'cookies.manage_warning': 'Blocking essential cookies may break sign-in.',
        'cookies.browser_settings_title': 'Browser settings',
        'cookies.browser_settings_intro': 'Use your browser privacy settings to manage cookies.',
        'cookies.cta_title': 'Questions about cookies?',
        'cookies.cta_body': 'Contact us or read the privacy policy.',
        'cookies.contact_us': 'Contact us',
        'cookies.privacy_policy_link': 'Privacy policy',
        'cookies.provider_label': 'Provider',
        'cookies.expiry_label': 'Expiry',
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

import { CookiesPage } from './CookiesPage';

describe('CookiesPage', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders without crashing', () => {
    render(<CookiesPage />);
    expect(screen.getByText(/Cookie Policy/i)).toBeInTheDocument();
  });
});
