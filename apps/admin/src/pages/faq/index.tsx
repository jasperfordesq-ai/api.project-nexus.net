import { useState } from "react";
import { useCustom } from "@refinedev/core";
import { Card, Table, Typography, Spin, Button, Space, message, Switch, Modal, Input, Form } from "antd";
import { PlusOutlined, DeleteOutlined, EditOutlined } from "@ant-design/icons";
import axiosInstance from "../../utils/axios";

const { Title } = Typography;
const { TextArea } = Input;

export const FaqPage = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading, refetch } = useCustom({
    url: "/api/faqs",
    method: "get",
  });

  const faqs = (data?.data as any)?.data || [];

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editingId) {
        await axiosInstance.put(`/api/faqs/${editingId}`, values);
        message.success("FAQ updated");
      } else {
        await axiosInstance.post("/api/faqs", values);
        message.success("FAQ created");
      }
      setModalOpen(false);
      setEditingId(null);
      form.resetFields();
      refetch();
    } catch (err: any) {
      if (err?.response) {
        message.error(err?.response?.data?.message || "Failed to save");
      }
    }
  };

  const handleEdit = (record: any) => {
    setEditingId(record.id);
    form.setFieldsValue(record);
    setModalOpen(true);
  };

  const handleDelete = (id: number) => {
    Modal.confirm({
      title: "Delete FAQ",
      content: "Are you sure you want to delete this FAQ?",
      okType: "danger",
      onOk: async () => {
        try {
          await axiosInstance.delete(`/api/faqs/${id}`);
          message.success("FAQ deleted");
          refetch();
        } catch (err: any) {
          message.error(err?.response?.data?.message || "Failed to delete");
        }
      },
    });
  };

  const handlePublishToggle = async (id: number, checked: boolean) => {
    try {
      await axiosInstance.put(`/api/faqs/${id}`, { is_published: checked });
      message.success(checked ? "Published" : "Unpublished");
      refetch();
    } catch (err: any) {
      message.error(err?.response?.data?.message || "Failed to update");
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>FAQ Management</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingId(null); form.resetFields(); setModalOpen(true); }}>
          Add FAQ
        </Button>
      </div>

      {isLoading ? (
        <Spin />
      ) : (
        <Card>
          <Table dataSource={faqs} rowKey="id" size="small">
            <Table.Column dataIndex="id" title="ID" width={60} />
            <Table.Column dataIndex="question" title="Question" />
            <Table.Column dataIndex="category" title="Category" />
            <Table.Column dataIndex="sort_order" title="Sort Order" width={100} />
            <Table.Column
              dataIndex="is_published"
              title="Published"
              width={100}
              render={(v: boolean, r: any) => (
                <Switch checked={v} onChange={(checked) => handlePublishToggle(r.id, checked)} size="small" />
              )}
            />
            <Table.Column
              title="Actions"
              width={120}
              render={(_, r: any) => (
                <Space>
                  <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(r)} />
                  <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(r.id)} />
                </Space>
              )}
            />
          </Table>
        </Card>
      )}

      <Modal
        title={editingId ? "Edit FAQ" : "Add FAQ"}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => { setModalOpen(false); setEditingId(null); form.resetFields(); }}
        okText={editingId ? "Update" : "Create"}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="question" label="Question" rules={[{ required: true, message: "Question is required" }]}>
            <Input />
          </Form.Item>
          <Form.Item name="answer" label="Answer" rules={[{ required: true, message: "Answer is required" }]}>
            <TextArea rows={4} />
          </Form.Item>
          <Form.Item name="category" label="Category">
            <Input />
          </Form.Item>
          <Form.Item name="sort_order" label="Sort Order">
            <Input type="number" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
