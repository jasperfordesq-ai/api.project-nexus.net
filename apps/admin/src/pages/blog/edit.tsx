// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, Form, Input, Button, Typography, message, Spin, Space, Select } from "antd";
import axiosInstance from "../../utils/axios";
import { getErrorMessage } from "../../utils/errors";

const { Title } = Typography;

export const BlogEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<{ label: string; value: number }[]>([]);
  const isNew = !id || id === "new";

  useEffect(() => {
    axiosInstance.get("/api/admin/blog/categories").then(({ data }) => {
      const items = data?.data || data?.items || data || [];
      setCategories(Array.isArray(items) ? items.map((c: any) => ({ label: c.name, value: c.id })) : []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isNew && id) {
      setLoading(true);
      axiosInstance.get(`/api/admin/blog/${id}`).then(({ data }) => {
        const post = data?.data || data;
        form.setFieldsValue(post);
      }).catch((err: unknown) => {
        message.error(getErrorMessage(err, "Failed to load blog post"));
      }).finally(() => setLoading(false));
    }
  }, [id, isNew, form]);

  const handleSave = async () => {
    let values: any;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    try {
      setSaving(true);
      if (isNew) {
        await axiosInstance.post("/api/admin/blog", values);
        message.success("Post created");
      } else {
        await axiosInstance.put(`/api/admin/blog/${id}`, values);
        message.success("Post updated");
      }
      navigate("/blog");
    } catch (err: unknown) {
      message.error(getErrorMessage(err, "Failed to save blog post"));
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
          <Form.Item name="category_id" label="Category">
            <Select options={categories} allowClear placeholder="Select a category" />
          </Form.Item>
          <Form.Item name="status" label="Status">
            <Select options={[
              { label: "Draft", value: "draft" },
              { label: "Published", value: "published" },
            ]} />
          </Form.Item>
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
