/**
 * Validation utilities for form inputs
 */

export interface PasswordValidation {
  isValid: boolean;
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
  errors: string[];
}

export interface EmailValidation {
  isValid: boolean;
  error: string | null;
}

/**
 * Validates password complexity requirements
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character (!@#$%^&*(),.?":{}|<>)
 */
export function validatePassword(password: string): PasswordValidation {
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const errors: string[] = [];
  if (!hasMinLength) errors.push("At least 8 characters");
  if (!hasUppercase) errors.push("One uppercase letter");
  if (!hasLowercase) errors.push("One lowercase letter");
  if (!hasNumber) errors.push("One number");
  if (!hasSpecialChar) errors.push("One special character (!@#$%^&*)");

  return {
    isValid: hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar,
    hasMinLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecialChar,
    errors,
  };
}

/**
 * Validates email format
 */
export function validateEmail(email: string): EmailValidation {
  if (!email.trim()) {
    return { isValid: false, error: "Email is required" };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: "Please enter a valid email address" };
  }

  return { isValid: true, error: null };
}

/**
 * Sanitizes user input to prevent XSS
 * Escapes HTML special characters
 */
export function sanitizeInput(input: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;",
  };
  return input.replace(/[&<>"'/]/g, (char) => map[char]);
}

/**
 * Validates required fields
 */
export function validateRequired(value: string, fieldName: string): string | null {
  if (!value.trim()) {
    return `${fieldName} is required`;
  }
  return null;
}

/**
 * Validates string length
 */
export function validateLength(
  value: string,
  min: number,
  max: number,
  fieldName: string
): string | null {
  if (value.length < min) {
    return `${fieldName} must be at least ${min} characters`;
  }
  if (value.length > max) {
    return `${fieldName} must be no more than ${max} characters`;
  }
  return null;
}
