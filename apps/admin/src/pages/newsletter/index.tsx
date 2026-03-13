// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useState } from "react";
import { useCustom } from "@refinedev/core";
import { Card, Table, Typography, Row, Col, Statistic, Spin, Button, Space, message, Tag, Modal, Input, Form } from "antd";
import { SendOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import axiosInstance from "../../utils/axios";

const { Title } = Typography;
const { TextArea } = Input;

export const NewsletterPage = () => {
  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const { data, isLoading, refetch } = useCustom({
    url: "/api/admin/newsletter",
    method: "get",
    config: { query: { page, limit: pageSize } },
    queryOptions: { queryKey: ["admin-newsletter", page, pageSize] },
  });

  const { data: statsData } = useCustom({
    url: "/api/admin/newsletter/stats",
    method: "get",
  });

  const raw = data?.data as any;
  const newsletters = raw?.newsletters || [];
  const totalCount = raw?.total || raw?.totalCount || newsletters.length;
  const stats = (statsData?.data as any) || {};

  const handleSend = async (id: number) => {
    Modal.confirm({
      title: "Send Newsletter",
      content: "Are you sure you want to send this newsletter?",
      onOk: async () => {
        try {
          await axiosInstance.post(`/api/admin/newsletter/${id}/send`);
          message.success("Newsletter sent");
          refetch();
        } catch (err: any) {
          message.error(err?.response?.data?.message || "Failed to send");
        }
      },
    });
  };

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      await axiosInstance.post("/api/admin/newsletter", values);
      message.success("Newsletter created");
      setCreateOpen(false);
      form.resetFields();
      refetch();
    } catch (err: any) {
      if (err?.response) {
        message.error(err?.response?.data?.message || "Failed to create");
      }
    }
  };

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col><Title level={4} style={{ margin: 0 }}>Newsletter</Title></Col>
        <Col><Button type="primary" icon={<SendOutlined />} onClick={() => setCreateOpen(true)}>Create Newsletter</Button></Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card><Statistic title="Total Subscribers" value={stats.total ?? 0} /></Card>
        </Col>
        <Col span={8}>
          <Card><Statistic title="Active" value={stats.active ?? 0} valueStyle={{ color: "#3f8600" }} /></Card>
        </Col>
        <Col span={8}>
          <Card><Statistic title="Unsubscribed" value={stats.unsubscribed ?? 0} valueStyle={{ color: "#cf1322" }} /></Card>
        </Col>
      </Row>

      {isLoading ? (
        <Spin />
      ) : (
        <Card>
          <Table dataSource={newsletters} rowKey="id" size="small" pagination={{
              current: page,
              pageSize,
              total: totalCount,
              showSizeChanger: true,
              showTotal: (t: number) => `${t} total`,
              onChange: (p: number, ps: number) => { setPage(p); setPageSize(ps); },
            }}>
            <Table.Column dataIndex="id" title="ID" width={60} />
            <Table.Column dataIndex="subject" title="Subject" />
            <Table.Column
              dataIndex="status"
              title="Status"
              render={(s: string) => (
                <Tag color={s === "sent" ? "green" : s === "draft" ? "default" : "blue"}>{s}</Tag>
              )}
            />
            <Table.Column
              dataIndex="created_at"
              title="Created"
              render={(d: string) => (d ? dayjs(d).format("DD MMM YYYY") : "--")}
            />
            <Table.Column
              dataIndex="sent_at"
              title="Sent"
              render={(d: string) => (d ? dayjs(d).format("DD MMM YYYY HH:mm") : "--")}
            />
            <Table.Column
              title="Actions"
              render={(_, r: any) => (
                <Space>
                  <Button size="small" type="primary" icon={<SendOutlined />} onClick={() => handleSend(r.id)} disabled={r.status === "sent"}>
                    Send
                  </Button>
                </Space>
              )}
            />
          </Table>
        </Card>
      )}

      <Modal
        title="Create Newsletter"
        open={createOpen}
        onOk={handleCreate}
        onCancel={() => { setCreateOpen(false); form.resetFields(); }}
        okText="Create"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="subject" label="Subject" rules={[{ required: true, message: "Subject is required" }]}>
            <Input />
          </Form.Item>
          <Form.Item name="content" label="Content" rules={[{ required: true, message: "Content is required" }]}>
            <TextArea rows={6} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
