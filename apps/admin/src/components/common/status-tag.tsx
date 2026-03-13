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
};

export const StatusTag = ({ status }: { status?: string }) => {
  if (!status) return <Tag>Unknown</Tag>;
  const color = statusColors[status.toLowerCase()] || "default";
  return <Tag color={color}>{status.charAt(0).toUpperCase() + status.slice(1)}</Tag>;
};
