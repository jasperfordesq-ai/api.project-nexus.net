// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Volunteer Training (Admin) — courses + completions.
 * Wired to /api/admin/volunteer/training/* (VolunteerAdminController).
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Spinner,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Textarea,
} from '@heroui/react';
import { BookOpen, Plus, RefreshCw, Trash2, Pencil } from 'lucide-react';
import { usePageTitle } from '@/hooks';
import { useToast } from '@/contexts';
import { api } from '@/lib/api';
import { PageHeader } from '../../components';

interface Course {
  id: number;
  title: string;
  description: string | null;
  duration_minutes: number;
  is_required: boolean;
  active: boolean;
  created_at: string;
}

interface CourseForm {
  title: string;
  description: string;
  duration_minutes: string;
  is_required: boolean;
  active: boolean;
}

const EMPTY_FORM: CourseForm = {
  title: '',
  description: '',
  duration_minutes: '30',
  is_required: false,
  active: true,
};

export default function VolunteerTrainingAdmin() {
  usePageTitle('Admin - Volunteer Training');
  const toast = useToast();

  const [rows, setRows] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Course | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<CourseForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: Course[]; total: number }>(
        `/v2/admin/volunteer/training/courses`,
      );
      if (res.success && res.data) {
        const payload = (res.data as unknown) as { data?: Course[] };
        setRows(payload.data ?? []);
      }
    } catch {
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditing(null);
    setCreating(true);
  };

  const openEdit = (c: Course) => {
    setForm({
      title: c.title,
      description: c.description ?? '',
      duration_minutes: String(c.duration_minutes),
      is_required: c.is_required,
      active: c.active,
    });
    setEditing(c);
    setCreating(true);
  };

  const submit = useCallback(async () => {
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        title: form.title.trim(),
        description: form.description || null,
        duration_minutes: parseInt(form.duration_minutes, 10) || 0,
        is_required: form.is_required,
        active: form.active,
      };
      const res = editing
        ? await api.put<{ data: Course }>(`/v2/admin/volunteer/training/courses/${editing.id}`, body)
        : await api.post<{ data: Course }>(`/v2/admin/volunteer/training/courses`, body);
      if (res.success) {
        toast.success(editing ? 'Course updated' : 'Course created');
        setCreating(false);
        await load();
      } else {
        toast.error('Save failed');
      }
    } catch {
      toast.error('Save failed');
    } finally {
      setSubmitting(false);
    }
  }, [form, editing, toast, load]);

  const remove = useCallback(
    async (id: number) => {
      if (!confirm('Delete this course? Existing completions will be cascaded away.')) return;
      try {
        const res = await api.delete(`/v2/admin/volunteer/training/courses/${id}`);
        if (res.success) {
          toast.success('Course deleted');
          await load();
        } else {
          toast.error('Delete failed');
        }
      } catch {
        toast.error('Delete failed');
      }
    },
    [toast, load],
  );

  const fmtDate = (s: string) => new Date(s).toLocaleDateString();

  return (
    <div>
      <PageHeader
        title="Volunteer Training"
        description="Manage volunteer training courses and required modules."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="flat"
              size="sm"
              startContent={<RefreshCw size={16} />}
              onPress={load}
              isLoading={loading}
            >
              Refresh
            </Button>
            <Button
              color="primary"
              size="sm"
              startContent={<Plus size={16} />}
              onPress={openCreate}
            >
              New course
            </Button>
          </div>
        }
      />

      <Card shadow="sm">
        <CardHeader className="flex items-center gap-2">
          <BookOpen size={18} className="text-primary" />
          <h3 className="text-lg font-semibold">Courses ({rows.length})</h3>
        </CardHeader>
        <CardBody>
          <Table aria-label="Volunteer training courses" isStriped>
            <TableHeader>
              <TableColumn>ID</TableColumn>
              <TableColumn>Title</TableColumn>
              <TableColumn>Duration</TableColumn>
              <TableColumn>Required</TableColumn>
              <TableColumn>Active</TableColumn>
              <TableColumn>Created</TableColumn>
              <TableColumn>Actions</TableColumn>
            </TableHeader>
            <TableBody
              emptyContent="No courses yet — create one to get started."
              isLoading={loading}
              loadingContent={<Spinner />}
            >
              {rows.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>#{c.id}</TableCell>
                  <TableCell className="font-medium">{c.title}</TableCell>
                  <TableCell>{c.duration_minutes} min</TableCell>
                  <TableCell>
                    {c.is_required ? (
                      <Chip color="warning" variant="flat" size="sm">Required</Chip>
                    ) : (
                      <Chip variant="flat" size="sm">Optional</Chip>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip color={c.active ? 'success' : 'default'} variant="flat" size="sm">
                      {c.active ? 'Active' : 'Inactive'}
                    </Chip>
                  </TableCell>
                  <TableCell className="text-default-500 text-xs">{fmtDate(c.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="flat"
                        startContent={<Pencil size={14} />}
                        onPress={() => openEdit(c)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="flat"
                        color="danger"
                        startContent={<Trash2 size={14} />}
                        onPress={() => remove(c.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      <Modal isOpen={creating} onClose={() => setCreating(false)} size="lg">
        <ModalContent>
          <ModalHeader>{editing ? `Edit course #${editing.id}` : 'New course'}</ModalHeader>
          <ModalBody>
            <div className="flex flex-col gap-3">
              <Input
                label="Title"
                value={form.title}
                onValueChange={(v) => setForm({ ...form, title: v })}
                isRequired
              />
              <Textarea
                label="Description"
                value={form.description}
                onValueChange={(v) => setForm({ ...form, description: v })}
                minRows={3}
              />
              <Input
                type="number"
                label="Duration (minutes)"
                value={form.duration_minutes}
                onValueChange={(v) => setForm({ ...form, duration_minutes: v })}
              />
              <div className="flex items-center gap-6">
                <Switch
                  isSelected={form.is_required}
                  onValueChange={(v) => setForm({ ...form, is_required: v })}
                >
                  Required
                </Switch>
                <Switch
                  isSelected={form.active}
                  onValueChange={(v) => setForm({ ...form, active: v })}
                >
                  Active
                </Switch>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setCreating(false)}>Cancel</Button>
            <Button color="primary" isLoading={submitting} onPress={submit}>
              {editing ? 'Save changes' : 'Create course'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
