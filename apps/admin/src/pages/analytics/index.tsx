import { useCustom } from "@refinedev/core";
import { Row, Col, Card, Statistic, Typography, Table, Spin, Select } from "antd";
import { useState } from "react";
import { Line } from "@ant-design/charts";

const { Title } = Typography;

export const AnalyticsPage = () => {
  const [days, setDays] = useState(30);

  const { data: overviewData, isLoading: overviewLoading } = useCustom({
    url: "/api/admin/analytics/overview",
    method: "get",
  });

  const { data: growthData, isLoading: growthLoading } = useCustom({
    url: "/api/admin/analytics/growth",
    method: "get",
    config: { query: { days } },
  });

  const { data: topUsersData } = useCustom({
    url: "/api/admin/analytics/top-users",
    method: "get",
    config: { query: { metric: "exchanges", limit: 10 } },
  });

  const { data: exchangeData } = useCustom({
    url: "/api/admin/analytics/exchange-health",
    method: "get",
  });

  const overview = overviewData?.data as any;
  const growth = growthData?.data as any;
  const topUsers = (topUsersData?.data as any)?.data || topUsersData?.data || [];
  const exchange = exchangeData?.data as any;

  if (overviewLoading) return <Spin size="large" style={{ display: "flex", justifyContent: "center", marginTop: 100 }} />;

  const chartData: { date: string; count: number; type: string }[] = [];
  if (growth) {
    (growth.new_users_per_day || []).forEach((d: any) => {
      chartData.push({ date: d.date?.split("T")[0], count: d.count, type: "New Users" });
    });
    (growth.new_listings_per_day || []).forEach((d: any) => {
      chartData.push({ date: d.date?.split("T")[0], count: d.count, type: "New Listings" });
    });
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <Title level={4}>Analytics</Title>
        <Select value={days} onChange={setDays} style={{ width: 130 }} options={[
          { label: "7 days", value: 7 },
          { label: "30 days", value: 30 },
          { label: "90 days", value: 90 },
          { label: "365 days", value: 365 },
        ]} />
      </div>

      {overview && (
        <Row gutter={[16, 16]}>
          {Object.entries(overview).map(([key, value]) => (
            <Col xs={24} sm={12} lg={6} key={key}>
              <Card>
                <Statistic title={key.replace(/_/g, " ")} value={typeof value === "number" ? value : String(value)} />
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {chartData.length > 0 && (
        <Card style={{ marginTop: 16 }} title={`Growth (Last ${days} Days)`}>
          <Line
            data={chartData}
            xField="date"
            yField="count"
            seriesField="type"
            smooth
            height={300}
            xAxis={{ type: "cat", label: { autoRotate: true } }}
            yAxis={{ min: 0 }}
            legend={{ position: "top" }}
            point={{ size: 3 }}
          />
        </Card>
      )}

      {exchange && (
        <Card style={{ marginTop: 16 }} title="Exchange Health">
          <Row gutter={16}>
            {Object.entries(exchange).map(([key, value]) => (
              <Col span={6} key={key}>
                <Statistic title={key.replace(/_/g, " ")} value={typeof value === "number" ? value : String(value ?? "—")} />
              </Col>
            ))}
          </Row>
        </Card>
      )}

      <Card style={{ marginTop: 16 }} title="Top Users (by Exchanges)">
        <Table
          dataSource={Array.isArray(topUsers) ? topUsers : []}
          rowKey={(r: any) => r.id || r.user_id}
          size="small"
          pagination={false}
        >
          <Table.Column title="Rank" render={(_, __, i) => i + 1} width={60} />
          <Table.Column dataIndex="email" title="Email" />
          <Table.Column title="Name" render={(_, r: any) => `${r.first_name || ""} ${r.last_name || ""}`.trim() || "—"} />
          <Table.Column dataIndex="value" title="Value" />
        </Table>
      </Card>
    </div>
  );
};
