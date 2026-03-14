// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, Form, Input, Button, Typography, message, Spin, Space } from "antd";
import axiosInstance from "../../utils/axios";

const { Title } = Typography;

export const BlogEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const isNew = id === "new";

  useEffect(() => {
    if (!isNew && id) {
      setLoading(true);
      axiosInstance.get(`/api/admin/blog/${id}`).then(({ data }) => {
        const post = data?.data || data;
        form.setFieldsValue(post);
      }).catch((err: any) => {
        message.error(err?.response?.data?.message || "Failed to load blog post");
      }).finally(() => setLoading(false));
    }
  }, [id, isNew, form]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      if (isNew) {
        await axiosInstance.post("/api/admin/blog", values);
        message.success("Post created");
      } else {
        await axiosInstance.put(`/api/admin/blog/${id}`, values);
        message.success("Post updated");
      }
      navigate("/blog");
    } catch (err: any) {
      if (err?.response) message.error(err.response.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spin size="large" style={{ display: "flex", justifyContent: "center", marginTop: 100 }} />;

  return (
    <div>
      <Title level={4}>{isNew ? "New Blog Post" : "Edit Blog Post"}</Title>
      <Card>
        <Form form={form} layout="vertical" style={{ maxWidth: 800 }}>
          <Form.Item name="title" label="Title" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="slug" label="Slug" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="excerpt" label="Excerpt"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="content" label="Content" rules={[{ required: true }]}><Input.TextArea rows={12} /></Form.Item>
          <Form.Item name="category_id" label="Category ID"><Input type="number" /></Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" loading={saving} onClick={handleSave}>Save</Button>
              <Button onClick={() => navigate("/blog")}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};
