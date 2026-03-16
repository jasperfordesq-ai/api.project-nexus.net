// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useCustom } from "@refinedev/core";
import { Card, Row, Col, Statistic, Typography, Spin, Button, Space, message, Select, Tag } from "antd";
import { SyncOutlined, CheckCircleOutlined, WarningOutlined } from "@ant-design/icons";
import { useState } from "react";
import axiosInstance from "../../utils/axios";
import { getErrorMessage } from "../../utils/errors";

const { Title, Text } = Typography;

export const SearchAdminPage = () => {
  const { data, isLoading, refetch } = useCustom({ url: "/api/admin/search/stats", method: "get" });
  const stats = data?.data as any;
  const [reindexing, setReindexing] = useState(false);
  const [reindexType, setReindexType] = useState<string | null>(null);

  const handleFullReindex = async () => {
    setReindexing(true);
    try {
      await axiosInstance.post("/api/admin/search/reindex");
      message.success("Full reindex started");
      refetch();
    } catch (err: unknown) { message.error(getErrorMessage(err, "Failed to start reindex")); }
    finally { setReindexing(false); }
  };

  const handleTypeReindex = async (type: string) => {
    setReindexing(true);
    try {
      await axiosInstance.post("/api/admin/search/reindex/" + type);
      message.success("Reindex started for: " + type);
      refetch();
    } catch (err: unknown) { message.error(getErrorMessage(err, "Failed to start reindex")); }
    finally { setReindexing(false); }
  };

  if (isLoading) return <Spin size="large" style={{ display: "flex", justifyContent: "center", marginTop: 100 }} />;

  return (
    <div>
      <Title level={4}>Search Administration</Title>
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} lg={8}>
            <Card><Statistic title="Status" value={stats.enabled ? "Enabled" : "Disabled"}
              prefix={stats.enabled ? <CheckCircleOutlined style={{ color: "#52c41a" }} /> : <WarningOutlined style={{ color: "#faad14" }} />} /></Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card><Statistic title="Health" value={stats.healthy ? "Healthy" : "Unhealthy"}
              prefix={stats.healthy ? <CheckCircleOutlined style={{ color: "#52c41a" }} /> : <WarningOutlined style={{ color: "#ff4d4f" }} />} /></Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card><Statistic title="Total Documents" value={stats.total_documents ?? 0} /></Card>
          </Col>
        </Row>
      )}
      <Card title="Reindex">
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Space>
            <Button type="primary" icon={<SyncOutlined />} loading={reindexing} onClick={handleFullReindex}>Full Reindex</Button>
            <Text type="secondary">Reindexes all document types for the current tenant</Text>
          </Space>
          <Space>
            <Select placeholder="Select type" style={{ width: 200 }} onChange={setReindexType}
              options={["listings", "users", "groups", "events", "kb", "jobs"].map(t => ({ label: t, value: t }))} />
            <Button icon={<SyncOutlined />} loading={reindexing} disabled={!reindexType}
              onClick={() => reindexType && handleTypeReindex(reindexType)}>Reindex Type</Button>
          </Space>
        </Space>
      </Card>
    </div>
  );
};
