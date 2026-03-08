import { useCustom } from "@refinedev/core";
import { Card, Row, Col, Statistic, Typography, Spin, Tag, Descriptions } from "antd";
import { CheckCircleOutlined, DatabaseOutlined, ClockCircleOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const { Title } = Typography;

export const HealthPage = () => {
  const { data, isLoading } = useCustom({
    url: "/api/admin/system/health",
    method: "get",
  });

  const health = data?.data as any;

  if (isLoading) return <Spin size="large" style={{ display: "flex", justifyContent: "center", marginTop: 100 }} />;

  return (
    <div>
      <Title level={4}>System Health</Title>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Status"
              value="Healthy"
              prefix={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="DB Size" value={health?.db_size || "—"} prefix={<DatabaseOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Total Users" value={health?.user_count ?? "—"} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Server Time"
              value={health?.server_time ? dayjs(health.server_time).format("HH:mm:ss") : "—"}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {health && (
        <Card style={{ marginTop: 16 }}>
          <Descriptions bordered column={2} title="Details">
            {Object.entries(health).map(([key, value]) => (
              <Descriptions.Item key={key} label={key.replace(/_/g, " ")}>
                {typeof value === "boolean" ? (
                  value ? <Tag color="green">Yes</Tag> : <Tag color="red">No</Tag>
                ) : (
                  String(value ?? "—")
                )}
              </Descriptions.Item>
            ))}
          </Descriptions>
        </Card>
      )}
    </div>
  );
};
