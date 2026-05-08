// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useCustom } from "@refinedev/core";
import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Alert, Button, Card, Col, Descriptions, Empty, Form, Input, Modal, Row, Space, Statistic, Table, Tag, Tooltip, Typography, message } from "antd";
import { CopyOutlined, DeleteOutlined, DownloadOutlined, EditOutlined, EyeOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import axiosInstance from "../../utils/axios";
import { getErrorMessage } from "../../utils/errors";

const { Title, Text } = Typography;

type CompatAdminPageProps = {
  title: string;
  apiPath: string;
  description?: string;
  createPath?: string;
  updatePath?: string;
  deletePath?: string;
};

const hiddenKeys = new Set(["success", "status_code", "timestamp", "message"]);

const humanize = (key: string) => key.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

const unwrap = (payload: any): any => {
  if (payload?.data && !Array.isArray(payload.data) && payload.data.data) return payload.data;
  return payload;
};

const extractRows = (payload: any): any[] => {
  const raw = unwrap(payload);
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.items)) return raw.items;
  if (Array.isArray(raw?.results)) return raw.results;
  return [];
};

const extractNumericStats = (payload: any): Record<string, number> => {
  const raw = unwrap(payload);
  const source = raw?.stats || raw?.summary || raw?.data || raw;
  if (!source || Array.isArray(source) || typeof source !== "object") return {};
  return Object.fromEntries(
    Object.entries(source).filter(([key, value]) => !hiddenKeys.has(key) && typeof value === "number"),
  ) as Record<string, number>;
};

const renderValue = (value: any) => {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return <Tag color={value ? "success" : "default"}>{value ? "Yes" : "No"}</Tag>;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) return new Date(value).toLocaleString();
  if (typeof value === "string" && ["active", "approved", "published", "enabled", "healthy", "resolved", "completed"].includes(value.toLowerCase())) return <Tag color="green">{value}</Tag>;
  if (typeof value === "string" && ["pending", "draft", "reviewing", "scheduled", "warning"].includes(value.toLowerCase())) return <Tag color="orange">{value}</Tag>;
  if (typeof value === "string" && ["rejected", "disabled", "failed", "error", "critical", "hidden"].includes(value.toLowerCase())) return <Tag color="red">{value}</Tag>;
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const columnsFor = (rows: any[]) => {
  const keys = Array.from(new Set(rows.flatMap((row) => Object.keys(row || {})))).filter((key) => !hiddenKeys.has(key)).slice(0, 10);
  return keys.map((key) => ({
    title: humanize(key),
    dataIndex: key,
    key,
    ellipsis: true,
    render: renderValue,
  }));
};

const tryFormatJson = (value: any) => {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return "{}";
  }
};

