// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button, Chip, Input, Skeleton, Tab, Tabs, Textarea } from '@heroui/react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Eye,
  Handshake,
  MessageSquareWarning,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { EmptyState } from '@/components/feedback';
import { GlassCard } from '@/components/ui';
import { useAuth, useTenant, useToast } from '@/contexts';
import { usePageTitle } from '@/hooks';
import { api } from '@/lib/api';
import { logError } from '@/lib/logger';

type AnyRecord = Record<string, unknown>;

interface BrokerService extends AnyRecord {
  id?: string;
  name?: string;
  description?: string;
}

interface BrokerRequest extends AnyRecord {
  id?: number;
  service?: string;
  status?: string;
  created_at?: string;
  createdAt?: string;
}

interface BrokerStats extends AnyRecord {
  pending_exchanges?: number;
  unreviewed_messages?: number;
  high_risk_listings?: number;
  monitored_users?: number;
  active_brokers?: number;
  active_assignments?: number;
}

interface BrokerData {
  services: BrokerService[];
  requests: BrokerRequest[];
  assignments: AnyRecord[];
  brokers: AnyRecord[];
  exchanges: AnyRecord[];
  matches: AnyRecord[];
  stats: BrokerStats | null;
  configuration: AnyRecord | null;
  riskTags: AnyRecord[];
  messages: AnyRecord[];
  monitoredUsers: AnyRecord[];
}

const emptyData: BrokerData = {
  services: [],
  requests: [],
  assignments: [],
  brokers: [],
  exchanges: [],
  matches: [],
  stats: null,
  configuration: null,
  riskTags: [],
  messages: [],
  monitoredUsers: [],
};

interface RowAction {
  label: string;
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'default';
  onPress: (row: AnyRecord) => void;
}

const fallbackServices: BrokerService[] = [
  { id: 'matching', name: 'Matching support', description: 'Ask a broker to review matching options and next steps.' },
  { id: 'mediation', name: 'Exchange mediation', description: 'Get help with an exchange that needs coordination or safeguarding review.' },
];

function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === 'object') {
    const record = value as AnyRecord;
    for (const key of ['data', 'items', 'results', 'records', 'exchanges', 'matches']) {
      if (Array.isArray(record[key])) return record[key] as T[];
    }
  }
  return [];
}

function stringValue(record: AnyRecord | null | undefined, ...keys: string[]): string {
  if (!record) return '';
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
  }
  return '';
}

function numberValue(record: AnyRecord | null | undefined, ...keys: string[]): number {
  if (!record) return 0;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && value.trim() && !Number.isNaN(Number(value))) return Number(value);
  }
  return 0;
}

function dateValue(record: AnyRecord | null | undefined, ...keys: string[]): string {
  const raw = stringValue(record, ...keys);
  if (!raw) return 'No date';
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? raw : date.toLocaleDateString();
}

function routeMode(pathname: string) {
  if (pathname.includes('/requests')) return 'requests';
  if (pathname.includes('/matches')) return 'matches';
  if (pathname.includes('/oversight')) return 'oversight';
  return 'home';
}

