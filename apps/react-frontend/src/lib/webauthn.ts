// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * WebAuthn/Biometric Authentication helpers
 *
 * Wraps @simplewebauthn/browser to work with the ASP.NET Core backend.
 * Backend endpoints: /api/passkeys/register/{begin,finish}, /authenticate/{begin,finish}
 *
 * The ASP.NET backend uses fido2-net-lib and returns standard WebAuthn JSON.
 */

import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
} from '@simplewebauthn/browser';
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/browser';
import { api } from '@/lib/api';

// ─────────────────────────────────────────────────────────────────────────────
// Feature Detection
// ─────────────────────────────────────────────────────────────────────────────

/** Check if WebAuthn is supported at all (for login page passkey button) */
export function isWebAuthnSupported(): boolean {
  return browserSupportsWebAuthn();
}

/** Check if a platform authenticator is available (Windows Hello, Touch ID, etc.) */
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!browserSupportsWebAuthn()) return false;
  return platformAuthenticatorIsAvailable();
}

/** Check if passkey features should be shown. */
export async function isBiometricAvailable(): Promise<boolean> {
  if (!browserSupportsWebAuthn()) return false;
  return platformAuthenticatorIsAvailable();
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface WebAuthnCredential {
  id: number;
  display_name: string | null;
  created_at: string;
  last_used_at: string | null;
  is_discoverable: boolean;
  transports: string | null;
  // Legacy compatibility aliases
  credential_id?: string;
  device_name?: string | null;
  authenticator_type?: string | null;
}

interface WebAuthnStatus {
  registered: boolean;
  count: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Device / Platform Detection
// ─────────────────────────────────────────────────────────────────────────────

export type DevicePlatform = 'windows' | 'mac' | 'iphone' | 'ipad' | 'android' | 'linux' | 'unknown';

export function detectPlatform(): DevicePlatform {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone/.test(ua)) return 'iphone';
  if (/ipad/.test(ua) || (/macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ipad';
  if (/android/.test(ua)) return 'android';
  if (/windows/.test(ua)) return 'windows';
  if (/macintosh|mac os/.test(ua)) return 'mac';
  if (/linux/.test(ua)) return 'linux';
  return 'unknown';
}

export function getDefaultDeviceName(): string {
  const platform = detectPlatform();
  const names: Record<DevicePlatform, string> = {
    windows: 'Windows PC',
    mac: 'Mac',
    iphone: 'iPhone',
    ipad: 'iPad',
    android: 'Android device',
    linux: 'Linux PC',
    unknown: 'Device',
  };
  return names[platform];
}

// ─────────────────────────────────────────────────────────────────────────────
// Registration (Enroll a new biometric credential)
// ─────────────────────────────────────────────────────────────────────────────

export type AuthenticatorAttachment = 'platform' | 'cross-platform' | undefined;

export async function registerBiometric(
  deviceName?: string,
  attachment?: AuthenticatorAttachment,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Step 1: Get registration options from ASP.NET backend
    // POST /api/passkeys/register/begin → returns fido2-net-lib CredentialCreateOptions
    const challengeRes = await api.post<PublicKeyCredentialCreationOptionsJSON>(
      '/passkeys/register/begin', {}
    );

    if (!challengeRes.success || !challengeRes.data) {
      return { success: false, error: challengeRes.error || 'Failed to get registration challenge' };
    }

    const optionsJSON = { ...challengeRes.data };

    // Override authenticator attachment if specified
    if (attachment && optionsJSON.authenticatorSelection) {
      optionsJSON.authenticatorSelection = {
        ...optionsJSON.authenticatorSelection,
        authenticatorAttachment: attachment,
      };
    }

    // WebAuthn Level 3 "hints"
    let hints: Array<'client-device' | 'hybrid' | 'security-key'> | undefined;
    if (attachment === 'platform') {
      hints = ['client-device'];
    } else if (attachment === 'cross-platform') {
      hints = ['hybrid', 'security-key'];
    }
    if (hints) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (optionsJSON as any).hints = hints;
    }

    // Step 2: Trigger browser biometric prompt
    let credential: RegistrationResponseJSON;
    try {
      credential = await startRegistration({ optionsJSON });
    } catch (firstErr: unknown) {
      const msg = firstErr instanceof Error ? firstErr.message : '';
      const isNotAllowed = msg.includes('NotAllowedError') || msg.includes('not allowed') || msg.includes('timed out');
      if (isNotAllowed && attachment === 'platform') {
        const fallbackOptions: PublicKeyCredentialCreationOptionsJSON = {
          ...optionsJSON,
          authenticatorSelection: {
            ...optionsJSON.authenticatorSelection,
            authenticatorAttachment: undefined,
          },
          hints: undefined,
        };
        credential = await startRegistration({ optionsJSON: fallbackOptions });
      } else {
        throw firstErr;
      }
    }

    // Step 3: Send credential to server for verification + storage
    // POST /api/passkeys/register/finish
    const verifyRes = await api.post('/passkeys/register/finish', {
      attestationResponse: credential,
      displayName: deviceName || getDefaultDeviceName(),
    });

    if (!verifyRes.success) {
      return { success: false, error: verifyRes.error || 'Failed to verify registration' };
    }

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Biometric registration failed';
    if (message.includes('NotAllowedError') || message.includes('cancelled') || message.includes('denied')) {
      return { success: false, error: 'Biometric registration was cancelled.' };
    }
    return { success: false, error: message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Authentication (Login with biometric)
// ─────────────────────────────────────────────────────────────────────────────

export async function authenticateWithBiometric(
  email?: string,
): Promise<{
  success: boolean;
  data?: {
    user: { id: number; first_name: string; last_name: string; email: string };
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
  error?: string;
}> {
  try {
    // Step 1: Get authentication options from ASP.NET backend
    // POST /api/passkeys/authenticate/begin → returns { options, session_id }
    const challengeRes = await api.post<{
      options: PublicKeyCredentialRequestOptionsJSON;
      session_id: string;
    }>('/passkeys/authenticate/begin', { email }, { skipAuth: true });

    if (!challengeRes.success || !challengeRes.data) {
      return { success: false, error: challengeRes.error || 'Failed to get authentication challenge' };
    }

    const { options: optionsJSON, session_id } = challengeRes.data;

    // Step 2: Trigger browser passkey prompt
    const assertion: AuthenticationResponseJSON = await startAuthentication({ optionsJSON });

    // Step 3: Send assertion to server for verification
    // POST /api/passkeys/authenticate/finish
    const verifyRes = await api.post<{
      success: boolean;
      user: { id: number; first_name: string; last_name: string; email: string };
      access_token: string;
      refresh_token: string;
      expires_in: number;
    }>('/passkeys/authenticate/finish', {
      sessionId: session_id,
      assertionResponse: assertion,
    }, { skipAuth: true });

    if (!verifyRes.success || !verifyRes.data) {
      return { success: false, error: verifyRes.error || 'Biometric authentication failed' };
    }

    return { success: true, data: verifyRes.data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Biometric authentication failed';
    if (message.includes('NotAllowedError') || message.includes('cancelled') || message.includes('denied')) {
      return { success: false, error: 'Biometric login was cancelled.' };
    }
    return { success: false, error: message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Conditional Mediation (Passkey Autofill)
// ─────────────────────────────────────────────────────────────────────────────

export async function isConditionalMediationAvailable(): Promise<boolean> {
  if (!browserSupportsWebAuthn()) return false;
  if (typeof PublicKeyCredential === 'undefined') return false;
  if (typeof PublicKeyCredential.isConditionalMediationAvailable !== 'function') return false;
  try {
    return await PublicKeyCredential.isConditionalMediationAvailable();
  } catch {
    return false;
  }
}

export async function startConditionalAuthentication(
  abortSignal?: AbortSignal,
): Promise<{
  success: boolean;
  data?: {
    user: { id: number; first_name: string; last_name: string; email: string };
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
  error?: string;
} | null> {
  try {
    const challengeRes = await api.post<{
      options: PublicKeyCredentialRequestOptionsJSON;
      session_id: string;
    }>('/passkeys/authenticate/begin', {}, { skipAuth: true });

    if (!challengeRes.success || !challengeRes.data) {
      return null;
    }

    const { options: optionsJSON, session_id } = challengeRes.data;

    const assertion: AuthenticationResponseJSON = await startAuthentication({
      optionsJSON,
      useBrowserAutofill: true,
    });

    if (abortSignal?.aborted) return null;

    const verifyRes = await api.post<{
      success: boolean;
      user: { id: number; first_name: string; last_name: string; email: string };
      access_token: string;
      refresh_token: string;
      expires_in: number;
    }>('/passkeys/authenticate/finish', {
      sessionId: session_id,
      assertionResponse: assertion,
    }, { skipAuth: true });

    if (!verifyRes.success || !verifyRes.data) {
      return { success: false, error: verifyRes.error || 'Passkey authentication failed' };
    }

    return { success: true, data: verifyRes.data };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') return null;
    const message = err instanceof Error ? err.message : '';
    if (message.includes('NotAllowedError') || message.includes('cancelled')) return null;
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Management (list / remove credentials)
// ─────────────────────────────────────────────────────────────────────────────

export async function getWebAuthnStatus(): Promise<WebAuthnStatus> {
  const res = await api.get<{ passkeys: WebAuthnCredential[] }>('/passkeys');
  const passkeys = res.data?.passkeys ?? [];
  return { registered: passkeys.length > 0, count: passkeys.length };
}

export async function getWebAuthnCredentials(): Promise<WebAuthnCredential[]> {
  const res = await api.get<{ passkeys: WebAuthnCredential[] }>('/passkeys');
  return res.data?.passkeys ?? [];
}

export async function removeWebAuthnCredential(credentialId: string | number): Promise<boolean> {
  const res = await api.delete(`/passkeys/${credentialId}`);
  return res.success;
}

export async function renameWebAuthnCredential(credentialId: string | number, deviceName: string): Promise<boolean> {
  const res = await api.put(`/passkeys/${credentialId}`, { display_name: deviceName });
  return res.success;
}

export async function removeAllWebAuthnCredentials(): Promise<{ success: boolean; removedCount: number }> {
  // Backend doesn't have a bulk delete endpoint — remove individually
  const credentials = await getWebAuthnCredentials();
  let removedCount = 0;
  for (const cred of credentials) {
    const ok = await removeWebAuthnCredential(cred.id);
    if (ok) removedCount++;
  }
  return { success: removedCount > 0, removedCount };
}
