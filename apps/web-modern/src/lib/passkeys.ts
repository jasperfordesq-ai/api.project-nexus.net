// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Passkey/WebAuthn utilities using @simplewebauthn/browser.
 * Handles registration, authentication, and browser capability detection.
 * All crypto is delegated to the browser WebAuthn API via SimpleWebAuthn.
 */

import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
  browserSupportsWebAuthnAutofill,
} from "@simplewebauthn/browser";
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from "@simplewebauthn/browser";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5080";
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID || "";

/** Build common headers for passkey API calls */
function passkeyHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (TENANT_ID) h["X-Tenant-ID"] = TENANT_ID;
  return h;
}

// ============================================================================
// Feature Detection
// ============================================================================

export interface PasskeyCapabilities {
  /** Browser supports WebAuthn at all */
  webauthnSupported: boolean;
  /** Device has a platform authenticator (Windows Hello, Touch ID, etc.) */
  platformAuthenticator: boolean;
  /** Browser supports conditional mediation (autofill passkey prompt) */
  conditionalMediation: boolean;
}

/**
 * Detect what passkey features are available on this browser/device.
 * Call once on page load to determine what UI to show.
 */
export async function detectPasskeyCapabilities(): Promise<PasskeyCapabilities> {
  const webauthnSupported = browserSupportsWebAuthn();

  if (!webauthnSupported) {
    return {
      webauthnSupported: false,
      platformAuthenticator: false,
      conditionalMediation: false,
    };
  }

  const [platformAuthenticator, conditionalMediation] = await Promise.all([
    platformAuthenticatorIsAvailable().catch(() => false),
    browserSupportsWebAuthnAutofill().catch(() => false),
  ]);

  return {
    webauthnSupported,
    platformAuthenticator,
    conditionalMediation,
  };
}

// ============================================================================
// Registration (requires auth token)
// ============================================================================

/**
 * Begin passkey registration. Must be called by an authenticated user.
 * Returns the creation options from the server.
 */
