// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useState } from "react";
import { useCustom } from "@refinedev/core";
import { Alert, Button, Card, Col, Form, Input, Modal, Row, Space, Statistic, Table, Tabs, Tag, Typography, message } from "antd";
import { DollarOutlined, PlusOutlined, ReloadOutlined, SearchOutlined, WarningOutlined } from "@ant-design/icons";
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
  payload?.data?.total ?? payload?.data?.meta?.total ?? payload?.meta?.total ?? payload?.data?.pagination?.total ?? fallback;

const person = (record: any) =>
  record?.name || record?.user_name || record?.email || [record?.firstName ?? record?.first_name, record?.lastName ?? record?.last_name].filter(Boolean).join(" ") || "--";

export const TimebankingPage = () => {
  const [grantOpen, setGrantOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [grantForm] = Form.useForm();
  const [adjustForm] = Form.useForm();

  const statsQuery = useCustom({
    url: "/api/admin/timebanking/stats",
    method: "get",
    queryOptions: { queryKey: ["admin-timebanking-stats"] },
  });

  const alertsQuery = useCustom({
    url: "/api/admin/timebanking/alerts",
    method: "get",
    queryOptions: { queryKey: ["admin-timebanking-alerts"] },
  });

  const orgWalletsQuery = useCustom({
    url: "/api/admin/timebanking/org-wallets",
    method: "get",
    queryOptions: { queryKey: ["admin-timebanking-org-wallets"] },
  });

  const grantsQuery = useCustom({
    url: "/api/admin/wallet/grants",
    method: "get",
    queryOptions: { queryKey: ["admin-wallet-grants"] },
  });

  const userReportQuery = useCustom({
    url: "/api/admin/timebanking/user-report",
    method: "get",
    config: { query: userSearch ? { search: userSearch } : undefined },
    queryOptions: { queryKey: ["admin-timebanking-user-report", userSearch] },
  });

  const stats = statsQuery.data?.data ?? {};
  const alerts = rowsFrom(alertsQuery.data);
  const orgWallets = rowsFrom(orgWalletsQuery.data);
  const grants = rowsFrom(grantsQuery.data);
  const userReports = rowsFrom(userReportQuery.data);

  const refreshAll = () => {
    statsQuery.refetch();
    alertsQuery.refetch();
    orgWalletsQuery.refetch();
    grantsQuery.refetch();
    userReportQuery.refetch();
  };

  const runAction = async (action: () => Promise<any>, success: string, after?: () => void) => {
    setBusy(true);
    try {
      await action();
      message.success(success);
      after?.();
    } catch (err: unknown) {
      message.error(getErrorMessage(err, "Timebanking action failed"));
    } finally {
      setBusy(false);
    }
  };

  const submitGrant = async () => {
    const values = await grantForm.validateFields();
    await runAction(
      () => axiosInstance.post("/api/admin/wallet/grant", {
        user_id: Number(values.user_id),
        amount: Number(values.amount),
        reason: values.reason,
      }),
      "Credits granted",
      () => {
        setGrantOpen(false);
        grantForm.resetFields();
        grantsQuery.refetch();
        statsQuery.refetch();
      },
    );
  };

  const submitAdjustment = async () => {
    const values = await adjustForm.validateFields();
    await runAction(
      () => axiosInstance.post("/api/admin/timebanking/adjust-balance", {
        user_id: Number(values.user_id),
        amount: Number(values.amount),
        reason: values.reason,
      }),
      "Balance adjusted",
      () => {
        setAdjustOpen(false);
        adjustForm.resetFields();
        statsQuery.refetch();
        userReportQuery.refetch();
      },
    );
  };

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>Timebanking</Title>
          <Text type="secondary">Credit flow, fraud alerts, organisation wallets, member balances and starting-credit grants.</Text>
        </Col>
        <Col>
          <Space wrap>
            <Button icon={<ReloadOutlined />} onClick={refreshAll}>Refresh</Button>
            <Button icon={<DollarOutlined />} onClick={() => setAdjustOpen(true)}>Adjust Balance</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setGrantOpen(true)}>Grant Credits</Button>
          </Space>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}><Card><Statistic title="Total Hours" value={stats.total_hours ?? 0} /></Card></Col>
        <Col xs={24} sm={12} lg={6}><Card><Statistic title="Transactions" value={stats.total_transactions ?? 0} /></Card></Col>
        <Col xs={24} sm={12} lg={6}><Card><Statistic title="Active Users" value={stats.active_users ?? 0} /></Card></Col>
        <Col xs={24} sm={12} lg={6}><Card><Statistic title="Average Balance" value={stats.avg_balance ?? 0} precision={2} /></Card></Col>
      </Row>

      <Tabs
        items={[
          {
            key: "alerts",
            label: "Fraud Alerts",
            children: (
              <Card>
                <Table loading={alertsQuery.isLoading} dataSource={alerts} rowKey={(r: any) => r.id || JSON.stringify(r)} size="small" locale={{ emptyText: "No fraud alerts" }}>
                  <Table.Column title="User" render={(_: any, record: any) => person(record)} />
                  <Table.Column title="Type" dataIndex="alert_type" render={(v: string) => v || "--"} />
                  <Table.Column title="Severity" dataIndex="severity" render={(v: string) => <Tag color={v === "critical" || v === "high" ? "red" : "orange"}>{v || "unknown"}</Tag>} />
                  <Table.Column title="Status" dataIndex="status" render={(v: string) => <Tag>{v || "new"}</Tag>} />
                  <Table.Column title="Description" dataIndex="description" ellipsis />
                  <Table.Column
                    title="Actions"
                    width={240}
                    render={(_: any, record: any) => (
                      <Space wrap>
                        {["reviewing", "resolved", "dismissed"].map((status) => (
                          <Button key={status} size="small" onClick={() => runAction(() => axiosInstance.put(`/api/admin/timebanking/alerts/${record.id}`, { status }), `Alert marked ${status}`, alertsQuery.refetch)}>
                            {status}
                          </Button>
                        ))}
                      </Space>
                    )}
                  />
                </Table>
              </Card>
            ),
          },
          {
            key: "grants",
            label: "Starting Balances",
            children: (
              <Card>
                <Alert type="info" showIcon icon={<WarningOutlined />} style={{ marginBottom: 16 }} message="Use grants for initial onboarding credits. Use adjustments for corrections, reversals or broker/admin interventions." />
                <Table loading={grantsQuery.isLoading} dataSource={grants} rowKey={(r: any) => r.id || JSON.stringify(r)} size="small" locale={{ emptyText: "No grant history returned" }}>
                  <Table.Column title="User" render={(_: any, record: any) => person(record)} />
                  <Table.Column title="Amount" dataIndex="amount" />
                  <Table.Column title="Reason" dataIndex="reason" ellipsis />
                  <Table.Column title="Granted By" dataIndex="granted_by" render={(v: any) => person(v)} />
                  <Table.Column title="Created" dataIndex="created_at" />
                </Table>
              </Card>
            ),
          },
          {
            key: "org-wallets",
            label: "Organisation Wallets",
            children: (
              <Card>
                <Table loading={orgWalletsQuery.isLoading} dataSource={orgWallets} rowKey={(r: any) => r.id || r.organisation_id || JSON.stringify(r)} size="small" locale={{ emptyText: "No organisation wallets returned" }}>
                  <Table.Column title="Organisation" render={(_: any, record: any) => record.organisation_name || record.name || record.organisation_id || "--"} />
                  <Table.Column title="Balance" dataIndex="balance" />
                  <Table.Column title="Transactions" dataIndex="transaction_count" />
                  <Table.Column title="Updated" dataIndex="updated_at" />
                </Table>
              </Card>
            ),
          },
          {
            key: "members",
            label: "Member Reports",
            children: (
              <Card
                extra={(
                  <Space>
                    <Input allowClear prefix={<SearchOutlined />} placeholder="Search member" value={userSearch} onChange={(event) => setUserSearch(event.target.value)} onPressEnter={() => userReportQuery.refetch()} />
                    <Button onClick={() => userReportQuery.refetch()}>Search</Button>
                  </Space>
                )}
              >
                <Table loading={userReportQuery.isLoading} dataSource={userReports} rowKey={(r: any) => r.id || r.user_id || JSON.stringify(r)} size="small" locale={{ emptyText: "No member report rows returned" }}>
                  <Table.Column title="Member" render={(_: any, record: any) => person(record)} />
                  <Table.Column title="Balance" dataIndex="balance" />
                  <Table.Column title="Earned" dataIndex="earned" />
                  <Table.Column title="Spent" dataIndex="spent" />
                  <Table.Column title="Transactions" dataIndex="transaction_count" />
                </Table>
              </Card>
            ),
          },
        ]}
      />

      <Modal title="Grant Starting Credits" open={grantOpen} onOk={submitGrant} confirmLoading={busy} onCancel={() => setGrantOpen(false)}>
        <Form form={grantForm} layout="vertical">
          <Form.Item name="user_id" label="User ID" rules={[{ required: true }]}>
            <Input type="number" />
          </Form.Item>
          <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
            <Input type="number" min={0} step="0.25" />
          </Form.Item>
          <Form.Item name="reason" label="Reason" rules={[{ required: true }]}>
            <TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="Adjust Balance" open={adjustOpen} onOk={submitAdjustment} confirmLoading={busy} onCancel={() => setAdjustOpen(false)}>
        <Form form={adjustForm} layout="vertical">
          <Form.Item name="user_id" label="User ID" rules={[{ required: true }]}>
            <Input type="number" />
          </Form.Item>
          <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
            <Input type="number" step="0.25" />
          </Form.Item>
          <Form.Item name="reason" label="Reason" rules={[{ required: true }]}>
            <TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
