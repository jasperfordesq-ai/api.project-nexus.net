// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useCustom } from "@refinedev/core";
import { Card, Typography, Row, Col, Statistic, Spin, Table, Tag } from "antd";
import dayjs from "dayjs";

const { Title } = Typography;

export const StaffingPage = () => {
  const { data: dashboardData, isLoading } = useCustom({
    url: "/api/admin/staffing/dashboard",
    method: "get",
  });

  const rawDashboard = dashboardData?.data as any;
  const dashboard = rawDashboard?.data || rawDashboard || {};
  const upcomingShifts = Array.isArray(dashboard.upcoming_shifts) ? dashboard.upcoming_shifts : [];
  const shortfallPredictions = Array.isArray(dashboard.shortfall_predictions) ? dashboard.shortfall_predictions : [];

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
                <Statistic title="Upcoming Shifts" value={dashboard.total_upcoming_shifts ?? upcomingShifts.length} />
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

          <Row gutter={[16, 16]}>
            <Col xs={24} xl={14}>
              <Card title="Upcoming Shifts">
                <Table
                  dataSource={upcomingShifts}
                  rowKey={(r: any) => r.shift_id || `${r.opportunity_id}-${r.starts_at}`}
                  size="small"
                  pagination={{ pageSize: 10, showSizeChanger: true }}
                  locale={{ emptyText: "No upcoming shifts" }}
                >
                  <Table.Column dataIndex="title" title="Shift" ellipsis />
                  <Table.Column
                    dataIndex="starts_at"
                    title="Starts"
                    width={150}
                    render={(d: string) => d ? dayjs(d).format("DD MMM YYYY HH:mm") : "--"}
                  />
                  <Table.Column
                    title="Volunteers"
                    width={120}
                    render={(_: any, r: any) => `${r.current_volunteers ?? 0} / ${r.max_volunteers ?? 0}`}
                  />
                </Table>
              </Card>
            </Col>
            <Col xs={24} xl={10}>
              <Card title="Shortfall Predictions">
                <Table
                  dataSource={shortfallPredictions}
                  rowKey={(r: any) => `${r.predicted_date}-${r.opportunity_id ?? "all"}`}
                  size="small"
                  pagination={{ pageSize: 10, showSizeChanger: true }}
                  locale={{ emptyText: "No predicted shortfalls" }}
                >
                  <Table.Column
                    dataIndex="predicted_date"
                    title="Date"
                    render={(d: string) => d ? dayjs(d).format("DD MMM YYYY") : "--"}
                  />
                  <Table.Column
                    title="Need"
                    width={90}
                    render={(_: any, r: any) => `${r.predicted_volunteers_available ?? 0} / ${r.predicted_volunteers_needed ?? 0}`}
                  />
                  <Table.Column
                    dataIndex="shortfall_risk"
                    title="Risk"
                    width={90}
                    render={(risk: number) => {
                      const percent = Math.round((risk ?? 0) * 100);
                      const color = percent >= 70 ? "red" : percent >= 40 ? "orange" : "green";
                      return <Tag color={color}>{percent}%</Tag>;
                    }}
                  />
                </Table>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
};
