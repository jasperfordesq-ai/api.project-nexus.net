// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { List, useTable, EditButton, DeleteButton, CreateButton } from "@refinedev/antd";
import { Table, Space, Tag } from "antd";

export const RoleList = () => {
  const { tableProps } = useTable({
    resource: "roles",
    meta: { apiPath: "/api/admin/roles" },
  });

  return (
    <List headerButtons={<CreateButton />}>
      <Table {...tableProps} rowKey="id" size="middle">
        <Table.Column dataIndex="id" title="ID" width={60} />
        <Table.Column dataIndex="name" title="Name" />
        <Table.Column dataIndex="description" title="Description" />
        <Table.Column
          dataIndex="is_system"
          title="System"
          render={(val: boolean) => val ? <Tag color="blue">System</Tag> : <Tag>Custom</Tag>}
        />
        <Table.Column
          title="Actions"
          render={(_, record: any) => (
            <Space>
              <EditButton hideText size="small" recordItemId={record.id} />
              {!record.is_system && <DeleteButton hideText size="small" recordItemId={record.id} />}
            </Space>
          )}
        />
      </Table>
    </List>
  );
};
