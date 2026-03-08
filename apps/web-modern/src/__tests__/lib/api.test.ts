import {
  getToken,
  setToken,
  removeToken,
  getStoredUser,
  setStoredUser,
  isAuthenticated,
} from "@/lib/api";

describe("API Token Management", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe("getToken", () => {
    it("returns null when no token is stored", () => {
      (localStorage.getItem as jest.Mock).mockReturnValue(null);
      expect(getToken()).toBeNull();
    });

    it("returns the stored token", () => {
      (localStorage.getItem as jest.Mock).mockReturnValue("test-token");
      expect(getToken()).toBe("test-token");
    });
  });

  describe("setToken", () => {
    it("stores the token in localStorage", () => {
      setToken("new-token");
      expect(localStorage.setItem).toHaveBeenCalledWith("nexus_token", "new-token");
    });
  });

  describe("removeToken", () => {
    it("removes both token and user from localStorage", () => {
      removeToken();
      expect(localStorage.removeItem).toHaveBeenCalledWith("nexus_token");
      expect(localStorage.removeItem).toHaveBeenCalledWith("nexus_user");
    });
  });

  describe("getStoredUser", () => {
    it("returns null when no user is stored", () => {
      (localStorage.getItem as jest.Mock).mockReturnValue(null);
      expect(getStoredUser()).toBeNull();
    });

    it("returns parsed user object when stored", () => {
      const user = { id: 1, email: "test@example.com" };
      (localStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify(user));
      expect(getStoredUser()).toEqual(user);
    });
  });

  describe("setStoredUser", () => {
    it("stores the user as JSON in localStorage", () => {
      const user = {
        id: 1,
        email: "test@example.com",
        first_name: "Test",
        last_name: "User",
        role: "member" as const,
        tenant_id: 1,
        created_at: "2024-01-01T00:00:00Z",
      };
      setStoredUser(user);
      expect(localStorage.setItem).toHaveBeenCalledWith(
        "nexus_user",
        JSON.stringify(user)
      );
    });
  });

  describe("isAuthenticated", () => {
    it("returns false when no token exists", () => {
      (localStorage.getItem as jest.Mock).mockReturnValue(null);
      expect(isAuthenticated()).toBe(false);
    });

    it("returns true when token exists", () => {
      (localStorage.getItem as jest.Mock).mockReturnValue("token");
      expect(isAuthenticated()).toBe(true);
    });
  });
});

describe("API Client", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    // Reset module to clear cached state
    jest.resetModules();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("request handling", () => {
    it("includes authorization header when token exists", async () => {
      (localStorage.getItem as jest.Mock).mockReturnValue("test-token");
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: "test" }),
      });

      const { api } = await import("@/lib/api");
      await api.healthCheck();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
          }),
        })
      );
    });

    it("handles 204 No Content response", async () => {
      (localStorage.getItem as jest.Mock).mockReturnValue("test-token");
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 204,
      });

      const { api } = await import("@/lib/api");
      const result = await api.markNotificationAsRead(1);

      expect(result).toEqual({});
    });

    it("throws error on failed request", async () => {
      (localStorage.getItem as jest.Mock).mockReturnValue("test-token");
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: "Bad request" }),
      });

      const { api } = await import("@/lib/api");

      await expect(api.healthCheck()).rejects.toThrow();
    });
  });
});