export function BrokerParityPage() {
  const { pathname } = useLocation();
  const mode = routeMode(pathname);
  const { user, isAuthenticated } = useAuth();
  const { tenantPath } = useTenant();
  const toast = useToast();
  const [data, setData] = useState<BrokerData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestForm, setRequestForm] = useState({ service: 'matching', notes: '' });
  const [matchQuery, setMatchQuery] = useState('');
  const [assignmentForm, setAssignmentForm] = useState({ brokerId: '', memberId: '', notes: '' });
  const [noteForm, setNoteForm] = useState({ memberId: '', exchangeId: '', content: '', isPrivate: true });
  const [reviewNotes, setReviewNotes] = useState('Reviewed from broker parity workspace');

  usePageTitle('Broker support');

  const userRole = String((user as AnyRecord | null)?.role ?? '');
  const hasBrokerAccess = Boolean(user?.is_admin || user?.is_super_admin || userRole === 'admin' || userRole === 'super_admin' || userRole === 'broker');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [servicesRes, requestsRes, exchangesRes, matchesRes, statsRes, assignmentsRes, brokersRes, configRes, riskTagsRes, messagesRes, monitoringRes] = await Promise.all([
        isAuthenticated ? api.get<BrokerService[]>('/broker/services').catch(() => null) : Promise.resolve(null),
        isAuthenticated ? api.get<BrokerRequest[]>('/broker/requests/my').catch(() => null) : Promise.resolve(null),
        isAuthenticated ? api.get<AnyRecord[]>('/v2/exchanges?status=active&limit=8').catch(() => null) : Promise.resolve(null),
        isAuthenticated ? api.get<AnyRecord>('/v2/matches/all').catch(() => null) : Promise.resolve(null),
        hasBrokerAccess ? api.get<BrokerStats>('/v2/admin/broker/dashboard').catch(() => null) : Promise.resolve(null),
        hasBrokerAccess ? api.get<AnyRecord[]>('/v2/admin/broker/assignments').catch(() => null) : Promise.resolve(null),
        hasBrokerAccess ? api.get<AnyRecord[]>('/v2/admin/broker/brokers').catch(() => null) : Promise.resolve(null),
        hasBrokerAccess ? api.get<AnyRecord>('/v2/admin/broker/configuration').catch(() => null) : Promise.resolve(null),
        hasBrokerAccess ? api.get<AnyRecord[]>('/v2/admin/broker/risk-tags?risk_level=high').catch(() => null) : Promise.resolve(null),
        hasBrokerAccess ? api.get<AnyRecord>('/v2/admin/broker/messages?filter=unreviewed').catch(() => null) : Promise.resolve(null),
        hasBrokerAccess ? api.get<AnyRecord[]>('/v2/admin/broker/monitoring').catch(() => null) : Promise.resolve(null),
      ]);

      setData({
        services: asArray(servicesRes?.data).length > 0 ? asArray(servicesRes?.data) : fallbackServices,
        requests: asArray(requestsRes?.data),
        assignments: asArray(assignmentsRes?.data),
        brokers: asArray(brokersRes?.data),
        exchanges: asArray(exchangesRes?.data),
        matches: asArray((matchesRes?.data as AnyRecord | undefined)?.matches ?? matchesRes?.data),
        stats: statsRes?.data ?? null,
        configuration: configRes?.data ?? null,
        riskTags: asArray(riskTagsRes?.data),
        messages: asArray(messagesRes?.data),
        monitoredUsers: asArray(monitoringRes?.data),
      });
    } catch (err) {
      logError('BrokerParityPage.loadData', err);
      setError('Broker support data could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [hasBrokerAccess, isAuthenticated]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const submitRequest = async (event: FormEvent) => {
    event.preventDefault();
    if (!isAuthenticated) {
      toast.error('Sign in to request broker support');
      return;
    }
    setSaving(true);
    try {
      const res = await api.post('/broker/requests', {
        service: requestForm.service,
        notes: requestForm.notes,
      });
      if (res.success) {
        toast.success('Broker request submitted');
        setRequestForm((prev) => ({ ...prev, notes: '' }));
        await loadData();
      } else {
        toast.error(res.error ?? 'Could not submit broker request');
      }
    } finally {
      setSaving(false);
    }
  };

  const submitAssignment = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const res = await api.post('/v2/admin/broker/assignments', {
        broker_id: Number(assignmentForm.brokerId),
        member_id: Number(assignmentForm.memberId),
        notes: assignmentForm.notes,
      });
      if (res.success) {
        toast.success('Broker assignment created');
        setAssignmentForm({ brokerId: '', memberId: '', notes: '' });
        await loadData();
      } else {
        toast.error(res.error ?? 'Could not create assignment');
      }
    } finally {
      setSaving(false);
    }
  };

  const submitBrokerNote = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const res = await api.post('/v2/admin/broker/notes', {
        member_id: noteForm.memberId ? Number(noteForm.memberId) : null,
        exchange_id: noteForm.exchangeId ? Number(noteForm.exchangeId) : null,
        content: noteForm.content,
        is_private: noteForm.isPrivate,
      });
      if (res.success) {
        toast.success('Broker note saved');
        setNoteForm({ memberId: '', exchangeId: '', content: '', isPrivate: true });
        await loadData();
      } else {
        toast.error(res.error ?? 'Could not save broker note');
      }
    } finally {
      setSaving(false);
    }
  };

  const reviewBrokerMessage = async (row: AnyRecord, action: 'approve' | 'flag') => {
    const id = numberValue(row, 'id', 'message_id');
    if (!id) return;
    setSaving(true);
    try {
      const res = await api.post(`/v2/admin/broker/messages/${id}/${action}`, {
        notes: reviewNotes,
        severity: action === 'flag' ? 'high' : 'low',
        reason: action === 'flag' ? 'manual_flag' : 'reviewed',
      });
      if (res.success) {
        toast.success(action === 'flag' ? 'Message flagged' : 'Message approved');
        await loadData();
      } else {
        toast.error(res.error ?? 'Could not review message');
      }
    } finally {
      setSaving(false);
    }
  };

  const reviewExchange = async (row: AnyRecord, action: 'approve' | 'reject') => {
    const id = numberValue(row, 'id', 'exchange_id');
    if (!id) return;
    setSaving(true);
    try {
      const res = await api.post(`/v2/admin/broker/exchanges/${id}/${action}`, { reason: reviewNotes });
      if (res.success) {
        toast.success(action === 'approve' ? 'Exchange approved' : 'Exchange rejected');
        await loadData();
      } else {
        toast.error(res.error ?? 'Could not review exchange');
      }
    } finally {
      setSaving(false);
    }
  };

  const completeAssignment = async (row: AnyRecord) => {
    const id = numberValue(row, 'id', 'assignment_id');
    if (!id) return;
    setSaving(true);
    try {
      const res = await api.put(`/v2/admin/broker/assignments/${id}/complete`, {});
      if (res.success) {
        toast.success('Assignment completed');
        await loadData();
      } else {
        toast.error(res.error ?? 'Could not complete assignment');
      }
    } finally {
      setSaving(false);
    }
  };

  const visibleMatches = useMemo(() => {
    if (!matchQuery.trim()) return data.matches;
    const query = matchQuery.trim().toLowerCase();
    return data.matches.filter((match) => {
      return [
        stringValue(match, 'title', 'name'),
        stringValue(match, 'description'),
        stringValue(match, 'source_type', 'sourceType'),
      ].join(' ').toLowerCase().includes(query);
    });
  }, [data.matches, matchQuery]);

  const header = (
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center">
            <Handshake className="w-5 h-5 text-white" aria-hidden="true" />
          </div>
          <Chip variant="flat" color="primary">Broker parity</Chip>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-theme-primary tracking-normal">Broker support</h1>
        <p className="text-theme-muted mt-1 max-w-3xl">
          Member support requests, exchange context, matching signals, and authorised broker oversight share one V1-compatible workspace.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="flat" className="bg-theme-elevated text-theme-primary" startContent={<RefreshCw className="w-4 h-4" />} onPress={loadData}>
          Refresh
        </Button>
        <Link to={tenantPath('/exchanges')}>
          <Button className="bg-gradient-to-r from-teal-500 to-blue-600 text-white" startContent={<ClipboardList className="w-4 h-4" />}>
            Exchanges
          </Button>
        </Link>
      </div>
    </div>
  );

  if (loading) {
    return (
      <section className="space-y-5">
        {header}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((item) => (
            <GlassCard key={item} className="p-5 space-y-3">
              <Skeleton className="rounded-lg"><div className="h-6 w-2/3 rounded-lg bg-default-300" /></Skeleton>
              <Skeleton className="rounded-lg"><div className="h-4 w-full rounded-lg bg-default-200" /></Skeleton>
              <Skeleton className="rounded-lg"><div className="h-24 w-full rounded-lg bg-default-200" /></Skeleton>
            </GlassCard>
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="space-y-5">
        {header}
        <GlassCard className="p-8 text-center">
          <p className="text-danger mb-4">{error}</p>
          <Button color="primary" variant="flat" onPress={loadData}>Try again</Button>
        </GlassCard>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      {header}

      <div className="flex flex-wrap gap-2">
        <BrokerNavButton to="/broker" active={mode === 'home'} label="Support" />
        <BrokerNavButton to="/broker/requests" active={mode === 'requests'} label="Requests" />
        <BrokerNavButton to="/broker/matches" active={mode === 'matches'} label="Matches" />
        {hasBrokerAccess && <BrokerNavButton to="/broker/oversight" active={mode === 'oversight'} label="Oversight" />}
      </div>

      {!isAuthenticated && (
        <GlassCard className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-theme-primary">Sign in for broker requests</h2>
            <p className="text-sm text-theme-muted mt-1">The service catalogue is visible, but requests and exchange context require a member session.</p>
          </div>
          <Link to={tenantPath('/login')}>
            <Button color="primary" endContent={<ArrowRight className="w-4 h-4" />}>Sign in</Button>
          </Link>
        </GlassCard>
      )}

      {mode === 'home' && (
        <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-4">
          <GlassCard className="p-5">
            <h2 className="text-lg font-semibold text-theme-primary mb-4">Request support</h2>
            <form className="space-y-4" onSubmit={submitRequest}>
              <Input
                label="Service"
                value={requestForm.service}
                onChange={(event) => setRequestForm((prev) => ({ ...prev, service: event.target.value }))}
              />
              <Textarea
                label="Notes"
                minRows={5}
                value={requestForm.notes}
                onChange={(event) => setRequestForm((prev) => ({ ...prev, notes: event.target.value }))}
              />
              <Button type="submit" color="primary" isLoading={saving} startContent={<Handshake className="w-4 h-4" />}>
                Send request
              </Button>
            </form>
          </GlassCard>
          <div className="space-y-4">
            <MetricStrip
              items={[
                { label: 'Services', value: String(data.services.length), icon: Sparkles },
                { label: 'My requests', value: String(data.requests.length), icon: ClipboardList },
                { label: 'Assignments', value: String(data.assignments.length), icon: CheckCircle2 },
                { label: 'Matches', value: String(data.matches.length), icon: ShieldCheck },
              ]}
            />
            <WorkflowPanel title="Service catalogue" icon={<Handshake className="w-5 h-5" />}>
              {data.services.length === 0 ? (
                <EmptyState icon={<Handshake className="w-12 h-12" />} title="No broker services" description="Broker services will appear when the API returns the catalogue." />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {data.services.map((service) => (
                    <button
                      key={service.id ?? service.name}
                      type="button"
                      className="text-left rounded-lg bg-theme-elevated p-4 hover:bg-theme-hover transition-colors"
                      onClick={() => setRequestForm((prev) => ({ ...prev, service: String(service.id ?? service.name ?? '') }))}
                    >
                      <p className="font-semibold text-theme-primary">{service.name ?? service.id}</p>
                      <p className="text-sm text-theme-muted mt-1">{service.description ?? 'Broker-assisted member workflow'}</p>
                    </button>
                  ))}
                </div>
              )}
            </WorkflowPanel>
          </div>
        </div>
      )}

      {mode === 'requests' && (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-4">
          <WorkflowPanel title="My broker requests" icon={<ClipboardList className="w-5 h-5" />}>
            <RecordList rows={data.requests} emptyTitle="No broker requests" />
          </WorkflowPanel>
          <WorkflowPanel title="Active exchanges" icon={<Handshake className="w-5 h-5" />}>
            <RecordList
              rows={data.exchanges}
              emptyTitle="No active exchanges"
              actions={hasBrokerAccess ? [
                { label: 'Approve', color: 'success', onPress: (row) => reviewExchange(row, 'approve') },
                { label: 'Reject', color: 'danger', onPress: (row) => reviewExchange(row, 'reject') },
              ] : undefined}
            />
          </WorkflowPanel>
        </div>
      )}

      {mode === 'matches' && (
        <div className="space-y-4">
          <GlassCard className="p-4">
            <div className="flex flex-col md:flex-row gap-3">
              <Input
                value={matchQuery}
                onChange={(event) => setMatchQuery(event.target.value)}
                placeholder="Search brokerable matches"
                startContent={<Search className="w-4 h-4 text-theme-subtle" />}
              />
              <Link to={tenantPath('/matches')}>
                <Button variant="flat" className="bg-theme-elevated text-theme-primary" endContent={<ArrowRight className="w-4 h-4" />}>
                  Full matches
                </Button>
              </Link>
            </div>
          </GlassCard>
          <WorkflowPanel title="Matching signals" icon={<Sparkles className="w-5 h-5" />}>
            <RecordList rows={visibleMatches} emptyTitle="No matches available" />
          </WorkflowPanel>
        </div>
      )}

      {mode === 'oversight' && hasBrokerAccess && (
        <div className="space-y-4">
          <MetricStrip
            items={[
              { label: 'Pending exchanges', value: String(numberValue(data.stats, 'pending_exchanges')), icon: Handshake },
              { label: 'Unreviewed messages', value: String(numberValue(data.stats, 'unreviewed_messages')), icon: MessageSquareWarning },
              { label: 'High risk listings', value: String(numberValue(data.stats, 'high_risk_listings')), icon: ShieldAlert },
              { label: 'Active brokers', value: String(numberValue(data.stats, 'active_brokers') || data.brokers.length), icon: Eye },
            ]}
          />
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <WorkflowPanel title="Create assignment" icon={<ClipboardList className="w-5 h-5" />}>
              <form className="space-y-3" onSubmit={submitAssignment}>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Broker ID" value={assignmentForm.brokerId} onChange={(event) => setAssignmentForm((prev) => ({ ...prev, brokerId: event.target.value }))} />
                  <Input label="Member ID" value={assignmentForm.memberId} onChange={(event) => setAssignmentForm((prev) => ({ ...prev, memberId: event.target.value }))} />
                </div>
                <Textarea label="Assignment notes" value={assignmentForm.notes} onChange={(event) => setAssignmentForm((prev) => ({ ...prev, notes: event.target.value }))} />
                <Button type="submit" color="primary" isLoading={saving} startContent={<ClipboardList className="w-4 h-4" />}>Assign</Button>
              </form>
            </WorkflowPanel>
            <WorkflowPanel title="Broker note" icon={<MessageSquareWarning className="w-5 h-5" />}>
              <form className="space-y-3" onSubmit={submitBrokerNote}>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Member ID" value={noteForm.memberId} onChange={(event) => setNoteForm((prev) => ({ ...prev, memberId: event.target.value }))} />
                  <Input label="Exchange ID" value={noteForm.exchangeId} onChange={(event) => setNoteForm((prev) => ({ ...prev, exchangeId: event.target.value }))} />
                </div>
                <Textarea label="Note" value={noteForm.content} onChange={(event) => setNoteForm((prev) => ({ ...prev, content: event.target.value }))} />
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" color="primary" isLoading={saving} startContent={<MessageSquareWarning className="w-4 h-4" />}>Save note</Button>
                  <Button
                    type="button"
                    variant={noteForm.isPrivate ? 'solid' : 'flat'}
                    color={noteForm.isPrivate ? 'secondary' : 'default'}
                    onPress={() => setNoteForm((prev) => ({ ...prev, isPrivate: !prev.isPrivate }))}
                  >
                    {noteForm.isPrivate ? 'Private' : 'Shared'}
                  </Button>
                </div>
              </form>
            </WorkflowPanel>
          </div>
          <GlassCard className="p-4">
            <Input
              label="Review note used by quick actions"
              value={reviewNotes}
              onChange={(event) => setReviewNotes(event.target.value)}
            />
          </GlassCard>
          <Tabs variant="underlined">
            <Tab key="assignments" title={`Assignments (${data.assignments.length})`}>
              <WorkflowPanel title="Broker assignments" icon={<ClipboardList className="w-5 h-5" />}>
                <RecordList
                  rows={data.assignments}
                  emptyTitle="No broker assignments"
                  actions={[{ label: 'Complete', color: 'success', onPress: completeAssignment }]}
                />
              </WorkflowPanel>
            </Tab>
            <Tab key="messages" title={`Messages (${data.messages.length})`}>
              <WorkflowPanel title="Unreviewed messages" icon={<MessageSquareWarning className="w-5 h-5" />}>
                <RecordList
                  rows={data.messages}
                  emptyTitle="No unreviewed messages"
                  actions={[
                    { label: 'Approve', color: 'success', onPress: (row) => reviewBrokerMessage(row, 'approve') },
                    { label: 'Flag', color: 'warning', onPress: (row) => reviewBrokerMessage(row, 'flag') },
                  ]}
                />
              </WorkflowPanel>
            </Tab>
            <Tab key="risk" title={`Risk tags (${data.riskTags.length})`}>
              <WorkflowPanel title="High risk tags" icon={<AlertTriangle className="w-5 h-5" />}>
                <RecordList rows={data.riskTags} emptyTitle="No high risk tags" />
              </WorkflowPanel>
            </Tab>
            <Tab key="monitoring" title={`Monitoring (${data.monitoredUsers.length})`}>
              <WorkflowPanel title="Monitored users" icon={<Users className="w-5 h-5" />}>
                <RecordList rows={data.monitoredUsers} emptyTitle="No monitored users" />
              </WorkflowPanel>
            </Tab>
          </Tabs>
        </div>
      )}
    </section>
  );
}

function BrokerNavButton({ to, active, label }: { to: string; active: boolean; label: string }) {
  const { tenantPath } = useTenant();
  return (
    <Link to={tenantPath(to)}>
      <Button variant={active ? 'solid' : 'flat'} color={active ? 'primary' : 'default'} className={active ? undefined : 'bg-theme-elevated text-theme-primary'}>
        {label}
      </Button>
    </Link>
  );
}

function MetricStrip({ items }: { items: Array<{ label: string; value: string; icon: LucideIcon }> }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <GlassCard key={item.label} className="p-4">
            <p className="text-xs uppercase tracking-wide text-theme-subtle">{item.label}</p>
            <div className="flex items-end justify-between gap-3 mt-1">
              <p className="text-2xl font-bold text-theme-primary">{item.value}</p>
              <Icon className="w-5 h-5 text-primary" aria-hidden="true" />
            </div>
          </GlassCard>
        );
      })}
    </div>
  );
}

