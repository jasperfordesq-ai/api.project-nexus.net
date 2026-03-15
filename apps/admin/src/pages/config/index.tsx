// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useCustom } from "@refinedev/core";
import { Card, Table, Typography, Button, Modal, Form, Input, message, Spin } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useState } from "react";
import axiosInstance from "../../utils/axios";

const { Title } = Typography;

export const TenantConfigPage = () => {
  const { data, isLoading, refetch } = useCustom({
    url: "/api/admin/config",
    method: "get",
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const responseData = data?.data as any;
  const configItems = Array.isArray(responseData?.data) ? responseData.data :
    Array.isArray(responseData) ? responseData :
    responseData?.configs ? Object.entries(responseData.configs).map(([key, value]) => ({ key, value })) : [];

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      // Backend expects { config: { key: value } } dictionary format
      await axiosInstance.put("/api/admin/config", { config: { [values.key]: values.value } });
      message.success("Config saved");
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
        <Title level={4}>Tenant Configuration</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          Add Config
        </Button>
      </div>

      {isLoading ? <Spin /> : (
        <Card>
          <Table dataSource={configItems} rowKey="key" size="middle" pagination={false}>
            <Table.Column dataIndex="key" title="Key" />
            <Table.Column dataIndex="value" title="Value" />
          </Table>
        </Card>
      )}

      <Modal title="Add / Update Config" open={modalOpen} onOk={handleSave} onCancel={() => setModalOpen(false)} confirmLoading={saving}>
        <Form form={form} layout="vertical">
          <Form.Item name="key" label="Key" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="value" label="Value" rules={[{ required: true }]}><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
