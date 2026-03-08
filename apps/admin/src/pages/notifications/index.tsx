import { useCustom } from "@refinedev/core";
import { Card, Row, Col, Statistic, Typography, Spin, Button, Form, Input, Modal, message, Space } from "antd";
import { SendOutlined, DeleteOutlined } from "@ant-design/icons";
import { useState } from "react";
import axiosInstance from "../../utils/axios";

const { Title } = Typography;

export const NotificationsAdminPage = () => {
  const { data: statsData, isLoading } = useCustom({ url: "/api/admin/notifications/stats", method: "get" });
  const stats = statsData?.data as any;
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const handleBroadcast = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      await axiosInstance.post("/api/admin/notifications/broadcast", values);
      message.success("Broadcast sent");
      setBroadcastOpen(false);
      form.resetFields();
    } catch (err: any) {
      if (err?.response) message.error(err.response.data?.message || "Failed");
    } finally { setSaving(false); }
  };

  const handleCleanup = () => {
    Modal.confirm({
      title: "Clean Up Notifications",
      content: "Delete old read notifications?",
      onOk: async () => {
        try {
          await axiosInstance.delete("/api/admin/notifications/cleanup");
          message.success("Cleanup complete");
        } catch (err: any) { message.error(err?.response?.data?.message || "Failed"); }
      },
    });
  };

  if (isLoading) return <Spin size="large" style={{ display: "flex", justifyContent: "center", marginTop: 100 }} />;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <Title level={4}>Notifications</Title>
        <Space>
          <Button type="primary" icon={<SendOutlined />} onClick={() => setBroadcastOpen(true)}>Broadcast</Button>
          <Button icon={<DeleteOutlined />} onClick={handleCleanup}>Clean Up</Button>
        </Space>
      </div>

      {stats && (
        <Row gutter={[16, 16]}>
          {Object.entries(stats).map(([key, value]) => (
            <Col span={6} key={key}><Card><Statistic title={key.replace(/_/g, " ")} value={typeof value === "number" ? value : String(value ?? 0)} /></Card></Col>
          ))}
        </Row>
      )}

      <Modal title="Broadcast Notification" open={broadcastOpen} onOk={handleBroadcast} onCancel={() => setBroadcastOpen(false)} confirmLoading={saving}>
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="Title" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="message" label="Message" rules={[{ required: true }]}><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="type" label="Type" initialValue="info"><Input placeholder="info, warning, alert" /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
