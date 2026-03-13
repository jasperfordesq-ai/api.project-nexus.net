// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useCustom } from "@refinedev/core";
import { Card, Table, Typography, Button, Space, Tag, message, Spin, Modal } from "antd";
import { EditOutlined, PlusOutlined, StarOutlined, StarFilled } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import axiosInstance from "../../utils/axios";

const { Title } = Typography;

export const BlogListPage = () => {
  const navigate = useNavigate();
  const { data, isLoading, refetch } = useCustom({ url: "/api/admin/blog", method: "get" });
  const posts = (data?.data as any)?.items || (data?.data as any)?.data || (Array.isArray(data?.data) ? data.data : []);

  const toggleStatus = (id: number, currentStatus: string) => {
    const action = currentStatus === "published" ? "unpublish" : "publish";
    Modal.confirm({
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} this post?`,
      onOk: async () => {
        try {
          await axiosInstance.post(`/api/admin/blog/${id}/toggle-status`);
          message.success("Status toggled");
          refetch();
        } catch (err: any) { message.error(err?.response?.data?.message || "Failed"); }
      },
    });
  };

  const toggleFeatured = (id: number) => {
    Modal.confirm({
      title: "Toggle featured status?",
      onOk: async () => {
        try {
          await axiosInstance.post(`/api/admin/blog/${id}/toggle-featured`);
          message.success("Featured toggled");
          refetch();
        } catch (err: any) { message.error(err?.response?.data?.message || "Failed"); }
      },
    });
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <Title level={4}>Blog Posts</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate("/blog/new/edit")}>New Post</Button>
      </div>
      {isLoading ? <Spin /> : (
        <Card>
          <Table dataSource={posts} rowKey="id" size="middle">
            <Table.Column dataIndex="id" title="ID" width={60} />
            <Table.Column dataIndex="title" title="Title" />
            <Table.Column dataIndex="status" title="Status" render={(s: string) => (
              <Tag color={s === "published" ? "green" : "default"}>{s}</Tag>
            )} />
            <Table.Column dataIndex="is_featured" title="Featured" render={(v: boolean) => v ? <StarFilled style={{ color: "#faad14" }} /> : <StarOutlined />} />
            <Table.Column dataIndex="created_at" title="Created" render={(d: string) => d ? dayjs(d).format("DD MMM YYYY") : "—"} />
            <Table.Column title="Actions" render={(_, record: any) => (
              <Space>
                <Button size="small" icon={<EditOutlined />} onClick={() => navigate(`/blog/${record.id}/edit`)}>Edit</Button>
                <Button size="small" onClick={() => toggleStatus(record.id, record.status)}>{record.status === "published" ? "Unpublish" : "Publish"}</Button>
                <Button size="small" onClick={() => toggleFeatured(record.id)}>{record.is_featured ? "Unfeature" : "Feature"}</Button>
              </Space>
            )} />
          </Table>
        </Card>
      )}
    </div>
  );
};
