// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { Create, useForm } from "@refinedev/antd";
import { Form, Input, message } from "antd";

export const RoleCreate = () => {
  const { formProps, saveButtonProps } = useForm({
    resource: "roles",
    meta: { apiPath: "/api/admin/roles" },
  });

  const handleFinish = (values: any) => {
    const raw = values.permissions;
    if (raw && raw.trim() !== "") {
      try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
          message.error("Permissions must be a JSON array");
          return;
        }
        values.permissions = parsed;
      } catch {
        message.error("Invalid JSON — permissions must be a valid JSON array");
        return;
      }
    } else {
      values.permissions = [];
    }
    formProps.onFinish?.(values);
  };

  return (
    <Create saveButtonProps={saveButtonProps}>
      <Form {...formProps} onFinish={handleFinish} layout="vertical">
        <Form.Item label="Name" name="name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Description" name="description">
          <Input />
        </Form.Item>
        <Form.Item label="Permissions (JSON)" name="permissions" rules={[{
          validator: (_, value) => {
            if (!value || value.trim() === "") return Promise.resolve();
            try {
              const parsed = JSON.parse(value);
              if (!Array.isArray(parsed)) return Promise.reject(new Error("Permissions must be a JSON array"));
              return Promise.resolve();
            } catch {
              return Promise.reject(new Error("Invalid JSON — must be a valid JSON array"));
            }
          },
        }]}>
          <Input.TextArea rows={4} placeholder='["manage_users", "moderate_listings"]' />
        </Form.Item>
      </Form>
    </Create>
  );
};
