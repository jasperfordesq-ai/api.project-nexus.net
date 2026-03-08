import { Create, useForm } from "@refinedev/antd";
import { Form, Input } from "antd";

export const RoleCreate = () => {
  const { formProps, saveButtonProps } = useForm({
    resource: "roles",
    meta: { apiPath: "/api/admin/roles" },
  });

  return (
    <Create saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Form.Item label="Name" name="name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Display Name" name="display_name">
          <Input />
        </Form.Item>
        <Form.Item label="Permissions (JSON)" name="permissions">
          <Input.TextArea rows={4} placeholder='["manage_users", "moderate_listings"]' />
        </Form.Item>
      </Form>
    </Create>
  );
};
