// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useCustom } from "@refinedev/core";
import { Card, Table, Typography, Row, Col, Statistic, Spin, Tag, Tabs, Button, Space, message, Modal, Input } from "antd";
import { ExclamationCircleOutlined, DownloadOutlined, DeleteOutlined, SafetyOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { useState } from "react";
import dayjs from "dayjs";
import axiosInstance from "../../utils/axios";

const { Title } = Typography;

const severityColors: Record<string, string> = {
  low: "blue",
  medium: "orange",
  high: "red",
  critical: "magenta",
};

const statusColors: Record<string, string> = {
  open: "red",
  investigating: "orange",
  resolved: "green",
  closed: "default",
  pending: "orange",
  completed: "green",
  processing: "blue",
  rejected: "red",
};

export const GdprPage = () => {
  const [breachPage, setBreachPage] = useState(1);
  const [breachPageSize, setBreachPageSize] = useState(20);
  const [requestPage, setRequestPage] = useState(1);
  const [requestPageSize, setRequestPageSize] = useState(20);
  const [exportUserId, setExportUserId] = useState("");

  const { data: breachData, isLoading: breachLoading, refetch: refetchBreaches } = useCustom({
    url: "/api/admin/gdpr/breaches",
    method: "get",
    config: { query: { page: breachPage, limit: breachPageSize } },
    queryOptions: { queryKey: ["admin-gdpr-breaches", breachPage, breachPageSize] },
  });

  const { data: consentTypesData, isLoading: consentTypesLoading } = useCustom({
    url: "/api/admin/gdpr/consent-types",
    method: "get",
  });

  const { data: consentStatsData } = useCustom({
    url: "/api/admin/gdpr/consent-stats",
    method: "get",
  });

  const { data: requestsData, isLoading: requestsLoading, refetch: refetchRequests } = useCustom({
    url: "/api/admin/gdpr/requests",
    method: "get",
    config: { query: { page: requestPage, limit: requestPageSize } },
    queryOptions: { queryKey: ["admin-gdpr-requests", requestPage, requestPageSize] },
  });

  const breachRaw = breachData?.data as any;
  const breaches = breachRaw?.items || breachRaw?.data || [];
  const breachTotalCount = breachRaw?.total || breachRaw?.totalCount || breaches.length;

  const consentTypes = (consentTypesData?.data as any)?.items || (consentTypesData?.data as any)?.data || [];
  const consentStats = (consentStatsData?.data as any)?.items || (consentStatsData?.data as any)?.data || {};

  const requestsRaw = requestsData?.data as any;
  const requests = requestsRaw?.items || requestsRaw?.data || (Array.isArray(requestsData?.data) ? requestsData.data : []);
  const requestsTotalCount = requestsRaw?.total || requestsRaw?.totalCount || requests.length;

  const getErrorMessage = (err: any, fallback: string) => {
    if (err?.response) return err.response.data?.message || err.response.data?.error || fallback;
    if (err?.request) return "Network error — please check your connection and try again";
    return fallback;
  };

  const handleExportUser = () => {
    if (!exportUserId) {
      message.warning("Enter a user ID to export");
      return;
    }
    Modal.confirm({
      title: "Export User Data",
      icon: <DownloadOutlined />,
      content: `This will generate a GDPR data export for user #${exportUserId}. The user will be notified.`,
      okText: "Export",
      onOk: async () => {
        try {
          await axiosInstance.post(`/api/admin/gdpr/export/${exportUserId}`);
          message.success("Data export request submitted");
          setExportUserId("");
          refetchRequests();
        } catch (err: any) { message.error(getErrorMessage(err, "Failed to request export")); }
      },
    });
  };

  const handleProcessRequest = async (id: number, action: "approve" | "reject") => {
    const verb = action === "approve" ? "Approve" : "Reject";
    Modal.confirm({
      title: `${verb} Request`,
      icon: action === "approve" ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />,
      content: `${verb} this data request? ${action === "approve" ? "The data will be processed." : "The request will be rejected."}`,
      okText: verb,
      okType: action === "reject" ? "danger" : "primary",
      onOk: async () => {
        try {
          await axiosInstance.put(`/api/admin/gdpr/requests/${id}/${action}`);
          message.success(`Request ${action}d`);
          refetchRequests();
        } catch (err: any) { message.error(getErrorMessage(err, `Failed to ${action}`)); }
      },
    });
  };

  const handleDeleteUser = (userId: number) => {
    Modal.confirm({
      title: "Delete User Data (Right to Erasure)",
      icon: <ExclamationCircleOutlined />,
      content: `This will permanently delete all personal data for user #${userId} in compliance with GDPR Article 17. This action cannot be undone.`,
      okText: "Permanently Delete",
      okType: "danger",
      onOk: async () => {
        try {
          await axiosInstance.delete(`/api/admin/gdpr/users/${userId}/data`);
          message.success("User data deleted");
          refetchRequests();
        } catch (err: any) { message.error(getErrorMessage(err, "Failed to delete user data")); }
      },
    });
  };

  const breachesTab = (
    <>
      {breachLoading ? (
        <Spin />
      ) : (
        <Card>
          <Table dataSource={breaches} rowKey="id" size="small" locale={{ emptyText: "No data breaches recorded" }} pagination={{
              current: breachPage,
              pageSize: breachPageSize,
              total: breachTotalCount,
              showSizeChanger: true,
              showTotal: (t: number) => `${t} total`,
              onChange: (p: number, ps: number) => { setBreachPage(p); setBreachPageSize(ps); },
            }}>
            <Table.Column dataIndex="id" title="ID" width={60} />
            <Table.Column dataIndex="title" title="Title" />
            <Table.Column
              dataIndex="severity"
              title="Severity"
              render={(s: string) => <Tag color={severityColors[s] || "default"}>{s}</Tag>}
            />
            <Table.Column
              dataIndex="status"
              title="Status"
              render={(s: string) => <Tag color={statusColors[s] || "default"}>{s}</Tag>}
            />
            <Table.Column dataIndex="affected_users_count" title="Affected Users" width={120} />
            <Table.Column
              dataIndex="detected_at"
              title="Detected"
              render={(d: string) => (d ? dayjs(d).format("DD MMM YYYY HH:mm") : "--")}
            />
            <Table.Column
              dataIndex="resolved_at"
              title="Resolved"
              render={(d: string) => (d ? dayjs(d).format("DD MMM YYYY HH:mm") : "—")}
            />
          </Table>
        </Card>
      )}
    </>
  );

  const dataRequestsTab = (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Input
          placeholder="User ID"
          value={exportUserId}
          onChange={(e) => setExportUserId(e.target.value)}
          style={{ width: 120 }}
          type="number"
        />
        <Button icon={<DownloadOutlined />} onClick={handleExportUser}>Export User Data</Button>
      </Space>

      {requestsLoading ? (
        <Spin />
      ) : (
        <Card>
          <Table dataSource={requests} rowKey="id" size="small" locale={{ emptyText: "No data requests" }} pagination={{
              current: requestPage,
              pageSize: requestPageSize,
              total: requestsTotalCount,
              showSizeChanger: true,
              showTotal: (t: number) => `${t} total`,
              onChange: (p: number, ps: number) => { setRequestPage(p); setRequestPageSize(ps); },
            }}>
            <Table.Column dataIndex="id" title="ID" width={60} />
            <Table.Column
              title="User"
              render={(_, r: any) => r.user_email || (r.user_id ? `User #${r.user_id}` : "—")}
            />
            <Table.Column
              dataIndex="type"
              title="Type"
              render={(t: string) => (
                <Tag color={t === "deletion" ? "red" : t === "export" ? "blue" : "default"}>
                  {t ? t.charAt(0).toUpperCase() + t.slice(1) : "—"}
                </Tag>
              )}
            />
            <Table.Column
              dataIndex="status"
              title="Status"
              render={(s: string) => <Tag color={statusColors[s] || "default"}>{s}</Tag>}
            />
            <Table.Column
              dataIndex="created_at"
              title="Requested"
              render={(d: string) => (d ? dayjs(d).format("DD MMM YYYY HH:mm") : "—")}
            />
            <Table.Column
              dataIndex="completed_at"
              title="Completed"
              render={(d: string) => (d ? dayjs(d).format("DD MMM YYYY HH:mm") : "—")}
            />
            <Table.Column
              title="Actions"
              render={(_, r: any) => (
                <Space>
                  {r.status === "pending" && (
                    <>
                      <Button size="small" type="primary" onClick={() => handleProcessRequest(r.id, "approve")}>Approve</Button>
                      <Button size="small" danger onClick={() => handleProcessRequest(r.id, "reject")}>Reject</Button>
                    </>
                  )}
                  {r.type === "deletion" && r.status === "approved" && (
                    <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDeleteUser(r.user_id)}>
                      Execute Deletion
                    </Button>
                  )}
                </Space>
              )}
            />
          </Table>
        </Card>
      )}
    </>
  );

  const consentTab = (
    <>
      {Object.keys(consentStats).length > 0 && (
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          {Object.entries(consentStats).map(([key, value]) => (
            <Col span={6} key={key}>
              <Card>
                <Statistic title={key.replace(/_/g, " ")} value={typeof value === "number" ? value : String(value ?? 0)} />
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {consentTypesLoading ? (
        <Spin />
      ) : (
        <Card>
          <Table dataSource={consentTypes} rowKey="id" size="small" locale={{ emptyText: "No consent types configured" }} pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t: number) => `${t} total` }}>
            <Table.Column dataIndex="id" title="ID" width={60} />
            <Table.Column dataIndex="name" title="Name" />
            <Table.Column dataIndex="description" title="Description" ellipsis />
            <Table.Column
              dataIndex="required"
              title="Required"
              width={90}
              render={(v: boolean) => <Tag color={v ? "red" : "default"}>{v ? "Yes" : "No"}</Tag>}
            />
          </Table>
        </Card>
      )}
    </>
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <Title level={4}>GDPR & Compliance</Title>
        <SafetyOutlined style={{ fontSize: 24, color: "#1890ff" }} />
      </div>
      <Tabs
        items={[
          { key: "breaches", label: "Data Breaches", children: breachesTab },
          { key: "requests", label: "Data Requests", children: dataRequestsTab },
          { key: "consent", label: "Consent Management", children: consentTab },
        ]}
      />
    </div>
  );
};
