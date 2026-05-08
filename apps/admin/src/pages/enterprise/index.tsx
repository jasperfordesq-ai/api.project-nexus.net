// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useState } from "react";
import { useCustom } from "@refinedev/core";
import { Button, Card, Col, Descriptions, Empty, Form, Input, Modal, Row, Space, Statistic, Table, Tabs, Tag, Typography, message } from "antd";
import { DeleteOutlined, PlusOutlined, ReloadOutlined, SafetyCertificateOutlined, SettingOutlined } from "@ant-design/icons";
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

const dataFrom = (payload: any) => payload?.data?.data ?? payload?.data ?? {};
const scalarEntries = (value: any) => Object.entries(value || {}).filter(([, item]) => item === null || typeof item !== "object");

export const EnterprisePage = () => {
  const [roleOpen, setRoleOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [roleForm] = Form.useForm();
  const [configForm] = Form.useForm();

  const dashboardQuery = useCustom({ url: "/api/admin/enterprise/dashboard", method: "get", queryOptions: { queryKey: ["enterprise-dashboard"] } });
  const complianceQuery = useCustom({ url: "/api/admin/enterprise/compliance", method: "get", queryOptions: { queryKey: ["enterprise-compliance"] } });
  const governanceQuery = useCustom({ url: "/api/admin/enterprise/governance", method: "get", queryOptions: { queryKey: ["enterprise-governance"] } });
  const securityQuery = useCustom({ url: "/api/admin/enterprise/security-posture", method: "get", queryOptions: { queryKey: ["enterprise-security"] } });
  const rolesQuery = useCustom({ url: "/api/admin/enterprise/roles", method: "get", queryOptions: { queryKey: ["enterprise-roles"] } });
  const permissionsQuery = useCustom({ url: "/api/admin/enterprise/permissions", method: "get", queryOptions: { queryKey: ["enterprise-permissions"] } });
  const monitoringQuery = useCustom({ url: "/api/admin/enterprise/monitoring", method: "get", queryOptions: { queryKey: ["enterprise-monitoring"] } });
  const healthQuery = useCustom({ url: "/api/admin/enterprise/monitoring/health", method: "get", queryOptions: { queryKey: ["enterprise-health"] } });
  const logsQuery = useCustom({ url: "/api/admin/enterprise/monitoring/logs", method: "get", queryOptions: { queryKey: ["enterprise-logs"] } });
  const configQuery = useCustom({ url: "/api/admin/enterprise/config", method: "get", queryOptions: { queryKey: ["enterprise-config"] } });
  const secretsQuery = useCustom({ url: "/api/admin/enterprise/config/secrets", method: "get", queryOptions: { queryKey: ["enterprise-secrets"] } });
  const featuresQuery = useCustom({ url: "/api/admin/config/features", method: "get", queryOptions: { queryKey: ["enterprise-features"] } });
  const gdprQuery = useCustom({ url: "/api/admin/enterprise/gdpr/dashboard", method: "get", queryOptions: { queryKey: ["enterprise-gdpr-dashboard"] } });
  const gdprRequestsQuery = useCustom({ url: "/api/admin/enterprise/gdpr/requests", method: "get", queryOptions: { queryKey: ["enterprise-gdpr-requests"] } });
  const gdprBreachesQuery = useCustom({ url: "/api/admin/enterprise/gdpr/breaches", method: "get", queryOptions: { queryKey: ["enterprise-gdpr-breaches"] } });
  const legalComplianceQuery = useCustom({ url: "/api/admin/legal-documents/compliance", method: "get", queryOptions: { queryKey: ["legal-compliance"] } });

  const dashboard = dataFrom(dashboardQuery.data);
  const compliance = dataFrom(complianceQuery.data);
  const governance = dataFrom(governanceQuery.data);
  const security = dataFrom(securityQuery.data);
  const monitoring = dataFrom(monitoringQuery.data);
  const health = dataFrom(healthQuery.data);
  const gdpr = dataFrom(gdprQuery.data);
  const legalCompliance = dataFrom(legalComplianceQuery.data);
  const roles = rowsFrom(rolesQuery.data);
  const permissions = rowsFrom(permissionsQuery.data);
  const logs = rowsFrom(logsQuery.data);
  const configRows = rowsFrom(configQuery.data);
  const secrets = rowsFrom(secretsQuery.data);
  const features = rowsFrom(featuresQuery.data);
  const gdprRequests = rowsFrom(gdprRequestsQuery.data);
  const gdprBreaches = rowsFrom(gdprBreachesQuery.data);

  const refreshAll = () => {
    [
      dashboardQuery, complianceQuery, governanceQuery, securityQuery, rolesQuery, permissionsQuery,
      monitoringQuery, healthQuery, logsQuery, configQuery, secretsQuery, featuresQuery,
      gdprQuery, gdprRequestsQuery, gdprBreachesQuery, legalComplianceQuery,
    ].forEach((query) => query.refetch());
  };

  const runAction = async (action: () => Promise<any>, success: string, refresh?: () => void) => {
    setBusy(true);
    try {
      await action();
      message.success(success);
      refresh?.();
    } catch (err: unknown) {
      message.error(getErrorMessage(err, "Enterprise action failed"));
    } finally {
      setBusy(false);
    }
  };

  const createRole = async () => {
    const values = await roleForm.validateFields();
    await runAction(
      () => axiosInstance.post("/api/admin/enterprise/roles", {
        name: values.name,
        description: values.description,
        permissions: values.permissions?.split(",").map((p: string) => p.trim()).filter(Boolean) ?? [],
      }),
      "Role created",
      () => {
        setRoleOpen(false);
        roleForm.resetFields();
        rolesQuery.refetch();
      },
    );
  };

  const updateConfig = async () => {
    const values = await configForm.validateFields();
    await runAction(
      () => axiosInstance.put("/api/admin/enterprise/config", JSON.parse(values.payload || "{}")),
      "Enterprise config updated",
      () => {
        setConfigOpen(false);
        configForm.resetFields();
        configQuery.refetch();
        featuresQuery.refetch();
      },
    );
  };

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>Enterprise</Title>
          <Text type="secondary">Governance, access control, GDPR, system health, configuration and legal compliance.</Text>
        </Col>
        <Col><Button icon={<ReloadOutlined />} onClick={refreshAll}>Refresh</Button></Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}><Card><Statistic title="Compliance Score" value={compliance.compliance_score ?? gdpr.compliance_score ?? 0} suffix="%" prefix={<SafetyCertificateOutlined />} /></Card></Col>
        <Col xs={24} sm={12} lg={6}><Card><Statistic title="Pending GDPR Requests" value={gdpr.pending_requests ?? 0} /></Card></Col>
        <Col xs={24} sm={12} lg={6}><Card><Statistic title="Security Findings" value={security.findings ?? security.open_findings ?? 0} /></Card></Col>
        <Col xs={24} sm={12} lg={6}><Card><Statistic title="System Health" value={health.status ?? "unknown"} /></Card></Col>
      </Row>

      <Tabs
        items={[
          {
            key: "overview",
            label: "Overview",
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={8}><Card title="Dashboard" loading={dashboardQuery.isLoading}><Descriptions column={1} size="small">{scalarEntries(dashboard).map(([k, v]) => <Descriptions.Item key={k} label={k}>{String(v ?? "--")}</Descriptions.Item>)}</Descriptions></Card></Col>
                <Col xs={24} lg={8}><Card title="Governance" loading={governanceQuery.isLoading}><Descriptions column={1} size="small">{scalarEntries(governance).map(([k, v]) => <Descriptions.Item key={k} label={k}>{String(v ?? "--")}</Descriptions.Item>)}</Descriptions></Card></Col>
                <Col xs={24} lg={8}><Card title="Security Posture" loading={securityQuery.isLoading}><Descriptions column={1} size="small">{scalarEntries(security).map(([k, v]) => <Descriptions.Item key={k} label={k}>{String(v ?? "--")}</Descriptions.Item>)}</Descriptions></Card></Col>
              </Row>
            ),
          },
          {
            key: "roles",
            label: "Roles & Permissions",
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                  <Card title="Roles" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setRoleOpen(true)}>Create Role</Button>}>
                    <Table loading={rolesQuery.isLoading} dataSource={roles} rowKey={(r: any) => r.id || r.name} size="small" locale={{ emptyText: <Empty description="No roles returned" /> }}>
                      <Table.Column title="Name" dataIndex="name" />
                      <Table.Column title="Description" dataIndex="description" ellipsis />
                      <Table.Column title="Permissions" dataIndex="permissions" render={(v: any) => Array.isArray(v) ? v.length : v ?? 0} />
                      <Table.Column title="Users" dataIndex="users" />
                      <Table.Column
                        title="Actions"
                        width={100}
                        render={(_: any, record: any) => (
                          <Button danger size="small" icon={<DeleteOutlined />} onClick={() => runAction(() => axiosInstance.delete(`/api/admin/enterprise/roles/${record.id}`), "Role deleted", rolesQuery.refetch)} />
                        )}
                      />
                    </Table>
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card title="Permission Browser">
                    <Table loading={permissionsQuery.isLoading} dataSource={permissions} rowKey={(r: any) => r.id} size="small" pagination={false}>
                      <Table.Column title="Permission" dataIndex="id" />
                      <Table.Column title="Category" dataIndex="category" render={(v: string) => <Tag>{v}</Tag>} />
                      <Table.Column title="Description" dataIndex="description" ellipsis />
                    </Table>
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: "gdpr",
            label: "GDPR",
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={8}><Card title="GDPR Dashboard" loading={gdprQuery.isLoading}><Descriptions column={1} size="small">{scalarEntries(gdpr).map(([k, v]) => <Descriptions.Item key={k} label={k}>{String(v ?? "--")}</Descriptions.Item>)}</Descriptions></Card></Col>
                <Col xs={24} lg={8}><Card title="Legal Compliance" loading={legalComplianceQuery.isLoading}><Descriptions column={1} size="small">{scalarEntries(legalCompliance).map(([k, v]) => <Descriptions.Item key={k} label={k}>{String(v ?? "--")}</Descriptions.Item>)}</Descriptions></Card></Col>
                <Col xs={24} lg={8}><Card title="Compliance" loading={complianceQuery.isLoading}><Descriptions column={1} size="small">{scalarEntries(compliance).map(([k, v]) => <Descriptions.Item key={k} label={k}>{String(v ?? "--")}</Descriptions.Item>)}</Descriptions></Card></Col>
                <Col xs={24} lg={12}><Card title="GDPR Requests"><Table loading={gdprRequestsQuery.isLoading} dataSource={gdprRequests} rowKey={(r: any) => r.id || JSON.stringify(r)} size="small" /></Card></Col>
                <Col xs={24} lg={12}><Card title="Breaches"><Table loading={gdprBreachesQuery.isLoading} dataSource={gdprBreaches} rowKey={(r: any) => r.id || JSON.stringify(r)} size="small" /></Card></Col>
              </Row>
            ),
          },
          {
            key: "monitoring",
            label: "Monitoring",
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}><Card title="System Monitoring" loading={monitoringQuery.isLoading}><Descriptions column={1} size="small">{scalarEntries(monitoring).map(([k, v]) => <Descriptions.Item key={k} label={k}>{String(v ?? "--")}</Descriptions.Item>)}</Descriptions></Card></Col>
                <Col xs={24} lg={12}><Card title="Health Checks" loading={healthQuery.isLoading}><Descriptions column={1} size="small">{scalarEntries(health).map(([k, v]) => <Descriptions.Item key={k} label={k}>{String(v ?? "--")}</Descriptions.Item>)}</Descriptions></Card></Col>
                <Col xs={24}><Card title="Error Logs"><Table loading={logsQuery.isLoading} dataSource={logs} rowKey={(r: any) => r.id || JSON.stringify(r)} size="small" locale={{ emptyText: <Empty description="No logs returned" /> }} /></Card></Col>
              </Row>
            ),
          },
          {
            key: "config",
            label: "Config",
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24}><Card title="Configuration" extra={<Button icon={<SettingOutlined />} onClick={() => { configForm.setFieldsValue({ payload: JSON.stringify(dataFrom(configQuery.data), null, 2) }); setConfigOpen(true); }}>Edit JSON</Button>}><Table loading={configQuery.isLoading} dataSource={configRows} rowKey={(r: any) => r.key || r.id || JSON.stringify(r)} size="small" /></Card></Col>
                <Col xs={24} lg={12}><Card title="Secrets"><Table loading={secretsQuery.isLoading} dataSource={secrets} rowKey={(r: any) => r.key || r.id || JSON.stringify(r)} size="small" locale={{ emptyText: <Empty description="No secrets returned" /> }} /></Card></Col>
                <Col xs={24} lg={12}><Card title="Feature Flags"><Table loading={featuresQuery.isLoading} dataSource={features} rowKey={(r: any) => r.key || r.id || JSON.stringify(r)} size="small" locale={{ emptyText: <Empty description="No feature flags returned" /> }} /></Card></Col>
              </Row>
            ),
          },
        ]}
      />

      <Modal title="Create Enterprise Role" open={roleOpen} onOk={createRole} confirmLoading={busy} onCancel={() => setRoleOpen(false)}>
        <Form form={roleForm} layout="vertical">
          <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="description" label="Description"><Input /></Form.Item>
          <Form.Item name="permissions" label="Permissions CSV"><TextArea rows={4} placeholder="users.read, users.write" /></Form.Item>
        </Form>
      </Modal>

      <Modal title="Update Enterprise Config" open={configOpen} onOk={updateConfig} confirmLoading={busy} onCancel={() => setConfigOpen(false)} width={760}>
        <Form form={configForm} layout="vertical">
          <Form.Item
            name="payload"
            label="Config JSON"
            rules={[{
              validator: (_, value) => {
                try {
                  JSON.parse(value || "{}");
                  return Promise.resolve();
                } catch {
                  return Promise.reject(new Error("Config must be valid JSON"));
                }
              },
            }]}
          >
            <TextArea rows={14} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
