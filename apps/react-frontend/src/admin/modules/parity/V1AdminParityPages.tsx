// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * V1 admin parity pages.
 * These pages preserve deep admin routes while rendering API-backed state from
 * the ASP.NET admin surface. They intentionally avoid legacy PHP fallbacks.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button, Card, CardBody, CardHeader, Chip, Spinner } from '@heroui/react';
import {
  Activity,
  BadgeCheck,
  BarChart3,
  Bot,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Database,
  FileCog,
  FileText,
  Flag,
  Globe2,
  HelpCircle,
  Languages,
  Layers3,
  MailCheck,
  Megaphone,
  Network,
  PackageCheck,
  ReceiptText,
  RefreshCw,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Users,
  WalletCards,
  type LucideIcon,
} from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { api, API_BASE, tokenManager, type ApiResponse } from '@/lib/api';
import { DataTable, PageHeader, StatCard, StatusBadge, type Column } from '../../components';
import {
  AgentProposalsParityPage,
  AgentRunsParityPage,
  AdminHelpCenterParityPage,
  AgentsAdminParityPage,
  ApiPartnersAdminParityPage,
  BillingControlParityPage,
  BillingParityPage,
  BillingPlansParityPage,
  CheckoutReturnParityPage,
  FederationActivityParityPage,
  FederationAggregatesParityPage,
  FederationApiDocsParityPage,
  InvoiceHistoryParityPage,
  JobBiasAuditParityPage,
  JobModerationQueueParityPage,
  JobPipelineOverviewParityPage,
  JobTemplatesAdminParityPage,
  KiAgentAdminParityPage,
  MarketplaceCouponsParityPage,
  MarketplaceModerationParityPage,
  MarketplaceParityPage,
  MarketplaceSellerParityPage,
  ProvisioningRequestsParityPage,
  RevenueDashboardParityPage,
  VolunteerConsentsParityPage,
  VolunteerConfigParityPage,
  VolunteerExpensesParityPage,
  VolunteerGivingDaysParityPage,
  VolunteerHoursAuditParityPage,
  VolunteerProjectsParityPage,
  VolunteerSafeguardingParityPage,
  VolunteerTrainingParityPage,
} from './BehavioralParityPages';

type JsonRecord = Record<string, unknown>;
type RouteParams = Record<string, string | undefined>;

interface EndpointConfig {
  label: string;
  path: string;
}

interface LinkConfig {
  label: string;
  to: string;
  icon?: LucideIcon;
}

interface PageConfig {
  title: string;
  description: string;
  icon: LucideIcon;
  endpoints: EndpointConfig[];
  links?: LinkConfig[];
  tableTitle?: string;
  emptyLabel?: string;
}

interface EndpointSnapshot {
  label: string;
  path: string;
  success: boolean;
  data?: unknown;
  error?: string;
}

type TableRow = JsonRecord & { __rowKey: string };

const statColors = ['primary', 'success', 'warning', 'secondary'] as const;

function resolvePath(path: string, params: RouteParams): string {
  return Object.entries(params).reduce((current, [key, value]) => {
    return current.replace(`:${key}`, encodeURIComponent(value ?? ''));
  }, path);
}

function getDirectV2Url(endpoint: string): string {
  const base = API_BASE.replace(/\/$/, '');
  const apiV2Base = base.endsWith('/api/v2')
    ? base
    : base.endsWith('/api')
      ? `${base}/v2`
      : `${base}/api/v2`;

  return `${apiV2Base}${endpoint.replace(/^\/v2/, '')}`;
}

async function fetchAdminEndpoint(endpoint: string): Promise<ApiResponse<unknown>> {
  const normalized = await api.get<unknown>(endpoint);
  if (normalized.success || !endpoint.startsWith('/v2/')) {
    return normalized;
  }

  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = tokenManager.getAccessToken();
  const tenantId = tokenManager.getTenantId();

  if (token) headers.Authorization = `Bearer ${token}`;
  if (tenantId) headers['X-Tenant-ID'] = tenantId;

  try {
    const response = await fetch(getDirectV2Url(endpoint), {
      headers,
      credentials: 'include',
    });
    const payload = await response.json().catch(() => undefined);
    if (!response.ok) {
      return {
        success: false,
        error: payload?.error ?? payload?.message ?? `HTTP ${response.status}`,
        code: String(response.status),
      };
    }
    return {
      success: true,
      data: payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload,
      message: payload?.message,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
      code: 'NETWORK_ERROR',
    };
  }
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function humanize(value: string): string {
  return value
    .replace(/^_+|_+$/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function compactValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '--';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(2);
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
    }
    return value.length > 80 ? `${value.slice(0, 77)}...` : value;
  }
  if (Array.isArray(value)) return `${value.length} items`;
  if (isRecord(value)) {
    const name = value.name ?? value.title ?? value.email ?? value.slug;
    return typeof name === 'string' ? name : `${Object.keys(value).length} fields`;
  }
  return String(value);
}

