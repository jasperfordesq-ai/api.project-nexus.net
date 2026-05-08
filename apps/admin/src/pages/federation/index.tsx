// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useState } from "react";
import { useCustom } from "@refinedev/core";
import { Button, Card, Col, Descriptions, Empty, Form, Input, Modal, Row, Space, Statistic, Switch, Table, Tabs, Tag, Typography, message } from "antd";
import { ApiOutlined, DeleteOutlined, PlusOutlined, ReloadOutlined, SafetyOutlined, SyncOutlined } from "@ant-design/icons";
import axiosInstance from "../../utils/axios";
import { getErrorMessage } from "../../utils/errors";

const { Title, Text } = Typography;

const rowsFrom = (payload: any) => {
  const raw = payload?.data ?? payload;
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.items)) return raw.items;
  return [];
};

const dataFrom = (payload: any) => payload?.data?.data ?? payload?.data ?? {};
const statusColor = (status?: string) => {
  const s = String(status || "").toLowerCase();
  if (["active", "approved", "healthy"].includes(s)) return "green";
  if (["pending", "requested"].includes(s)) return "orange";
  if (["suspended", "rejected", "terminated"].includes(s)) return "red";
  return "default";
};

export const FederationPage = () => {
  const [partnerOpen, setPartnerOpen] = useState(false);
  const [externalPartnerOpen, setExternalPartnerOpen] = useState(false);
  const [apiKeyOpen, setApiKeyOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [partnerForm] = Form.useForm();
  const [externalPartnerForm] = Form.useForm();
  const [apiKeyForm] = Form.useForm();
  const [settingsForm] = Form.useForm();

  const partnersQuery = useCustom({ url: "/api/admin/federation/partners", method: "get", queryOptions: { queryKey: ["fed-partners"] } });
  const statsQuery = useCustom({ url: "/api/admin/federation/stats", method: "get", queryOptions: { queryKey: ["fed-stats"] } });
  const apiKeysQuery = useCustom({ url: "/api/admin/federation/api-keys", method: "get", queryOptions: { queryKey: ["fed-api-keys"] } });
  const featuresQuery = useCustom({ url: "/api/admin/federation/features", method: "get", queryOptions: { queryKey: ["fed-features"] } });
  const settingsQuery = useCustom({ url: "/api/admin/federation/settings", method: "get", queryOptions: { queryKey: ["fed-settings"] } });
  const directoryQuery = useCustom({ url: "/api/admin/federation/directory", method: "get", queryOptions: { queryKey: ["fed-directory"] } });
  const profileQuery = useCustom({ url: "/api/admin/federation/directory/profile", method: "get", queryOptions: { queryKey: ["fed-profile"] } });
  const analyticsQuery = useCustom({ url: "/api/admin/federation/analytics", method: "get", queryOptions: { queryKey: ["fed-analytics"] } });
  const dataQuery = useCustom({ url: "/api/admin/federation/data", method: "get", queryOptions: { queryKey: ["fed-data"] } });
  const creditAgreementsQuery = useCustom({ url: "/api/admin/federation/credit-agreements", method: "get", queryOptions: { queryKey: ["fed-credit-agreements"] } });
  const neighborhoodsQuery = useCustom({ url: "/api/admin/federation/neighborhoods", method: "get", queryOptions: { queryKey: ["fed-neighborhoods"] } });
  const externalPartnersQuery = useCustom({ url: "/api/admin/federation/external-partners", method: "get", queryOptions: { queryKey: ["fed-external-partners"] } });
  const webhooksQuery = useCustom({ url: "/api/admin/system/federation/audit-log", method: "get", queryOptions: { queryKey: ["fed-webhooks"] } });
  const activityQuery = useCustom({ url: "/api/admin/system/federation/stats", method: "get", queryOptions: { queryKey: ["fed-activity"] } });
  const controlsQuery = useCustom({ url: "/api/admin/super/federation/system-controls", method: "get", queryOptions: { queryKey: ["fed-controls"] } });
  const whitelistQuery = useCustom({ url: "/api/admin/super/federation/whitelist", method: "get", queryOptions: { queryKey: ["fed-whitelist"] } });

  const partners = rowsFrom(partnersQuery.data);
  const stats = dataFrom(statsQuery.data);
  const apiKeys = rowsFrom(apiKeysQuery.data);
  const features = dataFrom(featuresQuery.data);
  const settings = dataFrom(settingsQuery.data);
  const directory = rowsFrom(directoryQuery.data);
  const profile = dataFrom(profileQuery.data);
  const analytics = dataFrom(analyticsQuery.data);
  const dataStatus = dataFrom(dataQuery.data);
  const creditAgreements = rowsFrom(creditAgreementsQuery.data);
  const neighborhoods = rowsFrom(neighborhoodsQuery.data);
  const externalPartners = rowsFrom(externalPartnersQuery.data);
  const webhooks = rowsFrom(webhooksQuery.data);
  const activity = rowsFrom(activityQuery.data);
  const controls = dataFrom(controlsQuery.data);
  const whitelist = rowsFrom(whitelistQuery.data);

  const refreshAll = () => {
    [
      partnersQuery, statsQuery, apiKeysQuery, featuresQuery, settingsQuery, directoryQuery, profileQuery,
      analyticsQuery, dataQuery, creditAgreementsQuery, neighborhoodsQuery, externalPartnersQuery,
      webhooksQuery, activityQuery, controlsQuery, whitelistQuery,
    ].forEach((query) => query.refetch());
  };

  const runAction = async (action: () => Promise<any>, success: string, refresh?: () => void) => {
    setBusy(true);
    try {
      await action();
      message.success(success);
      refresh?.();
    } catch (err: unknown) {
      message.error(getErrorMessage(err, "Federation action failed"));
    } finally {
      setBusy(false);
    }
  };

  const createPartner = async () => {
    const values = await partnerForm.validateFields();
    await runAction(() => axiosInstance.post("/api/admin/federation/partners", {
      partner_tenant_id: Number(values.partner_tenant_id),
      shared_listings: !!values.shared_listings,
      shared_events: !!values.shared_events,
      shared_members: !!values.shared_members,
    }), "Partnership requested", () => {
      setPartnerOpen(false);
      partnerForm.resetFields();
      partnersQuery.refetch();
    });
  };

  const createApiKey = async () => {
    const values = await apiKeyForm.validateFields();
    await runAction(() => axiosInstance.post("/api/admin/federation/api-keys", values), "API key created", () => {
      setApiKeyOpen(false);
      apiKeyForm.resetFields();
      apiKeysQuery.refetch();
    });
  };

  const createExternalPartner = async () => {
    const values = await externalPartnerForm.validateFields();
    await runAction(() => axiosInstance.post("/api/admin/federation/external-partners", {
      ...values,
      allow_member_search: values.allow_member_search ?? true,
      allow_listing_search: values.allow_listing_search ?? true,
      allow_messaging: values.allow_messaging ?? true,
      allow_transactions: values.allow_transactions ?? true,
      allow_events: !!values.allow_events,
      allow_groups: !!values.allow_groups,
      allow_connections: !!values.allow_connections,
      allow_volunteering: !!values.allow_volunteering,
      allow_member_sync: !!values.allow_member_sync,
    }), "External federation partner created", () => {
      setExternalPartnerOpen(false);
      externalPartnerForm.resetFields();
      externalPartnersQuery.refetch();
    });
  };

  const updateSettings = async () => {
    const values = await settingsForm.validateFields();
    await runAction(() => axiosInstance.put("/api/admin/federation/settings", JSON.parse(values.payload || "{}")), "Federation settings updated", () => {
      setSettingsOpen(false);
      settingsForm.resetFields();
      settingsQuery.refetch();
    });
  };

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>Federation</Title>
          <Text type="secondary">Partnerships, API keys, directory profile, shared data, webhooks, controls and activity.</Text>
        </Col>
        <Col><Button icon={<ReloadOutlined />} onClick={refreshAll}>Refresh</Button></Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}><Card><Statistic title="Partners" value={stats.total_partners ?? partners.length} /></Card></Col>
        <Col xs={24} sm={12} lg={6}><Card><Statistic title="Shared Listings" value={stats.shared_listings ?? analytics.shared_listings ?? 0} /></Card></Col>
        <Col xs={24} sm={12} lg={6}><Card><Statistic title="Cross-Tenant Exchanges" value={stats.cross_tenant_exchanges ?? analytics.cross_tenant_exchanges ?? 0} /></Card></Col>
        <Col xs={24} sm={12} lg={6}><Card><Statistic title="Lockdown" value={controls.lockdown_active ? "Active" : "Off"} prefix={<SafetyOutlined />} /></Card></Col>
      </Row>

      <Tabs
        items={[
          {
            key: "partners",
            label: "Partners",
            children: (
              <Card extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setPartnerOpen(true)}>Request Partnership</Button>}>
                <Table loading={partnersQuery.isLoading} dataSource={partners} rowKey={(r: any) => r.id} size="small" locale={{ emptyText: <Empty description="No federation partners" /> }}>
                  <Table.Column title="Partner" render={(_: any, r: any) => r.partner_tenant?.name || r.name || r.partner_tenant_id || "--"} />
                  <Table.Column title="Status" dataIndex="status" render={(v: string) => <Tag color={statusColor(v)}>{v || "--"}</Tag>} />
                  <Table.Column title="Listings" dataIndex="shared_listings" render={(v: boolean) => v ? "Yes" : "No"} />
                  <Table.Column title="Events" dataIndex="shared_events" render={(v: boolean) => v ? "Yes" : "No"} />
                  <Table.Column title="Members" dataIndex="shared_members" render={(v: boolean) => v ? "Yes" : "No"} />
                  <Table.Column
                    title="Actions"
                    width={290}
                    render={(_: any, record: any) => (
                      <Space wrap>
                        <Button size="small" onClick={() => runAction(() => axiosInstance.put(`/api/admin/federation/partners/${record.id}/approve`), "Partner approved", partnersQuery.refetch)}>Approve</Button>
                        <Button size="small" icon={<SyncOutlined />} onClick={() => runAction(() => axiosInstance.post(`/api/admin/federation/partners/${record.id}/sync`), "Sync requested")}>Sync</Button>
                        <Button size="small" danger onClick={() => runAction(() => axiosInstance.put(`/api/admin/federation/partners/${record.id}/suspend`), "Partner suspended", partnersQuery.refetch)}>Suspend</Button>
                      </Space>
                    )}
                  />
                </Table>
              </Card>
            ),
          },
          {
            key: "directory",
            label: "Directory",
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                  <Card title="Directory Profile" loading={profileQuery.isLoading}>
                    <Descriptions column={1} size="small">
                      {Object.entries(profile).map(([key, value]) => <Descriptions.Item key={key} label={key}>{String(value ?? "--")}</Descriptions.Item>)}
                    </Descriptions>
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card title="Partner Directory">
                    <Table loading={directoryQuery.isLoading} dataSource={directory} rowKey={(r: any) => r.id || JSON.stringify(r)} size="small" locale={{ emptyText: <Empty description="No directory entries" /> }} />
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: "api",
            label: "API & Features",
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                  <Card title="API Keys" extra={<Button type="primary" icon={<ApiOutlined />} onClick={() => setApiKeyOpen(true)}>Create Key</Button>}>
                    <Table loading={apiKeysQuery.isLoading} dataSource={apiKeys} rowKey={(r: any) => r.id || r.key_id || JSON.stringify(r)} size="small" locale={{ emptyText: <Empty description="No API keys" /> }}>
                      <Table.Column title="Name" dataIndex="name" />
                      <Table.Column title="Created" dataIndex="created_at" />
                      <Table.Column title="Actions" width={90} render={(_: any, r: any) => <Button danger size="small" icon={<DeleteOutlined />} onClick={() => runAction(() => axiosInstance.delete(`/api/admin/federation/api-keys/${r.id}`), "API key revoked", apiKeysQuery.refetch)} />} />
                    </Table>
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card title="Features">
                    <Descriptions column={1} size="small">
                      {Object.entries(features).map(([key, value]) => <Descriptions.Item key={key} label={key}>{String(value ?? "--")}</Descriptions.Item>)}
                    </Descriptions>
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: "data",
            label: "Data & Analytics",
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}><Card title="Analytics"><Descriptions column={1} size="small">{Object.entries(analytics).map(([k, v]) => <Descriptions.Item key={k} label={k}>{String(v ?? "--")}</Descriptions.Item>)}</Descriptions></Card></Col>
                <Col xs={24} lg={12}><Card title="Data Sync"><Descriptions column={1} size="small">{Object.entries(dataStatus).map(([k, v]) => <Descriptions.Item key={k} label={k}>{String(v ?? "--")}</Descriptions.Item>)}</Descriptions></Card></Col>
                <Col xs={24} lg={12}><Card title="Credit Agreements"><Table dataSource={creditAgreements} rowKey={(r: any) => r.id || JSON.stringify(r)} size="small" locale={{ emptyText: <Empty description="No credit agreements" /> }} /></Card></Col>
                <Col xs={24} lg={12}><Card title="Neighborhoods"><Table dataSource={neighborhoods} rowKey={(r: any) => r.id || JSON.stringify(r)} size="small" locale={{ emptyText: <Empty description="No neighborhoods" /> }} /></Card></Col>
              </Row>
            ),
          },
          {
            key: "ops",
            label: "Ops",
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                  <Card
                    title="External Partners"
                    extra={(
                      <Space>
                        <Button onClick={() => runAction(() => axiosInstance.post("/api/admin/federation/external-partners/enable-current-tenant"), "Federation enabled for tenant users", refreshAll)}>Enable Tenant</Button>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => setExternalPartnerOpen(true)}>Add Partner</Button>
                      </Space>
                    )}
                  >
                    <Table dataSource={externalPartners} rowKey={(r: any) => r.id || JSON.stringify(r)} size="small" locale={{ emptyText: <Empty description="No external partners" /> }}>
                      <Table.Column title="Name" dataIndex="name" />
                      <Table.Column title="Base URL" dataIndex="base_url" ellipsis />
                      <Table.Column title="Protocol" dataIndex="protocol_type" />
                      <Table.Column title="Status" dataIndex="status" render={(v: string) => <Tag color={statusColor(v)}>{v || "--"}</Tag>} />
                      <Table.Column
                        title="Actions"
                        width={190}
                        render={(_: any, record: any) => (
                          <Space wrap>
                            <Button size="small" icon={<SyncOutlined />} onClick={() => runAction(() => axiosInstance.post(`/api/admin/federation/external-partners/${record.id}/health-check`), "Health check completed", externalPartnersQuery.refetch)}>Health</Button>
                            <Button size="small" danger icon={<DeleteOutlined />} onClick={() => runAction(() => axiosInstance.delete(`/api/admin/federation/external-partners/${record.id}`), "External partner deleted", externalPartnersQuery.refetch)} />
                          </Space>
                        )}
                      />
                    </Table>
                  </Card>
                </Col>
                <Col xs={24} lg={12}><Card title="Webhooks"><Table dataSource={webhooks} rowKey={(r: any) => r.id || JSON.stringify(r)} size="small" locale={{ emptyText: <Empty description="No webhooks" /> }} /></Card></Col>
                <Col xs={24} lg={12}><Card title="Activity"><Table dataSource={activity} rowKey={(r: any) => r.id || JSON.stringify(r)} size="small" locale={{ emptyText: <Empty description="No activity" /> }} /></Card></Col>
                <Col xs={24} lg={12}>
                  <Card title="System Controls" extra={<Button onClick={() => { settingsForm.setFieldsValue({ payload: JSON.stringify(settings, null, 2) }); setSettingsOpen(true); }}>Settings</Button>}>
                    <Descriptions column={1} size="small">
                      {Object.entries(controls).map(([key, value]) => <Descriptions.Item key={key} label={key}>{String(value ?? "--")}</Descriptions.Item>)}
                    </Descriptions>
                    <Space style={{ marginTop: 12 }}>
                      <Button danger onClick={() => runAction(() => axiosInstance.post("/api/admin/super/federation/emergency-lockdown"), "Federation lockdown activated", controlsQuery.refetch)}>Emergency Lockdown</Button>
                      <Button onClick={() => runAction(() => axiosInstance.post("/api/admin/super/federation/lift-lockdown"), "Federation lockdown lifted", controlsQuery.refetch)}>Lift Lockdown</Button>
                    </Space>
                  </Card>
                </Col>
                <Col xs={24}><Card title="Whitelist"><Table dataSource={whitelist} rowKey={(r: any) => r.tenant_id || r.id || JSON.stringify(r)} size="small" locale={{ emptyText: <Empty description="No whitelist entries" /> }} /></Card></Col>
              </Row>
            ),
          },
        ]}
      />

      <Modal title="Request Federation Partnership" open={partnerOpen} onOk={createPartner} confirmLoading={busy} onCancel={() => setPartnerOpen(false)}>
        <Form form={partnerForm} layout="vertical">
          <Form.Item name="partner_tenant_id" label="Partner Tenant ID" rules={[{ required: true }]}><Input type="number" /></Form.Item>
          <Form.Item name="shared_listings" valuePropName="checked"><Switch /> <span style={{ marginLeft: 8 }}>Share listings</span></Form.Item>
          <Form.Item name="shared_events" valuePropName="checked"><Switch /> <span style={{ marginLeft: 8 }}>Share events</span></Form.Item>
          <Form.Item name="shared_members" valuePropName="checked"><Switch /> <span style={{ marginLeft: 8 }}>Share members</span></Form.Item>
        </Form>
      </Modal>

      <Modal title="Create Federation API Key" open={apiKeyOpen} onOk={createApiKey} confirmLoading={busy} onCancel={() => setApiKeyOpen(false)}>
        <Form form={apiKeyForm} layout="vertical">
          <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="description" label="Description"><Input /></Form.Item>
        </Form>
      </Modal>

      <Modal title="Add External Federation Partner" open={externalPartnerOpen} onOk={createExternalPartner} confirmLoading={busy} onCancel={() => setExternalPartnerOpen(false)} width={720}>
        <Form form={externalPartnerForm} layout="vertical" initialValues={{ auth_method: "api_key", protocol_type: "nexus", status: "pending", api_path: "/api/v1/federation", allow_member_search: true, allow_listing_search: true, allow_messaging: true, allow_transactions: true }}>
          <Row gutter={12}>
            <Col xs={24} md={12}><Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item name="base_url" label="Base URL" rules={[{ required: true }]}><Input placeholder="https://partner.example.com" /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item name="api_key" label="API Key"><Input.Password /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item name="signing_secret" label="Signing Secret"><Input.Password /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="auth_method" label="Auth Method"><Input /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="protocol_type" label="Protocol"><Input /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="status" label="Status"><Input /></Form.Item></Col>
            <Col xs={24}><Form.Item name="description" label="Description"><Input.TextArea rows={2} /></Form.Item></Col>
          </Row>
          <Space wrap>
            <Form.Item name="allow_member_search" valuePropName="checked"><Switch /> <span style={{ marginLeft: 8 }}>Members</span></Form.Item>
            <Form.Item name="allow_listing_search" valuePropName="checked"><Switch /> <span style={{ marginLeft: 8 }}>Listings</span></Form.Item>
            <Form.Item name="allow_messaging" valuePropName="checked"><Switch /> <span style={{ marginLeft: 8 }}>Messages</span></Form.Item>
            <Form.Item name="allow_transactions" valuePropName="checked"><Switch /> <span style={{ marginLeft: 8 }}>Credits</span></Form.Item>
            <Form.Item name="allow_member_sync" valuePropName="checked"><Switch /> <span style={{ marginLeft: 8 }}>Sync</span></Form.Item>
          </Space>
        </Form>
      </Modal>

      <Modal title="Update Federation Settings" open={settingsOpen} onOk={updateSettings} confirmLoading={busy} onCancel={() => setSettingsOpen(false)} width={760}>
        <Form form={settingsForm} layout="vertical">
          <Form.Item
            name="payload"
            label="Settings JSON"
            rules={[{
              validator: (_, value) => {
                try {
                  JSON.parse(value || "{}");
                  return Promise.resolve();
                } catch {
                  return Promise.reject(new Error("Settings must be valid JSON"));
                }
              },
            }]}
          >
            <Input.TextArea rows={12} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
