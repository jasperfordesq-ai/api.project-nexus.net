// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Tests for About pages (7 pages)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';

const { translations } = vi.hoisted(() => ({
  translations: {
    'impact_report.hero_title': 'Social Impact Study',
    'impact_report.toc_heading': 'Contents',
    'impact_report.download_full_report': 'Download Full Report',
    'impact_summary.hero_headline': 'Impact at a Glance',
    'impact_summary.wellbeing_heading': 'Key Outcomes',
    'impact_summary.hero_subtitle': 'Creating social value',
    'partner.our_partners_heading': 'Our Partners',
    'partner.why_partner_heading': 'Funding Partners',
    'partner.partnership_opportunities_heading': 'Strategic Partners',
    'social_prescribing.hero_title': 'Social Prescribing',
    'social_prescribing.strategic_fit_heading': 'What is Social Prescribing',
    'social_prescribing.validated_outcomes_heading': 'Benefits',
    'strategic_plan.page_title': 'Strategic Plan',
    'strategic_plan.vision_heading': 'Vision',
    'strategic_plan.pillar_1_title': 'Strategic Pillars',
    'timebanking_guide.page_title': 'Timebanking Guide',
    'timebanking_guide.how_it_works_heading': 'How It Works',
    'timebanking_guide.cta_heading': 'Getting Started',
    'timebanking_guide.values_heading': 'Benefits',
  } as Record<string, string>,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => translations[key] ?? (typeof fallback === 'string' ? fallback : key),
  }),
}));

// Mock dependencies
vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn().mockResolvedValue({ success: true, data: [] }),
    post: vi.fn().mockResolvedValue({ success: true }),
  },
  tokenManager: { getTenantId: vi.fn() },
}));

vi.mock('@/contexts', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 1, first_name: 'Test', name: 'Test User' },
    isAuthenticated: true,
  })),
  useTenant: vi.fn(() => ({
    tenant: { id: 2, name: 'Test Tenant', slug: 'test' },
    branding: { name: 'Test Community', logo_url: null },
    tenantPath: (p: string) => `/test${p}`,
    hasFeature: vi.fn(() => true),
    hasModule: vi.fn(() => true),
  })),
  useToast: vi.fn(() => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  })),
}));

vi.mock('@/hooks', () => ({
  usePageTitle: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logError: vi.fn(),
}));

vi.mock('@/lib/helpers', () => ({
  resolveAssetUrl: vi.fn((url: string) => url || ''),
  resolveAvatarUrl: vi.fn((url: string) => url || '/default-avatar.png'),
  formatRelativeTime: vi.fn(() => '2 hours ago'),
}));

vi.mock('@/components/seo', () => ({
  PageMeta: () => null,
}));

