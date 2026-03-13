import { useCustom } from "@refinedev/core";
import { Card, Typography, Form, Select, Switch, Button, Spin, message } from "antd";
import { useState, useEffect } from "react";
import axiosInstance from "../../utils/axios";

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

  const policy = data?.data as any;
  const options = optionsData?.data as any;

  useEffect(() => {
    if (policy) {
      form.setFieldsValue(policy);
    }
  }, [policy, form]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      await axiosInstance.put("/api/registration/admin/policy", values);
      message.success("Policy updated");
      refetch();
    } catch (err: any) {
      if (err?.response) message.error(err.response.data?.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <Spin size="large" style={{ display: "flex", justifyContent: "center", marginTop: 100 }} />;

  const modeOptions = options?.registration_modes?.map((m: string) => ({ label: m, value: m })) || [
    { label: "open", value: "open" },
    { label: "admin_approval", value: "admin_approval" },
    { label: "invite_only", value: "invite_only" },
    { label: "identity_verification", value: "identity_verification" },
    { label: "closed", value: "closed" },
  ];

  return (
    <div>
      <Title level={4}>Registration Policy</Title>
      <Card>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="mode" label="Registration Mode">
            <Select options={modeOptions} />
          </Form.Item>
          <Form.Item name="require_email_verification" label="Require Email Verification" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="allow_public_registration" label="Allow Public Registration" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={saving}>Save Policy</Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};
