// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button, Chip, Input, Skeleton, Textarea } from '@heroui/react';
import {
  ArrowRight,
  BookOpen,
  Braces,
  Code2,
  Copy,
  ExternalLink,
  KeyRound,
  Play,
  RefreshCw,
  Route,
  Server,
  ShieldCheck,
  TerminalSquare,
  Trash2,
  Webhook,
} from 'lucide-react';
import { GlassCard } from '@/components/ui';
import { useAuth, useTenant, useToast } from '@/contexts';
import { usePageTitle } from '@/hooks';
import { api } from '@/lib/api';
import { logError } from '@/lib/logger';

type DocMode = 'overview' | 'auth' | 'endpoints' | 'webhooks';
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface Probe {
  label: string;
  endpoint: string;
  status: 'checking' | 'ok' | 'error' | 'skipped';
  count?: number;
}

interface ApiKeyRecord {
  id?: number;
  name?: string;
  key?: string;
  key_prefix?: string;
  scopes?: string[] | string;
  is_active?: boolean;
  rate_limit_per_minute?: number;
  expires_at?: string | null;
  last_used_at?: string | null;
  created_at?: string;
}

interface EndpointGroup {
  title: string;
  description: string;
  items: Array<{ method: string; path: string; auth: string; note: string }>;
}

interface ConsoleState {
  method: HttpMethod;
  path: string;
  body: string;
}