function countRows(data: unknown): number {
  if (Array.isArray(data)) return data.length;
  if (!isRecord(data)) return 0;

  const preferredKeys = [
    'items',
    'data',
    'results',
    'records',
    'requests',
    'breaches',
    'consents',
    'options',
    'partners',
    'webhooks',
    'logs',
    'proposals',
    'runs',
    'agents',
    'listings',
    'sellers',
    'reports',
    'coupons',
    'invoices',
    'subscribers',
    'tiers',
    'templates',
    'projects',
    'expenses',
    'hours',
    'training',
    'applications',
    'activity',
  ];

  for (const key of preferredKeys) {
    if (Array.isArray(data[key])) return data[key].length;
  }

  return 0;
}

function extractRows(data: unknown): TableRow[] {
  const unwrap = (value: unknown): unknown => {
    if (isRecord(value) && Array.isArray(value.data)) return value.data;
    return value;
  };

  const payload = unwrap(data);
  let rows: unknown[] = [];

  if (Array.isArray(payload)) {
    rows = payload;
  } else if (isRecord(payload)) {
    const rowKeys = [
      'items',
      'data',
      'results',
      'records',
      'requests',
      'breaches',
      'consents',
      'options',
      'partners',
      'webhooks',
      'logs',
      'proposals',
      'runs',
      'agents',
      'listings',
      'sellers',
      'reports',
      'coupons',
      'invoices',
      'subscribers',
      'tiers',
      'templates',
      'projects',
      'expenses',
      'hours',
      'training',
      'applications',
      'activity',
    ];
    const key = rowKeys.find((candidate) => Array.isArray(payload[candidate]));
    rows = key ? (payload[key] as unknown[]) : [];
  }

  return rows
    .filter(isRecord)
    .map((row, index) => ({
      ...row,
      __rowKey: String(row.id ?? row.slug ?? row.key ?? row.email ?? index),
    }));
}

function collectRows(snapshots: EndpointSnapshot[]): TableRow[] {
  for (const snapshot of snapshots) {
    if (!snapshot.success) continue;
    const rows = extractRows(snapshot.data);
    if (rows.length > 0) return rows;
  }
  return [];
}

function buildColumns(rows: TableRow[]): Column<TableRow>[] {
  if (rows.length === 0) return [];

  const priority = ['name', 'title', 'email', 'slug', 'status', 'type', 'category', 'created_at', 'updated_at'];
  const keys = Array.from(
    new Set([
      ...priority.filter((key) => key in rows[0]),
      ...Object.keys(rows[0]).filter((key) => key !== '__rowKey'),
    ])
  ).slice(0, 6);

  return keys.map((key) => ({
    key,
    label: humanize(key),
    sortable: true,
    render: (item) => {
      const value = item[key];
      if (key.toLowerCase().includes('status') && typeof value === 'string') {
        return <StatusBadge status={value} />;
      }
      return <span className="text-sm text-default-700">{compactValue(value)}</span>;
    },
  }));
}

function collectStats(snapshots: EndpointSnapshot[]) {
  const numericStats: Array<{ label: string; value: number }> = [];

  for (const snapshot of snapshots) {
    if (!snapshot.success || !isRecord(snapshot.data)) continue;
    for (const [key, value] of Object.entries(snapshot.data)) {
      if (
        typeof value === 'number' &&
        Number.isFinite(value) &&
        !['id', 'tenant_id', 'user_id'].includes(key.toLowerCase())
      ) {
        numericStats.push({ label: humanize(key), value });
      }
    }
  }

  const totalRows = snapshots.reduce((total, snapshot) => total + (snapshot.success ? countRows(snapshot.data) : 0), 0);
  const errors = snapshots.filter((snapshot) => !snapshot.success).length;
  const loaded = snapshots.filter((snapshot) => snapshot.success).length;

  return [
    ...numericStats.slice(0, 2),
    { label: 'Records', value: totalRows },
    { label: 'Loaded Sources', value: loaded },
    { label: 'Open Errors', value: errors },
  ].slice(0, 4);
}

function scalarEntries(data: unknown): Array<[string, unknown]> {
  if (!isRecord(data)) return [];
  return Object.entries(data).filter(([, value]) => {
    return (
      value === null ||
      ['string', 'number', 'boolean'].includes(typeof value)
    );
  }).slice(0, 8);
}

