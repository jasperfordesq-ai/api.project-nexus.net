import { useCustom } from "@refinedev/core";
import { Card, Table, Typography, Row, Col, Statistic, Spin, Button, message, Tag } from "antd";
import dayjs from "dayjs";
import axiosInstance from "../../utils/axios";

const { Title } = Typography;

const statusColors: Record<string, string> = {
  pending: "orange",
  reviewing: "blue",
  resolved: "green",
  dismissed: "default",
};

export const ReportsPage = () => {
  const { data, isLoading, refetch } = useCustom({
    url: "/api/admin/reports",
    method: "get",
    config: { query: { page: 1, limit: 50 } },
  });

  const { data: statsData } = useCustom({
    url: "/api/admin/reports/stats",
    method: "get",
  });

  const reports = (data?.data as any)?.data || [];
  const stats = (statsData?.data as any)?.data || {};

  const handleReview = async (id: number) => {
    try {
      await axiosInstance.put(`/api/admin/reports/${id}/review`);
      message.success("Report marked as reviewing");
      refetch();
    } catch (err: any) {
      message.error(err?.response?.data?.message || "Failed to update");
    }
  };

  return (
    <div>
      <Title level={4}>Reports</Title>

      {Object.keys(stats).length > 0 && (
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          {Object.entries(stats).map(([key, value]) => (
            <Col span={6} key={key}>
              <Card>
                <Statistic title={key.replace(/_/g, " ")} value={typeof value === "number" ? value : String(value ?? 0)} />
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {isLoading ? (
        <Spin />
      ) : (
        <Card>
          <Table dataSource={reports} rowKey="id" size="small">
            <Table.Column dataIndex="id" title="ID" width={60} />
            <Table.Column dataIndex="content_type" title="Content Type" />
            <Table.Column dataIndex="reason" title="Reason" />
            <Table.Column
              dataIndex="status"
              title="Status"
              render={(s: string) => <Tag color={statusColors[s] || "default"}>{s}</Tag>}
            />
            <Table.Column dataIndex="reporter_name" title="Reporter" />
            <Table.Column
              dataIndex="created_at"
              title="Reported"
              render={(d: string) => (d ? dayjs(d).format("DD MMM YYYY") : "--")}
            />
            <Table.Column
              title="Actions"
              render={(_, r: any) => (
                r.status === "pending" ? (
                  <Button size="small" type="primary" onClick={() => handleReview(r.id)}>Review</Button>
                ) : null
              )}
            />
          </Table>
        </Card>
      )}
    </div>
  );
};
