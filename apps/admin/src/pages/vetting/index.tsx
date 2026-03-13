// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useCustom } from "@refinedev/core";
import { Card, Table, Typography, Row, Col, Statistic, Spin, Tabs, Button, Space, message, Tag, Modal, Input } from "antd";
import { CheckOutlined, CloseOutlined } from "@ant-design/icons";
import { useState } from "react";
import { StatusTag } from "../../components/common/status-tag";
import dayjs from "dayjs";
import axiosInstance from "../../utils/axios";

const { Title } = Typography;

export const VettingPage = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const { data: recordsData, isLoading, refetch } = useCustom({ url: "/api/admin/vetting/records", method: "get", config: { query: { page, limit: pageSize } } });
  const { data: statsData } = useCustom({ url: "/api/admin/vetting/stats", method: "get" });
  const { data: expiringData } = useCustom({ url: "/api/admin/vetting/expiring", method: "get" });
  const { data: pendingData } = useCustom({ url: "/api/admin/vetting/pending", method: "get" });

  const recordsRaw = recordsData?.data as any;
  const records = recordsRaw?.items || recordsRaw?.data || [];
  const totalCount = recordsRaw?.total || recordsRaw?.totalCount || records.length;
  const stats = statsData?.data as any;
  const expiring = (expiringData?.data as any)?.items || (expiringData?.data as any)?.data || (Array.isArray(expiringData?.data) ? expiringData.data : []);
  const pending = (pendingData?.data as any)?.items || (pendingData?.data as any)?.data || (Array.isArray(pendingData?.data) ? pendingData.data : []);

  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");

  const handleVerify = (id: number) => {
    Modal.confirm({
      title: "Verify this DBS record?",
      onOk: async () => {
        try {
          await axiosInstance.put("/api/admin/vetting/records/" + id + "/verify");
          message.success("Record verified");
          refetch();
        } catch (err: any) { message.error(err?.response?.data?.message || "Failed"); }
      },
    });
  };

  const submitReject = async () => {
    if (!rejectId) return;
    try {
      await axiosInstance.put("/api/admin/vetting/records/" + rejectId + "/reject", { notes: rejectNotes || "Did not meet requirements" });
      message.success("Record rejected");
      setRejectId(null);
      setRejectNotes("");
      refetch();
    } catch (err: any) { message.error(err?.response?.data?.message || "Failed"); }
  };

  const vettingColumns = [
    { dataIndex: "id", title: "ID", width: 60 },
    { dataIndex: "user_id", title: "User ID", width: 80 },
    { dataIndex: "type", title: "Type" },
    { dataIndex: "status", title: "Status", render: (s: string) => <StatusTag status={s} /> },
    { dataIndex: "expiry_date", title: "Expiry", render: (d: string) => d ? dayjs(d).format("DD MMM YYYY") : "—" },
  ];

  return (
    <div>
      <Title level={4}>Vetting (DBS Records)</Title>

      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          {Object.entries(stats).map(([key, value]) => (
            <Col span={6} key={key}><Card><Statistic title={key.replace(/_/g, " ")} value={typeof value === "number" ? value : String(value ?? 0)} /></Card></Col>
          ))}
        </Row>
      )}

      <Tabs items={[
        {
          key: "all",
          label: "All Records",
          children: isLoading ? <Spin /> : (
            <Card>
              <Table dataSource={records} rowKey="id" size="small" pagination={{
                  current: page,
                  pageSize,
                  total: totalCount,
                  showSizeChanger: true,
                  showTotal: (t: number) => `${t} total`,
                  onChange: (p: number, ps: number) => { setPage(p); setPageSize(ps); },
                }} columns={[
                ...vettingColumns,
                {
                  title: "Actions",
                  render: (_: any, r: any) => (
                    <Space>
                      {r.status === "pending" && <>
                        <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => handleVerify(r.id)}>Verify</Button>
                        <Button size="small" danger icon={<CloseOutlined />} onClick={() => { setRejectId(r.id); setRejectNotes(""); }}>Reject</Button>
                      </>}
                    </Space>
                  ),
                },
              ]} />
            </Card>
          ),
        },
        {
          key: "pending",
          label: <span>Pending {pending.length > 0 && <Tag color="orange">{pending.length}</Tag>}</span>,
          children: (
            <Card>
              <Table dataSource={pending} rowKey="id" size="small" columns={[
                ...vettingColumns,
                {
                  title: "Actions",
                  render: (_: any, r: any) => (
                    <Space>
                      <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => handleVerify(r.id)}>Verify</Button>
                      <Button size="small" danger icon={<CloseOutlined />} onClick={() => { setRejectId(r.id); setRejectNotes(""); }}>Reject</Button>
                    </Space>
                  ),
                },
              ]} />
            </Card>
          ),
        },
        {
          key: "expiring",
          label: <span>Expiring {expiring.length > 0 && <Tag color="red">{expiring.length}</Tag>}</span>,
          children: (
            <Card>
              <Table dataSource={expiring} rowKey="id" size="small" columns={vettingColumns} />
            </Card>
          ),
        },
      ]} />

      <Modal
        title="Reject Vetting Record"
        open={rejectId !== null}
        onOk={submitReject}
        onCancel={() => setRejectId(null)}
        okText="Reject"
        okButtonProps={{ danger: true }}
      >
        <Input.TextArea
          rows={3}
          placeholder="Reason for rejection (optional)"
          value={rejectNotes}
          onChange={(e) => setRejectNotes(e.target.value)}
        />
      </Modal>
    </div>
  );
};
