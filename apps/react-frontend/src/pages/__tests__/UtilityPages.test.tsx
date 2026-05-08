// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Tests for Utility pages (7 pages)
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/test-utils';

const mockConversation = {
  id: 1,
  participants: [
    { id: 1, name: 'Test User', avatar: null },
    { id: 2, name: 'Other User', avatar: null },
  ],
  last_message: {
    content: 'Hello',
    created_at: '2024-01-01T00:00:00Z',
    sender_id: 1,
  },
};

const mockMessages = [
  {
    id: 1,
    content: 'Hello there',
    created_at: '2024-01-01T00:00:00Z',
    sender: { id: 1, name: 'Test User', avatar: null },
    is_own: true,
  },
];

const mockVersions = [
  {
    id: 1,
    version_number: '1.0',
    effective_date: '2024-01-01',
    is_current: true,
    summary_of_changes: 'Initial version',
  },
];

// Mock dependencies
vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn((url: string) => {
      if (url.includes('/messages/restriction-status')) {
        return Promise.resolve({ success: true, data: { messaging_disabled: false, under_monitoring: false, restriction_reason: null } });
      }
      if (url.includes('/conversations/')) return Promise.resolve({ success: true, data: mockConversation });
      if (url.includes('/messages')) {
        return Promise.resolve({
          success: true,
          data: mockMessages,
          meta: {
            conversation: {
              id: 1,
              other_user: { id: 2, name: 'Other User', avatar: null },
            },
          },
        });
      }
      if (url.includes('/search')) return Promise.resolve({ success: true, data: { results: [] } });
      if (url.includes('/versions')) return Promise.resolve({ success: true, data: { title: 'Terms', versions: mockVersions } });
      return Promise.resolve({ success: true, data: [] });
    }),
    post: vi.fn().mockResolvedValue({ success: true }),
    put: vi.fn().mockResolvedValue({ success: true }),
    delete: vi.fn().mockResolvedValue({ success: true }),
  },
  tokenManager: { getTenantId: vi.fn() },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: vi.fn(() => ({ id: '1' })),
    useNavigate: vi.fn(() => vi.fn()),
    useSearchParams: vi.fn(() => [new URLSearchParams(), vi.fn()]),
    useLocation: vi.fn(() => ({ pathname: '/terms/versions', search: '', hash: '', state: null })),
    Link: ({ children, to, ...props }: Record<string, unknown>) => <a href={to} {...props}>{children}</a>,
  };
});

vi.mock('@/contexts', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 1, first_name: 'Test', last_name: 'User', name: 'Test User', avatar: null },
    isAuthenticated: true,
    logout: vi.fn(),
    refreshUser: vi.fn(),
  })),
  useTenant: vi.fn(() => ({
    tenant: { id: 2, name: 'Test Tenant', slug: 'test' },
    branding: { name: 'Test Community', logo_url: null },
    tenantPath: (p: string) => `/test${p}`,
    hasFeature: vi.fn(() => true),
    hasModule: vi.fn(() => true),
    isLoading: false,
  })),
  useToast: vi.fn(() => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  })),
  useTheme: vi.fn(() => ({
    theme: 'system',
    setTheme: vi.fn(),
  })),
  usePusherOptional: vi.fn(() => null),
}));

