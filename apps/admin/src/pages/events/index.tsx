// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useCustom } from "@refinedev/core";
import { Card, Table, Typography, Row, Col, Statistic, Spin, Button, Space, message, Tag, Modal } from "antd";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import { useState } from "react";
import dayjs from "dayjs";
import axiosInstance from "../../utils/axios";
import { getErrorMessage } from "../../utils/errors";

const { Title } = Typography;

export const EventsAdminPage = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const { data, isLoading, refetch } = useCustom({ url: "/api/admin/events", method: "get", config: { query: { page, limit: pageSize } }, queryOptions: { queryKey: ["admin-events", page, pageSize] } });
  const { data: statsData } = useCustom({ url: "/api/admin/events/stats", method: "get" });

  const raw = data?.data as any;
  const events = raw?.items || raw?.data || [];
  const totalCount = raw?.total || raw?.totalCount || events.length;
  const stats = statsData?.data as any;

  const handleCancel = (id: number) => {
    Modal.confirm({
      title: "Cancel Event",
      icon: <ExclamationCircleOutlined />,
      content: "This will cancel the event and notify attendees. Continue?",
      okText: "Cancel Event",
      okType: "danger",
      onOk: async () => {
        try {
          await axiosInstance.put(`/api/admin/events/${id}/cancel`);
          message.success("Event cancelled");
          refetch();
        } catch (err: unknown) { message.error(getErrorMessage(err, "Failed to cancel event")); }
      },
    });
  };

  const handleDelete = (id: number) => {
    Modal.confirm({
      title: "Delete Event",
      icon: <ExclamationCircleOutlined />,
      content: "This will permanently delete the event and all RSVPs. This cannot be undone.",
      okText: "Delete",
      okType: "danger",
      onOk: async () => {
        try {
          await axiosInstance.delete(`/api/admin/events/${id}`);
          message.success("Event deleted");
          refetch();
        } catch (err: unknown) { message.error(getErrorMessage(err, "Failed to delete event")); }
      },
    });
  };

  return (
    <div>
      <Title level={4}>Events Management</Title>
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          {Object.entries(stats).map(([key, value]) => (
            <Col span={6} key={key}><Card><Statistic title={key.replace(/_/g, " ")} value={typeof value === "number" ? value : String(value ?? 0)} /></Card></Col>
          ))}
        </Row>
      )}
      {isLoading ? <Spin /> : (
        <Card>
          <Table dataSource={events} rowKey="id" size="small" loading={isLoading} locale={{ emptyText: "No events found" }} pagination={{
              current: page,
              pageSize,
              total: totalCount,
              showSizeChanger: true,
              showTotal: (t: number) => `${t} total`,
              onChange: (p: number, ps: number) => { setPage(p); setPageSize(ps); },
            }}>
            <Table.Column dataIndex="id" title="ID" width={60} />
            <Table.Column dataIndex="title" title="Title" />
            <Table.Column dataIndex="is_cancelled" title="Status" render={(v: boolean) => <Tag color={v ? "red" : "green"}>{v ? "Cancelled" : "Active"}</Tag>} />
            <Table.Column dataIndex="starts_at" title="Start" render={(d: string) => d ? dayjs(d).format("DD MMM YYYY HH:mm") : "—"} />
            <Table.Column dataIndex="rsvp_count" title="RSVPs" />
            <Table.Column title="Actions" render={(_, r: any) => (
              <Space>
                {!r.is_cancelled && <Button size="small" onClick={() => handleCancel(r.id)}>Cancel</Button>}
                <Button size="small" danger onClick={() => handleDelete(r.id)}>Delete</Button>
              </Space>
            )} />
          </Table>
        </Card>
      )}
    </div>
  );
};
