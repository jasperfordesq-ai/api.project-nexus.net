// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Job Templates (Admin) — JobsParityController CRUD endpoints.
 *   GET    /api/jobs/templates
 *   POST   /api/jobs/templates
 *   DELETE /api/jobs/templates/{id}
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Button, Card, CardBody, CardHeader, Input, Modal, ModalBody, ModalContent,
  ModalFooter, ModalHeader, Spinner, Table, TableBody, TableCell, TableColumn,
  TableHeader, TableRow, Textarea,
} from '@heroui/react';
import { FileText, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { useToast } from '@/contexts';
import { api } from '@/lib/api';
import { PageHeader } from '../../components';

interface JobTemplate {
  id: number;
  title: string;
  description: string | null;
  body: string | null;
  created_at: string;
}

export default function AdminJobTemplatesPage() {
  usePageTitle('Admin - Job Templates');
  const toast = useToast();
  const [rows, setRows] = useState<JobTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', body: '' });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: JobTemplate[] }>('/v2/jobs/templates');
      if (res.success && res.data) {
        const payload = (res.data as unknown) as { data?: JobTemplate[] };
        setRows(payload.data ?? []);
      }
    } catch { toast.error('Failed to load templates'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const create = useCallback(async () => {
    if (!form.title.trim()) { toast.error('Title required'); return; }
    setSubmitting(true);
    try {
      const res = await api.post('/v2/jobs/templates', {
        title: form.title,
        description: form.description || null,
        body: form.body || null,
      });
      if (res.success) {
        toast.success('Template created');
        setCreateOpen(false);
        setForm({ title: '', description: '', body: '' });
        await load();
      } else { toast.error('Create failed'); }
    } catch { toast.error('Create failed'); }
    finally { setSubmitting(false); }
  }, [form, toast, load]);

  const remove = useCallback(async (id: number) => {
    try {
      const res = await api.delete(`/v2/jobs/templates/${id}`);
      if (res.success) { toast.success('Template deleted'); await load(); }
      else { toast.error('Delete failed'); }
    } catch { toast.error('Delete failed'); }
  }, [toast, load]);

  return (
    <div>
      <PageHeader title="Job Templates"
        description="Reusable templates for posting Job Vacancies."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="flat" size="sm" startContent={<RefreshCw size={16} />}
              onPress={load} isLoading={loading}>Refresh</Button>
            <Button color="primary" size="sm" startContent={<Plus size={16} />}
              onPress={() => setCreateOpen(true)}>New template</Button>
          </div>
        } />
      <Card shadow="sm">
        <CardHeader className="flex items-center gap-2">
          <FileText size={18} className="text-primary" />
          <h3 className="text-lg font-semibold">Templates ({rows.length})</h3>
        </CardHeader>
        <CardBody>
          <Table aria-label="Job templates" isStriped>
            <TableHeader>
              <TableColumn>ID</TableColumn>
              <TableColumn>Title</TableColumn>
              <TableColumn>Description</TableColumn>
              <TableColumn>Created</TableColumn>
              <TableColumn>Action</TableColumn>
            </TableHeader>
            <TableBody emptyContent="No templates" isLoading={loading} loadingContent={<Spinner />}>
              {rows.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>#{t.id}</TableCell>
                  <TableCell className="font-medium">{t.title}</TableCell>
                  <TableCell className="max-w-md truncate text-sm">{t.description ?? '—'}</TableCell>
                  <TableCell className="text-xs text-default-500">{new Date(t.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="flat" color="danger"
                      startContent={<Trash2 size={14} />} onPress={() => remove(t.id)}>
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
          <ModalHeader>New job template</ModalHeader>
          <ModalBody className="space-y-3">
            <Input label="Title" value={form.title}
              onValueChange={(v) => setForm({ ...form, title: v })} isRequired />
            <Textarea label="Description" value={form.description}
              onValueChange={(v) => setForm({ ...form, description: v })} minRows={2} />
            <Textarea label="Body (template content)" value={form.body}
              onValueChange={(v) => setForm({ ...form, body: v })} minRows={6} />
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setCreateOpen(false)}>Cancel</Button>
            <Button color="primary" onPress={create} isLoading={submitting}>Create</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
