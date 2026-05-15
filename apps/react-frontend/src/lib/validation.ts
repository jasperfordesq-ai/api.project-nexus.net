// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Validation utilities — NIST SP 800-63B aligned.
 *
 * Password policy:
 *   - 12 character minimum (length is the primary signal).
 *   - NO mandatory character classes (counterproductive per NIST).
 *   - Live HIBP k-anonymity breach check (see usePasswordCheck hook).
 *
 * Server-side mirror: src/Nexus.Api/Controllers/AuthController.cs.
 */

export const PASSWORD_MIN_LENGTH = 12;

export interface PasswordRequirement {
  id: string;
  label: string;
  test: (password: string) => boolean;
}

export const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  {
    id: 'length',
    label: `At least ${PASSWORD_MIN_LENGTH} characters`,
    test: (p) => p.length >= PASSWORD_MIN_LENGTH,
  },
];

export function validatePassword(password: string): string[] {
  return password.length >= PASSWORD_MIN_LENGTH ? [] : [`At least ${PASSWORD_MIN_LENGTH} characters`];
}

export function isPasswordValid(password: string): boolean {
  return password.length >= PASSWORD_MIN_LENGTH;
}

export function getPasswordStrength(password: string): number {
  if (!password) return 0;
  const len = password.length;
  if (len >= 20) return 100;
  if (len >= PASSWORD_MIN_LENGTH) return 70 + Math.round(((len - PASSWORD_MIN_LENGTH) / (20 - PASSWORD_MIN_LENGTH)) * 30);
  return Math.round((len / PASSWORD_MIN_LENGTH) * 60);
}

export function getPasswordStrengthLevel(
  password: string,
): 'weak' | 'fair' | 'good' | 'strong' {
  const s = getPasswordStrength(password);
  if (s < 40) return 'weak';
  if (s < 60) return 'fair';
  if (s < 90) return 'good';
  return 'strong';
}

// ─────────────────────────────────────────────────────────────────────────────
// Email Validation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate an email address format
 *
 * @param email - The email to validate
 * @returns true if email format is valid
 */
export function isEmailValid(email: string): boolean {
  // Simple but effective email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate email and return error message if invalid
 *
 * @param email - The email to validate
 * @returns Error message or null if valid
 */
export function validateEmail(email: string): string | null {
  if (!email || !email.trim()) {
    return 'Email is required';
  }

  if (!isEmailValid(email)) {
    return 'Please enter a valid email address';
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Name Validation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate a name field
 *
 * @param name - The name to validate
 * @param fieldName - The field name for error messages (e.g., 'First name')
 * @returns Error message or null if valid
 */
export function validateName(name: string, fieldName: string): string | null {
  if (!name || !name.trim()) {
    return `${fieldName} is required`;
  }

  if (name.trim().length < 2) {
    return `${fieldName} must be at least 2 characters`;
  }

  if (name.trim().length > 50) {
    return `${fieldName} must be less than 50 characters`;
  }

  return null;
}
