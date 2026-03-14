// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useCustom } from "@refinedev/core";
import { Card, Table, Typography, Row, Col, Statistic, Spin, Button, message, Modal } from "antd";
import { ExclamationCircleOutlined, DeleteOutlined } from "@ant-design/icons";
import { useState } from "react";
import axiosInstance from "../../utils/axios";

const { Title } = Typography;

export const GroupsAdminPage = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const { data, isLoading, refetch } = useCustom({ url: "/api/admin/groups", method: "get", config: { query: { page, limit: pageSize } }, queryOptions: { queryKey: ["admin-groups", page, pageSize] } });
  const { data: statsData } = useCustom({ url: "/api/admin/groups/stats", method: "get" });

  const raw = data?.data as any;
  const groups = raw?.items || raw?.data || (Array.isArray(data?.data) ? data.data : []);
  const totalCount = raw?.total || raw?.totalCount || groups.length;
  const stats = statsData?.data as any;

  const handleDelete = (id: number, name: string) => {
    Modal.confirm({
      title: "Delete Group",
      icon: <ExclamationCircleOutlined />,
      content: `Delete "${name}"? All members will be removed. This cannot be undone.`,
      okType: "danger",
      onOk: async () => {
        try {
          await axiosInstance.delete(`/api/admin/groups/${id}`);
          message.success("Group deleted");
          refetch();
        } catch (err: any) { message.error(err?.response?.data?.message || "Failed"); }
      },
    });
  };

  return (
    <div>
      <Title level={4}>Groups Management</Title>
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          {Object.entries(stats).map(([key, value]) => (
            <Col span={6} key={key}><Card><Statistic title={key.replace(/_/g, " ")} value={typeof value === "number" ? value : String(value ?? 0)} /></Card></Col>
          ))}
        </Row>
      )}
      {isLoading ? <Spin /> : (
        <Card>
          <Table dataSource={groups} rowKey="id" size="small" pagination={{
                current: page,
                pageSize,
                total: totalCount,
                showSizeChanger: true,
                showTotal: (t: number) => `${t} total`,
                onChange: (p: number, ps: number) => { setPage(p); setPageSize(ps); },
              }}>
            <Table.Column dataIndex="id" title="ID" width={60} />
            <Table.Column dataIndex="name" title="Name" />
            <Table.Column dataIndex="member_count" title="Members" />
            <Table.Column dataIndex="type" title="Type" />
            <Table.Column title="Actions" render={(_, r: any) => (
              <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(r.id, r.name)}>Delete</Button>
            )} />
          </Table>
        </Card>
      )}
    </div>
  );
};
