import { useCustom } from "@refinedev/core";
import { Card, Table, Typography, Row, Col, Statistic, Spin, Tabs, Button, Space, message, Tag, Modal } from "antd";
import { CheckOutlined, CloseOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import { StatusTag } from "../../components/common/status-tag";
import dayjs from "dayjs";
import axiosInstance from "../../utils/axios";

const { Title } = Typography;

export const VettingPage = () => {
  const { data: recordsData, isLoading, refetch } = useCustom({ url: "/api/admin/vetting/records", method: "get", config: { query: { page: 1, limit: 50 } } });
  const { data: statsData } = useCustom({ url: "/api/admin/vetting/stats", method: "get" });
  const { data: expiringData } = useCustom({ url: "/api/admin/vetting/expiring", method: "get" });
  const { data: pendingData } = useCustom({ url: "/api/admin/vetting/pending", method: "get" });

  const records = (recordsData?.data as any)?.data || [];
  const stats = statsData?.data as any;
  const expiring = Array.isArray(expiringData?.data) ? expiringData.data : (expiringData?.data as any)?.data || [];
  const pending = Array.isArray(pendingData?.data) ? pendingData.data : (pendingData?.data as any)?.data || [];

  const handleVerify = async (id: number) => {
    try {
      await axiosInstance.put("/api/admin/vetting/records/" + id + "/verify");
      message.success("Record verified");
      refetch();
    } catch (err: any) { message.error(err?.response?.data?.message || "Failed"); }
  };

  const handleReject = async (id: number) => {
    try {
      await axiosInstance.put("/api/admin/vetting/records/" + id + "/reject", { notes: "Did not meet requirements" });
      message.success("Record rejected");
      refetch();
    } catch (err: any) { message.error(err?.response?.data?.message || "Failed"); }
  };

  const vettingColumns = [
    { dataIndex: "id", title: "ID", width: 60 },
    { dataIndex: "user_id", title: "User ID", width: 80 },
    { dataIndex: "type", title: "Type" },
    { dataIndex: "status", title: "Status", render: (s: string) => <StatusTag status={s} /> },
    { dataIndex: "expiry_date", title: "Expiry", render: (d: string) => d ? dayjs(d).format("DD MMM YYYY") : "—" },
  ];

  return (
    <div>
      <Title level={4}>Vetting (DBS Records)</Title>

      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          {Object.entries(stats).map(([key, value]) => (
            <Col span={6} key={key}><Card><Statistic title={key.replace(/_/g, " ")} value={typeof value === "number" ? value : String(value ?? 0)} /></Card></Col>
          ))}
        </Row>
      )}

      <Tabs items={[
        {
          key: "all",
          label: "All Records",
          children: isLoading ? <Spin /> : (
            <Card>
              <Table dataSource={records} rowKey="id" size="small" columns={[
                ...vettingColumns,
                {
                  title: "Actions",
                  render: (_: any, r: any) => (
                    <Space>
                      {r.status === "pending" && <>
                        <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => handleVerify(r.id)}>Verify</Button>
                        <Button size="small" danger icon={<CloseOutlined />} onClick={() => handleReject(r.id)}>Reject</Button>
                      </>}
                    </Space>
                  ),
                },
              ]} />
            </Card>
          ),
        },
        {
          key: "pending",
          label: <span>Pending {pending.length > 0 && <Tag color="orange">{pending.length}</Tag>}</span>,
          children: (
            <Card>
              <Table dataSource={pending} rowKey="id" size="small" columns={[
                ...vettingColumns,
                {
                  title: "Actions",
                  render: (_: any, r: any) => (
                    <Space>
                      <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => handleVerify(r.id)}>Verify</Button>
                      <Button size="small" danger icon={<CloseOutlined />} onClick={() => handleReject(r.id)}>Reject</Button>
                    </Space>
                  ),
                },
              ]} />
            </Card>
          ),
        },
        {
          key: "expiring",
          label: <span>Expiring {expiring.length > 0 && <Tag color="red">{expiring.length}</Tag>}</span>,
          children: (
            <Card>
              <Table dataSource={expiring} rowKey="id" size="small" columns={vettingColumns} />
            </Card>
          ),
        },
      ]} />
    </div>
  );
};
