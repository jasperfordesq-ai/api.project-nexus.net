// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Tests for SearchPage
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/test-utils';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, optionsOrFallback?: Record<string, unknown> | string) => {
      const translations: Record<string, string> = {
        page_title: 'Search',
        title: 'Search',
        subtitle: 'Find listings, members, events, and groups',
        search_placeholder: 'Search for anything...',
        search_button: 'Search',
        error_title: 'Search Error',
        error_message: 'Search failed. Please try again.',
        try_again: 'Try Again',
        no_results_title: 'No results found',
        no_results_desc: 'No results matched your search.',
        initial_title: 'Start searching',
        initial_desc: 'Enter a search term to find listings, members, events, and groups',
        listing_offering: 'Offering',
        listing_requesting: 'Requesting',
      };

      if (typeof optionsOrFallback === 'string') return optionsOrFallback;
      if (key === 'tab_all') return `All (${optionsOrFallback?.count ?? 0})`;
      if (key === 'tab_listings' || key === 'section_listings') return `Listings (${optionsOrFallback?.count ?? 0})`;
      if (key === 'tab_members' || key === 'section_members') return `Members (${optionsOrFallback?.count ?? 0})`;
      if (key === 'tab_events' || key === 'section_events') return `Events (${optionsOrFallback?.count ?? 0})`;
      if (key === 'tab_groups' || key === 'section_groups') return `Groups (${optionsOrFallback?.count ?? 0})`;
      if (key === 'members_count') return `${optionsOrFallback?.count ?? 0} members`;
      return translations[key] ?? key;
    },
  }),
}));

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn().mockResolvedValue({
      success: true,
      data: [],
    }),
    post: vi.fn().mockResolvedValue({ success: true }),
  },
  tokenManager: { getTenantId: vi.fn() },
}));

vi.mock('@/contexts', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 1, first_name: 'Test' },
    isAuthenticated: true,
  })),
  useTenant: vi.fn(() => ({
    tenant: { id: 2, name: 'Test Tenant', slug: 'test' },
    tenantPath: (p: string) => `/test${p}`,
    hasFeature: vi.fn(() => true),
    hasModule: vi.fn(() => true),
  })),
  useToast: vi.fn(() => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  })),
}));

vi.mock('@/hooks', () => ({
  usePageTitle: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logError: vi.fn(),
}));

vi.mock('@/lib/helpers', () => ({
  resolveAvatarUrl: vi.fn((url) => url || '/default-avatar.png'),
  formatRelativeTime: vi.fn(() => '2 hours ago'),
}));

vi.mock('@/components/ui', () => ({
  GlassCard: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="glass-card" className={className}>{children}</div>
  ),
  AlgorithmLabel: () => <div data-testid="algorithm-label" />,
}));

vi.mock('@/components/feedback', () => ({
  EmptyState: ({ title, description }: { title: string; description?: string }) => (
    <div data-testid="empty-state">
      <div>{title}</div>
      {description && <div>{description}</div>}
    </div>
  ),
}));

vi.mock('framer-motion', () => {  const motionProps = new Set(['variants', 'initial', 'animate', 'layout', 'transition', 'exit', 'whileHover', 'whileTap', 'whileInView', 'viewport']);  const filterMotion = (props: Record<string, unknown>) => {    const filtered: Record<string, unknown> = {};    for (const [k, v] of Object.entries(props)) {      if (!motionProps.has(k)) filtered[k] = v;    }    return filtered;  };  return {    motion: {      div: ({ children, ...props }: Record<string, unknown>) => <div {...filterMotion(props)}>{children}</div>,    },    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,  };});

import { SearchPage } from './SearchPage';
import { api } from '@/lib/api';

function mockSearchResponse(data: unknown[]) {
  vi.mocked(api.get).mockImplementation((url: string) => {
    if (url.includes('/v2/search/saved')) {
      return Promise.resolve({ success: true, data: [] });
    }
    return Promise.resolve({ success: true, data });
  });
}

