import { useCustom } from "@refinedev/core";
import { Card, Row, Col, Statistic, Typography, Spin, Tag, Descriptions } from "antd";
import { CheckCircleOutlined, WarningOutlined } from "@ant-design/icons";

const { Title } = Typography;

export const MatchingPage = () => {
  const { data: statsData, isLoading: statsLoading } = useCustom({ url: "/api/admin/matching/stats", method: "get" });
  const { data: healthData, isLoading: healthLoading } = useCustom({ url: "/api/admin/matching/health", method: "get" });

  const stats = statsData?.data as any;
  const health = healthData?.data as any;

  if (statsLoading || healthLoading) return <Spin size="large" style={{ display: "flex", justifyContent: "center", marginTop: 100 }} />;

  return (
    <div>
      <Title level={4}>Matching Algorithm</Title>

      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          {Object.entries(stats).map(([key, value]) => (
            <Col span={6} key={key}><Card><Statistic title={key.replace(/_/g, " ")} value={typeof value === "number" ? value : String(value ?? 0)} /></Card></Col>
          ))}
        </Row>
      )}

      {health && (
        <Card title="Algorithm Health">
          <Descriptions bordered column={2}>
            {Object.entries(health).map(([key, value]) => (
              <Descriptions.Item key={key} label={key.replace(/_/g, " ")}>
                {typeof value === "boolean" ? (
                  value ? <Tag icon={<CheckCircleOutlined />} color="success">Healthy</Tag> : <Tag icon={<WarningOutlined />} color="error">Unhealthy</Tag>
                ) : String(value ?? "—")}
              </Descriptions.Item>
            ))}
          </Descriptions>
        </Card>
      )}
    </div>
  );
};
