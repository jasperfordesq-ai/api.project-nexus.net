// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useCustom } from "@refinedev/core";
import { Card, Table, Typography, Button, Modal, Form, Input, Select, message, Tag, Space, Spin } from "antd";
import { PlusOutlined, StopOutlined } from "@ant-design/icons";
import { useState } from "react";
import dayjs from "dayjs";
import axiosInstance from "../../utils/axios";

const { Title } = Typography;

export const AnnouncementsPage = () => {
  const { data, isLoading, refetch } = useCustom({
    url: "/api/admin/system/announcements",
    method: "get",
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const announcements = (data?.data as any)?.items || (data?.data as any)?.data || (Array.isArray(data?.data) ? data.data : []);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      await axiosInstance.post("/api/admin/system/announcements", values);
      message.success("Announcement created");
      setModalOpen(false);
      form.resetFields();
      refetch();
    } catch (err: any) {
      if (err?.response) message.error(err.response.data?.message || "Failed to create");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id: number) => {
    try {
      await axiosInstance.put(`/api/admin/system/announcements/${id}/deactivate`);
      message.success("Announcement deactivated");
      refetch();
    } catch (err: any) {
      message.error(err?.response?.data?.message || "Failed to deactivate");
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <Title level={4}>Announcements</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          New Announcement
        </Button>
      </div>

      {isLoading ? <Spin /> : (
        <Card>
          <Table dataSource={announcements} rowKey="id" size="middle" pagination={false}>
            <Table.Column dataIndex="title" title="Title" />
            <Table.Column dataIndex="type" title="Type" render={(t: string) => {
              const colors: Record<string, string> = { info: "blue", warning: "orange", error: "red" };
              return <Tag color={colors[t] || "default"}>{t}</Tag>;
            }} />
            <Table.Column dataIndex="is_active" title="Active" render={(v: boolean) =>
              v ? <Tag color="green">Active</Tag> : <Tag>Inactive</Tag>
            } />
            <Table.Column dataIndex="created_at" title="Created" render={(d: string) =>
              d ? dayjs(d).format("DD MMM YYYY") : "—"
            } />
            <Table.Column title="Actions" render={(_, record: any) => (
              <Space>
                {record.is_active && (
                  <Button size="small" icon={<StopOutlined />} onClick={() => handleDeactivate(record.id)}>
                    Deactivate
                  </Button>
                )}
              </Space>
            )} />
          </Table>
        </Card>
      )}

      <Modal title="New Announcement" open={modalOpen} onOk={handleCreate} onCancel={() => setModalOpen(false)} confirmLoading={saving}>
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="Title" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="message" label="Message" rules={[{ required: true }]}><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="type" label="Type" initialValue="info">
            <Select options={[
              { label: "Info", value: "info" },
              { label: "Warning", value: "warning" },
              { label: "Error", value: "error" },
            ]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
