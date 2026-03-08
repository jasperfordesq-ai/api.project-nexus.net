import type { AuthProvider } from "@refinedev/core";
import axiosInstance from "../utils/axios";
import {
  getToken,
  getRefreshToken,
  setToken,
  setRefreshToken,
  setStoredUser,
  getStoredUser,
  clearAuth,
  type StoredUser,
} from "../utils/token";

export const authProvider: AuthProvider = {
  login: async ({ email, password, tenant_slug }) => {
    try {
      const { data } = await axiosInstance.post("/api/auth/login", {
        email,
        password,
        tenant_slug,
      });

      if (data.requires_2fa) {
        // Store temporary state for 2FA verification
        sessionStorage.setItem("nexus_2fa_temp", JSON.stringify({
          temp_token: data.temp_token || data.access_token,
          email,
          tenant_slug,
        }));
        return {
          success: false,
          error: { name: "2FA Required", message: "Please verify your 2FA code." },
          redirectTo: "/2fa",
        };
      }

      if (!data.access_token) {
        return {
          success: false,
          error: { name: "Login Failed", message: data.message || "Invalid credentials" },
        };
      }

      setToken(data.access_token);
      if (data.refresh_token) setRefreshToken(data.refresh_token);

      const user: StoredUser = {
        id: data.user?.id,
        email: data.user?.email || email,
        first_name: data.user?.first_name || "",
        last_name: data.user?.last_name || "",
        role: data.user?.role || "member",
        tenant_slug,
      };
      setStoredUser(user);

      // Reject non-admin users
      if (user.role !== "admin") {
        clearAuth();
        return {
          success: false,
          error: { name: "Access Denied", message: "Admin access required." },
        };
      }

      return { success: true, redirectTo: "/" };
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || "Login failed";
      return {
        success: false,
        error: { name: "Login Error", message },
      };
    }
  },

  logout: async () => {
    try {
      const token = getToken();
      if (token) {
        await axiosInstance.post("/api/auth/logout").catch(() => {});
      }
    } finally {
      clearAuth();
    }
    return { success: true, redirectTo: "/login" };
  },

  check: async () => {
    const token = getToken();
    if (!token) {
      return { authenticated: false, redirectTo: "/login" };
    }

    // Check if token is expired by decoding JWT payload
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const exp = payload.exp * 1000;
      if (Date.now() >= exp) {
        // Try to refresh
        const refreshToken = getRefreshToken();
        if (!refreshToken) {
          clearAuth();
          return { authenticated: false, redirectTo: "/login" };
        }
        try {
          const { data } = await axiosInstance.post("/api/auth/refresh", {
            refresh_token: refreshToken,
          });
          setToken(data.access_token);
          if (data.refresh_token) setRefreshToken(data.refresh_token);
          return { authenticated: true };
        } catch {
          clearAuth();
          return { authenticated: false, redirectTo: "/login" };
        }
      }
      return { authenticated: true };
    } catch {
      clearAuth();
      return { authenticated: false, redirectTo: "/login" };
    }
  },

  getIdentity: async () => {
    const user = getStoredUser();
    if (!user) return null;
    return {
      id: user.id,
      name: `${user.first_name} ${user.last_name}`.trim() || user.email,
      email: user.email,
      role: user.role,
      avatar: undefined,
    };
  },

  getPermissions: async () => {
    const user = getStoredUser();
    return user?.role || null;
  },

  onError: async (error) => {
    if (error?.statusCode === 401 || error?.response?.status === 401) {
      return { logout: true, redirectTo: "/login" };
    }
    return { error };
  },
};
