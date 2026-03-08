import React, { type ReactElement } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { HeroUIProvider } from "@heroui/react";
import { AuthProvider } from "@/contexts/auth-context";

// Mock API responses
export const mockUser = {
  id: 1,
  email: "test@example.com",
  first_name: "Test",
  last_name: "User",
  role: "member" as const,
  tenant_id: 1,
  created_at: "2024-01-01T00:00:00Z",
};

export const mockListing = {
  id: 1,
  title: "Test Listing",
  description: "Test description",
  type: "offer" as const,
  status: "active" as const,
  time_credits: 2,
  user_id: 1,
  user: mockUser,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

export const mockTransaction = {
  id: 1,
  sender_id: 1,
  receiver_id: 2,
  amount: 2,
  description: "Test transaction",
  created_at: "2024-01-01T00:00:00Z",
  sender: mockUser,
  receiver: { ...mockUser, id: 2, first_name: "Jane", last_name: "Doe" },
};

export const mockConversation = {
  id: 1,
  participant_ids: [1, 2],
  participants: [
    mockUser,
    { ...mockUser, id: 2, first_name: "Jane", last_name: "Doe" },
  ],
  last_message: {
    id: 1,
    conversation_id: 1,
    sender_id: 2,
    content: "Hello!",
    read: false,
    created_at: "2024-01-01T00:00:00Z",
  },
  unread_count: 1,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

// Custom render with providers
interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  initialAuthState?: {
    user: typeof mockUser | null;
    isAuthenticated: boolean;
  };
}

function AllTheProviders({ children }: { children: React.ReactNode }) {
  return (
    <HeroUIProvider>
      <AuthProvider>{children}</AuthProvider>
    </HeroUIProvider>
  );
}

function ProvidersWithoutAuth({ children }: { children: React.ReactNode }) {
  return <HeroUIProvider>{children}</HeroUIProvider>;
}

export function renderWithProviders(
  ui: ReactElement,
  options?: CustomRenderOptions
) {
  return render(ui, { wrapper: AllTheProviders, ...options });
}

export function renderWithoutAuth(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) {
  return render(ui, { wrapper: ProvidersWithoutAuth, ...options });
}

// Re-export everything from testing-library
export * from "@testing-library/react";
export { default as userEvent } from "@testing-library/user-event";
