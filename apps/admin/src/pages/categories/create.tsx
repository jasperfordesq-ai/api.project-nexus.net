// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { Create, useForm } from "@refinedev/antd";
import { Form, Input, InputNumber } from "antd";

export const CategoryCreate = () => {
  const { formProps, saveButtonProps } = useForm({
    resource: "categories",
    meta: { apiPath: "/api/admin/categories" },
  });

  return (
    <Create saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Form.Item label="Name" name="name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Slug" name="slug" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Sort Order" name="sort_order" initialValue={0}>
          <InputNumber min={0} />
        </Form.Item>
      </Form>
    </Create>
  );
};
