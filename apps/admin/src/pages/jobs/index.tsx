// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useCustom } from "@refinedev/core";
import { Card, Table, Typography, Row, Col, Statistic, Spin, Button, Space, message, Tag, Select, Modal } from "antd";
import { StarOutlined, StarFilled } from "@ant-design/icons";
import { useState } from "react";
import dayjs from "dayjs";
import axiosInstance from "../../utils/axios";
import { getErrorMessage } from "../../utils/errors";

const { Title } = Typography;

export const JobsAdminPage = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const { data, isLoading, refetch } = useCustom({ url: "/api/admin/jobs", method: "get", config: { query: { page, limit: pageSize } }, queryOptions: { queryKey: ["admin-jobs", page, pageSize] } });
  const { data: statsData } = useCustom({ url: "/api/admin/jobs/stats", method: "get" });

  const raw = data?.data as any;
  const jobs = raw?.items || raw?.data || [];
  const totalCount = raw?.total || raw?.totalCount || jobs.length;
  const stats = statsData?.data as any;

  const handleStatusChange = (id: number, status: string) => {
    Modal.confirm({
      title: `Change job status to "${status}"?`,
      onOk: async () => {
        try {
          await axiosInstance.put("/api/admin/jobs/" + id + "/status", { status });
          message.success("Status updated");
          refetch();
        } catch (err: unknown) { message.error(getErrorMessage(err, "Failed to update job status")); }
      },
    });
  };

  const handleFeature = (id: number) => {
    Modal.confirm({
      title: "Toggle featured status?",
      onOk: async () => {
        try {
          await axiosInstance.post("/api/admin/jobs/" + id + "/feature");
          message.success("Featured toggled");
          refetch();
        } catch (err: unknown) { message.error(getErrorMessage(err, "Failed to toggle featured")); }
      },
    });
  };

  return (
    <div>
      <Title level={4}>Jobs Admin</Title>

      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          {Object.entries(stats).map(([key, value]) => (
            <Col span={6} key={key}><Card><Statistic title={key.replace(/_/g, " ")} value={typeof value === "number" ? value : String(value ?? 0)} /></Card></Col>
          ))}
        </Row>
      )}

      {isLoading ? <Spin /> : (
        <Card>
          <Table dataSource={jobs} rowKey="id" size="small" loading={isLoading} locale={{ emptyText: "No jobs found" }} pagination={{
              current: page,
              pageSize,
              total: totalCount,
              showSizeChanger: true,
              showTotal: (t: number) => `${t} total`,
              onChange: (p: number, ps: number) => { setPage(p); setPageSize(ps); },
            }}>
            <Table.Column dataIndex="id" title="ID" width={60} />
            <Table.Column dataIndex="title" title="Title" />
            <Table.Column dataIndex="status" title="Status" render={(s: string) => (
              <Tag color={s === "active" ? "green" : s === "closed" ? "red" : "default"}>{s}</Tag>
            )} />
            <Table.Column dataIndex="is_featured" title="Featured" render={(v: boolean) => v ? <StarFilled style={{ color: "#faad14" }} /> : <StarOutlined />} />
            <Table.Column dataIndex="created_at" title="Created" render={(d: string) => d ? dayjs(d).format("DD MMM YYYY") : "—"} />
            <Table.Column title="Actions" render={(_, r: any) => (
              <Space>
                <Select size="small" value={r.status} style={{ width: 100 }} onChange={(v) => handleStatusChange(r.id, v)}
                  options={[
                    { label: "Active", value: "active" },
                    { label: "Closed", value: "closed" },
                    { label: "Draft", value: "draft" },
                  ]} />
                <Button size="small" onClick={() => handleFeature(r.id)}>{r.is_featured ? "Unfeature" : "Feature"}</Button>
              </Space>
            )} />
          </Table>
        </Card>
      )}
    </div>
  );
};
