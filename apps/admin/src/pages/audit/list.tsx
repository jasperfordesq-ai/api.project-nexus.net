// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useCustom } from "@refinedev/core";
import { Card, Table, Typography, Input, Select, Space, Spin, Tag } from "antd";
import { useState } from "react";
import dayjs from "dayjs";

const { Title } = Typography;

export const AuditLogList = () => {
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const { data, isLoading, refetch } = useCustom({
    url: "/api/admin/audit",
    method: "get",
    config: { query: { page, limit: pageSize, ...filters } },
  });

  const responseData = data?.data as any;
  const logs = responseData?.items || responseData?.data || [];
  const totalCount = responseData?.total || responseData?.totalCount || logs.length;

  const updateFilter = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value || undefined };
    Object.keys(newFilters).forEach(k => newFilters[k] === undefined && delete newFilters[k]);
    setFilters(newFilters);
  };

  return (
    <div>
      <Title level={4}>Audit Logs</Title>

      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search placeholder="User ID" style={{ width: 140 }} onSearch={(v) => { updateFilter("user_id", v); refetch(); }} allowClear />
        <Input.Search placeholder="Action" style={{ width: 160 }} onSearch={(v) => { updateFilter("action", v); refetch(); }} allowClear />
        <Select placeholder="Severity" allowClear style={{ width: 130 }} onChange={(v) => { updateFilter("severity", v); refetch(); }}
          options={[
            { label: "Info", value: "info" },
            { label: "Warning", value: "warning" },
            { label: "Critical", value: "critical" },
          ]} />
      </Space>

      {isLoading ? <Spin /> : (
        <Card>
          <Table dataSource={logs} rowKey={(r: any) => r.id || `${r.timestamp}-${r.action}`} size="small" pagination={{
              current: page,
              pageSize,
              total: totalCount,
              showSizeChanger: true,
              showTotal: (t: number) => `${t} total`,
              onChange: (p: number, ps: number) => { setPage(p); setPageSize(ps); },
            }}>
            <Table.Column dataIndex="timestamp" title="Time" width={160}
              render={(d: string) => d ? dayjs(d).format("DD/MM/YY HH:mm:ss") : "—"} />
            <Table.Column dataIndex="user_id" title="User" width={70} />
            <Table.Column dataIndex="action" title="Action" />
            <Table.Column dataIndex="entity_type" title="Entity" />
            <Table.Column dataIndex="entity_id" title="Entity ID" width={80} />
            <Table.Column dataIndex="severity" title="Severity" render={(s: string) => {
              const colors: Record<string, string> = { info: "blue", warning: "orange", critical: "red" };
              return <Tag color={colors[s] || "default"}>{s}</Tag>;
            }} />
            <Table.Column dataIndex="details" title="Details" ellipsis />
          </Table>
        </Card>
      )}
    </div>
  );
};
