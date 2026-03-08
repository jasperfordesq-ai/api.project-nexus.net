import { Edit, useForm } from "@refinedev/antd";
import { Form, Input, Select } from "antd";

export const UserEdit = () => {
  const { formProps, saveButtonProps } = useForm({
    resource: "users",
    meta: { apiPath: "/api/admin/users" },
  });

  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Form.Item label="Email" name="email" rules={[{ required: true, type: "email" }]}>
          <Input />
        </Form.Item>
        <Form.Item label="First Name" name="first_name">
          <Input />
        </Form.Item>
        <Form.Item label="Last Name" name="last_name">
          <Input />
        </Form.Item>
        <Form.Item label="Role" name="role" rules={[{ required: true }]}>
          <Select options={[
            { label: "Admin", value: "admin" },
            { label: "Member", value: "member" },
          ]} />
        </Form.Item>
      </Form>
    </Edit>
  );
};
