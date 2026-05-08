// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useState } from "react";
import { useCustom } from "@refinedev/core";
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Form,
  Input,
  Modal,
  Row,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import {
  BarChartOutlined,
  CopyOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EyeOutlined,
  MailOutlined,
  PlusOutlined,
  ReloadOutlined,
  SendOutlined,
  SyncOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import axiosInstance from "../../utils/axios";
import { getErrorMessage } from "../../utils/errors";

const { Title, Text } = Typography;
const { TextArea } = Input;

const listFrom = (payload: any) => {
  const raw = payload?.data ?? payload;
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.items)) return raw.items;
  if (Array.isArray(raw?.newsletters)) return raw.newsletters;
  if (Array.isArray(raw?.subscribers)) return raw.subscribers;
  return [];
};

const metaFrom = (payload: any) => payload?.data?.meta ?? payload?.meta ?? payload?.data ?? {};
const dataFrom = (payload: any) => payload?.data?.data ?? payload?.data ?? {};
const lowerStatus = (status?: string) => String(status || "").toLowerCase();
const displayDate = (value?: string) => (value ? dayjs(value).format("DD MMM YYYY HH:mm") : "--");

type CampaignInsight = {
  campaign: any;
  stats: any;
  activity: any[];
  openers: any[];
  clickers: any[];
  emailClients: any[];
};