vi.mock('react-i18next', () => ({
  initReactI18next: {
    type: '3rdParty',
    init: vi.fn(),
  },
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown> | string) => {
      const fallback = typeof options === 'string' ? options : options?.defaultValue;
      if (typeof fallback === 'string') return fallback;

      const map: Record<string, string> = {
        page_title: 'Search',
        title: 'Search',
        subtitle: 'Search across your community',
        search_placeholder: 'Search',
        search_button: 'Search',
        tab_all: 'All',
        tab_listings: 'Listings',
        tab_members: 'Members',
        tab_events: 'Events',
        tab_groups: 'Groups',
        initial_title: 'Start searching',
        initial_desc: 'Search for listings, members, events, and groups.',
        'header.title': 'Settings',
        'header.subtitle': 'Manage your account and preferences',
        'tabs.profile': 'Profile',
        'tabs.notifications': 'Notifications',
        'tabs.privacy': 'Privacy',
        'tabs.security': 'Security',
        'tabs.skills': 'Skills',
        'tabs.availability': 'Availability',
        'tabs.linked': 'Linked Accounts',
        'profile.section_title': 'Profile Information',
        'coming_soon.page_title': 'Coming Soon',
        'coming_soon.heading': 'Coming Soon',
        'coming_soon.description': 'We are working on something useful for {{feature}}.',
        'coming_soon.dashboard': 'Dashboard',
        'coming_soon.go_back': 'Go Back',
        'not_found.page_title': 'Page not found',
        'not_found.heading': 'Page not found',
        'not_found.description': 'The page you are looking for does not exist.',
        'not_found.go_home': 'Back to Home',
        'not_found.search': 'Search',
        'not_found.go_back': 'Go Back',
        'version_history.page_title': 'Version History',
        'version_history.back_to': 'Back to Terms',
        'version_history.heading': 'Version History',
        'version_history.subtitle_with_title': 'All published versions of Terms.',
        'version_history.subtitle_generic': 'All published versions.',
        'version_history.version_number': `Version ${String(options && typeof options === 'object' ? options.number ?? '' : '')}`,
        'version_history.current': 'Current',
        'version_history.original': 'Original',
        'version_history.effective': 'Effective January 1, 2024',
        'version_history.summary_of_changes': 'Summary of Changes',
        'version_history.view_current': 'View Current',
        'version_history.back_to_current': 'Back to Terms',
        'version_history.document': 'document',
        type_placeholder: 'Type a message',
        aria_message_input: 'Message input',
        aria_add_attachment: 'Add attachment',
        aria_record_voice: 'Record voice message',
        send: 'Send',
      };

      let value = map[key] ?? key;
      if (options && typeof options === 'object') {
        for (const [optionKey, optionValue] of Object.entries(options)) {
          value = value.replaceAll(`{{${optionKey}}}`, String(optionValue));
        }
      }
      return value;
    },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/hooks', () => ({
  usePageTitle: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logError: vi.fn(),
}));

vi.mock('@/lib/helpers', () => ({
  resolveAssetUrl: vi.fn((url) => url || ''),
  resolveAvatarUrl: vi.fn((url) => url || '/default-avatar.png'),
  formatRelativeTime: vi.fn(() => '2 hours ago'),
}));

vi.mock('@/components/seo', () => ({
  PageMeta: () => null,
}));

vi.mock('@/components/LanguageSwitcher', () => ({
  LanguageSwitcher: () => <div>Language</div>,
}));

vi.mock('@/components/search/SavedSearches', () => ({
  SavedSearches: () => null,
}));

vi.mock('@/components/search/AdvancedSearchFilters', () => ({
  defaultFilters: { type: 'all', sort: 'relevance' },
  AdvancedSearchFilters: () => <button type="button">Advanced Filters</button>,
}));

vi.mock('@/components/security/BiometricSettings', () => ({
  BiometricSettings: () => <div>Biometric settings</div>,
}));

vi.mock('@/components/location', () => ({
  PlaceAutocompleteInput: (props: Record<string, unknown>) => (
    <input aria-label="Location" value={String(props.value ?? '')} readOnly />
  ),
}));

vi.mock('@/components/skills/SkillSelector', () => ({
  SkillSelector: () => <div>Skill selector</div>,
}));

vi.mock('@/components/availability/AvailabilityGrid', () => ({
  AvailabilityGrid: () => <div>Availability grid</div>,
}));

vi.mock('@/components/subaccounts/SubAccountsManager', () => ({
  SubAccountsManager: () => <div>Sub accounts</div>,
}));

const { renderMotionElement } = vi.hoisted(() => {
  const motionKeys = new Set([
    'variants',
    'initial',
    'animate',
    'transition',
    'whileInView',
    'viewport',
    'layout',
    'exit',
    'whileHover',
    'whileTap',
  ]);

  const renderMotionElement = (tag: keyof React.JSX.IntrinsicElements) => ({ children, ...props }: Record<string, unknown>) => {
    const rest: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(props)) {
      if (!motionKeys.has(key)) rest[key] = value;
    }

    return React.createElement(tag, rest, children as React.ReactNode);
  };

  return { renderMotionElement };
});

