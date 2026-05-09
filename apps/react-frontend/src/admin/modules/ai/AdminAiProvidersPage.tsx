// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * AI Providers (Admin) — Phase 69 multi-provider abstraction.
 * Endpoints (real, in AdminAiProvidersController):
 *   GET  /api/admin/ai/providers
 *   POST /api/admin/ai/providers/test
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Button, Card, CardBody, CardHeader, Chip, Input, Select, SelectItem,
  Spinner, Textarea,
} from '@heroui/react';
import { Cpu, RefreshCw, Play } from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { useToast } from '@/contexts';
import { api } from '@/lib/api';
import { PageHeader } from '../../components';

interface ProviderStatus {
  name: string;
  is_configured: boolean;
  is_active: boolean;
}

interface ProvidersResponse {
  data: ProviderStatus[];
  active: string;
}

export default function AdminAiProvidersPage() {
  usePageTitle('Admin - AI Providers');
  const toast = useToast();
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [active, setActive] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const [testProvider, setTestProvider] = useState<string>('');
  const [testSystem, setTestSystem] = useState('You are a helpful assistant. Reply concisely.');
  const [testUser, setTestUser] = useState('Reply with the single word OK.');
  const [testRunning, setTestRunning] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; provider: string; response?: string; error?: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<ProvidersResponse>('/v2/admin/ai/providers');
      if (res.success && res.data) {
        const payload = (res.data as unknown) as ProvidersResponse;
        setProviders(payload.data ?? []);
        setActive(payload.active ?? '');
        if (!testProvider && payload.active) setTestProvider(payload.active);
      }
    } catch { toast.error('Failed to load AI providers'); }
    finally { setLoading(false); }
  }, [toast, testProvider]);

  useEffect(() => { load(); }, [load]);

  const runTest = useCallback(async () => {
    setTestRunning(true);
    setTestResult(null);
    try {
      const res = await api.post<{ ok: boolean; provider: string; response?: string; error?: string }>(
        '/v2/admin/ai/providers/test',
        { provider: testProvider || null, system_prompt: testSystem, user_prompt: testUser },
      );
      if (res.success && res.data) {
        const payload = (res.data as unknown) as { ok: boolean; provider: string; response?: string; error?: string };
        setTestResult(payload);
      } else { toast.error('Test request failed'); }
    } catch { toast.error('Test request failed'); }
    finally { setTestRunning(false); }
  }, [testProvider, testSystem, testUser, toast]);

  return (
    <div>
      <PageHeader
        title="AI Providers"
        description="Multi-provider AI abstraction (Phase 69). Active provider = the one resolved at chat-time. Configure secrets via Ai:Provider, Ai:Anthropic:ApiKey, Ai:OpenAI:ApiKey, Ai:Gemini:ApiKey."
        actions={
          <Button variant="flat" size="sm" startContent={<RefreshCw size={16} />}
            onPress={load} isLoading={loading}>Refresh</Button>
        }
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card shadow="sm">
          <CardHeader className="flex items-center gap-2">
            <Cpu size={18} className="text-primary" />
            <h3 className="text-lg font-semibold">Available providers</h3>
          </CardHeader>
          <CardBody>
            {loading ? <Spinner /> : (
              <ul className="space-y-2">
                {providers.map((p) => (
                  <li key={p.name} className="flex items-center justify-between rounded-lg border border-divider p-3">
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-default-500">
                        {p.is_configured ? 'Configured' : 'Not configured (no API key)'}
                      </p>
                    </div>
                    {p.is_active && <Chip color="success" variant="flat" size="sm">Active</Chip>}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-default-400 mt-3">
              Active: <code>{active || '—'}</code>
            </p>
          </CardBody>
        </Card>

        <Card shadow="sm">
          <CardHeader className="flex items-center gap-2">
            <Play size={18} className="text-primary" />
            <h3 className="text-lg font-semibold">Test prompt</h3>
          </CardHeader>
          <CardBody className="space-y-3">
            <Select label="Provider" size="sm" variant="bordered"
              selectedKeys={new Set([testProvider || 'auto'])}
              onSelectionChange={(keys) => {
                const v = Array.from(keys)[0] as string | undefined;
                setTestProvider(v === 'auto' ? '' : v ?? '');
              }}>
              <SelectItem key="auto" textValue="Auto (active)">Auto (active)</SelectItem>
              {(providers.map((p) => (
                <SelectItem key={p.name} textValue={p.name}>{p.name}</SelectItem>
              )) as never)}
            </Select>
            <Input label="System prompt" value={testSystem}
              onValueChange={setTestSystem} variant="bordered" size="sm" />
            <Textarea label="User prompt" value={testUser}
              onValueChange={setTestUser} variant="bordered" size="sm" minRows={2} />
            <Button color="primary" startContent={<Play size={16} />}
              onPress={runTest} isLoading={testRunning}>Run test</Button>
            {testResult && (
              <div className={`rounded-lg p-3 text-sm ${testResult.ok ? 'bg-success-50 text-success-900' : 'bg-danger-50 text-danger-900'}`}>
                <p className="font-medium mb-1">
                  {testResult.ok ? '✓ OK' : '✗ Failed'} via <code>{testResult.provider}</code>
                </p>
                <pre className="whitespace-pre-wrap text-xs">{testResult.response || testResult.error}</pre>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
