import { useCustom } from "@refinedev/core";
import { Row, Col, Card, Statistic, Typography, Spin } from "antd";
import {
  UserOutlined,
  ShoppingOutlined,
  SwapOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  RiseOutlined,
  CalendarOutlined,
  ThunderboltOutlined,
  FieldTimeOutlined,
  StarOutlined,
} from "@ant-design/icons";
import { Line } from "@ant-design/charts";

const { Title } = Typography;

export const DashboardPage = () => {
  const { data, isLoading } = useCustom({
    url: "/api/admin/analytics/overview",
    method: "get",
  });

  const { data: growthData, isLoading: growthLoading } = useCustom({
    url: "/api/admin/analytics/growth",
    method: "get",
    config: { query: { days: 30 } },
  });

  const overview = data?.data as any;
  const growth = growthData?.data as any;

  if (isLoading) {
    return <Spin size="large" style={{ display: "flex", justifyContent: "center", marginTop: 100 }} />;
  }

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
      <Title level={4}>Dashboard</Title>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Users"
              value={overview?.total_users || 0}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Active Users"
              value={overview?.active_users || 0}
              prefix={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="New Users (30 days)"
              value={overview?.new_users_last_30_days || 0}
              prefix={<RiseOutlined style={{ color: "#1890ff" }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Active Listings"
              value={overview?.total_active_listings || 0}
              prefix={<ShoppingOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="New Listings (30 days)"
              value={overview?.new_listings_last_30_days || 0}
              prefix={<ClockCircleOutlined style={{ color: "#faad14" }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Exchanges"
              value={overview?.total_exchanges || 0}
              prefix={<SwapOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Completed Exchanges"
              value={overview?.completed_exchanges || 0}
              prefix={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Hours Exchanged"
              value={overview?.total_hours_exchanged || 0}
              precision={1}
              suffix="hrs"
              prefix={<FieldTimeOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Groups"
              value={overview?.total_groups || 0}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Events"
              value={overview?.total_events || 0}
              prefix={<CalendarOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Average User Level"
              value={overview?.average_user_level || 0}
              prefix={<StarOutlined style={{ color: "#faad14" }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total XP Awarded"
              value={overview?.total_xp_awarded || 0}
              prefix={<ThunderboltOutlined style={{ color: "#722ed1" }} />}
            />
          </Card>
        </Col>
      </Row>

      {chartData.length > 0 && (
        <Card style={{ marginTop: 16 }} title="Growth (Last 30 Days)">
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
    </div>
  );
};
