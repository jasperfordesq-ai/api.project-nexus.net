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
        <Form.Item label="Display Name" name="display_name">
          <Input />
        </Form.Item>
        <Form.Item label="Permissions (JSON)" name="permissions">
          <Input.TextArea rows={4} />
        </Form.Item>
      </Form>
    </Edit>
  );
};
