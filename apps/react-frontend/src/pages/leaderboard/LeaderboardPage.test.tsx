// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Tests for LeaderboardPage
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/test-utils';

const { t } = vi.hoisted(() => ({
  t: (key: string, options?: Record<string, unknown> | string) => {
    if (typeof options === 'string') return options;
    const map: Record<string, string> = {
      'leaderboard.page_title': 'Leaderboard',
      'leaderboard.title': 'Leaderboard',
      'leaderboard.subtitle': "See who's leading the community",
      'leaderboard.type_aria': 'Leaderboard type',
      'leaderboard.period_aria': 'Leaderboard period',
      'leaderboard.type.xp': 'XP',
      'leaderboard.type.volunteer_hours': 'Volunteer Hours',
      'leaderboard.type.credits_earned': 'Credits Earned',
      'leaderboard.type.nexus_score': 'NexusScore',
      'leaderboard.period.all': 'All Time',
      'leaderboard.period.season': 'Season',
      'leaderboard.period.month': 'Month',
      'leaderboard.period.week': 'Week',
      'leaderboard.empty_title': 'No rankings yet',
      'leaderboard.unable_to_load': 'Unable to Load Leaderboard',
      'leaderboard.try_again': 'Try Again',
      'leaderboard.you': 'You',
    };
    if (key === 'leaderboard.level') return `Level ${options?.level}`;
    if (key === 'leaderboard.your_rank') return `Your rank: ${options?.rank}`;
    return map[key] ?? key;
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t }),
}));

// Mock API module
// Default mock: returns null data for seasons (SeasonCard) and empty array for leaderboard
vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn().mockImplementation((url: string) => {
      if (url.includes('/seasons')) {
        return Promise.resolve({ success: true, data: null, meta: {} });
      }
      return Promise.resolve({ success: true, data: [], meta: {} });
    }),
    post: vi.fn().mockResolvedValue({ success: true }),
  },
  tokenManager: { getTenantId: vi.fn() },
}));

// Mock contexts - must include ToastProvider since test-utils.tsx uses it
vi.mock('@/contexts', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 1, first_name: 'Test', name: 'Test User' },
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
vi.mock('@/lib/logger', () => ({ logError: vi.fn() }));
vi.mock('@/lib/helpers', () => ({
  resolveAvatarUrl: vi.fn((url) => url || '/default-avatar.png'),
  formatRelativeTime: vi.fn(() => '2 hours ago'),
}));

vi.mock('@/components/ui', () => ({
  GlassCard: ({ children, ...props }: Record<string, unknown>) => <div {...props}>{children}</div>,
}));

vi.mock('@/components/feedback', () => ({
  EmptyState: ({ title, description }: { title: string; description?: string }) => (
    <div data-testid="empty-state">
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </div>
  ),
}));

vi.mock('framer-motion', () => {  const motionProps = new Set(['variants', 'initial', 'animate', 'layout', 'transition', 'exit', 'whileHover', 'whileTap', 'whileInView', 'viewport']);  const filterMotion = (props: Record<string, unknown>) => {    const filtered: Record<string, unknown> = {};    for (const [k, v] of Object.entries(props)) {      if (!motionProps.has(k)) filtered[k] = v;    }    return filtered;  };  return {    motion: {      div: ({ children, ...props }: Record<string, unknown>) => <div {...filterMotion(props)}>{children}</div>,    },    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,  };});

import { LeaderboardPage } from './LeaderboardPage';
import { api } from '@/lib/api';

describe('LeaderboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/seasons')) {
        return Promise.resolve({ success: true, data: null, meta: {} });
      }
      return Promise.resolve({ success: true, data: [], meta: {} });
    });
  });

  it('renders page title and description', () => {
    render(<LeaderboardPage />);
    expect(screen.getByText('Leaderboard')).toBeInTheDocument();
    expect(screen.getByText("See who's leading the community")).toBeInTheDocument();
  });

  it('shows type selector with XP as default', () => {
    render(<LeaderboardPage />);
    expect(screen.getByLabelText('Leaderboard type')).toBeInTheDocument();
  });

  it('shows period selector', () => {
    render(<LeaderboardPage />);
    expect(screen.getByLabelText('Leaderboard period')).toBeInTheDocument();
  });

  it('shows loading skeleton initially', () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}));
    render(<LeaderboardPage />);
    expect(screen.getByLabelText('Loading season')).toBeInTheDocument();
  });

  it('shows empty state when no entries are loaded', async () => {
    // Default mock already returns [] for leaderboard and null for seasons
    render(<LeaderboardPage />);

    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    });
    expect(screen.getByText('No rankings yet')).toBeInTheDocument();
  });

  it('displays leaderboard entries when loaded', async () => {
    const { api } = await import('@/lib/api');
    const mockEntries = [
      {
        position: 1,
        user: { id: 10, name: 'Alice Champion', avatar_url: null },
        xp: 5000,
        score: 5000,
        level: 15,
        is_current_user: false,
      },
      {
        position: 2,
        user: { id: 1, name: 'Test User', avatar_url: null },
        xp: 3500,
        score: 3500,
        level: 12,
        is_current_user: true,
      },
      {
        position: 3,
        user: { id: 20, name: 'Bob Runner', avatar_url: null },
        xp: 2000,
        score: 2000,
        level: 8,
        is_current_user: false,
      },
    ];

    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/seasons')) {
        return Promise.resolve({ success: true, data: null, meta: {} });
      }
      return Promise.resolve({
        success: true,
        data: mockEntries,
        meta: {
          period: 'all',
          type: 'xp',
          your_position: 2,
          total_entries: 50,
        },
      });
    });

    render(<LeaderboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Alice Champion')).toBeInTheDocument();
    });
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('Bob Runner')).toBeInTheDocument();
    // Check XP scores are displayed
    expect(screen.getByText('5,000')).toBeInTheDocument();
    expect(screen.getByText('3,500')).toBeInTheDocument();
    // Check levels
    expect(screen.getByText('Level 15')).toBeInTheDocument();
    expect(screen.getByText('Level 12')).toBeInTheDocument();
  });

  it('highlights current user entry', async () => {
    const { api } = await import('@/lib/api');
    const mockEntries = [
      {
        position: 1,
        user: { id: 1, name: 'Test User', avatar_url: null },
        xp: 5000,
        score: 5000,
        level: 15,
        is_current_user: true,
      },
    ];

    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/seasons')) {
        return Promise.resolve({ success: true, data: null, meta: {} });
      }
      return Promise.resolve({
        success: true,
        data: mockEntries,
        meta: {
          period: 'all',
          type: 'xp',
          your_position: 1,
          total_entries: 50,
        },
      });
    });

    render(<LeaderboardPage />);

    await waitFor(() => {
      expect(screen.getByText('You')).toBeInTheDocument();
    });
  });

  it('shows error state on API failure', async () => {
    const { api } = await import('@/lib/api');
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/seasons')) {
        return Promise.resolve({ success: true, data: null, meta: {} });
      }
      return Promise.reject(new Error('Network error'));
    });

    render(<LeaderboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Unable to Load Leaderboard')).toBeInTheDocument();
    });
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });
});
