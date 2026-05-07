// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Edit Deliverable
 * Form for updating an existing project deliverable.
 */

import { useCallback, useEffect, useState } from 'react';
import { Card, CardBody, CardHeader, Input, Textarea, Select, SelectItem, Button, Spinner } from '@heroui/react';
import { ArrowLeft, Save, Target } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePageTitle } from '@/hooks';
import { useTenant, useToast } from '@/contexts';
import { adminDeliverability } from '../../api/adminApi';
import { PageHeader } from '../../components';

interface DeliverableFormData {
  title: string;
  description: string;
  priority: string;
  status: string;
  due_date: string;
  assigned_to: string;
}

interface DeliverableResponse extends Partial<DeliverableFormData> {
  id?: number;
  data?: Partial<DeliverableFormData>;
  deliverable?: Partial<DeliverableFormData>;
}

const emptyForm: DeliverableFormData = {
  title: '',
  description: '',
  priority: 'medium',
  status: 'planned',
  due_date: '',
  assigned_to: '',
};

function unwrapDeliverable(value: unknown): Partial<DeliverableFormData> {
  if (!value || typeof value !== 'object') return {};

  const response = value as DeliverableResponse;
  const nested = response.data || response.deliverable || response;
  return {
    title: nested.title || '',
    description: nested.description || '',
    priority: nested.priority || 'medium',
    status: nested.status || 'planned',
    due_date: nested.due_date ? String(nested.due_date).slice(0, 10) : '',
    assigned_to: nested.assigned_to ? String(nested.assigned_to) : '',
  };
}

export function EditDeliverable() {
  usePageTitle('Admin - Edit Deliverable');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tenantPath } = useTenant();
  const toast = useToast();

  const [formData, setFormData] = useState<DeliverableFormData>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const listPath = tenantPath('/admin/deliverability/list');
  const deliverableId = Number(id);

  const loadDeliverable = useCallback(async () => {
    if (!Number.isFinite(deliverableId) || deliverableId <= 0) {
      toast.error('Invalid deliverable ID');
      navigate(listPath);
      return;
    }

    setLoading(true);
    try {
      const res = await adminDeliverability.get(deliverableId);
      if (res?.success) {
        setFormData({ ...emptyForm, ...unwrapDeliverable(res.data ?? res) });
      } else {
        toast.error('Failed to load deliverable');
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [deliverableId, listPath, navigate, toast]);

  useEffect(() => {
    loadDeliverable();
  }, [loadDeliverable]);

  const handleChange = (field: keyof DeliverableFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.warning('Title is required');
      return;
    }

    setSaving(true);
    try {
      const res = await adminDeliverability.update(deliverableId, {
        title: formData.title,
        description: formData.description || undefined,
        priority: formData.priority || undefined,
        status: formData.status || undefined,
        due_date: formData.due_date || undefined,
        assigned_to: formData.assigned_to || undefined,
      });

      if (res?.success) {
        toast.success('Deliverable updated successfully');
        navigate(listPath);
      } else {
        toast.error('Failed to update deliverable');
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader title="Edit Deliverable" description="Update project deliverable details" />
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Edit Deliverable"
        description="Update project deliverable details"
        actions={<Button variant="flat" startContent={<ArrowLeft size={16} />} onPress={() => navigate(listPath)}>Back</Button>}
      />

      <Card shadow="sm">
        <CardHeader><h3 className="text-lg font-semibold flex items-center gap-2"><Target size={20} /> Deliverable Details</h3></CardHeader>
        <CardBody className="gap-4">
          <Input
            label="Title"
            placeholder="e.g., Launch User Onboarding Flow"
            isRequired
            variant="bordered"
            value={formData.title}
            onValueChange={(v) => handleChange('title', v)}
          />
          <Textarea
            label="Description"
            placeholder="Describe the deliverable..."
            variant="bordered"
            minRows={3}
            value={formData.description}
            onValueChange={(v) => handleChange('description', v)}
          />
          <Select
            label="Priority"
            variant="bordered"
            selectedKeys={[formData.priority]}
            onSelectionChange={(keys) => {
              const selected = Array.from(keys)[0] as string;
              if (selected) handleChange('priority', selected);
            }}
          >
            <SelectItem key="low">Low</SelectItem>
            <SelectItem key="medium">Medium</SelectItem>
            <SelectItem key="high">High</SelectItem>
            <SelectItem key="critical">Critical</SelectItem>
          </Select>
          <Select
            label="Status"
            variant="bordered"
            selectedKeys={[formData.status]}
            onSelectionChange={(keys) => {
              const selected = Array.from(keys)[0] as string;
              if (selected) handleChange('status', selected);
            }}
          >
            <SelectItem key="planned">Planned</SelectItem>
            <SelectItem key="in_progress">In Progress</SelectItem>
            <SelectItem key="review">In Review</SelectItem>
            <SelectItem key="completed">Completed</SelectItem>
          </Select>
          <Input
            label="Due Date"
            type="date"
            variant="bordered"
            value={formData.due_date}
            onValueChange={(v) => handleChange('due_date', v)}
          />
          <Input
            label="Assigned To"
            placeholder="Team member name"
            variant="bordered"
            value={formData.assigned_to}
            onValueChange={(v) => handleChange('assigned_to', v)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="flat" onPress={() => navigate(listPath)}>Cancel</Button>
            <Button
              color="primary"
              startContent={<Save size={16} />}
              onPress={handleSave}
              isLoading={saving}
            >
              Save Changes
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

export default EditDeliverable;
