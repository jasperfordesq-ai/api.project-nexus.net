// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useCustom } from "@refinedev/core";
import { Card, Table, Typography, Spin, Button, Modal, Form, Input, Select, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useState } from "react";
import axiosInstance from "../../utils/axios";

const { Title } = Typography;

export const SystemSettingsPage = () => {
  const { data, isLoading, refetch } = useCustom({
    url: "/api/admin/system/settings",
    method: "get",
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const settings = (data?.data as any)?.items || (data?.data as any)?.data || (Array.isArray(data?.data) ? data.data : []);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      await axiosInstance.put("/api/admin/system/settings", values);
      message.success("Setting saved");
      setModalOpen(false);
      form.resetFields();
      refetch();
    } catch (err: any) {
      if (err?.response) message.error(err.response.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <Title level={4}>System Settings</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          Add Setting
        </Button>
      </div>

      {isLoading ? (
        <Spin />
      ) : (
        <Card>
          <Table dataSource={settings} rowKey="id" size="middle" pagination={false}>
            <Table.Column dataIndex="key" title="Key" />
            <Table.Column dataIndex="value" title="Value" render={(v: string, record: any) =>
              record.is_secret ? "••••••••" : v
            } />
            <Table.Column dataIndex="category" title="Category" />
          </Table>
        </Card>
      )}

      <Modal
        title="Add / Update Setting"
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        confirmLoading={saving}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="key" label="Key" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="value" label="Value" rules={[{ required: true }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="category" label="Category">
            <Input placeholder="e.g. general, email, security" />
          </Form.Item>
          <Form.Item name="is_secret" label="Secret?" initialValue={false}>
            <Select options={[
              { label: "No", value: false },
              { label: "Yes", value: true },
            ]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
