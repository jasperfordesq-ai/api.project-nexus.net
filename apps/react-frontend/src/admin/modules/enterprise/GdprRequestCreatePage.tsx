// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * GDPR Request Create (Admin) — intake form for data subject requests.
 *
 * Target: POST /api/v2/admin/enterprise/gdpr/requests
 * (writes through AdminExplicitParityController's PersistCompatibilityWrite
 * path; the typed DataExportRequests / DataDeletionRequests rows are read
 * back on the detail page).
 *
 * User search: GET /api/admin/users/search?q=… (AdminController).
 */

import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button, Card, CardBody, CardHeader, Input, Select, SelectItem, Spinner,
  Textarea, Chip,
} from '@heroui/react';
import { Search, Send, ShieldQuestion } from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { useToast } from '@/contexts';
import { api } from '@/lib/api';
import { PageHeader } from '../../components';

type RequestType = 'access' | 'portability' | 'erasure' | 'rectification';

interface UserHit {
  id: number;
  email: string;
  full_name?: string;
  firstName?: string;
  lastName?: string;
}

const REQUEST_TYPES: Array<{ key: RequestType; label: string; description: string }> = [
  { key: 'access', label: 'Access (Art. 15)', description: 'Subject access — copy of personal data held.' },
  { key: 'portability', label: 'Portability (Art. 20)', description: 'Machine-readable export of subject data.' },
  { key: 'erasure', label: 'Erasure / RTBF (Art. 17)', description: 'Right-to-be-forgotten. Deadline must be ≥30 days.' },
  { key: 'rectification', label: 'Rectification (Art. 16)', description: 'Correct inaccurate personal data.' },
];

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function GdprRequestCreatePage() {
  usePageTitle('Admin - Create GDPR Request');
  const toast = useToast();
  const navigate = useNavigate();

  const [userQuery, setUserQuery] = useState('');
  const [userHits, setUserHits] = useState<UserHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserHit | null>(null);
  const [requestType, setRequestType] = useState<RequestType>('access');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [deadline, setDeadline] = useState(daysFromNow(30));
  const [submitting, setSubmitting] = useState(false);

  const searchUsers = useCallback(async () => {
    if (!userQuery.trim()) return;
    setSearching(true);
    try {
      const res = await api.get<UserHit[]>(`/admin/users/search?q=${encodeURIComponent(userQuery.trim())}`);
      if (res.success) {
        const payload = (res.data as unknown) as UserHit[] | { data?: UserHit[] };
        const rows = Array.isArray(payload) ? payload : (payload?.data ?? []);
        setUserHits(rows);
      }
    } catch {
      toast.error('User search failed');
    } finally {
      setSearching(false);
    }
  }, [userQuery, toast]);

  const validation = useMemo(() => {
    if (!selectedUser) return 'Pick a user';
    if (!reason.trim() || reason.trim().length < 5) return 'Reason is required (≥5 chars)';
    if (!deadline) return 'Deadline is required';
    if (requestType === 'erasure') {
      const d = new Date(deadline);
      const minDeadline = new Date();
      minDeadline.setDate(minDeadline.getDate() + 30);
      if (d < minDeadline) return 'Erasure deadline must be at least 30 days from today';
    }
    return null;
  }, [selectedUser, reason, deadline, requestType]);

  const submit = useCallback(async () => {
    if (validation || !selectedUser) return;
    setSubmitting(true);
    try {
      const res = await api.request<{ id?: number }>('/v2/admin/enterprise/gdpr/requests', {
        method: 'POST',
        body: {
          user_id: selectedUser.id,
          type: requestType,
          reason: reason.trim(),
          notes: notes.trim() || null,
          deadline,
        },
      });
      if (res.success) {
        const payload = (res.data as unknown) as { id?: number; data?: { id?: number } } | null;
        const newId = payload?.id ?? payload?.data?.id;
        toast.success('GDPR request created');
        if (newId) {
          navigate(`/admin/enterprise/gdpr/requests/${newId}`);
        } else {
          navigate('/admin/enterprise/gdpr/requests');
        }
      } else {
        toast.error('Failed to create GDPR request');
      }
    } catch {
      toast.error('Failed to create GDPR request');
    } finally {
      setSubmitting(false);
    }
  }, [validation, selectedUser, requestType, reason, notes, deadline, toast, navigate]);

  return (
    <div>
      <PageHeader
        title="Create GDPR Request"
        description="Intake a data subject request (access, portability, erasure, rectification). Requests are routed to the GDPR queue and bound by GDPR Art. 12 response deadlines."
      />
      <Card shadow="sm">
        <CardHeader className="flex items-center gap-2">
          <ShieldQuestion size={18} className="text-primary" />
          <h3 className="text-lg font-semibold">New Request</h3>
        </CardHeader>
        <CardBody className="space-y-4">
          <div>
            <p className="mb-1 text-xs font-medium text-default-600">Subject (member)</p>
            <div className="flex gap-2">
              <Input
                size="sm" variant="bordered" placeholder="Search by email or name"
                value={userQuery}
                onValueChange={setUserQuery}
                onKeyDown={(e) => { if (e.key === 'Enter') searchUsers(); }}
                startContent={<Search size={14} />}
                className="flex-1"
              />
              <Button size="sm" variant="flat" onPress={searchUsers} isLoading={searching}>
                Search
              </Button>
            </div>
            {userHits.length > 0 && (
              <div className="mt-2 flex max-h-40 flex-col gap-1 overflow-auto rounded border border-default-200 p-2">
                {userHits.map((u) => (
                  <button
                    key={u.id} type="button"
                    onClick={() => { setSelectedUser(u); setUserHits([]); setUserQuery(''); }}
                    className="rounded px-2 py-1 text-left text-xs hover:bg-default-100"
                  >
                    #{u.id} — {u.full_name ?? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email}
                    <span className="ml-2 text-default-500">{u.email}</span>
                  </button>
                ))}
              </div>
            )}
            {selectedUser && (
              <div className="mt-2 flex items-center gap-2">
                <Chip size="sm" color="primary" variant="flat" onClose={() => setSelectedUser(null)}>
                  #{selectedUser.id} {selectedUser.email}
                </Chip>
              </div>
            )}
          </div>

          <Select
            size="sm" variant="bordered" label="Request type"
            selectedKeys={new Set([requestType])}
            onSelectionChange={(keys) => {
              const v = Array.from(keys)[0] as RequestType | undefined;
              if (v) {
                setRequestType(v);
                if (v === 'erasure') setDeadline(daysFromNow(30));
              }
            }}
          >
            {REQUEST_TYPES.map((t) => (
              <SelectItem key={t.key} textValue={t.label} description={t.description}>
                {t.label}
              </SelectItem>
            )) as never}
          </Select>

          <Textarea
            size="sm" variant="bordered" label="Reason / requester message"
            value={reason}
            onValueChange={setReason}
            maxRows={5}
            isRequired
          />

          <Textarea
            size="sm" variant="bordered" label="Internal admin notes (optional)"
            value={notes}
            onValueChange={setNotes}
            maxRows={4}
          />

          <Input
            size="sm" variant="bordered" type="date" label="Deadline (GDPR Art. 12: 30 days default)"
            value={deadline}
            onValueChange={setDeadline}
            isRequired
          />

          {validation && <p className="text-xs text-warning">{validation}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="flat" onPress={() => navigate('/admin/enterprise/gdpr/requests')}>
              Cancel
            </Button>
            <Button
              color="primary" startContent={submitting ? <Spinner size="sm" /> : <Send size={16} />}
              isDisabled={!!validation || submitting}
              onPress={submit}
            >
              Create Request
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
