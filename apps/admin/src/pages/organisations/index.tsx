// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useCustom } from "@refinedev/core";
import { Card, Table, Typography, Row, Col, Statistic, Spin, Button, Space, message, Tag, Modal, Input, Select } from "antd";
import { CheckOutlined, StopOutlined, TeamOutlined, SafetyOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import { useState, useCallback } from "react";
import dayjs from "dayjs";
import axiosInstance from "../../utils/axios";
import { getErrorMessage } from "../../utils/errors";
import { useDebouncedSearch } from "../../utils/use-debounced-search";

const { Title } = Typography;

const statusColors: Record<string, string> = {
  verified: "green",
  pending: "orange",
  suspended: "red",
  inactive: "default",
};

export const OrganisationsPage = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const queryParams: Record<string, any> = { page, limit: pageSize };
  if (search) queryParams.search = search;
  if (statusFilter) queryParams.status = statusFilter;

  const { data, isLoading, refetch } = useCustom({
    url: "/api/admin/organisations",
    method: "get",
    config: { query: queryParams },
    queryOptions: { queryKey: ["admin-orgs", page, pageSize, search, statusFilter] },
  });

  const raw = data?.data as any;
  const orgs = raw?.items || raw?.data || (Array.isArray(data?.data) ? data.data : []);
  const totalCount = raw?.total || raw?.totalCount || orgs.length;
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);
  const { debounced: debouncedSearch, immediate: immediateSearch } = useDebouncedSearch(handleSearchChange);

  const handleVerify = (id: number, name: string) => {
    Modal.confirm({
      title: "Verify Organisation",
      icon: <SafetyOutlined />,
      content: `Mark "${name}" as verified? This grants full access to organisation features.`,
      okText: "Verify",
      onOk: async () => {
        try {
          await axiosInstance.put(`/api/admin/organisations/${id}/verify`);
          message.success("Organisation verified");
          refetch();
        } catch (err: unknown) { message.error(getErrorMessage(err, "Failed to verify")); }
      },
    });
  };

  const handleSuspend = (id: number, name: string) => {
    Modal.confirm({
      title: "Suspend Organisation",
      icon: <ExclamationCircleOutlined />,
      content: `Suspend "${name}"? Members will lose access until the organisation is re-verified.`,
      okText: "Suspend",
      okType: "danger",
      onOk: async () => {
        try {
          await axiosInstance.put(`/api/admin/organisations/${id}/suspend`);
          message.success("Organisation suspended");
          refetch();
        } catch (err: unknown) { message.error(getErrorMessage(err, "Failed to suspend")); }
      },
    });
  };

  // Count by status from current page only (not global totals)
  const verifiedCount = orgs.filter((o: any) => o.status === "verified").length;
  const pendingCount = orgs.filter((o: any) => o.status === "pending").length;
  const suspendedCount = orgs.filter((o: any) => o.status === "suspended").length;

  return (
    <div>
      <Title level={4}>Organisations</Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Total Organisations" value={totalCount || 0} prefix={<TeamOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Verified (this page)" value={verifiedCount} valueStyle={{ color: "#3f8600" }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Pending Verification (this page)" value={pendingCount} valueStyle={{ color: "#faad14" }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Suspended (this page)" value={suspendedCount} valueStyle={{ color: "#cf1322" }} />
          </Card>
        </Col>
      </Row>

      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search
          placeholder="Search organisations..."
          allowClear
          style={{ width: 250 }}
          onChange={(e) => debouncedSearch(e.target.value)}
          onSearch={immediateSearch}
        />
        <Select
          placeholder="Status"
          allowClear
          style={{ width: 150 }}
          onChange={(value) => {
            setStatusFilter(value || "");
            setPage(1);
          }}
          options={[
            { label: "Verified", value: "verified" },
            { label: "Pending", value: "pending" },
            { label: "Suspended", value: "suspended" },
          ]}
        />
      </Space>

      {isLoading ? <Spin /> : (
        <Card>
          <Table
            dataSource={orgs}
            rowKey="id"
            size="small"
            locale={{ emptyText: "No organisations found" }}
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
              dataIndex="status"
              title="Status"
              render={(s: string) => (
                <Tag color={statusColors[s] || "default"}>{s}</Tag>
              )}
            />
            <Table.Column dataIndex="member_count" title="Members" width={90} />
            <Table.Column
              title="Contact"
              render={(_, r: any) => r.contact_email || r.email || "—"}
            />
            <Table.Column
              dataIndex="created_at"
              title="Created"
              render={(d: string) => (d ? dayjs(d).format("DD MMM YYYY") : "—")}
            />
            <Table.Column
              title="Actions"
              render={(_, r: any) => (
                <Space>
                  {r.status !== "verified" && (
                    <Button size="small" icon={<CheckOutlined />} onClick={() => handleVerify(r.id, r.name)}>
                      Verify
                    </Button>
                  )}
                  {r.status !== "suspended" && (
                    <Button size="small" danger icon={<StopOutlined />} onClick={() => handleSuspend(r.id, r.name)}>
                      Suspend
                    </Button>
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
