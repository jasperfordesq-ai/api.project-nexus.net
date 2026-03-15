// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useCustom } from "@refinedev/core";
import { Card, Row, Col, Statistic, Typography, Spin, Tag, Button, Space, Descriptions, Badge } from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  DatabaseOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  UserOutlined,
  ScheduleOutlined,
  CloudServerOutlined,
} from "@ant-design/icons";
import { useState, useEffect, useCallback } from "react";
import dayjs from "dayjs";

const { Title } = Typography;

interface ServiceStatus {
  name: string;
  status: "healthy" | "degraded" | "down" | "unknown";
  icon: React.ReactNode;
  detail?: string;
}

export const HealthPage = () => {
  const [lastChecked, setLastChecked] = useState<string>(dayjs().format("HH:mm:ss"));
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data, isLoading, refetch } = useCustom({
    url: "/api/admin/system/health",
    method: "get",
    queryOptions: {
      queryKey: ["admin-system-health"],
      refetchInterval: autoRefresh ? 30000 : false,
    },
  });

  const health = data?.data as any;

  const handleRefresh = useCallback(() => {
    refetch();
    setLastChecked(dayjs().format("HH:mm:ss"));
  }, [refetch]);

  // Update lastChecked when data changes
  useEffect(() => {
    if (health) {
      setLastChecked(dayjs().format("HH:mm:ss"));
    }
  }, [health]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy": return "#52c41a";
      case "degraded": return "#faad14";
      case "down": return "#ff4d4f";
      default: return "#d9d9d9";
    }
  };

  const getStatusTag = (status: string) => {
    const colors: Record<string, string> = { healthy: "success", degraded: "warning", down: "error", unknown: "default" };
    return <Tag color={colors[status] || "default"}>{status.toUpperCase()}</Tag>;
  };

  // Derive service statuses from health response
  const services: ServiceStatus[] = health ? [
    {
      name: "API Server",
      status: "healthy",
      icon: <CloudServerOutlined />,
      detail: health?.server_time ? `Running since ${dayjs(health.server_time).format("HH:mm:ss")}` : "Online",
    },
    {
      name: "Database (PostgreSQL)",
      status: health?.database_size ? "healthy" : "down",
      icon: <DatabaseOutlined />,
      detail: health?.database_size || "Unable to connect",
    },
    {
      name: "Scheduled Tasks",
      status: (health?.failed_scheduled_tasks ?? 0) > 0 ? "degraded" : "healthy",
      icon: <ScheduleOutlined />,
      detail: `${health?.pending_scheduled_tasks ?? 0} pending, ${health?.failed_scheduled_tasks ?? 0} failed`,
    },
  ] : [];

  if (isLoading && !health) {
    return <Spin size="large" style={{ display: "flex", justifyContent: "center", marginTop: 100 }} />;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>System Health</Title>
        <Space>
          <span style={{ color: "#999", fontSize: 12 }}>
            Last checked: {lastChecked}
            {autoRefresh && " (auto-refresh 30s)"}
          </span>
          <Button
            type={autoRefresh ? "primary" : "default"}
            size="small"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={isLoading}>
            Refresh
          </Button>
        </Space>
      </div>

      {/* Service status cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {services.map((svc) => (
          <Col xs={24} sm={12} lg={8} key={svc.name}>
            <Card
              style={{
                borderLeft: `4px solid ${getStatusColor(svc.status)}`,
              }}
            >
              <Space direction="vertical" style={{ width: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Space>
                    <span style={{ fontSize: 20, color: getStatusColor(svc.status) }}>{svc.icon}</span>
                    <strong>{svc.name}</strong>
                  </Space>
                  {getStatusTag(svc.status)}
                </div>
                <span style={{ color: "#666", fontSize: 13 }}>{svc.detail}</span>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Key metrics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Overall Status"
              value={services.some(s => s.status === "down") ? "Degraded" : "Healthy"}
              prefix={
                services.some(s => s.status === "down")
                  ? <CloseCircleOutlined style={{ color: "#ff4d4f" }} />
                  : services.some(s => s.status === "degraded")
                  ? <WarningOutlined style={{ color: "#faad14" }} />
                  : <CheckCircleOutlined style={{ color: "#52c41a" }} />
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Database Size"
              value={health?.database_size || "--"}
              prefix={<DatabaseOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Users"
              value={health?.total_users ?? "--"}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Server Time"
              value={health?.server_time ? dayjs(health.server_time).format("HH:mm:ss") : "--"}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Detailed info */}
      {health && (
        <Card title="Detailed Health Metrics">
          <Descriptions bordered column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label="Total Users">
              {health.total_users ?? "--"}
            </Descriptions.Item>
            <Descriptions.Item label="Active Users (24h)">
              <Badge
                status={(health?.active_users_last_24h ?? 0) > 0 ? "success" : "default"}
                text={health?.active_users_last_24h ?? "--"}
              />
            </Descriptions.Item>
            <Descriptions.Item label="Active Users (7d)">
              <Badge
                status={(health?.active_users_last_7d ?? 0) > 0 ? "success" : "default"}
                text={health?.active_users_last_7d ?? "--"}
              />
            </Descriptions.Item>
            <Descriptions.Item label="Total Tenants">
              {health.total_tenants ?? "--"}
            </Descriptions.Item>
            <Descriptions.Item label="Total Listings">
              {health.total_listings ?? "--"}
            </Descriptions.Item>
            <Descriptions.Item label="Database Size">
              {health.database_size || "--"}
            </Descriptions.Item>
            <Descriptions.Item label="Pending Scheduled Tasks">
              <Tag color={(health.pending_scheduled_tasks || 0) > 0 ? "blue" : "default"}>
                {health.pending_scheduled_tasks ?? 0}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Failed Scheduled Tasks">
              <Tag color={(health.failed_scheduled_tasks || 0) > 0 ? "red" : "green"}>
                {health.failed_scheduled_tasks ?? 0}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Server Time" span={2}>
              {health.server_time ? dayjs(health.server_time).format("DD MMM YYYY HH:mm:ss [UTC]") : "--"}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}
    </div>
  );
};
