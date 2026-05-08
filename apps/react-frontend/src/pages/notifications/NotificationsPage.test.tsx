// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Tests for NotificationsPage
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/test-utils';

const { t } = vi.hoisted(() => ({
  t: vi.fn((key: string, options?: Record<string, unknown>) => {
    const translations: Record<string, string> = {
      page_title: 'Notifications',
      title: 'Notifications',
      subtitle: 'Stay updated with your activity',
      mark_all_read: 'Mark all read',
      settings_aria: 'Notification settings',
      filter_all: 'All',
      empty_title: 'No notifications',
      empty_desc: 'You have no notifications yet.',
      empty_caught_up: 'No unread notifications',
      empty_caught_up_desc: 'You are all caught up.',
      loading_aria: 'Loading notifications',
      mark_read_aria: 'Mark as read',
      delete_aria: 'Delete notification',
      error_load: 'Unable to load notifications',
    };

    if (key === 'unread_badge') return `${options?.count ?? 0} new`;
    if (key === 'filter_unread') return `Unread (${options?.count ?? 0})`;
    return translations[key] ?? key;
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t }),
}));

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn().mockResolvedValue({ success: true, data: [] }),
    post: vi.fn().mockResolvedValue({ success: true }),
    delete: vi.fn().mockResolvedValue({ success: true }),
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
  useNotifications: vi.fn(() => ({
    refreshCounts: vi.fn(),
    markAsRead: vi.fn().mockResolvedValue(undefined),
    markAllAsRead: vi.fn().mockResolvedValue(undefined),
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
  formatRelativeTime: vi.fn(() => '5 minutes ago'),
}));

vi.mock('@/components/ui', () => ({
  GlassCard: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="glass-card" className={className}>{children}</div>
  ),
}));

vi.mock('@/components/feedback', () => ({
  EmptyState: ({ title, description }: { title: string; description?: string }) => (
    <div data-testid="empty-state">
      <div>{title}</div>
      {description && <div>{description}</div>}
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

import { NotificationsPage } from './NotificationsPage';
import { api } from '@/lib/api';

describe('NotificationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page heading and description', () => {
    render(<NotificationsPage />);
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('Stay updated with your activity')).toBeInTheDocument();
  });

  it('shows filter buttons for All and Unread', () => {
    render(<NotificationsPage />);
    expect(screen.getByText('All')).toBeInTheDocument();
    // Unread count starts at 0
    expect(screen.getByText('Unread (0)')).toBeInTheDocument();
  });

  it('shows empty state when no notifications exist', async () => {
    vi.mocked(api.get).mockResolvedValue({ success: true, data: [] });
    render(<NotificationsPage />);
    await waitFor(() => {
      expect(screen.getByText('No notifications')).toBeInTheDocument();
    });
  });

  it('renders notification cards with message and timestamp', async () => {
    vi.mocked(api.get).mockResolvedValue({
      success: true,
      data: [
        {
          id: 1,
          type: 'message',
          title: 'New Message',
          body: 'You received a new message from Alice',
          message: 'You received a new message from Alice',
          read_at: null,
          created_at: '2026-02-19T10:00:00Z',
        },
        {
          id: 2,
          type: 'listing',
          title: 'Listing Update',
          body: 'Your listing got a response',
          message: 'Your listing got a response',
          read_at: '2026-02-19T09:00:00Z',
          created_at: '2026-02-19T08:00:00Z',
        },
      ],
    });
    render(<NotificationsPage />);
    await waitFor(() => {
      expect(screen.getByText('You received a new message from Alice')).toBeInTheDocument();
    });
    expect(screen.getByText('Your listing got a response')).toBeInTheDocument();
    // Check timestamps rendered
    expect(screen.getAllByText('5 minutes ago').length).toBeGreaterThanOrEqual(2);
  });

  it('shows unread count badge when there are unread notifications', async () => {
    vi.mocked(api.get).mockResolvedValue({
      success: true,
      data: [
        {
          id: 1,
          type: 'message',
          title: 'New',
          body: 'Unread notification',
          read_at: null,
          created_at: '2026-02-19T10:00:00Z',
        },
        {
          id: 2,
          type: 'listing',
          title: 'Old',
          body: 'Read notification',
          read_at: '2026-02-19T09:00:00Z',
          created_at: '2026-02-19T08:00:00Z',
        },
      ],
    });
    render(<NotificationsPage />);
    await waitFor(() => {
      expect(screen.getByText('1 new')).toBeInTheDocument();
    });
    expect(screen.getByText('Unread (1)')).toBeInTheDocument();
  });

  it('shows Mark all read button when there are unread notifications', async () => {
    vi.mocked(api.get).mockResolvedValue({
      success: true,
      data: [
        {
          id: 1,
          type: 'message',
          title: 'New',
          body: 'Unread notification',
          read_at: null,
          created_at: '2026-02-19T10:00:00Z',
        },
      ],
    });
    render(<NotificationsPage />);
    await waitFor(() => {
      expect(screen.getByText('Mark all read')).toBeInTheDocument();
    });
  });

  it('shows mark-as-read and delete buttons on notification cards', async () => {
    vi.mocked(api.get).mockResolvedValue({
      success: true,
      data: [
        {
          id: 1,
          type: 'message',
          title: 'New',
          body: 'Unread notification',
          read_at: null,
          created_at: '2026-02-19T10:00:00Z',
        },
      ],
    });
    render(<NotificationsPage />);
    await waitFor(() => {
      expect(screen.getByLabelText('Mark as read')).toBeInTheDocument();
    });
    expect(screen.getByLabelText('Delete notification')).toBeInTheDocument();
  });

  it('shows notification settings button', () => {
    render(<NotificationsPage />);
    expect(screen.getByLabelText('Notification settings')).toBeInTheDocument();
  });
});
