// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useCustom } from "@refinedev/core";
import { Card, Table, Typography, Row, Col, Statistic, Spin, Button, Space, message, Tag } from "antd";
import dayjs from "dayjs";
import axiosInstance from "../../utils/axios";

const { Title } = Typography;

const statusColors: Record<string, string> = {
  active: "green",
  pending: "orange",
  suspended: "red",
  inactive: "default",
};

export const FederationPage = () => {
  const { data, isLoading, refetch } = useCustom({
    url: "/api/admin/system/federation/partners",
    method: "get",
  });

  const { data: statsData } = useCustom({
    url: "/api/admin/system/federation/stats",
    method: "get",
  });

  const partners = (data?.data as any)?.items || (data?.data as any)?.data || [];
  const stats = (statsData?.data as any) || {};

  const handleReactivate = async (id: number) => {
    try {
      await axiosInstance.put(`/api/admin/system/federation/partners/${id}/reactivate`);
      message.success("Partner reactivated");
      refetch();
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.response?.data?.error || "Failed to reactivate");
    }
  };

  const handleSuspend = async (id: number) => {
    try {
      await axiosInstance.put(`/api/admin/system/federation/partners/${id}/suspend`);
      message.success("Partner suspended");
      refetch();
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.response?.data?.error || "Failed to suspend");
    }
  };

  return (
    <div>
      <Title level={4}>Federation</Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card><Statistic title="Total Partners" value={stats.total_partners ?? 0} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="Active Partners" value={stats.active_partners ?? 0} valueStyle={{ color: "#3f8600" }} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="Pending" value={stats.pending_partners ?? 0} valueStyle={{ color: "#faad14" }} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="Total Exchanges" value={stats.total_exchanges ?? 0} /></Card>
        </Col>
      </Row>

      {isLoading ? (
        <Spin />
      ) : (
        <Card>
          <Table dataSource={partners} rowKey="id" size="small" pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t: number) => `${t} total` }}>
            <Table.Column dataIndex="id" title="ID" width={60} />
            <Table.Column dataIndex="name" title="Name" />
            <Table.Column
              dataIndex="status"
              title="Status"
              render={(s: string) => <Tag color={statusColors[s] || "default"}>{s}</Tag>}
            />
            <Table.Column
              dataIndex="created_at"
              title="Created"
              render={(d: string) => (d ? dayjs(d).format("DD MMM YYYY") : "--")}
            />
            <Table.Column
              title="Actions"
              render={(_, r: any) => (
                <Space>
                  {(r.status === "suspended" || r.status === "inactive") && (
                    <Button size="small" type="primary" onClick={() => handleReactivate(r.id)}>Reactivate</Button>
                  )}
                  {r.status === "active" && (
                    <Button size="small" danger onClick={() => handleSuspend(r.id)}>Suspend</Button>
                  )}
                </Space>
              )}
            />
          </Table>
        </Card>
      )}
    </div>
  );
};
