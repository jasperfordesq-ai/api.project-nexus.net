// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Tests for WalletPage
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/test-utils';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn().mockResolvedValue({ success: true }),
  },
  tokenManager: { getTenantId: vi.fn() },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string | Record<string, unknown>) => {
      const translations: Record<string, string> = {
        title: 'Wallet',
        subtitle: 'Track your time credits and transactions',
        your_balance: 'Your Balance',
        send_credits: 'Send Credits',
        donate: 'Donate',
        'stats.earned': 'Earned',
        'stats.spent': 'Spent',
        'stats.pending': 'Pending',
        history: 'Transaction History',
        export: 'Export',
        'filter.all': 'All',
        'filter.earned': 'Earned',
        'filter.spent': 'Spent',
        'filter.pending': 'Pending',
        no_pending: 'No pending credits',
        no_transactions: 'No transactions',
        no_transactions_desc: 'No transactions yet',
      };
      return typeof fallback === 'string' ? fallback : translations[key] ?? key;
    },
  }),
}));

vi.mock('@/contexts', () => ({
  useToast: vi.fn(() => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  })),
  useTenant: vi.fn(() => ({
    tenant: { id: 2, name: 'Test Tenant', slug: 'test' },
    tenantPath: (p: string) => `/test${p}`,
    hasFeature: vi.fn(() => true),
    hasModule: vi.fn(() => true),
  })),
}));

vi.mock('@/hooks', () => ({
  usePageTitle: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logError: vi.fn(),
}));

vi.mock('@/components/feedback', () => ({
  EmptyState: ({ title }: { title: string }) => <div data-testid="empty-state">{title}</div>,
}));

vi.mock('@/components/seo/PageMeta', () => ({
  PageMeta: () => null,
}));

vi.mock('@/components/wallet', () => ({
  TransferModal: () => null,
  DonateModal: () => null,
  CommunityFundCard: () => <div data-testid="community-fund-card" />,
}));

vi.mock('framer-motion', () => {  const motionProps = new Set(['variants', 'initial', 'animate', 'layout', 'transition', 'exit', 'whileHover', 'whileTap', 'whileInView', 'viewport']);  const filterMotion = (props: Record<string, unknown>) => {    const filtered: Record<string, unknown> = {};    for (const [k, v] of Object.entries(props)) {      if (!motionProps.has(k)) filtered[k] = v;    }    return filtered;  };  return {    motion: {      div: ({ children, ...props }: Record<string, unknown>) => <div {...filterMotion(props)}>{children}</div>,    },    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,  };});

import { WalletPage } from './WalletPage';
import { api } from '@/lib/api';

describe('WalletPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/v2/wallet/balance')) {
        return Promise.resolve({
          success: true,
          data: { balance: 10, pending_in: 2, total_spent: 5, total_earned: 15 },
        });
      }
      if (url.includes('/v2/wallet/transactions')) {
        return Promise.resolve({
          success: true,
          data: [],
          meta: { cursor: null, has_more: false },
        });
      }
      return Promise.resolve({ success: true, data: null });
    });
  });

  it('renders without crashing', async () => {
    render(<WalletPage />);
    await waitFor(() => expect(screen.getByText('Wallet')).toBeInTheDocument());
  });

  it('shows the page description', async () => {
    render(<WalletPage />);
    await waitFor(() => {
      expect(screen.getByText('Track your time credits and transactions')).toBeInTheDocument();
    });
  });

  it('shows Send Credits button', async () => {
    render(<WalletPage />);
    await waitFor(() => expect(screen.getByText('Send Credits')).toBeInTheDocument());
  });

  it('shows Transaction History section', async () => {
    render(<WalletPage />);
    await waitFor(() => expect(screen.getByText('Transaction History')).toBeInTheDocument());
  });

  it('shows filter tabs', async () => {
    render(<WalletPage />);
    // These labels appear in both stat cards and filter tabs
    await waitFor(() => expect(screen.getAllByText('Earned').length).toBeGreaterThanOrEqual(1));
    expect(screen.getAllByText('Spent').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Pending').length).toBeGreaterThanOrEqual(1);
  });

  it('shows Export button', async () => {
    render(<WalletPage />);
    await waitFor(() => expect(screen.getByText('Export')).toBeInTheDocument());
  });
});
