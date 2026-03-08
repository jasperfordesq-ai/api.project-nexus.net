import { TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY } from "../config/constants";

export interface StoredUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  tenant_id?: number;
  tenant_slug?: string;
}

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);

export const getRefreshToken = (): string | null => localStorage.getItem(REFRESH_TOKEN_KEY);
export const setRefreshToken = (token: string) => localStorage.setItem(REFRESH_TOKEN_KEY, token);

export const getStoredUser = (): StoredUser | null => {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};
export const setStoredUser = (user: StoredUser) =>
  localStorage.setItem(USER_KEY, JSON.stringify(user));

export const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};