export const NewsletterPage = () => {
  const [campaignPage, setCampaignPage] = useState(1);
  const [campaignPageSize, setCampaignPageSize] = useState(50);
  const [subscriberPage, setSubscriberPage] = useState(1);
  const [subscriberPageSize, setSubscriberPageSize] = useState(50);
  const [createOpen, setCreateOpen] = useState(false);
  const [subscriberOpen, setSubscriberOpen] = useState(false);
  const [segmentOpen, setSegmentOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [suppressOpen, setSuppressOpen] = useState(false);
  const [testTarget, setTestTarget] = useState<any | null>(null);
  const [insight, setInsight] = useState<CampaignInsight | null>(null);
  const [busy, setBusy] = useState(false);

  const [campaignForm] = Form.useForm();
  const [subscriberForm] = Form.useForm();
  const [segmentForm] = Form.useForm();
  const [templateForm] = Form.useForm();
  const [suppressForm] = Form.useForm();
  const [testForm] = Form.useForm();

  const campaignsQuery = useCustom({
    url: "/api/admin/newsletters",
    method: "get",
    config: { query: { page: campaignPage, limit: campaignPageSize } },
    queryOptions: { queryKey: ["admin-newsletters", campaignPage, campaignPageSize] },
  });

  const subscribersQuery = useCustom({
    url: "/api/admin/newsletters/subscribers",
    method: "get",
    config: { query: { page: subscriberPage, limit: subscriberPageSize } },
    queryOptions: { queryKey: ["admin-newsletter-subscribers", subscriberPage, subscriberPageSize] },
  });

  const analyticsQuery = useCustom({
    url: "/api/admin/newsletters/analytics",
    method: "get",
    queryOptions: { queryKey: ["admin-newsletter-analytics"] },
  });

  const segmentsQuery = useCustom({
    url: "/api/admin/newsletters/segments",
    method: "get",
    queryOptions: { queryKey: ["admin-newsletter-segments"] },
  });

  const templatesQuery = useCustom({
    url: "/api/admin/newsletters/templates",
    method: "get",
    queryOptions: { queryKey: ["admin-newsletter-templates"] },
  });

  const bouncesQuery = useCustom({
    url: "/api/admin/newsletters/bounces",
    method: "get",
    queryOptions: { queryKey: ["admin-newsletter-bounces"] },
  });

  const suppressionQuery = useCustom({
    url: "/api/admin/newsletters/suppression-list",
    method: "get",
    queryOptions: { queryKey: ["admin-newsletter-suppression"] },
  });

  const diagnosticsQuery = useCustom({
    url: "/api/admin/newsletters/diagnostics",
    method: "get",
    queryOptions: { queryKey: ["admin-newsletter-diagnostics"] },
  });

  const optimizerQuery = useCustom({
    url: "/api/admin/newsletters/send-time-optimizer",
    method: "get",
    queryOptions: { queryKey: ["admin-newsletter-send-time-optimizer"] },
  });

  const campaigns = listFrom(campaignsQuery.data);
  const campaignMeta = metaFrom(campaignsQuery.data);
  const subscribers = listFrom(subscribersQuery.data);
  const subscriberMeta = metaFrom(subscribersQuery.data);
  const analytics = dataFrom(analyticsQuery.data);
  const segments = listFrom(segmentsQuery.data);
  const templates = listFrom(templatesQuery.data);
  const bounces = listFrom(bouncesQuery.data);
  const suppressed = listFrom(suppressionQuery.data);
  const diagnostics = dataFrom(diagnosticsQuery.data);
  const optimizer = dataFrom(optimizerQuery.data);

  const refreshAll = () => {
    campaignsQuery.refetch();
    subscribersQuery.refetch();
    analyticsQuery.refetch();
    segmentsQuery.refetch();
    templatesQuery.refetch();
    bouncesQuery.refetch();
    suppressionQuery.refetch();
    diagnosticsQuery.refetch();
    optimizerQuery.refetch();
  };

  const runAction = async (action: () => Promise<any>, success: string, after?: () => void) => {
    setBusy(true);
    try {
      await action();
      message.success(success);
      after?.();
    } catch (err: unknown) {
      message.error(getErrorMessage(err, "Action failed"));
    } finally {
      setBusy(false);
    }
  };

  const createCampaign = async () => {
    const values = await campaignForm.validateFields();
    await runAction(
      () => axiosInstance.post("/api/admin/newsletters", {
        subject: values.subject,
        content_html: values.content_html,
        content_text: values.content_text || undefined,
        scheduled_at: values.scheduled_at || undefined,
      }),
      "Newsletter campaign created",
      () => {
        setCreateOpen(false);
        campaignForm.resetFields();
        campaignsQuery.refetch();
      },
    );
  };

  const confirmCampaignAction = (title: string, content: string, onOk: () => Promise<void>, okText = "Confirm", danger = false) => {
    Modal.confirm({
      title,
      content,
      okText,
      okType: danger ? "danger" : "primary",
      onOk,
    });
  };

  const viewCampaign = async (campaign: any) => {
    setBusy(true);
    try {
      const [stats, activity, openers, clickers, emailClients] = await Promise.all([
        axiosInstance.get(`/api/admin/newsletters/${campaign.id}/stats`),
        axiosInstance.get(`/api/admin/newsletters/${campaign.id}/activity`),
        axiosInstance.get(`/api/admin/newsletters/${campaign.id}/openers`),
        axiosInstance.get(`/api/admin/newsletters/${campaign.id}/clickers`),
        axiosInstance.get(`/api/admin/newsletters/${campaign.id}/email-clients`),
      ]);

      setInsight({
        campaign,
        stats: dataFrom(stats),
        activity: listFrom(activity),
        openers: listFrom(openers),
        clickers: listFrom(clickers),
        emailClients: listFrom(emailClients),
      });
    } catch (err: unknown) {
      message.error(getErrorMessage(err, "Failed to load campaign insights"));
    } finally {
      setBusy(false);
    }
  };

  const addSubscriber = async () => {
    const values = await subscriberForm.validateFields();
    await runAction(
      () => axiosInstance.post("/api/admin/newsletters/subscribers", {
        email: values.email,
        user_id: values.user_id ? Number(values.user_id) : undefined,
      }),
      "Subscriber added",
      () => {
        setSubscriberOpen(false);
        subscriberForm.resetFields();
        subscribersQuery.refetch();
      },
    );
  };

  const createSegment = async () => {
    const values = await segmentForm.validateFields();
    await runAction(
      () => axiosInstance.post("/api/admin/newsletters/segments", {
        name: values.name,
        conditions: values.conditions ? JSON.parse(values.conditions) : [],
      }),
      "Segment created",
      () => {
        setSegmentOpen(false);
        segmentForm.resetFields();
        segmentsQuery.refetch();
      },
    );
  };

  const createTemplate = async () => {
    const values = await templateForm.validateFields();
    await runAction(
      () => axiosInstance.post("/api/admin/newsletters/templates", {
        name: values.name,
        subject: values.subject,
        content_html: values.content_html,
        content_text: values.content_text || undefined,
      }),
      "Template created",
      () => {
        setTemplateOpen(false);
        templateForm.resetFields();
        templatesQuery.refetch();
      },
    );
  };

  const suppressEmail = async () => {
    const values = await suppressForm.validateFields();
    await runAction(
      () => axiosInstance.post(`/api/admin/newsletters/suppression-list/${encodeURIComponent(values.email)}/suppress`),
      "Email suppressed",
      () => {
        setSuppressOpen(false);
        suppressForm.resetFields();
        suppressionQuery.refetch();
      },
    );
  };

  const sendTest = async () => {
    const values = await testForm.validateFields();
    await runAction(
      () => axiosInstance.post(`/api/admin/newsletters/${testTarget.id}/send-test`, { email: values.email }),
      "Test email requested",
      () => {
        setTestTarget(null);
        testForm.resetFields();
      },
    );
  };

  const campaignTotal = campaignMeta.total ?? campaigns.length;
  const subscriberTotal = subscriberMeta.total ?? subscribers.length;

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>Newsletters</Title>
          <Text type="secondary">Campaigns, subscribers, segmentation, templates, analytics and delivery health.</Text>
        </Col>
        <Col>
          <Space wrap>
            <Button icon={<ReloadOutlined />} onClick={refreshAll}>Refresh</Button>
            <Button icon={<UserAddOutlined />} onClick={() => setSubscriberOpen(true)}>Add Subscriber</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>Create Campaign</Button>
          </Space>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title="Campaigns" value={campaignTotal} prefix={<MailOutlined />} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title="Subscribers" value={subscriberTotal} prefix={<UserAddOutlined />} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title="Average Open Rate" value={analytics.avg_open_rate ?? 0} suffix="%" prefix={<BarChartOutlined />} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title="Delivery Rate" value={diagnostics.delivery_rate ?? 0} suffix="%" /></Card>
        </Col>
      </Row>

      <Tabs
        items={[
          {
            key: "campaigns",
            label: "Campaigns",
            children: (
              <Card>
                <Table
                  loading={campaignsQuery.isLoading}
                  dataSource={campaigns}
                  rowKey={(r: any) => r.id}
                  size="small"
                  pagination={{
                    current: campaignPage,
                    pageSize: campaignPageSize,
                    total: campaignTotal,
                    showSizeChanger: true,
                    showTotal: (t) => `${t} total`,
                    onChange: (p, ps) => { setCampaignPage(p); setCampaignPageSize(ps); },
                  }}
                  locale={{ emptyText: <Empty description="No newsletter campaigns yet" /> }}
                >
                  <Table.Column title="Subject" dataIndex="subject" ellipsis />
                  <Table.Column
                    title="Status"
                    dataIndex="status"
                    width={120}
                    render={(status: string) => {
                      const color: Record<string, string> = { sent: "green", draft: "default", scheduled: "blue", sending: "cyan", failed: "red" };
                      const normalized = lowerStatus(status);
                      return <Tag color={color[normalized] || "default"}>{status || "--"}</Tag>;
                    }}
                  />
                  <Table.Column title="Recipients" dataIndex="recipient_count" width={110} render={(v: number) => v ?? 0} />
                  <Table.Column title="Opens" dataIndex="open_count" width={90} render={(v: number) => v ?? 0} />
                  <Table.Column title="Clicks" dataIndex="click_count" width={90} render={(v: number) => v ?? 0} />
                  <Table.Column title="Scheduled" dataIndex="scheduled_at" width={160} render={displayDate} />
                  <Table.Column title="Sent" dataIndex="sent_at" width={160} render={displayDate} />
                  <Table.Column
                    title="Actions"
                    width={330}
                    render={(_: any, record: any) => {
                      const status = lowerStatus(record.status);
                      return (
                        <Space wrap>
                          <Button size="small" icon={<EyeOutlined />} onClick={() => viewCampaign(record)}>Inspect</Button>
                          <Button
                            size="small"
                            icon={<SendOutlined />}
                            disabled={!["draft", "scheduled"].includes(status)}
                            onClick={() => confirmCampaignAction(
                              "Send newsletter",
                              "Queue this campaign for delivery now?",
                              () => runAction(
                                () => axiosInstance.post(`/api/admin/newsletters/${record.id}/send`),
                                "Newsletter queued for sending",
                                campaignsQuery.refetch,
                              ),
                              "Send Now",
                            )}
                          >
                            Send
                          </Button>
                          <Button
                            size="small"
                            icon={<CopyOutlined />}
                            onClick={() => runAction(
                              () => axiosInstance.post(`/api/admin/newsletters/${record.id}/duplicate`),
                              "Newsletter duplicated",
                              campaignsQuery.refetch,
                            )}
                          >
                            Duplicate
                          </Button>
                          <Button size="small" onClick={() => setTestTarget(record)}>Test</Button>
                          <Button
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => confirmCampaignAction(
                              "Delete newsletter",
                              "Delete this campaign? Drafts and analytics for it will be removed.",
                              () => runAction(
                                () => axiosInstance.delete(`/api/admin/newsletters/${record.id}`),
                                "Newsletter deleted",
                                campaignsQuery.refetch,
                              ),
                              "Delete",
                              true,
                            )}
                          />
                        </Space>
                      );
                    }}
                  />
                </Table>
              </Card>
            ),
          },
          {
            key: "subscribers",
            label: "Subscribers",
            children: (
              <Card
                extra={(
                  <Space wrap>
                    <Button icon={<SyncOutlined />} onClick={() => runAction(() => axiosInstance.post("/api/admin/newsletters/subscribers/sync"), "Subscriber sync requested", subscribersQuery.refetch)}>Sync Members</Button>
                    <Button icon={<DownloadOutlined />} onClick={() => runAction(() => axiosInstance.get("/api/admin/newsletters/subscribers/export"), "Subscriber export requested")}>Export</Button>
                    <Button onClick={() => runAction(() => axiosInstance.post("/api/admin/newsletters/subscribers/import"), "Subscriber import endpoint reached", subscribersQuery.refetch)}>Import</Button>
                  </Space>
                )}
              >
                <Table
                  loading={subscribersQuery.isLoading}
                  dataSource={subscribers}
                  rowKey={(r: any) => r.id || r.email}
                  size="small"
                  pagination={{
                    current: subscriberPage,
                    pageSize: subscriberPageSize,
                    total: subscriberTotal,
                    showSizeChanger: true,
                    showTotal: (t) => `${t} total`,
                    onChange: (p, ps) => { setSubscriberPage(p); setSubscriberPageSize(ps); },
                  }}
                  locale={{ emptyText: <Empty description="No subscribers found" /> }}
                >
                  <Table.Column title="Email" dataIndex="email" ellipsis />
                  <Table.Column title="User ID" dataIndex="userId" width={90} render={(v: number, r: any) => v ?? r.user_id ?? "--"} />
                  <Table.Column title="Source" dataIndex="source" width={120} render={(v: string) => v || "--"} />
                  <Table.Column
                    title="Status"
                    dataIndex="is_subscribed"
                    width={120}
                    render={(active: boolean, r: any) => (active ?? r.isSubscribed) ? <Tag color="green">Active</Tag> : <Tag color="red">Unsubscribed</Tag>}
                  />
                  <Table.Column title="Subscribed" dataIndex="subscribed_at" width={160} render={(v: string, r: any) => displayDate(v || r.subscribedAt)} />
                  <Table.Column
                    title="Actions"
                    width={120}
                    render={(_: any, record: any) => (
                      <Button
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => confirmCampaignAction(
                          "Remove subscriber",
                          `Unsubscribe ${record.email}?`,
                          () => runAction(
                            () => axiosInstance.delete(`/api/admin/newsletters/subscribers/${record.id}`),
                            "Subscriber removed",
                            subscribersQuery.refetch,
                          ),
                          "Remove",
                          true,
                        )}
                      >
                        Remove
                      </Button>
                    )}
                  />
                </Table>
              </Card>
            ),
          },
          {
            key: "segments",
            label: "Segments",
            children: (
              <Card extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setSegmentOpen(true)}>Create Segment</Button>}>
                <Table loading={segmentsQuery.isLoading} dataSource={segments} rowKey={(r: any) => r.id || r.name} size="small" locale={{ emptyText: <Empty description="No newsletter segments configured" /> }}>
                  <Table.Column title="Name" dataIndex="name" ellipsis />
                  <Table.Column title="Subscribers" dataIndex="subscriber_count" width={130} render={(v: number) => v ?? 0} />
                  <Table.Column title="Conditions" dataIndex="conditions" render={(v: any) => <Text code>{JSON.stringify(v ?? [])}</Text>} />
                  <Table.Column
                    title="Actions"
                    width={190}
                    render={(_: any, record: any) => (
                      <Space>
                        <Button size="small" onClick={() => runAction(() => axiosInstance.post("/api/admin/newsletters/segments/preview", record), "Segment preview requested")}>Preview</Button>
                        <Button size="small" danger onClick={() => runAction(() => axiosInstance.delete(`/api/admin/newsletters/segments/${record.id}`), "Segment deleted", segmentsQuery.refetch)}>Delete</Button>
                      </Space>
                    )}
                  />
                </Table>
              </Card>
            ),
          },
          {
            key: "templates",
            label: "Templates",
            children: (
              <Card extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setTemplateOpen(true)}>Create Template</Button>}>
                <Table loading={templatesQuery.isLoading} dataSource={templates} rowKey={(r: any) => r.id || r.name} size="small" locale={{ emptyText: <Empty description="No templates configured" /> }}>
                  <Table.Column title="Name" dataIndex="name" ellipsis />
                  <Table.Column title="Subject" dataIndex="subject" ellipsis render={(v: string) => v || "--"} />
                  <Table.Column title="Created" dataIndex="created_at" width={160} render={displayDate} />
                  <Table.Column
                    title="Actions"
                    width={260}
                    render={(_: any, record: any) => (
                      <Space wrap>
                        <Button size="small" icon={<EyeOutlined />} onClick={() => runAction(() => axiosInstance.get(`/api/admin/newsletters/templates/${record.id}/preview`), "Template preview loaded")}>Preview</Button>
                        <Button size="small" icon={<CopyOutlined />} onClick={() => runAction(() => axiosInstance.post(`/api/admin/newsletters/templates/${record.id}/duplicate`), "Template duplicated", templatesQuery.refetch)}>Duplicate</Button>
                        <Button size="small" danger icon={<DeleteOutlined />} onClick={() => runAction(() => axiosInstance.delete(`/api/admin/newsletters/templates/${record.id}`), "Template deleted", templatesQuery.refetch)} />
                      </Space>
                    )}
                  />
                </Table>
              </Card>
            ),
          },
          {
            key: "analytics",
            label: "Analytics",
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                  <Card title="Overall Performance" loading={analyticsQuery.isLoading}>
                    <Descriptions column={1} size="small">
                      <Descriptions.Item label="Total Sent">{analytics.total_sent ?? 0}</Descriptions.Item>
                      <Descriptions.Item label="Total Opens">{analytics.total_opens ?? 0}</Descriptions.Item>
                      <Descriptions.Item label="Total Clicks">{analytics.total_clicks ?? 0}</Descriptions.Item>
                      <Descriptions.Item label="Average Open Rate">{analytics.avg_open_rate ?? 0}%</Descriptions.Item>
                      <Descriptions.Item label="Average Click Rate">{analytics.avg_click_rate ?? 0}%</Descriptions.Item>
                    </Descriptions>
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card title="Send-Time Optimizer" loading={optimizerQuery.isLoading}>
                    <Descriptions column={1} size="small">
                      <Descriptions.Item label="Best Day">{optimizer.best_day ?? "--"}</Descriptions.Item>
                      <Descriptions.Item label="Best Hour">{optimizer.best_hour ?? "--"}</Descriptions.Item>
                      <Descriptions.Item label="Timezone">{optimizer.timezone ?? "--"}</Descriptions.Item>
                      <Descriptions.Item label="Confidence">{optimizer.confidence ?? 0}</Descriptions.Item>
                    </Descriptions>
                  </Card>
                </Col>
                <Col xs={24}>
                  <Card title="Bounces" extra={<Button onClick={() => bouncesQuery.refetch()} icon={<ReloadOutlined />}>Refresh</Button>}>
                    <Table loading={bouncesQuery.isLoading} dataSource={bounces} rowKey={(r: any) => r.id || r.email || JSON.stringify(r)} size="small" locale={{ emptyText: <Empty description="No bounced emails" /> }}>
                      <Table.Column title="Email" dataIndex="email" ellipsis render={(v: string) => v || "--"} />
                      <Table.Column title="Reason" dataIndex="reason" ellipsis render={(v: string) => v || "--"} />
                      <Table.Column title="Date" dataIndex="created_at" width={160} render={displayDate} />
                    </Table>
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: "delivery",
            label: "Delivery Health",
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                  <Card title="Diagnostics" loading={diagnosticsQuery.isLoading}>
                    <Descriptions column={1} size="small">
                      <Descriptions.Item label="Provider">{diagnostics.email_provider ?? "--"}</Descriptions.Item>
                      <Descriptions.Item label="Delivery Rate">{diagnostics.delivery_rate ?? 0}%</Descriptions.Item>
                      <Descriptions.Item label="Issues">{Array.isArray(diagnostics.issues) && diagnostics.issues.length > 0 ? diagnostics.issues.join(", ") : "None reported"}</Descriptions.Item>
                    </Descriptions>
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card title="Suppression List" extra={<Button onClick={() => setSuppressOpen(true)}>Suppress Email</Button>}>
                    <Table loading={suppressionQuery.isLoading} dataSource={suppressed} rowKey={(r: any) => r.id || r.email || JSON.stringify(r)} size="small" pagination={false} locale={{ emptyText: <Empty description="No suppressed emails" /> }}>
                      <Table.Column title="Email" dataIndex="email" ellipsis render={(v: string) => v || "--"} />
                      <Table.Column title="Reason" dataIndex="reason" ellipsis render={(v: string) => v || "--"} />
                      <Table.Column
                        title="Actions"
                        width={130}
                        render={(_: any, record: any) => record.email ? (
                          <Button size="small" onClick={() => runAction(() => axiosInstance.post(`/api/admin/newsletters/suppression-list/${encodeURIComponent(record.email)}/unsuppress`), "Email unsuppressed", suppressionQuery.refetch)}>Unsuppress</Button>
                        ) : "--"}
                      />
                    </Table>
                  </Card>
                </Col>
              </Row>
            ),
          },
        ]}
      />

      <Modal title="Create Newsletter Campaign" open={createOpen} onOk={createCampaign} confirmLoading={busy} onCancel={() => setCreateOpen(false)} width={720}>
        <Form form={campaignForm} layout="vertical">
          <Form.Item name="subject" label="Subject" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="content_html" label="HTML Content" rules={[{ required: true }]}>
            <TextArea rows={8} />
          </Form.Item>
          <Form.Item name="content_text" label="Plain Text Content">
            <TextArea rows={4} />
          </Form.Item>
          <Form.Item name="scheduled_at" label="Scheduled At">
            <Input type="datetime-local" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="Add Subscriber" open={subscriberOpen} onOk={addSubscriber} confirmLoading={busy} onCancel={() => setSubscriberOpen(false)}>
        <Form form={subscriberForm} layout="vertical">
          <Form.Item name="email" label="Email" rules={[{ required: true, type: "email" }]}>
            <Input />
          </Form.Item>
          <Form.Item name="user_id" label="Linked User ID">
            <Input type="number" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="Create Segment" open={segmentOpen} onOk={createSegment} confirmLoading={busy} onCancel={() => setSegmentOpen(false)} width={640}>
        <Alert type="info" showIcon style={{ marginBottom: 12 }} message="Conditions are stored as JSON so advanced V1-compatible segment rules can be preserved." />
        <Form form={segmentForm} layout="vertical" initialValues={{ conditions: "[]" }}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="conditions" label="Conditions JSON">
            <TextArea rows={6} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="Create Template" open={templateOpen} onOk={createTemplate} confirmLoading={busy} onCancel={() => setTemplateOpen(false)} width={720}>
        <Form form={templateForm} layout="vertical">
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="subject" label="Default Subject">
            <Input />
          </Form.Item>
          <Form.Item name="content_html" label="HTML Content" rules={[{ required: true }]}>
            <TextArea rows={8} />
          </Form.Item>
          <Form.Item name="content_text" label="Plain Text Content">
            <TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="Suppress Email" open={suppressOpen} onOk={suppressEmail} confirmLoading={busy} onCancel={() => setSuppressOpen(false)}>
        <Form form={suppressForm} layout="vertical">
          <Form.Item name="email" label="Email" rules={[{ required: true, type: "email" }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title={`Send Test${testTarget?.subject ? `: ${testTarget.subject}` : ""}`} open={!!testTarget} onOk={sendTest} confirmLoading={busy} onCancel={() => setTestTarget(null)}>
        <Form form={testForm} layout="vertical">
          <Form.Item name="email" label="Test Recipient" rules={[{ required: true, type: "email" }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title={insight?.campaign?.subject || "Campaign Insights"} open={!!insight} onCancel={() => setInsight(null)} footer={null} width={860}>
        {insight && (
          <Tabs
            items={[
              {
                key: "stats",
                label: "Stats",
                children: (
                  <Descriptions column={2} bordered size="small">
                    <Descriptions.Item label="Sent">{insight.stats.sent ?? 0}</Descriptions.Item>
                    <Descriptions.Item label="Opens">{insight.stats.opens ?? 0}</Descriptions.Item>
                    <Descriptions.Item label="Clicks">{insight.stats.clicks ?? 0}</Descriptions.Item>
                    <Descriptions.Item label="Bounces">{insight.stats.bounces ?? 0}</Descriptions.Item>
                    <Descriptions.Item label="Unsubscribes">{insight.stats.unsubscribes ?? 0}</Descriptions.Item>
                    <Descriptions.Item label="Open Rate">{insight.stats.open_rate ?? 0}%</Descriptions.Item>
                    <Descriptions.Item label="Click Rate">{insight.stats.click_rate ?? 0}%</Descriptions.Item>
                  </Descriptions>
                ),
              },
              {
                key: "activity",
                label: "Activity",
                children: <Table dataSource={insight.activity} rowKey={(r: any) => r.id || JSON.stringify(r)} size="small" pagination={false} locale={{ emptyText: <Empty description="No activity recorded" /> }} />,
              },
              {
                key: "audience",
                label: "Audience",
                children: (
                  <Row gutter={[16, 16]}>
                    <Col xs={24} lg={12}><Card size="small" title="Openers"><Table dataSource={insight.openers} rowKey={(r: any) => r.id || r.email || JSON.stringify(r)} size="small" pagination={false} locale={{ emptyText: <Empty description="No openers" /> }} /></Card></Col>
                    <Col xs={24} lg={12}><Card size="small" title="Clickers"><Table dataSource={insight.clickers} rowKey={(r: any) => r.id || r.email || JSON.stringify(r)} size="small" pagination={false} locale={{ emptyText: <Empty description="No clickers" /> }} /></Card></Col>
                  </Row>
                ),
              },
              {
                key: "clients",
                label: "Email Clients",
                children: <Table dataSource={insight.emailClients} rowKey={(r: any) => r.id || r.client || JSON.stringify(r)} size="small" pagination={false} locale={{ emptyText: <Empty description="No email client data" /> }} />,
              },
            ]}
          />
        )}
      </Modal>
    </div>
  );
};
