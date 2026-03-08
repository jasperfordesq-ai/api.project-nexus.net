import { Space, Typography, Avatar, Dropdown, Button, Tooltip, theme } from "antd";
import { UserOutlined, LogoutOutlined, BulbOutlined, BulbFilled } from "@ant-design/icons";
import { useGetIdentity, useLogout } from "@refinedev/core";
import { TenantSwitcher } from "./tenant-switcher";
import { useThemeMode } from "../../contexts/theme-context";

const { Text } = Typography;

export const AdminHeader = () => {
  const { data: identity } = useGetIdentity<{
    name: string;
    email: string;
    role: string;
  }>();
  const { mutate: logout } = useLogout();
  const { token: themeToken } = theme.useToken();
  const { mode, toggle } = useThemeMode();

  const menuItems = [
    {
      key: "logout",
      label: "Logout",
      icon: <LogoutOutlined />,
      onClick: () => logout(),
    },
  ];

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "center",
        padding: "0 24px",
        height: "100%",
        gap: 12,
      }}
    >
      <TenantSwitcher />

      <Tooltip title={mode === "light" ? "Dark mode" : "Light mode"}>
        <Button
          type="text"
          size="small"
          icon={mode === "light" ? <BulbOutlined /> : <BulbFilled />}
          onClick={toggle}
        />
      </Tooltip>

      <Dropdown menu={{ items: menuItems }} placement="bottomRight">
        <Space style={{ cursor: "pointer" }}>
          <Avatar
            size="small"
            icon={<UserOutlined />}
            style={{ backgroundColor: themeToken.colorPrimary }}
          />
          <Text>{identity?.name || "Admin"}</Text>
        </Space>
      </Dropdown>
    </div>
  );
};
