// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Job Moderation Queue (Admin) — replaces the parity stub with a real
 * queue UI wired to JobsAdminController:
 *   GET  /api/admin/jobs?status=Pending|Active|Filled|Closed
 *   PUT  /api/admin/jobs/{id}/status   { status }
 *   GET  /api/admin/jobs/stats
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Textarea,
} from '@heroui/react';
import { Briefcase, Check, RefreshCw, X } from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { useToast } from '@/contexts';
import { api } from '@/lib/api';
import { PageHeader } from '../../components';

interface JobRow {
  id: number;
  title: string;
  description: string;
  category: string;
  job_type: string;
  location: string | null;
  is_remote: boolean;
  status: string;
  is_featured: boolean;
  view_count: number;
  application_count: number;
  created_at: string;
  posted_by: { id: number; first_name: string; last_name: string } | null;
}

interface JobsListResponse {
  data: JobRow[];
  total: number;
  page: number;
  limit: number;
}

const STATUS_OPTIONS = [
  { value: 'Pending', label: 'Pending' },
  { value: 'Active', label: 'Active' },
  { value: 'Filled', label: 'Filled' },
  { value: 'Closed', label: 'Closed' },
] as const;

type StatusFilter = (typeof STATUS_OPTIONS)[number]['value'];

function statusColor(s: string): 'default' | 'primary' | 'success' | 'danger' | 'warning' {
  switch (s) {
    case 'Pending': return 'warning';
    case 'Active': return 'success';
    case 'Filled': return 'primary';
    case 'Closed': return 'default';
    case 'Rejected': return 'danger';
    default: return 'default';
  }
}

export default function JobsModerationQueueAdmin() {
  usePageTitle('Admin - Job Moderation Queue');
  const toast = useToast();

  const [filter, setFilter] = useState<StatusFilter>('Pending');
  const [rows, setRows] = useState<JobRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<number | null>(null);

  const [actionModal, setActionModal] = useState<{ id: number; title: string; nextStatus: string } | null>(null);
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<JobsListResponse>(
        `/v2/admin/jobs?status=${encodeURIComponent(filter)}&limit=50`,
      );
      if (res.success && res.data) {
        const payload = (res.data as unknown) as JobsListResponse;
        setRows(payload.data ?? []);
        setTotal(payload.total ?? 0);
      }
    } catch {
      toast.error('Failed to load job queue');
    } finally {
      setLoading(false);
    }
  }, [filter, toast]);

  useEffect(() => { load(); }, [load]);

  const submitAction = useCallback(async () => {
    if (!actionModal) return;
    setWorking(actionModal.id);
    try {
      const res = await api.put(
        `/v2/admin/jobs/${actionModal.id}/status`,
        { status: actionModal.nextStatus },
      );
      if (res.success) {
        toast.success(`Job set to ${actionModal.nextStatus}`);
        setActionModal(null);
        setNote('');
        await load();
      } else {
        toast.error('Update failed');
      }
    } catch {
      toast.error('Update failed');
    } finally {
      setWorking(null);
    }
  }, [actionModal, toast, load]);

  const fmtDate = (s: string) => new Date(s).toLocaleDateString();

  return (
    <div>
      <PageHeader
        title="Job Moderation Queue"
        description="Approve, reject, or close job vacancy postings."
        actions={
          <div className="flex items-center gap-2">
            <Select
              size="sm"
              variant="bordered"
              className="w-40"
              selectedKeys={new Set([filter])}
              onSelectionChange={(keys) => {
                const v = Array.from(keys)[0] as StatusFilter | undefined;
                if (v) setFilter(v);
              }}
              aria-label="Filter by status"
            >
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} textValue={o.label}>{o.label}</SelectItem>
              ))}
            </Select>
            <Button
              variant="flat"
              size="sm"
              startContent={<RefreshCw size={16} />}
              onPress={load}
              isLoading={loading}
            >
              Refresh
            </Button>
          </div>
        }
      />

      <Card shadow="sm">
        <CardHeader className="flex items-center gap-2">
          <Briefcase size={18} className="text-primary" />
          <h3 className="text-lg font-semibold">{filter} jobs</h3>
          <span className="text-default-500 text-sm ml-2">{total} total</span>
        </CardHeader>
        <CardBody>
          <Table aria-label="Job moderation queue" isStriped>
            <TableHeader>
              <TableColumn>ID</TableColumn>
              <TableColumn>Title</TableColumn>
              <TableColumn>Category</TableColumn>
              <TableColumn>Posted by</TableColumn>
              <TableColumn>Status</TableColumn>
              <TableColumn className="text-right">Apps</TableColumn>
              <TableColumn>Created</TableColumn>
              <TableColumn>Actions</TableColumn>
            </TableHeader>
            <TableBody
              emptyContent={`No ${filter.toLowerCase()} jobs`}
              isLoading={loading}
              loadingContent={<Spinner />}
            >
              {rows.map((j) => (
                <TableRow key={j.id}>
                  <TableCell>#{j.id}</TableCell>
                  <TableCell className="max-w-md truncate font-medium">{j.title}</TableCell>
                  <TableCell>{j.category}</TableCell>
                  <TableCell>
                    {j.posted_by ? `${j.posted_by.first_name} ${j.posted_by.last_name}` : '—'}
                  </TableCell>
                  <TableCell>
                    <Chip color={statusColor(j.status)} variant="flat" size="sm">{j.status}</Chip>
                  </TableCell>
                  <TableCell className="text-right">{j.application_count}</TableCell>
                  <TableCell className="text-default-500 text-xs">{fmtDate(j.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {j.status === 'Pending' && (
                        <>
                          <Button
                            size="sm"
                            variant="flat"
                            color="success"
                            isLoading={working === j.id}
                            startContent={<Check size={14} />}
                            onPress={() => { setActionModal({ id: j.id, title: j.title, nextStatus: 'Active' }); setNote(''); }}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="flat"
                            color="danger"
                            isLoading={working === j.id}
                            startContent={<X size={14} />}
                            onPress={() => { setActionModal({ id: j.id, title: j.title, nextStatus: 'Rejected' }); setNote(''); }}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      {j.status === 'Active' && (
                        <Button
                          size="sm"
                          variant="flat"
                          color="default"
                          isLoading={working === j.id}
                          onPress={() => { setActionModal({ id: j.id, title: j.title, nextStatus: 'Closed' }); setNote(''); }}
                        >
                          Close
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      <Modal isOpen={!!actionModal} onClose={() => setActionModal(null)}>
        <ModalContent>
          <ModalHeader>Set status to {actionModal?.nextStatus}</ModalHeader>
          <ModalBody>
            <p className="text-sm text-default-600">
              Job <span className="font-medium">{actionModal?.title}</span> (#{actionModal?.id})
            </p>
            <Textarea
              label="Internal note (optional)"
              placeholder="Reason for the moderation decision."
              value={note}
              onValueChange={setNote}
              minRows={3}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setActionModal(null)}>Cancel</Button>
            <Button
              color={actionModal?.nextStatus === 'Rejected' ? 'danger' : 'primary'}
              isLoading={working !== null}
              onPress={submitAction}
            >
              Confirm
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