async function beginRegistration(
  token: string
): Promise<PublicKeyCredentialCreationOptionsJSON> {
  const res = await fetch(`${API_BASE}/api/passkeys/register/begin`, {
    method: "POST",
    headers: {
      ...passkeyHeaders(),
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    if (res.status === 409) {
      throw new Error(error.error || "Maximum passkeys reached. Remove one first.");
    }
    throw new Error(error.error || "Failed to begin registration");
  }

  return res.json();
}

/**
 * Finish passkey registration by sending the authenticator response to the server.
 */
async function finishRegistration(
  token: string,
  attestationResponse: RegistrationResponseJSON,
  displayName?: string
): Promise<{ success: boolean; passkey: PasskeyInfo }> {
  const res = await fetch(`${API_BASE}/api/passkeys/register/finish`, {
    method: "POST",
    headers: {
      ...passkeyHeaders(),
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      attestation_response: attestationResponse,
      display_name: displayName,
    }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || "Failed to complete registration");
  }

  return res.json();
}

/**
 * Full passkey registration flow.
 * Calls begin, prompts the user via the browser WebAuthn API, then calls finish.
 */
export async function registerPasskey(
  token: string,
  displayName?: string
): Promise<PasskeyInfo> {
  // Step 1: Get creation options from server
  const options = await beginRegistration(token);

  // Step 2: Create credential via browser WebAuthn API
  // This triggers the OS passkey prompt (Windows Hello, Touch ID, etc.)
  const attestationResponse = await startRegistration({ optionsJSON: options });

  // Step 3: Send response to server for verification
  const result = await finishRegistration(token, attestationResponse, displayName);

  return result.passkey;
}

// ============================================================================
// Authentication (public, no auth token needed)
// ============================================================================

interface AuthBeginResponse {
  options: PublicKeyCredentialRequestOptionsJSON;
  session_id: string;
}

/**
 * Begin passkey authentication.
 * Can be called with or without tenant/email context.
 */
async function beginAuthentication(params?: {
  tenantSlug?: string;
  email?: string;
}): Promise<AuthBeginResponse> {
  const res = await fetch(`${API_BASE}/api/passkeys/authenticate/begin`, {
    method: "POST",
    headers: passkeyHeaders(),
    body: JSON.stringify({
      tenant_slug: params?.tenantSlug,
      email: params?.email,
    }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Authentication failed" }));
    throw new Error(error.error || "Failed to begin authentication");
  }

  return res.json();
}

/**
 * Finish passkey authentication by sending the assertion response.
 * Returns JWT tokens on success (same format as password login).
 */
async function finishAuthentication(
  sessionId: string,
  assertionResponse: AuthenticationResponseJSON
): Promise<PasskeyAuthResponse> {
  const res = await fetch(`${API_BASE}/api/passkeys/authenticate/finish`, {
    method: "POST",
    headers: passkeyHeaders(),
    body: JSON.stringify({
      session_id: sessionId,
      assertion_response: assertionResponse,
    }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Authentication failed" }));
    throw new Error(error.error || "Passkey authentication failed");
  }

  return res.json();
}

/**
 * Full passkey authentication flow (explicit button click).
 * Calls begin, prompts the user, then calls finish.
 */
export async function authenticateWithPasskey(params?: {
  tenantSlug?: string;
  email?: string;
}): Promise<PasskeyAuthResponse> {
  // Step 1: Get assertion options from server
  const { options, session_id } = await beginAuthentication(params);

  // Step 2: Get assertion from browser WebAuthn API
  // This triggers the OS passkey prompt
  const assertionResponse = await startAuthentication({ optionsJSON: options });

  // Step 3: Verify with server and get JWT tokens
  return finishAuthentication(session_id, assertionResponse);
}

/**
 * Start conditional mediation (passkey autofill).
 * Call this on page load - it waits for the user to interact with the
 * autofill prompt on the username field.
 * Returns null if conditional mediation is not supported or the user cancels.
 */
export async function startConditionalAuthentication(params?: {
  tenantSlug?: string;
}): Promise<PasskeyAuthResponse | null> {
  try {
    // Check if conditional mediation is supported
    const canAutoFill = await browserSupportsWebAuthnAutofill();
    if (!canAutoFill) return null;

    // Get assertion options (empty allowCredentials for discoverable credentials)
    const { options, session_id } = await beginAuthentication({
      tenantSlug: params?.tenantSlug,
    });

    // Start conditional mediation - this will show passkey in autofill
    const assertionResponse = await startAuthentication({
      optionsJSON: options,
      useBrowserAutofill: true,
    });

    // User selected a passkey from autofill - verify it
    return finishAuthentication(session_id, assertionResponse);
  } catch {
    // Conditional mediation was aborted or not supported - that's fine
    return null;
  }
}

// ============================================================================
// Passkey Management
// ============================================================================

export interface PasskeyInfo {
  id: number;
  display_name: string | null;
  created_at: string;
  last_used_at: string | null;
  is_discoverable: boolean;
  transports: string | null;
}

/**
 * List all passkeys for the current user.
 */
export async function listPasskeys(token: string): Promise<PasskeyInfo[]> {
  const res = await fetch(`${API_BASE}/api/passkeys`, {
    headers: { ...passkeyHeaders(), Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error("Failed to list passkeys");

  const data = await res.json();
  return data.passkeys;
}

/**
 * Delete a passkey.
 */
export async function deletePasskey(
  token: string,
  passkeyId: number
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/passkeys/${passkeyId}`, {
    method: "DELETE",
    headers: { ...passkeyHeaders(), Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    if (res.status === 409) {
      throw new Error(error.error || "Cannot delete your only passkey.");
    }
    throw new Error(error.error || "Failed to delete passkey");
  }
}

/**
 * Rename a passkey.
 */
export async function renamePasskey(
  token: string,
  passkeyId: number,
  displayName: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/passkeys/${passkeyId}`, {
    method: "PUT",
    headers: {
      ...passkeyHeaders(),
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ display_name: displayName }),
  });

  if (!res.ok) throw new Error("Failed to rename passkey");
}

// ============================================================================
// Types
// ============================================================================

export interface PasskeyAuthResponse {
  success: boolean;
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    tenant_id: number;
    tenant_slug: string;
  };
}
