// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { List, useTable, ShowButton, EditButton } from "@refinedev/antd";
import { Table, Input, Select, Space } from "antd";
import { StatusTag } from "../../components/common/status-tag";
import dayjs from "dayjs";
import { useState, useRef, useCallback } from "react";
import type { CrudFilters } from "@refinedev/core";

export const UserList = () => {
  const [searchText, setSearchText] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { tableProps, setFilters } = useTable({
    resource: "users",
    meta: { apiPath: "/api/admin/users" },
    pagination: { pageSize: 20 },
    filters: {
      initial: [],
    },
  });

  const applyFilters = (search?: string, role?: string, status?: string) => {
    const filters: CrudFilters = [];
    const s = search ?? searchText;
    const r = role ?? roleFilter;
    const st = status ?? statusFilter;
    if (s) filters.push({ field: "search", operator: "eq", value: s });
    if (r) filters.push({ field: "role", operator: "eq", value: r });
    if (st) filters.push({ field: "status", operator: "eq", value: st });
    setFilters(filters);
  };

  const debouncedSearch = useCallback((value: string) => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setSearchText(value);
      applyFilters(value);
    }, 300);
  }, [roleFilter, statusFilter]);

  return (
    <List>
      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search
          placeholder="Search users..."
          allowClear
          onChange={(e) => debouncedSearch(e.target.value)}
          onSearch={(value) => {
            if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
            setSearchText(value);
            applyFilters(value);
          }}
          style={{ width: 250 }}
        />
        <Select
          placeholder="Role"
          allowClear
          style={{ width: 130 }}
          onChange={(value) => {
            setRoleFilter(value || "");
            applyFilters(undefined, value || "");
          }}
          options={[
            { label: "Admin", value: "admin" },
            { label: "Member", value: "member" },
          ]}
        />
        <Select
          placeholder="Status"
          allowClear
          style={{ width: 130 }}
          onChange={(value) => {
            setStatusFilter(value || "");
            applyFilters(undefined, undefined, value || "");
          }}
          options={[
            { label: "Active", value: "active" },
            { label: "Suspended", value: "suspended" },
          ]}
        />
      </Space>

      <Table {...tableProps} rowKey="id" size="middle" locale={{ emptyText: "No users found" }}>
        <Table.Column dataIndex="id" title="ID" width={60} />
        <Table.Column dataIndex="email" title="Email" />
        <Table.Column
          title="Name"
          render={(_, record: any) =>
            `${record.first_name || ""} ${record.last_name || ""}`.trim() || "—"
          }
        />
        <Table.Column dataIndex="role" title="Role" render={(role: string) => <StatusTag status={role} />} />
        <Table.Column
          title="Status"
          render={(_, record: any) => (
            <StatusTag status={record.suspended_at ? "suspended" : record.is_active ? "active" : "inactive"} />
          )}
        />
        <Table.Column
          dataIndex="created_at"
          title="Joined"
          render={(date: string) => (date ? dayjs(date).format("DD MMM YYYY") : "—")}
        />
        <Table.Column
          dataIndex="last_login_at"
          title="Last Login"
          render={(date: string) => (date ? dayjs(date).format("DD MMM YYYY") : "Never")}
        />
        <Table.Column
          title="Actions"
          render={(_, record: any) => (
            <Space>
              <ShowButton hideText size="small" recordItemId={record.id} />
              <EditButton hideText size="small" recordItemId={record.id} />
            </Space>
          )}
        />
      </Table>
    </List>
  );
};
