// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { Show } from "@refinedev/antd";
import { useShow, useCustom } from "@refinedev/core";
import { Typography, Descriptions, Card, Row, Col, Statistic, Button, Modal, Input, Space, message } from "antd";
import { StatusTag } from "../../components/common/status-tag";
import dayjs from "dayjs";
import { useState } from "react";
import axiosInstance from "../../utils/axios";

const { Title } = Typography;

export const UserShow = () => {
  const { queryResult } = useShow({ resource: "users", meta: { apiPath: "/api/admin/users" } });
  const record = queryResult?.data?.data as any;
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSuspend = async () => {
    if (!record?.id) return;
    setLoading(true);
    try {
      await axiosInstance.put(`/api/admin/users/${record.id}/suspend`, { reason: suspendReason });
      message.success("User suspended");
      setSuspendOpen(false);
      setSuspendReason("");
      queryResult.refetch();
    } catch (err: any) {
      message.error(err?.response?.data?.message || "Failed to suspend user");
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async () => {
    if (!record?.id) return;
    setLoading(true);
    try {
      await axiosInstance.put(`/api/admin/users/${record.id}/activate`);
      message.success("User activated");
      queryResult.refetch();
    } catch (err: any) {
      message.error(err?.response?.data?.message || "Failed to activate user");
    } finally {
      setLoading(false);
    }
  };

  const isSuspended = !!record?.suspended_at;

  return (
    <Show
      headerButtons={({ defaultButtons }) => (
        <Space>
          {defaultButtons}
          {isSuspended ? (
            <Button type="primary" onClick={handleActivate} loading={loading}>
              Activate User
            </Button>
          ) : (
            <Button danger onClick={() => setSuspendOpen(true)} loading={loading}>
              Suspend User
            </Button>
          )}
        </Space>
      )}
    >
      {record && (
        <>
          <Descriptions bordered column={2}>
            <Descriptions.Item label="ID">{record.id}</Descriptions.Item>
            <Descriptions.Item label="Email">{record.email}</Descriptions.Item>
            <Descriptions.Item label="First Name">{record.first_name || "—"}</Descriptions.Item>
            <Descriptions.Item label="Last Name">{record.last_name || "—"}</Descriptions.Item>
            <Descriptions.Item label="Role"><StatusTag status={record.role} /></Descriptions.Item>
            <Descriptions.Item label="Status">
              <StatusTag status={isSuspended ? "suspended" : record.is_active ? "active" : "inactive"} />
            </Descriptions.Item>
            <Descriptions.Item label="Joined">
              {record.created_at ? dayjs(record.created_at).format("DD MMM YYYY HH:mm") : "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Last Login">
              {record.last_login_at ? dayjs(record.last_login_at).format("DD MMM YYYY HH:mm") : "Never"}
            </Descriptions.Item>
            {isSuspended && (
              <>
                <Descriptions.Item label="Suspended At">
                  {dayjs(record.suspended_at).format("DD MMM YYYY HH:mm")}
                </Descriptions.Item>
                <Descriptions.Item label="Suspension Reason">
                  {record.suspension_reason || "—"}
                </Descriptions.Item>
              </>
            )}
          </Descriptions>

          {record.stats && (
            <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
              <Col span={6}>
                <Card><Statistic title="Listings" value={record.stats.listings ?? 0} /></Card>
              </Col>
              <Col span={6}>
                <Card><Statistic title="Transactions" value={record.stats.transactions ?? 0} /></Card>
              </Col>
              <Col span={6}>
                <Card><Statistic title="XP" value={record.total_xp ?? 0} /></Card>
              </Col>
              <Col span={6}>
                <Card><Statistic title="Connections" value={record.stats.connections ?? 0} /></Card>
              </Col>
            </Row>
          )}
        </>
      )}

      <Modal
        title="Suspend User"
        open={suspendOpen}
        onOk={handleSuspend}
        onCancel={() => setSuspendOpen(false)}
        confirmLoading={loading}
        okText="Suspend"
        okButtonProps={{ danger: true }}
      >
        <p>Are you sure you want to suspend <strong>{record?.email}</strong>?</p>
        <Input.TextArea
          placeholder="Reason for suspension"
          value={suspendReason}
          onChange={(e) => setSuspendReason(e.target.value)}
          rows={3}
        />
      </Modal>
    </Show>
  );
};
