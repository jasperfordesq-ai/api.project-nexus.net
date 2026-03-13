// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useState } from "react";
import { List, useTable } from "@refinedev/antd";
import { Table, Button, Space, message, Tag, Modal, Input } from "antd";
import { CheckOutlined, CloseOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import axiosInstance from "../../utils/axios";

export const ModerationList = () => {
  const { tableProps, tableQueryResult } = useTable({
    resource: "moderation",
    meta: { apiPath: "/api/admin/listings/pending" },
    pagination: { pageSize: 20 },
  });

  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const handleApprove = async (id: number) => {
    Modal.confirm({
      title: "Approve this listing?",
      onOk: async () => {
        try {
          await axiosInstance.put(`/api/admin/listings/${id}/approve`);
          message.success("Listing approved");
          tableQueryResult.refetch();
        } catch (err: any) {
          message.error(err?.response?.data?.message || "Failed to approve");
        }
      },
    });
  };

  const submitReject = async () => {
    if (!rejectId) return;
    try {
      await axiosInstance.put(`/api/admin/listings/${rejectId}/reject`, { reason: rejectReason || "Does not meet guidelines" });
      message.success("Listing rejected");
      setRejectId(null);
      setRejectReason("");
      tableQueryResult.refetch();
    } catch (err: any) {
      message.error(err?.response?.data?.message || "Failed to reject");
    }
  };

  return (
    <>
      <List title="Content Moderation" canCreate={false}>
        <Table {...tableProps} rowKey="id" size="middle">
          <Table.Column dataIndex="id" title="ID" width={60} />
          <Table.Column dataIndex="title" title="Title" />
          <Table.Column dataIndex="type" title="Type" render={(t: string) => <Tag>{t}</Tag>} />
          <Table.Column
            title="Created By"
            render={(_, record: any) => record.user?.email || record.user_id || "—"}
          />
          <Table.Column
            dataIndex="created_at"
            title="Submitted"
            render={(d: string) => (d ? dayjs(d).format("DD MMM YYYY HH:mm") : "—")}
          />
          <Table.Column
            title="Actions"
            render={(_, record: any) => (
              <Space>
                <Button
                  type="primary"
                  size="small"
                  icon={<CheckOutlined />}
                  onClick={() => handleApprove(record.id)}
                >
                  Approve
                </Button>
                <Button
                  danger
                  size="small"
                  icon={<CloseOutlined />}
                  onClick={() => { setRejectId(record.id); setRejectReason(""); }}
                >
                  Reject
                </Button>
              </Space>
            )}
          />
        </Table>
      </List>
      <Modal
        title="Reject Listing"
        open={rejectId !== null}
        onOk={submitReject}
        onCancel={() => setRejectId(null)}
        okText="Reject"
        okButtonProps={{ danger: true }}
      >
        <Input.TextArea
          rows={3}
          placeholder="Reason for rejection (optional)"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
        />
      </Modal>
    </>
  );
};
