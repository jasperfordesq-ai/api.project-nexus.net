// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useCustom } from "@refinedev/core";
import { Card, Table, Typography, Button, Modal, Form, Input, Select, message, Tag, Space, Spin, DatePicker, Switch, Row, Col, Alert } from "antd";
import { PlusOutlined, StopOutlined, ExclamationCircleOutlined, NotificationOutlined, InfoCircleOutlined, WarningOutlined } from "@ant-design/icons";
import { useState } from "react";
import dayjs from "dayjs";
import axiosInstance from "../../utils/axios";

const { Title, Text } = Typography;

const ANNOUNCEMENT_TYPES = [
  { label: "Info", value: "info", color: "blue", icon: <InfoCircleOutlined /> },
  { label: "Warning", value: "warning", color: "orange", icon: <WarningOutlined /> },
  { label: "Critical", value: "error", color: "red", icon: <ExclamationCircleOutlined /> },
];

export const AnnouncementsPage = () => {
  const { data, isLoading, refetch } = useCustom({
    url: "/api/admin/system/announcements",
    method: "get",
    queryOptions: { queryKey: ["admin-announcements"] },
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const rawData = data?.data as any;
  const announcements = Array.isArray(rawData)
    ? rawData
    : rawData?.items || rawData?.data || [];

  const activeCount = announcements.filter((a: any) => a.is_active).length;
  const totalCount = announcements.length;

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      await axiosInstance.post("/api/admin/system/announcements", {
        title: values.title,
        content: values.content,
        type: values.type || "info",
        starts_at: values.starts_at ? values.starts_at.toISOString() : undefined,
        ends_at: values.ends_at ? values.ends_at.toISOString() : undefined,
      });
      message.success("Announcement created");
      setModalOpen(false);
      form.resetFields();
      refetch();
    } catch (err: any) {
      if (err?.response) message.error(err.response.data?.error || err.response.data?.message || "Failed to create announcement");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = (id: number, title: string) => {
    Modal.confirm({
      title: "Deactivate Announcement",
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to deactivate "${title}"? Users will no longer see this announcement.`,
      okText: "Deactivate",
      okType: "danger",
      onOk: async () => {
        try {
          await axiosInstance.put(`/api/admin/system/announcements/${id}/deactivate`);
          message.success("Announcement deactivated");
          refetch();
        } catch (err: any) {
          message.error(err?.response?.data?.error || err?.response?.data?.message || "Failed to deactivate");
        }
      },
    });
  };

  const getTypeConfig = (type: string) => {
    const config = ANNOUNCEMENT_TYPES.find((t) => t.value === type);
    return config || { label: type, color: "default", icon: <InfoCircleOutlined /> };
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Space>
          <Title level={4} style={{ margin: 0 }}>Announcements</Title>
          {activeCount > 0 && (
            <Tag color="green">{activeCount} active</Tag>
          )}
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          Create Announcement
        </Button>
      </div>

      {activeCount > 0 && (
        <Alert
          type="info"
          showIcon
          icon={<NotificationOutlined />}
          message={`${activeCount} announcement${activeCount > 1 ? "s" : ""} currently visible to users`}
          style={{ marginBottom: 16 }}
        />
      )}

      {isLoading ? <Spin /> : (
        <Card>
          {announcements.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "#999" }}>
              No announcements yet. Create one to broadcast messages to your users.
            </div>
          ) : (
            <Table
              dataSource={announcements}
              rowKey="id"
              size="middle"
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                showTotal: (t: number) => `${t} total`,
              }}
            >
              <Table.Column dataIndex="id" title="ID" width={60} />
              <Table.Column dataIndex="title" title="Title" ellipsis />
              <Table.Column
                dataIndex="content"
                title="Message"
                ellipsis
                width="25%"
                render={(v: string) => <Text type="secondary">{v}</Text>}
              />
              <Table.Column
                dataIndex="type"
                title="Type"
                width={100}
                render={(t: string) => {
                  const config = getTypeConfig(t);
                  return <Tag color={config.color} icon={config.icon}>{config.label}</Tag>;
                }}
              />
              <Table.Column
                dataIndex="is_active"
                title="Active"
                width={80}
                render={(v: boolean) =>
                  v ? <Tag color="green">Active</Tag> : <Tag>Inactive</Tag>
                }
              />
              <Table.Column
                dataIndex="starts_at"
                title="Starts"
                width={130}
                render={(d: string) => d ? dayjs(d).format("DD MMM YYYY HH:mm") : "Immediately"}
              />
              <Table.Column
                dataIndex="ends_at"
                title="Ends"
                width={130}
                render={(d: string) => d ? dayjs(d).format("DD MMM YYYY HH:mm") : "No end date"}
              />
              <Table.Column
                dataIndex="created_by_name"
                title="Created By"
                width={120}
                render={(v: string) => v || "--"}
              />
              <Table.Column
                dataIndex="created_at"
                title="Created"
                width={120}
                render={(d: string) => d ? dayjs(d).format("DD MMM YYYY") : "--"}
              />
              <Table.Column
                title="Actions"
                width={120}
                render={(_: any, record: any) => (
                  <Space>
                    {record.is_active && (
                      <Button
                        size="small"
                        danger
                        icon={<StopOutlined />}
                        onClick={() => handleDeactivate(record.id, record.title)}
                      >
                        Deactivate
                      </Button>
                    )}
                  </Space>
                )}
              />
            </Table>
          )}
        </Card>
      )}

      <Modal
        title={
          <Space>
            <NotificationOutlined />
            <span>Create Announcement</span>
          </Space>
        }
        open={modalOpen}
        onOk={handleCreate}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        confirmLoading={saving}
        okText="Create"
        width={600}
      >
        <Form form={form} layout="vertical" initialValues={{ type: "info" }}>
          <Form.Item name="title" label="Title" rules={[{ required: true, message: "Title is required" }]}>
            <Input placeholder="e.g. Scheduled Maintenance Notice" />
          </Form.Item>
          <Form.Item name="content" label="Message" rules={[{ required: true, message: "Message is required" }]}>
            <Input.TextArea rows={4} placeholder="Write the announcement message that users will see..." />
          </Form.Item>
          <Form.Item name="type" label="Type">
            <Select
              options={ANNOUNCEMENT_TYPES.map((t) => ({
                label: (
                  <Space>
                    <Tag color={t.color}>{t.label}</Tag>
                  </Space>
                ),
                value: t.value,
              }))}
            />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="starts_at" label="Start Date (optional)">
                <DatePicker
                  showTime
                  style={{ width: "100%" }}
                  placeholder="Immediately"
                  format="DD MMM YYYY HH:mm"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="ends_at" label="End Date (optional)">
                <DatePicker
                  showTime
                  style={{ width: "100%" }}
                  placeholder="No end date"
                  format="DD MMM YYYY HH:mm"
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};
