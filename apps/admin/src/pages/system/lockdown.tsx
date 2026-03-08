import { useCustom } from "@refinedev/core";
import { Card, Typography, Button, Alert, Space, Spin, Modal, message } from "antd";
import { LockOutlined, UnlockOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import axiosInstance from "../../utils/axios";

const { Title, Text, Paragraph } = Typography;

export const LockdownPage = () => {
  const { data, isLoading, refetch } = useCustom({
    url: "/api/admin/system/lockdown",
    method: "get",
  });

  const lockdownData = data?.data as any;
  const isLocked = lockdownData?.is_locked || lockdownData?.is_active || false;

  const handleActivate = () => {
    Modal.confirm({
      title: "Activate Emergency Lockdown",
      icon: <ExclamationCircleOutlined />,
      content: "This will deactivate ALL tenants immediately. All users will be locked out. Are you absolutely sure?",
      okText: "Activate Lockdown",
      okType: "danger",
      onOk: async () => {
        try {
          await axiosInstance.post("/api/admin/system/lockdown");
          message.success("Lockdown activated");
          refetch();
        } catch (err: any) {
          message.error(err?.response?.data?.message || "Failed to activate lockdown");
        }
      },
    });
  };

  const handleDeactivate = () => {
    Modal.confirm({
      title: "Deactivate Lockdown",
      content: "This will restore all tenants to their pre-lockdown state.",
      okText: "Deactivate",
      onOk: async () => {
        try {
          await axiosInstance.delete("/api/admin/system/lockdown");
          message.success("Lockdown deactivated");
          refetch();
        } catch (err: any) {
          message.error(err?.response?.data?.message || "Failed to deactivate lockdown");
        }
      },
    });
  };

  if (isLoading) return <Spin size="large" style={{ display: "flex", justifyContent: "center", marginTop: 100 }} />;

  return (
    <div>
      <Title level={4}>Emergency Lockdown</Title>

      {isLocked ? (
        <Alert
          type="error"
          showIcon
          icon={<LockOutlined />}
          message="LOCKDOWN IS ACTIVE"
          description="All tenants are currently deactivated. Users cannot access the platform."
          style={{ marginBottom: 24 }}
        />
      ) : (
        <Alert
          type="success"
          showIcon
          icon={<UnlockOutlined />}
          message="System is operating normally"
          description="No lockdown is currently active."
          style={{ marginBottom: 24 }}
        />
      )}

      <Card>
        <Space direction="vertical" size="middle">
          <Paragraph>
            The emergency lockdown feature deactivates all tenants on the platform, effectively
            locking out all users. Tenant states are saved and restored when lockdown is deactivated.
          </Paragraph>
          <Paragraph type="warning">
            Use this only in genuine emergencies (security breach, data incident, etc.).
          </Paragraph>
          {isLocked ? (
            <Button type="primary" size="large" icon={<UnlockOutlined />} onClick={handleDeactivate}>
              Deactivate Lockdown
            </Button>
          ) : (
            <Button danger size="large" icon={<LockOutlined />} onClick={handleActivate}>
              Activate Emergency Lockdown
            </Button>
          )}
        </Space>
      </Card>
    </div>
  );
};
