// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Tests for MobileDrawer component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';

// --- Mocks ---

const mockNavigate = vi.fn();
const mockLocation = { pathname: '/dashboard', search: '', hash: '', state: null, key: 'default' };

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
    NavLink: ({ children, to, className }: { children: React.ReactNode; to: string; className?: string | ((opts: { isActive: boolean }) => string) }) => {
      const cls = typeof className === 'function' ? className({ isActive: false }) : className;
      return <a href={to} className={cls}>{children}</a>;
    },
  };
});

const mockUseAuth = vi.fn();
const mockUseTenant = vi.fn();
const mockUseNotifications = vi.fn();
const mockToggleTheme = vi.fn();

vi.mock('@/contexts', () => ({
  useAuth: (...args: unknown[]) => mockUseAuth(...args),
  useTenant: (...args: unknown[]) => mockUseTenant(...args),
  useNotifications: (...args: unknown[]) => mockUseNotifications(...args),
  useTheme: () => ({ resolvedTheme: 'light', theme: 'light', toggleTheme: mockToggleTheme, setTheme: vi.fn() }),
  useMenuContext: () => ({ headerMenus: [], mobileMenus: [], hasCustomMenus: false }),
  useCookieConsent: () => ({ showBanner: false, openPreferences: vi.fn(), resetConsent: vi.fn() }),
}));

const i18nMap: Record<string, string> = {
  'nav.home': 'Home', 'nav.dashboard': 'Dashboard', 'nav.feed': 'Feed',
  'nav.listings': 'Listings', 'nav.messages': 'Messages', 'nav.groups': 'Groups',
  'nav.events': 'Events', 'nav.connections': 'Connections', 'nav.exchanges': 'Exchanges',
  'nav.wallet': 'Wallet', 'nav.volunteering': 'Volunteering', 'nav.blog': 'Blog',
  'nav.resources': 'Resources', 'nav.members': 'Members', 'nav.about': 'About',
  'nav.achievements': 'Achievements', 'nav.leaderboard': 'Leaderboard', 'nav.goals': 'Goals',
  'nav.ai_chat': 'AI Chat', 'nav.our_impact': 'Our Impact',
  'nav.timebanking_guide': 'Timebanking Guide', 'nav.faq': 'FAQ',
  'nav.strategic_plan': 'Strategic Plan', 'nav.social_prescribing': 'Social Prescribing',
  'nav.partner_with_us': 'Partner With Us', 'nav.impact_report': 'Impact Report',
  'nav.organisations': 'Organisations', 'nav.partner_communities': 'Partner Communities',
  'nav.group_exchanges': 'Group Exchanges',
  'nav.federation_hub': 'Federation Hub', 'nav.federated_members': 'Federated Members',
  'nav.federated_listings': 'Federated Listings', 'nav.federated_messages': 'Federated Messages',
  'nav.federated_events': 'Federated Events',
  'auth.log_in': 'Log In', 'auth.sign_up': 'Sign Up',
  'account.settings': 'Settings', 'account.log_out': 'Log Out',
  'admin_tools.section': 'Admin Tools', 'admin_tools.admin_panel': 'Admin Panel',
  'admin_tools.legacy_admin': 'Legacy Admin',
  'sections.about': 'About', 'sections.support': 'Support', 'sections.legal': 'Legal',
  'sections.community': 'Community', 'sections.explore': 'Explore',
  'sections.federation': 'Federation', 'sections.account': 'Account',
  'sections.language': 'Language',
  'support.help_center': 'Help Center', 'support.contact': 'Contact',
  'legal.terms_of_service': 'Terms of Service', 'legal.privacy_policy': 'Privacy Policy',
  'legal.cookie_policy': 'Cookie Policy', 'legal.accessibility': 'Accessibility',
  'legal.legal_hub': 'Legal Hub',
  'cookie_consent.manage': 'Manage Cookies',
  'stats.credits': 'Credits', 'stats.messages': 'Messages', 'stats.alerts': 'Alerts',
  'search.placeholder': 'Search...',
  'user_menu.help_center': 'Help Center',
  'user_menu.admin_panel': 'Admin Panel',
  'user_menu.legacy_admin': 'Legacy Admin',
  'nav.timebanking': 'Timebanking',
  'sections.main': 'Main',
  'sections.engage': 'Engage',
};
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => i18nMap[key] ?? key, i18n: { language: 'en', changeLanguage: vi.fn() } }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

vi.mock('@/components/LanguageSwitcher', () => ({
  LanguageSwitcher: () => null,
}));

vi.mock('@/components/navigation', () => ({
  DesktopMenuItems: () => null,
  MobileMenuItems: () => null,
}));

