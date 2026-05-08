// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useState } from "react";
import { useCustom } from "@refinedev/core";
import { Button, Card, Col, Empty, Form, Input, Modal, Row, Select, Space, Statistic, Table, Tabs, Tag, Typography, message } from "antd";
import { CheckOutlined, DeleteOutlined, PlusOutlined, ReloadOutlined, SearchOutlined, StarOutlined, StopOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import axiosInstance from "../../utils/axios";
import { getErrorMessage } from "../../utils/errors";

const { Title, Text } = Typography;
const { TextArea } = Input;

const rowsFrom = (payload: any) => {
  const raw = payload?.data ?? payload;
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.items)) return raw.items;
  if (Array.isArray(raw?.results)) return raw.results;
  return [];
};

const totalFrom = (payload: any, fallback: number) =>
  payload?.data?.pagination?.total ?? payload?.pagination?.total ?? payload?.data?.total ?? payload?.total ?? fallback;

const date = (value?: string) => (value ? dayjs(value).format("DD MMM YYYY HH:mm") : "--");
const statusColor = (status?: string) => {
  const s = String(status || "").toLowerCase();
  if (["active", "approved", "published"].includes(s)) return "green";
  if (["pending", "draft"].includes(s)) return "orange";
  if (["rejected", "deleted", "suspended"].includes(s)) return "red";
  return "default";
};

