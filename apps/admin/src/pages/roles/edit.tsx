// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { Edit, useForm } from "@refinedev/antd";
import { Form, Input, message } from "antd";
import { useEffect } from "react";

export const RoleEdit = () => {
  const { formProps, saveButtonProps, queryResult } = useForm({
    resource: "roles",
    meta: { apiPath: "/api/admin/roles" },
  });

  // Convert permissions array from backend into a JSON string for the textarea
  useEffect(() => {
    const data = queryResult?.data?.data as any;
    if (data) {
      formProps.form?.setFieldsValue({
        ...data,
        permissions: Array.isArray(data.permissions)
          ? JSON.stringify(data.permissions, null, 2)
          : data.permissions,
      });
    }
  }, [queryResult?.data?.data]);

  const handleFinish = (values: any) => {
    const raw = values.permissions;
    if (raw && typeof raw === "string" && raw.trim() !== "") {
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
    } else if (!Array.isArray(raw)) {
      values.permissions = [];
    }
    formProps.onFinish?.(values);
  };

  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Form {...formProps} onFinish={handleFinish} layout="vertical">
        <Form.Item label="Name" name="name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Description" name="description">
          <Input />
        </Form.Item>
        <Form.Item label="Permissions (JSON)" name="permissions" rules={[{
          validator: (_, value) => {
            if (!value || (typeof value === "string" && value.trim() === "") || Array.isArray(value)) return Promise.resolve();
            try {
              const parsed = JSON.parse(value);
              if (!Array.isArray(parsed)) return Promise.reject(new Error("Permissions must be a JSON array"));
              return Promise.resolve();
            } catch {
              return Promise.reject(new Error("Invalid JSON — must be a valid JSON array"));
            }
          },
        }]}>
          <Input.TextArea rows={4} />
        </Form.Item>
      </Form>
    </Edit>
  );
};
