import { useCustom } from "@refinedev/core";
import { Card, Table, Typography, Row, Col, Statistic, Spin, Tag, Tabs } from "antd";
import { useState } from "react";
import dayjs from "dayjs";

const { Title } = Typography;

const severityColors: Record<string, string> = {
  low: "blue",
  medium: "orange",
  high: "red",
  critical: "magenta",
};

const statusColors: Record<string, string> = {
  open: "red",
  investigating: "orange",
  resolved: "green",
  closed: "default",
};

export const GdprPage = () => {
  const [breachPage, setBreachPage] = useState(1);
  const [breachPageSize, setBreachPageSize] = useState(20);
  const { data: breachData, isLoading: breachLoading } = useCustom({
    url: "/api/admin/gdpr/breaches",
    method: "get",
    config: { query: { page: breachPage, limit: breachPageSize } },
  });

  const { data: consentTypesData, isLoading: consentTypesLoading } = useCustom({
    url: "/api/admin/gdpr/consent-types",
    method: "get",
  });

  const { data: consentStatsData } = useCustom({
    url: "/api/admin/gdpr/consent-stats",
    method: "get",
  });

  const breachRaw = breachData?.data as any;
  const breaches = breachRaw?.data || [];
  const breachTotalCount = breachRaw?.total || breachRaw?.totalCount || breaches.length;
  const consentTypes = (consentTypesData?.data as any)?.data || [];
  const consentStats = (consentStatsData?.data as any)?.data || {};

  const breachesTab = (
    <>
      {breachLoading ? (
        <Spin />
      ) : (
        <Card>
          <Table dataSource={breaches} rowKey="id" size="small" pagination={{
              current: breachPage,
              pageSize: breachPageSize,
              total: breachTotalCount,
              showSizeChanger: true,
              showTotal: (t: number) => `${t} total`,
              onChange: (p: number, ps: number) => { setBreachPage(p); setBreachPageSize(ps); },
            }}>
            <Table.Column dataIndex="id" title="ID" width={60} />
            <Table.Column dataIndex="title" title="Title" />
            <Table.Column
              dataIndex="severity"
              title="Severity"
              render={(s: string) => <Tag color={severityColors[s] || "default"}>{s}</Tag>}
            />
            <Table.Column
              dataIndex="status"
              title="Status"
              render={(s: string) => <Tag color={statusColors[s] || "default"}>{s}</Tag>}
            />
            <Table.Column dataIndex="affected_users_count" title="Affected Users" width={120} />
            <Table.Column
              dataIndex="detected_at"
              title="Detected"
              render={(d: string) => (d ? dayjs(d).format("DD MMM YYYY HH:mm") : "--")}
            />
          </Table>
        </Card>
      )}
    </>
  );

  const consentTab = (
    <>
      {Object.keys(consentStats).length > 0 && (
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          {Object.entries(consentStats).map(([key, value]) => (
            <Col span={6} key={key}>
              <Card>
                <Statistic title={key.replace(/_/g, " ")} value={typeof value === "number" ? value : String(value ?? 0)} />
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {consentTypesLoading ? (
        <Spin />
      ) : (
        <Card>
          <Table dataSource={consentTypes} rowKey="id" size="small">
            <Table.Column dataIndex="id" title="ID" width={60} />
            <Table.Column dataIndex="name" title="Name" />
            <Table.Column dataIndex="description" title="Description" />
            <Table.Column
              dataIndex="required"
              title="Required"
              render={(v: boolean) => <Tag color={v ? "red" : "default"}>{v ? "Yes" : "No"}</Tag>}
            />
          </Table>
        </Card>
      )}
    </>
  );

  return (
    <div>
      <Title level={4}>GDPR & Compliance</Title>
      <Tabs
        items={[
          { key: "breaches", label: "Breaches", children: breachesTab },
          { key: "consent", label: "Consent", children: consentTab },
        ]}
      />
    </div>
  );
};
