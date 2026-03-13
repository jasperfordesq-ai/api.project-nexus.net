// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Layout, Menu, theme, Typography } from "antd";
import {
  DashboardOutlined,
  UserOutlined,
  ContactsOutlined,
  BankOutlined,
  TeamOutlined,
  FileSearchOutlined,
  AppstoreOutlined,
  ReadOutlined,
  FileTextOutlined,
  CalendarOutlined,
  UsergroupAddOutlined,
  TrophyOutlined,
  ApiOutlined,
  ScheduleOutlined,
  BellOutlined,
  MailOutlined,
  TranslationOutlined,
  SafetyCertificateOutlined,
  IdcardOutlined,
  AuditOutlined,
  SettingOutlined,
  ToolOutlined,
  NotificationOutlined,
  LockOutlined,
  HeartOutlined,
  BarChartOutlined,
  SearchOutlined,
  SendOutlined,
  QuestionCircleOutlined,
  SafetyOutlined,
  ClusterOutlined,
  GlobalOutlined,
  FlagOutlined,
  SolutionOutlined,
  DesktopOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import { AdminHeader } from "./header";

const { Sider, Header, Content } = Layout;
const { Title } = Typography;

const menuItems = [
  {
    key: "/",
    icon: <DashboardOutlined />,
    label: "Dashboard",
  },
  {
    key: "people",
    icon: <UserOutlined />,
    label: "People",
    children: [
      { key: "/users", icon: <UserOutlined />, label: "Users" },
      { key: "/crm", icon: <ContactsOutlined />, label: "CRM" },
      { key: "/organisations", icon: <BankOutlined />, label: "Organisations" },
      { key: "/broker", icon: <TeamOutlined />, label: "Broker" },
      { key: "/saved-searches", icon: <SaveOutlined />, label: "Saved Searches" },
      { key: "/sub-accounts", icon: <TeamOutlined />, label: "Sub-Accounts" },
    ],
  },
  {
    key: "content",
    icon: <FileSearchOutlined />,
    label: "Content",
    children: [
      { key: "/moderation", icon: <FileSearchOutlined />, label: "Moderation" },
      { key: "/categories", icon: <AppstoreOutlined />, label: "Categories" },
      { key: "/blog", icon: <ReadOutlined />, label: "Blog" },
      { key: "/pages-cms", icon: <FileTextOutlined />, label: "Pages" },
      { key: "/faq", icon: <QuestionCircleOutlined />, label: "FAQ" },
      { key: "/reports", icon: <FlagOutlined />, label: "Reports" },
    ],
  },
  {
    key: "community",
    icon: <UsergroupAddOutlined />,
    label: "Community",
    children: [
      { key: "/events", icon: <CalendarOutlined />, label: "Events" },
      { key: "/groups", icon: <UsergroupAddOutlined />, label: "Groups" },
      { key: "/gamification", icon: <TrophyOutlined />, label: "Gamification" },
      { key: "/matching", icon: <ApiOutlined />, label: "Matching" },
      { key: "/jobs", icon: <ScheduleOutlined />, label: "Jobs" },
    ],
  },
  {
    key: "communication",
    icon: <BellOutlined />,
    label: "Communication",
    children: [
      { key: "/notifications", icon: <BellOutlined />, label: "Notifications" },
      { key: "/email-templates", icon: <MailOutlined />, label: "Email Templates" },
      { key: "/translations", icon: <TranslationOutlined />, label: "Translations" },
      { key: "/newsletter", icon: <SendOutlined />, label: "Newsletter" },
    ],
  },
  {
    key: "security",
    icon: <SafetyCertificateOutlined />,
    label: "Security",
    children: [
      { key: "/roles", icon: <SafetyCertificateOutlined />, label: "Roles & Permissions" },
      { key: "/vetting", icon: <IdcardOutlined />, label: "Vetting" },
      { key: "/audit", icon: <AuditOutlined />, label: "Audit Logs" },
      { key: "/registration", icon: <IdcardOutlined />, label: "Registration" },
    ],
  },
  {
    key: "system",
    icon: <SettingOutlined />,
    label: "System",
    children: [
      { key: "/system/settings", icon: <SettingOutlined />, label: "Settings" },
      { key: "/system/config", icon: <ToolOutlined />, label: "Tenant Config" },
      { key: "/system/announcements", icon: <NotificationOutlined />, label: "Announcements" },
      { key: "/system/lockdown", icon: <LockOutlined />, label: "Lockdown" },
      { key: "/system/health", icon: <HeartOutlined />, label: "Health" },
      { key: "/analytics", icon: <BarChartOutlined />, label: "Analytics" },
      { key: "/search-admin", icon: <SearchOutlined />, label: "Search" },
      { key: "/gdpr", icon: <SafetyOutlined />, label: "GDPR" },
      { key: "/enterprise", icon: <ClusterOutlined />, label: "Enterprise" },
      { key: "/federation", icon: <GlobalOutlined />, label: "Federation" },
      { key: "/staffing", icon: <SolutionOutlined />, label: "Staffing" },
      { key: "/sessions", icon: <DesktopOutlined />, label: "Sessions" },
    ],
  },
];

export const AdminLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { token: themeToken } = theme.useToken();

  // Find the active menu key
  const selectedKey = location.pathname === "/" ? "/" : location.pathname;

  // Find open submenu
  const openKeys = menuItems
    .filter((item) => "children" in item && item.children?.some((c) => selectedKey.startsWith(c.key)))
    .map((item) => item.key);

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={240}
        style={{
          overflow: "auto",
          height: "100vh",
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          background: themeToken.colorBgContainer,
          borderRight: `1px solid ${themeToken.colorBorderSecondary}`,
        }}
      >
        <div
          style={{
            height: 48,
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "flex-start",
            padding: collapsed ? 0 : "0 16px",
            borderBottom: `1px solid ${themeToken.colorBorderSecondary}`,
          }}
        >
          {collapsed ? (
            <Title level={5} style={{ margin: 0, color: themeToken.colorPrimary }}>N</Title>
          ) : (
            <Title level={5} style={{ margin: 0, color: themeToken.colorPrimary }}>
              NEXUS Admin
            </Title>
          )}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          defaultOpenKeys={openKeys}
          items={menuItems}
          onClick={({ key }) => {
            if (key && !["people", "content", "community", "communication", "security", "system"].includes(key)) {
              navigate(key);
            }
          }}
          style={{ border: "none" }}
        />
      </Sider>
      <Layout style={{ marginLeft: collapsed ? 80 : 240, transition: "margin-left 0.2s" }}>
        <Header
          style={{
            padding: 0,
            background: themeToken.colorBgContainer,
            borderBottom: `1px solid ${themeToken.colorBorderSecondary}`,
            position: "sticky",
            top: 0,
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{ padding: "0 16px", cursor: "pointer" }}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </div>
          <AdminHeader />
        </Header>
        <Content style={{ margin: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};
