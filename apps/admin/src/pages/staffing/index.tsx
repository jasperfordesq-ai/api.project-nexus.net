// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useCustom } from "@refinedev/core";
import { Card, Typography, Row, Col, Statistic, Spin, Descriptions } from "antd";

const { Title } = Typography;

export const StaffingPage = () => {
  const { data: dashboardData, isLoading } = useCustom({
    url: "/api/admin/staffing/dashboard",
    method: "get",
  });

  const dashboard = (dashboardData?.data as any) || {};

  const highlightKeys = ["upcoming_shifts", "available_volunteers_today", "shifts_needing_volunteers"];
  const remainingKeys = Object.keys(dashboard).filter((k) => !highlightKeys.includes(k));

  return (
    <div>
      <Title level={4}>Predictive Staffing</Title>

      {isLoading ? (
        <Spin />
      ) : (
        <>
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={12} lg={8}>
              <Card>
                <Statistic title="Upcoming Shifts" value={dashboard.upcoming_shifts ?? 0} />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Card>
                <Statistic title="Available Volunteers Today" value={dashboard.available_volunteers_today ?? 0} valueStyle={{ color: "#3f8600" }} />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Card>
                <Statistic title="Shifts Needing Volunteers" value={dashboard.shifts_needing_volunteers ?? 0} valueStyle={{ color: dashboard.shifts_needing_volunteers > 0 ? "#cf1322" : undefined }} />
              </Card>
            </Col>
          </Row>

          {remainingKeys.length > 0 && (
            <Card>
              <Descriptions bordered column={2}>
                {remainingKeys.map((key) => (
                  <Descriptions.Item key={key} label={key.replace(/_/g, " ")}>
                    {String(dashboard[key] ?? "--")}
                  </Descriptions.Item>
                ))}
              </Descriptions>
            </Card>
          )}
        </>
      )}
    </div>
  );
};
