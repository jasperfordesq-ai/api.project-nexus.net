// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Tests for SettingsPage
 *
 * Note: SettingsPage imports 15+ HeroUI components and 15+ Lucide icons.
 * We mock @heroui/react and lucide-react to keep compilation fast.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HeroUIProvider } from '@heroui/react';

vi.mock('@heroui/react', () => ({
  HeroUIProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Button: ({ children, onPress, onClick, isLoading, ...props }: Record<string, unknown>) => (
    <button
      type={(props.type as 'button' | 'submit' | 'reset') || 'button'}
      onClick={(event) => {
        (onClick as ((event: React.MouseEvent<HTMLButtonElement>) => void) | undefined)?.(event);
        (onPress as (() => void) | undefined)?.();
      }}
      disabled={Boolean(isLoading || props.disabled)}
    >
      {children as React.ReactNode}
    </button>
  ),
  Input: ({ label, value, onChange, type = 'text', placeholder }: Record<string, unknown>) => (
    <label>
      {label as React.ReactNode}
      <input
        aria-label={label as string}
        type={type as string}
        placeholder={placeholder as string}
        value={(value as string) ?? ''}
        onChange={onChange as React.ChangeEventHandler<HTMLInputElement>}
      />
    </label>
  ),
  Textarea: ({ label, value, onChange, placeholder }: Record<string, unknown>) => (
    <label>
      {label as React.ReactNode}
      <textarea
        aria-label={label as string}
        placeholder={placeholder as string}
        value={(value as string) ?? ''}
        onChange={onChange as React.ChangeEventHandler<HTMLTextAreaElement>}
      />
    </label>
  ),
  Switch: ({ children, isSelected, onValueChange }: Record<string, unknown>) => (
    <label>
      <input
        type="checkbox"
        checked={Boolean(isSelected)}
        onChange={(event) => (onValueChange as ((checked: boolean) => void) | undefined)?.(event.target.checked)}
      />
      {children as React.ReactNode}
    </label>
  ),
  Avatar: ({ name }: { name?: string }) => <div>{name}</div>,
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Tab: ({ title, children }: { title: React.ReactNode; children?: React.ReactNode }) => (
    <section>
      <div>{title}</div>
      {children}
    </section>
  ),
  Select: ({ label, children }: { label?: React.ReactNode; children?: React.ReactNode }) => (
    <label>
      {label}
      <select>{children}</select>
    </label>
  ),
  SelectItem: ({ children }: { children: React.ReactNode }) => <option>{children}</option>,
  Modal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  ModalContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ModalHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ModalBody: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ModalFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Chip: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  Spinner: () => <div role="status">Loading</div>,
  useDisclosure: () => ({
    isOpen: false,
    onOpen: vi.fn(),
    onClose: vi.fn(),
    onOpenChange: vi.fn(),
  }),
}));

vi.mock('react-i18next', () => ({
  initReactI18next: {
    type: '3rdParty',
    init: vi.fn(),
  },
  useTranslation: () => ({
    t: (key: string, fallbackOrOptions?: string | Record<string, unknown>) => {
      if (typeof fallbackOrOptions === 'string') return fallbackOrOptions;
      const translations: Record<string, string> = {
        page_title: 'Settings',
        title: 'Settings',
        subtitle: 'Manage your account preferences',
        'header.title': 'Settings',
        'header.subtitle': 'Manage your account preferences',
        profile: 'Profile',
        notifications: 'Notifications',
        privacy: 'Privacy',
        security: 'Security',
        'tabs.profile': 'Profile',
        'tabs.notifications': 'Notifications',
        'tabs.privacy': 'Privacy',
        'tabs.security': 'Security',
        language: 'Language',
        appearance: 'Appearance',
        save_changes: 'Save Changes',
      };
      return translations[key] ?? key;
    },
  }),
}));

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn().mockResolvedValue({ success: true, data: {} }),
    post: vi.fn().mockResolvedValue({ success: true }),
    put: vi.fn().mockResolvedValue({ success: true }),
    delete: vi.fn().mockResolvedValue({ success: true }),
    upload: vi.fn().mockResolvedValue({ success: true, data: { avatar_url: '/new-avatar.png' } }),
  },
  tokenManager: { getTenantId: vi.fn() },
}));

vi.mock('@/contexts', () => {
  const user = {
      id: 1,
      first_name: 'Test',
      last_name: 'User',
      name: 'Test User',
      phone: '123456789',
      tagline: 'Hello world',
      bio: 'A test bio',
      location: 'Dublin',
      avatar: null,
      profile_type: 'individual',
      organization_name: '',
      has_2fa_enabled: false,
    };
  const tenant = { id: 2, name: 'Test Tenant', slug: 'test' };
  const toast = {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  };
  const theme = {
    theme: 'light',
    setTheme: vi.fn(),
  };

  return {
  useAuth: vi.fn(() => ({
    user,
    isAuthenticated: true,
    logout: vi.fn(),
    refreshUser: vi.fn(),
  })),
  useTenant: vi.fn(() => ({
    tenant,
    tenantPath: (p: string) => `/test${p}`,
    hasFeature: vi.fn(() => true),
    hasModule: vi.fn(() => true),
  })),
  useToast: vi.fn(() => toast),
  useTheme: vi.fn(() => theme),
  };
});