describe('SearchPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchResponse([]);
  });

  it('renders the page heading and description', () => {
    render(<SearchPage />);
    expect(screen.getByRole('heading', { name: 'Search' })).toBeInTheDocument();
    expect(screen.getByText('Find listings, members, events, and groups')).toBeInTheDocument();
  });

  it('shows search input', () => {
    render(<SearchPage />);
    expect(screen.getByPlaceholderText('Search for anything...')).toBeInTheDocument();
  });

  it('shows initial state prompt before searching', () => {
    render(<SearchPage />);
    expect(screen.getByText('Start searching')).toBeInTheDocument();
    expect(
      screen.getByText('Enter a search term to find listings, members, events, and groups')
    ).toBeInTheDocument();
  });

  it('does not show result tabs before a search is performed', () => {
    render(<SearchPage />);
    expect(screen.queryByText(/All \(\d+\)/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Listings \(\d+\)/)).not.toBeInTheDocument();
  });

  it('shows no results state when search returns empty', async () => {
    mockSearchResponse([]);

    render(<SearchPage />);

    // Simulate search by finding and submitting the form
    const input = screen.getByPlaceholderText('Search for anything...');
    const form = input.closest('form')!;

    // Update input value
    await import('@testing-library/react').then(({ fireEvent }) => {
      fireEvent.change(input, { target: { value: 'nonexistent' } });
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(screen.getByText('No results found')).toBeInTheDocument();
    });
  });

  it('shows result tabs with counts after search', async () => {
    mockSearchResponse([
        { id: 1, type: 'listing', title: 'Test Listing', description: 'A listing', listing_type: 'offer', hours_estimate: 2 },
        { id: 1, type: 'user', name: 'Alice Smith', avatar_url: null, bio: 'Hello', location: 'Dublin' },
    ]);

    render(<SearchPage />);

    const input = screen.getByPlaceholderText('Search for anything...');
    const form = input.closest('form')!;

    await import('@testing-library/react').then(({ fireEvent }) => {
      fireEvent.change(input, { target: { value: 'test' } });
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(screen.getByText('All (2)')).toBeInTheDocument();
    });
    // "Listings (1)" appears in both the tab and the section heading, use getAllByText
    expect(screen.getAllByText('Listings (1)').length).toBeGreaterThanOrEqual(1);
    // "Members (1)" also appears in both tab and section heading
    expect(screen.getAllByText('Members (1)').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Events (0)')).toBeInTheDocument();
    expect(screen.getByText('Groups (0)')).toBeInTheDocument();
  });

  it('renders search results with listing and user details', async () => {
    mockSearchResponse([
        { id: 1, type: 'listing', title: 'Garden Help', description: 'Need help in garden', listing_type: 'request', hours_estimate: 3 },
        { id: 2, type: 'user', name: 'Bob Jones', avatar_url: null, bio: 'Gardener', location: 'Cork' },
    ]);

    render(<SearchPage />);

    const input = screen.getByPlaceholderText('Search for anything...');
    const form = input.closest('form')!;

    await import('@testing-library/react').then(({ fireEvent }) => {
      fireEvent.change(input, { target: { value: 'garden' } });
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(screen.getByText('Garden Help')).toBeInTheDocument();
    });
    expect(screen.getByText('Need help in garden')).toBeInTheDocument();
    expect(screen.getByText('Bob Jones')).toBeInTheDocument();
    expect(screen.getByText('Gardener')).toBeInTheDocument();
  });

  it('shows error state when search API fails', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/v2/search/saved')) {
        return Promise.resolve({ success: true, data: [] });
      }
      return Promise.reject(new Error('Network error'));
    });

    render(<SearchPage />);

    const input = screen.getByPlaceholderText('Search for anything...');
    const form = input.closest('form')!;

    await import('@testing-library/react').then(({ fireEvent }) => {
      fireEvent.change(input, { target: { value: 'test' } });
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(screen.getByText('Search Error')).toBeInTheDocument();
    });
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });
});
