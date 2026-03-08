import type { AccessControlProvider } from "@refinedev/core";
import { getStoredUser } from "../utils/token";

export const accessControlProvider: AccessControlProvider = {
  can: async ({ resource, action }) => {
    const user = getStoredUser();
    if (!user) return { can: false, reason: "Not authenticated" };
    if (user.role !== "admin") return { can: false, reason: "Admin role required" };
    return { can: true };
  },
};
