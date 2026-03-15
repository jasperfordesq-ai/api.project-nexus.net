// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { Edit, useForm } from "@refinedev/antd";
import { Form, Input } from "antd";

export const RoleEdit = () => {
  const { formProps, saveButtonProps } = useForm({
    resource: "roles",
    meta: { apiPath: "/api/admin/roles" },
  });

  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
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
          <Input.TextArea rows={4} />
        </Form.Item>
      </Form>
    </Edit>
  );
};
