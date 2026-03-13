// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import type { AccessControlProvider } from "@refinedev/core";
import { getStoredUser } from "../utils/token";

export const accessControlProvider: AccessControlProvider = {
  can: async ({ resource, action }) => {
    const user = getStoredUser();
    if (!user) return { can: false, reason: "Not authenticated" };
    const adminRoles = ["admin", "super_admin"];
    if (!adminRoles.includes(user.role)) return { can: false, reason: "Admin role required" };
    return { can: true };
  },
};
