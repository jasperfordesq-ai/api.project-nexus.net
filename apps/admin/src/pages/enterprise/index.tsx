// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useCustom } from "@refinedev/core";
import { Card, Table, Typography, Row, Col, Statistic, Spin, Tabs, Descriptions } from "antd";

const { Title } = Typography;

export const EnterprisePage = () => {
  const { data: configData, isLoading: configLoading } = useCustom({
    url: "/api/admin/enterprise/config",
    method: "get",
  });

  const { data: dashboardData, isLoading: dashboardLoading } = useCustom({
    url: "/api/admin/enterprise/dashboard",
    method: "get",
  });

  const { data: complianceData, isLoading: complianceLoading } = useCustom({
    url: "/api/admin/enterprise/compliance",
    method: "get",
  });

  const configItems = Array.isArray((configData?.data as any)?.items) ? (configData?.data as any).items :
    Array.isArray((configData?.data as any)?.data) ? (configData?.data as any).data :
    Array.isArray((configData?.data as any)) ? (configData?.data as any) : [];
  const dashboard = (dashboardData?.data as any) || {};
  const compliance = (complianceData?.data as any) || {};

  const dashboardTab = (
    <>
      {dashboardLoading ? (
        <Spin />
      ) : (
        <Row gutter={[16, 16]}>
          {Object.entries(dashboard).filter(([k]) => !['success', 'status_code', 'timestamp', 'message', 'data'].includes(k)).map(([key, value]) => (
            <Col xs={24} sm={12} lg={6} key={key}>
              <Card>
                <Statistic title={key.replace(/_/g, " ")} value={typeof value === "number" ? value : String(value ?? 0)} />
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </>
  );

  const complianceTab = (
    <>
      {complianceLoading ? (
        <Spin />
      ) : (
        <Card>
          <Descriptions bordered column={1}>
            {Object.entries(compliance).filter(([k]) => !['success', 'status_code', 'timestamp', 'message', 'data'].includes(k)).map(([key, value]) => (
              <Descriptions.Item key={key} label={key.replace(/_/g, " ")}>
                {String(value ?? "--")}
              </Descriptions.Item>
            ))}
          </Descriptions>
        </Card>
      )}
    </>
  );

  const configTab = (
    <>
      {configLoading ? (
        <Spin />
      ) : (
        <Card>
          <Table dataSource={configItems.map((item: any, i: number) => ({ ...item, _key: item.key || i }))} rowKey="_key" size="small" pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t: number) => `${t} total` }}>
            <Table.Column dataIndex="key" title="Key" />
            <Table.Column dataIndex="value" title="Value" />
            <Table.Column dataIndex="description" title="Description" />
          </Table>
        </Card>
      )}
    </>
  );

  return (
    <div>
      <Title level={4}>Enterprise</Title>
      <Tabs
        items={[
          { key: "dashboard", label: "Dashboard", children: dashboardTab },
          { key: "compliance", label: "Compliance", children: complianceTab },
          { key: "config", label: "Config", children: configTab },
        ]}
      />
    </div>
  );
};