function modeFromPath(pathname: string): DocMode {
  if (pathname.endsWith('/auth')) return 'auth';
  if (pathname.endsWith('/endpoints')) return 'endpoints';
  if (pathname.endsWith('/webhooks')) return 'webhooks';
  return 'overview';
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function formatJson(value: unknown) {
  return JSON.stringify(value ?? null, null, 2);
}

function openApiPathCount(value: unknown) {
  const record = asRecord(value);
  const paths = asRecord(record?.paths);
  return paths ? Object.keys(paths).length : 0;
}

export function DeveloperDocsPage() {
  const { pathname } = useLocation();
  const mode = modeFromPath(pathname);
  const { isAuthenticated } = useAuth();
  const { tenantPath } = useTenant();
  const toast = useToast();
  const [probes, setProbes] = useState<Probe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiKeys, setApiKeys] = useState<ApiKeyRecord[]>([]);
  const [openApi, setOpenApi] = useState<unknown>(null);
  const [newKey, setNewKey] = useState({
    name: 'Frontend parity console',
    scopes: 'federation:read marketplace:read',
    rateLimit: '120',
    expiresAt: '',
  });
  const [createdKey, setCreatedKey] = useState<ApiKeyRecord | null>(null);
  const [consoleForm, setConsoleForm] = useState<ConsoleState>({
    method: 'GET',
    path: '/marketplace/categories',
    body: '{\n  "code": "WELCOME"\n}',
  });
  const [consoleResult, setConsoleResult] = useState<unknown>(null);
  const [consoleStatus, setConsoleStatus] = useState<'idle' | 'ok' | 'error'>('idle');

  usePageTitle('Developer Documentation');

  const endpointGroups = useMemo<EndpointGroup[]>(() => [
    {
      title: 'Authentication',
      description: 'JWT bearer auth is the member API contract; tenant context is resolved from the request host, selected tenant, or X-Tenant-ID.',
      items: [
        { method: 'POST', path: '/api/auth/login', auth: 'Public', note: 'Returns access and refresh tokens.' },
        { method: 'POST', path: '/api/auth/refresh', auth: 'Public', note: 'Refreshes access tokens.' },
        { method: 'GET', path: '/api/auth/validate', auth: 'Bearer', note: 'Validates the current token.' },
        { method: 'POST', path: '/api/passkeys/authenticate/begin', auth: 'Public', note: 'Begins passwordless login.' },
        { method: 'GET', path: '/api/docs/openapi.json', auth: 'Public', note: 'OpenAPI-compatible machine contract.' },
      ],
    },
    {
      title: 'Marketplace',
      description: 'Marketplace V2 routes cover browse, seller profile, orders, offers, coupons, pickup slots, and collections.',
      items: [
        { method: 'GET', path: '/api/marketplace/listings', auth: 'Public', note: 'Search and category-filter marketplace listings.' },
        { method: 'GET', path: '/api/marketplace/categories', auth: 'Public', note: 'List marketplace categories.' },
        { method: 'GET', path: '/api/marketplace/orders/purchases', auth: 'Bearer', note: 'Buyer order history.' },
        { method: 'GET', path: '/api/marketplace/seller/coupons', auth: 'Bearer', note: 'Seller coupon management.' },
        { method: 'POST', path: '/api/marketplace/payments/create-intent', auth: 'Bearer', note: 'Creates local/Stripe-compatible payment intents.' },
      ],
    },
    {
      title: 'API keys',
      description: 'Admin-scoped federation API keys are the currently implemented credential surface for integrations and parity testing.',
      items: [
        { method: 'GET', path: '/api/admin/federation/api-keys', auth: 'Admin', note: 'List tenant API keys.' },
        { method: 'POST', path: '/api/admin/federation/api-keys', auth: 'Admin', note: 'Create a scoped key, returned once.' },
        { method: 'DELETE', path: '/api/admin/federation/api-keys/{id}', auth: 'Admin', note: 'Revoke an API key.' },
        { method: 'GET', path: '/api/admin/federation/api-keys/usage', auth: 'Admin', note: 'Review key usage totals.' },
      ],
    },
    {
      title: 'Jobs',
      description: 'Jobs APIs include browse, applications, alerts, employer tools, saved profiles, talent search, feeds, and bias-supporting salary benchmarks.',
      items: [
        { method: 'GET', path: '/api/jobs', auth: 'Bearer', note: 'List vacancies.' },
        { method: 'GET', path: '/api/jobs/{id}/applications', auth: 'Owner', note: 'Review application pipeline.' },
        { method: 'GET', path: '/api/jobs/talent-search', auth: 'Bearer', note: 'Find visible candidate profiles.' },
        { method: 'GET', path: '/api/jobs/feed.json', auth: 'Public', note: 'Syndication feed.' },
      ],
    },
    {
      title: 'Partner webhooks',
      description: 'Partner webhook routes preserve V1-compatible subscription paths while federation and external API endpoints remain separate.',
      items: [
        { method: 'GET', path: '/api/partner/v1/webhooks/subscriptions', auth: 'Bearer', note: 'List partner webhook subscriptions.' },
        { method: 'POST', path: '/api/partner/v1/webhooks/subscriptions', auth: 'Bearer', note: 'Create subscription.' },
        { method: 'POST', path: '/api/marketplace/webhooks/stripe', auth: 'Public', note: 'Marketplace payment event receiver.' },
      ],
    },
  ], []);

  const loadProbes = useCallback(async () => {
    setIsLoading(true);
    const next: Probe[] = [
      { label: 'OpenAPI document', endpoint: '/api/docs/openapi.json', status: 'checking' },
      { label: 'Marketplace categories', endpoint: '/api/marketplace/categories', status: 'checking' },
      { label: 'Jobs JSON feed', endpoint: '/api/jobs/feed.json', status: 'checking' },
      { label: 'Webhook subscriptions', endpoint: '/api/partner/v1/webhooks/subscriptions', status: isAuthenticated ? 'checking' : 'skipped' },
      { label: 'Admin API keys', endpoint: '/api/admin/federation/api-keys', status: isAuthenticated ? 'checking' : 'skipped' },
    ];
    setProbes(next);

    try {
      const [openApiRes, categoriesRes, jobsFeedRes, webhooksRes, keysRes] = await Promise.all([
        api.get<unknown>('/docs/openapi.json', { skipAuth: true }).catch(() => null),
        api.get<unknown[]>('/v2/marketplace/categories', { skipAuth: true }).catch(() => null),
        api.get<unknown[]>('/jobs/feed.json', { skipAuth: true }).catch(() => null),
        isAuthenticated ? api.get<unknown[]>('/partner/v1/webhooks/subscriptions').catch(() => null) : Promise.resolve(null),
        isAuthenticated ? api.get<ApiKeyRecord[]>('/admin/federation/api-keys').catch(() => null) : Promise.resolve(null),
      ]);

      setOpenApi(openApiRes?.data ?? null);
      setApiKeys(asArray(keysRes?.data) as ApiKeyRecord[]);
      setProbes([
        {
          label: 'OpenAPI document',
          endpoint: '/api/docs/openapi.json',
          status: openApiRes?.success ? 'ok' : 'error',
          count: openApiPathCount(openApiRes?.data),
        },
        {
          label: 'Marketplace categories',
          endpoint: '/api/marketplace/categories',
          status: categoriesRes?.success ? 'ok' : 'error',
          count: asArray(categoriesRes?.data).length,
        },
        {
          label: 'Jobs JSON feed',
          endpoint: '/api/jobs/feed.json',
          status: jobsFeedRes?.success ? 'ok' : 'error',
          count: asArray(jobsFeedRes?.data).length,
        },
        {
          label: 'Webhook subscriptions',
          endpoint: '/api/partner/v1/webhooks/subscriptions',
          status: isAuthenticated ? (webhooksRes?.success ? 'ok' : 'error') : 'skipped',
          count: asArray(webhooksRes?.data).length,
        },
        {
          label: 'Admin API keys',
          endpoint: '/api/admin/federation/api-keys',
          status: isAuthenticated ? (keysRes?.success ? 'ok' : 'error') : 'skipped',
          count: asArray(keysRes?.data).length,
        },
      ]);
    } catch (err) {
      logError('DeveloperDocsPage.loadProbes', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadProbes();
  }, [loadProbes]);

  const createApiKey = async (event: FormEvent) => {
    event.preventDefault();
    const res = await api.post<ApiKeyRecord>('/admin/federation/api-keys', {
      name: newKey.name,
      scopes: newKey.scopes.split(/[\s,]+/).map((scope) => scope.trim()).filter(Boolean),
      rateLimitPerMinute: Number(newKey.rateLimit) || 120,
      rate_limit_per_minute: Number(newKey.rateLimit) || 120,
      expiresAt: newKey.expiresAt || null,
      expires_at: newKey.expiresAt || null,
    });

    if (res.success && res.data) {
      setCreatedKey(res.data);
      toast.success('API key created');
      await loadProbes();
    } else {
      toast.error(res.error ?? 'Could not create API key');
    }
  };

  const revokeApiKey = async (keyId: number) => {
    const res = await api.delete(`/admin/federation/api-keys/${keyId}`);
    if (res.success) {
      toast.success('API key revoked');
      await loadProbes();
    } else {
      toast.error(res.error ?? 'Could not revoke API key');
    }
  };

  const runConsoleRequest = async () => {
    const path = consoleForm.path.startsWith('/') ? consoleForm.path : `/${consoleForm.path}`;
    const endpoint = path.startsWith('/api/') ? path.slice(4) : path;
    let body: unknown;

    if (consoleForm.method !== 'GET' && consoleForm.body.trim()) {
      try {
        body = JSON.parse(consoleForm.body);
      } catch {
        setConsoleStatus('error');
        setConsoleResult({ error: 'Request body is not valid JSON.' });
        return;
      }
    }

    const response = consoleForm.method === 'POST'
      ? await api.post(endpoint, body)
      : consoleForm.method === 'PUT'
        ? await api.put(endpoint, body)
        : consoleForm.method === 'PATCH'
          ? await api.patch(endpoint, body)
          : consoleForm.method === 'DELETE'
            ? await api.delete(endpoint)
            : await api.get(endpoint, { skipAuth: endpoint.startsWith('/docs') || endpoint.startsWith('/marketplace/categories') });

    setConsoleStatus(response.success ? 'ok' : 'error');
    setConsoleResult(response.success ? response.data : { error: response.error, code: response.code });
  };

  const copyCreatedKey = async () => {
    if (!createdKey?.key) return;
    await navigator.clipboard.writeText(createdKey.key);
    toast.success('API key copied');
  };

  const visibleGroups = endpointGroups.filter((group) => {
    if (mode === 'overview') return true;
    if (mode === 'auth') return group.title === 'Authentication';
    if (mode === 'webhooks') return group.title === 'Partner webhooks';
    return group.title !== 'Partner webhooks';
  });

  return (
    <section className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center">
              <Code2 className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
            <Chip variant="flat" color="primary">Partner API</Chip>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-theme-primary tracking-normal">
            Developer documentation
          </h1>
          <p className="text-theme-muted mt-1 max-w-3xl">
            Public docs, auth notes, endpoint inventory, and webhook paths are connected to the ASP.NET API surface used by the member frontend.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="flat" className="bg-theme-elevated text-theme-primary" startContent={<RefreshCw className="w-4 h-4" />} onPress={loadProbes}>
            Refresh probes
          </Button>
          <Link to={tenantPath('/help')}>
            <Button className="bg-gradient-to-r from-cyan-500 to-indigo-600 text-white" startContent={<BookOpen className="w-4 h-4" />}>
              Help center
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <DocNavButton to="/developers" active={mode === 'overview'} icon={<Server className="w-4 h-4" />} label="Overview" />
        <DocNavButton to="/developers/auth" active={mode === 'auth'} icon={<KeyRound className="w-4 h-4" />} label="Auth" />
        <DocNavButton to="/developers/endpoints" active={mode === 'endpoints'} icon={<Route className="w-4 h-4" />} label="Endpoints" />
        <DocNavButton to="/developers/webhooks" active={mode === 'webhooks'} icon={<Webhook className="w-4 h-4" />} label="Webhooks" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-4">
        <div className="space-y-4">
          {visibleGroups.map((group) => (
            <GlassCard key={group.title} className="p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-theme-elevated flex items-center justify-center">
                  {group.title === 'Authentication' ? <KeyRound className="w-5 h-5 text-primary" /> : group.title === 'Partner webhooks' ? <Webhook className="w-5 h-5 text-primary" /> : <Braces className="w-5 h-5 text-primary" />}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-theme-primary">{group.title}</h2>
                  <p className="text-sm text-theme-muted mt-1">{group.description}</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-theme-subtle border-b border-theme-default">
                      <th className="py-2 pr-3 font-medium">Method</th>
                      <th className="py-2 pr-3 font-medium">Path</th>
                      <th className="py-2 pr-3 font-medium">Auth</th>
                      <th className="py-2 font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((item) => (
                      <tr key={`${item.method}-${item.path}`} className="border-b border-theme-default/60 last:border-b-0">
                        <td className="py-3 pr-3"><Chip size="sm" variant="flat" color={item.method === 'GET' ? 'primary' : 'secondary'}>{item.method}</Chip></td>
                        <td className="py-3 pr-3 font-mono text-theme-primary whitespace-nowrap">{item.path}</td>
                        <td className="py-3 pr-3 text-theme-muted">{item.auth}</td>
                        <td className="py-3 text-theme-muted">{item.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          ))}
        </div>

        <div className="space-y-4">
          <GlassCard className="p-5">
            <h2 className="text-lg font-semibold text-theme-primary flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-500" aria-hidden="true" />
              Live probes
            </h2>
            <div className="space-y-3 mt-4">
              {isLoading && probes.length === 0 ? (
                [1, 2, 3].map((item) => (
                  <Skeleton key={item} className="rounded-lg"><div className="h-14 rounded-lg bg-default-200" /></Skeleton>
                ))
              ) : (
                probes.map((probe) => <ProbeRow key={probe.endpoint} probe={probe} />)
              )}
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <h2 className="text-lg font-semibold text-theme-primary flex items-center gap-2">
              <Braces className="w-5 h-5 text-primary" aria-hidden="true" />
              OpenAPI
            </h2>
            <div className="mt-4 rounded-lg bg-theme-elevated p-3">
              <p className="text-sm font-medium text-theme-primary">
                {String(asRecord(asRecord(openApi)?.info)?.title ?? 'Project NEXUS API')}
              </p>
              <p className="text-xs text-theme-muted mt-1">
                {openApiPathCount(openApi)} paths | version {String(asRecord(asRecord(openApi)?.info)?.version ?? 'unknown')}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <Button size="sm" variant="flat" startContent={<RefreshCw className="w-4 h-4" />} onPress={loadProbes}>Refresh spec</Button>
              <a href="/api/docs/openapi.json" target="_blank" rel="noreferrer">
                <Button size="sm" variant="flat" endContent={<ExternalLink className="w-4 h-4" />}>JSON</Button>
              </a>
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <h2 className="text-lg font-semibold text-theme-primary flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" aria-hidden="true" />
              API keys
            </h2>
            <form className="space-y-3 mt-4" onSubmit={createApiKey}>
              <Input label="Name" value={newKey.name} onChange={(event) => setNewKey((prev) => ({ ...prev, name: event.target.value }))} />
              <Input label="Scopes" value={newKey.scopes} onChange={(event) => setNewKey((prev) => ({ ...prev, scopes: event.target.value }))} />
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" label="Rate/min" value={newKey.rateLimit} onChange={(event) => setNewKey((prev) => ({ ...prev, rateLimit: event.target.value }))} />
                <Input type="date" label="Expires" value={newKey.expiresAt} onChange={(event) => setNewKey((prev) => ({ ...prev, expiresAt: event.target.value }))} />
              </div>
              <Button type="submit" color="primary" variant="flat" startContent={<KeyRound className="w-4 h-4" />} isDisabled={!isAuthenticated}>
                Create key
              </Button>
            </form>
            {createdKey?.key && (
              <div className="mt-4 rounded-lg bg-theme-elevated p-3">
                <p className="text-xs text-theme-subtle">Created key</p>
                <p className="font-mono text-xs text-theme-primary break-all mt-1">{createdKey.key}</p>
                <Button size="sm" className="mt-2" variant="flat" startContent={<Copy className="w-4 h-4" />} onPress={copyCreatedKey}>Copy</Button>
              </div>
            )}
            <div className="space-y-2 mt-4">
              {apiKeys.length === 0 ? (
                <p className="text-sm text-theme-muted">{isAuthenticated ? 'No keys returned, or this account is not admin-scoped.' : 'Sign in to inspect tenant API keys.'}</p>
              ) : apiKeys.slice(0, 5).map((key) => (
                <div key={key.id ?? key.key_prefix ?? key.name} className="rounded-lg bg-theme-elevated p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-theme-primary truncate">{key.name ?? key.key_prefix ?? 'API key'}</p>
                      <p className="font-mono text-xs text-theme-muted">{key.key_prefix ?? 'prefix hidden'}</p>
                    </div>
                    <div className="flex gap-1">
                      <Chip size="sm" variant="flat" color={key.is_active === false ? 'default' : 'success'}>{key.is_active === false ? 'inactive' : 'active'}</Chip>
                      {key.id && (
                        <Button size="sm" isIconOnly variant="flat" color="danger" aria-label="Revoke API key" onPress={() => revokeApiKey(key.id!)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <h2 className="text-lg font-semibold text-theme-primary flex items-center gap-2">
              <TerminalSquare className="w-5 h-5 text-primary" aria-hidden="true" />
              API console
            </h2>
            <div className="space-y-3 mt-4">
              <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-2">
                <div className="grid grid-cols-1 gap-1">
                  {(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as HttpMethod[]).map((method) => (
                    <Button
                      key={method}
                      size="sm"
                      variant={consoleForm.method === method ? 'solid' : 'flat'}
                      color={consoleForm.method === method ? 'primary' : 'default'}
                      onPress={() => setConsoleForm((prev) => ({ ...prev, method }))}
                    >
                      {method}
                    </Button>
                  ))}
                </div>
                <Input label="Path" value={consoleForm.path} onChange={(event) => setConsoleForm((prev) => ({ ...prev, path: event.target.value }))} />
              </div>
              {consoleForm.method !== 'GET' && (
                <Textarea minRows={5} label="JSON body" value={consoleForm.body} onChange={(event) => setConsoleForm((prev) => ({ ...prev, body: event.target.value }))} />
              )}
              <Button color="primary" startContent={<Play className="w-4 h-4" />} onPress={runConsoleRequest}>
                Send
              </Button>
              {consoleStatus !== 'idle' && (
                <pre className="max-h-80 overflow-auto rounded-lg bg-theme-elevated p-3 text-xs text-theme-primary">
                  {formatJson(consoleResult)}
                </pre>
              )}
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <h2 className="text-lg font-semibold text-theme-primary">Route coverage</h2>
            <div className="space-y-2 mt-4">
              <DocLink to="/developers" label="Overview" />
              <DocLink to="/developers/auth" label="Authentication" />
              <DocLink to="/developers/endpoints" label="Endpoint catalog" />
              <DocLink to="/developers/webhooks" label="Webhook subscriptions" />
            </div>
          </GlassCard>
        </div>
      </div>
    </section>
  );
}

function ProbeRow({ probe }: { probe: Probe }) {
  const color = probe.status === 'ok' ? 'success' : probe.status === 'skipped' ? 'default' : probe.status === 'checking' ? 'primary' : 'danger';
  return (
    <div className="rounded-lg bg-theme-elevated p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium text-theme-primary text-sm">{probe.label}</p>
        <Chip size="sm" variant="flat" color={color}>{probe.status}</Chip>
      </div>
      <p className="font-mono text-xs text-theme-muted mt-1 break-all">{probe.endpoint}</p>
      {typeof probe.count === 'number' && <p className="text-xs text-theme-subtle mt-1">{probe.count} records visible</p>}
    </div>
  );
}

function DocNavButton({ to, active, icon, label }: { to: string; active: boolean; icon: React.ReactNode; label: string }) {
  const { tenantPath } = useTenant();
  return (
    <Link to={tenantPath(to)}>
      <Button
        variant={active ? 'solid' : 'flat'}
        color={active ? 'primary' : 'default'}
        className={active ? undefined : 'bg-theme-elevated text-theme-primary'}
        startContent={icon}
      >
        {label}
      </Button>
    </Link>
  );
}

function DocLink({ to, label }: { to: string; label: string }) {
  const { tenantPath } = useTenant();
  return (
    <Link to={tenantPath(to)}>
      <Button className="w-full justify-between" variant="flat" endContent={<ArrowRight className="w-4 h-4" />}>
        {label}
      </Button>
    </Link>
  );
}

export default DeveloperDocsPage;
