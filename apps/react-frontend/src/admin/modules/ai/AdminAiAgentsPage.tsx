// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * AI Agents (Admin) — Phase 69 named-agent runner.
 *
 * Endpoints (real, in AdminAiAgentsController):
 *   POST /api/admin/ai/agents/activity-summary?userId=...&days=...
 *   POST /api/admin/ai/agents/nudge?userId=...
 *
 * Each agent dispatches via the active IAiProvider (Ollama/Anthropic/OpenAI/
 * Gemini). The page gives admins a one-click way to:
 *   - Generate a prose activity summary for a member (CRM use)
 *   - Draft a re-engagement nudge for a stale member (review-then-send)
 */

import { useCallback, useState } from 'react';
import {
  Button, Card, CardBody, CardHeader, Input, Spinner,
} from '@heroui/react';
import { Bot, Activity, MessageSquare, Copy } from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { useToast } from '@/contexts';
import { api } from '@/lib/api';
import { PageHeader } from '../../components';

interface SummaryResponse {
  user_id: number;
  days: number;
  summary: string;
}

interface NudgeResponse {
  user_id: number;
  draft: string;
}

export default function AdminAiAgentsPage() {
  usePageTitle('Admin - AI Agents');
  const toast = useToast();

  const [summaryUserId, setSummaryUserId] = useState('');
  const [summaryDays, setSummaryDays] = useState('30');
  const [summaryRunning, setSummaryRunning] = useState(false);
  const [summaryResult, setSummaryResult] = useState<SummaryResponse | null>(null);

  const [nudgeUserId, setNudgeUserId] = useState('');
  const [nudgeRunning, setNudgeRunning] = useState(false);
  const [nudgeResult, setNudgeResult] = useState<NudgeResponse | null>(null);

  const runSummary = useCallback(async () => {
    const id = parseInt(summaryUserId, 10);
    if (!id) { toast.error('User ID required'); return; }
    const days = Math.max(1, Math.min(365, parseInt(summaryDays, 10) || 30));
    setSummaryRunning(true);
    setSummaryResult(null);
    try {
      const res = await api.post<SummaryResponse>(
        `/v2/admin/ai/agents/activity-summary?userId=${id}&days=${days}`, {});
      if (res.success && res.data) setSummaryResult((res.data as unknown) as SummaryResponse);
      else toast.error('Summary failed');
    } catch { toast.error('Summary failed'); }
    finally { setSummaryRunning(false); }
  }, [summaryUserId, summaryDays, toast]);

  const runNudge = useCallback(async () => {
    const id = parseInt(nudgeUserId, 10);
    if (!id) { toast.error('User ID required'); return; }
    setNudgeRunning(true);
    setNudgeResult(null);
    try {
      const res = await api.post<NudgeResponse>(`/v2/admin/ai/agents/nudge?userId=${id}`, {});
      if (res.success && res.data) setNudgeResult((res.data as unknown) as NudgeResponse);
      else toast.error('Nudge failed');
    } catch { toast.error('Nudge failed'); }
    finally { setNudgeRunning(false); }
  }, [nudgeUserId, toast]);

  const copy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(
      () => toast.success('Copied'),
      () => toast.error('Copy failed'),
    );
  }, [toast]);

  return (
    <div>
      <PageHeader
        title="AI Agents"
        description="Run named AI agents on the active provider (Phase 69). Summaries and nudges are NOT sent automatically — they're drafted for the admin to review and dispatch via the CRM / messaging tools."
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Activity Summariser */}
        <Card shadow="sm">
          <CardHeader className="flex items-center gap-2">
            <Activity size={18} className="text-primary" />
            <h3 className="text-lg font-semibold">Activity Summariser</h3>
          </CardHeader>
          <CardBody className="space-y-3">
            <p className="text-xs text-default-500">
              Pulls the user&apos;s listings, transactions, and connections from the last N days
              and asks the AI for a 2–3 sentence prose summary. Falls back to a deterministic
              one-liner if the AI provider is unconfigured or fails.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Input label="User ID" value={summaryUserId}
                onValueChange={setSummaryUserId} type="number" isRequired />
              <Input label="Day window" value={summaryDays}
                onValueChange={setSummaryDays} type="number" min={1} max={365} />
            </div>
            <Button color="primary" onPress={runSummary} isLoading={summaryRunning}
              startContent={<Bot size={16} />}>
              Run Activity Summariser
            </Button>
            {summaryResult && (
              <div className="rounded-lg bg-default-50 p-3 text-sm">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-xs text-default-500">User #{summaryResult.user_id} · {summaryResult.days} days</p>
                  <Button size="sm" variant="flat" startContent={<Copy size={12} />}
                    onPress={() => copy(summaryResult.summary)}>Copy</Button>
                </div>
                <p className="whitespace-pre-wrap">{summaryResult.summary}</p>
              </div>
            )}
            {summaryRunning && <div className="flex justify-center py-2"><Spinner size="sm" /></div>}
          </CardBody>
        </Card>

        {/* Nudge Drafter */}
        <Card shadow="sm">
          <CardHeader className="flex items-center gap-2">
            <MessageSquare size={18} className="text-warning" />
            <h3 className="text-lg font-semibold">Re-engagement Nudge Drafter</h3>
          </CardHeader>
          <CardBody className="space-y-3">
            <p className="text-xs text-default-500">
              Drafts a short, warm message for a stale member. Output is a 1–2 sentence body
              you can paste into the message composer. The agent does NOT send anything.
            </p>
            <Input label="User ID" value={nudgeUserId}
              onValueChange={setNudgeUserId} type="number" isRequired />
            <Button color="warning" onPress={runNudge} isLoading={nudgeRunning}
              startContent={<Bot size={16} />}>
              Draft nudge
            </Button>
            {nudgeResult && (
              <div className="rounded-lg bg-default-50 p-3 text-sm">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-xs text-default-500">User #{nudgeResult.user_id}</p>
                  <Button size="sm" variant="flat" startContent={<Copy size={12} />}
                    onPress={() => copy(nudgeResult.draft)}>Copy</Button>
                </div>
                <p className="whitespace-pre-wrap">{nudgeResult.draft}</p>
              </div>
            )}
            {nudgeRunning && <div className="flex justify-center py-2"><Spinner size="sm" /></div>}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