export const CompatAdminPage = ({ title, apiPath, description, createPath, updatePath, deletePath }: CompatAdminPageProps) => {
  const params = useParams();
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [detail, setDetail] = useState<any>(null);
  const [mutating, setMutating] = useState(false);
  const [mutation, setMutation] = useState<{ mode: "create" | "update" | "delete"; row?: any } | null>(null);
  const [form] = Form.useForm();

  const resolvePath = (template: string, row?: any) => {
    let resolved = template;
    for (const [key, value] of Object.entries(params)) {
      resolved = resolved.replace(`:${key}`, encodeURIComponent(String(value ?? "")));
    }
    if (row?.id !== undefined && !resolved.includes(String(row.id)) && (resolved.endsWith("/:id") || resolved.includes("{id}"))) {
      resolved = resolved.replace(":id", encodeURIComponent(String(row.id))).replace("{id}", encodeURIComponent(String(row.id)));
    }
    return resolved;
  };

  const resolvedApiPath = useMemo(() => resolvePath(apiPath), [apiPath, params]);
  const resolvedCreatePath = useMemo(() => resolvePath(createPath || apiPath), [createPath, apiPath, params]);

  const { data, isLoading, isError, error, refetch } = useCustom({
    url: resolvedApiPath,
    method: "get",
    config: { query: submittedSearch ? { search: submittedSearch } : undefined },
    queryOptions: { queryKey: ["compat-admin", resolvedApiPath, submittedSearch] },
  });

  const payload = data?.data as any;
  const rows = extractRows(payload);
  const stats = extractNumericStats(payload);
  const raw = unwrap(payload);
  const hasRows = rows.length > 0;
  const detailEntries = raw && typeof raw === "object" && !Array.isArray(raw)
    ? Object.entries(raw).filter(([key, value]) => !hiddenKeys.has(key) && !Array.isArray(value) && typeof value !== "object")
    : [];
  const objectSections = raw && typeof raw === "object" && !Array.isArray(raw)
    ? Object.entries(raw).filter(([key, value]) => !hiddenKeys.has(key) && value && typeof value === "object")
    : [];

  const openMutation = (mode: "create" | "update" | "delete", row?: any) => {
    setMutation({ mode, row });
    form.setFieldsValue({ payload: mode === "delete" ? "{}" : tryFormatJson(row || {}) });
  };

  const runMutation = async () => {
    if (!mutation) return;
    setMutating(true);
    try {
      const values = await form.validateFields();
      const payload = values.payload ? JSON.parse(values.payload) : {};
      const row = mutation.row;
      const defaultRowPath = row?.id !== undefined ? `${resolvedApiPath}/${row.id}` : resolvedApiPath;
      const path = mutation.mode === "create"
        ? resolvePath(createPath || resolvedApiPath, row)
        : mutation.mode === "update"
          ? resolvePath(updatePath || defaultRowPath, row)
          : resolvePath(deletePath || defaultRowPath, row);

      if (mutation.mode === "create") await axiosInstance.post(path, payload);
      if (mutation.mode === "update") await axiosInstance.put(path, payload);
      if (mutation.mode === "delete") await axiosInstance.delete(path, { data: payload });

      message.success(`${humanize(mutation.mode)} succeeded`);
      setMutation(null);
      form.resetFields();
      refetch();
    } catch (err: unknown) {
      message.error(getErrorMessage(err, `${humanize(mutation.mode)} failed`));
    } finally {
      setMutating(false);
    }
  };

  const loadDetail = async (row: any) => {
    if (!row?.id) {
      setDetail(row);
      return;
    }
    try {
      const res = await axiosInstance.get(`${resolvedApiPath}/${row.id}`);
      setDetail((res.data as any)?.data || res.data || row);
    } catch {
      setDetail(row);
    }
  };

  const copyJson = async (value: any) => {
    try {
      await navigator.clipboard.writeText(tryFormatJson(value));
      message.success("JSON copied");
    } catch {
      message.error("Could not copy JSON");
    }
  };

  const downloadJson = () => {
    const blob = new Blob([tryFormatJson(raw)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "admin-data"}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const tableColumns = [
    ...columnsFor(rows),
    {
      title: "Actions",
      key: "_actions",
      width: 180,
      fixed: "right" as const,
      render: (_: unknown, row: any) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => loadDetail(row)} />
          <Button size="small" icon={<EditOutlined />} onClick={() => openMutation("update", row)} />
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => openMutation("delete", row)} />
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ width: "100%", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <Title level={4} style={{ marginBottom: 0 }}>{title}</Title>
          {description && <Text type="secondary">{description}</Text>}
          <div><Text type="secondary" code>{resolvedApiPath}</Text></div>
        </div>
        <Space>
          <Input
            allowClear
            placeholder="Search"
            value={search}
            prefix={<SearchOutlined />}
            onChange={(event) => setSearch(event.target.value)}
            onPressEnter={() => setSubmittedSearch(search.trim())}
            style={{ width: 220 }}
          />
          <Button onClick={() => setSubmittedSearch(search.trim())}>Search</Button>
          <Tooltip title={resolvedCreatePath}>
            <Button icon={<PlusOutlined />} type="primary" onClick={() => openMutation("create")}>Create</Button>
          </Tooltip>
          <Button icon={<CopyOutlined />} onClick={() => copyJson(raw)}>Copy JSON</Button>
          <Button icon={<DownloadOutlined />} onClick={downloadJson}>Export</Button>
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>Refresh</Button>
        </Space>
      </Space>

      {Object.keys(stats).length > 0 && (
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          {Object.entries(stats).slice(0, 8).map(([key, value]) => (
            <Col xs={24} sm={12} lg={6} key={key}>
              <Card><Statistic title={humanize(key)} value={value} /></Card>
            </Col>
          ))}
        </Row>
      )}

      {isError && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="This V1.5 admin surface is routed, but the backing endpoint did not return successfully."
          description={(error as any)?.message || "Check the ASP.NET admin compatibility endpoint for this workflow."}
        />
      )}

      <Card>
        {hasRows ? (
          <Table
            loading={isLoading}
            dataSource={rows.map((row, index) => ({ ...row, _rowKey: row.id ?? row.key ?? index }))}
            rowKey="_rowKey"
            size="small"
            columns={tableColumns}
            scroll={{ x: "max-content" }}
            pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (total) => `${total} total` }}
          />
        ) : detailEntries.length > 0 ? (
          <Space direction="vertical" style={{ width: "100%" }} size={16}>
            <Descriptions bordered column={1} size="small">
              {detailEntries.map(([key, value]) => (
                <Descriptions.Item key={key} label={humanize(key)}>{renderValue(value)}</Descriptions.Item>
              ))}
            </Descriptions>
            {objectSections.slice(0, 4).map(([key, value]) => (
              <Card key={key} size="small" title={humanize(key)}>
                {Array.isArray(value) ? (
                  <Table
                    dataSource={(value as any[]).map((row, index) => ({ ...row, _rowKey: row?.id ?? index }))}
                    rowKey="_rowKey"
                    size="small"
                    columns={columnsFor(value as any[])}
                    pagination={false}
                    scroll={{ x: "max-content" }}
                  />
                ) : (
                  <pre style={{ maxHeight: 240, overflow: "auto", background: "#f5f5f5", padding: 12 }}>{tryFormatJson(value)}</pre>
                )}
              </Card>
            ))}
          </Space>
        ) : (
          <Empty description={isLoading ? "Loading..." : "No records returned"} />
        )}
      </Card>

      <Modal
        title={detail ? `${title} Detail` : ""}
        open={!!detail}
        onCancel={() => setDetail(null)}
        footer={<Button onClick={() => setDetail(null)}>Close</Button>}
        width={900}
      >
        <pre style={{ maxHeight: 520, overflow: "auto", background: "#f5f5f5", padding: 12 }}>{tryFormatJson(detail)}</pre>
      </Modal>

      <Modal
        title={mutation ? `${humanize(mutation.mode)} ${title}` : ""}
        open={!!mutation}
        onOk={runMutation}
        confirmLoading={mutating}
        onCancel={() => setMutation(null)}
        width={760}
        okText={mutation?.mode === "delete" ? "Delete" : "Save"}
        okButtonProps={{ danger: mutation?.mode === "delete" }}
      >
        <Alert
          type={mutation?.mode === "delete" ? "warning" : "info"}
          showIcon
          style={{ marginBottom: 16 }}
          message="Advanced compatibility action"
          description="Payload is JSON so this route can support V1.5 admin workflows before a bespoke form is built."
        />
        <Form form={form} layout="vertical">
          <Form.Item
            name="payload"
            label="JSON payload"
            rules={[{
              validator: (_, value) => {
                try {
                  if (value) JSON.parse(value);
                  return Promise.resolve();
                } catch {
                  return Promise.reject(new Error("Payload must be valid JSON"));
                }
              },
            }]}
          >
            <Input.TextArea rows={14} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