vi.mock('framer-motion', () => {
  const motionProps = new Set(['variants', 'initial', 'animate', 'whileInView', 'viewport', 'layout', 'transition', 'exit', 'whileHover', 'whileTap']);
  const filterMotion = (props: Record<string, unknown>) => {
    const filtered: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(props)) {
      if (!motionProps.has(k)) filtered[k] = v;
    }
    return filtered;
  };
  return {
    motion: {
      div: ({ children, ...props }: Record<string, unknown>) => <div {...filterMotion(props)}>{children}</div>,
      h1: ({ children, ...props }: Record<string, unknown>) => <h1 {...filterMotion(props)}>{children}</h1>,
      p: ({ children, ...props }: Record<string, unknown>) => <p {...filterMotion(props)}>{children}</p>,
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

import { ImpactReportPage } from '../about/ImpactReportPage';
import { ImpactSummaryPage } from '../about/ImpactSummaryPage';
import { PartnerPage } from '../about/PartnerPage';
import { SocialPrescribingPage } from '../about/SocialPrescribingPage';
import { StrategicPlanPage } from '../about/StrategicPlanPage';
import { TimebankingGuidePage } from '../about/TimebankingGuidePage';

describe('About Pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ImpactReportPage', () => {
    it('renders without crashing', () => {
      render(<ImpactReportPage />);
      expect(screen.getAllByText(/Social Impact Study/i)[0]).toBeInTheDocument();
    });

    it('shows SROI ratio', () => {
      render(<ImpactReportPage />);
      expect(screen.getAllByText(/16.*1/i)[0]).toBeInTheDocument();
    });

    it('renders table of contents', () => {
      render(<ImpactReportPage />);
      expect(screen.getAllByText(/Contents/i)[0]).toBeInTheDocument();
    });

    it('shows download buttons', () => {
      render(<ImpactReportPage />);
      expect(screen.getAllByText(/Download Full Report/i)[0]).toBeInTheDocument();
    });
  });

  describe('ImpactSummaryPage', () => {
    it('renders without crashing', () => {
      render(<ImpactSummaryPage />);
      expect(screen.getAllByText(/Impact at a Glance/i)[0]).toBeInTheDocument();
    });

    it('shows key metrics', () => {
      render(<ImpactSummaryPage />);
      expect(screen.getAllByText(/Key Outcomes/i)[0]).toBeInTheDocument();
    });

    it('renders hero section', () => {
      render(<ImpactSummaryPage />);
      expect(screen.getAllByText(/Creating social value/i)[0]).toBeInTheDocument();
    });
  });

  describe('PartnerPage', () => {
    it('renders without crashing', () => {
      render(<PartnerPage />);
      expect(screen.getAllByText(/Our Partners/i)[0]).toBeInTheDocument();
    });

    it('shows partner categories', () => {
      render(<PartnerPage />);
      expect(screen.getAllByText(/Funding Partners/i)[0]).toBeInTheDocument();
    });

    it('renders partner logos section', () => {
      render(<PartnerPage />);
      expect(screen.getAllByText(/Strategic Partners/i)[0]).toBeInTheDocument();
    });
  });

  describe('SocialPrescribingPage', () => {
    it('renders without crashing', () => {
      render(<SocialPrescribingPage />);
      expect(screen.getAllByText(/Social Prescribing/i)[0]).toBeInTheDocument();
    });

    it('shows what is social prescribing section', () => {
      render(<SocialPrescribingPage />);
      expect(screen.getAllByText(/What is Social Prescribing/i)[0]).toBeInTheDocument();
    });

    it('renders benefits section', () => {
      render(<SocialPrescribingPage />);
      expect(screen.getAllByText(/Benefits/i)[0]).toBeInTheDocument();
    });
  });

  describe('StrategicPlanPage', () => {
    it('renders without crashing', () => {
      render(<StrategicPlanPage />);
      expect(screen.getAllByText(/Strategic Plan/i)[0]).toBeInTheDocument();
    });

    it('shows vision and mission', () => {
      render(<StrategicPlanPage />);
      expect(screen.getAllByText(/Vision/i)[0]).toBeInTheDocument();
    });

    it('renders strategic pillars', () => {
      render(<StrategicPlanPage />);
      expect(screen.getAllByText(/Strategic Pillars/i)[0]).toBeInTheDocument();
    });
  });

  describe('TimebankingGuidePage', () => {
    it('renders without crashing', () => {
      render(<TimebankingGuidePage />);
      expect(screen.getAllByText(/Timebanking Guide/i)[0]).toBeInTheDocument();
    });

    it('shows how it works section', () => {
      render(<TimebankingGuidePage />);
      expect(screen.getAllByText(/How.*Works/i)[0]).toBeInTheDocument();
    });

    it('renders getting started section', () => {
      render(<TimebankingGuidePage />);
      expect(screen.getAllByText(/Getting Started/i)[0]).toBeInTheDocument();
    });

    it('shows benefits section', () => {
      render(<TimebankingGuidePage />);
      expect(screen.getAllByText(/Benefits/i)[0]).toBeInTheDocument();
    });
  });
});
