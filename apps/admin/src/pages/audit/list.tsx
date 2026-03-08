import { useCustom } from "@refinedev/core";
import { Card, Table, Typography, Input, Select, Space, Spin, Tag, DatePicker } from "antd";
import { useState } from "react";
import dayjs from "dayjs";

const { Title } = Typography;

export const AuditLogList = () => {
  const [filters, setFilters] = useState<Record<string, any>>({});
  const { data, isLoading, refetch } = useCustom({
    url: "/api/admin/audit",
    method: "get",
    config: { query: { page: 1, limit: 50, ...filters } },
  });

  const responseData = data?.data as any;
  const logs = responseData?.items || responseData?.data || [];

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
          <Table dataSource={logs} rowKey={(r: any) => r.id || `${r.timestamp}-${r.action}`} size="small" pagination={{ pageSize: 50 }}>
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
