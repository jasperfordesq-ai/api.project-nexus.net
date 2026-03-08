import { useCustom } from "@refinedev/core";
import { Card, Table, Typography, Row, Col, Statistic, Spin, Tabs, Tag, Button, Space, message } from "antd";
import { StatusTag } from "../../components/common/status-tag";
import dayjs from "dayjs";
import axiosInstance from "../../utils/axios";

const { Title } = Typography;

export const BrokerPage = () => {
  const { data: assignmentsData, isLoading, refetch } = useCustom({ url: "/api/admin/broker/assignments", method: "get" });
  const { data: statsData } = useCustom({ url: "/api/admin/broker/stats", method: "get" });
  const { data: brokersData } = useCustom({ url: "/api/admin/broker/brokers", method: "get" });

  const assignments = (assignmentsData?.data as any)?.data || [];
  const stats = statsData?.data as any;
  const brokers = Array.isArray(brokersData?.data) ? brokersData.data : (brokersData?.data as any)?.data || [];

  const handleComplete = async (id: number) => {
    try {
      await axiosInstance.put(`/api/admin/broker/assignments/${id}/complete`);
      message.success("Assignment completed");
      refetch();
    } catch (err: any) { message.error(err?.response?.data?.message || "Failed"); }
  };

  return (
    <div>
      <Title level={4}>Broker Management</Title>

      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col span={6}><Card><Statistic title="Total Assignments" value={stats.total_assignments ?? 0} /></Card></Col>
          <Col span={6}><Card><Statistic title="Active" value={stats.active_assignments ?? 0} /></Card></Col>
          <Col span={6}><Card><Statistic title="Completed" value={stats.completed_assignments ?? 0} /></Card></Col>
          <Col span={6}><Card><Statistic title="Active Brokers" value={stats.active_brokers ?? brokers.length} /></Card></Col>
        </Row>
      )}

      <Tabs items={[
        {
          key: "assignments",
          label: "Assignments",
          children: isLoading ? <Spin /> : (
            <Card>
              <Table dataSource={assignments} rowKey="id" size="small">
                <Table.Column dataIndex="id" title="ID" width={60} />
                <Table.Column dataIndex="broker_id" title="Broker ID" width={80} />
                <Table.Column dataIndex="member_id" title="Member ID" width={80} />
                <Table.Column dataIndex="status" title="Status" render={(s: string) => <StatusTag status={s} />} />
                <Table.Column dataIndex="created_at" title="Created" render={(d: string) => d ? dayjs(d).format("DD MMM YYYY") : "—"} />
                <Table.Column title="Actions" render={(_, r: any) => (
                  <Space>
                    {r.status !== "completed" && <Button size="small" onClick={() => handleComplete(r.id)}>Complete</Button>}
                  </Space>
                )} />
              </Table>
            </Card>
          ),
        },
        {
          key: "brokers",
          label: "Brokers",
          children: (
            <Card>
              <Table dataSource={brokers} rowKey="id" size="small">
                <Table.Column dataIndex="id" title="ID" width={60} />
                <Table.Column dataIndex="email" title="Email" />
                <Table.Column title="Name" render={(_, r: any) => `${r.first_name || ""} ${r.last_name || ""}`.trim() || "—"} />
              </Table>
            </Card>
          ),
        },
      ]} />
    </div>
  );
};
