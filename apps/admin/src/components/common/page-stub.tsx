import { Card, Typography, Space, Tag, theme } from "antd";
import { ToolOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

interface PageStubProps {
  title: string;
  description: string;
  endpoints?: string[];
}

export const PageStub = ({ title, description, endpoints }: PageStubProps) => {
  const { token } = theme.useToken();
  return (
  <Card>
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      <Space>
        <ToolOutlined style={{ fontSize: 24, color: token.colorPrimary }} />
        <Title level={4} style={{ margin: 0 }}>{title}</Title>
        <Tag color="blue">Coming Soon</Tag>
      </Space>
      <Text type="secondary">{description}</Text>
      {endpoints && endpoints.length > 0 && (
        <div>
          <Text strong>Backend endpoints ready:</Text>
          <ul style={{ marginTop: 8 }}>
            {endpoints.map((ep) => (
              <li key={ep}><Text code>{ep}</Text></li>
            ))}
          </ul>
        </div>
      )}
    </Space>
  </Card>
  );
};
