// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useState } from "react";
import { Modal, Form, Input, Button, Tooltip, message } from "antd";
import { SwapOutlined } from "@ant-design/icons";
import { useLogout } from "@refinedev/core";
import axiosInstance from "../../utils/axios";
import { setToken, setRefreshToken, setStoredUser, getStoredUser, clearAuth, type StoredUser } from "../../utils/token";

export const TenantSwitcher = () => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const currentUser = getStoredUser();

  const handleSwitch = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      // Re-authenticate with the new tenant
      const { data } = await axiosInstance.post("/api/auth/login", {
        email: currentUser?.email,
        password: values.password,
        tenant_slug: values.tenant_slug,
      });

      if (data.requires_2fa) {
        message.warning("2FA required — please complete verification after switching.");
        sessionStorage.setItem("nexus_2fa_temp", JSON.stringify({
          temp_token: data.temp_token || data.access_token,
          email: currentUser?.email,
          tenant_slug: values.tenant_slug,
        }));
        setOpen(false);
        window.location.href = "/2fa";
        return;
      }

      if (!data.access_token) {
        message.error(data.message || "Switch failed");
        return;
      }

      setToken(data.access_token);
      if (data.refresh_token) setRefreshToken(data.refresh_token);

      const user: StoredUser = {
        id: data.user?.id,
        email: data.user?.email || currentUser?.email || "",
        first_name: data.user?.first_name || "",
        last_name: data.user?.last_name || "",
        role: data.user?.role || "member",
        tenant_slug: values.tenant_slug,
      };
      setStoredUser(user);

      const adminRoles = ["admin", "super_admin"];
      if (!adminRoles.includes(user.role)) {
        clearAuth();
        message.error("You don't have admin access on that tenant.");
        return;
      }

      message.success(`Switched to tenant: ${values.tenant_slug}`);
      setOpen(false);
      form.resetFields();
      // Reload to refresh all data with new tenant context
      window.location.href = "/";
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : "Failed to switch tenant");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Tooltip title="Switch tenant">
        <Button
          type="text"
          size="small"
          icon={<SwapOutlined />}
          onClick={() => setOpen(true)}
        >
          {currentUser?.tenant_slug || "Tenant"}
        </Button>
      </Tooltip>

      <Modal
        title="Switch Tenant"
        open={open}
        onOk={handleSwitch}
        onCancel={() => setOpen(false)}
        confirmLoading={loading}
        okText="Switch"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="tenant_slug"
            label="Tenant Slug"
            rules={[{ required: true, message: "Enter the tenant slug to switch to" }]}
          >
            <Input placeholder="e.g. globex" />
          </Form.Item>
          <Form.Item
            name="password"
            label="Re-enter Password"
            rules={[{ required: true, message: "Password required for re-authentication" }]}
          >
            <Input.Password placeholder="Your password" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};
