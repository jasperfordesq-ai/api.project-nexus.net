// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useCustom } from "@refinedev/core";
import { Card, Table, Typography, Row, Col, Statistic, Spin, Button, Space, message, Modal, Tag, Input, Select } from "antd";
import { ExclamationCircleOutlined, DeleteOutlined, TeamOutlined, LockOutlined, UnlockOutlined } from "@ant-design/icons";
import { useState, useRef, useCallback } from "react";
import dayjs from "dayjs";
import axiosInstance from "../../utils/axios";

const { Title } = Typography;

const typeColors: Record<string, string> = {
  public: "green",
  private: "blue",
  secret: "purple",
};

export const GroupsAdminPage = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const queryParams: Record<string, any> = { page, limit: pageSize };
  if (search) queryParams.search = search;
  if (typeFilter) queryParams.type = typeFilter;

  const { data, isLoading, refetch } = useCustom({
    url: "/api/admin/groups",
    method: "get",
    config: { query: queryParams },
    queryOptions: { queryKey: ["admin-groups", page, pageSize, search, typeFilter] },
  });
  const { data: statsData } = useCustom({ url: "/api/admin/groups/stats", method: "get" });

  const raw = data?.data as any;
  const groups = raw?.items || raw?.data || (Array.isArray(data?.data) ? data.data : []);
  const totalCount = raw?.total || raw?.totalCount || groups.length;
  const stats = statsData?.data as any;

  const getErrorMessage = (err: any, fallback: string) => {
    if (err?.response) return err.response.data?.message || err.response.data?.error || fallback;
    if (err?.request) return "Network error — please check your connection and try again";
    return fallback;
  };

  const debouncedSearch = useCallback((value: string) => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setSearch(value);
      setPage(1);
    }, 300);
  }, []);

  const handleDelete = (id: number, name: string) => {
    Modal.confirm({
      title: "Delete Group",
      icon: <ExclamationCircleOutlined />,
      content: `Delete "${name}"? All members will be removed. This cannot be undone.`,
      okText: "Delete",
      okType: "danger",
      onOk: async () => {
        try {
          await axiosInstance.delete(`/api/admin/groups/${id}`);
          message.success("Group deleted");
          refetch();
        } catch (err: any) { message.error(getErrorMessage(err, "Failed to delete group")); }
      },
    });
  };

  return (
    <div>
      <Title level={4}>Groups Management</Title>

      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic title="Total Groups" value={stats.total_groups ?? stats.total ?? totalCount} prefix={<TeamOutlined />} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Public Groups"
                value={stats.public_groups ?? 0}
                prefix={<UnlockOutlined style={{ color: "#52c41a" }} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Private Groups"
                value={stats.private_groups ?? 0}
                prefix={<LockOutlined style={{ color: "#1890ff" }} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic title="Total Members" value={stats.total_members ?? 0} />
            </Card>
          </Col>
        </Row>
      )}

      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search
          placeholder="Search groups..."
          allowClear
          style={{ width: 250 }}
          onChange={(e) => debouncedSearch(e.target.value)}
          onSearch={(value) => {
            if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
            setSearch(value);
            setPage(1);
          }}
        />
        <Select
          placeholder="Type"
          allowClear
          style={{ width: 130 }}
          onChange={(value) => {
            setTypeFilter(value || "");
            setPage(1);
          }}
          options={[
            { label: "Public", value: "public" },
            { label: "Private", value: "private" },
            { label: "Secret", value: "secret" },
          ]}
        />
      </Space>

      {isLoading ? <Spin /> : (
        <Card>
          <Table
            dataSource={groups}
            rowKey="id"
            size="small"
            locale={{ emptyText: "No groups found" }}
            pagination={{
              current: page,
              pageSize,
              total: totalCount,
              showSizeChanger: true,
              showTotal: (t: number) => `${t} total`,
              onChange: (p: number, ps: number) => { setPage(p); setPageSize(ps); },
            }}
          >
            <Table.Column dataIndex="id" title="ID" width={60} />
            <Table.Column dataIndex="name" title="Name" />
            <Table.Column
              title="Owner"
              render={(_, r: any) =>
                r.owner_name || r.owner_email || (r.owner_id ? `User #${r.owner_id}` : "—")
              }
            />
            <Table.Column dataIndex="member_count" title="Members" width={90} />
            <Table.Column
              dataIndex="type"
              title="Type"
              render={(t: string) => (
                <Tag color={typeColors[t?.toLowerCase()] || "default"}>
                  {t ? t.charAt(0).toUpperCase() + t.slice(1) : "—"}
                </Tag>
              )}
            />
            <Table.Column
              dataIndex="status"
              title="Status"
              render={(s: string) => (
                <Tag color={s === "active" ? "green" : s === "archived" ? "default" : "orange"}>
                  {s || "active"}
                </Tag>
              )}
            />
            <Table.Column
              dataIndex="created_at"
              title="Created"
              render={(d: string) => (d ? dayjs(d).format("DD MMM YYYY") : "—")}
            />
            <Table.Column
              title="Actions"
              render={(_, r: any) => (
                <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(r.id, r.name)}>
                  Delete
                </Button>
              )}
            />
          </Table>
        </Card>
      )}
    </div>
  );
};
