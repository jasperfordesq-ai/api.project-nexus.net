import { useState } from "react";
import { useCustom } from "@refinedev/core";
import { Card, Table, Typography, Input, Select, Space, Spin, Tag, Button, Modal, Form, message, Tabs } from "antd";
import { FlagOutlined, PlusOutlined } from "@ant-design/icons";
import { StatusTag } from "../../components/common/status-tag";
import dayjs from "dayjs";
import axiosInstance from "../../utils/axios";

const { Title } = Typography;

export const CrmPage = () => {
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteUserId, setNoteUserId] = useState<number | null>(null);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("search");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data, isLoading, refetch } = useCustom({
    url: "/api/admin/crm/users/search",
    method: "get",
    config: { query: { page, limit: pageSize, ...filters } },
  });

  const { data: flaggedData, isLoading: flaggedLoading } = useCustom({
    url: "/api/admin/crm/flagged-notes",
    method: "get",
  });

  const raw = data?.data as any;
  const users = raw?.data || raw?.items || [];
  const totalCount = raw?.total || raw?.totalCount || users.length;
  const flaggedNotes = Array.isArray(flaggedData?.data) ? flaggedData.data : (flaggedData?.data as any)?.data || [];

  const updateFilter = (key: string, value: any) => {
    const f = { ...filters, [key]: value || undefined };
    Object.keys(f).forEach(k => f[k] === undefined && delete f[k]);
    setFilters(f);
  };

  const handleAddNote = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      await axiosInstance.post(`/api/admin/crm/users/${noteUserId}/notes`, values);
      message.success("Note added");
      setNoteModalOpen(false);
      form.resetFields();
    } catch (err: any) {
      if (err?.response) message.error(err.response.data?.message || "Failed to add note");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Title level={4}>CRM</Title>

      <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
        {
          key: "search",
          label: "User Search",
          children: (
            <>
              <Space style={{ marginBottom: 16 }} wrap>
                <Input.Search placeholder="Search..." style={{ width: 200 }} onSearch={(v) => { updateFilter("search", v); refetch(); }} allowClear />
                <Select placeholder="Role" allowClear style={{ width: 130 }} onChange={(v) => { updateFilter("role", v); refetch(); }}
                  options={[{ label: "Admin", value: "admin" }, { label: "Member", value: "member" }]} />
                <Select placeholder="Status" allowClear style={{ width: 130 }} onChange={(v) => { updateFilter("active", v); refetch(); }}
                  options={[{ label: "Active", value: "true" }, { label: "Inactive", value: "false" }]} />
              </Space>

              {isLoading ? <Spin /> : (
                <Card>
                  <Table
                    dataSource={users}
                    rowKey="id"
                    size="small"
                    pagination={{
                      current: page,
                      pageSize,
                      total: totalCount,
                      showSizeChanger: true,
                      showTotal: (t) => `${t} users`,
                      onChange: (p, ps) => { setPage(p); setPageSize(ps); },
                    }}
                  >
                    <Table.Column dataIndex="id" title="ID" width={60} />
                    <Table.Column dataIndex="email" title="Email" />
                    <Table.Column title="Name" render={(_, r: any) => `${r.first_name || ""} ${r.last_name || ""}`.trim() || "—"} />
                    <Table.Column dataIndex="role" title="Role" render={(r: string) => <StatusTag status={r} />} />
                    <Table.Column dataIndex="xp" title="XP" />
                    <Table.Column dataIndex="warnings_count" title="Warnings" render={(v: number) => v > 0 ? <Tag color="red">{v}</Tag> : "0"} />
                    <Table.Column title="Actions" render={(_, record: any) => (
                      <Button size="small" icon={<PlusOutlined />} onClick={() => { setNoteUserId(record.id); setNoteModalOpen(true); }}>Note</Button>
                    )} />
                  </Table>
                </Card>
              )}
            </>
          ),
        },
        {
          key: "flagged",
          label: <>Flagged Notes {flaggedNotes.length > 0 && <Tag color="red">{flaggedNotes.length}</Tag>}</>,
          children: flaggedLoading ? <Spin /> : (
            <Card>
              <Table dataSource={flaggedNotes} rowKey="id" size="small">
                <Table.Column dataIndex="id" title="ID" width={60} />
                <Table.Column dataIndex="user_id" title="User ID" width={80} />
                <Table.Column dataIndex="category" title="Category" />
                <Table.Column dataIndex="content" title="Note" ellipsis />
                <Table.Column dataIndex="created_at" title="Created" render={(d: string) => d ? dayjs(d).format("DD MMM YYYY") : "—"} />
              </Table>
            </Card>
          ),
        },
      ]} />

      <Modal title={`Add Note for User #${noteUserId}`} open={noteModalOpen} onOk={handleAddNote} onCancel={() => setNoteModalOpen(false)} confirmLoading={saving}>
        <Form form={form} layout="vertical">
          <Form.Item name="content" label="Note" rules={[{ required: true }]}><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="category" label="Category"><Input placeholder="e.g. follow-up, complaint, feedback" /></Form.Item>
          <Form.Item name="flagged" label="Flag this note?" valuePropName="checked" initialValue={false}>
            <Select options={[{ label: "No", value: false }, { label: "Yes - Flagged", value: true }]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
