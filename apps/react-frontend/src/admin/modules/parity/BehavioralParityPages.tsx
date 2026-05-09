// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Behavioral V1 admin parity pages.
 * Domain-specific replacements for the highest-value generic parity screens.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, CardBody, CardHeader, Chip, Spinner } from '@heroui/react';
import {
  Activity,
  AlertCircle,
  BadgeCheck,
  Bot,
  CalendarClock,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  GraduationCap,
  KeyRound,
  ListChecks,
  Network,
  Play,
  Power,
  ReceiptText,
  RefreshCw,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Trash2,
  Users,
  WalletCards,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { useToast } from '@/contexts';
import { api, API_BASE, tokenManager, type ApiResponse } from '@/lib/api';
import { adminPlans, adminVolunteering } from '../../api/adminApi';
import { DataTable, EmptyState, PageHeader, StatCard, StatusBadge, type Column } from '../../components';

type JsonRecord = Record<string, unknown>;
type TableRow = JsonRecord & { __rowKey: string };
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type StatColor = 'primary' | 'success' | 'warning' | 'danger' | 'secondary' | 'default';
type ActionColor = 'primary' | 'success' | 'warning' | 'danger' | 'secondary' | 'default';

interface DataSourceConfig {
  key: string;
  label: string;
  path: string;
  rowKeys?: string[];
  fetcher?: () => Promise<ApiResponse<unknown>>;
}

interface LoadedSource {
  key: string;
  label: string;
  path: string;
  success: boolean;
  data?: unknown;
  error?: string;
}

interface LinkConfig {
  label: string;
  to: string;
  icon: LucideIcon;
}

interface PageDataState {
  source: (key: string) => LoadedSource | undefined;
  record: (key: string) => JsonRecord | null;
  rows: (key: string, rowKeys?: string[]) => TableRow[];
  count: (key: string, rowKeys?: string[]) => number;
  errors: LoadedSource[];
}

interface StatConfig {
  label: string;
  icon: LucideIcon;
  color: StatColor;
  value: (state: PageDataState) => string | number;
  description?: (state: PageDataState) => string | undefined;
}

interface RowActionConfig {
  label: string;
  icon: LucideIcon;
  color: ActionColor;
  method?: HttpMethod;
  endpoint: (row: TableRow) => string | null;
  body?: (row: TableRow) => unknown;
  isVisible?: (row: TableRow) => boolean;
  successMessage: string;
}

interface GlobalActionConfig {
  label: string;
  icon: LucideIcon;
  color: ActionColor;
  method?: HttpMethod;
  endpoint: string | ((state: PageDataState) => string | null);
  body?: (state: PageDataState) => unknown;
  successMessage: string;
  openUrl?: boolean;
}

interface SectionConfig {
  title: string;
  sourceKey: string;
  rowKeys?: string[];
  icon: LucideIcon;
  emptyTitle: string;
  emptyDescription: string;
  columns: Column<TableRow>[];
  actions?: RowActionConfig[];
}

interface BehavioralPageConfig {
  title: string;
  description: string;
  icon: LucideIcon;
  sources: DataSourceConfig[];
  stats: StatConfig[];
  sections: SectionConfig[];
  links?: LinkConfig[];
  actions?: GlobalActionConfig[];
}

const defaultRowKeys = [
  'items',
  'data',
  'results',
  'records',
  'requests',
  'agents',
  'proposals',
  'runs',
  'partners',
  'invoices',
  'plans',
  'subscriptions',
  'listings',
  'reports',
  'sellers',
  'coupons',
  'expenses',
  'policies',
  'hours',
  'training',
  'custom_fields',
  'webhooks',
  'activity',
  'applications',
];

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
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

async function fetchDirectAdminEndpoint<T>(
  method: HttpMethod,
  endpoint: string,
  body?: unknown
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = tokenManager.getAccessToken();
  const tenantId = tokenManager.getTenantId();

  if (token) headers.Authorization = `Bearer ${token}`;
  if (tenantId) headers['X-Tenant-ID'] = tenantId;
  if (body !== undefined && method !== 'GET') headers['Content-Type'] = 'application/json';

  try {
    const response = await fetch(getDirectV2Url(endpoint), {
      method,
      headers,
      credentials: 'include',
      body: body === undefined || method === 'GET' ? undefined : JSON.stringify(body),
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

async function requestAdminEndpoint<T = unknown>(
  method: HttpMethod,
  endpoint: string,
  body?: unknown
): Promise<ApiResponse<T>> {
  let normalized: ApiResponse<T>;
  switch (method) {
    case 'POST':
      normalized = await api.post<T>(endpoint, body);
      break;
    case 'PUT':
      normalized = await api.put<T>(endpoint, body);
      break;
    case 'PATCH':
      normalized = await api.patch<T>(endpoint, body);
      break;
    case 'DELETE':
      normalized = await api.delete<T>(endpoint);
      break;
    default:
      normalized = await api.get<T>(endpoint);
      break;
  }

  if (normalized.success || !endpoint.startsWith('/v2/')) {
    return normalized;
  }

  return fetchDirectAdminEndpoint<T>(method, endpoint, body);
}

async function loadSource(source: DataSourceConfig): Promise<LoadedSource> {
  const helperResponse = source.fetcher ? await source.fetcher() : undefined;
  const response = helperResponse?.success
    ? helperResponse
    : await requestAdminEndpoint('GET', source.path);

  return {
    key: source.key,
    label: source.label,
    path: source.path,
    success: response.success,
    data: response.data,
    error: response.error ?? response.message,
  };
}

function unwrapData(value: unknown): unknown {
  if (isRecord(value) && 'data' in value && Object.keys(value).every((key) => ['data', 'meta', 'pagination', 'message'].includes(key))) {
    return value.data;
  }
  return value;
}

function readPath(record: JsonRecord | null | undefined, path: string): unknown {
  if (!record) return undefined;
  return path.split('.').reduce<unknown>((current, segment) => {
    if (!isRecord(current)) return undefined;
    return current[segment];
  }, record);
}

function firstValue(record: JsonRecord, keys: string[]): unknown {
  for (const key of keys) {
    const value = readPath(record, key);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

function toTableRows(rows: unknown[]): TableRow[] {
  return rows.filter(isRecord).map((row, index) => ({
    ...row,
    __rowKey: String(firstValue(row, ['id', 'slug', 'key', 'email', 'code', 'invoice_number', 'number']) ?? index),
  }));
}

function extractRows(data: unknown, rowKeys: string[] = []): TableRow[] {
  const payload = unwrapData(data);
  if (Array.isArray(payload)) return toTableRows(payload);

  if (isRecord(payload)) {
    for (const key of [...rowKeys, ...defaultRowKeys]) {
      const value = unwrapData(payload[key]);
      if (Array.isArray(value)) return toTableRows(value);
    }
  }

  return [];
}

function asRecord(data: unknown): JsonRecord | null {
  const payload = unwrapData(data);
  return isRecord(payload) ? payload : null;
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '--';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(2);
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return formatDate(value);
    return value.length > 80 ? `${value.slice(0, 77)}...` : value;
  }
  if (Array.isArray(value)) return `${value.length} items`;
  if (isRecord(value)) {
    const label = firstValue(value, ['name', 'title', 'email', 'slug', 'code']);
    return typeof label === 'string' ? label : `${Object.keys(value).length} fields`;
  }
  return String(value);
}

function formatDate(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) return '--';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function formatMoney(value: unknown): string {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) return '--';
  return `EUR ${number.toFixed(2)}`;
}

function numericValue(row: JsonRecord, keys: string[]): number | null {
  const value = firstValue(row, keys);
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function countWhere(rows: TableRow[], predicate: (row: TableRow) => boolean): number {
  return rows.reduce((count, row) => count + (predicate(row) ? 1 : 0), 0);
}

function sumRows(rows: TableRow[], keys: string[]): number {
  return rows.reduce((total, row) => total + (numericValue(row, keys) ?? 0), 0);
}

function rowId(row: TableRow): string | null {
  const value = firstValue(row, ['id', 'Id', 'partner_id', 'profile_id']);
  return value === undefined ? null : String(value);
}

function endpointWithId(row: TableRow, template: string): string | null {
  const id = rowId(row);
  return id ? template.replace(':id', encodeURIComponent(id)) : null;
}

function statusValue(row: JsonRecord, keys: string[] = ['status', 'state', 'moderation_status']): string {
  const value = firstValue(row, keys);
  return typeof value === 'string' && value.length > 0 ? value : 'unknown';
}

function isTruthyStatus(row: JsonRecord, keys: string[]): boolean {
  const value = firstValue(row, keys);
  return value === true || value === 1 || value === 'true' || value === 'active' || value === 'enabled' || value === 'verified';
}

function makeState(sources: LoadedSource[]): PageDataState {
  return {
    source: (key) => sources.find((source) => source.key === key),
    record: (key) => asRecord(sources.find((source) => source.key === key)?.data),
    rows: (key, rowKeys) => extractRows(sources.find((source) => source.key === key)?.data, rowKeys),
    count: (key, rowKeys) => extractRows(sources.find((source) => source.key === key)?.data, rowKeys).length,
    errors: sources.filter((source) => !source.success),
  };
}

function textColumn(keys: string[], label: string): Column<TableRow> {
  return {
    key: keys[0],
    label,
    sortable: true,
    render: (item) => <span className="text-sm text-default-700">{displayValue(firstValue(item, keys))}</span>,
  };
}

function titleColumn(keys: string[], label: string): Column<TableRow> {
  return {
    key: keys[0],
    label,
    sortable: true,
    render: (item) => (
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{displayValue(firstValue(item, keys))}</p>
        <p className="truncate text-xs text-default-400">{displayValue(firstValue(item, ['slug', 'code', 'key', 'email']))}</p>
      </div>
    ),
  };
}

function userColumn(label = 'Member'): Column<TableRow> {
  return {
    key: 'user',
    label,
    sortable: true,
    render: (item) => {
      const first = firstValue(item, ['user.first_name', 'first_name', 'member_first_name']);
      const last = firstValue(item, ['user.last_name', 'last_name', 'member_last_name']);
      const full = firstValue(item, ['user.full_name', 'user.name', 'member_name', 'claimant_name', 'volunteer_name', 'seller_name']);
      const email = firstValue(item, ['user.email', 'email', 'member_email', 'seller_email']);
      const name = typeof full === 'string' ? full : [first, last].filter(Boolean).join(' ');
      return (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{name || displayValue(email)}</p>
          {email !== undefined && email !== null && email !== '' && (
            <p className="truncate text-xs text-default-400">{displayValue(email)}</p>
          )}
        </div>
      );
    },
  };
}

function statusColumn(keys: string[], label = 'Status'): Column<TableRow> {
  return {
    key: keys[0],
    label,
    sortable: true,
    render: (item) => <StatusBadge status={statusValue(item, keys)} />,
  };
}

function booleanColumn(keys: string[], label: string, trueLabel: string, falseLabel: string): Column<TableRow> {
  return {
    key: keys[0],
    label,
    sortable: true,
    render: (item) => {
      const active = isTruthyStatus(item, keys);
      return (
        <Chip size="sm" variant="flat" color={active ? 'success' : 'default'}>
          {active ? trueLabel : falseLabel}
        </Chip>
      );
    },
  };
}

function dateColumn(keys: string[], label: string): Column<TableRow> {
  return {
    key: keys[0],
    label,
    sortable: true,
    render: (item) => <span className="text-sm text-default-500">{formatDate(firstValue(item, keys))}</span>,
  };
}

function moneyColumn(keys: string[], label: string): Column<TableRow> {
  return {
    key: keys[0],
    label,
    sortable: true,
    render: (item) => <span className="text-sm font-medium text-default-700">{formatMoney(firstValue(item, keys))}</span>,
  };
}

function countColumn(keys: string[], label: string): Column<TableRow> {
  return {
    key: keys[0],
    label,
    sortable: true,
    render: (item) => <span className="text-sm text-default-600">{displayValue(firstValue(item, keys))}</span>,
  };
}

function sourceMetric(state: PageDataState, key: string, recordKeys: string[], fallback = 0): number {
  const record = state.record(key);
  if (!record) return fallback;
  const value = firstValue(record, recordKeys);
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function sourceText(state: PageDataState, key: string, recordKeys: string[], fallback = 'Unknown'): string {
  const record = state.record(key);
  if (!record) return fallback;
  const value = firstValue(record, recordKeys);
  return value === undefined || value === null || value === '' ? fallback : displayValue(value);
}

function extractUrl(data: unknown): string | null {
  const record = asRecord(data);
  if (!record) return null;
  const value = firstValue(record, ['url', 'portal_url', 'checkout_url', 'redirect_url']);
  return typeof value === 'string' && value.startsWith('http') ? value : null;
}

function ApiSources({ sources }: { sources: LoadedSource[] }) {
  return (
    <Card shadow="sm" className="mt-6">
      <CardHeader>
        <h2 className="text-base font-semibold text-foreground">Live API Sources</h2>
      </CardHeader>
      <CardBody className="pt-0">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {sources.map((source) => {
            const rows = extractRows(source.data);
            return (
              <div key={source.key} className="flex items-start justify-between gap-3 rounded-lg border border-default-200 p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{source.label}</p>
                  <p className="truncate text-xs text-default-400">{source.path}</p>
                  {!source.success && (
                    <p className="mt-1 text-xs text-danger">{source.error ?? 'API request failed'}</p>
                  )}
                </div>
                <Chip size="sm" variant="flat" color={source.success ? 'success' : 'danger'}>
                  {source.success ? `${rows.length} rows` : 'Error'}
                </Chip>
              </div>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}

function ErrorBanner({ errors }: { errors: LoadedSource[] }) {
  if (errors.length === 0) return null;
  return (
    <Card shadow="sm" className="mb-6 border border-danger/30 bg-danger/5">
      <CardBody className="flex flex-row items-start gap-3">
        <AlertCircle size={20} className="mt-0.5 shrink-0 text-danger" />
        <div>
          <p className="text-sm font-semibold text-danger">Some live admin API sources did not load.</p>
          <p className="mt-1 text-sm text-default-600">
            {errors.map((error) => `${error.label}: ${error.error ?? 'Request failed'}`).join(' | ')}
          </p>
        </div>
      </CardBody>
    </Card>
  );
}

function BehavioralParityPage({ config }: { config: BehavioralPageConfig }) {
  usePageTitle(`Admin - ${config.title}`);
  const toast = useToast();
  const [sources, setSources] = useState<LoadedSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const next = await Promise.all(config.sources.map(loadSource));
    setSources(next);
    setLoading(false);
  }, [config.sources]);

  useEffect(() => {
    void load();
  }, [load]);

  const state = useMemo(() => makeState(sources), [sources]);

  const runGlobalAction = useCallback(async (action: GlobalActionConfig) => {
    const endpoint = typeof action.endpoint === 'function' ? action.endpoint(state) : action.endpoint;
    if (!endpoint) {
      toast.error('Action unavailable');
      return;
    }

    setBusyAction(action.label);
    const response = await requestAdminEndpoint(action.method ?? 'POST', endpoint, action.body?.(state));
    setBusyAction(null);

    if (!response.success) {
      toast.error(response.error ?? `${action.label} failed`);
      return;
    }

    if (action.openUrl) {
      const url = extractUrl(response.data);
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
    }

    toast.success(action.successMessage);
    await load();
  }, [load, state, toast]);

  const runRowAction = useCallback(async (action: RowActionConfig, row: TableRow) => {
    const endpoint = action.endpoint(row);
    if (!endpoint) {
      toast.error('Action unavailable for this record');
      return;
    }

    const key = `${action.label}-${row.__rowKey}`;
    setBusyAction(key);
    const response = await requestAdminEndpoint(action.method ?? 'POST', endpoint, action.body?.(row));
    setBusyAction(null);

    if (!response.success) {
      toast.error(response.error ?? `${action.label} failed`);
      return;
    }

    toast.success(action.successMessage);
    await load();
  }, [load, toast]);

  const buildColumns = useCallback((section: SectionConfig): Column<TableRow>[] => {
    if (!section.actions || section.actions.length === 0) return section.columns;

    return [
      ...section.columns,
      {
        key: 'actions',
        label: 'Actions',
        render: (item) => (
          <div className="flex flex-wrap gap-1">
            {section.actions?.filter((action) => !action.isVisible || action.isVisible(item)).map((action) => {
              const Icon = action.icon;
              const key = `${action.label}-${item.__rowKey}`;
              return (
                <Button
                  key={action.label}
                  isIconOnly
                  size="sm"
                  variant="flat"
                  color={action.color}
                  title={action.label}
                  aria-label={action.label}
                  isLoading={busyAction === key}
                  onPress={() => void runRowAction(action, item)}
                >
                  <Icon size={14} />
                </Button>
              );
            })}
          </div>
        ),
      },
    ];
  }, [busyAction, runRowAction]);

  const HeaderIcon = config.icon;

  return (
    <div>
      <PageHeader
        title={config.title}
        description={config.description}
        actions={
          <>
            {config.actions?.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.label}
                  variant="flat"
                  color={action.color}
                  startContent={<Icon size={16} />}
                  onPress={() => void runGlobalAction(action)}
                  isLoading={busyAction === action.label}
                >
                  {action.label}
                </Button>
              );
            })}
            <Button
              variant="flat"
              startContent={<RefreshCw size={16} />}
              onPress={load}
              isLoading={loading}
            >
              Refresh
            </Button>
          </>
        }
      />

      {config.links && config.links.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {config.links.map((link) => {
            const LinkIcon = link.icon;
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

      <ErrorBanner errors={state.errors} />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {config.stats.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value(state)}
            icon={stat.icon}
            color={stat.color}
            description={stat.description?.(state)}
            loading={loading}
          />
        ))}
      </div>

      {loading && sources.length === 0 ? (
        <Card shadow="sm">
          <CardBody className="flex h-64 items-center justify-center">
            <Spinner size="lg" />
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-8">
          {config.sections.map((section) => {
            const rows = state.rows(section.sourceKey, section.rowKeys);
            const SectionIcon = section.icon;
            return (
              <section key={section.title}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <SectionIcon size={18} className="text-default-500" />
                    <h2 className="truncate text-lg font-semibold text-foreground">{section.title}</h2>
                  </div>
                  <Chip size="sm" variant="flat">{rows.length.toLocaleString()} records</Chip>
                </div>
                {rows.length === 0 ? (
                  <EmptyState
                    icon={HeaderIcon}
                    title={section.emptyTitle}
                    description={section.emptyDescription}
                  />
                ) : (
                  <DataTable
                    columns={buildColumns(section)}
                    data={rows}
                    keyField="__rowKey"
                    isLoading={loading}
                    onRefresh={load}
                    searchPlaceholder={`Search ${section.title.toLowerCase()}...`}
                  />
                )}
              </section>
            );
          })}
        </div>
      )}

      <ApiSources sources={sources} />
    </div>
  );
}

const plansFetcher = async (): Promise<ApiResponse<unknown>> => adminPlans.list() as Promise<ApiResponse<unknown>>;
const subscriptionsFetcher = async (): Promise<ApiResponse<unknown>> => adminPlans.getSubscriptions() as Promise<ApiResponse<unknown>>;
const volunteeringOverviewFetcher = async (): Promise<ApiResponse<unknown>> => adminVolunteering.getOverview() as Promise<ApiResponse<unknown>>;

const invoiceColumns = [
  titleColumn(['number', 'invoice_number', 'id'], 'Invoice'),
  statusColumn(['status', 'payment_status']),
  moneyColumn(['amount_due', 'total', 'amount', 'amount_paid'], 'Amount'),
  dateColumn(['created_at', 'created', 'issued_at'], 'Issued'),
  dateColumn(['due_date', 'period_end'], 'Due'),
];

const planColumns = [
  titleColumn(['name', 'plan_name', 'slug'], 'Plan'),
  countColumn(['tier_level', 'tier'], 'Tier'),
  moneyColumn(['price_monthly', 'monthly_price', 'monthly_amount'], 'Monthly'),
  moneyColumn(['price_yearly', 'yearly_price', 'annual_amount'], 'Annual'),
  booleanColumn(['is_active', 'active', 'enabled'], 'Active', 'Active', 'Inactive'),
];

const billingSources: DataSourceConfig[] = [
  { key: 'subscription', label: 'Current subscription', path: '/v2/admin/billing/subscription' },
  { key: 'invoices', label: 'Invoices', path: '/v2/admin/billing/invoices', rowKeys: ['invoices'] },
  { key: 'plans', label: 'Plans', path: '/v2/admin/plans', rowKeys: ['plans'], fetcher: plansFetcher },
  { key: 'subscriptions', label: 'Subscriptions', path: '/v2/admin/subscriptions', rowKeys: ['subscriptions'], fetcher: subscriptionsFetcher },
];

const billingStats: StatConfig[] = [
  {
    label: 'Current Plan',
    icon: CreditCard,
    color: 'primary',
    value: (state) => sourceText(state, 'subscription', ['plan_name', 'plan.name', 'tier', 'name'], 'Not set'),
  },
  {
    label: 'Subscription Status',
    icon: BadgeCheck,
    color: 'success',
    value: (state) => sourceText(state, 'subscription', ['status', 'state'], 'Unknown'),
  },
  {
    label: 'Open Invoices',
    icon: ReceiptText,
    color: 'warning',
    value: (state) => countWhere(state.rows('invoices'), (row) => ['open', 'pending', 'unpaid', 'past_due', 'failed'].includes(statusValue(row, ['status', 'payment_status']).toLowerCase())),
  },
  {
    label: 'Plan Options',
    icon: WalletCards,
    color: 'secondary',
    value: (state) => state.count('plans'),
  },
];

const billingLinks: LinkConfig[] = [
  { label: 'Plans', to: '/admin/billing/plans', icon: WalletCards },
  { label: 'Invoices', to: '/admin/billing/invoices', icon: ReceiptText },
  { label: 'Revenue', to: '/admin/billing/revenue', icon: Activity },
];

const billingActions: GlobalActionConfig[] = [
  {
    label: 'Billing Portal',
    icon: CreditCard,
    color: 'primary',
    endpoint: '/v2/admin/billing/portal',
    successMessage: 'Billing portal requested',
    openUrl: true,
  },
  {
    label: 'Upgrade Request',
    icon: Sparkles,
    color: 'secondary',
    endpoint: '/v2/admin/billing/upgrade-request',
    successMessage: 'Upgrade request submitted',
  },
];

const billingConfig: BehavioralPageConfig = {
  title: 'Billing',
  description: 'Subscription state, invoice follow-up, and plan controls for the current tenant.',
  icon: CreditCard,
  sources: billingSources,
  links: billingLinks,
  actions: billingActions,
  stats: billingStats,
  sections: [
    {
      title: 'Recent invoices',
      sourceKey: 'invoices',
      rowKeys: ['invoices'],
      icon: ReceiptText,
      emptyTitle: 'No invoices returned',
      emptyDescription: 'The live billing API loaded successfully but did not return invoice records.',
      columns: invoiceColumns,
    },
    {
      title: 'Available plans',
      sourceKey: 'plans',
      rowKeys: ['plans'],
      icon: WalletCards,
      emptyTitle: 'No plans returned',
      emptyDescription: 'The live plans API loaded successfully but did not return plan records.',
      columns: planColumns,
    },
  ],
};

const invoiceHistoryConfig: BehavioralPageConfig = {
  ...billingConfig,
  title: 'Invoices',
  description: 'Invoice history, payment status, due dates, and billing source health.',
  icon: ReceiptText,
  actions: undefined,
  sections: [
    {
      title: 'Invoice history',
      sourceKey: 'invoices',
      rowKeys: ['invoices'],
      icon: ReceiptText,
      emptyTitle: 'No invoice history',
      emptyDescription: 'The live billing API is reachable but has no invoices for this tenant yet.',
      columns: invoiceColumns,
    },
  ],
};

const billingPlansConfig: BehavioralPageConfig = {
  ...billingConfig,
  title: 'Billing Plans',
  description: 'Billing plan catalogue with tenant subscription context.',
  icon: WalletCards,
  actions: undefined,
  sections: [
    {
      title: 'Billing plans',
      sourceKey: 'plans',
      rowKeys: ['plans'],
      icon: WalletCards,
      emptyTitle: 'No billing plans',
      emptyDescription: 'No billing plans were returned from the live admin API.',
      columns: planColumns,
    },
    {
      title: 'Tenant subscriptions',
      sourceKey: 'subscriptions',
      rowKeys: ['subscriptions'],
      icon: Users,
      emptyTitle: 'No tenant subscriptions',
      emptyDescription: 'The subscription list is currently empty.',
      columns: [
        titleColumn(['tenant_name', 'name', 'plan_name'], 'Tenant / Plan'),
        statusColumn(['status', 'state']),
        dateColumn(['current_period_end', 'expires_at', 'updated_at'], 'Period Ends'),
        moneyColumn(['amount', 'price_monthly', 'monthly_amount'], 'Amount'),
      ],
    },
  ],
};

const checkoutReturnConfig: BehavioralPageConfig = {
  ...billingConfig,
  title: 'Checkout Return',
  description: 'Post-checkout subscription verification using live billing records.',
  icon: CheckCircle2,
  actions: undefined,
};

const revenueConfig: BehavioralPageConfig = {
  title: 'Revenue Dashboard',
  description: 'Revenue snapshot, billing totals, and recent invoice flow.',
  icon: Activity,
  sources: [
    { key: 'revenue', label: 'Revenue', path: '/v2/admin/super/billing/revenue' },
    { key: 'snapshot', label: 'Snapshot', path: '/v2/admin/super/billing/snapshot' },
    { key: 'invoices', label: 'Invoices', path: '/v2/admin/billing/invoices', rowKeys: ['invoices'] },
  ],
  stats: [
    {
      label: 'Revenue',
      icon: Activity,
      color: 'success',
      value: (state) => formatMoney(sourceMetric(state, 'revenue', ['revenue', 'total_revenue', 'mrr', 'monthly_recurring_revenue'], sumRows(state.rows('invoices'), ['amount_paid', 'total', 'amount']))),
    },
    {
      label: 'Active Subscriptions',
      icon: Users,
      color: 'primary',
      value: (state) => sourceMetric(state, 'snapshot', ['active_subscriptions', 'subscriptions', 'active'], 0),
    },
    {
      label: 'Invoice Count',
      icon: ReceiptText,
      color: 'secondary',
      value: (state) => state.count('invoices'),
    },
    {
      label: 'Open Errors',
      icon: AlertCircle,
      color: 'danger',
      value: (state) => state.errors.length,
    },
  ],
  sections: [
    {
      title: 'Recent invoices',
      sourceKey: 'invoices',
      rowKeys: ['invoices'],
      icon: ReceiptText,
      emptyTitle: 'No invoice rows',
      emptyDescription: 'Revenue sources loaded but invoice detail rows were not returned.',
      columns: invoiceColumns,
    },
  ],
};

const billingControlConfig: BehavioralPageConfig = {
  ...revenueConfig,
  title: 'Billing Control',
  description: 'Super-admin billing control surface with revenue and pause/resume hooks.',
  actions: [
    {
      label: 'Pause Billing',
      icon: Power,
      color: 'warning',
      endpoint: '/v2/admin/super/billing/pause',
      successMessage: 'Billing pause request sent',
    },
    {
      label: 'Resume Billing',
      icon: Play,
      color: 'success',
      endpoint: '/v2/admin/super/billing/resume',
      successMessage: 'Billing resume request sent',
    },
  ],
};

const listingActions: RowActionConfig[] = [
  {
    label: 'Approve listing',
    icon: CheckCircle2,
    color: 'success',
    endpoint: (row) => endpointWithId(row, '/v2/admin/marketplace/listings/:id/approve'),
    successMessage: 'Marketplace listing approved',
  },
  {
    label: 'Reject listing',
    icon: XCircle,
    color: 'danger',
    endpoint: (row) => endpointWithId(row, '/v2/admin/marketplace/listings/:id/reject'),
    body: () => ({ notes: 'Rejected from embedded admin moderation.' }),
    successMessage: 'Marketplace listing rejected',
  },
];

const reportActions: RowActionConfig[] = [
  {
    label: 'Acknowledge report',
    icon: CheckCircle2,
    color: 'primary',
    endpoint: (row) => endpointWithId(row, '/v2/admin/marketplace/reports/:id/acknowledge'),
    successMessage: 'Marketplace report acknowledged',
  },
  {
    label: 'Resolve report',
    icon: ShieldCheck,
    color: 'success',
    method: 'PUT',
    endpoint: (row) => endpointWithId(row, '/v2/admin/marketplace/reports/:id/resolve'),
    body: () => ({ notes: 'Resolved from embedded admin moderation.' }),
    successMessage: 'Marketplace report resolved',
  },
];

const sellerActions: RowActionConfig[] = [
  {
    label: 'Verify seller',
    icon: BadgeCheck,
    color: 'success',
    endpoint: (row) => endpointWithId(row, '/v2/admin/marketplace/sellers/:id/verify'),
    successMessage: 'Seller verified',
  },
  {
    label: 'Suspend seller',
    icon: Power,
    color: 'danger',
    endpoint: (row) => endpointWithId(row, '/v2/admin/marketplace/sellers/:id/suspend'),
    body: () => ({ notes: 'Suspended from embedded seller review.' }),
    successMessage: 'Seller suspended',
  },
];

const couponActions: RowActionConfig[] = [
  {
    label: 'Suspend coupon',
    icon: Power,
    color: 'warning',
    endpoint: (row) => endpointWithId(row, '/v2/admin/marketplace/coupons/:id/suspend'),
    successMessage: 'Coupon suspended',
  },
  {
    label: 'Delete coupon',
    icon: Trash2,
    color: 'danger',
    method: 'DELETE',
    endpoint: (row) => endpointWithId(row, '/v2/admin/marketplace/coupons/:id'),
    successMessage: 'Coupon deleted',
  },
];

const marketplaceSources: DataSourceConfig[] = [
  { key: 'dashboard', label: 'Dashboard', path: '/v2/admin/marketplace/dashboard' },
  { key: 'listings', label: 'Listings', path: '/v2/admin/marketplace/listings?limit=25', rowKeys: ['listings'] },
  { key: 'pendingListings', label: 'Pending listings', path: '/v2/admin/marketplace/listings?moderation_status=pending&limit=50', rowKeys: ['listings'] },
  { key: 'reports', label: 'Reports', path: '/v2/admin/marketplace/reports', rowKeys: ['reports'] },
  { key: 'sellers', label: 'Sellers', path: '/v2/admin/marketplace/sellers', rowKeys: ['sellers'] },
  { key: 'coupons', label: 'Coupons', path: '/v2/admin/marketplace/coupons', rowKeys: ['coupons'] },
  { key: 'transparency', label: 'Transparency', path: '/v2/admin/marketplace/transparency' },
];

const marketplaceStats: StatConfig[] = [
  {
    label: 'Listings',
    icon: ShoppingBag,
    color: 'primary',
    value: (state) => sourceMetric(state, 'dashboard', ['listings'], state.count('listings')),
  },
  {
    label: 'Pending',
    icon: ShieldCheck,
    color: 'warning',
    value: (state) => sourceMetric(state, 'dashboard', ['pending'], state.count('pendingListings')),
  },
  {
    label: 'Sellers',
    icon: Users,
    color: 'success',
    value: (state) => sourceMetric(state, 'dashboard', ['sellers'], state.count('sellers')),
  },
  {
    label: 'Open Reports',
    icon: AlertCircle,
    color: 'danger',
    value: (state) => sourceMetric(state, 'dashboard', ['open_reports'], countWhere(state.rows('reports'), (row) => statusValue(row).toLowerCase() !== 'resolved')),
  },
];

const listingColumns = [
  titleColumn(['title', 'name'], 'Listing'),
  userColumn('Seller'),
  statusColumn(['moderation_status', 'status'], 'Moderation'),
  moneyColumn(['price', 'amount'], 'Price'),
  dateColumn(['created_at', 'createdAt'], 'Created'),
];

const reportColumns = [
  titleColumn(['reason', 'type', 'id'], 'Report'),
  statusColumn(['status']),
  textColumn(['marketplace_listing_id', 'listing_id'], 'Listing'),
  userColumn('Reporter'),
  dateColumn(['created_at', 'createdAt'], 'Created'),
];

const sellerColumns = [
  userColumn('Seller'),
  booleanColumn(['is_verified', 'verified'], 'Verified', 'Verified', 'Unverified'),
  booleanColumn(['is_suspended', 'suspended'], 'Suspended', 'Suspended', 'Active'),
  countColumn(['listing_count', 'listings_count', 'total_listings'], 'Listings'),
  dateColumn(['created_at', 'createdAt'], 'Joined'),
];

const couponColumns = [
  titleColumn(['code', 'title', 'name'], 'Coupon'),
  userColumn('Merchant'),
  moneyColumn(['discount_amount', 'amount', 'value'], 'Value'),
  booleanColumn(['is_active', 'active'], 'Active', 'Active', 'Inactive'),
  dateColumn(['expires_at', 'valid_until', 'created_at'], 'Expires'),
];

const marketplaceLinks: LinkConfig[] = [
  { label: 'Moderation', to: '/admin/marketplace/moderation', icon: ShieldCheck },
  { label: 'Sellers', to: '/admin/marketplace/sellers', icon: Users },
  { label: 'Coupons', to: '/admin/marketplace/coupons', icon: ReceiptText },
];

const marketplaceConfig: BehavioralPageConfig = {
  title: 'Marketplace',
  description: 'Marketplace moderation, seller trust, reports, and coupon controls.',
  icon: ShoppingBag,
  sources: marketplaceSources,
  links: marketplaceLinks,
  stats: marketplaceStats,
  sections: [
    {
      title: 'Recent listings',
      sourceKey: 'listings',
      rowKeys: ['listings'],
      icon: ShoppingBag,
      emptyTitle: 'No marketplace listings',
      emptyDescription: 'The live marketplace API returned no listing rows.',
      columns: listingColumns,
      actions: listingActions,
    },
    {
      title: 'Open reports',
      sourceKey: 'reports',
      rowKeys: ['reports'],
      icon: ListChecks,
      emptyTitle: 'No marketplace reports',
      emptyDescription: 'There are no marketplace reports in the live admin queue.',
      columns: reportColumns,
      actions: reportActions,
    },
  ],
};

const marketplaceModerationConfig: BehavioralPageConfig = {
  ...marketplaceConfig,
  title: 'Marketplace Moderation',
  description: 'Pending listing decisions and report resolution queue.',
  icon: ShieldCheck,
  sections: [
    {
      title: 'Pending listings',
      sourceKey: 'pendingListings',
      rowKeys: ['listings'],
      icon: ShieldCheck,
      emptyTitle: 'No pending listings',
      emptyDescription: 'The marketplace moderation queue is clear.',
      columns: listingColumns,
      actions: listingActions,
    },
    {
      title: 'Reports',
      sourceKey: 'reports',
      rowKeys: ['reports'],
      icon: ListChecks,
      emptyTitle: 'No reports',
      emptyDescription: 'No marketplace reports were returned by the live API.',
      columns: reportColumns,
      actions: reportActions,
    },
  ],
};

const marketplaceSellersConfig: BehavioralPageConfig = {
  ...marketplaceConfig,
  title: 'Marketplace Sellers',
  description: 'Seller verification, suspension, and marketplace trust review.',
  icon: Users,
  sections: [
    {
      title: 'Sellers',
      sourceKey: 'sellers',
      rowKeys: ['sellers'],
      icon: Users,
      emptyTitle: 'No sellers',
      emptyDescription: 'No seller profiles were returned by the marketplace API.',
      columns: sellerColumns,
      actions: sellerActions,
    },
  ],
};

const marketplaceCouponsConfig: BehavioralPageConfig = {
  ...marketplaceConfig,
  title: 'Marketplace Coupons',
  description: 'Merchant coupon status, expiry, and suspension controls.',
  icon: ReceiptText,
  sections: [
    {
      title: 'Coupons',
      sourceKey: 'coupons',
      rowKeys: ['coupons'],
      icon: ReceiptText,
      emptyTitle: 'No coupons',
      emptyDescription: 'The live marketplace API returned no coupon records.',
      columns: couponColumns,
      actions: couponActions,
    },
  ],
};

const jobModerationActions: RowActionConfig[] = [
  {
    label: 'Approve job',
    icon: CheckCircle2,
    color: 'success',
    endpoint: (row) => endpointWithId(row, '/v2/admin/jobs/:id/approve'),
    successMessage: 'Job approved',
  },
  {
    label: 'Flag job',
    icon: AlertCircle,
    color: 'warning',
    endpoint: (row) => endpointWithId(row, '/v2/admin/jobs/:id/flag'),
    body: () => ({ reason: 'Flagged from admin parity workspace' }),
    successMessage: 'Job flagged',
  },
  {
    label: 'Reject job',
    icon: XCircle,
    color: 'danger',
    endpoint: (row) => endpointWithId(row, '/v2/admin/jobs/:id/reject'),
    body: () => ({ reason: 'Rejected from admin parity workspace' }),
    successMessage: 'Job rejected',
  },
];

const jobColumns = [
  titleColumn(['title', 'name', 'role'], 'Job'),
  userColumn('Employer'),
  statusColumn(['status', 'moderation_status', 'state']),
  textColumn(['location', 'workplace_type', 'job_type'], 'Location'),
  dateColumn(['created_at', 'published_at', 'updated_at'], 'Updated'),
];

const jobModerationConfig: BehavioralPageConfig = {
  title: 'Job Moderation',
  description: 'Job approval queue, spam signals, and moderation actions.',
  icon: ShieldCheck,
  sources: [
    { key: 'queue', label: 'Moderation queue', path: '/v2/admin/jobs/moderation-queue', rowKeys: ['jobs', 'queue', 'items'] },
    { key: 'stats', label: 'Moderation stats', path: '/v2/admin/jobs/moderation-stats' },
    { key: 'spam', label: 'Spam stats', path: '/v2/admin/jobs/spam-stats' },
  ],
  stats: [
    { label: 'Queue', icon: ShieldCheck, color: 'warning', value: (state) => state.count('queue', ['jobs', 'queue', 'items']) },
    { label: 'Pending', icon: Clock, color: 'primary', value: (state) => sourceMetric(state, 'stats', ['pending', 'pending_jobs'], countWhere(state.rows('queue', ['jobs', 'queue', 'items']), (row) => ['pending', 'review'].includes(statusValue(row).toLowerCase()))) },
    { label: 'Spam Signals', icon: AlertCircle, color: 'danger', value: (state) => sourceMetric(state, 'spam', ['spam_count', 'flagged', 'total'], 0) },
    { label: 'Open Errors', icon: AlertCircle, color: 'danger', value: (state) => state.errors.length },
  ],
  sections: [
    {
      title: 'Moderation queue',
      sourceKey: 'queue',
      rowKeys: ['jobs', 'queue', 'items'],
      icon: ShieldCheck,
      emptyTitle: 'No jobs awaiting review',
      emptyDescription: 'The live jobs moderation queue is clear.',
      columns: jobColumns,
      actions: jobModerationActions,
    },
  ],
};

const jobBiasAuditConfig: BehavioralPageConfig = {
  title: 'Job Bias Audit',
  description: 'Bias audit signals, salary transparency checks, and review status.',
  icon: AlertCircle,
  sources: [
    { key: 'audit', label: 'Bias audit', path: '/v2/admin/jobs/bias-audit', rowKeys: ['jobs', 'audit', 'items'] },
  ],
  stats: [
    { label: 'Audited Jobs', icon: ListChecks, color: 'primary', value: (state) => state.count('audit', ['jobs', 'audit', 'items']) },
    { label: 'High Risk', icon: AlertCircle, color: 'danger', value: (state) => countWhere(state.rows('audit', ['jobs', 'audit', 'items']), (row) => ['high', 'critical', 'flagged'].includes(statusValue(row, ['risk_level', 'severity', 'status']).toLowerCase())) },
    { label: 'Needs Salary', icon: WalletCards, color: 'warning', value: (state) => countWhere(state.rows('audit', ['jobs', 'audit', 'items']), (row) => !firstValue(row, ['salary_min', 'salary_max', 'salary_range'])) },
    { label: 'Open Errors', icon: AlertCircle, color: 'danger', value: (state) => state.errors.length },
  ],
  sections: [
    {
      title: 'Bias audit rows',
      sourceKey: 'audit',
      rowKeys: ['jobs', 'audit', 'items'],
      icon: AlertCircle,
      emptyTitle: 'No bias audit rows',
      emptyDescription: 'No job bias audit records were returned.',
      columns: [
        titleColumn(['title', 'job_title', 'name'], 'Job'),
        statusColumn(['risk_level', 'severity', 'status'], 'Risk'),
        countColumn(['bias_score', 'score'], 'Score'),
        textColumn(['salary_range', 'salary_min', 'salary_max'], 'Salary'),
        dateColumn(['updated_at', 'created_at'], 'Updated'),
      ],
      actions: jobModerationActions,
    },
  ],
};

const jobPipelineConfig: BehavioralPageConfig = {
  title: 'Job Pipeline',
  description: 'Interview and offer pipeline state for employer workflow review.',
  icon: ListChecks,
  sources: [
    { key: 'interviews', label: 'Interviews', path: '/v2/admin/jobs/interviews', rowKeys: ['interviews', 'items'] },
    { key: 'offers', label: 'Offers', path: '/v2/admin/jobs/offers', rowKeys: ['offers', 'items'] },
  ],
  stats: [
    { label: 'Interviews', icon: CalendarClock, color: 'primary', value: (state) => state.count('interviews', ['interviews', 'items']) },
    { label: 'Offers', icon: BadgeCheck, color: 'success', value: (state) => state.count('offers', ['offers', 'items']) },
    { label: 'Pending', icon: Clock, color: 'warning', value: (state) => countWhere([...state.rows('interviews', ['interviews', 'items']), ...state.rows('offers', ['offers', 'items'])], (row) => ['pending', 'scheduled', 'sent'].includes(statusValue(row).toLowerCase())) },
    { label: 'Open Errors', icon: AlertCircle, color: 'danger', value: (state) => state.errors.length },
  ],
  sections: [
    {
      title: 'Interviews',
      sourceKey: 'interviews',
      rowKeys: ['interviews', 'items'],
      icon: CalendarClock,
      emptyTitle: 'No interviews',
      emptyDescription: 'No interview rows were returned.',
      columns: [
        titleColumn(['job_title', 'title', 'candidate_name'], 'Interview'),
        userColumn('Candidate'),
        statusColumn(['status', 'state']),
        dateColumn(['scheduled_at', 'created_at'], 'Scheduled'),
      ],
    },
    {
      title: 'Offers',
      sourceKey: 'offers',
      rowKeys: ['offers', 'items'],
      icon: BadgeCheck,
      emptyTitle: 'No offers',
      emptyDescription: 'No offer rows were returned.',
      columns: [
        titleColumn(['job_title', 'title', 'candidate_name'], 'Offer'),
        userColumn('Candidate'),
        statusColumn(['status', 'state']),
        moneyColumn(['salary', 'amount', 'offer_amount'], 'Amount'),
      ],
    },
  ],
};

const jobTemplatesConfig: BehavioralPageConfig = {
  title: 'Job Templates',
  description: 'Reusable job templates and deletion controls.',
  icon: FileText,
  sources: [
    { key: 'templates', label: 'Templates', path: '/v2/admin/jobs/templates', rowKeys: ['templates', 'items'] },
  ],
  stats: [
    { label: 'Templates', icon: FileText, color: 'primary', value: (state) => state.count('templates', ['templates', 'items']) },
    { label: 'Active', icon: CheckCircle2, color: 'success', value: (state) => countWhere(state.rows('templates', ['templates', 'items']), (row) => ['active', 'published', 'enabled'].includes(statusValue(row).toLowerCase()) || isTruthyStatus(row, ['is_active', 'active'])) },
    { label: 'Drafts', icon: Clock, color: 'warning', value: (state) => countWhere(state.rows('templates', ['templates', 'items']), (row) => ['draft', 'inactive'].includes(statusValue(row).toLowerCase())) },
    { label: 'Open Errors', icon: AlertCircle, color: 'danger', value: (state) => state.errors.length },
  ],
  sections: [
    {
      title: 'Templates',
      sourceKey: 'templates',
      rowKeys: ['templates', 'items'],
      icon: FileText,
      emptyTitle: 'No job templates',
      emptyDescription: 'No reusable job templates were returned.',
      columns: [
        titleColumn(['title', 'name'], 'Template'),
        textColumn(['category', 'job_type', 'type'], 'Type'),
        statusColumn(['status', 'state']),
        dateColumn(['updated_at', 'created_at'], 'Updated'),
      ],
      actions: [
        {
          label: 'Delete template',
          icon: Trash2,
          color: 'danger',
          method: 'DELETE',
          endpoint: (row) => endpointWithId(row, '/v2/admin/jobs/templates/:id'),
          successMessage: 'Job template deleted',
        },
      ],
    },
  ],
};

const volunteerSources: DataSourceConfig[] = [
  { key: 'overview', label: 'Volunteering overview', path: '/v2/admin/volunteering', fetcher: volunteeringOverviewFetcher },
  { key: 'expenses', label: 'Expenses', path: '/v2/admin/volunteering/expenses', rowKeys: ['expenses'] },
  { key: 'policies', label: 'Expense policies', path: '/v2/admin/volunteering/expenses/policies', rowKeys: ['policies'] },
  { key: 'hours', label: 'Hours', path: '/v2/admin/volunteering/hours', rowKeys: ['hours'] },
  { key: 'training', label: 'Training', path: '/v2/admin/volunteering/training', rowKeys: ['training'] },
  { key: 'trends', label: 'Trends', path: '/v2/admin/volunteering/trends' },
  { key: 'config', label: 'Configuration', path: '/v2/admin/config/volunteering' },
  { key: 'customFields', label: 'Custom fields', path: '/v2/admin/volunteering/custom-fields', rowKeys: ['custom_fields'] },
  { key: 'webhooks', label: 'Webhooks', path: '/v2/admin/volunteering/webhooks', rowKeys: ['webhooks'] },
  { key: 'reminderSettings', label: 'Reminder settings', path: '/v2/admin/volunteering/reminder-settings' },
];

const volunteerStats: StatConfig[] = [
  {
    label: 'Active Volunteers',
    icon: Users,
    color: 'success',
    value: (state) => sourceMetric(state, 'overview', ['stats.active_volunteers', 'active_volunteers'], 0),
  },
  {
    label: 'Hours Logged',
    icon: CalendarClock,
    color: 'primary',
    value: (state) => sourceMetric(state, 'overview', ['stats.total_hours_logged', 'total_hours_logged'], state.count('hours')),
  },
  {
    label: 'Pending Expenses',
    icon: ReceiptText,
    color: 'warning',
    value: (state) => countWhere(state.rows('expenses'), (row) => ['pending', 'submitted', 'review'].includes(statusValue(row).toLowerCase())),
  },
  {
    label: 'Training Items',
    icon: GraduationCap,
    color: 'secondary',
    value: (state) => state.count('training'),
  },
];

const expenseActions: RowActionConfig[] = [
  {
    label: 'Approve expense',
    icon: CheckCircle2,
    color: 'success',
    method: 'PUT',
    endpoint: (row) => endpointWithId(row, '/v2/admin/volunteering/expenses/:id'),
    body: () => ({ status: 'approved', review_status: 'approved' }),
    successMessage: 'Volunteer expense approved',
  },
  {
    label: 'Reject expense',
    icon: XCircle,
    color: 'danger',
    method: 'PUT',
    endpoint: (row) => endpointWithId(row, '/v2/admin/volunteering/expenses/:id'),
    body: () => ({ status: 'rejected', review_status: 'rejected' }),
    successMessage: 'Volunteer expense rejected',
  },
];

const trainingActions: RowActionConfig[] = [
  {
    label: 'Verify training',
    icon: BadgeCheck,
    color: 'success',
    method: 'PUT',
    endpoint: (row) => endpointWithId(row, '/v2/admin/volunteering/training/:id/verify'),
    successMessage: 'Training record verified',
  },
  {
    label: 'Reject training',
    icon: XCircle,
    color: 'danger',
    method: 'PUT',
    endpoint: (row) => endpointWithId(row, '/v2/admin/volunteering/training/:id/reject'),
    successMessage: 'Training record rejected',
  },
];

const hourActions: RowActionConfig[] = [
  {
    label: 'Verify hours',
    icon: CheckCircle2,
    color: 'success',
    endpoint: (row) => endpointWithId(row, '/v2/admin/volunteering/hours/:id/verify'),
    successMessage: 'Volunteer hours verified',
  },
];

const expenseColumns = [
  userColumn('Volunteer'),
  moneyColumn(['amount', 'claim_amount', 'total'], 'Amount'),
  textColumn(['category', 'expense_type', 'type'], 'Category'),
  statusColumn(['status', 'review_status']),
  dateColumn(['submitted_at', 'created_at', 'date'], 'Submitted'),
];

const trainingColumns = [
  userColumn('Volunteer'),
  titleColumn(['course_name', 'training_name', 'title', 'name'], 'Training'),
  statusColumn(['status', 'verification_status']),
  dateColumn(['completed_at', 'issued_at', 'created_at'], 'Completed'),
  dateColumn(['expires_at', 'expiry_date'], 'Expires'),
];

const hourColumns = [
  userColumn('Volunteer'),
  textColumn(['project_name', 'opportunity_title', 'title'], 'Project'),
  countColumn(['hours', 'duration_hours', 'total_hours'], 'Hours'),
  statusColumn(['status', 'verification_status']),
  dateColumn(['date', 'served_at', 'created_at'], 'Date'),
];

const configFieldColumns = [
  titleColumn(['label', 'name', 'key'], 'Field'),
  textColumn(['type', 'field_type'], 'Type'),
  booleanColumn(['is_required', 'required'], 'Required', 'Required', 'Optional'),
  booleanColumn(['is_active', 'active', 'enabled'], 'Active', 'Active', 'Inactive'),
];

const webhookColumns = [
  titleColumn(['name', 'url', 'endpoint'], 'Webhook'),
  statusColumn(['status', 'state']),
  textColumn(['event', 'event_type', 'events'], 'Event'),
  dateColumn(['last_sent_at', 'updated_at', 'created_at'], 'Last Activity'),
];

const volunteerExpensesConfig: BehavioralPageConfig = {
  title: 'Volunteer Expenses',
  description: 'Expense claims, policy source health, and approval actions.',
  icon: ReceiptText,
  sources: volunteerSources,
  stats: volunteerStats,
  sections: [
    {
      title: 'Expense claims',
      sourceKey: 'expenses',
      rowKeys: ['expenses'],
      icon: ReceiptText,
      emptyTitle: 'No expense claims',
      emptyDescription: 'The live volunteering API returned no expense claims.',
      columns: expenseColumns,
      actions: expenseActions,
    },
    {
      title: 'Expense policies',
      sourceKey: 'policies',
      rowKeys: ['policies'],
      icon: FileText,
      emptyTitle: 'No expense policies',
      emptyDescription: 'No expense policy rows were returned.',
      columns: [
        titleColumn(['name', 'title', 'key'], 'Policy'),
        moneyColumn(['limit', 'max_amount', 'amount'], 'Limit'),
        booleanColumn(['is_active', 'active', 'enabled'], 'Active', 'Active', 'Inactive'),
        dateColumn(['updated_at', 'created_at'], 'Updated'),
      ],
    },
  ],
};

const volunteerTrainingConfig: BehavioralPageConfig = {
  title: 'Volunteer Training',
  description: 'Training credentials, expiry review, and verification actions.',
  icon: GraduationCap,
  sources: volunteerSources,
  stats: volunteerStats,
  sections: [
    {
      title: 'Training records',
      sourceKey: 'training',
      rowKeys: ['training'],
      icon: GraduationCap,
      emptyTitle: 'No training records',
      emptyDescription: 'The live volunteering API returned no training credentials.',
      columns: trainingColumns,
      actions: trainingActions,
    },
  ],
};

const volunteerHoursConfig: BehavioralPageConfig = {
  title: 'Volunteer Hours',
  description: 'Volunteer hour audit queue with verification controls.',
  icon: CalendarClock,
  sources: volunteerSources,
  stats: volunteerStats,
  sections: [
    {
      title: 'Hour submissions',
      sourceKey: 'hours',
      rowKeys: ['hours'],
      icon: CalendarClock,
      emptyTitle: 'No hour submissions',
      emptyDescription: 'The live volunteering API returned no hour rows.',
      columns: hourColumns,
      actions: hourActions,
    },
  ],
};

const volunteerConfigConfig: BehavioralPageConfig = {
  title: 'Volunteering Configuration',
  description: 'Custom fields, webhook wiring, reminders, and module-level volunteering settings.',
  icon: Settings2,
  sources: volunteerSources,
  stats: [
    {
      label: 'Custom Fields',
      icon: Settings2,
      color: 'primary',
      value: (state) => state.count('customFields'),
    },
    {
      label: 'Webhooks',
      icon: Network,
      color: 'secondary',
      value: (state) => state.count('webhooks'),
    },
    {
      label: 'Reminder Status',
      icon: Clock,
      color: 'success',
      value: (state) => sourceText(state, 'reminderSettings', ['status', 'enabled', 'is_enabled'], 'Unknown'),
    },
    {
      label: 'Open Errors',
      icon: AlertCircle,
      color: 'danger',
      value: (state) => state.errors.length,
    },
  ],
  actions: [
    {
      label: 'Send Reminders',
      icon: CalendarClock,
      color: 'primary',
      endpoint: '/v2/admin/volunteering/send-shift-reminders',
      successMessage: 'Volunteer shift reminder request sent',
    },
  ],
  sections: [
    {
      title: 'Custom fields',
      sourceKey: 'customFields',
      rowKeys: ['custom_fields'],
      icon: Settings2,
      emptyTitle: 'No custom fields',
      emptyDescription: 'No volunteering custom fields were returned by the live API.',
      columns: configFieldColumns,
    },
    {
      title: 'Webhooks',
      sourceKey: 'webhooks',
      rowKeys: ['webhooks'],
      icon: Network,
      emptyTitle: 'No webhooks',
      emptyDescription: 'No volunteering webhooks were returned by the live API.',
      columns: webhookColumns,
    },
  ],
};

const agentSources: DataSourceConfig[] = [
  { key: 'agents', label: 'Agents', path: '/v2/admin/agents', rowKeys: ['agents'] },
  { key: 'proposals', label: 'Proposals', path: '/v2/admin/agents/proposals', rowKeys: ['proposals'] },
  { key: 'runs', label: 'Runs', path: '/v2/admin/agents/runs', rowKeys: ['runs'] },
];

const agentStats: StatConfig[] = [
  {
    label: 'Agents',
    icon: Bot,
    color: 'primary',
    value: (state) => state.count('agents'),
  },
  {
    label: 'Enabled',
    icon: Power,
    color: 'success',
    value: (state) => countWhere(state.rows('agents'), (row) => isTruthyStatus(row, ['is_enabled', 'enabled', 'active', 'status'])),
  },
  {
    label: 'Pending Proposals',
    icon: Sparkles,
    color: 'warning',
    value: (state) => countWhere(state.rows('proposals'), (row) => ['pending', 'draft', 'review'].includes(statusValue(row).toLowerCase())),
  },
  {
    label: 'Failed Runs',
    icon: AlertCircle,
    color: 'danger',
    value: (state) => countWhere(state.rows('runs'), (row) => ['failed', 'error'].includes(statusValue(row).toLowerCase())),
  },
];

const agentActions: RowActionConfig[] = [
  {
    label: 'Toggle agent',
    icon: Power,
    color: 'warning',
    endpoint: (row) => endpointWithId(row, '/v2/admin/agents/:id/toggle'),
    successMessage: 'Agent toggle requested',
  },
  {
    label: 'Run now',
    icon: Play,
    color: 'primary',
    endpoint: (row) => endpointWithId(row, '/v2/admin/agents/:id/run-now'),
    successMessage: 'Agent run requested',
  },
];

const proposalActions: RowActionConfig[] = [
  {
    label: 'Approve proposal',
    icon: CheckCircle2,
    color: 'success',
    endpoint: (row) => endpointWithId(row, '/v2/admin/agents/proposals/:id/approve'),
    successMessage: 'Agent proposal approved',
  },
  {
    label: 'Edit approve proposal',
    icon: BadgeCheck,
    color: 'primary',
    endpoint: (row) => endpointWithId(row, '/v2/admin/agents/proposals/:id/edit-approve'),
    successMessage: 'Agent proposal edit-approval requested',
  },
  {
    label: 'Reject proposal',
    icon: XCircle,
    color: 'danger',
    endpoint: (row) => endpointWithId(row, '/v2/admin/agents/proposals/:id/reject'),
    successMessage: 'Agent proposal rejected',
  },
];

const agentColumns = [
  titleColumn(['name', 'title', 'key'], 'Agent'),
  statusColumn(['status', 'state']),
  booleanColumn(['is_enabled', 'enabled', 'active'], 'Enabled', 'Enabled', 'Disabled'),
  textColumn(['schedule', 'frequency', 'trigger'], 'Schedule'),
  dateColumn(['last_run_at', 'updated_at', 'created_at'], 'Last Run'),
];

const proposalColumns = [
  titleColumn(['title', 'summary', 'name'], 'Proposal'),
  textColumn(['agent_name', 'agent.key', 'agent'], 'Agent'),
  statusColumn(['status', 'state']),
  dateColumn(['created_at', 'submitted_at'], 'Submitted'),
];

const runColumns = [
  titleColumn(['agent_name', 'name', 'id'], 'Run'),
  statusColumn(['status', 'state']),
  textColumn(['trigger', 'run_type', 'type'], 'Trigger'),
  dateColumn(['started_at', 'created_at'], 'Started'),
  dateColumn(['completed_at', 'finished_at'], 'Completed'),
];

const agentLinks: LinkConfig[] = [
  { label: 'Proposals', to: '/admin/agents/proposals', icon: Sparkles },
  { label: 'Runs', to: '/admin/agents/runs', icon: Activity },
  { label: 'API Partners', to: '/admin/api-partners', icon: KeyRound },
];

const agentsConfig: BehavioralPageConfig = {
  title: 'AI Agents',
  description: 'Agent definitions, execution controls, proposals, and run outcomes.',
  icon: Bot,
  sources: agentSources,
  links: agentLinks,
  stats: agentStats,
  sections: [
    {
      title: 'Agents',
      sourceKey: 'agents',
      rowKeys: ['agents'],
      icon: Bot,
      emptyTitle: 'No agents',
      emptyDescription: 'The live agents API returned no agent definitions.',
      columns: agentColumns,
      actions: agentActions,
    },
    {
      title: 'Recent proposals',
      sourceKey: 'proposals',
      rowKeys: ['proposals'],
      icon: Sparkles,
      emptyTitle: 'No proposals',
      emptyDescription: 'No agent proposals are waiting in the live API.',
      columns: proposalColumns,
      actions: proposalActions,
    },
  ],
};

const agentProposalsConfig: BehavioralPageConfig = {
  ...agentsConfig,
  title: 'Agent Proposals',
  description: 'Review, approve, edit-approve, or reject agent-generated changes.',
  icon: Sparkles,
  sections: [
    {
      title: 'Proposals',
      sourceKey: 'proposals',
      rowKeys: ['proposals'],
      icon: Sparkles,
      emptyTitle: 'No agent proposals',
      emptyDescription: 'The proposal queue is empty.',
      columns: proposalColumns,
      actions: proposalActions,
    },
  ],
};

const agentRunsConfig: BehavioralPageConfig = {
  ...agentsConfig,
  title: 'Agent Runs',
  description: 'Execution history, failed runs, and recent agent activity.',
  icon: Activity,
  sections: [
    {
      title: 'Agent runs',
      sourceKey: 'runs',
      rowKeys: ['runs'],
      icon: Activity,
      emptyTitle: 'No agent runs',
      emptyDescription: 'No agent execution history was returned by the live API.',
      columns: runColumns,
    },
  ],
};

const kiAgentsConfig: BehavioralPageConfig = {
  title: 'KI Agents',
  description: 'Legacy KI agent compatibility configuration, proposals, and run history.',
  icon: Bot,
  sources: [
    { key: 'config', label: 'Configuration', path: '/v2/admin/ki-agents/config' },
    { key: 'stats', label: 'Stats', path: '/v2/admin/ki-agents/stats' },
    { key: 'proposals', label: 'Proposals', path: '/v2/admin/ki-agents/proposals', rowKeys: ['proposals'] },
    { key: 'runs', label: 'Runs', path: '/v2/admin/ki-agents/runs', rowKeys: ['runs'] },
  ],
  actions: [
    {
      label: 'Trigger KI Agent',
      icon: Play,
      color: 'primary',
      endpoint: '/v2/admin/ki-agents/trigger',
      successMessage: 'KI agent trigger requested',
    },
  ],
  stats: [
    {
      label: 'Proposals',
      icon: Sparkles,
      color: 'warning',
      value: (state) => state.count('proposals'),
    },
    {
      label: 'Runs',
      icon: Activity,
      color: 'primary',
      value: (state) => state.count('runs'),
    },
    {
      label: 'Eligible',
      icon: CheckCircle2,
      color: 'success',
      value: (state) => sourceMetric(state, 'stats', ['eligible', 'eligible_proposals', 'ready'], 0),
    },
    {
      label: 'Open Errors',
      icon: AlertCircle,
      color: 'danger',
      value: (state) => state.errors.length,
    },
  ],
  sections: [
    {
      title: 'KI proposals',
      sourceKey: 'proposals',
      rowKeys: ['proposals'],
      icon: Sparkles,
      emptyTitle: 'No KI proposals',
      emptyDescription: 'The live KI agent API returned no proposals.',
      columns: proposalColumns,
      actions: [
        {
          label: 'Approve proposal',
          icon: CheckCircle2,
          color: 'success',
          endpoint: (row) => endpointWithId(row, '/v2/admin/ki-agents/proposals/:id/approve'),
          successMessage: 'KI proposal approved',
        },
        {
          label: 'Reject proposal',
          icon: XCircle,
          color: 'danger',
          endpoint: (row) => endpointWithId(row, '/v2/admin/ki-agents/proposals/:id/reject'),
          successMessage: 'KI proposal rejected',
        },
      ],
    },
    {
      title: 'KI runs',
      sourceKey: 'runs',
      rowKeys: ['runs'],
      icon: Activity,
      emptyTitle: 'No KI runs',
      emptyDescription: 'The live KI agent API returned no runs.',
      columns: runColumns,
    },
  ],
};

const apiPartnersConfig: BehavioralPageConfig = {
  title: 'API Partners',
  description: 'Partner credentials, activation state, and credential rotation controls.',
  icon: KeyRound,
  sources: [
    { key: 'partners', label: 'API partners', path: '/v2/admin/api-partners', rowKeys: ['partners'] },
  ],
  stats: [
    {
      label: 'Partners',
      icon: KeyRound,
      color: 'primary',
      value: (state) => state.count('partners'),
    },
    {
      label: 'Active',
      icon: CheckCircle2,
      color: 'success',
      value: (state) => countWhere(state.rows('partners'), (row) => ['active', 'enabled', 'approved'].includes(statusValue(row).toLowerCase()) || isTruthyStatus(row, ['active', 'is_active'])),
    },
    {
      label: 'Suspended',
      icon: Power,
      color: 'warning',
      value: (state) => countWhere(state.rows('partners'), (row) => ['suspended', 'disabled'].includes(statusValue(row).toLowerCase())),
    },
    {
      label: 'Open Errors',
      icon: AlertCircle,
      color: 'danger',
      value: (state) => state.errors.length,
    },
  ],
  sections: [
    {
      title: 'Partners',
      sourceKey: 'partners',
      rowKeys: ['partners'],
      icon: Network,
      emptyTitle: 'No API partners',
      emptyDescription: 'No partner API records were returned by the live admin API.',
      columns: [
        titleColumn(['name', 'partner_name', 'slug'], 'Partner'),
        statusColumn(['status', 'state']),
        textColumn(['scopes', 'permissions'], 'Scopes'),
        dateColumn(['last_used_at', 'updated_at', 'created_at'], 'Last Used'),
      ],
      actions: [
        {
          label: 'Activate partner',
          icon: CheckCircle2,
          color: 'success',
          endpoint: (row) => endpointWithId(row, '/v2/admin/api-partners/:id/activate'),
          successMessage: 'API partner activated',
        },
        {
          label: 'Suspend partner',
          icon: Power,
          color: 'warning',
          endpoint: (row) => endpointWithId(row, '/v2/admin/api-partners/:id/suspend'),
          successMessage: 'API partner suspended',
        },
        {
          label: 'Regenerate credentials',
          icon: RefreshCw,
          color: 'primary',
          endpoint: (row) => endpointWithId(row, '/v2/admin/api-partners/:id/regenerate-credentials'),
          successMessage: 'API partner credentials regenerated',
        },
      ],
    },
  ],
};

const volunteerSafeguardingConfig: BehavioralPageConfig = {
  title: 'Volunteer Safeguarding',
  description: 'Safeguarding incidents, guardian consent coverage, and statement readiness.',
  icon: ShieldCheck,
  sources: [
    { key: 'incidents', label: 'Incidents', path: '/v2/admin/volunteering/incidents', rowKeys: ['incidents'] },
    { key: 'consents', label: 'Guardian consents', path: '/v2/admin/volunteering/guardian-consents', rowKeys: ['consents'] },
    { key: 'statement', label: 'Safeguarding statement', path: '/v2/admin/safeguarding/statement' },
  ],
  actions: [
    {
      label: 'Refresh statement',
      icon: RefreshCw,
      color: 'primary',
      endpoint: '/v2/admin/safeguarding/statement',
      body: () => ({ source: 'admin_parity_workspace' }),
      successMessage: 'Safeguarding statement refreshed',
    },
  ],
  stats: [
    { label: 'Incidents', icon: ShieldCheck, color: 'warning', value: (state) => state.count('incidents') },
    { label: 'Open Consents', icon: FileText, color: 'primary', value: (state) => state.count('consents') },
    { label: 'Statement', icon: BadgeCheck, color: 'success', value: (state) => sourceText(state, 'statement', ['status', 'updated_at'], 'Loaded') },
    { label: 'Open Errors', icon: AlertCircle, color: 'danger', value: (state) => state.errors.length },
  ],
  sections: [
    {
      title: 'Safeguarding incidents',
      sourceKey: 'incidents',
      rowKeys: ['incidents'],
      icon: ShieldCheck,
      emptyTitle: 'No incidents',
      emptyDescription: 'No safeguarding incidents were returned by the live API.',
      columns: [
        userColumn('Member'),
        titleColumn(['title', 'subject', 'reason'], 'Incident'),
        statusColumn(['status', 'severity', 'risk_level']),
        dateColumn(['created_at', 'reported_at'], 'Reported'),
      ],
    },
    {
      title: 'Guardian consents',
      sourceKey: 'consents',
      rowKeys: ['consents'],
      icon: FileText,
      emptyTitle: 'No consents',
      emptyDescription: 'No guardian consent records were returned.',
      columns: [
        userColumn('Volunteer'),
        titleColumn(['guardian_name', 'name', 'email'], 'Guardian'),
        statusColumn(['status', 'consent_status']),
        dateColumn(['expires_at', 'created_at'], 'Expiry'),
      ],
    },
  ],
};

const volunteerGivingDaysConfig: BehavioralPageConfig = {
  title: 'Giving Days',
  description: 'Giving day campaigns, donor volume, and update actions.',
  icon: Sparkles,
  sources: [
    { key: 'days', label: 'Giving days', path: '/v2/admin/volunteering/giving-days', rowKeys: ['giving_days', 'days'] },
  ],
  stats: [
    { label: 'Campaigns', icon: Sparkles, color: 'primary', value: (state) => state.count('days', ['giving_days', 'days']) },
    { label: 'Active', icon: CheckCircle2, color: 'success', value: (state) => countWhere(state.rows('days', ['giving_days', 'days']), (row) => ['active', 'open', 'published'].includes(statusValue(row).toLowerCase())) },
    { label: 'Donors', icon: Users, color: 'secondary', value: (state) => sumRows(state.rows('days', ['giving_days', 'days']), ['donors_count', 'donor_count', 'donors']) },
    { label: 'Open Errors', icon: AlertCircle, color: 'danger', value: (state) => state.errors.length },
  ],
  sections: [
    {
      title: 'Campaigns',
      sourceKey: 'days',
      rowKeys: ['giving_days', 'days'],
      icon: Sparkles,
      emptyTitle: 'No giving days',
      emptyDescription: 'No giving day campaigns were returned.',
      columns: [
        titleColumn(['title', 'name'], 'Campaign'),
        statusColumn(['status', 'state']),
        countColumn(['donors_count', 'donor_count', 'donors'], 'Donors'),
        dateColumn(['starts_at', 'start_date', 'created_at'], 'Starts'),
      ],
    },
  ],
};

const volunteerConsentsConfig: BehavioralPageConfig = {
  title: 'Volunteer Consents',
  description: 'Guardian and participation consent records from the volunteering API.',
  icon: FileText,
  sources: [
    { key: 'consents', label: 'Guardian consents', path: '/v2/admin/volunteering/guardian-consents', rowKeys: ['consents'] },
  ],
  stats: [
    { label: 'Consents', icon: FileText, color: 'primary', value: (state) => state.count('consents') },
    { label: 'Approved', icon: CheckCircle2, color: 'success', value: (state) => countWhere(state.rows('consents'), (row) => ['approved', 'accepted', 'active'].includes(statusValue(row, ['status', 'consent_status']).toLowerCase())) },
    { label: 'Pending', icon: Clock, color: 'warning', value: (state) => countWhere(state.rows('consents'), (row) => ['pending', 'requested'].includes(statusValue(row, ['status', 'consent_status']).toLowerCase())) },
    { label: 'Open Errors', icon: AlertCircle, color: 'danger', value: (state) => state.errors.length },
  ],
  sections: [
    {
      title: 'Consent records',
      sourceKey: 'consents',
      rowKeys: ['consents'],
      icon: FileText,
      emptyTitle: 'No consent records',
      emptyDescription: 'No consent records were returned.',
      columns: [
        userColumn('Volunteer'),
        titleColumn(['guardian_name', 'name', 'email'], 'Guardian'),
        statusColumn(['status', 'consent_status']),
        dateColumn(['created_at', 'updated_at'], 'Updated'),
      ],
    },
  ],
};

const volunteerProjectsConfig: BehavioralPageConfig = {
  title: 'Volunteer Projects',
  description: 'Community project review queue and project approval controls.',
  icon: ListChecks,
  sources: [
    { key: 'projects', label: 'Community projects', path: '/v2/admin/volunteering/community-projects', rowKeys: ['projects'] },
  ],
  stats: [
    { label: 'Projects', icon: ListChecks, color: 'primary', value: (state) => state.count('projects') },
    { label: 'Pending', icon: Clock, color: 'warning', value: (state) => countWhere(state.rows('projects'), (row) => ['pending', 'review'].includes(statusValue(row).toLowerCase())) },
    { label: 'Approved', icon: CheckCircle2, color: 'success', value: (state) => countWhere(state.rows('projects'), (row) => ['approved', 'active', 'published'].includes(statusValue(row).toLowerCase())) },
    { label: 'Open Errors', icon: AlertCircle, color: 'danger', value: (state) => state.errors.length },
  ],
  sections: [
    {
      title: 'Community projects',
      sourceKey: 'projects',
      rowKeys: ['projects'],
      icon: ListChecks,
      emptyTitle: 'No community projects',
      emptyDescription: 'No projects were returned by the live API.',
      columns: [
        titleColumn(['title', 'name'], 'Project'),
        userColumn('Owner'),
        statusColumn(['status', 'review_status']),
        dateColumn(['created_at', 'updated_at'], 'Updated'),
      ],
      actions: [
        {
          label: 'Approve project',
          icon: CheckCircle2,
          color: 'success',
          method: 'PUT',
          endpoint: (row) => endpointWithId(row, '/v2/admin/volunteering/community-projects/:id/review'),
          body: () => ({ status: 'approved', review_status: 'approved' }),
          successMessage: 'Project approved',
        },
        {
          label: 'Reject project',
          icon: XCircle,
          color: 'danger',
          method: 'PUT',
          endpoint: (row) => endpointWithId(row, '/v2/admin/volunteering/community-projects/:id/review'),
          body: () => ({ status: 'rejected', review_status: 'rejected' }),
          successMessage: 'Project rejected',
        },
      ],
    },
  ],
};

const federationDocsConfig: BehavioralPageConfig = {
  title: 'Federation API Documentation',
  description: 'API keys, aggregate consent readiness, and federation data sources.',
  icon: FileText,
  sources: [
    { key: 'keys', label: 'API keys', path: '/v2/admin/federation/api-keys', rowKeys: ['api_keys', 'keys'] },
    { key: 'consent', label: 'Aggregate consent', path: '/v2/admin/federation/aggregate-consent' },
    { key: 'preview', label: 'Consent preview', path: '/v2/admin/federation/aggregate-consent/preview' },
  ],
  actions: [
    {
      label: 'Rotate aggregate secret',
      icon: RefreshCw,
      color: 'warning',
      endpoint: '/v2/admin/federation/aggregate-consent/rotate-secret',
      successMessage: 'Aggregate consent secret rotated',
    },
  ],
  stats: [
    { label: 'API Keys', icon: KeyRound, color: 'primary', value: (state) => state.count('keys', ['api_keys', 'keys']) },
    { label: 'Active Keys', icon: CheckCircle2, color: 'success', value: (state) => countWhere(state.rows('keys', ['api_keys', 'keys']), (row) => isTruthyStatus(row, ['is_active', 'active', 'enabled'])) },
    { label: 'Consent', icon: ShieldCheck, color: 'secondary', value: (state) => sourceText(state, 'consent', ['status', 'enabled', 'is_enabled'], 'Loaded') },
    { label: 'Open Errors', icon: AlertCircle, color: 'danger', value: (state) => state.errors.length },
  ],
  sections: [
    {
      title: 'API keys',
      sourceKey: 'keys',
      rowKeys: ['api_keys', 'keys'],
      icon: KeyRound,
      emptyTitle: 'No API keys',
      emptyDescription: 'No federation API keys were returned.',
      columns: [
        titleColumn(['name', 'label', 'key_prefix'], 'Key'),
        booleanColumn(['is_active', 'active', 'enabled'], 'Active', 'Active', 'Inactive'),
        dateColumn(['last_used_at', 'updated_at', 'created_at'], 'Last Used'),
      ],
      actions: [
        {
          label: 'Revoke key',
          icon: Trash2,
          color: 'danger',
          endpoint: (row) => endpointWithId(row, '/v2/admin/federation/api-keys/:id/revoke'),
          successMessage: 'API key revoked',
        },
      ],
    },
  ],
};

const federationActivityConfig: BehavioralPageConfig = {
  title: 'Federation Activity',
  description: 'Inbound, outbound, and API activity from federation audit sources.',
  icon: Activity,
  sources: [
    { key: 'activity', label: 'Activity', path: '/v2/admin/federation/activity', rowKeys: ['activity', 'audit', 'logs'] },
    { key: 'overview', label: 'Overview', path: '/v2/admin/federation/analytics/overview' },
  ],
  stats: [
    { label: 'Events', icon: Activity, color: 'primary', value: (state) => state.count('activity', ['activity', 'audit', 'logs']) },
    { label: 'API Calls', icon: Network, color: 'secondary', value: (state) => sourceMetric(state, 'overview', ['api_calls'], state.count('activity')) },
    { label: 'Failures', icon: AlertCircle, color: 'danger', value: (state) => sourceMetric(state, 'overview', ['failed_api_calls'], 0) },
    { label: 'Open Errors', icon: AlertCircle, color: 'warning', value: (state) => state.errors.length },
  ],
  sections: [
    {
      title: 'Recent activity',
      sourceKey: 'activity',
      rowKeys: ['activity', 'audit', 'logs'],
      icon: Activity,
      emptyTitle: 'No federation activity',
      emptyDescription: 'No federation activity rows were returned.',
      columns: [
        titleColumn(['event_type', 'type', 'action', 'name'], 'Event'),
        textColumn(['direction', 'source', 'partner_name'], 'Source'),
        statusColumn(['status', 'state']),
        dateColumn(['created_at', 'occurred_at', 'timestamp'], 'Time'),
      ],
    },
  ],
};

const federationAggregatesConfig: BehavioralPageConfig = {
  title: 'Federation Aggregates',
  description: 'Aggregate consent, credit balances, and analytics overview.',
  icon: Network,
  sources: [
    { key: 'overview', label: 'Analytics overview', path: '/v2/admin/federation/analytics/overview' },
    { key: 'balances', label: 'Credit balances', path: '/v2/admin/federation/credit-balances', rowKeys: ['balances', 'credits'] },
    { key: 'consent', label: 'Aggregate consent', path: '/v2/admin/federation/aggregate-consent' },
    { key: 'audit', label: 'Consent audit log', path: '/v2/admin/federation/aggregate-consent/audit-log', rowKeys: ['logs', 'audit'] },
  ],
  stats: [
    { label: 'Partners', icon: Users, color: 'primary', value: (state) => sourceMetric(state, 'overview', ['partners'], 0) },
    { label: 'Active Partners', icon: CheckCircle2, color: 'success', value: (state) => sourceMetric(state, 'overview', ['active_partners'], 0) },
    { label: 'Balances', icon: WalletCards, color: 'secondary', value: (state) => state.count('balances', ['balances', 'credits']) },
    { label: 'Open Errors', icon: AlertCircle, color: 'danger', value: (state) => state.errors.length },
  ],
  sections: [
    {
      title: 'Credit balances',
      sourceKey: 'balances',
      rowKeys: ['balances', 'credits'],
      icon: WalletCards,
      emptyTitle: 'No credit balances',
      emptyDescription: 'No aggregate credit balances were returned.',
      columns: [
        titleColumn(['partner_name', 'tenant_name', 'name'], 'Partner'),
        countColumn(['balance', 'credits', 'amount'], 'Balance'),
        statusColumn(['status', 'state']),
        dateColumn(['updated_at', 'created_at'], 'Updated'),
      ],
    },
    {
      title: 'Consent audit',
      sourceKey: 'audit',
      rowKeys: ['logs', 'audit'],
      icon: ShieldCheck,
      emptyTitle: 'No consent audit rows',
      emptyDescription: 'No aggregate consent audit rows were returned.',
      columns: [
        titleColumn(['action', 'event_type', 'type'], 'Action'),
        userColumn('Actor'),
        dateColumn(['created_at', 'timestamp'], 'Time'),
      ],
    },
  ],
};

const provisioningRequestsConfig: BehavioralPageConfig = {
  title: 'Provisioning Requests',
  description: 'Self-service tenant provisioning requests and processing state.',
  icon: ListChecks,
  sources: [
    { key: 'requests', label: 'Provisioning requests', path: '/v2/admin/provisioning-requests', rowKeys: ['requests'] },
  ],
  stats: [
    { label: 'Requests', icon: ListChecks, color: 'primary', value: (state) => state.count('requests') },
    { label: 'Pending', icon: Clock, color: 'warning', value: (state) => countWhere(state.rows('requests'), (row) => ['pending', 'review'].includes(statusValue(row).toLowerCase())) },
    { label: 'Approved', icon: CheckCircle2, color: 'success', value: (state) => countWhere(state.rows('requests'), (row) => ['approved', 'provisioned'].includes(statusValue(row).toLowerCase())) },
    { label: 'Open Errors', icon: AlertCircle, color: 'danger', value: (state) => state.errors.length },
  ],
  sections: [
    {
      title: 'Requests',
      sourceKey: 'requests',
      rowKeys: ['requests'],
      icon: ListChecks,
      emptyTitle: 'No provisioning requests',
      emptyDescription: 'No provisioning requests were returned.',
      columns: [
        titleColumn(['organisation_name', 'tenant_name', 'name'], 'Organisation'),
        textColumn(['requested_domain', 'slug', 'domain'], 'Domain'),
        statusColumn(['status', 'state']),
        dateColumn(['created_at', 'updated_at'], 'Requested'),
      ],
    },
  ],
};

const helpCenterConfig: BehavioralPageConfig = {
  title: 'Admin Help Centre',
  description: 'FAQ content and resource coverage for admin help routes.',
  icon: FileText,
  sources: [
    { key: 'faqs', label: 'FAQs', path: '/v2/admin/help/faqs', rowKeys: ['faqs', 'items'] },
    { key: 'resources', label: 'Resources', path: '/v2/admin/resources?limit=25', rowKeys: ['resources', 'items'] },
  ],
  stats: [
    { label: 'FAQs', icon: FileText, color: 'primary', value: (state) => state.count('faqs', ['faqs', 'items']) },
    { label: 'Resources', icon: ListChecks, color: 'secondary', value: (state) => state.count('resources', ['resources', 'items']) },
    { label: 'Published', icon: CheckCircle2, color: 'success', value: (state) => countWhere(state.rows('faqs', ['faqs', 'items']), (row) => ['published', 'active'].includes(statusValue(row).toLowerCase())) },
    { label: 'Open Errors', icon: AlertCircle, color: 'danger', value: (state) => state.errors.length },
  ],
  sections: [
    {
      title: 'FAQs',
      sourceKey: 'faqs',
      rowKeys: ['faqs', 'items'],
      icon: FileText,
      emptyTitle: 'No FAQs',
      emptyDescription: 'No admin FAQ entries were returned.',
      columns: [
        titleColumn(['question', 'title'], 'Question'),
        textColumn(['category', 'topic'], 'Category'),
        statusColumn(['status', 'state']),
        dateColumn(['updated_at', 'created_at'], 'Updated'),
      ],
      actions: [
        {
          label: 'Delete FAQ',
          icon: Trash2,
          color: 'danger',
          method: 'DELETE',
          endpoint: (row) => endpointWithId(row, '/v2/admin/help/faqs/:id'),
          successMessage: 'FAQ deleted',
        },
      ],
    },
    {
      title: 'Resources',
      sourceKey: 'resources',
      rowKeys: ['resources', 'items'],
      icon: ListChecks,
      emptyTitle: 'No resources',
      emptyDescription: 'No help resources were returned.',
      columns: [
        titleColumn(['title', 'name'], 'Resource'),
        textColumn(['category', 'type'], 'Category'),
        statusColumn(['status', 'state']),
        dateColumn(['updated_at', 'created_at'], 'Updated'),
      ],
    },
  ],
};

export function BillingParityPage() { return <BehavioralParityPage config={billingConfig} />; }
export function BillingPlansParityPage() { return <BehavioralParityPage config={billingPlansConfig} />; }
export function InvoiceHistoryParityPage() { return <BehavioralParityPage config={invoiceHistoryConfig} />; }
export function CheckoutReturnParityPage() { return <BehavioralParityPage config={checkoutReturnConfig} />; }
export function RevenueDashboardParityPage() { return <BehavioralParityPage config={revenueConfig} />; }
export function BillingControlParityPage() { return <BehavioralParityPage config={billingControlConfig} />; }
export function MarketplaceParityPage() { return <BehavioralParityPage config={marketplaceConfig} />; }
export function MarketplaceModerationParityPage() { return <BehavioralParityPage config={marketplaceModerationConfig} />; }
export function MarketplaceSellerParityPage() { return <BehavioralParityPage config={marketplaceSellersConfig} />; }
export function MarketplaceCouponsParityPage() { return <BehavioralParityPage config={marketplaceCouponsConfig} />; }
export function VolunteerExpensesParityPage() { return <BehavioralParityPage config={volunteerExpensesConfig} />; }
export function VolunteerTrainingParityPage() { return <BehavioralParityPage config={volunteerTrainingConfig} />; }
export function VolunteerSafeguardingParityPage() { return <BehavioralParityPage config={volunteerSafeguardingConfig} />; }
export function VolunteerHoursAuditParityPage() { return <BehavioralParityPage config={volunteerHoursConfig} />; }
export function VolunteerGivingDaysParityPage() { return <BehavioralParityPage config={volunteerGivingDaysConfig} />; }
export function VolunteerConsentsParityPage() { return <BehavioralParityPage config={volunteerConsentsConfig} />; }
export function VolunteerProjectsParityPage() { return <BehavioralParityPage config={volunteerProjectsConfig} />; }
export function VolunteerConfigParityPage() { return <BehavioralParityPage config={volunteerConfigConfig} />; }
export function AgentsAdminParityPage() { return <BehavioralParityPage config={agentsConfig} />; }
export function AgentProposalsParityPage() { return <BehavioralParityPage config={agentProposalsConfig} />; }
export function AgentRunsParityPage() { return <BehavioralParityPage config={agentRunsConfig} />; }
export function KiAgentAdminParityPage() { return <BehavioralParityPage config={kiAgentsConfig} />; }
export function ApiPartnersAdminParityPage() { return <BehavioralParityPage config={apiPartnersConfig} />; }
export function FederationApiDocsParityPage() { return <BehavioralParityPage config={federationDocsConfig} />; }
export function FederationActivityParityPage() { return <BehavioralParityPage config={federationActivityConfig} />; }
export function FederationAggregatesParityPage() { return <BehavioralParityPage config={federationAggregatesConfig} />; }
export function JobModerationQueueParityPage() { return <BehavioralParityPage config={jobModerationConfig} />; }
export function JobBiasAuditParityPage() { return <BehavioralParityPage config={jobBiasAuditConfig} />; }
export function JobPipelineOverviewParityPage() { return <BehavioralParityPage config={jobPipelineConfig} />; }
export function JobTemplatesAdminParityPage() { return <BehavioralParityPage config={jobTemplatesConfig} />; }
export function ProvisioningRequestsParityPage() { return <BehavioralParityPage config={provisioningRequestsConfig} />; }
export function AdminHelpCenterParityPage() { return <BehavioralParityPage config={helpCenterConfig} />; }