export const ListingsAdminPage = () => {
  const [page, setPage] = useState(1);
  const [pendingPage, setPendingPage] = useState(1);
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [status, setStatus] = useState<string | undefined>();
  const [type, setType] = useState<string | undefined>();
  const [attributeOpen, setAttributeOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [attributeForm] = Form.useForm();
  const [menuForm] = Form.useForm();
  const [planForm] = Form.useForm();

  const listingsQuery = useCustom({
    url: "/api/admin/listings",
    method: "get",
    config: { query: { page, limit: 20, search: activeSearch || undefined, status, type } },
    queryOptions: { queryKey: ["admin-listings", page, activeSearch, status, type] },
  });

  const pendingQuery = useCustom({
    url: "/api/admin/listings/pending",
    method: "get",
    config: { query: { page: pendingPage, limit: 20 } },
    queryOptions: { queryKey: ["admin-listings-pending", pendingPage] },
  });

  const featuredQuery = useCustom({ url: "/api/admin/listings/featured", method: "get", queryOptions: { queryKey: ["admin-listings-featured"] } });
  const attributesQuery = useCustom({ url: "/api/admin/attributes", method: "get", queryOptions: { queryKey: ["admin-attributes"] } });
  const menusQuery = useCustom({ url: "/api/admin/menus", method: "get", queryOptions: { queryKey: ["admin-menus"] } });
  const plansQuery = useCustom({ url: "/api/admin/plans", method: "get", queryOptions: { queryKey: ["admin-plans"] } });
  const subscriptionsQuery = useCustom({ url: "/api/admin/plans", method: "get", queryOptions: { queryKey: ["admin-plan-subscriptions"] } });

  const listings = rowsFrom(listingsQuery.data);
  const pending = rowsFrom(pendingQuery.data);
  const featured = rowsFrom(featuredQuery.data);
  const attributes = rowsFrom(attributesQuery.data);
  const menus = rowsFrom(menusQuery.data);
  const plans = rowsFrom(plansQuery.data);
  const subscriptions = rowsFrom(subscriptionsQuery.data);

  const refreshAll = () => {
    listingsQuery.refetch();
    pendingQuery.refetch();
    featuredQuery.refetch();
    attributesQuery.refetch();
    menusQuery.refetch();
    plansQuery.refetch();
    subscriptionsQuery.refetch();
  };

  const runAction = async (action: () => Promise<any>, success: string, refresh?: () => void) => {
    setBusy(true);
    try {
      await action();
      message.success(success);
      refresh?.();
    } catch (err: unknown) {
      message.error(getErrorMessage(err, "Listings action failed"));
    } finally {
      setBusy(false);
    }
  };

  const confirmAction = (title: string, content: string, action: () => Promise<any>, success: string, refresh?: () => void, danger = false) => {
    Modal.confirm({
      title,
      content,
      okType: danger ? "danger" : "primary",
      onOk: () => runAction(action, success, refresh),
    });
  };

  const createAttribute = async () => {
    const values = await attributeForm.validateFields();
    await runAction(() => axiosInstance.post("/api/admin/attributes", values), "Attribute created", () => {
      setAttributeOpen(false);
      attributeForm.resetFields();
      attributesQuery.refetch();
    });
  };

  const createMenu = async () => {
    const values = await menuForm.validateFields();
    await runAction(() => axiosInstance.post("/api/admin/menus", values), "Menu created", () => {
      setMenuOpen(false);
      menuForm.resetFields();
      menusQuery.refetch();
    });
  };

  const createPlan = async () => {
    const values = await planForm.validateFields();
    await runAction(() => axiosInstance.post("/api/admin/plans", {
      ...values,
      price: Number(values.price || 0),
      features: values.features?.split("\n").map((f: string) => f.trim()).filter(Boolean) ?? [],
    }), "Plan created", () => {
      setPlanOpen(false);
      planForm.resetFields();
      plansQuery.refetch();
    });
  };

  const listingColumns = [
    <Table.Column key="title" title="Title" dataIndex="title" ellipsis />,
    <Table.Column key="type" title="Type" dataIndex="type" width={110} render={(v: string) => <Tag>{v || "--"}</Tag>} />,
    <Table.Column key="status" title="Status" dataIndex="status" width={120} render={(v: string) => <Tag color={statusColor(v)}>{v || "--"}</Tag>} />,
    <Table.Column key="user" title="User" dataIndex="user_id" width={90} />,
    <Table.Column key="created" title="Created" dataIndex="created_at" width={170} render={date} />,
    <Table.Column
      key="actions"
      title="Actions"
      width={280}
      render={(_: any, record: any) => (
        <Space wrap>
          <Button size="small" icon={<StarOutlined />} onClick={() => runAction(() => axiosInstance.post(`/api/admin/listings/${record.id}/feature`), "Listing featured", () => { featuredQuery.refetch(); listingsQuery.refetch(); })}>Feature</Button>
          <Button size="small" icon={<StopOutlined />} onClick={() => runAction(() => axiosInstance.delete(`/api/admin/listings/${record.id}/feature`), "Listing unfeatured", featuredQuery.refetch)}>Unfeature</Button>
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => confirmAction("Delete listing", "Delete this listing permanently?", () => axiosInstance.delete(`/api/admin/listings/${record.id}`), "Listing deleted", listingsQuery.refetch, true)} />
        </Space>
      )}
    />,
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>Listings</Title>
          <Text type="secondary">Content directory, approvals, featured listings, attributes, menus, plans and subscriptions.</Text>
        </Col>
        <Col><Button icon={<ReloadOutlined />} onClick={refreshAll}>Refresh</Button></Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}><Card><Statistic title="Listings" value={totalFrom(listingsQuery.data, listings.length)} /></Card></Col>
        <Col xs={24} sm={12} lg={6}><Card><Statistic title="Pending" value={totalFrom(pendingQuery.data, pending.length)} /></Card></Col>
        <Col xs={24} sm={12} lg={6}><Card><Statistic title="Featured" value={totalFrom(featuredQuery.data, featured.length)} /></Card></Col>
        <Col xs={24} sm={12} lg={6}><Card><Statistic title="Plans" value={totalFrom(plansQuery.data, plans.length)} /></Card></Col>
      </Row>

      <Tabs
        items={[
          {
            key: "directory",
            label: "Directory",
            children: (
              <Card
                extra={(
                  <Space wrap>
                    <Input allowClear prefix={<SearchOutlined />} placeholder="Search title" value={search} onChange={(e) => setSearch(e.target.value)} onPressEnter={() => { setPage(1); setActiveSearch(search.trim()); }} />
                    <Select allowClear placeholder="Status" value={status} onChange={(v) => { setStatus(v); setPage(1); }} style={{ width: 140 }} options={["pending", "active", "rejected", "closed"].map((v) => ({ value: v, label: v }))} />
                    <Select allowClear placeholder="Type" value={type} onChange={(v) => { setType(v); setPage(1); }} style={{ width: 140 }} options={["offer", "request"].map((v) => ({ value: v, label: v }))} />
                    <Button onClick={() => { setPage(1); setActiveSearch(search.trim()); }}>Apply</Button>
                  </Space>
                )}
              >
                <Table loading={listingsQuery.isLoading} dataSource={listings} rowKey={(r: any) => r.id} size="small" pagination={{ current: page, pageSize: 20, total: totalFrom(listingsQuery.data, listings.length), onChange: setPage }} locale={{ emptyText: <Empty description="No listings returned" /> }}>
                  {listingColumns}
                </Table>
              </Card>
            ),
          },
          {
            key: "pending",
            label: "Approvals",
            children: (
              <Card>
                <Table loading={pendingQuery.isLoading} dataSource={pending} rowKey={(r: any) => r.id} size="small" pagination={{ current: pendingPage, pageSize: 20, total: totalFrom(pendingQuery.data, pending.length), onChange: setPendingPage }} locale={{ emptyText: <Empty description="No pending listings" /> }}>
                  <Table.Column title="Title" dataIndex="title" ellipsis />
                  <Table.Column title="Type" dataIndex="type" width={110} render={(v: string) => <Tag>{v || "--"}</Tag>} />
                  <Table.Column title="Submitted By" render={(_: any, r: any) => r.user?.email || r.user_id || "--"} />
                  <Table.Column title="Created" dataIndex="created_at" width={170} render={date} />
                  <Table.Column
                    title="Actions"
                    width={210}
                    render={(_: any, record: any) => (
                      <Space>
                        <Button type="primary" size="small" icon={<CheckOutlined />} onClick={() => runAction(() => axiosInstance.put(`/api/admin/listings/${record.id}/approve`), "Listing approved", () => { pendingQuery.refetch(); listingsQuery.refetch(); })}>Approve</Button>
                        <Button danger size="small" onClick={() => confirmAction("Reject listing", "Reject this listing?", () => axiosInstance.put(`/api/admin/listings/${record.id}/reject`, { reason: "Does not meet guidelines" }), "Listing rejected", () => { pendingQuery.refetch(); listingsQuery.refetch(); }, true)}>Reject</Button>
                      </Space>
                    )}
                  />
                </Table>
              </Card>
            ),
          },
          {
            key: "featured",
            label: "Featured",
            children: (
              <Card>
                <Table loading={featuredQuery.isLoading} dataSource={featured} rowKey={(r: any) => r.id || r.listing_id || JSON.stringify(r)} size="small" locale={{ emptyText: <Empty description="No featured listings" /> }}>
                  <Table.Column title="Title" dataIndex="title" ellipsis />
                  <Table.Column title="Type" dataIndex="type" width={110} render={(v: string) => <Tag>{v || "--"}</Tag>} />
                  <Table.Column title="Author" dataIndex="user_name" />
                  <Table.Column title="Featured At" dataIndex="featured_at" width={170} render={date} />
                  <Table.Column title="Actions" width={120} render={(_: any, record: any) => <Button size="small" danger onClick={() => runAction(() => axiosInstance.delete(`/api/admin/listings/${record.listing_id || record.id}/feature`), "Listing unfeatured", featuredQuery.refetch)}>Unfeature</Button>} />
                </Table>
              </Card>
            ),
          },
          {
            key: "attributes",
            label: "Attributes",
            children: (
              <Card extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setAttributeOpen(true)}>Create Attribute</Button>}>
                <Table loading={attributesQuery.isLoading} dataSource={attributes} rowKey={(r: any) => r.id || r.key || JSON.stringify(r)} size="small" locale={{ emptyText: <Empty description="No attributes returned" /> }}>
                  <Table.Column title="Name" dataIndex="name" />
                  <Table.Column title="Key" dataIndex="key" />
                  <Table.Column title="Type" dataIndex="type" />
                  <Table.Column title="Actions" width={90} render={(_: any, record: any) => <Button danger size="small" icon={<DeleteOutlined />} onClick={() => runAction(() => axiosInstance.delete(`/api/admin/attributes/${record.id}`), "Attribute deleted", attributesQuery.refetch)} />} />
                </Table>
              </Card>
            ),
          },
          {
            key: "menus",
            label: "Menus",
            children: (
              <Card extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setMenuOpen(true)}>Create Menu</Button>}>
                <Table loading={menusQuery.isLoading} dataSource={menus} rowKey={(r: any) => r.id || r.name} size="small">
                  <Table.Column title="Name" dataIndex="name" />
                  <Table.Column title="Location" dataIndex="location" />
                  <Table.Column title="Items" dataIndex="items_count" />
                  <Table.Column title="Actions" width={90} render={(_: any, record: any) => <Button danger size="small" icon={<DeleteOutlined />} onClick={() => runAction(() => axiosInstance.delete(`/api/admin/menus/${record.id}`), "Menu deleted", menusQuery.refetch)} />} />
                </Table>
              </Card>
            ),
          },
          {
            key: "plans",
            label: "Plans",
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                  <Card title="Plans" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setPlanOpen(true)}>Create Plan</Button>}>
                    <Table loading={plansQuery.isLoading} dataSource={plans} rowKey={(r: any) => r.id || r.name} size="small" locale={{ emptyText: <Empty description="No plans returned" /> }}>
                      <Table.Column title="Name" dataIndex="name" />
                      <Table.Column title="Price" dataIndex="price" />
                      <Table.Column title="Interval" dataIndex="interval" />
                      <Table.Column title="Active" dataIndex="is_active" render={(v: boolean) => <Tag color={v ? "green" : "default"}>{v ? "Active" : "Inactive"}</Tag>} />
                      <Table.Column title="Actions" width={90} render={(_: any, record: any) => <Button danger size="small" icon={<DeleteOutlined />} onClick={() => runAction(() => axiosInstance.delete(`/api/admin/plans/${record.id}`), "Plan deleted", plansQuery.refetch)} />} />
                    </Table>
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card title="Subscriptions">
                    <Table loading={subscriptionsQuery.isLoading} dataSource={subscriptions} rowKey={(r: any) => r.id || JSON.stringify(r)} size="small" locale={{ emptyText: <Empty description="No subscriptions returned" /> }} />
                  </Card>
                </Col>
              </Row>
            ),
          },
        ]}
      />

      <Modal title="Create Attribute" open={attributeOpen} onOk={createAttribute} confirmLoading={busy} onCancel={() => setAttributeOpen(false)}>
        <Form form={attributeForm} layout="vertical">
          <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="key" label="Key"><Input /></Form.Item>
          <Form.Item name="type" label="Type"><Input placeholder="text, select, boolean" /></Form.Item>
        </Form>
      </Modal>

      <Modal title="Create Menu" open={menuOpen} onOk={createMenu} confirmLoading={busy} onCancel={() => setMenuOpen(false)}>
        <Form form={menuForm} layout="vertical">
          <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="location" label="Location" rules={[{ required: true }]}><Input placeholder="header, footer" /></Form.Item>
        </Form>
      </Modal>

      <Modal title="Create Plan" open={planOpen} onOk={createPlan} confirmLoading={busy} onCancel={() => setPlanOpen(false)} width={640}>
        <Form form={planForm} layout="vertical">
          <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="description" label="Description"><TextArea rows={3} /></Form.Item>
          <Form.Item name="price" label="Price"><Input type="number" min={0} /></Form.Item>
          <Form.Item name="interval" label="Interval"><Input placeholder="monthly, yearly" /></Form.Item>
          <Form.Item name="features" label="Features"><TextArea rows={4} placeholder="One feature per line" /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
