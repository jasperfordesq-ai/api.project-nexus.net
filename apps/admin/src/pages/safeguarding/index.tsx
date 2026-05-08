// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useCustom } from "@refinedev/core";
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Space,
  Statistic,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { useState } from "react";
import dayjs from "dayjs";
import axiosInstance from "../../utils/axios";
import { getErrorMessage } from "../../utils/errors";

const { Title, Text } = Typography;

const severityColor: Record<string, string> = {
  low: "default",
  medium: "processing",
  high: "warning",
  critical: "error",
};

const nameOf = (user: any) => user?.name || `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || user?.email || (user?.id ? `User #${user.id}` : "Unknown");

export const SafeguardingPage = () => {
  const [flagPage, setFlagPage] = useState(1);
  const [flagPageSize, setFlagPageSize] = useState(50);
  const [reviewTarget, setReviewTarget] = useState<any>(null);
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [optionOpen, setOptionOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<any>(null);
  const [reviewForm] = Form.useForm();
  const [assignmentForm] = Form.useForm();
  const [optionForm] = Form.useForm();

  const { data: statsData, refetch: refetchStats } = useCustom({ url: "/api/admin/safeguarding/dashboard", method: "get" });
  const { data: flagsData, isLoading: flagsLoading, refetch: refetchFlags } = useCustom({
    url: "/api/admin/safeguarding/flagged-messages",
    method: "get",
    config: { query: { page: flagPage, limit: flagPageSize } },
    queryOptions: { queryKey: ["admin-safeguarding-flags", flagPage, flagPageSize] },
  });
  const { data: assignmentsData, refetch: refetchAssignments } = useCustom({ url: "/api/admin/safeguarding/assignments", method: "get" });
  const { data: prefsData } = useCustom({ url: "/api/admin/safeguarding/member-preferences", method: "get" });
  const { data: optionsData, refetch: refetchOptions } = useCustom({ url: "/api/admin/safeguarding/options", method: "get" });

  const stats = (statsData?.data as any)?.data || statsData?.data || {};
  const flagsRaw = flagsData?.data as any;
  const flags = flagsRaw?.data || flagsRaw?.items || [];
  const flagsTotal = flagsRaw?.pagination?.total || flagsRaw?.meta?.total || flags.length;
  const assignments = (assignmentsData?.data as any)?.data || (assignmentsData?.data as any)?.items || [];
  const preferences = (prefsData?.data as any)?.data || [];
  const options = (optionsData?.data as any)?.data || [];

  const refreshSafeguarding = () => {
    refetchStats();
    refetchFlags();
    refetchAssignments();
    refetchOptions();
  };

  const handleReview = async () => {
    try {
      const values = await reviewForm.validateFields();
      await axiosInstance.post(`/api/admin/safeguarding/flagged-messages/${reviewTarget.id}/review`, { notes: values.notes });
      message.success("Message reviewed");
      setReviewTarget(null);
      reviewForm.resetFields();
      refreshSafeguarding();
    } catch (err: unknown) {
      message.error(getErrorMessage(err, "Failed to review message"));
    }
  };

  const handleCreateAssignment = async () => {
    try {
      const values = await assignmentForm.validateFields();
      await axiosInstance.post("/api/admin/safeguarding/assignments", values);
      message.success("Guardian assignment created");
      setAssignmentOpen(false);
      assignmentForm.resetFields();
      refreshSafeguarding();
    } catch (err: unknown) {
      message.error(getErrorMessage(err, "Failed to create assignment"));
    }
  };

  const handleRevokeAssignment = async (id: number) => {
    try {
      await axiosInstance.delete(`/api/admin/safeguarding/assignments/${id}`);
      message.success("Assignment revoked");
      refreshSafeguarding();
    } catch (err: unknown) {
      message.error(getErrorMessage(err, "Failed to revoke assignment"));
    }
  };

  const openOption = (option?: any) => {
    setEditingOption(option || null);
    optionForm.setFieldsValue(option ? {
      option_key: option.option_key,
      option_type: option.option_type,
      label: option.label,
      description: option.description,
      help_url: option.help_url,
      sort_order: option.sort_order,
      is_active: option.is_active,
      is_required: option.is_required,
      triggers_json: JSON.stringify(option.triggers || {}, null, 2),
    } : { option_type: "checkbox", is_active: true, is_required: false, sort_order: 0, triggers_json: "{}" });
    setOptionOpen(true);
  };

  const handleSaveOption = async () => {
    try {
      const values = await optionForm.validateFields();
      const payload = { ...values, triggers: values.triggers_json ? JSON.parse(values.triggers_json) : null };
      delete payload.triggers_json;
      if (editingOption) {
        await axiosInstance.put(`/api/admin/safeguarding/options/${editingOption.id}`, payload);
      } else {
        await axiosInstance.post("/api/admin/safeguarding/options", payload);
      }
      message.success("Safeguarding option saved");
      setOptionOpen(false);
      refetchOptions();
    } catch (err: unknown) {
      message.error(getErrorMessage(err, "Failed to save safeguarding option"));
    }
  };

  const handleDeactivateOption = async (id: number) => {
    try {
      await axiosInstance.delete(`/api/admin/safeguarding/options/${id}`);
      message.success("Safeguarding option deactivated");
      refetchOptions();
    } catch (err: unknown) {
      message.error(getErrorMessage(err, "Failed to deactivate option"));
    }
  };

  return (
    <div>
      <Space style={{ width: "100%", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <Title level={4} style={{ marginBottom: 0 }}>Safeguarding</Title>
          <Text type="secondary">Review flagged messages, guardian assignments, and onboarding safeguarding controls.</Text>
        </div>
        <Button icon={<PlusOutlined />} type="primary" onClick={() => setAssignmentOpen(true)}>New Assignment</Button>
      </Space>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={5}><Card><Statistic title="Unreviewed Flags" value={stats.unreviewed_flags || 0} /></Card></Col>
        <Col xs={24} sm={12} lg={5}><Card><Statistic title="Critical Flags" value={stats.critical_flags || 0} /></Card></Col>
        <Col xs={24} sm={12} lg={5}><Card><Statistic title="Active Assignments" value={stats.active_assignments || 0} /></Card></Col>
        <Col xs={24} sm={12} lg={5}><Card><Statistic title="Consented Wards" value={stats.consented_wards || 0} /></Card></Col>
        <Col xs={24} sm={12} lg={4}><Card><Statistic title="Flags This Month" value={stats.total_flags_this_month || 0} /></Card></Col>
      </Row>

      <Tabs items={[
        {
          key: "flags",
          label: "Flagged Messages",
          children: (
            <Card>
              <Table dataSource={flags} rowKey="id" size="small" loading={flagsLoading} pagination={{
                current: flagPage,
                pageSize: flagPageSize,
                total: flagsTotal,
                showSizeChanger: true,
                onChange: (p, ps) => { setFlagPage(p); setFlagPageSize(ps); },
              }}>
                <Table.Column title="Message" dataIndex="message_content" ellipsis />
                <Table.Column title="Sender" render={(_, r: any) => nameOf(r.sender)} />
                <Table.Column title="Recipient" render={(_, r: any) => nameOf(r.recipient)} />
                <Table.Column title="Severity" dataIndex="severity" render={(s: string) => <Tag color={severityColor[s] || "default"}>{s}</Tag>} />
                <Table.Column title="Reason" dataIndex="flag_reason" />
                <Table.Column title="Reviewed" render={(_, r: any) => r.is_reviewed ? <Tag color="success">Reviewed</Tag> : <Tag color="error">Open</Tag>} />
                <Table.Column title="Created" dataIndex="created_at" render={(d: string) => d ? dayjs(d).format("DD MMM YYYY HH:mm") : "-"} />
                <Table.Column title="Actions" render={(_, r: any) => !r.is_reviewed && <Button size="small" onClick={() => { setReviewTarget(r); reviewForm.setFieldsValue({ notes: r.review_notes }); }}>Review</Button>} />
              </Table>
            </Card>
          ),
        },
        {
          key: "assignments",
          label: "Guardian Assignments",
          children: (
            <Card>
              <Table dataSource={assignments} rowKey="id" size="small">
                <Table.Column title="Ward" render={(_, r: any) => nameOf(r.ward)} />
                <Table.Column title="Guardian" render={(_, r: any) => nameOf(r.guardian)} />
                <Table.Column title="Status" dataIndex="status" render={(s: string) => <Tag color={s === "active" ? "success" : "default"}>{s}</Tag>} />
                <Table.Column title="Consent" render={(_, r: any) => r.consent_given ? <Tag color="success">Given</Tag> : <Tag>Pending</Tag>} />
                <Table.Column title="Assigned" dataIndex="created_at" render={(d: string) => d ? dayjs(d).format("DD MMM YYYY") : "-"} />
                <Table.Column title="Actions" render={(_, r: any) => r.status === "active" && <Button danger size="small" onClick={() => handleRevokeAssignment(r.id)}>Revoke</Button>} />
              </Table>
            </Card>
          ),
        },
        {
          key: "preferences",
          label: "Member Preferences",
          children: (
            <Card>
              <Table dataSource={preferences} rowKey="user_id" size="small">
                <Table.Column title="Member" dataIndex="user_name" />
                <Table.Column title="Options" render={(_, r: any) => (r.options || []).map((o: any) => <Tag key={o.option_key}>{o.label}</Tag>)} />
                <Table.Column title="Triggers" render={(_, r: any) => r.has_triggers ? <Tag color="warning">Triggers</Tag> : <Tag>None</Tag>} />
                <Table.Column title="Consent Given" dataIndex="consent_given_at" render={(d: string) => d ? dayjs(d).format("DD MMM YYYY") : "-"} />
              </Table>
            </Card>
          ),
        },
        {
          key: "options",
          label: "Options",
          children: (
            <Card extra={<Button icon={<PlusOutlined />} onClick={() => openOption()}>Add Option</Button>}>
              <Table dataSource={options} rowKey="id" size="small">
                <Table.Column title="Label" dataIndex="label" />
                <Table.Column title="Key" dataIndex="option_key" />
                <Table.Column title="Type" dataIndex="option_type" />
                <Table.Column title="Required" render={(_, r: any) => r.is_required ? <Tag color="warning">Required</Tag> : <Tag>Optional</Tag>} />
                <Table.Column title="Active" render={(_, r: any) => r.is_active ? <Tag color="success">Active</Tag> : <Tag>Inactive</Tag>} />
                <Table.Column title="Actions" render={(_, r: any) => (
                  <Space>
                    <Button size="small" icon={<EditOutlined />} onClick={() => openOption(r)} />
                    {r.is_active && <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDeactivateOption(r.id)} />}
                  </Space>
                )} />
              </Table>
            </Card>
          ),
        },
      ]} />

      <Modal title="Review flagged message" open={!!reviewTarget} onOk={handleReview} onCancel={() => setReviewTarget(null)} destroyOnClose>
        <Text>{reviewTarget?.message_content}</Text>
        <Form form={reviewForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="notes" label="Review notes"><Input.TextArea rows={4} /></Form.Item>
        </Form>
      </Modal>

      <Modal title="New guardian assignment" open={assignmentOpen} onOk={handleCreateAssignment} onCancel={() => setAssignmentOpen(false)} destroyOnClose>
        <Form form={assignmentForm} layout="vertical">
          <Form.Item name="ward_email" label="Ward email" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="guardian_email" label="Guardian email" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="notes" label="Notes"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="consent_given" valuePropName="checked"><Switch checkedChildren="Consent given" unCheckedChildren="Consent pending" /></Form.Item>
        </Form>
      </Modal>

      <Modal title={editingOption ? "Edit safeguarding option" : "Add safeguarding option"} open={optionOpen} onOk={handleSaveOption} onCancel={() => setOptionOpen(false)} width={720} destroyOnClose>
        <Form form={optionForm} layout="vertical">
          {!editingOption && <Form.Item name="option_key" label="Option key"><Input placeholder="requires_broker_support" /></Form.Item>}
          <Form.Item name="label" label="Label" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="description" label="Description"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="help_url" label="Help URL"><Input /></Form.Item>
          <Row gutter={12}>
            <Col span={8}><Form.Item name="option_type" label="Type"><Input /></Form.Item></Col>
            <Col span={8}><Form.Item name="sort_order" label="Sort order"><InputNumber style={{ width: "100%" }} /></Form.Item></Col>
            <Col span={4}><Form.Item name="is_required" label="Required" valuePropName="checked"><Switch /></Form.Item></Col>
            <Col span={4}><Form.Item name="is_active" label="Active" valuePropName="checked"><Switch /></Form.Item></Col>
          </Row>
          <Form.Item name="triggers_json" label="Triggers JSON"><Input.TextArea rows={6} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
