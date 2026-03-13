// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useCustom } from "@refinedev/core";
import { Card, Table, Typography, Spin, Button, Space, message, Tag, Modal } from "antd";
import { CheckOutlined, StopOutlined } from "@ant-design/icons";
import axiosInstance from "../../utils/axios";

const { Title } = Typography;

export const OrganisationsPage = () => {
  const { data, isLoading, refetch } = useCustom({ url: "/api/admin/organisations", method: "get" });
  const orgs = (data?.data as any)?.items || (data?.data as any)?.data || (Array.isArray(data?.data) ? data.data : []);

  const handleVerify = (id: number) => {
    Modal.confirm({
      title: "Verify this organisation?",
      onOk: async () => {
        try {
          await axiosInstance.put(`/api/admin/organisations/${id}/verify`);
          message.success("Organisation verified");
          refetch();
        } catch (err: any) { message.error(err?.response?.data?.message || "Failed"); }
      },
    });
  };

  const handleSuspend = (id: number) => {
    Modal.confirm({
      title: "Suspend this organisation?",
      content: "Members will lose access until the organisation is re-verified.",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await axiosInstance.put(`/api/admin/organisations/${id}/suspend`);
          message.success("Organisation suspended");
          refetch();
        } catch (err: any) { message.error(err?.response?.data?.message || "Failed"); }
      },
    });
  };

  return (
    <div>
      <Title level={4}>Organisations</Title>
      {isLoading ? <Spin /> : (
        <Card>
          <Table dataSource={orgs} rowKey="id" size="small">
            <Table.Column dataIndex="id" title="ID" width={60} />
            <Table.Column dataIndex="name" title="Name" />
            <Table.Column dataIndex="status" title="Status" render={(s: string) => (
              <Tag color={s === "verified" ? "green" : s === "suspended" ? "red" : "orange"}>{s}</Tag>
            )} />
            <Table.Column dataIndex="member_count" title="Members" />
            <Table.Column title="Actions" render={(_, r: any) => (
              <Space>
                {r.status !== "verified" && <Button size="small" icon={<CheckOutlined />} onClick={() => handleVerify(r.id)}>Verify</Button>}
                {r.status !== "suspended" && <Button size="small" danger icon={<StopOutlined />} onClick={() => handleSuspend(r.id)}>Suspend</Button>}
              </Space>
            )} />
          </Table>
        </Card>
      )}
    </div>
  );
};
