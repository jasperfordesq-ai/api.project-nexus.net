// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useCustom } from "@refinedev/core";
import { Card, Table, Typography, Row, Col, Statistic, Spin, Tabs, Tag, Button, Space, message } from "antd";
import { StatusTag } from "../../components/common/status-tag";
import { useState } from "react";
import dayjs from "dayjs";
import axiosInstance from "../../utils/axios";
import { getErrorMessage } from "../../utils/errors";

const { Title } = Typography;

export const BrokerPage = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const { data: assignmentsData, isLoading, refetch } = useCustom({ url: "/api/admin/broker/assignments", method: "get", config: { query: { page, limit: pageSize } }, queryOptions: { queryKey: ["admin-broker", page, pageSize] } });
  const { data: statsData } = useCustom({ url: "/api/admin/broker/stats", method: "get" });
  const { data: brokersData } = useCustom({ url: "/api/admin/broker/brokers", method: "get" });

  const assignmentsRaw = assignmentsData?.data as any;
  const assignments = assignmentsRaw?.items || assignmentsRaw?.data || [];
  const assignmentsTotalCount = assignmentsRaw?.total || assignmentsRaw?.totalCount || assignments.length;
  const stats = statsData?.data as any;
  const brokers = (brokersData?.data as any)?.items || (brokersData?.data as any)?.data || (Array.isArray(brokersData?.data) ? brokersData.data : []);

  const handleComplete = async (id: number) => {
    try {
      await axiosInstance.put(`/api/admin/broker/assignments/${id}/complete`);
      message.success("Assignment completed");
      refetch();
    } catch (err: unknown) { message.error(getErrorMessage(err, "Failed to complete assignment")); }
  };

  return (
    <div>
      <Title level={4}>Broker Management</Title>

      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col span={6}><Card><Statistic title="Total Assignments" value={stats.total_assignments ?? 0} /></Card></Col>
          <Col span={6}><Card><Statistic title="Active" value={stats.active_assignments ?? 0} /></Card></Col>
          <Col span={6}><Card><Statistic title="Completed" value={stats.completed_assignments ?? 0} /></Card></Col>
          <Col span={6}><Card><Statistic title="Active Brokers" value={stats.active_brokers ?? brokers.length} /></Card></Col>
        </Row>
      )}

      <Tabs items={[
        {
          key: "assignments",
          label: "Assignments",
          children: isLoading ? <Spin /> : (
            <Card>
              <Table dataSource={assignments} rowKey="id" size="small" pagination={{
                    current: page,
                    pageSize,
                    total: assignmentsTotalCount,
                    showSizeChanger: true,
                    showTotal: (t: number) => `${t} total`,
                    onChange: (p: number, ps: number) => { setPage(p); setPageSize(ps); },
                  }}>
                <Table.Column dataIndex="id" title="ID" width={60} />
                <Table.Column dataIndex="broker_id" title="Broker ID" width={80} />
                <Table.Column dataIndex="member_id" title="Member ID" width={80} />
                <Table.Column dataIndex="status" title="Status" render={(s: string) => <StatusTag status={s} />} />
                <Table.Column dataIndex="created_at" title="Created" render={(d: string) => d ? dayjs(d).format("DD MMM YYYY") : "—"} />
                <Table.Column title="Actions" render={(_, r: any) => (
                  <Space>
                    {r.status !== "completed" && <Button size="small" onClick={() => handleComplete(r.id)}>Complete</Button>}
                  </Space>
                )} />
              </Table>
            </Card>
          ),
        },
        {
          key: "brokers",
          label: "Brokers",
          children: (
            <Card>
              <Table dataSource={brokers} rowKey="id" size="small" pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t: number) => `${t} total` }}>
                <Table.Column dataIndex="id" title="ID" width={60} />
                <Table.Column dataIndex="email" title="Email" />
                <Table.Column title="Name" render={(_, r: any) => `${r.first_name || ""} ${r.last_name || ""}`.trim() || "—"} />
              </Table>
            </Card>
          ),
        },
      ]} />
    </div>
  );
};
