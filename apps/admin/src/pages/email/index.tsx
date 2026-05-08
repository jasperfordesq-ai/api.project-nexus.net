// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useCustom } from "@refinedev/core";
import { Card, Table, Typography, Row, Col, Statistic, Spin, Tabs, Button, Modal, Form, Input, message, Tag, Space, Switch } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useState } from "react";
import axiosInstance from "../../utils/axios";
import { getErrorMessage } from "../../utils/errors";

const { Title } = Typography;

export const EmailTemplatesPage = () => {
  const [logsPage, setLogsPage] = useState(1);
  const [logsPageSize, setLogsPageSize] = useState(50);
  const { data: templatesData, isLoading, refetch } = useCustom({ url: "/api/admin/emails/templates", method: "get" });
  const { data: logsData, isLoading: logsLoading } = useCustom({ url: "/api/admin/emails/logs", method: "get", config: { query: { page: logsPage, limit: logsPageSize } }, queryOptions: { queryKey: ["admin-email-logs", logsPage, logsPageSize] } });
  const { data: statsData } = useCustom({ url: "/api/admin/emails/stats", method: "get" });

  const templates = (templatesData?.data as any)?.items || (templatesData?.data as any)?.data || (Array.isArray(templatesData?.data) ? templatesData.data : []);
  const logsRaw = logsData?.data as any;
  const logs = logsRaw?.items || logsRaw?.data || [];
  const logsTotalCount = logsRaw?.total || logsRaw?.totalCount || logs.length;
  const statsRaw = statsData?.data as any;
  const stats = statsRaw?.data || statsRaw;
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditingTemplateId(null);
    form.resetFields();
    form.setFieldsValue({ is_active: true });
    setModalOpen(true);
  };

  const openEdit = async (id: number) => {
    try {
      setSaving(true);
      const { data: response } = await axiosInstance.get(`/api/admin/emails/templates/${id}`);
      const template = response?.data || response;
      setEditingTemplateId(id);
      form.setFieldsValue(template);
      setModalOpen(true);
    } catch (err: unknown) {
      message.error(getErrorMessage(err, "Failed to load template"));
    } finally { setSaving(false); }
  };

  const handleDelete = (id: number) => {
    Modal.confirm({
      title: "Delete Email Template",
      content: "This will permanently delete the template.",
      okText: "Delete",
      okType: "danger",
      onOk: async () => {
        try {
          await axiosInstance.delete(`/api/admin/emails/templates/${id}`);
          message.success("Template deleted");
          refetch();
        } catch (err: unknown) {
          message.error(getErrorMessage(err, "Failed to delete template"));
        }
      },
    });
  };

  const handleSaveTemplate = async () => {
    let values: any;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    try {
      setSaving(true);
      const payload = {
        key: values.key,
        subject: values.subject,
        body_html: values.body_html,
        body_text: values.body_text,
        is_active: values.is_active,
      };
      if (editingTemplateId) {
        await axiosInstance.put(`/api/admin/emails/templates/${editingTemplateId}`, payload);
        message.success("Template updated");
      } else {
        await axiosInstance.post("/api/admin/emails/templates", payload);
        message.success("Template created");
      }
      setModalOpen(false);
      setEditingTemplateId(null);
      form.resetFields();
      refetch();
    } catch (err: unknown) {
      message.error(getErrorMessage(err, "Failed to create template"));
    } finally { setSaving(false); }
  };

  return (
    <div>
      <Title level={4}>Email Management</Title>

      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} lg={6}><Card><Statistic title="Total Sent" value={stats.total ?? 0} /></Card></Col>
          <Col xs={24} sm={12} lg={6}><Card><Statistic title="Sent Today" value={stats.sent_today ?? 0} /></Card></Col>
          <Col xs={24} sm={12} lg={6}><Card><Statistic title="Successful" value={stats.sent ?? 0} /></Card></Col>
          <Col xs={24} sm={12} lg={6}><Card><Statistic title="Failed" value={stats.failed ?? 0} valueStyle={{ color: stats.failed > 0 ? "#ff4d4f" : undefined }} /></Card></Col>
        </Row>
      )}

      <Tabs items={[
        {
          key: "templates",
          label: "Templates",
          children: isLoading ? <Spin /> : (
            <Card extra={<Button icon={<PlusOutlined />} onClick={openCreate}>New Template</Button>}>
              <Table dataSource={templates} rowKey="id" size="small" pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t: number) => `${t} total` }}>
                <Table.Column dataIndex="id" title="ID" width={60} />
                <Table.Column dataIndex="key" title="Key" />
                <Table.Column dataIndex="subject" title="Subject" />
                <Table.Column dataIndex="is_active" title="Active" width={90} render={(v: boolean) => <Tag color={v ? "green" : "default"}>{v ? "Yes" : "No"}</Tag>} />
                <Table.Column
                  title="Actions"
                  width={120}
                  render={(_: any, r: any) => (
                    <Space>
                      <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r.id)} />
                      <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(r.id)} />
                    </Space>
                  )}
                />
                <Table.Column dataIndex="created_at" title="Created" render={(d: string) => d ? dayjs(d).format("DD MMM YYYY") : "—"} />
              </Table>
            </Card>
          ),
        },
        {
          key: "logs",
          label: "Send Logs",
          children: logsLoading ? <Spin /> : (
            <Card>
              <Table dataSource={logs} rowKey={(r: any) => r.id || `${r.sent_at}-${r.to}`} size="small" pagination={{
                  current: logsPage,
                  pageSize: logsPageSize,
                  total: logsTotalCount,
                  showSizeChanger: true,
                  showTotal: (t: number) => `${t} total`,
                  onChange: (p: number, ps: number) => { setLogsPage(p); setLogsPageSize(ps); },
                }}>
                <Table.Column dataIndex="to_email" title="To" />
                <Table.Column dataIndex="subject" title="Subject" />
                <Table.Column dataIndex="status" title="Status" render={(s: string) => <Tag color={s === "sent" ? "green" : "red"}>{s}</Tag>} />
                <Table.Column dataIndex="sent_at" title="Sent" render={(d: string) => d ? dayjs(d).format("DD MMM HH:mm") : "—"} />
              </Table>
            </Card>
          ),
        },
      ]} />

      <Modal
        title={editingTemplateId ? "Edit Email Template" : "New Email Template"}
        open={modalOpen}
        onOk={handleSaveTemplate}
        onCancel={() => { setModalOpen(false); setEditingTemplateId(null); form.resetFields(); }}
        confirmLoading={saving}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="key" label="Key" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="subject" label="Subject" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="body_html" label="Body (HTML)" rules={[{ required: true }]}><Input.TextArea rows={6} /></Form.Item>
          <Form.Item name="body_text" label="Plain Text"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="is_active" label="Active" valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
