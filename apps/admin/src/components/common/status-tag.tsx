// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { Tag } from "antd";

const statusColors: Record<string, string> = {
  active: "green",
  suspended: "red",
  pending: "orange",
  inactive: "default",
  approved: "green",
  rejected: "red",
  draft: "default",
  published: "blue",
  completed: "green",
  cancelled: "volcano",
  info: "blue",
  warning: "orange",
  error: "red",
  admin: "purple",
  super_admin: "purple",
  member: "blue",
  moderator: "cyan",
};

export const StatusTag = ({ status }: { status?: string }) => {
  if (!status) return <Tag>Unknown</Tag>;
  const color = statusColors[status.toLowerCase()] || "default";
  return <Tag color={color}>{status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</Tag>;
};
