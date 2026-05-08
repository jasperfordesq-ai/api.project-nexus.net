// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useState } from "react";
import { useCustom } from "@refinedev/core";
import { Button, Card, Col, Descriptions, Empty, Form, Input, Modal, Row, Space, Statistic, Table, Tabs, Tag, Typography, message } from "antd";
import { CheckOutlined, CloseOutlined, DeleteOutlined, EyeOutlined, FlagOutlined, ReloadOutlined, StopOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import axiosInstance from "../../utils/axios";
import { getErrorMessage } from "../../utils/errors";

const { Title, Text } = Typography;
const { TextArea } = Input;

const rowsFrom = (payload: any) => {
  const raw = payload?.data ?? payload;
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.items)) return raw.items;
  if (Array.isArray(raw?.listings)) return raw.listings;
  return [];
};

const totalFrom = (payload: any, fallback: number) =>
  payload?.data?.pagination?.total ?? payload?.pagination?.total ?? payload?.data?.meta?.total ?? payload?.meta?.total ?? payload?.data?.total ?? fallback;

const date = (value?: string) => (value ? dayjs(value).format("DD MMM YYYY HH:mm") : "--");
const person = (value: any) => value?.email || [value?.first_name ?? value?.firstName, value?.last_name ?? value?.lastName].filter(Boolean).join(" ") || "--";

