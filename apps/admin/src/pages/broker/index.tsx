// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useCustom } from "@refinedev/core";
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import axiosInstance from "../../utils/axios";
import { getErrorMessage } from "../../utils/errors";
import { StatusTag } from "../../components/common/status-tag";

const { Title, Text } = Typography;

const riskColor: Record<string, string> = {
  low: "success",
  medium: "processing",
  high: "warning",
  critical: "error",
};

const userName = (user: any) => user?.name || `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || user?.email || (user?.id ? `User #${user.id}` : "-");

export const BrokerPage = () => {
  const [assignmentPage, setAssignmentPage] = useState(1);
  const [assignmentPageSize, setAssignmentPageSize] = useState(50);
  const [exchangePage, setExchangePage] = useState(1);
  const [messagePage, setMessagePage] = useState(1);
  const [reviewTarget, setReviewTarget] = useState<any>(null);
  const [flagTarget, setFlagTarget] = useState<any>(null);
  const [riskOpen, setRiskOpen] = useState(false);
  const [monitoringOpen, setMonitoringOpen] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [reviewForm] = Form.useForm();
  const [flagForm] = Form.useForm();
  const [riskForm] = Form.useForm();
  const [monitoringForm] = Form.useForm();
  const [configForm] = Form.useForm();

  const { data: dashboardData, refetch: refetchDashboard } = useCustom({ url: "/api/admin/broker/dashboard", method: "get" });
  const { data: assignmentsData, isLoading: assignmentsLoading, refetch: refetchAssignments } = useCustom({
    url: "/api/admin/broker/assignments",
    method: "get",
    config: { query: { page: assignmentPage, limit: assignmentPageSize } },
    queryOptions: { queryKey: ["admin-broker-assignments", assignmentPage, assignmentPageSize] },
  });
  const { data: brokersData } = useCustom({ url: "/api/admin/broker/brokers", method: "get" });
  const { data: exchangesData, refetch: refetchExchanges } = useCustom({
    url: "/api/admin/broker/exchanges",
    method: "get",
    config: { query: { page: exchangePage, limit: 50 } },
    queryOptions: { queryKey: ["admin-broker-exchanges", exchangePage] },
  });
  const { data: messagesData, refetch: refetchMessages } = useCustom({
    url: "/api/admin/broker/messages",
    method: "get",
    config: { query: { page: messagePage, limit: 50 } },
    queryOptions: { queryKey: ["admin-broker-messages", messagePage] },
  });
  const { data: riskData, refetch: refetchRisk } = useCustom({ url: "/api/admin/broker/risk-tags", method: "get" });
  const { data: monitoringData, refetch: refetchMonitoring } = useCustom({ url: "/api/admin/broker/monitoring", method: "get" });
  const { data: configData, refetch: refetchConfig } = useCustom({ url: "/api/admin/broker/configuration", method: "get" });

  const dashboard = (dashboardData?.data as any)?.data || dashboardData?.data || {};
  const assignmentsRaw = assignmentsData?.data as any;
  const assignments = assignmentsRaw?.items || assignmentsRaw?.data || [];
  const assignmentsTotal = assignmentsRaw?.meta?.total || assignmentsRaw?.pagination?.total || assignments.length;
  const brokers = (brokersData?.data as any)?.items || (brokersData?.data as any)?.data || [];
  const exchangesRaw = exchangesData?.data as any;
  const exchanges = exchangesRaw?.data || exchangesRaw?.items || [];
  const exchangesTotal = exchangesRaw?.pagination?.total || exchanges.length;
  const messagesRaw = messagesData?.data as any;
  const brokerMessages = messagesRaw?.data || messagesRaw?.items || [];
  const messagesTotal = messagesRaw?.pagination?.total || brokerMessages.length;
  const riskTags = (riskData?.data as any)?.data || [];
  const monitoring = (monitoringData?.data as any)?.data || [];
  const config = (configData?.data as any)?.data || {};

  useEffect(() => {
    configForm.setFieldsValue(config);
  }, [config, configForm]);

  const refreshBroker = () => {
    refetchDashboard();
    refetchAssignments();
    refetchExchanges();
    refetchMessages();
    refetchRisk();
    refetchMonitoring();
    refetchConfig();
  };

  const handleComplete = async (id: number) => {
    try {
      await axiosInstance.put(`/api/admin/broker/assignments/${id}/complete`);
      message.success("Assignment completed");
      refreshBroker();
    } catch (err: unknown) {
      message.error(getErrorMessage(err, "Failed to complete assignment"));
    }
  };

  const handleExchangeAction = async (id: number, action: "approve" | "reject") => {
    try {
      if (action === "approve") {
        await axiosInstance.post(`/api/admin/broker/exchanges/${id}/approve`);
      } else {
        await axiosInstance.post(`/api/admin/broker/exchanges/${id}/reject`, { reason: "Rejected by broker admin" });
      }
      message.success(action === "approve" ? "Exchange approved" : "Exchange rejected");
      refreshBroker();
    } catch (err: unknown) {
      message.error(getErrorMessage(err, "Failed to update exchange"));
    }
  };

  const handleReviewMessage = async () => {
    try {
      const values = await reviewForm.validateFields();
      await axiosInstance.post(`/api/admin/broker/messages/${reviewTarget.id}/review`, values);
      message.success("Message reviewed");
      setReviewTarget(null);
      reviewForm.resetFields();
      refreshBroker();
    } catch (err: unknown) {
      message.error(getErrorMessage(err, "Failed to review message"));
    }
  };

  const handleFlagMessage = async () => {
    try {
      const values = await flagForm.validateFields();
      await axiosInstance.post(`/api/admin/broker/messages/${flagTarget.id}/flag`, values);
      message.success("Message flagged for safeguarding");
      setFlagTarget(null);
      flagForm.resetFields();
      refreshBroker();
    } catch (err: unknown) {
      message.error(getErrorMessage(err, "Failed to flag message"));
    }
  };

  const handleSaveRisk = async () => {
    try {
      const values = await riskForm.validateFields();
      await axiosInstance.post(`/api/admin/broker/listings/${values.listing_id}/risk-tag`, values);
      message.success("Risk tag saved");
      setRiskOpen(false);
      riskForm.resetFields();
      refreshBroker();
    } catch (err: unknown) {
      message.error(getErrorMessage(err, "Failed to save risk tag"));
    }
  };

  const handleSaveMonitoring = async () => {
    try {
      const values = await monitoringForm.validateFields();
      await axiosInstance.post(`/api/admin/broker/users/${values.user_id}/monitoring`, values);
      message.success("Monitoring updated");
      setMonitoringOpen(false);
      monitoringForm.resetFields();
      refreshBroker();
    } catch (err: unknown) {
      message.error(getErrorMessage(err, "Failed to update monitoring"));
    }
  };

  const handleSaveConfig = async () => {
    try {
      setSavingConfig(true);
      await axiosInstance.put("/api/admin/broker/configuration", configForm.getFieldsValue());
      message.success("Broker configuration saved");
      refetchConfig();
    } catch (err: unknown) {
      message.error(getErrorMessage(err, "Failed to save broker configuration"));
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <div>
      <Space style={{ width: "100%", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <Title level={4} style={{ marginBottom: 0 }}>Broker Controls</Title>
          <Text type="secondary">Monitor exchanges, message review, risk tags, user monitoring, and broker assignments.</Text>
        </div>
        <Space>
          <Button onClick={() => setRiskOpen(true)}>Add Risk Tag</Button>
          <Button onClick={() => setMonitoringOpen(true)}>Set Monitoring</Button>
        </Space>
      </Space>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={4}><Card><Statistic title="Pending Exchanges" value={dashboard.pending_exchanges || 0} /></Card></Col>
        <Col xs={24} sm={12} lg={4}><Card><Statistic title="Unreviewed Messages" value={dashboard.unreviewed_messages || 0} /></Card></Col>
        <Col xs={24} sm={12} lg={4}><Card><Statistic title="High Risk Listings" value={dashboard.high_risk_listings || 0} /></Card></Col>
        <Col xs={24} sm={12} lg={4}><Card><Statistic title="Monitored Users" value={dashboard.monitored_users || 0} /></Card></Col>
        <Col xs={24} sm={12} lg={4}><Card><Statistic title="Active Assignments" value={dashboard.active_assignments || 0} /></Card></Col>
        <Col xs={24} sm={12} lg={4}><Card><Statistic title="Vetting Pending" value={dashboard.vetting_pending || 0} /></Card></Col>
      </Row>

      <Tabs items={[
        {
          key: "exchanges",
          label: "Exchanges",
          children: (
            <Card>
              <Table dataSource={exchanges} rowKey="id" size="small" pagination={{ current: exchangePage, pageSize: 50, total: exchangesTotal, onChange: setExchangePage }}>
                <Table.Column dataIndex="id" title="ID" width={70} />
                <Table.Column title="Listing" dataIndex="listing_title" />
                <Table.Column title="Initiator" render={(_, r: any) => userName(r.initiator)} />
                <Table.Column title="Owner" render={(_, r: any) => userName(r.listing_owner)} />
                <Table.Column title="Hours" dataIndex="agreed_hours" />
                <Table.Column title="Status" dataIndex="status" render={(s: string) => <StatusTag status={s} />} />
                <Table.Column title="Created" dataIndex="created_at" render={(d: string) => d ? dayjs(d).format("DD MMM YYYY") : "-"} />
                <Table.Column title="Actions" render={(_, r: any) => (
                  <Space>
                    {["requested", "disputed"].includes(String(r.status).toLowerCase()) && <Button size="small" onClick={() => handleExchangeAction(r.id, "approve")}>Approve</Button>}
                    {["requested", "disputed"].includes(String(r.status).toLowerCase()) && <Button danger size="small" onClick={() => handleExchangeAction(r.id, "reject")}>Reject</Button>}
                  </Space>
                )} />
              </Table>
            </Card>
          ),
        },
        {
          key: "messages",
          label: "Message Review",
          children: (
            <Card>
              <Table dataSource={brokerMessages} rowKey="id" size="small" pagination={{ current: messagePage, pageSize: 50, total: messagesTotal, onChange: setMessagePage }}>
                <Table.Column title="Message" dataIndex="message_content" ellipsis />
                <Table.Column title="Sender" render={(_, r: any) => userName(r.sender)} />
                <Table.Column title="Recipient" render={(_, r: any) => userName(r.recipient)} />
                <Table.Column title="Risk" render={(_, r: any) => <Tag color={riskColor[r.severity] || "default"}>{r.severity || "low"}</Tag>} />
                <Table.Column title="State" render={(_, r: any) => r.is_flagged ? <Tag color="error">Flagged</Tag> : r.is_reviewed ? <Tag color="success">Reviewed</Tag> : <Tag color="warning">Unreviewed</Tag>} />
                <Table.Column title="Created" dataIndex="created_at" render={(d: string) => d ? dayjs(d).format("DD MMM YYYY HH:mm") : "-"} />
                <Table.Column title="Actions" render={(_, r: any) => (
                  <Space>
                    {!r.is_reviewed && <Button size="small" onClick={() => { setReviewTarget(r); reviewForm.setFieldsValue({ notes: r.review_notes }); }}>Approve</Button>}
                    <Button danger size="small" onClick={() => { setFlagTarget(r); flagForm.setFieldsValue({ severity: r.severity || "high", reason: r.flag_reason || "manual_flag" }); }}>Flag</Button>
                  </Space>
                )} />
              </Table>
            </Card>
          ),
        },
        {
          key: "risk",
          label: "Risk Tags",
          children: (
            <Card extra={<Button onClick={() => setRiskOpen(true)}>Add Risk Tag</Button>}>
              <Table dataSource={riskTags} rowKey="id" size="small">
                <Table.Column title="Listing" render={(_, r: any) => r.listing_title || `Listing #${r.listing_id}`} />
                <Table.Column title="Level" dataIndex="risk_level" render={(s: string) => <Tag color={riskColor[s] || "default"}>{s}</Tag>} />
                <Table.Column title="Type" dataIndex="risk_type" />
                <Table.Column title="Notes" dataIndex="notes" ellipsis />
                <Table.Column title="Created" dataIndex="created_at" render={(d: string) => d ? dayjs(d).format("DD MMM YYYY") : "-"} />
              </Table>
            </Card>
          ),
        },
        {
          key: "monitoring",
          label: "User Monitoring",
          children: (
            <Card extra={<Button onClick={() => setMonitoringOpen(true)}>Set Monitoring</Button>}>
              <Table dataSource={monitoring} rowKey="id" size="small">
                <Table.Column title="User" render={(_, r: any) => userName(r.user)} />
                <Table.Column title="Monitoring" render={(_, r: any) => r.under_monitoring ? <Tag color="warning">Enabled</Tag> : <Tag>Disabled</Tag>} />
                <Table.Column title="Expires" dataIndex="monitoring_expires_at" render={(d: string) => d ? dayjs(d).format("DD MMM YYYY") : "No expiry"} />
                <Table.Column title="Reason" dataIndex="reason" ellipsis />
              </Table>
            </Card>
          ),
        },
        {
          key: "assignments",
          label: "Assignments",
          children: (
            <Card>
              <Table dataSource={assignments} rowKey="id" size="small" loading={assignmentsLoading} pagination={{
                current: assignmentPage,
                pageSize: assignmentPageSize,
                total: assignmentsTotal,
                showSizeChanger: true,
                onChange: (p, ps) => { setAssignmentPage(p); setAssignmentPageSize(ps); },
              }}>
                <Table.Column dataIndex="id" title="ID" width={60} />
                <Table.Column title="Broker" render={(_, r: any) => userName(r.broker)} />
                <Table.Column title="Member" render={(_, r: any) => userName(r.member)} />
                <Table.Column dataIndex="status" title="Status" render={(s: string) => <StatusTag status={s} />} />
                <Table.Column dataIndex="created_at" title="Created" render={(d: string) => d ? dayjs(d).format("DD MMM YYYY") : "-"} />
                <Table.Column title="Actions" render={(_, r: any) => r.status !== "completed" && <Button size="small" onClick={() => handleComplete(r.id)}>Complete</Button>} />
              </Table>
            </Card>
          ),
        },
        {
          key: "brokers",
          label: "Brokers",
          children: (
            <Card>
              <Table dataSource={brokers} rowKey="id" size="small">
                <Table.Column dataIndex="email" title="Email" />
                <Table.Column title="Name" render={(_, r: any) => userName(r)} />
                <Table.Column dataIndex="role" title="Role" render={(r: string) => <Tag>{r}</Tag>} />
              </Table>
            </Card>
          ),
        },
        {
          key: "configuration",
          label: "Configuration",
          children: (
            <Card>
              <Form form={configForm} layout="vertical">
                <Row gutter={16}>
                  {[
                    ["broker_messaging_enabled", "Broker messaging enabled"],
                    ["broker_copy_all_messages", "Copy all messages"],
                    ["risk_tagging_enabled", "Risk tagging enabled"],
                    ["auto_flag_high_risk", "Auto-flag high risk"],
                    ["require_approval_high_risk", "Require approval for high risk"],
                    ["broker_approval_required", "Broker approval required"],
                    ["auto_approve_low_risk", "Auto-approve low risk"],
                    ["vetting_enabled", "Vetting enabled"],
                    ["insurance_enabled", "Insurance enabled"],
                    ["enforce_vetting_on_exchanges", "Enforce vetting on exchanges"],
                    ["enforce_insurance_on_exchanges", "Enforce insurance on exchanges"],
                  ].map(([name, label]) => (
                    <Col xs={24} md={12} lg={8} key={name}>
                      <Form.Item name={name} label={label} valuePropName="checked"><Switch /></Form.Item>
                    </Col>
                  ))}
                  {[
                    ["broker_copy_threshold_hours", "Copy threshold hours"],
                    ["new_member_monitoring_days", "New member monitoring days"],
                    ["exchange_timeout_days", "Exchange timeout days"],
                    ["max_hours_without_approval", "Max hours without approval"],
                    ["confirmation_deadline_hours", "Confirmation deadline hours"],
                    ["retention_days", "Retention days"],
                    ["random_sample_percentage", "Random sample percentage"],
                  ].map(([name, label]) => (
                    <Col xs={24} md={8} key={name}>
                      <Form.Item name={name} label={label}><InputNumber style={{ width: "100%" }} min={0} /></Form.Item>
                    </Col>
                  ))}
                  <Col xs={24} md={12}><Form.Item name="broker_contact_email" label="Broker contact email"><Input /></Form.Item></Col>
                </Row>
                <Button type="primary" loading={savingConfig} onClick={handleSaveConfig}>Save Configuration</Button>
              </Form>
            </Card>
          ),
        },
      ]} />

      <Modal title="Approve message" open={!!reviewTarget} onOk={handleReviewMessage} onCancel={() => setReviewTarget(null)} destroyOnClose>
        <Text>{reviewTarget?.message_content}</Text>
        <Form form={reviewForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="notes" label="Review notes"><Input.TextArea rows={4} /></Form.Item>
        </Form>
      </Modal>

      <Modal title="Flag message" open={!!flagTarget} onOk={handleFlagMessage} onCancel={() => setFlagTarget(null)} destroyOnClose>
        <Text>{flagTarget?.message_content}</Text>
        <Form form={flagForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="severity" label="Severity" rules={[{ required: true }]}><Select options={["medium", "high", "critical"].map((value) => ({ value, label: value }))} /></Form.Item>
          <Form.Item name="reason" label="Reason" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="notes" label="Notes"><Input.TextArea rows={4} /></Form.Item>
        </Form>
      </Modal>

      <Modal title="Add listing risk tag" open={riskOpen} onOk={handleSaveRisk} onCancel={() => setRiskOpen(false)} destroyOnClose>
        <Form form={riskForm} layout="vertical">
          <Form.Item name="listing_id" label="Listing ID" rules={[{ required: true }]}><InputNumber style={{ width: "100%" }} min={1} /></Form.Item>
          <Form.Item name="risk_level" label="Risk level" initialValue="medium"><Select options={["low", "medium", "high", "critical"].map((value) => ({ value, label: value }))} /></Form.Item>
          <Form.Item name="risk_type" label="Risk type" initialValue="manual"><Input /></Form.Item>
          <Form.Item name="notes" label="Notes"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>

      <Modal title="Set user monitoring" open={monitoringOpen} onOk={handleSaveMonitoring} onCancel={() => setMonitoringOpen(false)} destroyOnClose>
        <Form form={monitoringForm} layout="vertical" initialValues={{ under_monitoring: true }}>
          <Form.Item name="user_id" label="User ID" rules={[{ required: true }]}><InputNumber style={{ width: "100%" }} min={1} /></Form.Item>
          <Form.Item name="under_monitoring" label="Under monitoring" valuePropName="checked"><Switch /></Form.Item>
          <Form.Item name="reason" label="Reason"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
