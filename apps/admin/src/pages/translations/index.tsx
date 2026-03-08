import { useCustom } from "@refinedev/core";
import { Card, Table, Typography, Spin, Tabs, Button, Space, message, Modal, Form, Input, Tag } from "antd";
import { PlusOutlined, UploadOutlined } from "@ant-design/icons";
import { useState } from "react";
import axiosInstance from "../../utils/axios";

const { Title } = Typography;

export const TranslationsPage = () => {
  const { data: statsData, isLoading: statsLoading } = useCustom({ url: "/api/admin/translations/stats", method: "get" });
  const { data: missingData, isLoading: missingLoading } = useCustom({ url: "/api/admin/translations/missing", method: "get" });

  const rawStats = statsData?.data as any;
  const statsEntries = rawStats ? (Array.isArray(rawStats) ? rawStats : rawStats.data || []) : [];
  const missing = Array.isArray(missingData?.data) ? missingData.data : (missingData?.data as any)?.data || [];

  const [localeModalOpen, setLocaleModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [bulkForm] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const handleAddLocale = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      await axiosInstance.post("/api/admin/translations/locales", values);
      message.success("Locale added");
      setLocaleModalOpen(false);
      form.resetFields();
    } catch (err: any) { if (err?.response) message.error(err.response.data?.message || "Failed"); }
    finally { setSaving(false); }
  };

  const handleBulkImport = async () => {
    try {
      const values = await bulkForm.validateFields();
      setSaving(true);
      const translations = JSON.parse(values.json);
      await axiosInstance.post("/api/admin/translations/bulk", { translations });
      message.success("Translations imported");
      setBulkModalOpen(false);
      bulkForm.resetFields();
    } catch (err: any) {
      if (err instanceof SyntaxError) message.error("Invalid JSON");
      else if (err?.response) message.error(err.response.data?.message || "Failed");
    } finally { setSaving(false); }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <Title level={4}>Translations</Title>
        <Space>
          <Button icon={<PlusOutlined />} onClick={() => setLocaleModalOpen(true)}>Add Locale</Button>
          <Button type="primary" icon={<UploadOutlined />} onClick={() => setBulkModalOpen(true)}>Bulk Import</Button>
        </Space>
      </div>

      <Tabs items={[
        {
          key: "coverage",
          label: "Coverage",
          children: statsLoading ? <Spin /> : (
            <Card>
              <Table dataSource={statsEntries} rowKey={(r: any) => r.locale || r.code} size="small">
                <Table.Column dataIndex="locale" title="Locale" />
                <Table.Column dataIndex="coverage" title="Coverage" />
                <Table.Column dataIndex="total_keys" title="Total Keys" />
                <Table.Column dataIndex="translated" title="Translated" />
              </Table>
            </Card>
          ),
        },
        {
          key: "missing",
          label: <span>Missing Keys {missing.length > 0 && <Tag color="orange">{missing.length}</Tag>}</span>,
          children: missingLoading ? <Spin /> : (
            <Card>
              <Table dataSource={missing} rowKey={(r: any) => r.key || String(r)} size="small">
                <Table.Column title="Key" render={(_, r: any) => r.key || (typeof r === "string" ? r : "—")} />
                <Table.Column dataIndex="locale" title="Missing In" />
              </Table>
            </Card>
          ),
        },
      ]} />

      <Modal title="Add Locale" open={localeModalOpen} onOk={handleAddLocale} onCancel={() => setLocaleModalOpen(false)} confirmLoading={saving}>
        <Form form={form} layout="vertical">
          <Form.Item name="code" label="Locale Code" rules={[{ required: true }]}><Input placeholder="e.g. fr, de, es" /></Form.Item>
          <Form.Item name="name" label="Display Name"><Input placeholder="e.g. French, German" /></Form.Item>
        </Form>
      </Modal>

      <Modal title="Bulk Import Translations" open={bulkModalOpen} onOk={handleBulkImport} onCancel={() => setBulkModalOpen(false)} confirmLoading={saving} width={600}>
        <Form form={bulkForm} layout="vertical">
          <Form.Item name="json" label="Translations JSON" rules={[{ required: true }]}>
            <Input.TextArea rows={10} placeholder={'[{"key": "welcome", "locale": "fr", "value": "Bienvenue"}]'} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
