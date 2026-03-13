// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useCustom } from "@refinedev/core";
import { Card, Table, Typography, Spin, Button, Space, message, Tag, Modal, Form, Input } from "antd";
import { PlusOutlined, CopyOutlined, DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useState } from "react";
import axiosInstance from "../../utils/axios";

const { Title } = Typography;

export const PagesCmsPage = () => {
  const { data, isLoading, refetch } = useCustom({ url: "/api/admin/pages", method: "get" });
  const pages = (data?.data as any)?.items || (data?.data as any)?.data || (Array.isArray(data?.data) ? data.data : []);
  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      await axiosInstance.post("/api/admin/pages", values);
      message.success("Page created");
      setCreateOpen(false);
      form.resetFields();
      refetch();
    } catch (err: any) { if (err?.response) message.error(err.response.data?.message || "Failed"); }
    finally { setSaving(false); }
  };

  const handleDuplicate = async (id: number) => {
    try {
      await axiosInstance.post(`/api/admin/pages/${id}/duplicate`);
      message.success("Page duplicated");
      refetch();
    } catch (err: any) { message.error(err?.response?.data?.message || "Failed"); }
  };

  const handleDelete = async (id: number) => {
    Modal.confirm({
      title: "Delete Page",
      content: "This will permanently delete the page.",
      okType: "danger",
      onOk: async () => {
        try {
          await axiosInstance.delete(`/api/admin/pages/${id}`);
          message.success("Page deleted");
          refetch();
        } catch (err: any) {
          message.error(err?.response?.data?.message || "Failed to delete page");
        }
      },
    });
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <Title level={4}>Pages CMS</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>New Page</Button>
      </div>
      {isLoading ? <Spin /> : (
        <Card>
          <Table dataSource={pages} rowKey="id" size="small" pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t: number) => `${t} total` }}>
            <Table.Column dataIndex="id" title="ID" width={60} />
            <Table.Column dataIndex="title" title="Title" />
            <Table.Column dataIndex="slug" title="Slug" />
            <Table.Column dataIndex="status" title="Status" render={(s: string) => <Tag color={s === "published" ? "green" : "default"}>{s}</Tag>} />
            <Table.Column dataIndex="updated_at" title="Updated" render={(d: string) => d ? dayjs(d).format("DD MMM YYYY") : "—"} />
            <Table.Column title="Actions" render={(_, r: any) => (
              <Space>
                <Button size="small" icon={<CopyOutlined />} onClick={() => handleDuplicate(r.id)}>Duplicate</Button>
                <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(r.id)} />
              </Space>
            )} />
          </Table>
        </Card>
      )}

      <Modal title="New Page" open={createOpen} onOk={handleCreate} onCancel={() => setCreateOpen(false)} confirmLoading={saving}>
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="Title" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="slug" label="Slug" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="content" label="Content" rules={[{ required: true }]}><Input.TextArea rows={6} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
