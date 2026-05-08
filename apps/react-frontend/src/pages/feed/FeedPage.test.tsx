// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Tests for FeedPage
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';

const mockGet = vi.fn().mockResolvedValue({ success: true, data: [], meta: {} });
const mockPost = vi.fn().mockResolvedValue({ success: true });

vi.mock('@/lib/api', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
  tokenManager: { getTenantId: vi.fn() },
}));

vi.mock('@/contexts', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 1, first_name: 'Test', avatar: null },
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
  })),
  usePusherOptional: vi.fn(() => null),
}));

vi.mock('@/hooks', () => ({
  usePageTitle: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown> | string) => {
      if (typeof options === 'string') return options;
      const map: Record<string, string> = {
        page_title: 'Community Feed',
        title: 'Community Feed',
        subtitle: "See what's happening in your community",
        new_post: 'New Post',
        whats_on_your_mind: "What's on your mind?",
        add_image_aria: 'Add image',
        create_poll_aria: 'Create poll',
        'filter.all': 'All',
        'filter.posts': 'Posts',
        'filter.listings': 'Listings',
        'filter.events': 'Events',
        'filter.polls': 'Polls',
        'filter.goals': 'Goals',
        unable_to_load: 'Unable to Load Feed',
        try_again: 'Try Again',
        empty_title: 'No posts yet',
        empty_desc: 'Be the first to share something.',
        create_post: 'Create Post',
        load_more: 'Load More',
      };
      return map[key] ?? key;
    },
  }),
}));

vi.mock('@/lib/logger', () => ({
  logError: vi.fn(),
}));

vi.mock('@/lib/helpers', () => ({
  resolveAvatarUrl: vi.fn((url) => url || '/default-avatar.png'),
  resolveAssetUrl: vi.fn((url) => url || ''),
  formatRelativeTime: vi.fn(() => '2 hours ago'),
}));

vi.mock('@/components/seo', () => ({
  PageMeta: () => null,
}));

vi.mock('@/components/ui', () => ({
  GlassCard: ({ children, className, ...props }: Record<string, unknown>) => (
    <div className={`glass-card ${className || ''}`} {...props}>{children as React.ReactNode}</div>
  ),
  AlgorithmLabel: () => <span>Algorithm</span>,
}));

vi.mock('framer-motion', () => {  const motionProps = new Set(['variants', 'initial', 'animate', 'layout', 'transition', 'exit', 'whileHover', 'whileTap', 'whileInView', 'viewport']);  const filterMotion = (props: Record<string, unknown>) => {    const filtered: Record<string, unknown> = {};    for (const [k, v] of Object.entries(props)) {      if (!motionProps.has(k)) filtered[k] = v;    }    return filtered;  };  return {    motion: {      div: ({ children, ...props }: Record<string, unknown>) => <div {...filterMotion(props)}>{children}</div>,    },    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,  };});

import { FeedPage } from './FeedPage';

describe('FeedPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({ success: true, data: [], meta: {} });
    mockPost.mockResolvedValue({ success: true });
  });

  it('renders without crashing', () => {
    render(<FeedPage />);
    expect(screen.getByText('Community Feed')).toBeInTheDocument();
  });

  it('shows the page description', () => {
    render(<FeedPage />);
    expect(screen.getByText(/what's happening in your community/i)).toBeInTheDocument();
  });

  it('shows New Post button for authenticated users', () => {
    render(<FeedPage />);
    expect(screen.getAllByText('New Post').length).toBeGreaterThanOrEqual(1);
  });

  it('shows filter options', () => {
    render(<FeedPage />);
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Posts')).toBeInTheDocument();
    expect(screen.getByText('Listings')).toBeInTheDocument();
    expect(screen.getByText('Events')).toBeInTheDocument();
    expect(screen.getByText('Polls')).toBeInTheDocument();
  });

  it('shows quick post box for authenticated users', () => {
    render(<FeedPage />);
    expect(screen.getByText(/What's on your mind/i)).toBeInTheDocument();
  });

  it('shows empty state when no items returned', async () => {
    mockGet.mockResolvedValue({ success: true, data: [], meta: {} });
    render(<FeedPage />);
    await waitFor(() => {
      expect(screen.getByText('No posts yet')).toBeInTheDocument();
    });
  });

  it('renders feed items when data is returned', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: [
        {
          id: 1,
          content: 'First post content',
          author_name: 'Alice',
          author_id: 10,
          created_at: '2026-02-21T12:00:00Z',
          type: 'post',
          likes_count: 2,
          comments_count: 0,
          is_liked: false,
        },
      ],
      meta: { has_more: false },
    });
    render(<FeedPage />);
    await waitFor(() => {
      expect(screen.getByText('First post content')).toBeInTheDocument();
    });
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('shows Load More when has_more is true', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: [
        {
          id: 1,
          content: 'A post',
          author_name: 'User',
          author_id: 10,
          created_at: '2026-02-21T12:00:00Z',
          type: 'post',
          likes_count: 0,
          comments_count: 0,
          is_liked: false,
        },
      ],
      meta: { has_more: true, cursor: 'abc123' },
    });
    render(<FeedPage />);
    await waitFor(() => {
      expect(screen.getByText('Load More')).toBeInTheDocument();
    });
  });

  it('shows error state when API fails', async () => {
    mockGet.mockRejectedValue(new Error('Network error'));
    render(<FeedPage />);
    await waitFor(() => {
      expect(screen.getByText('Unable to Load Feed')).toBeInTheDocument();
    });
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('renders the Events filter option', async () => {
    const user = userEvent.setup();
    render(<FeedPage />);

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalled();
    });

    const eventsBtn = screen.getByText('Events');
    await user.click(eventsBtn);
    expect(eventsBtn).toBeInTheDocument();
  });

  it('calls loadFeed without type param for "all" filter', async () => {
    render(<FeedPage />);
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('per_page=20')
      );
    });
    // "all" filter should not include type=
    expect(mockGet).not.toHaveBeenCalledWith(
      expect.stringContaining('type=')
    );
  });

  it('shows Goals filter option', () => {
    render(<FeedPage />);
    expect(screen.getByText('Goals')).toBeInTheDocument();
  });

  it('shows loading skeletons while loading', async () => {
    // Use a controllable promise instead of never-resolving one (prevents Vitest hang on CI)
    let resolveApi: (value: unknown) => void;
    mockGet.mockReturnValue(new Promise((resolve) => { resolveApi = resolve; }));
    render(<FeedPage />);
    // Should show skeleton containers (GlassCard mocked as div.glass-card)
    const skeletonCards = document.querySelectorAll('.glass-card');
    // At least 3 skeleton cards + possible quick-post box
    expect(skeletonCards.length).toBeGreaterThanOrEqual(3);
    // Clean up: resolve the promise so Vitest can exit cleanly
    resolveApi!({ success: true, data: [], meta: {} });
  });
});
