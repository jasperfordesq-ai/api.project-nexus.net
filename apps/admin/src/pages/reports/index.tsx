// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useCustom } from "@refinedev/core";
import { Card, Table, Typography, Row, Col, Statistic, Spin, Button, message, Tag } from "antd";
import { useState } from "react";
import dayjs from "dayjs";
import axiosInstance from "../../utils/axios";
import { getErrorMessage } from "../../utils/errors";

const { Title } = Typography;

const statusColors: Record<string, string> = {
  pending: "orange",
  underreview: "blue",
  actiontaken: "green",
  dismissed: "default",
  escalated: "red",
};

export const ReportsPage = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const { data, isLoading, refetch } = useCustom({
    url: "/api/admin/reports",
    method: "get",
    config: { query: { page, limit: pageSize } },
    queryOptions: { queryKey: ["admin-reports", page, pageSize] },
  });

  const { data: statsData } = useCustom({
    url: "/api/admin/reports/stats",
    method: "get",
  });

  const raw = data?.data as any;
  const reports = raw?.items || raw?.data || [];
  const totalCount = raw?.pagination?.total || raw?.total || raw?.totalCount || reports.length;
  const statsRaw = statsData?.data as any;
  const stats = statsRaw?.data || statsRaw || {};
  const numericStats = Object.entries(stats).filter(([, value]) => typeof value === "number");

  const handleReview = async (id: number) => {
    try {
      await axiosInstance.put(`/api/admin/reports/${id}/review`, {
        status: 1,
        notes: "Marked as under review from the admin panel",
      });
      message.success("Report marked as under review");
      refetch();
    } catch (err: unknown) {
      message.error(getErrorMessage(err, "Failed to update report"));
    }
  };

  return (
    <div>
      <Title level={4}>Reports</Title>

      {numericStats.length > 0 && (
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          {numericStats.map(([key, value]) => (
            <Col xs={24} sm={12} lg={6} key={key}>
              <Card>
                <Statistic title={key.replace(/_/g, " ")} value={typeof value === "number" ? value : String(value ?? 0)} />
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {isLoading ? (
        <Spin />
      ) : (
        <Card>
          <Table dataSource={reports} rowKey="id" size="small" pagination={{
              current: page,
              pageSize,
              total: totalCount,
              showSizeChanger: true,
              showTotal: (t: number) => `${t} total`,
              onChange: (p: number, ps: number) => { setPage(p); setPageSize(ps); },
            }}>
            <Table.Column dataIndex="id" title="ID" width={60} />
            <Table.Column dataIndex="content_type" title="Content Type" />
            <Table.Column dataIndex="reason" title="Reason" />
            <Table.Column
              dataIndex="status"
              title="Status"
              render={(s: string) => <Tag color={statusColors[s] || "default"}>{s}</Tag>}
            />
            <Table.Column
              title="Reporter"
              render={(_, r: any) => {
                const reporter = r.reporter;
                if (!reporter) return "--";
                return `${reporter.first_name || ""} ${reporter.last_name || ""}`.trim() || `User #${reporter.id}`;
              }}
            />
            <Table.Column
              dataIndex="created_at"
              title="Reported"
              render={(d: string) => (d ? dayjs(d).format("DD MMM YYYY") : "--")}
            />
            <Table.Column
              title="Actions"
              render={(_, r: any) => (
                r.status === "pending" ? (
                  <Button size="small" type="primary" onClick={() => handleReview(r.id)}>Review</Button>
                ) : null
              )}
            />
          </Table>
        </Card>
      )}
    </div>
  );
};
