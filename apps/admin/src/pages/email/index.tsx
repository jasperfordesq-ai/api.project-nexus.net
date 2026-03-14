// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useCustom } from "@refinedev/core";
import { Card, Table, Typography, Row, Col, Statistic, Spin, Tabs, Button, Modal, Form, Input, message, Tag } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useState } from "react";
import axiosInstance from "../../utils/axios";

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
  const stats = statsData?.data as any;
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      await axiosInstance.post("/api/admin/emails/templates", values);
      message.success("Template created");
      setModalOpen(false);
      form.resetFields();
      refetch();
    } catch (err: any) {
      if (err?.response) message.error(err.response.data?.message || "Failed");
    } finally { setSaving(false); }
  };

  return (
    <div>
      <Title level={4}>Email Management</Title>

      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col span={6}><Card><Statistic title="Total Sent" value={stats.total ?? 0} /></Card></Col>
          <Col span={6}><Card><Statistic title="Sent Today" value={stats.today ?? 0} /></Card></Col>
          <Col span={6}><Card><Statistic title="Successful" value={stats.sent ?? 0} /></Card></Col>
          <Col span={6}><Card><Statistic title="Failed" value={stats.failed ?? 0} valueStyle={{ color: stats.failed > 0 ? "#ff4d4f" : undefined }} /></Card></Col>
        </Row>
      )}

      <Tabs items={[
        {
          key: "templates",
          label: "Templates",
          children: isLoading ? <Spin /> : (
            <Card extra={<Button icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>New Template</Button>}>
              <Table dataSource={templates} rowKey="id" size="small" pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t: number) => `${t} total` }}>
                <Table.Column dataIndex="id" title="ID" width={60} />
                <Table.Column dataIndex="name" title="Name" />
                <Table.Column dataIndex="subject" title="Subject" />
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
                <Table.Column dataIndex="to" title="To" />
                <Table.Column dataIndex="subject" title="Subject" />
                <Table.Column dataIndex="status" title="Status" render={(s: string) => <Tag color={s === "sent" ? "green" : "red"}>{s}</Tag>} />
                <Table.Column dataIndex="sent_at" title="Sent" render={(d: string) => d ? dayjs(d).format("DD MMM HH:mm") : "—"} />
              </Table>
            </Card>
          ),
        },
      ]} />

      <Modal title="New Email Template" open={modalOpen} onOk={handleCreate} onCancel={() => setModalOpen(false)} confirmLoading={saving}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="subject" label="Subject" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="body" label="Body (HTML)" rules={[{ required: true }]}><Input.TextArea rows={6} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
