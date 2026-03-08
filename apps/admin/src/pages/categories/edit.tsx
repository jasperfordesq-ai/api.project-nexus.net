import { Edit, useForm } from "@refinedev/antd";
import { Form, Input, InputNumber } from "antd";

export const CategoryEdit = () => {
  const { formProps, saveButtonProps } = useForm({
    resource: "categories",
    meta: { apiPath: "/api/admin/categories" },
  });

  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Form.Item label="Name" name="name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Slug" name="slug" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Sort Order" name="sort_order">
          <InputNumber min={0} />
        </Form.Item>
      </Form>
    </Edit>
  );
};