vi.mock('@/contexts/TenantContext', () => ({
  useTenant: vi.fn(() => ({
    tenant: { id: 2, name: 'Test Tenant', slug: 'test' },
    tenantPath: (p: string) => `/test${p}`,
    hasFeature: vi.fn(() => true),
    hasModule: vi.fn(() => true),
  })),
  useTenantLanguages: vi.fn(() => ({
    languages: [
      { code: 'en', name: 'English', native_name: 'English', enabled: true, is_default: true },
    ],
    currentLanguage: 'en',
    setCurrentLanguage: vi.fn(),
  })),
}));

vi.mock('@/hooks', () => ({
  usePageTitle: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logError: vi.fn(),
}));

vi.mock('@/lib/helpers', () => ({
  resolveAvatarUrl: vi.fn((url: string) => url || '/default-avatar.png'),
  formatRelativeTime: vi.fn(() => '2 hours ago'),
}));

vi.mock('@/components/ui', () => ({
  GlassCard: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="glass-card" className={className}>{children}</div>
  ),
}));

vi.mock('@/components/location', () => ({
  PlaceAutocompleteInput: ({ label, placeholder, value, onChange }: {
    label: string;
    placeholder: string;
    value: string;
    onChange: (val: string) => void;
  }) => (
    <input
      data-testid="place-autocomplete"
      aria-label={label}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

vi.mock('@/components/security/BiometricSettings', () => ({
  BiometricSettings: () => <div data-testid="biometric-settings" />,
}));

vi.mock('@/components/skills/SkillSelector', () => ({
  SkillSelector: () => <div data-testid="skill-selector" />,
}));

vi.mock('@/components/availability/AvailabilityGrid', () => ({
  AvailabilityGrid: () => <div data-testid="availability-grid" />,
}));

vi.mock('@/components/subaccounts/SubAccountsManager', () => ({
  SubAccountsManager: () => <div data-testid="subaccounts-manager" />,
}));

vi.mock('@/components/LanguageSwitcher', () => ({
  LanguageSwitcher: () => <button type="button">English</button>,
}));

vi.mock('dompurify', () => ({
  default: {
    sanitize: vi.fn((html: string) => html),
  },
}));

// Mock framer-motion to avoid heavy animation bundle
vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: () => React.forwardRef(({ children, ...props }: Record<string, unknown>, ref: React.Ref<HTMLDivElement>) => {
      const safe = Object.fromEntries(
        Object.entries(props).filter(([k]) => !['variants', 'initial', 'animate', 'exit', 'layout', 'whileHover', 'whileTap', 'transition', 'whileInView', 'viewport'].includes(k))
      );
      return <div ref={ref} {...safe}>{children}</div>;
    }),
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { SettingsPage } from './SettingsPage';
import { api } from '@/lib/api';

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <HeroUIProvider>
      <MemoryRouter>
        {children}
      </MemoryRouter>
    </HeroUIProvider>
  );
}

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/v2/users/me/notifications')) {
        return Promise.resolve({
          success: true,
          data: {
            email_messages: true,
            email_listings: true,
            email_digest: false,
            email_connections: true,
            email_transactions: true,
            email_reviews: true,
            email_gamification: false,
            push_enabled: true,
          },
        });
      }
      if (url.includes('/v2/users/me/preferences')) {
        return Promise.resolve({
          success: true,
          data: {
            privacy: {
              profile_visibility: 'members',
              search_indexing: true,
              contact_permission: true,
            },
          },
        });
      }
      if (url.includes('/v2/auth/2fa/status')) {
        return Promise.resolve({
          success: true,
          data: { enabled: false, backup_codes_remaining: 0 },
        });
      }
      if (url.includes('/v2/users/me/sessions')) {
        return Promise.resolve({ success: true, data: [] });
      }
      return Promise.resolve({ success: true, data: {} });
    });
  });

  it('renders the page heading and description', () => {
    render(<SettingsPage />, { wrapper: Wrapper });
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Manage your account preferences')).toBeInTheDocument();
  });

  it('shows tab navigation with Profile, Notifications, Privacy, Security', () => {
    render(<SettingsPage />, { wrapper: Wrapper });
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('Privacy')).toBeInTheDocument();
    expect(screen.getByText('Security')).toBeInTheDocument();
  });

  it('shows Profile Information section by default', () => {
    render(<SettingsPage />, { wrapper: Wrapper });
    expect(screen.getByText('Profile Information')).toBeInTheDocument();
  });

  it('shows profile form fields', () => {
    render(<SettingsPage />, { wrapper: Wrapper });
    expect(screen.getByLabelText('First Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Last Name')).toBeInTheDocument();
  });

  it('shows Save Changes button on profile tab', () => {
    render(<SettingsPage />, { wrapper: Wrapper });
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
  });

  it('populates form with user data', () => {
    render(<SettingsPage />, { wrapper: Wrapper });
    const firstNameInput = screen.getByLabelText('First Name') as HTMLInputElement;
    expect(firstNameInput.value).toBe('Test');
    const lastNameInput = screen.getByLabelText('Last Name') as HTMLInputElement;
    expect(lastNameInput.value).toBe('User');
  });
});
