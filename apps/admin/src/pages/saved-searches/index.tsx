import { useCustom } from "@refinedev/core";
import { Card, Table, Typography, Tag, Button, Popconfirm, message, Space, Select } from "antd";
import { DeleteOutlined, BellOutlined } from "@ant-design/icons";
import { useState } from "react";
import dayjs from "dayjs";
import axiosInstance from "../../utils/axios";

const { Title } = Typography;
const { Option } = Select;

const TYPE_COLORS: Record<string, string> = {
  listings: "blue",
  users: "green",
  events: "orange",
  groups: "purple",
};

export const SavedSearchesPage = () => {
  const [searchType, setSearchType] = useState<string | undefined>(undefined);

  const { data, isLoading, refetch } = useCustom({
    url: "/api/admin/saved-searches",
    method: "get",
    config: { query: { page: 1, limit: 100, ...(searchType ? { search_type: searchType } : {}) } },
    queryOptions: { queryKey: ["admin-saved-searches", searchType] },
  });

  const searches = (data?.data as any)?.data || [];
  const total = (data?.data as any)?.total || 0;

  const deleteSearch = async (id: number) => {
    try {
      await axiosInstance.delete(`/api/admin/saved-searches/${id}`);
      message.success("Saved search deleted");
      refetch();
    } catch (err: any) {
      message.error(err?.response?.data?.error || "Failed to delete");
    }
  };

  const columns = [
    { dataIndex: "id", title: "ID", width: 60 },
    {
      title: "User",
      render: (_: any, r: any) => (
        <div>
          <div style={{ fontWeight: 500 }}>{r.user_name}</div>
          <div style={{ fontSize: 12, color: "#999" }}>User #{r.user_id}</div>
        </div>
      ),
    },
    { dataIndex: "name", title: "Search Name" },
    {
      dataIndex: "search_type",
      title: "Type",
      render: (t: string) => <Tag color={TYPE_COLORS[t] || "default"}>{t}</Tag>,
    },
    {
      dataIndex: "notify_on_new_results",
      title: "Alerts",
      render: (v: boolean) => v ? <Tag icon={<BellOutlined />} color="green">On</Tag> : <Tag color="default">Off</Tag>,
    },
    { dataIndex: "last_result_count", title: "Last Results", render: (n: number | null) => n != null ? n : "—" },
    { dataIndex: "last_run_at", title: "Last Run", render: (d: string) => d ? dayjs(d).format("DD MMM YYYY") : "Never" },
    { dataIndex: "created_at", title: "Created", render: (d: string) => dayjs(d).format("DD MMM YYYY") },
    {
      title: "Actions",
      render: (_: any, r: any) => (
        <Popconfirm title="Delete this saved search?" onConfirm={() => deleteSearch(r.id)} okText="Delete" okType="danger" cancelText="Cancel">
          <Button size="small" danger icon={<DeleteOutlined />}>Delete</Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Saved Searches</Title>
        <Space>
          <Select placeholder="Filter by type" allowClear style={{ width: 160 }} onChange={setSearchType} value={searchType}>
            <Option value="listings">Listings</Option>
            <Option value="users">Users</Option>
            <Option value="events">Events</Option>
            <Option value="groups">Groups</Option>
          </Select>
          <span style={{ color: "#999" }}>{total} total</span>
        </Space>
      </div>
      <Card>
        <Table dataSource={searches} rowKey="id" loading={isLoading} size="small" columns={columns} pagination={{ pageSize: 50 }} />
      </Card>
    </div>
  );
};
