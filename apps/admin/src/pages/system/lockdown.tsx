// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useCustom } from "@refinedev/core";
import { Card, Typography, Button, Alert, Space, Spin, Modal, message, Form, Input, Descriptions, Tag, Divider } from "antd";
import { LockOutlined, UnlockOutlined, ExclamationCircleOutlined, WarningOutlined } from "@ant-design/icons";
import { useState } from "react";
import dayjs from "dayjs";
import axiosInstance from "../../utils/axios";
import { getErrorMessage } from "../../utils/errors";

const { Title, Text, Paragraph } = Typography;

export const LockdownPage = () => {
  const { data, isLoading, refetch } = useCustom({
    url: "/api/admin/system/lockdown",
    method: "get",
    queryOptions: { queryKey: ["admin-lockdown-status"] },
  });

  const [activateModalOpen, setActivateModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const lockdownData = data?.data as any;
  const isActive = lockdownData?.is_active || false;
  const reason = lockdownData?.reason || null;
  const activatedAt = lockdownData?.activated_at || null;
  const activatedBy = lockdownData?.activated_by || null;

  const handleActivate = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      await axiosInstance.post("/api/admin/system/lockdown", {
        reason: values.reason,
      });
      message.success("Emergency lockdown activated");
      setActivateModalOpen(false);
      form.resetFields();
      refetch();
    } catch (err: unknown) {
      message.error(getErrorMessage(err, "Failed to activate lockdown"));
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = () => {
    Modal.confirm({
      title: "Deactivate Emergency Lockdown",
      icon: <UnlockOutlined style={{ color: "#52c41a" }} />,
      content: "This will restore all tenants to their pre-lockdown state. Users will regain access to the platform.",
      okText: "Deactivate Lockdown",
      okType: "primary",
      onOk: async () => {
        try {
          await axiosInstance.delete("/api/admin/system/lockdown");
          message.success("Lockdown deactivated successfully");
          refetch();
        } catch (err: unknown) {
          message.error(getErrorMessage(err, "Failed to deactivate lockdown"));
        }
      },
    });
  };

  if (isLoading) return <Spin size="large" style={{ display: "flex", justifyContent: "center", marginTop: 100 }} />;

  return (
    <div>
      <Title level={4}>Emergency Lockdown</Title>

      <Alert
        type="warning"
        icon={<WarningOutlined />}
        showIcon
        message="Activating lockdown will prevent ALL non-admin users from accessing the platform"
        description="This is a last-resort measure for genuine emergencies such as security breaches, data incidents, or regulatory compliance requirements. All tenants will be deactivated immediately."
        style={{ marginBottom: 24 }}
      />

      {isActive ? (
        <Alert
          type="error"
          showIcon
          icon={<LockOutlined />}
          message="LOCKDOWN IS ACTIVE"
          description="All tenants are currently deactivated. Users cannot access the platform."
          style={{ marginBottom: 24 }}
          banner
        />
      ) : (
        <Alert
          type="success"
          showIcon
          icon={<UnlockOutlined />}
          message="System is operating normally"
          description="No lockdown is currently active. All tenants are accessible."
          style={{ marginBottom: 24 }}
        />
      )}

      {/* Current status details */}
      <Card title="Lockdown Status" style={{ marginBottom: 24 }}>
        <Descriptions bordered column={2}>
          <Descriptions.Item label="Status">
            {isActive ? (
              <Tag color="red" icon={<LockOutlined />}>ACTIVE</Tag>
            ) : (
              <Tag color="green" icon={<UnlockOutlined />}>INACTIVE</Tag>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Last Updated">
            {activatedAt ? dayjs(activatedAt).format("DD MMM YYYY HH:mm:ss") : "Never activated"}
          </Descriptions.Item>
          {isActive && (
            <>
              <Descriptions.Item label="Reason" span={2}>
                <Text strong>{reason || "No reason provided"}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Activated By">
                {activatedBy ? `Admin ID: ${activatedBy}` : "Unknown"}
              </Descriptions.Item>
              <Descriptions.Item label="Duration">
                {activatedAt ? dayjs().diff(dayjs(activatedAt), "minute") + " minutes" : "--"}
              </Descriptions.Item>
            </>
          )}
        </Descriptions>
      </Card>

      {/* Action card */}
      <Card title="Actions">
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <Paragraph>
            The emergency lockdown feature deactivates all tenants on the platform, effectively
            locking out all non-admin users. Tenant states are saved and will be restored when
            lockdown is deactivated.
          </Paragraph>

          {isActive ? (
            <Button
              type="primary"
              size="large"
              icon={<UnlockOutlined />}
              onClick={handleDeactivate}
              style={{ width: "100%", height: 60, fontSize: 18 }}
            >
              Deactivate Lockdown
            </Button>
          ) : (
            <Button
              danger
              size="large"
              icon={<LockOutlined />}
              onClick={() => setActivateModalOpen(true)}
              style={{ width: "100%", height: 60, fontSize: 18, background: "#ff4d4f", color: "#fff", borderColor: "#ff4d4f" }}
            >
              Activate Emergency Lockdown
            </Button>
          )}
        </Space>
      </Card>

      {/* Activate modal with reason field */}
      <Modal
        title={
          <Space>
            <ExclamationCircleOutlined style={{ color: "#ff4d4f", fontSize: 20 }} />
            <span>Activate Emergency Lockdown</span>
          </Space>
        }
        open={activateModalOpen}
        onCancel={() => { setActivateModalOpen(false); form.resetFields(); }}
        footer={[
          <Button key="cancel" onClick={() => { setActivateModalOpen(false); form.resetFields(); }}>Cancel</Button>,
          <Button key="activate" danger type="primary" loading={saving} onClick={handleActivate}>
            Activate Lockdown
          </Button>,
        ]}
      >
        <Alert
          type="error"
          message="This will deactivate ALL tenants immediately"
          description="All users will be locked out of the platform. Only admins will retain access."
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Form form={form} layout="vertical">
          <Form.Item
            name="reason"
            label="Reason for lockdown"
            rules={[{ required: true, message: "A reason is required when activating lockdown" }]}
          >
            <Input.TextArea
              rows={3}
              placeholder="e.g. Security breach detected, investigating unauthorized access..."
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
