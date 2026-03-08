import { useCustom } from "@refinedev/core";
import { Card, Table, Typography, Row, Col, Statistic, Spin, Button, Space, message, Tag, Modal } from "antd";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import axiosInstance from "../../utils/axios";

const { Title } = Typography;

export const EventsAdminPage = () => {
  const { data, isLoading, refetch } = useCustom({ url: "/api/admin/events", method: "get", config: { query: { page: 1, limit: 50 } } });
  const { data: statsData } = useCustom({ url: "/api/admin/events/stats", method: "get" });

  const events = (data?.data as any)?.data || [];
  const stats = statsData?.data as any;

  const handleCancel = (id: number) => {
    Modal.confirm({
      title: "Cancel Event",
      icon: <ExclamationCircleOutlined />,
      content: "This will cancel the event and notify attendees. Continue?",
      okText: "Cancel Event",
      okType: "danger",
      onOk: async () => {
        try {
          await axiosInstance.put(`/api/admin/events/${id}/cancel`);
          message.success("Event cancelled");
          refetch();
        } catch (err: any) { message.error(err?.response?.data?.message || "Failed"); }
      },
    });
  };

  const handleDelete = (id: number) => {
    Modal.confirm({
      title: "Delete Event",
      icon: <ExclamationCircleOutlined />,
      content: "This will permanently delete the event and all RSVPs. This cannot be undone.",
      okText: "Delete",
      okType: "danger",
      onOk: async () => {
        try {
          await axiosInstance.delete(`/api/admin/events/${id}`);
          message.success("Event deleted");
          refetch();
        } catch (err: any) { message.error(err?.response?.data?.message || "Failed"); }
      },
    });
  };

  return (
    <div>
      <Title level={4}>Events Management</Title>
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          {Object.entries(stats).map(([key, value]) => (
            <Col span={6} key={key}><Card><Statistic title={key.replace(/_/g, " ")} value={typeof value === "number" ? value : String(value ?? 0)} /></Card></Col>
          ))}
        </Row>
      )}
      {isLoading ? <Spin /> : (
        <Card>
          <Table dataSource={events} rowKey="id" size="small">
            <Table.Column dataIndex="id" title="ID" width={60} />
            <Table.Column dataIndex="title" title="Title" />
            <Table.Column dataIndex="status" title="Status" render={(s: string) => <Tag color={s === "cancelled" ? "red" : s === "active" ? "green" : "default"}>{s}</Tag>} />
            <Table.Column dataIndex="start_date" title="Start" render={(d: string) => d ? dayjs(d).format("DD MMM YYYY HH:mm") : "—"} />
            <Table.Column dataIndex="rsvp_count" title="RSVPs" />
            <Table.Column title="Actions" render={(_, r: any) => (
              <Space>
                {r.status !== "cancelled" && <Button size="small" onClick={() => handleCancel(r.id)}>Cancel</Button>}
                <Button size="small" danger onClick={() => handleDelete(r.id)}>Delete</Button>
              </Space>
            )} />
          </Table>
        </Card>
      )}
    </div>
  );
};