export const ModerationList = () => {
  const [listingPage, setListingPage] = useState(1);
  const [feedPage, setFeedPage] = useState(1);
  const [commentsPage, setCommentsPage] = useState(1);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reportsPage, setReportsPage] = useState(1);
  const [detail, setDetail] = useState<any | null>(null);
  const [reviewTarget, setReviewTarget] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const [reviewForm] = Form.useForm();

  const listingsQuery = useCustom({
    url: "/api/admin/listings/pending",
    method: "get",
    config: { query: { page: listingPage, limit: 20 } },
    queryOptions: { queryKey: ["admin-pending-listings", listingPage] },
  });

  const feedQuery = useCustom({
    url: "/api/admin/feed/posts",
    method: "get",
    config: { query: { page: feedPage, limit: 20 } },
    queryOptions: { queryKey: ["admin-feed-moderation", feedPage] },
  });

  const feedStatsQuery = useCustom({
    url: "/api/admin/feed/stats",
    method: "get",
    queryOptions: { queryKey: ["admin-feed-moderation-stats"] },
  });

  const commentsQuery = useCustom({
    url: "/api/admin/comments",
    method: "get",
    config: { query: { page: commentsPage, limit: 20 } },
    queryOptions: { queryKey: ["admin-comments-moderation", commentsPage] },
  });

  const reviewsQuery = useCustom({
    url: "/api/admin/reviews",
    method: "get",
    config: { query: { page: reviewsPage, limit: 20 } },
    queryOptions: { queryKey: ["admin-reviews-moderation", reviewsPage] },
  });

  const reportsQuery = useCustom({
    url: "/api/admin/reports",
    method: "get",
    config: { query: { page: reportsPage, limit: 20 } },
    queryOptions: { queryKey: ["admin-reports-moderation", reportsPage] },
  });

  const reportStatsQuery = useCustom({
    url: "/api/admin/reports/stats",
    method: "get",
    queryOptions: { queryKey: ["admin-reports-stats"] },
  });

  const pendingListings = rowsFrom(listingsQuery.data);
  const feedPosts = rowsFrom(feedQuery.data);
  const comments = rowsFrom(commentsQuery.data);
  const reviews = rowsFrom(reviewsQuery.data);
  const reports = rowsFrom(reportsQuery.data);
  const feedStats = feedStatsQuery.data?.data ?? {};
  const reportStats = reportStatsQuery.data?.data ?? {};

  const refreshAll = () => {
    listingsQuery.refetch();
    feedQuery.refetch();
    feedStatsQuery.refetch();
    commentsQuery.refetch();
    reviewsQuery.refetch();
    reportsQuery.refetch();
    reportStatsQuery.refetch();
  };

  const runAction = async (action: () => Promise<any>, success: string, refresh?: () => void) => {
    setBusy(true);
    try {
      await action();
      message.success(success);
      refresh?.();
    } catch (err: unknown) {
      message.error(getErrorMessage(err, "Moderation action failed"));
    } finally {
      setBusy(false);
    }
  };

  const confirmAction = (title: string, content: string, action: () => Promise<any>, success: string, refresh?: () => void, danger = false) => {
    Modal.confirm({
      title,
      content,
      okText: danger ? "Confirm" : "Proceed",
      okType: danger ? "danger" : "primary",
      onOk: () => runAction(action, success, refresh),
    });
  };

  const inspect = async (url: string, fallback: any) => {
    setBusy(true);
    try {
      const response = await axiosInstance.get(url);
      setDetail(response.data?.data ?? response.data ?? fallback);
    } catch {
      setDetail(fallback);
    } finally {
      setBusy(false);
    }
  };

  const submitReportReview = async () => {
    if (!reviewTarget) return;
    const values = await reviewForm.validateFields();
    await runAction(
      () => axiosInstance.put(`/api/admin/reports/${reviewTarget.id}/review`, {
        status: values.status,
        notes: values.notes,
        action_taken: values.action_taken,
      }),
      "Report reviewed",
      () => {
        setReviewTarget(null);
        reviewForm.resetFields();
        reportsQuery.refetch();
        reportStatsQuery.refetch();
      },
    );
  };

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>Moderation</Title>
          <Text type="secondary">Listings, feed posts, comments, reviews and member reports in one operational queue.</Text>
        </Col>
        <Col><Button icon={<ReloadOutlined />} onClick={refreshAll}>Refresh</Button></Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}><Card><Statistic title="Pending Listings" value={pendingListings.length} /></Card></Col>
        <Col xs={24} sm={12} lg={6}><Card><Statistic title="Pending Reports" value={reportStats.pending_count ?? feedStats.pendingReports ?? 0} /></Card></Col>
        <Col xs={24} sm={12} lg={6}><Card><Statistic title="Hidden Feed Posts" value={feedStats.hiddenPosts ?? 0} /></Card></Col>
        <Col xs={24} sm={12} lg={6}><Card><Statistic title="Reports Total" value={reportStats.total_reports ?? feedStats.totalReports ?? 0} /></Card></Col>
      </Row>

      <Tabs
        items={[
          {
            key: "listings",
            label: "Pending Listings",
            children: (
              <Card>
                <Table
                  loading={listingsQuery.isLoading}
                  dataSource={pendingListings}
                  rowKey={(r: any) => r.id}
                  size="small"
                  pagination={{ current: listingPage, pageSize: 20, total: totalFrom(listingsQuery.data, pendingListings.length), onChange: setListingPage }}
                  locale={{ emptyText: <Empty description="No listings waiting for moderation" /> }}
                >
                  <Table.Column title="Title" dataIndex="title" ellipsis />
                  <Table.Column title="Type" dataIndex="type" width={120} render={(v: string) => <Tag>{v || "listing"}</Tag>} />
                  <Table.Column title="Submitted By" render={(_: any, r: any) => person(r.user) || r.user_id || "--"} />
                  <Table.Column title="Submitted" dataIndex="created_at" width={160} render={date} />
                  <Table.Column
                    title="Actions"
                    width={210}
                    render={(_: any, record: any) => (
                      <Space>
                        <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => confirmAction("Approve listing", "Publish this listing?", () => axiosInstance.put(`/api/admin/listings/${record.id}/approve`), "Listing approved", listingsQuery.refetch)}>Approve</Button>
                        <Button size="small" danger icon={<CloseOutlined />} onClick={() => confirmAction("Reject listing", "Reject this listing?", () => axiosInstance.put(`/api/admin/listings/${record.id}/reject`, { reason: "Does not meet guidelines" }), "Listing rejected", listingsQuery.refetch, true)}>Reject</Button>
                      </Space>
                    )}
                  />
                </Table>
              </Card>
            ),
          },
          {
            key: "feed",
            label: "Feed",
            children: (
              <Card>
                <Table
                  loading={feedQuery.isLoading}
                  dataSource={feedPosts}
                  rowKey={(r: any) => r.id}
                  size="small"
                  pagination={{ current: feedPage, pageSize: 20, total: totalFrom(feedQuery.data, feedPosts.length), onChange: setFeedPage }}
                  locale={{ emptyText: <Empty description="No feed posts in moderation" /> }}
                >
                  <Table.Column title="Content" dataIndex="content" ellipsis />
                  <Table.Column title="Author" dataIndex="author" render={person} />
                  <Table.Column title="Reports" dataIndex="reportCount" width={90} render={(v: number) => v ?? 0} />
                  <Table.Column title="Hidden" dataIndex="isHidden" width={90} render={(v: boolean) => v ? <Tag color="red">Hidden</Tag> : <Tag color="green">Visible</Tag>} />
                  <Table.Column title="Created" dataIndex="createdAt" width={160} render={date} />
                  <Table.Column
                    title="Actions"
                    width={250}
                    render={(_: any, record: any) => (
                      <Space wrap>
                        <Button size="small" icon={<EyeOutlined />} onClick={() => inspect(`/api/admin/feed/posts/${record.id}`, record)}>Inspect</Button>
                        <Button size="small" icon={<StopOutlined />} onClick={() => confirmAction("Hide feed post", "Hide this post and action pending reports?", () => axiosInstance.post(`/api/admin/feed/posts/${record.id}/hide`, { reason: "Admin moderation" }), "Feed post hidden", () => { feedQuery.refetch(); feedStatsQuery.refetch(); })}>Hide</Button>
                        <Button size="small" danger icon={<DeleteOutlined />} onClick={() => confirmAction("Delete feed post", "Delete this post permanently?", () => axiosInstance.delete(`/api/admin/feed/posts/${record.id}`), "Feed post deleted", () => { feedQuery.refetch(); feedStatsQuery.refetch(); }, true)}>Delete</Button>
                      </Space>
                    )}
                  />
                </Table>
              </Card>
            ),
          },
          {
            key: "comments",
            label: "Comments",
            children: (
              <Card>
                <Table loading={commentsQuery.isLoading} dataSource={comments} rowKey={(r: any) => r.id} size="small" pagination={{ current: commentsPage, pageSize: 20, total: totalFrom(commentsQuery.data, comments.length), onChange: setCommentsPage }} locale={{ emptyText: <Empty description="No comments in moderation" /> }}>
                  <Table.Column title="Comment" dataIndex="content" ellipsis />
                  <Table.Column title="Author ID" dataIndex="author_id" width={100} />
                  <Table.Column title="Post ID" dataIndex="post_id" width={100} />
                  <Table.Column title="Hidden" dataIndex="is_hidden" width={90} render={(v: boolean) => v ? <Tag color="red">Hidden</Tag> : <Tag>Visible</Tag>} />
                  <Table.Column title="Created" dataIndex="created_at" width={160} render={date} />
                  <Table.Column
                    title="Actions"
                    width={190}
                    render={(_: any, record: any) => (
                      <Space>
                        <Button size="small" icon={<StopOutlined />} onClick={() => runAction(() => axiosInstance.post(`/api/admin/comments/${record.id}/hide`), "Comment hidden", commentsQuery.refetch)}>Hide</Button>
                        <Button size="small" danger icon={<DeleteOutlined />} onClick={() => confirmAction("Delete comment", "Delete this comment?", () => axiosInstance.delete(`/api/admin/comments/${record.id}`), "Comment deleted", commentsQuery.refetch, true)}>Delete</Button>
                      </Space>
                    )}
                  />
                </Table>
              </Card>
            ),
          },
          {
            key: "reviews",
            label: "Reviews",
            children: (
              <Card>
                <Table loading={reviewsQuery.isLoading} dataSource={reviews} rowKey={(r: any) => r.id} size="small" pagination={{ current: reviewsPage, pageSize: 20, total: totalFrom(reviewsQuery.data, reviews.length), onChange: setReviewsPage }} locale={{ emptyText: <Empty description="No reviews in moderation" /> }}>
                  <Table.Column title="Review" dataIndex="content" ellipsis />
                  <Table.Column title="Rating" dataIndex="rating" width={90} />
                  <Table.Column title="Reviewer" dataIndex="reviewer_id" width={100} />
                  <Table.Column title="Target" dataIndex="target_user_id" width={100} />
                  <Table.Column title="Flags" width={100} render={(_: any, r: any) => r.is_flagged ? <Tag color="red">Flagged</Tag> : <Tag>Clear</Tag>} />
                  <Table.Column
                    title="Actions"
                    width={250}
                    render={(_: any, record: any) => (
                      <Space>
                        <Button size="small" icon={<FlagOutlined />} onClick={() => runAction(() => axiosInstance.post(`/api/admin/reviews/${record.id}/flag`), "Review flagged", reviewsQuery.refetch)}>Flag</Button>
                        <Button size="small" icon={<StopOutlined />} onClick={() => runAction(() => axiosInstance.post(`/api/admin/reviews/${record.id}/hide`), "Review hidden", reviewsQuery.refetch)}>Hide</Button>
                        <Button size="small" danger icon={<DeleteOutlined />} onClick={() => confirmAction("Delete review", "Delete this review?", () => axiosInstance.delete(`/api/admin/reviews/${record.id}`), "Review deleted", reviewsQuery.refetch, true)}>Delete</Button>
                      </Space>
                    )}
                  />
                </Table>
              </Card>
            ),
          },
          {
            key: "reports",
            label: "Reports",
            children: (
              <Card>
                <Table loading={reportsQuery.isLoading} dataSource={reports} rowKey={(r: any) => r.id} size="small" pagination={{ current: reportsPage, pageSize: 20, total: totalFrom(reportsQuery.data, reports.length), onChange: setReportsPage }} locale={{ emptyText: <Empty description="No member reports pending" /> }}>
                  <Table.Column title="Content" render={(_: any, r: any) => `${r.content_type || "--"} #${r.content_id || "--"}`} />
                  <Table.Column title="Reason" dataIndex="reason" width={150} render={(v: string) => <Tag>{v || "--"}</Tag>} />
                  <Table.Column title="Status" dataIndex="status" width={120} render={(v: string) => <Tag color={v === "pending" ? "orange" : "green"}>{v || "--"}</Tag>} />
                  <Table.Column title="Reporter" dataIndex="reporter" render={person} />
                  <Table.Column title="Created" dataIndex="created_at" width={160} render={date} />
                  <Table.Column
                    title="Actions"
                    width={220}
                    render={(_: any, record: any) => (
                      <Space>
                        <Button size="small" icon={<EyeOutlined />} onClick={() => inspect(`/api/admin/reports/${record.id}`, record)}>Inspect</Button>
                        <Button size="small" type="primary" onClick={() => { setReviewTarget(record); reviewForm.setFieldsValue({ status: "resolved", action_taken: "Reviewed by admin" }); }}>Review</Button>
                      </Space>
                    )}
                  />
                </Table>
              </Card>
            ),
          },
        ]}
      />

      <Modal title="Moderation Detail" open={!!detail} onCancel={() => setDetail(null)} footer={null} width={760}>
        {detail && (
          <Descriptions column={1} bordered size="small">
            {Object.entries(detail).map(([key, value]) => (
              <Descriptions.Item key={key} label={key}>
                {typeof value === "object" && value !== null ? <Text code>{JSON.stringify(value)}</Text> : String(value ?? "--")}
              </Descriptions.Item>
            ))}
          </Descriptions>
        )}
      </Modal>

      <Modal title="Review Report" open={!!reviewTarget} onOk={submitReportReview} confirmLoading={busy} onCancel={() => setReviewTarget(null)}>
        <Form form={reviewForm} layout="vertical">
          <Form.Item name="status" label="Status" rules={[{ required: true }]}>
            <Input placeholder="resolved, dismissed, action_taken" />
          </Form.Item>
          <Form.Item name="action_taken" label="Action Taken">
            <Input />
          </Form.Item>
          <Form.Item name="notes" label="Review Notes">
            <TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