vi.mock('@/lib/helpers', () => ({
  resolveAvatarUrl: (url: string | undefined) => url || '/default-avatar.png',
}));

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn() },
  tokenManager: { getAccessToken: vi.fn(() => 'mock-token') },
  API_BASE: 'http://localhost:5080/api',
}));

import { MobileDrawer } from './MobileDrawer';

function setupDefaultMocks(overrides: {
  auth?: Record<string, unknown>;
  tenant?: Record<string, unknown>;
  notifications?: Record<string, unknown>;
} = {}) {
  mockUseAuth.mockReturnValue({
    user: null,
    isAuthenticated: false,
    logout: vi.fn(),
    ...overrides.auth,
  });
  mockUseTenant.mockReturnValue({
    tenant: { id: 2, name: 'Test Tenant', slug: 'test-tenant' },
    branding: { name: 'Test Community', logo: null, tagline: 'A test community' },
    hasFeature: vi.fn(() => false),
    hasModule: vi.fn(() => true),
    tenantPath: (p: string) => p,
    ...overrides.tenant,
  });
  mockUseNotifications.mockReturnValue({
    unreadCount: 0,
    counts: { messages: 0, notifications: 0 },
    ...overrides.notifications,
  });
}

describe('MobileDrawer', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSearchOpen: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  describe('Rendering when open', () => {
    it('renders the drawer when isOpen is true', () => {
      render(<MobileDrawer {...defaultProps} />);
      // The drawer renders a Close menu button
      expect(screen.getByLabelText('Close menu')).toBeInTheDocument();
    });

    it('renders the brand name', () => {
      render(<MobileDrawer {...defaultProps} />);
      expect(screen.getByText('Test Community')).toBeInTheDocument();
    });

    it('renders the search button', () => {
      render(<MobileDrawer {...defaultProps} />);
      expect(screen.getByLabelText('Open search')).toBeInTheDocument();
    });
  });

  describe('Navigation links', () => {
    it('renders Home navigation link', () => {
      render(<MobileDrawer {...defaultProps} />);
      expect(screen.getByText('Home')).toBeInTheDocument();
    });

    it('renders Timebanking section when listing-related modules are enabled', () => {
      setupDefaultMocks({
        tenant: {
          hasModule: vi.fn(() => true),
        },
      });
      render(<MobileDrawer {...defaultProps} />);
      expect(screen.getByText('Timebanking')).toBeInTheDocument();
    });

    it('renders About section with universal items', () => {
      render(<MobileDrawer {...defaultProps} />);
      const aboutElements = screen.getAllByText('About');
      expect(aboutElements.length).toBeGreaterThanOrEqual(1);
    });

    it('renders guest contact utility action', () => {
      render(<MobileDrawer {...defaultProps} />);
      expect(screen.getByText('Contact')).toBeInTheDocument();
    });

    it('renders Legal section', () => {
      render(<MobileDrawer {...defaultProps} />);
      expect(screen.getByText('Legal')).toBeInTheDocument();
    });
  });

  describe('Unauthenticated state', () => {
    it('shows Log In button when not authenticated', () => {
      render(<MobileDrawer {...defaultProps} />);
      expect(screen.getByText('Log In')).toBeInTheDocument();
    });

    it('shows Sign Up button when not authenticated', () => {
      render(<MobileDrawer {...defaultProps} />);
      expect(screen.getByText('Sign Up')).toBeInTheDocument();
    });

    it('does NOT show user info when not authenticated', () => {
      render(<MobileDrawer {...defaultProps} />);
      expect(screen.queryByText('Credits')).not.toBeInTheDocument();
    });

    it('does NOT show Settings when not authenticated', () => {
      render(<MobileDrawer {...defaultProps} />);
      expect(screen.queryByText('Settings')).not.toBeInTheDocument();
    });

    it('does NOT show Log Out when not authenticated', () => {
      render(<MobileDrawer {...defaultProps} />);
      expect(screen.queryByText('Log Out')).not.toBeInTheDocument();
    });
  });

  describe('Authenticated state', () => {
    beforeEach(() => {
      setupDefaultMocks({
        auth: {
          user: {
            id: 1,
            first_name: 'Jane',
            last_name: 'Smith',
            email: 'jane@example.com',
            avatar_url: '/jane.jpg',
            role: 'member',
            balance: 10,
          },
          isAuthenticated: true,
        },
      });
    });

    it('shows user name when authenticated', () => {
      render(<MobileDrawer {...defaultProps} />);
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('shows user email when authenticated', () => {
      render(<MobileDrawer {...defaultProps} />);
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    });

    it('shows user balance in quick stats', () => {
      render(<MobileDrawer {...defaultProps} />);
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('Credits')).toBeInTheDocument();
    });

    it('does NOT show Log In / Sign Up when authenticated', () => {
      render(<MobileDrawer {...defaultProps} />);
      expect(screen.queryByText('Log In')).not.toBeInTheDocument();
      expect(screen.queryByText('Sign Up')).not.toBeInTheDocument();
    });

    it('shows Settings link when authenticated', () => {
      render(<MobileDrawer {...defaultProps} />);
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('shows Log Out button when authenticated', () => {
      render(<MobileDrawer {...defaultProps} />);
      expect(screen.getByText('Log Out')).toBeInTheDocument();
    });

    it('shows Dashboard link when authenticated and module enabled', () => {
      render(<MobileDrawer {...defaultProps} />);
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });

  describe('Admin tools', () => {
    it('shows Admin Tools section for admin users', () => {
      setupDefaultMocks({
        auth: {
          user: {
            id: 1,
            first_name: 'Admin',
            last_name: 'User',
            email: 'admin@example.com',
            role: 'admin',
            is_admin: true,
          },
          isAuthenticated: true,
        },
      });
      render(<MobileDrawer {...defaultProps} />);
      expect(screen.getByText('Admin Panel')).toBeInTheDocument();
      expect(screen.queryByText('Legacy Admin')).not.toBeInTheDocument();
    });

    it('shows Legacy Admin only for the founder admin account', () => {
      setupDefaultMocks({
        auth: {
          user: {
            id: 1,
            first_name: 'Jasper',
            last_name: 'Ford',
            email: 'jasper.ford.esq@gmail.com',
            role: 'admin',
            is_admin: true,
          },
          isAuthenticated: true,
        },
      });
      render(<MobileDrawer {...defaultProps} />);
      expect(screen.getByText('Legacy Admin')).toBeInTheDocument();
    });

    it('does NOT show Admin Tools for regular members', () => {
      setupDefaultMocks({
        auth: {
          user: {
            id: 1,
            first_name: 'Regular',
            last_name: 'User',
            email: 'user@example.com',
            role: 'member',
          },
          isAuthenticated: true,
        },
      });
      render(<MobileDrawer {...defaultProps} />);
      expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument();
      expect(screen.queryByText('Legacy Admin')).not.toBeInTheDocument();
    });
  });

  describe('Tenant-specific about items', () => {
    it('shows hOUR Timebank specific items when slug is hour-timebank', () => {
      setupDefaultMocks({
        tenant: {
          tenant: { id: 2, name: 'hOUR Timebank', slug: 'hour-timebank' },
          hasFeature: vi.fn(() => false),
          hasModule: vi.fn(() => true),
        },
      });
      render(<MobileDrawer {...defaultProps} />);
      expect(screen.getByText('About')).toBeInTheDocument();
    });

    it('does NOT show hOUR Timebank items for other tenants', () => {
      setupDefaultMocks({
        tenant: {
          tenant: { id: 3, name: 'Other', slug: 'other-tenant' },
          hasFeature: vi.fn(() => false),
          hasModule: vi.fn(() => true),
        },
      });
      render(<MobileDrawer {...defaultProps} />);
      expect(screen.queryByText('Partner With Us')).not.toBeInTheDocument();
      expect(screen.queryByText('Social Prescribing')).not.toBeInTheDocument();
      expect(screen.queryByText('Our Impact')).not.toBeInTheDocument();
    });
  });

  describe('Feature-gated items', () => {
    it('shows Events link when events feature is enabled', () => {
      setupDefaultMocks({
        tenant: {
          hasFeature: vi.fn((f: string) => f === 'events'),
          hasModule: vi.fn(() => true),
        },
      });
      render(<MobileDrawer {...defaultProps} />);
      expect(screen.getByText('Community')).toBeInTheDocument();
    });

    it('does NOT show Events link when events feature is disabled', () => {
      setupDefaultMocks({
        tenant: {
          hasFeature: vi.fn(() => false),
          hasModule: vi.fn(() => true),
        },
      });
      render(<MobileDrawer {...defaultProps} />);
      expect(screen.queryByText('Events')).not.toBeInTheDocument();
    });

    it('shows Explore section when gamification feature is enabled', () => {
      setupDefaultMocks({
        tenant: {
          hasFeature: vi.fn((f: string) => f === 'gamification'),
          hasModule: vi.fn(() => true),
        },
      });
      render(<MobileDrawer {...defaultProps} />);
      expect(screen.getByText('Explore')).toBeInTheDocument();
    });
  });

  describe('AGPL attribution', () => {
    it('renders Built on Project NEXUS attribution link', () => {
      render(<MobileDrawer {...defaultProps} />);
      const link = screen.getByText('Built on Project NEXUS by Jasper Ford');
      expect(link).toBeInTheDocument();
      expect(link.closest('a')).toHaveAttribute(
        'href',
        'https://github.com/jasperfordesq-ai/nexus-v1',
      );
    });
  });
});
