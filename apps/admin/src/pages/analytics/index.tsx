// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useCustom } from "@refinedev/core";
import { Row, Col, Card, Statistic, Typography, Table, Spin, Select, Tag } from "antd";
import {
  UserOutlined,
  SwapOutlined,
  RiseOutlined,
  ShoppingOutlined,
  CheckCircleOutlined,
  FieldTimeOutlined,
  TeamOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import { useState } from "react";
import { Line } from "@ant-design/charts";

const { Title } = Typography;

export const AnalyticsPage = () => {
  const [days, setDays] = useState(30);
  const [topMetric, setTopMetric] = useState("exchanges");

  const { data: overviewData, isLoading: overviewLoading } = useCustom({
    url: "/api/admin/analytics/overview",
    method: "get",
  });

  const { data: growthData, isLoading: growthLoading } = useCustom({
    url: "/api/admin/analytics/growth",
    method: "get",
    config: { query: { days } },
    queryOptions: { queryKey: ["admin-analytics-growth", days] },
  });

  const { data: topUsersData } = useCustom({
    url: "/api/admin/analytics/top-users",
    method: "get",
    config: { query: { metric: topMetric, limit: 10 } },
    queryOptions: { queryKey: ["admin-analytics-top-users", topMetric] },
  });

  const { data: exchangeData } = useCustom({
    url: "/api/admin/analytics/exchange-health",
    method: "get",
  });

  const overview = overviewData?.data as any;
  const growth = growthData?.data as any;
  const topUsers = (topUsersData?.data as any)?.users || [];
  const exchange = exchangeData?.data as any;

  if (overviewLoading) return <Spin size="large" style={{ display: "flex", justifyContent: "center", marginTop: 100 }} />;

  const chartData: { date: string; count: number; type: string }[] = [];
  if (growth) {
    (growth.new_users_per_day || []).forEach((d: any) => {
      chartData.push({ date: d.date?.split("T")[0], count: d.count, type: "New Users" });
    });
    (growth.new_listings_per_day || []).forEach((d: any) => {
      chartData.push({ date: d.date?.split("T")[0], count: d.count, type: "New Listings" });
    });
    (growth.new_exchanges_per_day || []).forEach((d: any) => {
      chartData.push({ date: d.date?.split("T")[0], count: d.count, type: "Exchanges" });
    });
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <Title level={4}>Analytics</Title>
        <Select value={days} onChange={setDays} style={{ width: 130 }} options={[
          { label: "7 days", value: 7 },
          { label: "30 days", value: 30 },
          { label: "90 days", value: 90 },
          { label: "365 days", value: 365 },
        ]} />
      </div>

      {overview && (
        <>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic title="Total Users" value={overview.total_users ?? 0} prefix={<UserOutlined />} />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Active Users (30d)"
                  value={overview.active_users ?? 0}
                  prefix={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="New Users (30d)"
                  value={overview.new_users_last_30_days ?? 0}
                  prefix={<RiseOutlined style={{ color: "#1890ff" }} />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic title="Active Listings" value={overview.total_active_listings ?? 0} prefix={<ShoppingOutlined />} />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic title="Total Exchanges" value={overview.total_exchanges ?? 0} prefix={<SwapOutlined />} />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Completed Exchanges"
                  value={overview.completed_exchanges ?? 0}
                  prefix={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Hours Exchanged"
                  value={overview.total_hours_exchanged ?? 0}
                  precision={1}
                  suffix="hrs"
                  prefix={<FieldTimeOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic title="Total Groups" value={overview.total_groups ?? 0} prefix={<TeamOutlined />} />
              </Card>
            </Col>
          </Row>
        </>
      )}

      {chartData.length > 0 && (
        <Card style={{ marginTop: 16 }} title={`Growth (Last ${days} Days)`}>
          <Line
            data={chartData}
            xField="date"
            yField="count"
            seriesField="type"
            shape="smooth"
            height={300}
            axis={{
              x: { label: { autoRotate: true } },
              y: { title: false },
            }}
            scale={{ y: { nice: true, domainMin: 0 } }}
            legend={{ color: { position: "top" } }}
            point={{ size: 3 }}
          />
        </Card>
      )}

      {exchange && (
        <Card style={{ marginTop: 16 }} title="Exchange Health">
          <Row gutter={16}>
            <Col xs={24} sm={12} lg={6}>
              <Statistic title="Completion Rate" value={exchange.completion_rate ?? exchange.completionRate ?? "—"} suffix="%" />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Statistic title="Avg Time to Complete" value={exchange.avg_completion_time ?? exchange.avgCompletionTime ?? "—"} suffix="days" />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Statistic title="Dispute Rate" value={exchange.dispute_rate ?? exchange.disputeRate ?? "—"} suffix="%" />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Statistic title="Pending Exchanges" value={exchange.pending_count ?? exchange.pendingCount ?? 0} />
            </Col>
          </Row>
        </Card>
      )}

      <Card style={{ marginTop: 16 }} title={
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Top Users</span>
          <Select value={topMetric} onChange={setTopMetric} size="small" style={{ width: 160 }} options={[
            { label: "By Exchanges", value: "exchanges" },
            { label: "By XP", value: "xp" },
            { label: "By Hours", value: "hours" },
            { label: "By Listings", value: "listings" },
          ]} />
        </div>
      }>
        <Table
          dataSource={Array.isArray(topUsers) ? topUsers : []}
          rowKey={(r: any) => r.id || r.user_id}
          size="small"
          pagination={false}
          locale={{ emptyText: "No data available" }}
        >
          <Table.Column title="Rank" render={(_, __, i) => (
            <Tag color={i === 0 ? "gold" : i === 1 ? "default" : i === 2 ? "orange" : undefined}>
              #{i + 1}
            </Tag>
          )} width={70} />
          <Table.Column dataIndex="email" title="Email" />
          <Table.Column title="Name" render={(_, r: any) => `${r.first_name || ""} ${r.last_name || ""}`.trim() || "—"} />
          <Table.Column dataIndex="value" title="Value" />
        </Table>
      </Card>
    </div>
  );
};
