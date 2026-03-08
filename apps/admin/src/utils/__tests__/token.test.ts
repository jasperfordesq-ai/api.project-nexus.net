import { describe, it, expect, beforeEach } from "vitest";

// We need to mock localStorage before importing the module under test,
// since jsdom provides localStorage automatically, we can use it directly.

// We must also handle the import.meta.env usage in constants.ts.
// Since vitest + vite handle import.meta.env natively, we can import directly.

import { getToken, setToken, getRefreshToken, setRefreshToken, getStoredUser, setStoredUser, clearAuth } from "../token";
import type { StoredUser } from "../token";
import { TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY } from "../../config/constants";

describe("token utilities", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("getToken / setToken", () => {
    it("returns null when no token is stored", () => {
      expect(getToken()).toBeNull();
    });

    it("stores and retrieves an access token", () => {
      setToken("abc123");
      expect(getToken()).toBe("abc123");
      expect(localStorage.getItem(TOKEN_KEY)).toBe("abc123");
    });

    it("overwrites a previous token", () => {
      setToken("first");
      setToken("second");
      expect(getToken()).toBe("second");
    });
  });

  describe("getRefreshToken / setRefreshToken", () => {
    it("returns null when no refresh token is stored", () => {
      expect(getRefreshToken()).toBeNull();
    });

    it("stores and retrieves a refresh token", () => {
      setRefreshToken("refresh_xyz");
      expect(getRefreshToken()).toBe("refresh_xyz");
      expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe("refresh_xyz");
    });
  });

  describe("getStoredUser / setStoredUser", () => {
    const testUser: StoredUser = {
      id: 42,
      email: "admin@acme.test",
      first_name: "Admin",
      last_name: "User",
      role: "admin",
      tenant_id: 1,
      tenant_slug: "acme",
    };

    it("returns null when no user is stored", () => {
      expect(getStoredUser()).toBeNull();
    });

    it("stores and retrieves a user object", () => {
      setStoredUser(testUser);
      const retrieved = getStoredUser();
      expect(retrieved).toEqual(testUser);
    });

    it("returns null for invalid JSON in storage", () => {
      localStorage.setItem(USER_KEY, "not-valid-json{{{");
      expect(getStoredUser()).toBeNull();
    });

    it("handles user without optional fields", () => {
      const minimalUser: StoredUser = {
        id: 1,
        email: "test@test.com",
        first_name: "Test",
        last_name: "User",
        role: "member",
      };
      setStoredUser(minimalUser);
      const retrieved = getStoredUser();
      expect(retrieved).toEqual(minimalUser);
      expect(retrieved?.tenant_id).toBeUndefined();
      expect(retrieved?.tenant_slug).toBeUndefined();
    });
  });

  describe("clearAuth", () => {
    it("removes all auth-related keys from localStorage", () => {
      setToken("token");
      setRefreshToken("refresh");
      setStoredUser({
        id: 1,
        email: "a@b.com",
        first_name: "A",
        last_name: "B",
        role: "member",
      });

      clearAuth();

      expect(getToken()).toBeNull();
      expect(getRefreshToken()).toBeNull();
      expect(getStoredUser()).toBeNull();
    });

    it("does not throw when called with nothing stored", () => {
      expect(() => clearAuth()).not.toThrow();
    });
  });
});
