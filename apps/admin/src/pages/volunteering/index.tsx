// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useState } from "react";
import { useCustom } from "@refinedev/core";
import { Button, Card, Col, Descriptions, Empty, Form, Input, Modal, Row, Space, Statistic, Table, Tabs, Tag, Typography, message } from "antd";
import { CheckOutlined, PlusOutlined, ReloadOutlined, SafetyOutlined } from "@ant-design/icons";
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

const dataFrom = (payload: any) => payload?.data?.data ?? payload?.data ?? {};

export const VolunteeringAdminPage = () => {
  const [quickOpen, setQuickOpen] = useState<"hours" | "expense" | "training" | "incident" | null>(null);
  const [busy, setBusy] = useState(false);
  const [quickForm] = Form.useForm();

  const overviewQuery = useCustom({ url: "/api/admin/volunteering", method: "get", queryOptions: { queryKey: ["admin-vol-overview"] } });
  const approvalsQuery = useCustom({ url: "/api/admin/volunteering/approvals", method: "get", queryOptions: { queryKey: ["admin-vol-approvals"] } });
  const expensesQuery = useCustom({ url: "/api/admin/volunteering/expenses", method: "get", queryOptions: { queryKey: ["admin-vol-expenses"] } });
  const trainingQuery = useCustom({ url: "/api/admin/volunteering/training", method: "get", queryOptions: { queryKey: ["admin-vol-training"] } });
  const safeguardingQuery = useCustom({ url: "/api/admin/volunteering/safeguarding", method: "get", queryOptions: { queryKey: ["admin-vol-safeguarding"] } });
  const configQuery = useCustom({ url: "/api/admin/volunteering/config", method: "get", queryOptions: { queryKey: ["admin-vol-config"] } });
  const consentsQuery = useCustom({ url: "/api/admin/volunteering/consents", method: "get", queryOptions: { queryKey: ["admin-vol-consents"] } });
  const givingDaysQuery = useCustom({ url: "/api/admin/volunteering/giving-days", method: "get", queryOptions: { queryKey: ["admin-vol-giving-days"] } });
  const hoursQuery = useCustom({ url: "/api/admin/volunteering/hours", method: "get", queryOptions: { queryKey: ["admin-vol-hours"] } });
  const organizationsQuery = useCustom({ url: "/api/admin/volunteering/organizations", method: "get", queryOptions: { queryKey: ["admin-vol-organizations"] } });
  const projectsQuery = useCustom({ url: "/api/admin/volunteering/projects", method: "get", queryOptions: { queryKey: ["admin-vol-projects"] } });

  const overview = dataFrom(overviewQuery.data);
  const approvals = rowsFrom(approvalsQuery.data);
  const expenses = rowsFrom(expensesQuery.data);
  const training = rowsFrom(trainingQuery.data);
  const safeguarding = rowsFrom(safeguardingQuery.data);
  const config = dataFrom(configQuery.data);
  const consents = rowsFrom(consentsQuery.data);
  const givingDays = rowsFrom(givingDaysQuery.data);
  const hours = rowsFrom(hoursQuery.data);
  const organizations = rowsFrom(organizationsQuery.data);
  const projects = rowsFrom(projectsQuery.data);

  const refreshAll = () => {
    [
      overviewQuery, approvalsQuery, expensesQuery, trainingQuery, safeguardingQuery, configQuery,
      consentsQuery, givingDaysQuery, hoursQuery, organizationsQuery, projectsQuery,
    ].forEach((query) => query.refetch());
  };

  const runAction = async (action: () => Promise<any>, success: string, refresh?: () => void) => {
    setBusy(true);
    try {
      await action();
      message.success(success);
      refresh?.();
    } catch (err: unknown) {
      message.error(getErrorMessage(err, "Volunteering action failed"));
    } finally {
      setBusy(false);
    }
  };

  const submitQuick = async () => {
    if (!quickOpen) return;
    const values = await quickForm.validateFields();
    const paths = {
      hours: "/api/volunteering/hours",
      expense: "/api/volunteering/expenses",
      training: "/api/volunteering/training",
      incident: "/api/volunteering/incidents",
    };
    await runAction(() => axiosInstance.post(paths[quickOpen], values), `${quickOpen} recorded`, () => {
      setQuickOpen(null);
      quickForm.resetFields();
      hoursQuery.refetch();
      expensesQuery.refetch();
      trainingQuery.refetch();
      safeguardingQuery.refetch();
    });
  };

  const simpleTable = (loading: boolean, rows: any[], empty: string) => (
    <Table loading={loading} dataSource={rows} rowKey={(r: any) => r.id || JSON.stringify(r)} size="small" locale={{ emptyText: <Empty description={empty} /> }} />
  );

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>Volunteering</Title>
          <Text type="secondary">Volunteer approvals, hours, expenses, training, safeguarding, consents, projects and giving days.</Text>
        </Col>
        <Col>
          <Space wrap>
            <Button icon={<ReloadOutlined />} onClick={refreshAll}>Refresh</Button>
            <Button icon={<PlusOutlined />} onClick={() => setQuickOpen("hours")}>Log Hours</Button>
            <Button icon={<PlusOutlined />} onClick={() => setQuickOpen("expense")}>Expense</Button>
            <Button type="primary" icon={<SafetyOutlined />} onClick={() => setQuickOpen("incident")}>Incident</Button>
          </Space>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}><Card><Statistic title="Volunteers" value={overview.total_volunteers ?? 0} /></Card></Col>
        <Col xs={24} sm={12} lg={6}><Card><Statistic title="Opportunities" value={overview.active_opportunities ?? 0} /></Card></Col>
        <Col xs={24} sm={12} lg={6}><Card><Statistic title="Pending Approvals" value={overview.pending_approvals ?? approvals.length} /></Card></Col>
        <Col xs={24} sm={12} lg={6}><Card><Statistic title="Total Hours" value={overview.total_hours ?? 0} /></Card></Col>
      </Row>

      <Tabs
        items={[
          {
            key: "approvals",
            label: "Approvals",
            children: (
              <Card>
                <Table loading={approvalsQuery.isLoading} dataSource={approvals} rowKey={(r: any) => r.id || JSON.stringify(r)} size="small" locale={{ emptyText: <Empty description="No pending volunteer approvals" /> }}>
                  <Table.Column title="Name" dataIndex="name" render={(v: string, r: any) => v || r.user_name || r.title || "--"} />
                  <Table.Column title="Status" dataIndex="status" render={(v: string) => <Tag>{v || "pending"}</Tag>} />
                  <Table.Column title="Submitted" dataIndex="created_at" />
                  <Table.Column
                    title="Actions"
                    width={220}
                    render={(_: any, record: any) => (
                      <Space>
                        <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => runAction(() => axiosInstance.post(`/api/admin/volunteering/approvals/${record.id}/approve`), "Volunteer approved", approvalsQuery.refetch)}>Approve</Button>
                        <Button size="small" danger onClick={() => runAction(() => axiosInstance.post(`/api/admin/volunteering/approvals/${record.id}/decline`), "Volunteer declined", approvalsQuery.refetch)}>Decline</Button>
                      </Space>
                    )}
                  />
                </Table>
              </Card>
            ),
          },
          { key: "hours", label: "Hours", children: <Card>{simpleTable(hoursQuery.isLoading, hours, "No volunteer hours returned")}</Card> },
          { key: "expenses", label: "Expenses", children: <Card>{simpleTable(expensesQuery.isLoading, expenses, "No volunteer expenses returned")}</Card> },
          { key: "training", label: "Training", children: <Card extra={<Button onClick={() => setQuickOpen("training")}>Record Training</Button>}>{simpleTable(trainingQuery.isLoading, training, "No volunteer training rows returned")}</Card> },
          { key: "safeguarding", label: "Safeguarding", children: <Card>{simpleTable(safeguardingQuery.isLoading, safeguarding, "No volunteer safeguarding rows returned")}</Card> },
          {
            key: "projects",
            label: "Projects & Orgs",
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}><Card title="Organisations">{simpleTable(organizationsQuery.isLoading, organizations, "No volunteer organisations returned")}</Card></Col>
                <Col xs={24} lg={12}><Card title="Projects">{simpleTable(projectsQuery.isLoading, projects, "No volunteer projects returned")}</Card></Col>
                <Col xs={24}><Card title="Giving Days">{simpleTable(givingDaysQuery.isLoading, givingDays, "No giving days returned")}</Card></Col>
              </Row>
            ),
          },
          {
            key: "settings",
            label: "Config & Consents",
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                  <Card title="Volunteer Config" loading={configQuery.isLoading}>
                    <Descriptions column={1} size="small">
                      {Object.entries(config).map(([key, value]) => <Descriptions.Item key={key} label={key}>{String(value ?? "--")}</Descriptions.Item>)}
                    </Descriptions>
                  </Card>
                </Col>
                <Col xs={24} lg={12}><Card title="Consents">{simpleTable(consentsQuery.isLoading, consents, "No volunteer consents returned")}</Card></Col>
              </Row>
            ),
          },
        ]}
      />

      <Modal title={`Record ${quickOpen || ""}`} open={!!quickOpen} onOk={submitQuick} confirmLoading={busy} onCancel={() => setQuickOpen(null)} width={640}>
        <Form form={quickForm} layout="vertical">
          <Form.Item name="user_id" label="User ID"><Input type="number" /></Form.Item>
          <Form.Item name="title" label="Title"><Input /></Form.Item>
          <Form.Item name="amount" label="Amount / Hours"><Input type="number" step="0.25" /></Form.Item>
          <Form.Item name="description" label="Description"><TextArea rows={4} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
