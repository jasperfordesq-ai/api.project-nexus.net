import { useState } from "react";
import { useLogin } from "@refinedev/core";
import { Card, Form, Input, Button, Typography, Alert, Space } from "antd";
import { UserOutlined, LockOutlined, BankOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

export const LoginPage = () => {
  const { mutate: login, isLoading } = useLogin();
  const [error, setError] = useState<string | null>(null);

  const onFinish = (values: { email: string; password: string; tenant_slug: string }) => {
    setError(null);
    login(values, {
      onError: (err) => setError(err?.message || "Login failed"),
    });
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        background: "#f0f2f5",
      }}
    >
      <Card style={{ width: 400 }}>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <div style={{ textAlign: "center" }}>
            <Title level={3} style={{ margin: 0 }}>NEXUS Admin</Title>
            <Text type="secondary">Sign in to the admin panel</Text>
          </div>

          {error && <Alert message={error} type="error" showIcon closable onClose={() => setError(null)} />}

          <Form layout="vertical" onFinish={onFinish} autoComplete="off">
            <Form.Item
              name="tenant_slug"
              label="Tenant"
              rules={[{ required: true, message: "Please enter the tenant slug" }]}
            >
              <Input
                prefix={<BankOutlined />}
                placeholder="e.g. acme"
                size="large"
              />
            </Form.Item>
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: "Please enter your email" },
                { type: "email", message: "Please enter a valid email" },
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="admin@acme.test"
                size="large"
              />
            </Form.Item>
            <Form.Item
              name="password"
              label="Password"
              rules={[{ required: true, message: "Please enter your password" }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Password"
                size="large"
              />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={isLoading} block size="large">
                Sign In
              </Button>
            </Form.Item>
          </Form>
        </Space>
      </Card>
    </div>
  );
};
