// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useState } from "react";
import { useCustom } from "@refinedev/core";
import { Button, Card, Col, Descriptions, Empty, Form, Input, Modal, Row, Space, Statistic, Table, Tabs, Tag, Typography, message } from "antd";
import { DeleteOutlined, DownloadOutlined, PlusOutlined, ReloadOutlined, SendOutlined, UploadOutlined } from "@ant-design/icons";
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

export const LegalDocumentsPage = () => {
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [docOpen, setDocOpen] = useState(false);
  const [versionOpen, setVersionOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [docForm] = Form.useForm();
  const [versionForm] = Form.useForm();

  const docsQuery = useCustom({ url: "/api/admin/legal-documents", method: "get", queryOptions: { queryKey: ["legal-documents"] } });
  const complianceQuery = useCustom({ url: "/api/admin/legal-documents/compliance", method: "get", queryOptions: { queryKey: ["legal-documents-compliance"] } });
  const versionsQuery = useCustom({
    url: selectedDoc?.id ? `/api/admin/legal-documents/${selectedDoc.id}/versions` : "/api/admin/legal-documents/0/versions",
    method: "get",
    queryOptions: { queryKey: ["legal-document-versions", selectedDoc?.id], enabled: !!selectedDoc?.id },
  });

  const docs = rowsFrom(docsQuery.data);
  const compliance = dataFrom(complianceQuery.data);
  const versions = rowsFrom(versionsQuery.data);

  const refreshAll = () => {
    docsQuery.refetch();
    complianceQuery.refetch();
    versionsQuery.refetch();
  };

  const runAction = async (action: () => Promise<any>, success: string, refresh?: () => void) => {
    setBusy(true);
    try {
      await action();
      message.success(success);
      refresh?.();
    } catch (err: unknown) {
      message.error(getErrorMessage(err, "Legal document action failed"));
    } finally {
      setBusy(false);
    }
  };

  const createDoc = async () => {
    const values = await docForm.validateFields();
    await runAction(() => axiosInstance.post("/api/admin/legal-documents", values), "Legal document created", () => {
      setDocOpen(false);
      docForm.resetFields();
      docsQuery.refetch();
      complianceQuery.refetch();
    });
  };

  const createVersion = async () => {
    if (!selectedDoc?.id) return;
    const values = await versionForm.validateFields();
    await runAction(() => axiosInstance.post(`/api/admin/legal-documents/${selectedDoc.id}/versions`, values), "Version created", () => {
      setVersionOpen(false);
      versionForm.resetFields();
      versionsQuery.refetch();
    });
  };

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>Legal Documents</Title>
          <Text type="secondary">Legal document library, versioning, publishing, notifications and acceptance compliance.</Text>
        </Col>
        <Col><Button icon={<ReloadOutlined />} onClick={refreshAll}>Refresh</Button></Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}><Card><Statistic title="Documents" value={compliance.total_documents ?? docs.length} /></Card></Col>
        <Col xs={24} sm={12} lg={6}><Card><Statistic title="Acceptances" value={compliance.total_acceptances ?? 0} /></Card></Col>
        <Col xs={24} sm={12} lg={6}><Card><Statistic title="Compliance Rate" value={compliance.compliance_rate ?? 0} suffix="%" /></Card></Col>
        <Col xs={24} sm={12} lg={6}><Card><Statistic title="Pending Acceptances" value={compliance.pending_acceptances ?? 0} /></Card></Col>
      </Row>

      <Tabs
        items={[
          {
            key: "documents",
            label: "Documents",
            children: (
              <Card extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setDocOpen(true)}>Create Document</Button>}>
                <Table loading={docsQuery.isLoading} dataSource={docs} rowKey={(r: any) => r.id || r.slug || JSON.stringify(r)} size="small" locale={{ emptyText: <Empty description="No legal documents returned" /> }}>
                  <Table.Column title="Title" dataIndex="title" ellipsis />
                  <Table.Column title="Slug" dataIndex="slug" />
                  <Table.Column title="Version" dataIndex="version" width={100} />
                  <Table.Column title="Active" dataIndex="is_active" width={100} render={(v: boolean) => <Tag color={v ? "green" : "default"}>{v ? "Active" : "Inactive"}</Tag>} />
                  <Table.Column title="Acceptance" dataIndex="requires_acceptance" width={120} render={(v: boolean) => <Tag color={v ? "orange" : "default"}>{v ? "Required" : "Optional"}</Tag>} />
                  <Table.Column
                    title="Actions"
                    width={300}
                    render={(_: any, record: any) => (
                      <Space wrap>
                        <Button size="small" onClick={() => setSelectedDoc(record)}>Versions</Button>
                        <Button size="small" icon={<DownloadOutlined />} onClick={() => runAction(() => axiosInstance.get(`/api/admin/legal-documents/${record.id}/acceptances/export`), "Acceptance export requested")}>Export</Button>
                        <Button size="small" danger icon={<DeleteOutlined />} onClick={() => runAction(() => axiosInstance.delete(`/api/admin/legal-documents/${record.id}`), "Document deleted", docsQuery.refetch)} />
                      </Space>
                    )}
                  />
                </Table>
              </Card>
            ),
          },
          {
            key: "versions",
            label: "Versions",
            children: (
              <Card
                title={selectedDoc ? `Versions: ${selectedDoc.title || selectedDoc.slug || `#${selectedDoc.id}`}` : "Select a document"}
                extra={<Button type="primary" icon={<PlusOutlined />} disabled={!selectedDoc} onClick={() => setVersionOpen(true)}>Create Version</Button>}
              >
                {!selectedDoc ? (
                  <Empty description="Choose a document from the Documents tab to manage versions" />
                ) : (
                  <Table loading={versionsQuery.isLoading} dataSource={versions} rowKey={(r: any) => r.id || r.version || JSON.stringify(r)} size="small" locale={{ emptyText: <Empty description="No versions returned" /> }}>
                    <Table.Column title="Version" dataIndex="version" />
                    <Table.Column title="Status" dataIndex="status" render={(v: string) => <Tag>{v || "--"}</Tag>} />
                    <Table.Column title="Title" dataIndex="title" ellipsis />
                    <Table.Column
                      title="Actions"
                      width={360}
                      render={(_: any, record: any) => (
                        <Space wrap>
                          <Button size="small" icon={<UploadOutlined />} onClick={() => runAction(() => axiosInstance.post(`/api/admin/legal-documents/versions/${record.id}/publish`), "Version published", versionsQuery.refetch)}>Publish</Button>
                          <Button size="small" icon={<SendOutlined />} onClick={() => runAction(() => axiosInstance.post(`/api/admin/legal-documents/${selectedDoc.id}/versions/${record.id}/notify`), "Users notified")}>Notify</Button>
                          <Button size="small" onClick={() => runAction(() => axiosInstance.get(`/api/admin/legal-documents/versions/${record.id}/acceptances`), "Acceptances loaded")}>Acceptances</Button>
                          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => runAction(() => axiosInstance.delete(`/api/admin/legal-documents/${selectedDoc.id}/versions/${record.id}`), "Version deleted", versionsQuery.refetch)} />
                        </Space>
                      )}
                    />
                  </Table>
                )}
              </Card>
            ),
          },
          {
            key: "compliance",
            label: "Compliance",
            children: (
              <Card loading={complianceQuery.isLoading}>
                <Descriptions bordered column={1} size="small">
                  {Object.entries(compliance).map(([key, value]) => (
                    <Descriptions.Item key={key} label={key}>{String(value ?? "--")}</Descriptions.Item>
                  ))}
                </Descriptions>
              </Card>
            ),
          },
        ]}
      />

      <Modal title="Create Legal Document" open={docOpen} onOk={createDoc} confirmLoading={busy} onCancel={() => setDocOpen(false)} width={720}>
        <Form form={docForm} layout="vertical">
          <Form.Item name="title" label="Title" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="slug" label="Slug" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="version" label="Version"><Input placeholder="1.0" /></Form.Item>
          <Form.Item name="content" label="Content"><TextArea rows={8} /></Form.Item>
        </Form>
      </Modal>

      <Modal title="Create Document Version" open={versionOpen} onOk={createVersion} confirmLoading={busy} onCancel={() => setVersionOpen(false)} width={720}>
        <Form form={versionForm} layout="vertical">
          <Form.Item name="version" label="Version" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="title" label="Title"><Input /></Form.Item>
          <Form.Item name="content" label="Content"><TextArea rows={8} /></Form.Item>
          <Form.Item name="change_summary" label="Change Summary"><TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
