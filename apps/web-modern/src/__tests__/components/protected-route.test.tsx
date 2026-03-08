import { render, screen, waitFor } from "@testing-library/react";
import { ProtectedRoute } from "@/components/protected-route";
import { AuthProvider } from "@/contexts/auth-context";
import { HeroUIProvider } from "@heroui/react";

// Mock the auth context
const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

// Mock the API
jest.mock("@/lib/api", () => ({
  api: {
    validateToken: jest.fn(),
    getCurrentUser: jest.fn(),
    logout: jest.fn(),
    login: jest.fn(),
  },
  getToken: jest.fn(),
  getStoredUser: jest.fn(),
  removeToken: jest.fn(),
  setToken: jest.fn(),
  setStoredUser: jest.fn(),
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <HeroUIProvider>
      <AuthProvider>{ui}</AuthProvider>
    </HeroUIProvider>
  );
};

describe("ProtectedRoute", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("redirects to login when not authenticated", async () => {
    const { getToken, getStoredUser } = require("@/lib/api");
    getToken.mockReturnValue(null);
    getStoredUser.mockReturnValue(null);

    renderWithProviders(
      <ProtectedRoute>
        <div>Protected content</div>
      </ProtectedRoute>
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });

  it("renders children when authenticated", async () => {
    const { getToken, api } = require("@/lib/api");
    getToken.mockReturnValue("valid-token");
    api.validateToken.mockResolvedValue({
      id: 1,
      email: "test@example.com",
      first_name: "Test",
      last_name: "User",
      role: "member",
      tenant_id: 1,
      created_at: "2024-01-01T00:00:00Z",
    });

    renderWithProviders(
      <ProtectedRoute>
        <div>Protected content</div>
      </ProtectedRoute>
    );

    await waitFor(() => {
      expect(screen.getByText("Protected content")).toBeInTheDocument();
    });
  });

  it("removes token when validation fails", async () => {
    const { getToken, api, removeToken } = require("@/lib/api");
    getToken.mockReturnValue("invalid-token");
    api.validateToken.mockRejectedValue(new Error("Invalid token"));

    renderWithProviders(
      <ProtectedRoute>
        <div>Protected content</div>
      </ProtectedRoute>
    );

    await waitFor(() => {
      expect(removeToken).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });
});
