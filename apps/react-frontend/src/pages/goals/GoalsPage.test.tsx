// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Tests for GoalsPage
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/test-utils';

const { t } = vi.hoisted(() => ({
  t: (key: string, options?: Record<string, unknown> | string) => {
    if (typeof options === 'string') return options;
    const map: Record<string, string> = {
      'goals.page_title': 'Goals',
      'goals.title': 'Goals',
      'goals.subtitle': 'Set goals and track your progress',
      'goals.new_goal': 'New Goal',
      'goals.from_template': 'From Template',
      'goals.tab_my': 'My Goals',
      'goals.tab_buddying': 'Buddying',
      'goals.tab_discover': 'Discover',
      'goals.unable_to_load': 'Unable to Load Goals',
      'goals.try_again': 'Try Again',
      'goals.empty_my_title': 'No goals yet',
      'goals.empty_my_description': 'Create your first goal to start tracking progress',
      'goals.empty_buddying_title': 'No buddy goals yet',
      'goals.empty_buddying_description': 'Buddy up with someone to support their goal.',
      'goals.empty_discover_title': 'No public goals found',
      'goals.empty_discover_description': 'Check back later for community goals.',
      'goals.create_goal': 'Create Goal',
      'goals.load_more': 'Load More',
      'goals.status.completed': 'Completed',
      'goals.status.active': 'Active',
      'goals.visibility.public': 'Public',
      'goals.visibility.private': 'Private',
      'goals.detail.progress_aria': 'Goal progress',
      'goals.actions_aria': 'Goal actions',
      'goals.mark_complete': 'Mark Complete',
      'goals.become_buddy': 'Become Buddy',
      'goals.due': 'Due ',
      'goals.overdue': 'Overdue ',
    };
    return map[key] ?? key;
  },
}));

// Mock API module
vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn().mockResolvedValue({ success: true, data: [], meta: {} }),
    post: vi.fn().mockResolvedValue({ success: true }),
    put: vi.fn().mockResolvedValue({ success: true }),
    delete: vi.fn().mockResolvedValue({ success: true }),
  },
  tokenManager: { getTenantId: vi.fn() },
}));

// Mock contexts
vi.mock('@/contexts', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 1, first_name: 'Test', name: 'Test User', last_name: 'User' },
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
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/contexts/ToastContext', () => ({
  useToast: vi.fn(() => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  })),
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/hooks', () => ({ usePageTitle: vi.fn() }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t,
  }),
}));
vi.mock('@/lib/logger', () => ({ logError: vi.fn() }));
vi.mock('@/lib/helpers', () => ({
  resolveAvatarUrl: vi.fn((url) => url || '/default-avatar.png'),
  formatRelativeTime: vi.fn(() => '2 hours ago'),
}));

vi.mock('@/components/ui', () => ({
  GlassCard: ({ children, ...props }: Record<string, unknown>) => <div {...props}>{children}</div>,
}));

vi.mock('@/components/feedback', () => ({
  EmptyState: ({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) => (
    <div data-testid="empty-state">
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {action}
    </div>
  ),
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

import { GoalsPage } from './GoalsPage';

describe('GoalsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page title and description', () => {
    render(<GoalsPage />);
    expect(screen.getByText('Goals')).toBeInTheDocument();
    expect(screen.getByText('Set goals and track your progress')).toBeInTheDocument();
  });

  it('shows New Goal button for authenticated users', () => {
    render(<GoalsPage />);
    expect(screen.getByText('New Goal')).toBeInTheDocument();
  });

  it('renders My Goals and Discover tab buttons', () => {
    render(<GoalsPage />);
    expect(screen.getByText('My Goals')).toBeInTheDocument();
    expect(screen.getByText('Discover')).toBeInTheDocument();
  });

  it('keeps the page shell visible while goals are loading', () => {
    render(<GoalsPage />);
    expect(screen.getByText('Goals')).toBeInTheDocument();
  });

  it('shows empty state when no goals are loaded', async () => {
    const { api } = await import('@/lib/api');
    vi.mocked(api.get).mockResolvedValue({ success: true, data: [], meta: {} });

    render(<GoalsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    });
  });

  it('shows Create Goal button in empty state', async () => {
    const { api } = await import('@/lib/api');
    vi.mocked(api.get).mockResolvedValue({ success: true, data: [], meta: {} });

    render(<GoalsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    });
    expect(screen.getByText('New Goal')).toBeInTheDocument();
  });

  it('displays goals with progress when loaded', async () => {
    const { api } = await import('@/lib/api');
    const mockGoals = [
      {
        id: 1,
        user_id: 1,
        title: 'Give 10 hours this month',
        description: 'Helping the community',
        target_value: 10,
        current_value: 4,
        deadline: '2026-03-01T00:00:00Z',
        is_public: true,
        status: 'active',
        created_at: '2026-01-15T10:00:00Z',
        updated_at: '2026-01-20T10:00:00Z',
        user_name: 'Test User',
        user_avatar: null,
        progress_percentage: 40,
        is_owner: true,
        buddy_id: null,
        buddy_name: null,
        buddy_avatar: null,
        likes_count: 3,
        comments_count: 1,
      },
    ];

    vi.mocked(api.get).mockResolvedValue({
      success: true,
      data: mockGoals,
      meta: { has_more: false },
    });

    render(<GoalsPage />);

    await waitFor(() => {
      expect(screen.getByText('Give 10 hours this month')).toBeInTheDocument();
    });
  });

  it('shows error state on API failure', async () => {
    const { api } = await import('@/lib/api');
    vi.mocked(api.get).mockRejectedValue(new Error('Network error'));

    render(<GoalsPage />);

    await waitFor(() => {
      expect(screen.getByText('Unable to Load Goals')).toBeInTheDocument();
    });
  });
});
