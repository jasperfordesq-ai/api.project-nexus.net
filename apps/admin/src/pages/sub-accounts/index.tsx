// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useCustom } from "@refinedev/core";
import { Card, Table, Typography, Tag, Button, Space, Popconfirm, message, Tooltip } from "antd";
import { useState } from "react";
import { StopOutlined, DeleteOutlined, CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import axiosInstance from "../../utils/axios";
import { getErrorMessage } from "../../utils/errors";

const { Title } = Typography;

const RELATIONSHIP_COLORS: Record<string, string> = {
  family: "blue",
  dependent: "green",
  minor: "orange",
  managed: "purple",
};

export const SubAccountsPage = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const { data, isLoading, refetch } = useCustom({
    url: "/api/admin/sub-accounts",
    method: "get",
    config: { query: { page, limit: pageSize } },
    queryOptions: { queryKey: ["admin-sub-accounts", page, pageSize] },
  });

  const raw = data?.data as any;
  const subAccounts = raw?.items || raw?.data || [];
  const total = raw?.total || raw?.totalCount || subAccounts.length;

  const deactivate = async (id: number) => {
    try {
      await axiosInstance.put(`/api/admin/sub-accounts/${id}/deactivate`);
      message.success("Sub-account deactivated");
      refetch();
    } catch (err: unknown) {
      message.error(getErrorMessage(err, "Failed to deactivate sub-account"));
    }
  };

  const remove = async (id: number) => {
    try {
      await axiosInstance.delete(`/api/admin/sub-accounts/${id}`);
      message.success("Sub-account removed");
      refetch();
    } catch (err: unknown) {
      message.error(getErrorMessage(err, "Failed to remove sub-account"));
    }
  };

  const boolIcon = (v: boolean) =>
    v ? <CheckCircleOutlined style={{ color: "#52c41a" }} /> : <CloseCircleOutlined style={{ color: "#ff4d4f" }} />;

  const columns = [
    { dataIndex: "id", title: "ID", width: 60 },
    {
      title: "Primary Account",
      render: (_: any, r: any) => (
        <div>
          <div style={{ fontWeight: 500 }}>{r.primary_user_name}</div>
          <div style={{ fontSize: 12, color: "#999" }}>User #{r.primary_user_id}</div>
        </div>
      ),
    },
    {
      title: "Sub Account",
      render: (_: any, r: any) => (
        <div>
          <div style={{ fontWeight: 500 }}>{r.sub_user_name}</div>
          <div style={{ fontSize: 12, color: "#999" }}>User #{r.sub_user_id}</div>
        </div>
      ),
    },
    {
      dataIndex: "relationship",
      title: "Relationship",
      render: (r: string) => <Tag color={RELATIONSHIP_COLORS[r] || "default"}>{r}</Tag>,
    },
    { dataIndex: "display_name", title: "Label", render: (d: string) => d || "—" },
    { title: "Transact", dataIndex: "can_transact", render: boolIcon, align: "center" as const },
    { title: "Message", dataIndex: "can_message", render: boolIcon, align: "center" as const },
    { title: "Groups", dataIndex: "can_join_groups", render: boolIcon, align: "center" as const },
    {
      dataIndex: "is_active",
      title: "Status",
      render: (v: boolean) => <Tag color={v ? "green" : "default"}>{v ? "Active" : "Inactive"}</Tag>,
    },
    { dataIndex: "created_at", title: "Created", render: (d: string) => d ? dayjs(d).format("DD MMM YYYY") : "—" },
    {
      title: "Actions",
      render: (_: any, r: any) => (
        <Space>
          {r.is_active && (
            <Tooltip title="Deactivate">
              <Popconfirm title="Deactivate this sub-account link?" onConfirm={() => deactivate(r.id)} okText="Yes" cancelText="No">
                <Button size="small" icon={<StopOutlined />}>Deactivate</Button>
              </Popconfirm>
            </Tooltip>
          )}
          <Popconfirm title="Permanently remove this sub-account link?" onConfirm={() => remove(r.id)} okText="Remove" okType="danger" cancelText="Cancel">
            <Button size="small" danger icon={<DeleteOutlined />}>Remove</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Sub-Accounts / Family Links</Title>
        <span style={{ color: "#999" }}>{total} relationships</span>
      </div>
      <Card>
        <Table dataSource={subAccounts} rowKey="id" loading={isLoading} size="small" columns={columns} pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (t: number) => `${t} total`,
            onChange: (p: number, ps: number) => { setPage(p); setPageSize(ps); },
          }} />
      </Card>
    </div>
  );
};
