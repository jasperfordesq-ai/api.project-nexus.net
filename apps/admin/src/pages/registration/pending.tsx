import { useCustom } from "@refinedev/core";
import { Card, Table, Typography, Button, Space, message, Spin } from "antd";
import { CheckOutlined, CloseOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import axiosInstance from "../../utils/axios";

const { Title } = Typography;

export const RegistrationPendingPage = () => {
  const { data, isLoading, refetch } = useCustom({
    url: "/api/registration/admin/pending",
    method: "get",
  });

  const pending = Array.isArray(data?.data) ? data.data : (data?.data as any)?.data || [];

  const handleApprove = async (userId: number) => {
    try {
      await axiosInstance.put(`/api/registration/admin/users/${userId}/approve`);
      message.success("User approved");
      refetch();
    } catch (err: any) {
      message.error(err?.response?.data?.message || "Failed to approve");
    }
  };

  const handleReject = async (userId: number) => {
    try {
      await axiosInstance.put(`/api/registration/admin/users/${userId}/reject`);
      message.success("User rejected");
      refetch();
    } catch (err: any) {
      message.error(err?.response?.data?.message || "Failed to reject");
    }
  };

  return (
    <div>
      <Title level={4}>Pending Registrations</Title>
      {isLoading ? <Spin /> : (
        <Card>
          <Table dataSource={pending} rowKey="id" size="middle">
            <Table.Column dataIndex="id" title="ID" width={60} />
            <Table.Column dataIndex="email" title="Email" />
            <Table.Column title="Name" render={(_, r: any) => `${r.first_name || ""} ${r.last_name || ""}`.trim() || "—"} />
            <Table.Column dataIndex="created_at" title="Applied" render={(d: string) => d ? dayjs(d).format("DD MMM YYYY") : "—"} />
            <Table.Column title="Actions" render={(_, record: any) => (
              <Space>
                <Button type="primary" size="small" icon={<CheckOutlined />} onClick={() => handleApprove(record.id)}>Approve</Button>
                <Button danger size="small" icon={<CloseOutlined />} onClick={() => handleReject(record.id)}>Reject</Button>
              </Space>
            )} />
          </Table>
        </Card>
      )}
    </div>
  );
};
