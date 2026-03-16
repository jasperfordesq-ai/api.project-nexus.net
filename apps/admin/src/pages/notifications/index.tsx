// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useCustom } from "@refinedev/core";
import { Card, Row, Col, Statistic, Typography, Spin, Button, Form, Input, Modal, message, Space, Table, Select, Tag } from "antd";
import { SendOutlined, DeleteOutlined, BellOutlined, CheckCircleOutlined, MailOutlined } from "@ant-design/icons";
import { useState } from "react";
import dayjs from "dayjs";
import axiosInstance from "../../utils/axios";
import { getErrorMessage } from "../../utils/errors";

const { Title } = Typography;

const typeColors: Record<string, string> = {
  info: "blue",
  warning: "orange",
  alert: "red",
  success: "green",
  system: "purple",
};

export const NotificationsAdminPage = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const { data: statsData, isLoading: statsLoading } = useCustom({ url: "/api/admin/notifications/stats", method: "get" });
  const { data: recentData, isLoading: recentLoading, refetch: refetchRecent } = useCustom({
    url: "/api/admin/notifications",
    method: "get",
    config: { query: { page, limit: pageSize } },
    queryOptions: { queryKey: ["admin-notifications", page, pageSize] },
  });

  const statsRaw = statsData?.data as any;
  const stats = statsRaw?.data || statsRaw;
  const recentRaw = recentData?.data as any;
  const notifications = recentRaw?.items || recentRaw?.data || (Array.isArray(recentData?.data) ? recentData.data : []);
  const totalCount = recentRaw?.total || recentRaw?.totalCount || notifications.length;

  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const handleBroadcast = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      await axiosInstance.post("/api/admin/notifications/broadcast", values);
      message.success("Broadcast sent successfully");
      setBroadcastOpen(false);
      form.resetFields();
      refetchRecent();
    } catch (err: unknown) {
      message.error(getErrorMessage(err, "Failed to send broadcast"));
    } finally { setSaving(false); }
  };

  const handleCleanup = () => {
    Modal.confirm({
      title: "Clean Up Notifications",
      content: "Delete old read notifications? This will remove notifications that have been read and are older than 30 days.",
      okText: "Clean Up",
      okType: "danger",
      onOk: async () => {
        try {
          const res = await axiosInstance.delete("/api/admin/notifications/cleanup");
          const deleted = res?.data?.deleted_count || res?.data?.count || 0;
          message.success(`Cleanup complete${deleted ? ` — ${deleted} notifications removed` : ""}`);
          refetchRecent();
        } catch (err: unknown) { message.error(getErrorMessage(err, "Failed to clean up")); }
      },
    });
  };

  if (statsLoading) return <Spin size="large" style={{ display: "flex", justifyContent: "center", marginTop: 100 }} />;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <Title level={4}>Notifications</Title>
        <Space>
          <Button type="primary" icon={<SendOutlined />} onClick={() => setBroadcastOpen(true)}>Broadcast</Button>
          <Button icon={<DeleteOutlined />} onClick={handleCleanup}>Clean Up</Button>
        </Space>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Notifications"
              value={stats?.total ?? 0}
              prefix={<BellOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Unread"
              value={stats?.unread ?? 0}
              prefix={<MailOutlined style={{ color: "#faad14" }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Read"
              value={(stats?.total ?? 0) - (stats?.unread ?? 0)}
              prefix={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Sent Today"
              value={stats?.sent_today ?? 0}
              prefix={<SendOutlined style={{ color: "#1890ff" }} />}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Recent Notifications" style={{ marginBottom: 16 }}>
        {recentLoading ? <Spin /> : (
          <Table
            dataSource={notifications}
            rowKey="id"
            size="small"
            locale={{ emptyText: "No notifications found" }}
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
            <Table.Column dataIndex="title" title="Title" />
            <Table.Column dataIndex="message" title="Message" ellipsis />
            <Table.Column
              dataIndex="type"
              title="Type"
              render={(t: string) => (
                <Tag color={typeColors[t?.toLowerCase()] || "default"}>{t || "info"}</Tag>
              )}
            />
            <Table.Column
              title="Recipient"
              render={(_, r: any) => r.user_email || r.recipient || (r.user_id ? `User #${r.user_id}` : "All")}
            />
            <Table.Column
              dataIndex="is_read"
              title="Read"
              width={70}
              render={(v: boolean) => <Tag color={v ? "green" : "default"}>{v ? "Yes" : "No"}</Tag>}
            />
            <Table.Column
              dataIndex="created_at"
              title="Sent"
              render={(d: string) => (d ? dayjs(d).format("DD MMM YYYY HH:mm") : "—")}
            />
          </Table>
        )}
      </Card>

      <Modal title="Broadcast Notification" open={broadcastOpen} onOk={handleBroadcast} onCancel={() => { setBroadcastOpen(false); form.resetFields(); }} confirmLoading={saving} okText="Send Broadcast">
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="Title" rules={[{ required: true, message: "Title is required" }]}>
            <Input />
          </Form.Item>
          <Form.Item name="message" label="Message" rules={[{ required: true, message: "Message is required" }]}>
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="type" label="Type" initialValue="info">
            <Select options={[
              { label: "Info", value: "info" },
              { label: "Warning", value: "warning" },
              { label: "Alert", value: "alert" },
              { label: "Success", value: "success" },
            ]} />
          </Form.Item>
          <Form.Item name="target_role" label="Target Audience">
            <Select
              placeholder="All users"
              allowClear
              options={[
                { label: "Admins Only", value: "admin" },
                { label: "Members Only", value: "member" },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
