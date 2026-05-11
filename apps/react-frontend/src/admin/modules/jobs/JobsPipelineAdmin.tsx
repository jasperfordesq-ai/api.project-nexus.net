// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Job Pipeline Overview (Admin) — replaces the parity stub with a real
 * per-job pipeline rule manager wired to JobsParityController:
 *   GET    /api/jobs/{jobId}/pipeline-rules
 *   POST   /api/jobs/{jobId}/pipeline-rules
 *   POST   /api/jobs/{jobId}/pipeline-rules/run
 *   DELETE /api/jobs/pipeline-rules/{ruleId}
 *
 * Admin selects a job from /api/admin/jobs, then manages that job's
 * automation rules.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
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
import { GitBranch, Play, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { useToast } from '@/contexts';
import { api } from '@/lib/api';
import { PageHeader } from '../../components';

interface JobLite {
  id: number;
  title: string;
  status: string;
}

interface PipelineRule {
  id: number;
  job_id: number;
  name: string;
  trigger_event: string | null;
  condition_json: string | null;
  action_json: string | null;
  is_active: boolean;
  created_at: string;
}

export default function JobsPipelineAdmin() {
  usePageTitle('Admin - Job Pipeline');
  const toast = useToast();

  const [jobs, setJobs] = useState<JobLite[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [rules, setRules] = useState<PipelineRule[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingRules, setLoadingRules] = useState(false);
  const [working, setWorking] = useState<number | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    triggerEvent: '',
    conditionJson: '',
    actionJson: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const loadJobs = useCallback(async () => {
    setLoadingJobs(true);
    try {
      const res = await api.get<{ data: JobLite[] }>('/v2/admin/jobs?limit=100');
      if (res.success && res.data) {
        const payload = (res.data as unknown) as { data?: JobLite[] };
        const list = payload.data ?? [];
        setJobs(list);
        if (list.length > 0 && selectedJobId == null) {
          setSelectedJobId(list[0].id);
        }
      }
    } catch {
      toast.error('Failed to load jobs');
    } finally {
      setLoadingJobs(false);
    }
  }, [toast, selectedJobId]);

  const loadRules = useCallback(async () => {
    if (selectedJobId == null) { setRules([]); return; }
    setLoadingRules(true);
    try {
      const res = await api.get<{ data: PipelineRule[] }>(`/v2/jobs/${selectedJobId}/pipeline-rules`);
      if (res.success && res.data) {
        const payload = (res.data as unknown) as { data?: PipelineRule[] };
        setRules(payload.data ?? []);
      }
    } catch {
      toast.error('Failed to load pipeline rules');
    } finally {
      setLoadingRules(false);
    }
  }, [selectedJobId, toast]);

  useEffect(() => { loadJobs(); }, [loadJobs]);
  useEffect(() => { loadRules(); }, [loadRules]);

  const create = useCallback(async () => {
    if (selectedJobId == null) return;
    if (!form.name.trim()) { toast.error('Rule name required'); return; }
    setSubmitting(true);
    try {
      const res = await api.post(`/v2/jobs/${selectedJobId}/pipeline-rules`, {
        name: form.name,
        trigger_event: form.triggerEvent || null,
        condition_json: form.conditionJson || null,
        action_json: form.actionJson || null,
      });
      if (res.success) {
        toast.success('Pipeline rule created');
        setCreateOpen(false);
        setForm({ name: '', triggerEvent: '', conditionJson: '', actionJson: '' });
        await loadRules();
      } else {
        toast.error('Create failed');
      }
    } catch {
      toast.error('Create failed');
    } finally {
      setSubmitting(false);
    }
  }, [selectedJobId, form, toast, loadRules]);

  const remove = useCallback(async (ruleId: number) => {
    setWorking(ruleId);
    try {
      const res = await api.delete(`/v2/jobs/pipeline-rules/${ruleId}`);
      if (res.success) {
        toast.success('Rule deleted');
        await loadRules();
      } else {
        toast.error('Delete failed');
      }
    } catch {
      toast.error('Delete failed');
    } finally {
      setWorking(null);
    }
  }, [toast, loadRules]);

  const runAll = useCallback(async () => {
    if (selectedJobId == null) return;
    setWorking(-1);
    try {
      const res = await api.post(`/v2/jobs/${selectedJobId}/pipeline-rules/run`, {});
      if (res.success) {
        toast.success('Pipeline rules executed');
      } else {
        toast.error('Run failed');
      }
    } catch {
      toast.error('Run failed');
    } finally {
      setWorking(null);
    }
  }, [selectedJobId, toast]);

  const fmtDate = (s: string) => new Date(s).toLocaleDateString();

  return (
    <div>
      <PageHeader
        title="Job Pipeline Overview"
        description="Manage per-job automation rules (trigger + condition + action)."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="flat"
              size="sm"
              startContent={<RefreshCw size={16} />}
              onPress={() => { loadJobs(); loadRules(); }}
              isLoading={loadingJobs || loadingRules}
            >
              Refresh
            </Button>
          </div>
        }
      />

      <Card shadow="sm" className="mb-4">
        <CardBody>
          <Select
            label="Select job"
            variant="bordered"
            isLoading={loadingJobs}
            selectedKeys={selectedJobId != null ? new Set([String(selectedJobId)]) : new Set()}
            onSelectionChange={(keys) => {
              const v = Array.from(keys)[0];
              if (v) setSelectedJobId(Number(v));
            }}
          >
            {jobs.map((j) => (
              <SelectItem key={String(j.id)} textValue={`${j.title} (#${j.id})`}>
                {j.title} <span className="text-default-400">— {j.status} (#{j.id})</span>
              </SelectItem>
            ))}
          </Select>
        </CardBody>
      </Card>

      <Card shadow="sm">
        <CardHeader className="flex items-center gap-2">
          <GitBranch size={18} className="text-primary" />
          <h3 className="text-lg font-semibold">Pipeline rules</h3>
          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              variant="flat"
              color="primary"
              startContent={<Play size={14} />}
              isDisabled={selectedJobId == null || rules.length === 0}
              isLoading={working === -1}
              onPress={runAll}
            >
              Run rules
            </Button>
            <Button
              size="sm"
              color="primary"
              startContent={<Plus size={14} />}
              isDisabled={selectedJobId == null}
              onPress={() => setCreateOpen(true)}
            >
              New rule
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          <Table aria-label="Pipeline rules" isStriped>
            <TableHeader>
              <TableColumn>ID</TableColumn>
              <TableColumn>Name</TableColumn>
              <TableColumn>Trigger</TableColumn>
              <TableColumn>Active</TableColumn>
              <TableColumn>Created</TableColumn>
              <TableColumn>Actions</TableColumn>
            </TableHeader>
            <TableBody
              emptyContent={selectedJobId == null ? 'Select a job to view rules' : 'No pipeline rules yet'}
              isLoading={loadingRules}
              loadingContent={<Spinner />}
            >
              {rules.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>#{r.id}</TableCell>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>{r.trigger_event ?? '—'}</TableCell>
                  <TableCell>{r.is_active ? 'Yes' : 'No'}</TableCell>
                  <TableCell className="text-default-500 text-xs">{fmtDate(r.created_at)}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="flat"
                      color="danger"
                      isLoading={working === r.id}
                      startContent={<Trash2 size={14} />}
                      onPress={() => remove(r.id)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} size="2xl">
        <ModalContent>
          <ModalHeader>New pipeline rule</ModalHeader>
          <ModalBody>
            <Input
              label="Name"
              placeholder="Auto-screen senior applicants"
              value={form.name}
              onValueChange={(v) => setForm((f) => ({ ...f, name: v }))}
            />
            <Input
              label="Trigger event (optional)"
              placeholder="application_received"
              value={form.triggerEvent}
              onValueChange={(v) => setForm((f) => ({ ...f, triggerEvent: v }))}
            />
            <Textarea
              label="Condition JSON (optional)"
              placeholder='{"min_years_experience": 5}'
              value={form.conditionJson}
              onValueChange={(v) => setForm((f) => ({ ...f, conditionJson: v }))}
              minRows={3}
            />
            <Textarea
              label="Action JSON (optional)"
              placeholder='{"set_stage": "Interview"}'
              value={form.actionJson}
              onValueChange={(v) => setForm((f) => ({ ...f, actionJson: v }))}
              minRows={3}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setCreateOpen(false)}>Cancel</Button>
            <Button color="primary" isLoading={submitting} onPress={create}>Create</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