function ApiSourceCard({ snapshot }: { snapshot: EndpointSnapshot }) {
  const entries = snapshot.success ? scalarEntries(snapshot.data) : [];

  return (
    <Card shadow="sm">
      <CardHeader className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">{snapshot.label}</h3>
          <p className="truncate text-xs text-default-400">{snapshot.path}</p>
        </div>
        <Chip
          size="sm"
          variant="flat"
          color={snapshot.success ? 'success' : 'danger'}
        >
          {snapshot.success ? 'Loaded' : 'Error'}
        </Chip>
      </CardHeader>
      <CardBody className="pt-0">
        {snapshot.success ? (
          entries.length > 0 ? (
            <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {entries.map(([key, value]) => (
                <div key={key} className="rounded-md bg-default-50 px-3 py-2">
                  <dt className="text-xs text-default-400">{humanize(key)}</dt>
                  <dd className="truncate text-sm font-medium text-default-700">{compactValue(value)}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-default-500">No summary fields returned.</p>
          )
        ) : (
          <p className="text-sm text-danger">{snapshot.error ?? 'The admin API did not return data for this route.'}</p>
        )}
      </CardBody>
    </Card>
  );
}

function V1AdminParityPage({ config }: { config: PageConfig }) {
  usePageTitle(`Admin - ${config.title}`);
  const params = useParams<RouteParams>();
  const paramsKey = JSON.stringify(params);
  const resolvedEndpoints = useMemo(() => {
    const routeParams = JSON.parse(paramsKey) as RouteParams;
    return config.endpoints.map((endpoint) => ({
      ...endpoint,
      path: resolvePath(endpoint.path, routeParams),
    }));
  }, [config.endpoints, paramsKey]);

  const [snapshots, setSnapshots] = useState<EndpointSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const next = await Promise.all(
      resolvedEndpoints.map(async (endpoint) => {
        const response = await fetchAdminEndpoint(endpoint.path);
        return {
          label: endpoint.label,
          path: endpoint.path,
          success: response.success,
          data: response.data,
          error: response.error ?? response.message,
        } satisfies EndpointSnapshot;
      })
    );
    setSnapshots(next);
    setLoading(false);
  }, [resolvedEndpoints]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => collectRows(snapshots), [snapshots]);
  const columns = useMemo(() => buildColumns(rows), [rows]);
  const stats = useMemo(() => collectStats(snapshots), [snapshots]);
  const Icon = config.icon;

  return (
    <div>
      <PageHeader
        title={config.title}
        description={config.description}
        actions={
          <Button
            variant="flat"
            size="sm"
            startContent={<RefreshCw size={16} />}
            onPress={load}
            isLoading={loading}
          >
            Refresh
          </Button>
        }
      />

      {config.links && config.links.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {config.links.map((link) => {
            const LinkIcon = link.icon ?? Layers3;
            return (
              <Button
                key={link.to}
                as={Link}
                to={link.to}
                variant="flat"
                size="sm"
                startContent={<LinkIcon size={16} />}
              >
                {link.label}
              </Button>
            );
          })}
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            icon={index === 0 ? Icon : index === 1 ? CheckCircle2 : index === 2 ? Database : Activity}
            color={statColors[index] ?? 'default'}
            loading={loading}
          />
        ))}
      </div>

      {loading ? (
        <Card shadow="sm">
          <CardBody className="flex h-64 items-center justify-center">
            <Spinner size="lg" />
          </CardBody>
        </Card>
      ) : rows.length > 0 ? (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-foreground">
            {config.tableTitle ?? 'Records'}
          </h2>
          <DataTable
            columns={columns}
            data={rows}
            keyField="__rowKey"
            searchable
            onRefresh={load}
          />
        </div>
      ) : (
        <Card shadow="sm">
          <CardBody className="flex flex-col items-center justify-center py-12 text-center">
            <Icon size={40} className="mb-3 text-default-300" />
            <h3 className="text-base font-semibold text-foreground">
              {config.emptyLabel ?? 'No records returned'}
            </h3>
            <p className="mt-1 max-w-lg text-sm text-default-500">
              The backing admin API is reachable for this route when sources show as loaded below.
            </p>
          </CardBody>
        </Card>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {snapshots.map((snapshot) => (
          <ApiSourceCard key={snapshot.path} snapshot={snapshot} />
        ))}
      </div>
    </div>
  );
}

const configs = {
  advertisingCampaigns: {
    title: 'Advertising Campaigns',
    description: 'Review local advertising campaigns, budgets, and campaign status.',
    icon: Megaphone,
    tableTitle: 'Campaigns',
    endpoints: [
      { label: 'Campaigns', path: '/v2/admin/ad-campaigns' },
      { label: 'Stats', path: '/v2/admin/ad-campaigns/stats' },
    ],
  },
  pushCampaigns: {
    title: 'Push Campaigns',
    description: 'Review paid push campaigns and dispatch readiness.',
    icon: MailCheck,
    tableTitle: 'Push Campaigns',
    endpoints: [
      { label: 'Campaigns', path: '/v2/admin/push-campaigns' },
      { label: 'Stats', path: '/v2/admin/push-campaigns/stats' },
    ],
  },
  agents: {
    title: 'AI Agents',
    description: 'Manage autonomous agent definitions and their enabled state.',
    icon: Bot,
    tableTitle: 'Agent Definitions',
    endpoints: [{ label: 'Agents', path: '/v2/admin/agents' }],
    links: [
      { label: 'Proposals', to: '/admin/agents/proposals', icon: FileText },
      { label: 'Runs', to: '/admin/agents/runs', icon: Activity },
    ],
  },
  agentProposals: {
    title: 'Agent Proposals',
    description: 'Review agent-generated proposals before they affect platform data.',
    icon: Sparkles,
    tableTitle: 'Proposals',
    endpoints: [{ label: 'Proposals', path: '/v2/admin/agents/proposals' }],
  },
  agentRuns: {
    title: 'Agent Runs',
    description: 'Monitor recent agent execution history and outcomes.',
    icon: Activity,
    tableTitle: 'Runs',
    endpoints: [{ label: 'Runs', path: '/v2/admin/agents/runs' }],
  },
  kiAgents: {
    title: 'KI Agents',
    description: 'Configure the legacy KI agent compatibility surface.',
    icon: Bot,
    endpoints: [
      { label: 'Config', path: '/v2/admin/ki-agents/config' },
      { label: 'Stats', path: '/v2/admin/ki-agents/stats' },
      { label: 'Proposals', path: '/v2/admin/ki-agents/proposals' },
      { label: 'Runs', path: '/v2/admin/ki-agents/runs' },
    ],
  },
  billing: {
    title: 'Billing',
    description: 'Review subscription status, invoice history, and plan controls.',
    icon: CreditCard,
    endpoints: [
      { label: 'Subscription', path: '/v2/admin/billing/subscription' },
      { label: 'Invoices', path: '/v2/admin/billing/invoices' },
    ],
    links: [
      { label: 'Plans', to: '/admin/billing/plans', icon: WalletCards },
      { label: 'Invoices', to: '/admin/billing/invoices', icon: ReceiptText },
      { label: 'Revenue', to: '/admin/billing/revenue', icon: BarChart3 },
    ],
  },
  billingPlans: {
    title: 'Billing Plans',
    description: 'Compare tenant billing plans and subscription options.',
    icon: WalletCards,
    tableTitle: 'Plans',
    endpoints: [
      { label: 'Plans', path: '/v2/admin/plans' },
      { label: 'Subscription', path: '/v2/admin/billing/subscription' },
    ],
  },
  billingInvoices: {
    title: 'Invoices',
    description: 'Review billing invoices and payment states.',
    icon: ReceiptText,
    tableTitle: 'Invoices',
    endpoints: [{ label: 'Invoices', path: '/v2/admin/billing/invoices' }],
  },
  checkoutReturn: {
    title: 'Checkout Return',
    description: 'Confirm the current subscription state after a billing checkout.',
    icon: CreditCard,
    endpoints: [
      { label: 'Subscription', path: '/v2/admin/billing/subscription' },
      { label: 'Invoices', path: '/v2/admin/billing/invoices' },
    ],
  },
  revenue: {
    title: 'Revenue Dashboard',
    description: 'Track platform revenue and billing snapshots.',
    icon: BarChart3,
    endpoints: [
      { label: 'Revenue', path: '/v2/admin/super/billing/revenue' },
      { label: 'Snapshot', path: '/v2/admin/super/billing/snapshot' },
    ],
  },
  memberPremium: {
    title: 'Member Premium',
    description: 'Manage premium member tiers and entitlement settings.',
    icon: BadgeCheck,
    tableTitle: 'Premium Tiers',
    endpoints: [{ label: 'Tiers', path: '/v2/admin/member-premium/tiers' }],
    links: [{ label: 'Subscribers', to: '/admin/member-premium/subscribers', icon: Users }],
  },
  memberPremiumSubscribers: {
    title: 'Premium Subscribers',
    description: 'Review members with active or historical premium subscriptions.',
    icon: Users,
    tableTitle: 'Subscribers',
    endpoints: [{ label: 'Subscribers', path: '/v2/admin/member-premium/subscribers' }],
  },
  marketplace: {
    title: 'Marketplace',
    description: 'Moderate marketplace listings, sellers, reports, and coupons.',
    icon: ShoppingBag,
    tableTitle: 'Recent Listings',
    endpoints: [
      { label: 'Dashboard', path: '/v2/admin/marketplace/dashboard' },
      { label: 'Listings', path: '/v2/admin/marketplace/listings?per_page=25' },
    ],
    links: [
      { label: 'Moderation', to: '/admin/marketplace/moderation', icon: ShieldCheck },
      { label: 'Sellers', to: '/admin/marketplace/sellers', icon: Users },
      { label: 'Coupons', to: '/admin/marketplace/coupons', icon: ReceiptText },
    ],
  },
  marketplaceModeration: {
    title: 'Marketplace Moderation',
    description: 'Review marketplace listings and member reports awaiting decisions.',
    icon: ShieldCheck,
    tableTitle: 'Moderation Queue',
    endpoints: [
      { label: 'Pending Listings', path: '/v2/admin/marketplace/listings?moderation_status=pending&per_page=50' },
      { label: 'Reports', path: '/v2/admin/marketplace/reports' },
    ],
  },
  marketplaceSellers: {
    title: 'Marketplace Sellers',
    description: 'Manage seller verification and seller account status.',
    icon: Users,
    tableTitle: 'Sellers',
    endpoints: [{ label: 'Sellers', path: '/v2/admin/marketplace/sellers' }],
  },
  marketplaceCoupons: {
    title: 'Marketplace Coupons',
    description: 'Review coupon listings and coupon moderation state.',
    icon: ReceiptText,
    tableTitle: 'Coupons',
    endpoints: [{ label: 'Coupons', path: '/v2/admin/marketplace/coupons' }],
  },
  enterpriseFeatures: {
    title: 'Feature Flags',
    description: 'Manage advanced enterprise feature flags for the current tenant.',
    icon: Settings2,
    tableTitle: 'Features',
    endpoints: [{ label: 'Feature Flags', path: '/v2/admin/enterprise/config/features' }],
  },
  fadp: {
    title: 'FADP Compliance',
    description: 'Review Swiss FADP processing registers, disclosure packs, and retention settings.',
    icon: ShieldCheck,
    endpoints: [
      { label: 'Processing Register', path: '/v2/admin/fadp/processing-register' },
      { label: 'Processing Activities', path: '/v2/admin/fadp/processing-activities' },
      { label: 'Consent Ledger', path: '/v2/admin/fadp/consent-ledger' },
      { label: 'Retention Config', path: '/v2/admin/fadp/retention-config' },
    ],
  },
  gdprRequestDetail: {
    title: 'GDPR Request Detail',
    description: 'Review a single data subject request and its audit context.',
    icon: FileText,
    endpoints: [{ label: 'Request', path: '/v2/admin/enterprise/gdpr/requests/:id' }],
  },
  gdprRequestCreate: {
    title: 'Create GDPR Request',
    description: 'Open a new data subject request workflow.',
    icon: FileText,
    endpoints: [
      { label: 'Requests', path: '/v2/admin/enterprise/gdpr/requests' },
      { label: 'Statistics', path: '/v2/admin/enterprise/gdpr/statistics' },
    ],
  },
  gdprConsentTypes: {
    title: 'Consent Types',
    description: 'Manage consent type configuration and user consent coverage.',
    icon: FileCog,
    tableTitle: 'Consent Types',
    endpoints: [{ label: 'Consent Types', path: '/v2/admin/enterprise/gdpr/consent-types' }],
  },
  gdprBreachDetail: {
    title: 'GDPR Breach Detail',
    description: 'Review breach details, notifications, and DPA readiness.',
    icon: ShieldCheck,
    endpoints: [{ label: 'Breach', path: '/v2/admin/enterprise/gdpr/breaches/:id' }],
  },
  logFiles: {
    title: 'Log Files',
    description: 'Inspect server log files exposed through the admin monitoring API.',
    icon: FileText,
    tableTitle: 'Log Files',
    endpoints: [{ label: 'Log Files', path: '/v2/admin/enterprise/monitoring/log-files' }],
  },
  logFileViewer: {
    title: 'Log File Viewer',
    description: 'Inspect a selected server log file.',
    icon: FileText,
    endpoints: [{ label: 'Log File', path: '/v2/admin/enterprise/monitoring/log-files/:filename' }],
  },
  systemRequirements: {
    title: 'System Requirements',
    description: 'Check server requirements and operational readiness.',
    icon: Database,
    endpoints: [{ label: 'Requirements', path: '/v2/admin/enterprise/monitoring/requirements' }],
  },
  federationExternalPartners: {
    title: 'External Partners',
    description: 'Manage external federation partners and protocol connections.',
    icon: Globe2,
    tableTitle: 'External Partners',
    endpoints: [{ label: 'External Partners', path: '/v2/admin/federation/external-partners' }],
  },
  federationWebhooks: {
    title: 'Federation Webhooks',
    description: 'Review webhook endpoints for federation events.',
    icon: Network,
    tableTitle: 'Webhooks',
    endpoints: [{ label: 'Webhooks', path: '/v2/admin/federation/webhooks' }],
  },
  federationApiDocs: {
    title: 'Federation API Documentation',
    description: 'Review API access, keys, and protocol documentation state.',
    icon: FileText,
    endpoints: [
      { label: 'API Keys', path: '/v2/admin/federation/api-keys' },
      { label: 'Data Management', path: '/v2/admin/federation/data' },
    ],
  },
  federationActivity: {
    title: 'Federation Activity',
    description: 'Monitor inbound and outbound federation activity.',
    icon: Activity,
    tableTitle: 'Activity',
    endpoints: [{ label: 'Activity', path: '/v2/admin/federation/activity' }],
  },
  federationCreditCommons: {
    title: 'Credit Commons',
    description: 'Review Credit Commons agreements and protocol settings.',
    icon: Network,
    endpoints: [
      { label: 'Credit Agreements', path: '/v2/admin/federation/credit-agreements' },
      { label: 'Analytics', path: '/v2/admin/federation/analytics' },
    ],
  },
  federationAggregates: {
    title: 'Federation Aggregates',
    description: 'Review aggregate federation statistics and consent status.',
    icon: BarChart3,
    endpoints: [
      { label: 'Analytics', path: '/v2/admin/federation/analytics' },
      { label: 'Activity', path: '/v2/admin/federation/activity' },
    ],
  },
  volunteeringExpenses: {
    title: 'Volunteer Expenses',
    description: 'Review volunteer expense claims and configured expense policies.',
    icon: ReceiptText,
    tableTitle: 'Expenses',
    endpoints: [
      { label: 'Expenses', path: '/v2/admin/volunteering/expenses' },
      { label: 'Policies', path: '/v2/admin/volunteering/expenses/policies' },
    ],
  },
  volunteeringTraining: {
    title: 'Volunteer Training',
    description: 'Review training credentials and verification queue.',
    icon: BadgeCheck,
    tableTitle: 'Training',
    endpoints: [{ label: 'Training', path: '/v2/admin/volunteering/training' }],
  },
  volunteeringSafeguarding: {
    title: 'Volunteer Safeguarding',
    description: 'Review incidents, guardian consents, and safeguarding checks.',
    icon: ShieldCheck,
    tableTitle: 'Incidents',
    endpoints: [
      { label: 'Incidents', path: '/v2/admin/volunteering/incidents' },
      { label: 'Guardian Consents', path: '/v2/admin/volunteering/guardian-consents' },
    ],
  },
  volunteeringHours: {
    title: 'Volunteer Hours',
    description: 'Audit volunteer hour submissions and verification state.',
    icon: CalendarClock,
    tableTitle: 'Hours',
    endpoints: [{ label: 'Hours', path: '/v2/admin/volunteering/hours' }],
  },
  volunteeringGivingDays: {
    title: 'Giving Days',
    description: 'Manage volunteering giving day campaigns and donor trends.',
    icon: Sparkles,
    tableTitle: 'Giving Days',
    endpoints: [{ label: 'Giving Days', path: '/v2/admin/volunteering/giving-days' }],
  },
  volunteeringConsents: {
    title: 'Volunteer Consents',
    description: 'Review guardian and participation consent records.',
    icon: FileText,
    tableTitle: 'Consents',
    endpoints: [{ label: 'Guardian Consents', path: '/v2/admin/volunteering/guardian-consents' }],
  },
  volunteeringProjects: {
    title: 'Volunteer Projects',
    description: 'Review community projects and project moderation state.',
    icon: BriefcaseBusiness,
    tableTitle: 'Projects',
    endpoints: [{ label: 'Community Projects', path: '/v2/admin/volunteering/community-projects' }],
  },
  volunteeringConfig: {
    title: 'Volunteering Configuration',
    description: 'Manage volunteering custom fields, webhooks, and reminder settings.',
    icon: Settings2,
    endpoints: [
      { label: 'Configuration', path: '/v2/admin/config/volunteering' },
      { label: 'Custom Fields', path: '/v2/admin/volunteering/custom-fields' },
      { label: 'Webhooks', path: '/v2/admin/volunteering/webhooks' },
      { label: 'Reminder Settings', path: '/v2/admin/volunteering/reminder-settings' },
    ],
  },
  jobsModeration: {
    title: 'Job Moderation',
    description: 'Review job posts awaiting approval, rejection, or spam handling.',
    icon: ShieldCheck,
    tableTitle: 'Moderation Queue',
    endpoints: [
      { label: 'Queue', path: '/v2/admin/jobs/moderation-queue' },
      { label: 'Stats', path: '/v2/admin/jobs/moderation-stats' },
      { label: 'Spam Stats', path: '/v2/admin/jobs/spam-stats' },
    ],
  },
  jobsBiasAudit: {
    title: 'Job Bias Audit',
    description: 'Review job advert bias audit signals.',
    icon: Flag,
    tableTitle: 'Bias Audit',
    endpoints: [{ label: 'Bias Audit', path: '/v2/admin/jobs/bias-audit' }],
  },
  jobsPipeline: {
    title: 'Job Pipeline',
    description: 'Review interviews, offers, and candidate pipeline state.',
    icon: BriefcaseBusiness,
    endpoints: [
      { label: 'Interviews', path: '/v2/admin/jobs/interviews' },
      { label: 'Offers', path: '/v2/admin/jobs/offers' },
    ],
  },
  jobsTemplates: {
    title: 'Job Templates',
    description: 'Manage reusable job templates.',
    icon: FileText,
    tableTitle: 'Templates',
    endpoints: [{ label: 'Templates', path: '/v2/admin/jobs/templates' }],
  },
  regionalAnalytics: {
    title: 'Regional Analytics',
    description: 'Review regional demand, supply, demographics, and engagement trends.',
    icon: BarChart3,
    endpoints: [
      { label: 'Overview', path: '/v2/admin/regional-analytics/overview' },
      { label: 'Demand Supply', path: '/v2/admin/regional-analytics/demand-supply' },
      { label: 'Demographics', path: '/v2/admin/regional-analytics/demographics' },
      { label: 'Engagement Trends', path: '/v2/admin/regional-analytics/engagement-trends' },
    ],
  },
  regionalAnalyticsSubscriptions: {
    title: 'Regional Analytics Subscriptions',
    description: 'Review paid regional analytics subscription state.',
    icon: CreditCard,
    endpoints: [
      { label: 'Overview', path: '/v2/admin/regional-analytics/overview' },
      { label: 'Subscription', path: '/v2/admin/billing/subscription' },
    ],
  },
  nationalKiss: {
    title: 'National KISS Dashboard',
    description: 'Review national KISS cooperative summary, trend, and comparative metrics.',
    icon: Building2,
    endpoints: [
      { label: 'Summary', path: '/v2/admin/national/kiss/summary' },
      { label: 'Trend', path: '/v2/admin/national/kiss/trend' },
      { label: 'Comparative', path: '/v2/admin/national/kiss/comparative' },
      { label: 'Cooperatives', path: '/v2/admin/national/kiss/cooperatives' },
    ],
  },
  apiPartners: {
    title: 'API Partners',
    description: 'Manage partner API access and credentials.',
    icon: Network,
    tableTitle: 'Partners',
    endpoints: [{ label: 'API Partners', path: '/v2/admin/api-partners' }],
  },
  safeguardingOptions: {
    title: 'Safeguarding Options',
    description: 'Manage safeguarding option sets shown during onboarding and reviews.',
    icon: ShieldCheck,
    tableTitle: 'Options',
    endpoints: [{ label: 'Options', path: '/v2/admin/safeguarding/options' }],
  },
  translationConfig: {
    title: 'Translation Configuration',
    description: 'Manage supported locales and translation coverage.',
    icon: Languages,
    endpoints: [
      { label: 'Config', path: '/v2/admin/config/translation' },
      { label: 'Stats', path: '/v2/admin/translations/stats' },
      { label: 'Missing', path: '/v2/admin/translations/missing?locale=en' },
    ],
  },
  moduleConfiguration: {
    title: 'Module Configuration',
    description: 'Review tenant module and feature configuration.',
    icon: Layers3,
    endpoints: [
      { label: 'Tenant Config', path: '/v2/admin/config' },
      { label: 'Module Config', path: '/v2/admin/config/modules' },
    ],
  },
  onboardingSettings: {
    title: 'Onboarding Settings',
    description: 'Manage onboarding steps, presets, and tenant onboarding policy.',
    icon: Sparkles,
    endpoints: [
      { label: 'Config', path: '/v2/admin/config/onboarding' },
      { label: 'Presets', path: '/v2/admin/config/onboarding/presets' },
    ],
  },
  landingPage: {
    title: 'Landing Page',
    description: 'Manage landing page content configuration.',
    icon: FileCog,
    endpoints: [{ label: 'Landing Page Config', path: '/v2/admin/config/landing-page' }],
  },
  badgeConfig: {
    title: 'Badge Configuration',
    description: 'Review custom badge definitions and award configuration.',
    icon: BadgeCheck,
    tableTitle: 'Badges',
    endpoints: [{ label: 'Badges', path: '/v2/admin/gamification/badges' }],
  },
  resourcesEditor: {
    title: 'Resource Editor',
    description: 'Review resource article data for create and edit workflows.',
    icon: FileText,
    tableTitle: 'Resources',
    endpoints: [{ label: 'Resources', path: '/v2/admin/resources?limit=50' }],
  },
  resourceCategories: {
    title: 'Resource Categories',
    description: 'Review knowledge base category coverage.',
    icon: Layers3,
    endpoints: [
      { label: 'Resources', path: '/v2/admin/resources?limit=50' },
      { label: 'Categories', path: '/v2/admin/resources/categories' },
    ],
  },
  pilotInquiries: {
    title: 'Pilot Inquiries',
    description: 'Review pilot region inquiry funnel and follow-up state.',
    icon: Building2,
    tableTitle: 'Inquiries',
    endpoints: [
      { label: 'Inquiries', path: '/v2/admin/pilot-inquiries' },
      { label: 'Stats', path: '/v2/admin/pilot-inquiries/stats' },
    ],
  },
  provisioningRequests: {
    title: 'Provisioning Requests',
    description: 'Review self-service tenant provisioning requests.',
    icon: PackageCheck,
    tableTitle: 'Requests',
    endpoints: [{ label: 'Provisioning Requests', path: '/v2/admin/provisioning-requests' }],
  },
  help: {
    title: 'Admin Help Centre',
    description: 'Review admin help content and FAQ coverage.',
    icon: HelpCircle,
    tableTitle: 'FAQs',
    endpoints: [
      { label: 'FAQs', path: '/v2/admin/help/faqs' },
      { label: 'Resources', path: '/v2/admin/resources?limit=25' },
    ],
  },
} satisfies Record<string, PageConfig>;

export function AdvertisingCampaignsPage() { return <V1AdminParityPage config={configs.advertisingCampaigns} />; }
export function PushCampaignsPage() { return <V1AdminParityPage config={configs.pushCampaigns} />; }
export function AgentsAdminPage() { return <AgentsAdminParityPage />; }
export function AgentProposalsPage() { return <AgentProposalsParityPage />; }
export function AgentRunsPage() { return <AgentRunsParityPage />; }
export function KiAgentAdminPage() { return <KiAgentAdminParityPage />; }
export function BillingPage() { return <BillingParityPage />; }
export function BillingPlansPage() { return <BillingPlansParityPage />; }
export function InvoiceHistoryPage() { return <InvoiceHistoryParityPage />; }
export function CheckoutReturnPage() { return <CheckoutReturnParityPage />; }
export function RevenueDashboardPage() { return <RevenueDashboardParityPage />; }
export function BillingControlPage() { return <BillingControlParityPage />; }
export function MemberPremiumAdminPage() { return <V1AdminParityPage config={configs.memberPremium} />; }
export function MemberPremiumSubscribersPage() { return <V1AdminParityPage config={configs.memberPremiumSubscribers} />; }
export function MarketplaceAdminPage() { return <MarketplaceParityPage />; }
export function MarketplaceModerationPage() { return <MarketplaceModerationParityPage />; }
export function MarketplaceSellerAdminPage() { return <MarketplaceSellerParityPage />; }
export function AdminCouponsPage() { return <MarketplaceCouponsParityPage />; }
export function EnterpriseFeatureFlagsPage() { return <V1AdminParityPage config={configs.enterpriseFeatures} />; }
export function FadpAdminPage() { return <V1AdminParityPage config={configs.fadp} />; }
export function GdprRequestDetailPage() { return <V1AdminParityPage config={configs.gdprRequestDetail} />; }
export function GdprRequestCreatePage() { return <V1AdminParityPage config={configs.gdprRequestCreate} />; }
export function GdprConsentTypesPage() { return <V1AdminParityPage config={configs.gdprConsentTypes} />; }
export function GdprBreachDetailPage() { return <V1AdminParityPage config={configs.gdprBreachDetail} />; }
export function LogFilesPage() { return <V1AdminParityPage config={configs.logFiles} />; }
export function LogFileViewerPage() { return <V1AdminParityPage config={configs.logFileViewer} />; }
export function SystemRequirementsPage() { return <V1AdminParityPage config={configs.systemRequirements} />; }
export function FederationExternalPartnersPage() { return <V1AdminParityPage config={configs.federationExternalPartners} />; }
export function FederationWebhooksPage() { return <V1AdminParityPage config={configs.federationWebhooks} />; }
export function FederationApiDocsPage() { return <FederationApiDocsParityPage />; }
export function FederationActivityPage() { return <FederationActivityParityPage />; }
export function FederationCreditCommonsPage() { return <V1AdminParityPage config={configs.federationCreditCommons} />; }
export function FederationAggregatesPage() { return <FederationAggregatesParityPage />; }
export function VolunteerExpensesPage() { return <VolunteerExpensesParityPage />; }
export function VolunteerTrainingPage() { return <VolunteerTrainingParityPage />; }
export function VolunteerSafeguardingPage() { return <VolunteerSafeguardingParityPage />; }
export function VolunteerHoursAuditPage() { return <VolunteerHoursAuditParityPage />; }
export function VolunteerGivingDaysPage() { return <VolunteerGivingDaysParityPage />; }
export function VolunteerConsentsPage() { return <VolunteerConsentsParityPage />; }
export function VolunteerProjectsPage() { return <VolunteerProjectsParityPage />; }
export function VolunteerConfigPage() { return <VolunteerConfigParityPage />; }
export function JobModerationQueuePage() { return <JobModerationQueueParityPage />; }
export function JobBiasAuditPage() { return <JobBiasAuditParityPage />; }
export function JobPipelineOverviewPage() { return <JobPipelineOverviewParityPage />; }
export function JobTemplatesAdminPage() { return <JobTemplatesAdminParityPage />; }
export function RegionalAnalyticsPage() { return <V1AdminParityPage config={configs.regionalAnalytics} />; }
export function RegionalAnalyticsAdminPage() { return <V1AdminParityPage config={configs.regionalAnalyticsSubscriptions} />; }
export function NationalKissDashboardPage() { return <V1AdminParityPage config={configs.nationalKiss} />; }
export function ApiPartnersAdminPage() { return <ApiPartnersAdminParityPage />; }
export function SafeguardingOptionsAdminPage() { return <V1AdminParityPage config={configs.safeguardingOptions} />; }
export function TranslationConfigPage() { return <V1AdminParityPage config={configs.translationConfig} />; }
export function ModuleConfigurationPage() { return <V1AdminParityPage config={configs.moduleConfiguration} />; }
export function OnboardingSettingsPage() { return <V1AdminParityPage config={configs.onboardingSettings} />; }
export function LandingPageBuilderPage() { return <V1AdminParityPage config={configs.landingPage} />; }
export function BadgeConfigurationPage() { return <V1AdminParityPage config={configs.badgeConfig} />; }
export function ResourceEditorPage() { return <V1AdminParityPage config={configs.resourcesEditor} />; }
export function ResourceCategoriesPage() { return <V1AdminParityPage config={configs.resourceCategories} />; }
export function PilotInquiryAdminPage() { return <V1AdminParityPage config={configs.pilotInquiries} />; }
export function ProvisioningRequestsPage() { return <ProvisioningRequestsParityPage />; }
export function AdminHelpCenterPage() { return <AdminHelpCenterParityPage />; }
