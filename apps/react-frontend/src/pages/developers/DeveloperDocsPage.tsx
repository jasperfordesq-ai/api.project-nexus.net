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
    name: 'Partner timebank',
    scopes: 'federation:read federation:write',
    rateLimit: '120',
    expiresAt: '',
  });
  const [createdKey, setCreatedKey] = useState<ApiKeyRecord | null>(null);
  const [consoleForm, setConsoleForm] = useState<ConsoleState>({
    method: 'GET',
    path: '/api/listings',
    body: '{\n  "title": "Example listing",\n  "type": "offer"\n}',
  });
  const [consoleResult, setConsoleResult] = useState<unknown>(null);
  const [consoleStatus, setConsoleStatus] = useState<'idle' | 'ok' | 'error'>('idle');

  usePageTitle('Developer Documentation');

  const endpointGroups = useMemo<EndpointGroup[]>(() => [
    {
      title: 'Authentication',
      description: 'HS256 JWT bearer is the API contract. Tokens are interoperable with the legacy PHP platform — same secret, same claim shape (sub, tenant_id, role, email). Tenant context is resolved from the JWT, request host, or X-Tenant-ID header.',
      items: [
        { method: 'POST', path: '/api/auth/login', auth: 'Public', note: 'Email + password + tenant_slug, returns access + refresh tokens.' },
        { method: 'POST', path: '/api/auth/refresh', auth: 'Public', note: 'Exchange refresh token for a new access token.' },
        { method: 'POST', path: '/api/auth/logout', auth: 'Bearer', note: 'Revokes the active refresh token.' },
        { method: 'GET', path: '/api/auth/validate', auth: 'Bearer', note: 'Validates the current access token.' },
        { method: 'POST', path: '/api/auth/2fa/verify', auth: 'Bearer', note: 'TOTP gate during login when 2FA is enabled.' },
        { method: 'POST', path: '/api/passkeys/authenticate/begin', auth: 'Public', note: 'Begins WebAuthn/FIDO2 passwordless login.' },
        { method: 'GET', path: '/swagger/v1/swagger.json', auth: 'Public (dev)', note: 'Swashbuckle OpenAPI document, exposed only in Development.' },
      ],
    },
    {
      title: 'Core member APIs',
      description: 'Tenant-isolated CRUD for the primary member surface. Every read is filtered to the caller’s tenant via EF Core global query filters; writes inject the tenant id automatically.',
      items: [
        { method: 'GET', path: '/api/users/me', auth: 'Bearer', note: 'Current user profile.' },
        { method: 'GET', path: '/api/listings', auth: 'Bearer', note: 'Browse listings (offers + requests).' },
        { method: 'POST', path: '/api/listings', auth: 'Bearer', note: 'Create a listing.' },
        { method: 'GET', path: '/api/wallet/balance', auth: 'Bearer', note: 'Time-credit balance for the current user.' },
        { method: 'POST', path: '/api/wallet/transfer', auth: 'Bearer', note: 'Transfer credits to another member.' },
        { method: 'GET', path: '/api/messages', auth: 'Bearer', note: 'List conversations.' },
      ],
    },
    {
      title: 'Real-time & notifications',
      description: 'Live updates use SignalR (WebSocket). Mobile push is FCM; browser push uses VAPID web-push. Tokens are scoped per-user, per-tenant.',
      items: [
        { method: 'WS', path: '/hubs/messages', auth: 'Bearer', note: 'SignalR hub for chat, typing indicators, and message-read receipts.' },
        { method: 'GET', path: '/api/notifications', auth: 'Bearer', note: 'In-app notification list.' },
        { method: 'GET', path: '/api/notifications/unread-count', auth: 'Bearer', note: 'Unread badge count.' },
        { method: 'POST', path: '/api/push/register', auth: 'Bearer', note: 'Register an FCM or web-push subscription.' },
      ],
    },
    {
      title: 'Federation',
      description: 'Timebank-to-timebank protocol layer (CreditCommons + Komunitin + native ingest + hour-transfer reconciliation). API keys here are the credential surface for partner timebanks integrating with this tenant.',
      items: [
        { method: 'GET', path: '/api/admin/federation/api-keys', auth: 'Admin', note: 'List tenant API keys for partner timebanks.' },
        { method: 'POST', path: '/api/admin/federation/api-keys', auth: 'Admin', note: 'Create a scoped key (full value returned once).' },
        { method: 'DELETE', path: '/api/admin/federation/api-keys/{id}', auth: 'Admin', note: 'Revoke a key.' },
        { method: 'POST', path: '/api/admin/federation/protocols/transfer', auth: 'Admin', note: 'Propose a federated hour transfer.' },
        { method: 'POST', path: '/api/admin/federation/protocols/reconcile', auth: 'Admin', note: 'Force reconciliation pass (cron runs every 5 min).' },
        { method: 'GET', path: '/api/federation/listings', auth: 'ApiKey', note: 'Public listings exposed to partner timebanks.' },
      ],
    },
    {
      title: 'AI assistant',
      description: 'Multi-provider AI (Ollama, Anthropic, OpenAI, Gemini) selected by tenant config Ai:Provider. Activity summaries and re-engagement nudges run via the named-agent endpoints.',
      items: [
        { method: 'GET', path: '/api/ai/status', auth: 'Bearer', note: 'Provider availability + model name.' },
        { method: 'POST', path: '/api/ai/chat', auth: 'Bearer', note: 'Single-turn chat completion.' },
        { method: 'POST', path: '/api/ai/conversations', auth: 'Bearer', note: 'Start a multi-turn conversation.' },
        { method: 'POST', path: '/api/admin/ai/agents/activity-summary', auth: 'Admin', note: 'ActivitySummariserAgent run.' },
        { method: 'POST', path: '/api/admin/ai/agents/nudge', auth: 'Admin', note: 'NudgeDrafterAgent run.' },
      ],
    },
    {
      title: 'Webhooks',
      description: 'V2 exposes a small set of receiver endpoints. Stripe webhooks verify signatures; the identity-verification webhook validates per-tenant secrets resolved from TenantConfig.',
      items: [
        { method: 'POST', path: '/api/webhooks/stripe/donations', auth: 'Stripe sig', note: 'Money donations: checkout.session.completed, payment_intent.payment_failed, charge.refunded.' },
        { method: 'POST', path: '/api/registration/webhook/{tenantId}', auth: 'Provider secret', note: 'Stripe Identity verification callback.' },
        { method: 'GET', path: '/sitemap.xml', auth: 'Public', note: 'Static + dynamic SEO sitemap (listings, blog, groups).' },
        { method: 'GET', path: '/robots.txt', auth: 'Public', note: 'Disallows /admin and /api; points to sitemap.' },
      ],
    },
  ], []);

  const loadProbes = useCallback(async () => {
    setIsLoading(true);
    const next: Probe[] = [
      { label: 'Health check', endpoint: '/health', status: 'checking' },
      { label: 'OpenAPI document', endpoint: '/swagger/v1/swagger.json', status: 'checking' },
      { label: 'Token validation', endpoint: '/api/auth/validate', status: isAuthenticated ? 'checking' : 'skipped' },
      { label: 'Listings', endpoint: '/api/listings', status: isAuthenticated ? 'checking' : 'skipped' },
      { label: 'Wallet balance', endpoint: '/api/wallet/balance', status: isAuthenticated ? 'checking' : 'skipped' },
      { label: 'Admin API keys', endpoint: '/api/admin/federation/api-keys', status: isAuthenticated ? 'checking' : 'skipped' },
    ];
    setProbes(next);

    try {
      const fetchJson = (url: string) => fetch(url)
        .then((res) => res.ok ? res.json().then((data) => ({ success: true, data })).catch(() => ({ success: true, data: null })) : { success: false, data: null })
        .catch(() => ({ success: false, data: null }));

      const [healthRes, openApiRes, validateRes, listingsRes, walletRes, keysRes] = await Promise.all([
        fetchJson('/health'),
        fetchJson('/swagger/v1/swagger.json'),
        isAuthenticated ? api.get<unknown>('/auth/validate').catch(() => null) : Promise.resolve(null),
        isAuthenticated ? api.get<unknown[]>('/listings').catch(() => null) : Promise.resolve(null),
        isAuthenticated ? api.get<unknown>('/wallet/balance').catch(() => null) : Promise.resolve(null),
        isAuthenticated ? api.get<ApiKeyRecord[]>('/admin/federation/api-keys').catch(() => null) : Promise.resolve(null),
      ]);

      setOpenApi(openApiRes?.data ?? null);
      setApiKeys(asArray(keysRes?.data) as ApiKeyRecord[]);
      setProbes([
        {
          label: 'Health check',
          endpoint: '/health',
          status: healthRes?.success ? 'ok' : 'error',
        },
        {
          label: 'OpenAPI document',
          endpoint: '/swagger/v1/swagger.json',
          status: openApiRes?.success ? 'ok' : 'error',
          count: openApiPathCount(openApiRes?.data),
        },
        {
          label: 'Token validation',
          endpoint: '/api/auth/validate',
          status: isAuthenticated ? (validateRes?.success ? 'ok' : 'error') : 'skipped',
        },
        {
          label: 'Listings',
          endpoint: '/api/listings',
          status: isAuthenticated ? (listingsRes?.success ? 'ok' : 'error') : 'skipped',
          count: asArray(listingsRes?.data).length,
        },
        {
          label: 'Wallet balance',
          endpoint: '/api/wallet/balance',
          status: isAuthenticated ? (walletRes?.success ? 'ok' : 'error') : 'skipped',
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
    if (mode === 'webhooks') return group.title === 'Webhooks';
    return group.title !== 'Webhooks';
  });

  return (
    <section className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center">
              <Code2 className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
            <Chip variant="flat" color="primary">ASP.NET Core 8 · JWT · Tenant-isolated</Chip>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-theme-primary tracking-normal">
            Developer documentation
          </h1>
          <p className="text-theme-muted mt-1 max-w-3xl">
            This is the V2 Project NEXUS API — an ASP.NET Core 8 backend serving the React member frontend and the embedded admin panel. Authentication is HS256 JWT, fully interoperable with the legacy PHP platform during the migration. Every read and write is scoped to a tenant via EF Core global query filters; the tenant is resolved from the JWT, request host, or the <code className="font-mono text-xs">X-Tenant-ID</code> header.
          </p>
          <p className="text-theme-subtle text-sm mt-2 max-w-3xl">
            Use the probes panel to verify the API is reachable, browse the endpoint catalog for the routes that ship today, and the console to exercise them with your current session. Marketplace and Caring Community are tracked parity gaps, so only implemented .NET routes are documented here.
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
                  {group.title === 'Authentication' ? <KeyRound className="w-5 h-5 text-primary" /> : group.title === 'Webhooks' ? <Webhook className="w-5 h-5 text-primary" /> : <Braces className="w-5 h-5 text-primary" />}
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
              <a href="/swagger/v1/swagger.json" target="_blank" rel="noreferrer">
                <Button size="sm" variant="flat" endContent={<ExternalLink className="w-4 h-4" />}>JSON</Button>
              </a>
              <a href="/swagger" target="_blank" rel="noreferrer">
                <Button size="sm" variant="flat" endContent={<ExternalLink className="w-4 h-4" />}>Swagger UI</Button>
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
