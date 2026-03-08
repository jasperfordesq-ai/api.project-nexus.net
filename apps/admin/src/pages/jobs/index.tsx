import { useCustom } from "@refinedev/core";
import { Card, Table, Typography, Row, Col, Statistic, Spin, Button, Space, message, Tag, Select, Modal } from "antd";
import { StarOutlined, StarFilled } from "@ant-design/icons";
import dayjs from "dayjs";
import axiosInstance from "../../utils/axios";

const { Title } = Typography;

export const JobsAdminPage = () => {
  const { data, isLoading, refetch } = useCustom({ url: "/api/admin/jobs", method: "get", config: { query: { page: 1, limit: 50 } } });
  const { data: statsData } = useCustom({ url: "/api/admin/jobs/stats", method: "get" });

  const jobs = (data?.data as any)?.data || [];
  const stats = statsData?.data as any;

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await axiosInstance.put("/api/admin/jobs/" + id + "/status", { status });
      message.success("Status updated");
      refetch();
    } catch (err: any) { message.error(err?.response?.data?.message || "Failed"); }
  };

  const handleFeature = async (id: number) => {
    try {
      await axiosInstance.post("/api/admin/jobs/" + id + "/feature");
      message.success("Featured toggled");
      refetch();
    } catch (err: any) { message.error(err?.response?.data?.message || "Failed"); }
  };

  return (
    <div>
      <Title level={4}>Jobs Admin</Title>

      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          {Object.entries(stats).map(([key, value]) => (
            <Col span={6} key={key}><Card><Statistic title={key.replace(/_/g, " ")} value={typeof value === "number" ? value : String(value ?? 0)} /></Card></Col>
          ))}
        </Row>
      )}

      {isLoading ? <Spin /> : (
        <Card>
          <Table dataSource={jobs} rowKey="id" size="small">
            <Table.Column dataIndex="id" title="ID" width={60} />
            <Table.Column dataIndex="title" title="Title" />
            <Table.Column dataIndex="status" title="Status" render={(s: string) => (
              <Tag color={s === "active" ? "green" : s === "closed" ? "red" : "default"}>{s}</Tag>
            )} />
            <Table.Column dataIndex="is_featured" title="Featured" render={(v: boolean) => v ? <StarFilled style={{ color: "#faad14" }} /> : <StarOutlined />} />
            <Table.Column dataIndex="created_at" title="Created" render={(d: string) => d ? dayjs(d).format("DD MMM YYYY") : "—"} />
            <Table.Column title="Actions" render={(_, r: any) => (
              <Space>
                <Select size="small" value={r.status} style={{ width: 100 }} onChange={(v) => handleStatusChange(r.id, v)}
                  options={[
                    { label: "Active", value: "active" },
                    { label: "Closed", value: "closed" },
                    { label: "Draft", value: "draft" },
                  ]} />
                <Button size="small" onClick={() => handleFeature(r.id)}>{r.is_featured ? "Unfeature" : "Feature"}</Button>
              </Space>
            )} />
          </Table>
        </Card>
      )}
    </div>
  );
};
