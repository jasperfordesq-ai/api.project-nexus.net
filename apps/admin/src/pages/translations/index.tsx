// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useCustom } from "@refinedev/core";
import { Card, Table, Typography, Spin, Tabs, Button, Space, message, Modal, Form, Input, Tag, Select, Row, Col, Statistic } from "antd";
import { PlusOutlined, UploadOutlined, SearchOutlined, EditOutlined, CheckOutlined, CloseOutlined } from "@ant-design/icons";
import { useState, useEffect, useMemo } from "react";
import axiosInstance from "../../utils/axios";
import { getErrorMessage } from "../../utils/errors";

const { Title } = Typography;

const LANGUAGES = [
  { label: "English (en)", value: "en" },
  { label: "Irish (ga)", value: "ga" },
  { label: "French (fr)", value: "fr" },
  { label: "Spanish (es)", value: "es" },
  { label: "German (de)", value: "de" },
  { label: "Polish (pl)", value: "pl" },
  { label: "Portuguese (pt)", value: "pt" },
];

export const TranslationsPage = () => {
  const [selectedLocale, setSelectedLocale] = useState("en");
  const [searchKey, setSearchKey] = useState("");
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [localeModalOpen, setLocaleModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [bulkForm] = Form.useForm();

  const { data: statsData, isLoading: statsLoading, refetch: refetchStats } = useCustom({
    url: "/api/admin/translations/stats",
    method: "get",
    queryOptions: { queryKey: ["admin-translations-stats"] },
  });

  const { data: translationsData, isLoading: translationsLoading, refetch: refetchTranslations } = useCustom({
    url: "/api/admin/translations",
    method: "get",
    config: { query: { locale: selectedLocale } },
    queryOptions: { queryKey: ["admin-translations-list", selectedLocale] },
  });

  const { data: missingData, isLoading: missingLoading, refetch: refetchMissing } = useCustom({
    url: "/api/admin/translations/missing",
    method: "get",
    config: { query: { locale: selectedLocale } },
    queryOptions: { queryKey: ["admin-translations-missing", selectedLocale] },
  });

  const rawStats = statsData?.data as any;
  const statsInfo = rawStats?.data || rawStats || {};
  const coverage = statsInfo.coverage || [];
  const supportedLocales = statsInfo.supported_locales || [];

  const rawTranslations = translationsData?.data as any;
  const translationsMap: Record<string, string> = rawTranslations?.translations || {};
  const translationsList = useMemo(() => {
    return Object.entries(translationsMap)
      .map(([key, value]) => ({ key, value: String(value) }))
      .filter((t) => !searchKey || t.key.toLowerCase().includes(searchKey.toLowerCase()) || t.value.toLowerCase().includes(searchKey.toLowerCase()));
  }, [translationsMap, searchKey]);

  const rawMissing = missingData?.data as any;
  const missingInfo = rawMissing?.data || rawMissing || {};
  const missingKeys: string[] = missingInfo.missing_keys || [];

  const handleInlineEdit = (key: string, currentValue: string) => {
    setEditingRow(key);
    setEditingValue(currentValue);
  };

  const handleInlineSave = async (key: string) => {
    try {
      setSaving(true);
      await axiosInstance.post("/api/admin/translations", {
        locale: selectedLocale,
        key,
        value: editingValue,
      });
      message.success("Translation saved");
      setEditingRow(null);
      refetchTranslations();
    } catch (err: unknown) {
      message.error(getErrorMessage(err, "Failed to save translation"));
    } finally {
      setSaving(false);
    }
  };

  const handleInlineCancel = () => {
    setEditingRow(null);
    setEditingValue("");
  };

  const handleAddLocale = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      await axiosInstance.post("/api/admin/translations/locales", values);
      message.success("Locale added");
      setLocaleModalOpen(false);
      form.resetFields();
      refetchStats();
    } catch (err: unknown) {
      message.error(getErrorMessage(err, "Failed to add locale"));
    } finally {
      setSaving(false);
    }
  };

  const handleBulkImport = async () => {
    try {
      const values = await bulkForm.validateFields();
      setSaving(true);
      const translations = JSON.parse(values.json);
      await axiosInstance.post("/api/admin/translations/bulk", {
        locale: values.locale,
        translations: Array.isArray(translations) ? translations : [],
      });
      message.success("Translations imported");
      setBulkModalOpen(false);
      bulkForm.resetFields();
      refetchTranslations();
      refetchStats();
      refetchMissing();
    } catch (err: unknown) {
      if (err instanceof SyntaxError) message.error("Invalid JSON format");
      else message.error(getErrorMessage(err, "Failed to import translations"));
    } finally {
      setSaving(false);
    }
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

      {/* Coverage stats */}
      {!statsLoading && supportedLocales.length > 0 && (
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card><Statistic title="Supported Locales" value={supportedLocales.length} /></Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card><Statistic title="Total Translations" value={statsInfo.total_translations ?? 0} /></Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card><Statistic title={`Keys in ${selectedLocale}`} value={translationsList.length} /></Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title={`Missing in ${selectedLocale}`}
                value={missingInfo.missing_count ?? missingKeys.length}
                valueStyle={{ color: missingKeys.length > 0 ? "#cf1322" : "#3f8600" }}
              />
            </Card>
          </Col>
        </Row>
      )}

      <Tabs items={[
        {
          key: "editor",
          label: "Key Editor",
          children: (
            <Card>
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={8}>
                  <Select
                    style={{ width: "100%" }}
                    value={selectedLocale}
                    onChange={(v) => setSelectedLocale(v)}
                    options={LANGUAGES}
                    placeholder="Select language"
                  />
                </Col>
                <Col span={16}>
                  <Input
                    prefix={<SearchOutlined />}
                    placeholder="Search by key or value..."
                    value={searchKey}
                    onChange={(e) => setSearchKey(e.target.value)}
                    allowClear
                  />
                </Col>
              </Row>
              {translationsLoading ? <Spin /> : (
                <Table
                  dataSource={translationsList}
                  rowKey="key"
                  size="small"
                  pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t: number) => `${t} keys` }}
                  locale={{ emptyText: "No translations found for this locale" }}
                >
                  <Table.Column dataIndex="key" title="Key" width="35%" ellipsis />
                  <Table.Column
                    dataIndex="value"
                    title="Value"
                    width="50%"
                    render={(value: string, record: any) => {
                      if (editingRow === record.key) {
                        return (
                          <Input
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onPressEnter={() => handleInlineSave(record.key)}
                            onKeyDown={(e) => { if (e.key === "Escape") handleInlineCancel(); }}
                            autoFocus
                            size="small"
                          />
                        );
                      }
                      return <span>{value}</span>;
                    }}
                  />
                  <Table.Column
                    title="Actions"
                    width="15%"
                    render={(_: any, record: any) => {
                      if (editingRow === record.key) {
                        return (
                          <Space>
                            <Button
                              size="small"
                              type="primary"
                              icon={<CheckOutlined />}
                              loading={saving}
                              onClick={() => handleInlineSave(record.key)}
                            />
                            <Button size="small" icon={<CloseOutlined />} onClick={handleInlineCancel} />
                          </Space>
                        );
                      }
                      return (
                        <Button
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => handleInlineEdit(record.key, record.value)}
                        >
                          Edit
                        </Button>
                      );
                    }}
                  />
                </Table>
              )}
            </Card>
          ),
        },
        {
          key: "coverage",
          label: "Coverage",
          children: statsLoading ? <Spin /> : (
            <Card>
              <Table dataSource={coverage} rowKey={(r: any) => r.locale} size="small" pagination={false}>
                <Table.Column dataIndex="locale" title="Locale" />
                <Table.Column dataIndex="count" title="Keys" render={(v: number) => v ?? 0} />
              </Table>
            </Card>
          ),
        },
        {
          key: "missing",
          label: <span>Missing Keys {missingKeys.length > 0 && <Tag color="orange">{missingKeys.length}</Tag>}</span>,
          children: missingLoading ? <Spin /> : (
            <Card>
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={8}>
                  <Select
                    style={{ width: "100%" }}
                    value={selectedLocale}
                    onChange={(v) => setSelectedLocale(v)}
                    options={LANGUAGES}
                  />
                </Col>
              </Row>
              {missingKeys.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: "#999" }}>
                  No missing keys for {selectedLocale}
                </div>
              ) : (
                <Table dataSource={missingKeys.map((k) => ({ key: k }))} rowKey="key" size="small" pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t: number) => `${t} missing` }}>
                  <Table.Column dataIndex="key" title="Missing Key" />
                </Table>
              )}
            </Card>
          ),
        },
      ]} />

      <Modal title="Add Locale" open={localeModalOpen} onOk={handleAddLocale} onCancel={() => { setLocaleModalOpen(false); form.resetFields(); }} confirmLoading={saving}>
        <Form form={form} layout="vertical">
          <Form.Item name="code" label="Locale Code" rules={[{ required: true, message: "Locale code is required" }]}><Input placeholder="e.g. fr, de, es" /></Form.Item>
          <Form.Item name="name" label="Display Name" rules={[{ required: true, message: "Display name is required" }]}><Input placeholder="e.g. French, German" /></Form.Item>
        </Form>
      </Modal>

      <Modal title="Bulk Import Translations" open={bulkModalOpen} onOk={handleBulkImport} onCancel={() => { setBulkModalOpen(false); bulkForm.resetFields(); }} confirmLoading={saving} width={600}>
        <Form form={bulkForm} layout="vertical">
          <Form.Item name="locale" label="Target Locale" rules={[{ required: true }]}>
            <Select options={LANGUAGES} placeholder="Select locale" />
          </Form.Item>
          <Form.Item name="json" label="Translations JSON" rules={[{ required: true, message: "JSON is required" }]}>
            <Input.TextArea rows={10} placeholder={'[{"key": "welcome", "value": "Bienvenue"}]'} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
