// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useCustom } from "@refinedev/core";
import { Card, Table, Typography, Row, Col, Statistic, Spin, Button, Space, Modal, Form, Input, InputNumber, Select, message } from "antd";
import { PlusOutlined, TrophyOutlined, DeleteOutlined } from "@ant-design/icons";
import { useState } from "react";
import axiosInstance from "../../utils/axios";

const { Title } = Typography;

export const GamificationPage = () => {
  const { data: statsData } = useCustom({ url: "/api/admin/gamification/stats", method: "get" });
  const { data: badgesData, isLoading, refetch } = useCustom({ url: "/api/admin/gamification/badges", method: "get" });

  const stats = statsData?.data as any;
  const badgesRaw = badgesData?.data as any;
  const badges = badgesRaw?.items || badgesRaw?.data || (Array.isArray(badgesData?.data) ? badgesData.data : []);
  const [createOpen, setCreateOpen] = useState(false);
  const [awardOpen, setAwardOpen] = useState(false);
  const [awardBadgeId, setAwardBadgeId] = useState<number | null>(null);
  const [form] = Form.useForm();
  const [awardForm] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return; // Validation failed — keep modal open
    }
    try {
      setSaving(true);
      await axiosInstance.post("/api/admin/gamification/badges", values);
      message.success("Badge created");
      setCreateOpen(false);
      form.resetFields();
      refetch();
    } catch (err: any) {
      if (err?.response) message.error(err.response.data?.message || "Failed to create badge");
      else if (err?.request) message.error("Network error — please check your connection");
      else message.error("Failed to create badge");
    } finally { setSaving(false); }
  };

  const handleAward = async () => {
    let values;
    try {
      values = await awardForm.validateFields();
    } catch {
      return; // Validation failed — keep modal open
    }
    try {
      setSaving(true);
      await axiosInstance.post(`/api/admin/gamification/badges/${awardBadgeId}/award`, values);
      message.success("Badge awarded");
      setAwardOpen(false);
      awardForm.resetFields();
      refetch();
    } catch (err: any) {
      if (err?.response) message.error(err.response.data?.message || "Failed to award badge");
      else if (err?.request) message.error("Network error — please check your connection");
      else message.error("Failed to award badge");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    Modal.confirm({
      title: "Delete Badge",
      content: "This will delete the badge and all earned records.",
      okType: "danger",
      onOk: async () => {
        try {
          await axiosInstance.delete(`/api/admin/gamification/badges/${id}`);
          message.success("Badge deleted");
          refetch();
        } catch (err: any) {
          message.error(err?.response?.data?.message || "Failed to delete badge");
        }
      },
    });
  };

  return (
    <div>
      <Title level={4}>Gamification</Title>
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          {Object.entries(stats).map(([key, value]) => (
            <Col span={6} key={key}><Card><Statistic title={key.replace(/_/g, " ")} value={typeof value === "number" ? value : String(value ?? 0)} /></Card></Col>
          ))}
        </Row>
      )}
      <Card title="Badges" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>New Badge</Button>}>
        {isLoading ? <Spin /> : (
          <Table dataSource={badges} rowKey="id" size="small" pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t: number) => `${t} total` }}>
            <Table.Column dataIndex="id" title="ID" width={60} />
            <Table.Column dataIndex="name" title="Name" />
            <Table.Column dataIndex="description" title="Description" ellipsis />
            <Table.Column dataIndex="category" title="Category" />
            <Table.Column dataIndex="earned_count" title="Earned" />
            <Table.Column title="Actions" render={(_, r: any) => (
              <Space>
                <Button size="small" icon={<TrophyOutlined />} onClick={() => { setAwardBadgeId(r.id); setAwardOpen(true); }}>Award</Button>
                <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(r.id)} />
              </Space>
            )} />
          </Table>
        )}
      </Card>

      <Modal title="Create Badge" open={createOpen} onOk={handleCreate} onCancel={() => setCreateOpen(false)} confirmLoading={saving}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="description" label="Description"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="category" label="Category"><Input /></Form.Item>
          <Form.Item name="xp_value" label="XP Value" initialValue={0}><InputNumber min={0} /></Form.Item>
        </Form>
      </Modal>

      <Modal title="Award Badge" open={awardOpen} onOk={handleAward} onCancel={() => setAwardOpen(false)} confirmLoading={saving}>
        <Form form={awardForm} layout="vertical">
          <Form.Item name="user_id" label="User ID" rules={[{ required: true }]}><InputNumber min={1} style={{ width: "100%" }} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
