// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useState } from "react";
import { useCustom } from "@refinedev/core";
import { Button, Card, Col, Empty, Form, Input, Modal, Row, Select, Space, Statistic, Table, Tabs, Tag, Typography, message } from "antd";
import { DeleteOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import axiosInstance from "../../utils/axios";
import { getErrorMessage } from "../../utils/errors";

const { Title, Text } = Typography;
const { TextArea } = Input;

const rowsFrom = (payload: any) => {
  const raw = payload?.data ?? payload;
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.items)) return raw.items;
  return [];
};

const totalFrom = (payload: any, fallback: number) => payload?.data?.pagination?.total ?? payload?.pagination?.total ?? payload?.data?.total ?? fallback;

export const ResourcesAdminPage = () => {
  const [page, setPage] = useState(1);
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [type, setType] = useState<string | undefined>();
  const [resourceOpen, setResourceOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resourceForm] = Form.useForm();
  const [categoryForm] = Form.useForm();

  const resourcesQuery = useCustom({
    url: "/api/resources",
    method: "get",
    config: { query: { page, limit: 20, category_id: categoryId, type } },
    queryOptions: { queryKey: ["admin-resources", page, categoryId, type] },
  });

  const categoriesQuery = useCustom({ url: "/api/resources/categories", method: "get", queryOptions: { queryKey: ["admin-resource-categories"] } });
  const treeQuery = useCustom({ url: "/api/resources/categories/tree", method: "get", queryOptions: { queryKey: ["admin-resource-category-tree"] } });

  const resources = rowsFrom(resourcesQuery.data);
  const categories = rowsFrom(categoriesQuery.data);
  const tree = rowsFrom(treeQuery.data);

  const refreshAll = () => {
    resourcesQuery.refetch();
    categoriesQuery.refetch();
    treeQuery.refetch();
  };

  const runAction = async (action: () => Promise<any>, success: string, refresh?: () => void) => {
    setBusy(true);
    try {
      await action();
      message.success(success);
      refresh?.();
    } catch (err: unknown) {
      message.error(getErrorMessage(err, "Resource action failed"));
    } finally {
      setBusy(false);
    }
  };

  const createResource = async () => {
    const values = await resourceForm.validateFields();
    await runAction(() => axiosInstance.post("/api/resources", {
      title: values.title,
      description: values.description,
      url: values.url,
      resource_type: values.resource_type || "link",
      category_id: values.category_id ? Number(values.category_id) : undefined,
    }), "Resource created", () => {
      setResourceOpen(false);
      resourceForm.resetFields();
      resourcesQuery.refetch();
    });
  };

  const createCategory = async () => {
    const values = await categoryForm.validateFields();
    await runAction(() => axiosInstance.post("/api/resources/categories", {
      name: values.name,
      description: values.description,
      parent_id: values.parent_id ? Number(values.parent_id) : undefined,
    }), "Resource category created", () => {
      setCategoryOpen(false);
      categoryForm.resetFields();
      categoriesQuery.refetch();
      treeQuery.refetch();
    });
  };

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>Resources</Title>
          <Text type="secondary">Knowledge base articles, links, categories and publishing support.</Text>
        </Col>
        <Col>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={refreshAll}>Refresh</Button>
            <Button icon={<PlusOutlined />} onClick={() => setCategoryOpen(true)}>Category</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setResourceOpen(true)}>Resource</Button>
          </Space>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}><Card><Statistic title="Resources" value={totalFrom(resourcesQuery.data, resources.length)} /></Card></Col>
        <Col xs={24} sm={12} lg={6}><Card><Statistic title="Categories" value={categories.length} /></Card></Col>
        <Col xs={24} sm={12} lg={6}><Card><Statistic title="Root Categories" value={tree.length} /></Card></Col>
        <Col xs={24} sm={12} lg={6}><Card><Statistic title="Published" value={resources.filter((r: any) => r.is_published).length} /></Card></Col>
      </Row>

      <Tabs
        items={[
          {
            key: "resources",
            label: "Resources",
            children: (
              <Card
                extra={(
                  <Space>
                    <Select allowClear placeholder="Category" value={categoryId} onChange={(v) => { setCategoryId(v); setPage(1); }} style={{ width: 180 }} options={categories.map((c: any) => ({ value: c.id, label: c.name }))} />
                    <Select allowClear placeholder="Type" value={type} onChange={(v) => { setType(v); setPage(1); }} style={{ width: 140 }} options={["link", "article", "file", "video"].map((v) => ({ value: v, label: v }))} />
                  </Space>
                )}
              >
                <Table loading={resourcesQuery.isLoading} dataSource={resources} rowKey={(r: any) => r.id} size="small" pagination={{ current: page, pageSize: 20, total: totalFrom(resourcesQuery.data, resources.length), onChange: setPage }} locale={{ emptyText: <Empty description="No resources returned" /> }}>
                  <Table.Column title="Title" dataIndex="title" ellipsis />
                  <Table.Column title="Type" dataIndex="resource_type" width={110} render={(v: string) => <Tag>{v || "--"}</Tag>} />
                  <Table.Column title="Category" dataIndex="category" render={(v: any) => v?.name || "--"} />
                  <Table.Column title="Published" dataIndex="is_published" width={110} render={(v: boolean) => <Tag color={v ? "green" : "default"}>{v ? "Published" : "Draft"}</Tag>} />
                  <Table.Column title="URL" dataIndex="url" ellipsis render={(v: string) => v || "--"} />
                  <Table.Column title="Actions" width={90} render={(_: any, record: any) => <Button danger size="small" icon={<DeleteOutlined />} onClick={() => runAction(() => axiosInstance.delete(`/api/resources/${record.id}`), "Resource deleted", resourcesQuery.refetch)} />} />
                </Table>
              </Card>
            ),
          },
          {
            key: "categories",
            label: "Categories",
            children: (
              <Card>
                <Table loading={categoriesQuery.isLoading} dataSource={categories} rowKey={(r: any) => r.id} size="small" locale={{ emptyText: <Empty description="No categories returned" /> }}>
                  <Table.Column title="Name" dataIndex="name" />
                  <Table.Column title="Description" dataIndex="description" ellipsis />
                  <Table.Column title="Parent" dataIndex="parent_id" />
                  <Table.Column title="Sort" dataIndex="sort_order" />
                  <Table.Column title="Actions" width={90} render={(_: any, record: any) => <Button danger size="small" icon={<DeleteOutlined />} onClick={() => runAction(() => axiosInstance.delete(`/api/resources/categories/${record.id}`), "Category deleted", () => { categoriesQuery.refetch(); treeQuery.refetch(); })} />} />
                </Table>
              </Card>
            ),
          },
        ]}
      />

      <Modal title="Create Resource" open={resourceOpen} onOk={createResource} confirmLoading={busy} onCancel={() => setResourceOpen(false)} width={680}>
        <Form form={resourceForm} layout="vertical">
          <Form.Item name="title" label="Title" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="description" label="Description"><TextArea rows={4} /></Form.Item>
          <Form.Item name="url" label="URL"><Input /></Form.Item>
          <Form.Item name="resource_type" label="Type"><Input placeholder="link, article, file, video" /></Form.Item>
          <Form.Item name="category_id" label="Category"><Select allowClear options={categories.map((c: any) => ({ value: c.id, label: c.name }))} /></Form.Item>
        </Form>
      </Modal>

      <Modal title="Create Resource Category" open={categoryOpen} onOk={createCategory} confirmLoading={busy} onCancel={() => setCategoryOpen(false)}>
        <Form form={categoryForm} layout="vertical">
          <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="description" label="Description"><TextArea rows={3} /></Form.Item>
          <Form.Item name="parent_id" label="Parent"><Select allowClear options={categories.map((c: any) => ({ value: c.id, label: c.name }))} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
