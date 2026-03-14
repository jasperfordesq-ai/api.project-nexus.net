// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useCustom } from "@refinedev/core";
import { Card, Table, Typography, Input, Select, Space, Spin, Tag, DatePicker, Row, Col, Statistic, Button } from "antd";
import { AuditOutlined, WarningOutlined, InfoCircleOutlined, ExclamationCircleOutlined, ReloadOutlined } from "@ant-design/icons";
import { useState } from "react";
import dayjs from "dayjs";

const { Title } = Typography;
const { RangePicker } = DatePicker;

const severityColors: Record<string, string> = {
  info: "blue",
  warning: "orange",
  critical: "red",
  error: "red",
  debug: "default",
};

const severityIcons: Record<string, any> = {
  info: <InfoCircleOutlined />,
  warning: <WarningOutlined />,
  critical: <ExclamationCircleOutlined />,
};

export const AuditLogList = () => {
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const { data, isLoading, refetch } = useCustom({
    url: "/api/admin/audit",
    method: "get",
    config: { query: { page, limit: pageSize, ...filters } },
    queryOptions: { queryKey: ["admin-audit", page, pageSize, filters] },
  });

  const responseData = data?.data as any;
  const logs = responseData?.items || responseData?.data || [];
  const totalCount = responseData?.total || responseData?.totalCount || logs.length;

  const updateFilter = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value || undefined };
    Object.keys(newFilters).forEach(k => newFilters[k] === undefined && delete newFilters[k]);
    setFilters(newFilters);
    setPage(1);
  };

  const handleDateRange = (dates: any) => {
    if (dates && dates[0] && dates[1]) {
      updateFilter("from_date", dates[0].format("YYYY-MM-DD"));
      // Also set to_date — need to handle separately since updateFilter only sets one key
      setFilters(prev => ({
        ...prev,
        from_date: dates[0].format("YYYY-MM-DD"),
        to_date: dates[1].format("YYYY-MM-DD"),
      }));
      setPage(1);
    } else {
      setFilters(prev => {
        const next = { ...prev };
        delete next.from_date;
        delete next.to_date;
        return next;
      });
      setPage(1);
    }
  };

  const clearFilters = () => {
    setFilters({});
    setPage(1);
  };

  // Count severities from visible data
  const criticalCount = logs.filter((l: any) => l.severity === "critical").length;
  const warningCount = logs.filter((l: any) => l.severity === "warning").length;
  const infoCount = logs.filter((l: any) => l.severity === "info").length;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <Title level={4}>Audit Logs</Title>
        <Button icon={<ReloadOutlined />} onClick={() => refetch()}>Refresh</Button>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Total Logs" value={totalCount} prefix={<AuditOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Critical" value={criticalCount} valueStyle={{ color: "#cf1322" }} prefix={<ExclamationCircleOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Warnings" value={warningCount} valueStyle={{ color: "#faad14" }} prefix={<WarningOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Info" value={infoCount} prefix={<InfoCircleOutlined style={{ color: "#1890ff" }} />} />
          </Card>
        </Col>
      </Row>

      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search placeholder="User ID" style={{ width: 140 }} onSearch={(v) => updateFilter("user_id", v)} allowClear />
        <Input.Search placeholder="Action" style={{ width: 160 }} onSearch={(v) => updateFilter("action", v)} allowClear />
        <Input.Search placeholder="Entity type" style={{ width: 150 }} onSearch={(v) => updateFilter("entity_type", v)} allowClear />
        <Select placeholder="Severity" allowClear style={{ width: 130 }} onChange={(v) => updateFilter("severity", v)}
          options={[
            { label: "Info", value: "info" },
            { label: "Warning", value: "warning" },
            { label: "Critical", value: "critical" },
          ]} />
        <RangePicker onChange={handleDateRange} format="YYYY-MM-DD" />
        {Object.keys(filters).length > 0 && (
          <Button onClick={clearFilters}>Clear Filters</Button>
        )}
      </Space>

      {isLoading ? <Spin /> : (
        <Card>
          <Table
            dataSource={logs}
            rowKey={(r: any) => r.id || `${r.timestamp}-${r.action}`}
            size="small"
            locale={{ emptyText: "No audit logs found" }}
            pagination={{
              current: page,
              pageSize,
              total: totalCount,
              showSizeChanger: true,
              showTotal: (t: number) => `${t} total`,
              onChange: (p: number, ps: number) => { setPage(p); setPageSize(ps); },
            }}
          >
            <Table.Column
              dataIndex="timestamp"
              title="Timestamp"
              width={170}
              render={(d: string) => d ? dayjs(d).format("DD/MM/YY HH:mm:ss") : "—"}
              sorter={(a: any, b: any) => dayjs(a.timestamp).unix() - dayjs(b.timestamp).unix()}
            />
            <Table.Column
              dataIndex="user_id"
              title="User"
              width={80}
              render={(id: number) => id ? `#${id}` : "System"}
            />
            <Table.Column dataIndex="action" title="Action" />
            <Table.Column dataIndex="entity_type" title="Resource" />
            <Table.Column dataIndex="entity_id" title="Resource ID" width={90} />
            <Table.Column
              dataIndex="severity"
              title="Severity"
              width={100}
              render={(s: string) => (
                <Tag
                  color={severityColors[s] || "default"}
                  icon={severityIcons[s]}
                >
                  {s ? s.charAt(0).toUpperCase() + s.slice(1) : "—"}
                </Tag>
              )}
            />
            <Table.Column
              dataIndex="ip_address"
              title="IP"
              width={120}
              render={(ip: string) => ip || "—"}
            />
            <Table.Column dataIndex="details" title="Details" ellipsis />
          </Table>
        </Card>
      )}
    </div>
  );
};
