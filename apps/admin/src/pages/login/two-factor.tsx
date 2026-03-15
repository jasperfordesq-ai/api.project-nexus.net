// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Form, Input, Button, Typography, Alert, Space } from "antd";
import { LockOutlined } from "@ant-design/icons";
import axiosInstance from "../../utils/axios";
import { getErrorMessage } from "../../utils/errors";
import { setToken, setRefreshToken, setStoredUser, clearAuth, type StoredUser } from "../../utils/token";

const { Title, Text } = Typography;

export const TwoFactorPage = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const tempData = (() => {
    try {
      const raw = sessionStorage.getItem("nexus_2fa_temp");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  if (!tempData) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#f0f2f5" }}>
        <Card style={{ width: 400, textAlign: "center" }}>
          <Alert type="warning" message="No pending 2FA session. Please log in again." showIcon />
          <Button type="link" onClick={() => navigate("/login")}>Back to Login</Button>
        </Card>
      </div>
    );
  }

  const onFinish = async (values: { code: string }) => {
    setError(null);
    setLoading(true);
    try {
      const { data } = await axiosInstance.post("/api/auth/2fa/verify", {
        code: values.code,
        temp_token: tempData.temp_token,
      });

      if (!data.access_token) {
        setError(data.message || "Verification failed");
        return;
      }

      setToken(data.access_token);
      if (data.refresh_token) setRefreshToken(data.refresh_token);

      const user: StoredUser = {
        id: data.user?.id,
        email: data.user?.email || tempData.email,
        first_name: data.user?.first_name || "",
        last_name: data.user?.last_name || "",
        role: data.user?.role || "member",
        tenant_slug: tempData.tenant_slug,
      };
      setStoredUser(user);

      if (user.role !== "admin" && user.role !== "super_admin") {
        clearAuth();
        sessionStorage.removeItem("nexus_2fa_temp");
        setError("Admin access required.");
        return;
      }

      sessionStorage.removeItem("nexus_2fa_temp");
      navigate("/");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Verification failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#f0f2f5" }}>
      <Card style={{ width: 400 }}>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <div style={{ textAlign: "center" }}>
            <Title level={3} style={{ margin: 0 }}>Two-Factor Verification</Title>
            <Text type="secondary">Enter the 6-digit code from your authenticator app</Text>
          </div>

          {error && <Alert message={error} type="error" showIcon closable onClose={() => setError(null)} />}

          <Form layout="vertical" onFinish={onFinish}>
            <Form.Item
              name="code"
              rules={[
                { required: true, message: "Please enter the verification code" },
                { pattern: /^\d{6}$/, message: "Code must be 6 digits" },
              ]}
            >
              <Input
                prefix={<LockOutlined />}
                placeholder="000000"
                size="large"
                maxLength={6}
                style={{ textAlign: "center", letterSpacing: 8, fontSize: 24 }}
                autoFocus
              />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block size="large">
                Verify
              </Button>
            </Form.Item>
          </Form>

          <Button type="link" block onClick={() => { sessionStorage.removeItem("nexus_2fa_temp"); navigate("/login"); }}>
            Back to Login
          </Button>
        </Space>
      </Card>
    </div>
  );
};