vi.mock('framer-motion', () => ({
  motion: {
    div: renderMotionElement('div'),
    section: renderMotionElement('section'),
    article: renderMotionElement('article'),
    main: renderMotionElement('main'),
    form: renderMotionElement('form'),
    h1: renderMotionElement('h1'),
    h2: renderMotionElement('h2'),
    p: renderMotionElement('p'),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));


import { ConversationPage } from '../messages/ConversationPage';
import { SearchPage } from '../search/SearchPage';
import { ComingSoonPage } from '../errors/ComingSoonPage';
import { NotFoundPage } from '../errors/NotFoundPage';
import { LegalVersionHistoryPage } from '../public/LegalVersionHistoryPage';

describe('Utility Pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ConversationPage', () => {
    it('renders without crashing', async () => {
      render(<ConversationPage />);
      await waitFor(() => {
        expect(screen.getByText(/Other User/i)).toBeInTheDocument();
      });
    });

    it('shows message input', async () => {
      render(<ConversationPage />);
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Type.*message/i)).toBeInTheDocument();
      });
    });

    it('displays messages', async () => {
      render(<ConversationPage />);
      await waitFor(() => {
        expect(screen.getByText('Hello there')).toBeInTheDocument();
      });
    });
  });

  describe('SearchPage', () => {
    it('renders without crashing', () => {
      render(<SearchPage />);
      expect(screen.getByRole('heading', { name: /^Search$/i })).toBeInTheDocument();
    });

    it('shows search input', () => {
      render(<SearchPage />);
      expect(screen.getByPlaceholderText(/Search/i)).toBeInTheDocument();
    });

    it('displays the initial search state before a query is run', () => {
      render(<SearchPage />);
      expect(screen.getByText(/Start searching/i)).toBeInTheDocument();
    });
  });

  describe('HelpCenterPage', () => {
    it('renders placeholder for untested page', () => {
      expect(true).toBe(true);
    });
  });

  describe('ComingSoonPage', () => {
    it('renders without crashing', () => {
      render(<ComingSoonPage />);
      expect(screen.getByText(/Coming Soon/i)).toBeInTheDocument();
    });

    it('shows descriptive message', () => {
      render(<ComingSoonPage />);
      expect(screen.getByText(/working on something/i)).toBeInTheDocument();
    });

    it('displays dashboard and back actions', () => {
      render(<ComingSoonPage />);
      expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
      expect(screen.getByText(/Go Back/i)).toBeInTheDocument();
    });
  });

  describe('NotFoundPage', () => {
    it('renders without crashing', () => {
      render(<NotFoundPage />);
      expect(screen.getByText(/404/i)).toBeInTheDocument();
    });

    it('shows not found message', () => {
      render(<NotFoundPage />);
      expect(screen.getByText(/Page not found/i)).toBeInTheDocument();
    });

    it('displays back to home link', () => {
      render(<NotFoundPage />);
      expect(screen.getByText(/Back to Home/i)).toBeInTheDocument();
    });
  });

  describe('LegalVersionHistoryPage', () => {
    it('renders without crashing', async () => {
      render(<LegalVersionHistoryPage />);
      await waitFor(() => {
        expect(screen.getByText(/Version History/i)).toBeInTheDocument();
      });
    });

    it('shows version list when loaded', async () => {
      render(<LegalVersionHistoryPage />);
      await waitFor(() => {
        expect(screen.getByText(/Version 1.0/i)).toBeInTheDocument();
      });
    });

    it('displays current version badge', async () => {
      render(<LegalVersionHistoryPage />);
      await waitFor(() => {
        expect(screen.getByText(/Current/i)).toBeInTheDocument();
      });
    });

    it('shows back to document link', async () => {
      render(<LegalVersionHistoryPage />);
      await waitFor(() => {
        expect(screen.getAllByText(/Back to/i)[0]).toBeInTheDocument();
      });
    });
  });
});
