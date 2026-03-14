// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useState } from "react";
import { useCustom } from "@refinedev/core";
import { Card, Table, Typography, Row, Col, Statistic, Spin, Button, Space, message, Tag, Modal, Input, Form, Select, Tabs } from "antd";
import { SendOutlined, PlusOutlined, MailOutlined, UserOutlined, StopOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import axiosInstance from "../../utils/axios";

const { Title } = Typography;
const { TextArea } = Input;

export const NewsletterPage = () => {
  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [subPage, setSubPage] = useState(1);
  const [subPageSize, setSubPageSize] = useState(50);

  const { data, isLoading, refetch } = useCustom({
    url: "/api/admin/newsletter",
    method: "get",
    config: { query: { page, limit: pageSize } },
    queryOptions: { queryKey: ["admin-newsletter", page, pageSize] },
  });

  const { data: statsData } = useCustom({
    url: "/api/admin/newsletter/stats",
    method: "get",
    queryOptions: { queryKey: ["admin-newsletter-stats"] },
  });

  const { data: subscribersData, isLoading: subsLoading } = useCustom({
    url: "/api/admin/newsletter/subscribers",
    method: "get",
    config: { query: { page: subPage, limit: subPageSize } },
    queryOptions: { queryKey: ["admin-newsletter-subscribers", subPage, subPageSize] },
  });

  const raw = data?.data as any;
  const newsletters = raw?.newsletters || raw?.items || raw?.data || [];
  const totalCount = raw?.total || raw?.totalCount || newsletters.length;
  const stats = (statsData?.data as any) || {};

  const subsRaw = subscribersData?.data as any;
  const subscribers = subsRaw?.subscribers || subsRaw?.items || subsRaw?.data || [];
  const subsTotalCount = subsRaw?.total || subsRaw?.totalCount || subscribers.length;

  const openRate = totalCount > 0 && newsletters.length > 0
    ? Math.round(
        newsletters.reduce((acc: number, n: any) => acc + (n.open_count || 0), 0) /
        Math.max(newsletters.reduce((acc: number, n: any) => acc + (n.recipient_count || 1), 0), 1) * 100
      )
    : 0;

  const handleSend = (id: number) => {
    Modal.confirm({
      title: "Send Newsletter",
      content: "Are you sure you want to send this newsletter? This action cannot be undone.",
      okText: "Send Now",
      okType: "primary",
      onOk: async () => {
        try {
          await axiosInstance.post(`/api/admin/newsletter/${id}/send`);
          message.success("Newsletter sent successfully");
          refetch();
        } catch (err: any) {
          message.error(err?.response?.data?.error || err?.response?.data?.message || "Failed to send newsletter");
        }
      },
    });
  };

  const handleCancel = async (id: number) => {
    Modal.confirm({
      title: "Cancel Newsletter",
      content: "Are you sure you want to cancel this scheduled newsletter?",
      okText: "Cancel Newsletter",
      okType: "danger",
      onOk: async () => {
        try {
          await axiosInstance.put(`/api/admin/newsletter/${id}/cancel`);
          message.success("Newsletter cancelled");
          refetch();
        } catch (err: any) {
          message.error(err?.response?.data?.error || err?.response?.data?.message || "Failed to cancel");
        }
      },
    });
  };

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      await axiosInstance.post("/api/admin/newsletter", {
        subject: values.subject,
        content_html: values.content,
        content_text: values.content_text || undefined,
        scheduled_at: values.scheduled_at || undefined,
      });
      message.success("Newsletter created");
      setCreateOpen(false);
      form.resetFields();
      refetch();
    } catch (err: any) {
      if (err?.response) {
        message.error(err?.response?.data?.error || err?.response?.data?.message || "Failed to create newsletter");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col><Title level={4} style={{ margin: 0 }}>Newsletter</Title></Col>
        <Col><Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>Create Campaign</Button></Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title="Total Subscribers" value={stats.total ?? 0} prefix={<UserOutlined />} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title="Active" value={stats.active ?? 0} valueStyle={{ color: "#3f8600" }} prefix={<UserOutlined />} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title="Unsubscribed" value={stats.unsubscribed ?? 0} valueStyle={{ color: "#cf1322" }} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title="Avg Open Rate" value={openRate} suffix="%" prefix={<MailOutlined />} /></Card>
        </Col>
      </Row>

      <Tabs items={[
        {
          key: "campaigns",
          label: "Campaigns",
          children: isLoading ? <Spin /> : (
            <Card>
              {newsletters.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: "#999" }}>
                  No campaigns yet. Create your first campaign to get started.
                </div>
              ) : (
                <Table
                  dataSource={newsletters}
                  rowKey="id"
                  size="small"
                  pagination={{
                    current: page,
                    pageSize,
                    total: totalCount,
                    showSizeChanger: true,
                    showTotal: (t: number) => `${t} total`,
                    onChange: (p: number, ps: number) => { setPage(p); setPageSize(ps); },
                  }}
                >
                  <Table.Column dataIndex="id" title="ID" width={60} />
                  <Table.Column dataIndex="subject" title="Subject" ellipsis />
                  <Table.Column
                    dataIndex="status"
                    title="Status"
                    width={100}
                    render={(s: string) => {
                      const colors: Record<string, string> = { sent: "green", draft: "default", scheduled: "blue", cancelled: "red" };
                      return <Tag color={colors[s] || "default"}>{s}</Tag>;
                    }}
                  />
                  <Table.Column dataIndex="recipient_count" title="Recipients" width={100} render={(v: number) => v ?? "--"} />
                  <Table.Column
                    title="Open Rate"
                    width={100}
                    render={(_: any, r: any) => {
                      if (!r.recipient_count || r.recipient_count === 0) return "--";
                      return `${Math.round(((r.open_count || 0) / r.recipient_count) * 100)}%`;
                    }}
                  />
                  <Table.Column
                    dataIndex="sent_at"
                    title="Sent"
                    width={150}
                    render={(d: string) => (d ? dayjs(d).format("DD MMM YYYY HH:mm") : "--")}
                  />
                  <Table.Column
                    dataIndex="created_at"
                    title="Created"
                    width={120}
                    render={(d: string) => (d ? dayjs(d).format("DD MMM YYYY") : "--")}
                  />
                  <Table.Column
                    title="Actions"
                    width={150}
                    render={(_: any, r: any) => (
                      <Space>
                        {r.status === "draft" && (
                          <Button size="small" type="primary" icon={<SendOutlined />} onClick={() => handleSend(r.id)}>Send</Button>
                        )}
                        {r.status === "scheduled" && (
                          <Button size="small" danger icon={<StopOutlined />} onClick={() => handleCancel(r.id)}>Cancel</Button>
                        )}
                      </Space>
                    )}
                  />
                </Table>
              )}
            </Card>
          ),
        },
        {
          key: "subscribers",
          label: `Subscribers (${stats.total ?? 0})`,
          children: subsLoading ? <Spin /> : (
            <Card>
              {subscribers.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: "#999" }}>No subscribers yet.</div>
              ) : (
                <Table
                  dataSource={subscribers}
                  rowKey={(r: any) => r.id || r.email}
                  size="small"
                  pagination={{
                    current: subPage,
                    pageSize: subPageSize,
                    total: subsTotalCount,
                    showSizeChanger: true,
                    showTotal: (t: number) => `${t} total`,
                    onChange: (p: number, ps: number) => { setSubPage(p); setSubPageSize(ps); },
                  }}
                >
                  <Table.Column dataIndex="email" title="Email" ellipsis />
                  <Table.Column
                    dataIndex="is_subscribed"
                    title="Status"
                    width={100}
                    render={(v: boolean) => v ? <Tag color="green">Active</Tag> : <Tag color="red">Unsubscribed</Tag>}
                  />
                  <Table.Column dataIndex="source" title="Source" width={100} render={(v: string) => v || "--"} />
                  <Table.Column
                    dataIndex="subscribed_at"
                    title="Subscribed"
                    width={140}
                    render={(d: string) => d ? dayjs(d).format("DD MMM YYYY") : "--"}
                  />
                  <Table.Column
                    dataIndex="unsubscribed_at"
                    title="Unsubscribed"
                    width={140}
                    render={(d: string) => d ? dayjs(d).format("DD MMM YYYY") : "--"}
                  />
                </Table>
              )}
            </Card>
          ),
        },
      ]} />

      <Modal
        title="Create Campaign"
        open={createOpen}
        onOk={handleCreate}
        onCancel={() => { setCreateOpen(false); form.resetFields(); }}
        okText="Create"
        confirmLoading={saving}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="subject" label="Subject" rules={[{ required: true, message: "Subject is required" }]}>
            <Input placeholder="e.g. Monthly Community Update" />
          </Form.Item>
          <Form.Item name="content" label="Body (HTML)" rules={[{ required: true, message: "Content is required" }]}>
            <TextArea rows={8} placeholder="Write your newsletter content here..." />
          </Form.Item>
          <Form.Item name="content_text" label="Plain Text Version (optional)">
            <TextArea rows={4} placeholder="Optional plain text fallback" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
