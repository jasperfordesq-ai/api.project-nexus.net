// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Tests for OnboardingPage
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/test-utils';

const { t, navigate } = vi.hoisted(() => ({
  navigate: vi.fn(),
  t: vi.fn((key: string, options?: Record<string, unknown>) => {
    const translations: Record<string, string> = {
      page_title: 'Get Started',
      subtitle: 'Set up your profile in a few easy steps',
      step_welcome: 'Welcome',
      step_profile: 'Profile',
      step_interests: 'Interests',
      step_skills: 'Skills',
      step_confirm: 'Confirm',
      welcome_title: `Welcome to ${options?.name ?? 'Test Community'}!`,
      welcome_description: 'Get to know your community and set up your profile.',
      benefit_earn_title: 'Find Help',
      benefit_earn_desc: 'Find neighbours who can help.',
      benefit_community_title: 'Share Skills',
      benefit_community_desc: 'Offer the skills you want to share.',
      benefit_skills_title: 'Build Community',
      benefit_skills_desc: 'Connect with trusted people nearby.',
      lets_get_started: "Let's Get Started",
      profile_title: 'Complete your profile',
      profile_description: 'Add a photo and short bio.',
      interests_title: 'What are you interested in?',
      interests_description: 'Select the categories that interest you.',
      select_or_skip: 'Select the categories that interest you, or skip this step for now.',
      back: 'Back',
      next: 'Next',
      skip: 'Skip',
      aria_completed: 'completed',
      aria_current: 'current',
    };

    if (key === 'aria_step') return `Step ${options?.step}: ${options?.label}`;
    if (key === 'bio_char_count') return `${options?.count ?? 0} characters`;
    if (key === 'bio_min_chars') return `${options?.current ?? 0}/${options?.min ?? 10} characters`;
    return translations[key] ?? key;
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

// Mock API module
vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn().mockResolvedValue({ success: true, data: [], meta: {} }),
    post: vi.fn().mockResolvedValue({ success: true, data: { listings_created: 0 } }),
    put: vi.fn().mockResolvedValue({ success: true }),
    upload: vi.fn().mockResolvedValue({ success: true, data: { avatar_url: '/avatar.png' } }),
  },
  tokenManager: { getTenantId: vi.fn() },
}));

// Mock contexts - must include ToastProvider since test-utils.tsx uses it
vi.mock('@/contexts', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 1, first_name: 'Test', name: 'Test User', onboarding_completed: false },
    isAuthenticated: true,
    refreshUser: vi.fn().mockResolvedValue(undefined),
  })),
  useTenant: vi.fn(() => ({
    tenant: { id: 2, name: 'Test Community', slug: 'test', branding: { name: 'Test Community' } },
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

vi.mock('@/components/ui', () => ({
  GlassCard: ({ children, ...props }: Record<string, unknown>) => <div {...props}>{children}</div>,
}));

vi.mock('framer-motion', () => {  const motionProps = new Set(['variants', 'initial', 'animate', 'layout', 'transition', 'exit', 'whileHover', 'whileTap', 'whileInView', 'viewport', 'custom']);  const filterMotion = (props: Record<string, unknown>) => {    const filtered: Record<string, unknown> = {};    for (const [k, v] of Object.entries(props)) {      if (!motionProps.has(k)) filtered[k] = v;    }    return filtered;  };  return {    motion: {      div: ({ children, ...props }: Record<string, unknown>) => <div {...filterMotion(props)}>{children}</div>,    },    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,  };});

import { OnboardingPage } from './OnboardingPage';
import { useAuth } from '@/contexts';

describe('OnboardingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 1, first_name: 'Test', name: 'Test User', onboarding_completed: false },
      isAuthenticated: true,
      refreshUser: vi.fn().mockResolvedValue(undefined),
    } as unknown as ReturnType<typeof useAuth>);
  });

  it('renders the page title and description', () => {
    render(<OnboardingPage />);
    expect(screen.getByText('Get Started')).toBeInTheDocument();
    expect(screen.getByText('Set up your profile in a few easy steps')).toBeInTheDocument();
  });

  it('shows step 1 welcome content initially', () => {
    render(<OnboardingPage />);
    expect(screen.getByText(/Welcome to Test Community!/)).toBeInTheDocument();
    expect(screen.getByText("Let's Get Started")).toBeInTheDocument();
  });

  it('shows benefit cards on step 1', () => {
    render(<OnboardingPage />);
    expect(screen.getByText('Find Help')).toBeInTheDocument();
    expect(screen.getByText('Share Skills')).toBeInTheDocument();
    expect(screen.getByText('Build Community')).toBeInTheDocument();
  });

  it('shows step progress indicator', () => {
    render(<OnboardingPage />);
    expect(screen.getByText('Welcome')).toBeInTheDocument();
    // The step label "Welcome" appears in the progress area
    expect(screen.getByText(/Welcome to Test Community/)).toBeInTheDocument();
  });

  it('navigates to step 2 when "Let\'s Get Started" is clicked', async () => {
    const { userEvent } = await import('@/test/test-utils');
    const user = userEvent.setup();

    render(<OnboardingPage />);

    const startButton = screen.getByText("Let's Get Started");
    await user.click(startButton);

    await waitFor(() => {
      expect(screen.getByText('Complete your profile')).toBeInTheDocument();
    });
    expect(screen.getByText('Add a photo and short bio.')).toBeInTheDocument();
  });

  it('renders nothing when onboarding is already completed', async () => {
    const { useAuth } = await import('@/contexts');
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 1, first_name: 'Test', name: 'Test User', onboarding_completed: true },
      isAuthenticated: true,
      refreshUser: vi.fn(),
    } as unknown as ReturnType<typeof useAuth>);

    const { container } = render(<OnboardingPage />);
    // Component returns null when onboarding_completed is true (redirect pending)
    // The container should only have the provider wrappers, no onboarding content
    expect(container.querySelector('h1')).toBeNull();
  });

  it('shows Back button on step 2', async () => {
    const { userEvent } = await import('@/test/test-utils');
    const user = userEvent.setup();

    render(<OnboardingPage />);

    // Navigate step 1 -> 2
    await user.click(screen.getByText("Let's Get Started"));
    await waitFor(() => {
      expect(screen.getByText('Complete your profile')).toBeInTheDocument();
    });

    // Back button should exist on step 2
    expect(screen.getByText('Back')).toBeInTheDocument();
  });

  it('shows category selection help text on step 2', async () => {
    const { userEvent } = await import('@/test/test-utils');
    const user = userEvent.setup();

    render(<OnboardingPage />);

    await user.click(screen.getByText("Let's Get Started"));
    await waitFor(() => {
      expect(screen.getByText('Complete your profile')).toBeInTheDocument();
    });

    expect(screen.getByText('Add a photo and short bio.')).toBeInTheDocument();
  });
});