function WorkflowPanel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <GlassCard className="p-5">
      <h2 className="text-lg font-semibold text-theme-primary flex items-center gap-2 mb-4">
        <span className="w-9 h-9 rounded-lg bg-theme-elevated flex items-center justify-center text-primary">{icon}</span>
        {title}
      </h2>
      {children}
    </GlassCard>
  );
}

function RecordList({ rows, emptyTitle, actions = [] }: { rows: AnyRecord[]; emptyTitle: string; actions?: RowAction[] }) {
  if (rows.length === 0) {
    return <EmptyState icon={<ClipboardList className="w-12 h-12" />} title={emptyTitle} description="Records will appear here when the backing API returns data." />;
  }

  return (
    <div className="space-y-3">
      {rows.slice(0, 12).map((row, index) => (
        <div key={stringValue(row, 'id') || index} className="rounded-lg bg-theme-elevated p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-theme-primary truncate">
                {stringValue(row, 'title', 'name', 'service', 'subject') || `Record ${index + 1}`}
              </p>
              <p className="text-sm text-theme-muted line-clamp-2 mt-1">
                {stringValue(row, 'description', 'notes', 'message', 'reason') || stringValue(row, 'source_type', 'type') || 'No details'}
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Chip size="sm" variant="flat">{stringValue(row, 'status', 'risk_level', 'severity') || dateValue(row, 'created_at', 'createdAt')}</Chip>
              {actions.map((action) => (
                <Button
                  key={action.label}
                  size="sm"
                  variant="flat"
                  color={action.color ?? 'default'}
                  onPress={() => action.onPress(row)}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default BrokerParityPage;
