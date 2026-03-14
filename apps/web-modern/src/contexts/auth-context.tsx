// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  api,
  getToken,
  setToken,
  setStoredUser,
  getStoredUser,
  removeToken,
  type User,
  type AuthResponse,
} from "@/lib/api";
import type { PasskeyAuthResponse } from "@/lib/passkeys";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, tenantSlug: string) => Promise<AuthResponse>;
  loginWithPasskey: (passkeyResponse: PasskeyAuthResponse) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Check for existing session on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = getToken();
      if (token) {
        try {
          // Validate token with API
          const validatedUser = await api.validateToken();
          setUser(validatedUser);
        } catch {
          // Token invalid, clear it
          removeToken();
          setUser(null);
        }
      } else {
        // No token, check localStorage for cached user
        const storedUser = getStoredUser();
        if (storedUser) {
          // We have a stored user but no token - clear it
          removeToken();
        }
        setUser(null);
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = useCallback(
    async (email: string, password: string, tenantSlug: string) => {
      const response = await api.login(email, password, tenantSlug);
      setUser(response.user);
      return response;
    },
    []
  );

  const loginWithPasskey = useCallback(
    (passkeyResponse: PasskeyAuthResponse) => {
      const token = passkeyResponse.access_token;
      setToken(token);
      const passkeyUser: User = {
        id: passkeyResponse.user.id,
        email: passkeyResponse.user.email,
        first_name: passkeyResponse.user.first_name,
        last_name: passkeyResponse.user.last_name,
        role: passkeyResponse.user.role as User["role"],
        tenant_id: passkeyResponse.user.tenant_id,
        created_at: new Date().toISOString(),
      };
      setStoredUser(passkeyUser);
      setUser(passkeyUser);
    },
    []
  );

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
    router.push("/login");
  }, [router]);

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await api.getCurrentUser();
      setUser(currentUser);
    } catch {
      logout();
    }
  }, [logout]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        loginWithPasskey,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
