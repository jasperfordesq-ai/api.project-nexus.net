// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useCustom } from "@refinedev/core";
import { Card, Typography, Form, Select, Button, Spin, message, Space, Input, InputNumber } from "antd";
import { TeamOutlined } from "@ant-design/icons";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../utils/axios";
import { getErrorMessage } from "../../utils/errors";

const { Title } = Typography;

export const RegistrationPolicyPage = () => {
  const { data, isLoading, refetch } = useCustom({
    url: "/api/registration/admin/policy",
    method: "get",
  });
  const { data: optionsData } = useCustom({
    url: "/api/registration/admin/options",
    method: "get",
  });

  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const policyRaw = data?.data as any;
  const optionsRaw = optionsData?.data as any;
  const policy = policyRaw?.data || policyRaw;
  const options = optionsRaw?.data || optionsRaw;

  useEffect(() => {
    if (policy) {
      form.setFieldsValue(policy);
    }
  }, [policy, form]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      try {
        await axiosInstance.put("/api/registration/admin/policy", {
          mode: values.mode_value,
          provider: values.provider_value,
          verification_level: values.verification_level_value,
          post_verification_action: values.post_verification_action_value,
          registration_message: values.registration_message ?? "",
          invite_code: values.invite_code ?? "",
          max_invite_uses: values.max_invite_uses,
        });
        message.success("Policy updated");
        refetch();
      } catch (err: unknown) {
        message.error(getErrorMessage(err, "Failed to update policy"));
      } finally {
        setSaving(false);
      }
    } catch {
      // Form validation failed, Ant Design highlights the fields automatically
    }
  };

  if (isLoading) return <Spin size="large" style={{ display: "flex", justifyContent: "center", marginTop: 100 }} />;

  const modeOptions = options?.modes?.map((m: any) => ({ label: m.name, value: m.value })) || [
    { label: "Open", value: 0 },
    { label: "Admin Approval", value: 1 },
    { label: "Invite Only", value: 2 },
    { label: "Verified Identity", value: 3 },
    { label: "Closed", value: 4 },
  ];
  const providerOptions = options?.providers?.map((p: any) => ({ label: p.name, value: p.value })) || [];
  const verificationLevelOptions = options?.verification_levels?.map((l: any) => ({ label: l.name, value: l.value })) || [];
  const postVerificationOptions = options?.post_verification_actions?.map((a: any) => ({ label: a.name, value: a.value })) || [];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Registration Policy</Title>
        <Space>
          <Button icon={<TeamOutlined />} onClick={() => navigate("/registration/pending")}>
            View Pending Approvals
          </Button>
        </Space>
      </div>
      <Card>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="mode_value" label="Registration Mode">
            <Select options={modeOptions} />
          </Form.Item>
          <Form.Item name="provider_value" label="Identity Verification Provider">
            <Select options={providerOptions} />
          </Form.Item>
          <Form.Item name="verification_level_value" label="Verification Level">
            <Select options={verificationLevelOptions} />
          </Form.Item>
          <Form.Item name="post_verification_action_value" label="After Verification">
            <Select options={postVerificationOptions} />
          </Form.Item>
          <Form.Item name="registration_message" label="Registration Message">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="invite_code" label="Invite Code">
            <Input />
          </Form.Item>
          <Form.Item name="max_invite_uses" label="Maximum Invite Uses">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={saving}>Save Policy</Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};
