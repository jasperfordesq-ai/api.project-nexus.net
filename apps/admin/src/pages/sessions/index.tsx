// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useCustom } from "@refinedev/core";
import { Card, Table, Typography, Tag, Button, Space, Tooltip, Popconfirm, message, Switch } from "antd";
import { DeleteOutlined, StopOutlined } from "@ant-design/icons";
import { useState } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import axiosInstance from "../../utils/axios";
import { getErrorMessage } from "../../utils/errors";

dayjs.extend(relativeTime);
const { Title } = Typography;

export const SessionsPage = () => {
  const [activeOnly, setActiveOnly] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const { data, isLoading, refetch } = useCustom({
    url: "/api/admin/sessions",
    method: "get",
    config: { query: { page, limit: pageSize, active_only: activeOnly } },
    queryOptions: { queryKey: ["admin-sessions", activeOnly, page, pageSize] },
  });

  const raw = data?.data as any;
  const sessions = raw?.items || raw?.data || [];
  const total = raw?.total || raw?.totalCount || sessions.length;

  const terminate = async (id: number) => {
    try {
      await axiosInstance.delete(`/api/admin/sessions/${id}`);
      message.success("Session terminated");
      refetch();
    } catch (err: unknown) {
      message.error(getErrorMessage(err, "Failed to terminate session"));
    }
  };

  const terminateAll = async (userId: number, userName: string) => {
    try {
      await axiosInstance.delete(`/api/admin/sessions/user/${userId}`);
      message.success(`All sessions terminated for ${userName}`);
      refetch();
    } catch (err: unknown) {
      message.error(getErrorMessage(err, "Failed to terminate sessions"));
    }
  };

  const columns = [
    { dataIndex: "id", title: "ID", width: 60 },
    {
      title: "User",
      render: (_: any, r: any) => (
        <div>
          <div style={{ fontWeight: 500 }}>{r.user_name}</div>
          <div style={{ fontSize: 12, color: "#999" }}>{r.user_email}</div>
        </div>
      ),
    },
    { dataIndex: "ip_address", title: "IP Address", render: (ip: string) => ip || "—" },
    { dataIndex: "device_info", title: "Device", render: (d: string) => d || "—", ellipsis: true },
    {
      dataIndex: "is_active",
      title: "Status",
      render: (active: boolean) => <Tag color={active ? "green" : "default"}>{active ? "Active" : "Expired"}</Tag>,
    },
    { dataIndex: "last_activity_at", title: "Last Activity", render: (d: string) => d ? dayjs(d).fromNow() : "—" },
    {
      dataIndex: "expires_at",
      title: "Expires",
      render: (d: string) => {
        if (!d) return "—";
        const isExpired = dayjs(d).isBefore(dayjs());
        return <span style={{ color: isExpired ? "#ff4d4f" : undefined }}>{dayjs(d).format("DD MMM HH:mm")}</span>;
      },
    },
    {
      title: "Actions",
      render: (_: any, r: any) =>
        r.is_active ? (
          <Space>
            <Popconfirm title="Terminate this session?" onConfirm={() => terminate(r.id)} okText="Yes" cancelText="No">
              <Button size="small" danger icon={<DeleteOutlined />}>Terminate</Button>
            </Popconfirm>
            <Tooltip title={`Terminate all sessions for ${r.user_name}`}>
              <Popconfirm title={`Terminate all sessions for ${r.user_name}?`} onConfirm={() => terminateAll(r.user_id, r.user_name)} okText="Yes" cancelText="No">
                <Button size="small" icon={<StopOutlined />}>All for User</Button>
              </Popconfirm>
            </Tooltip>
          </Space>
        ) : null,
    },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Session Management</Title>
        <Space>
          <span>Active only:</span>
          <Switch checked={activeOnly} onChange={setActiveOnly} />
          <span style={{ color: "#999" }}>{total} sessions</span>
        </Space>
      </div>
      <Card>
        <Table dataSource={sessions} rowKey="id" loading={isLoading} size="small" columns={columns} pagination={{
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
