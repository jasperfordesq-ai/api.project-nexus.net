import {
  validatePassword,
  validateEmail,
  sanitizeInput,
  validateRequired,
  validateLength,
} from "@/lib/validation";

describe("validatePassword", () => {
  it("should fail for empty password", () => {
    const result = validatePassword("");
    expect(result.isValid).toBe(false);
    expect(result.hasMinLength).toBe(false);
  });

  it("should fail for password less than 8 characters", () => {
    const result = validatePassword("Abc1@");
    expect(result.isValid).toBe(false);
    expect(result.hasMinLength).toBe(false);
  });

  it("should fail for password without uppercase", () => {
    const result = validatePassword("password1@");
    expect(result.isValid).toBe(false);
    expect(result.hasUppercase).toBe(false);
  });

  it("should fail for password without lowercase", () => {
    const result = validatePassword("PASSWORD1@");
    expect(result.isValid).toBe(false);
    expect(result.hasLowercase).toBe(false);
  });

  it("should fail for password without number", () => {
    const result = validatePassword("Password@");
    expect(result.isValid).toBe(false);
    expect(result.hasNumber).toBe(false);
  });

  it("should fail for password without special character", () => {
    const result = validatePassword("Password1");
    expect(result.isValid).toBe(false);
    expect(result.hasSpecialChar).toBe(false);
  });

  it("should pass for valid password", () => {
    const result = validatePassword("Password1@");
    expect(result.isValid).toBe(true);
    expect(result.hasMinLength).toBe(true);
    expect(result.hasUppercase).toBe(true);
    expect(result.hasLowercase).toBe(true);
    expect(result.hasNumber).toBe(true);
    expect(result.hasSpecialChar).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return appropriate errors for invalid password", () => {
    const result = validatePassword("abc");
    expect(result.errors).toContain("At least 8 characters");
    expect(result.errors).toContain("One uppercase letter");
    expect(result.errors).toContain("One number");
    expect(result.errors).toContain("One special character (!@#$%^&*)");
  });
});

describe("validateEmail", () => {
  it("should fail for empty email", () => {
    const result = validateEmail("");
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Email is required");
  });

  it("should fail for whitespace-only email", () => {
    const result = validateEmail("   ");
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Email is required");
  });

  it("should fail for invalid email format", () => {
    const result = validateEmail("invalid-email");
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Please enter a valid email address");
  });

  it("should fail for email without domain", () => {
    const result = validateEmail("test@");
    expect(result.isValid).toBe(false);
  });

  it("should pass for valid email", () => {
    const result = validateEmail("test@example.com");
    expect(result.isValid).toBe(true);
    expect(result.error).toBeNull();
  });

  it("should pass for email with subdomain", () => {
    const result = validateEmail("test@mail.example.com");
    expect(result.isValid).toBe(true);
  });
});

describe("sanitizeInput", () => {
  it("should escape HTML special characters", () => {
    expect(sanitizeInput("<script>alert('xss')</script>")).toBe(
      "&lt;script&gt;alert(&#x27;xss&#x27;)&lt;&#x2F;script&gt;"
    );
  });

  it("should escape ampersand", () => {
    expect(sanitizeInput("Tom & Jerry")).toBe("Tom &amp; Jerry");
  });

  it("should escape quotes", () => {
    expect(sanitizeInput('"Hello"')).toBe("&quot;Hello&quot;");
  });

  it("should leave normal text unchanged", () => {
    expect(sanitizeInput("Hello World")).toBe("Hello World");
  });
});

describe("validateRequired", () => {
  it("should return error for empty string", () => {
    expect(validateRequired("", "Name")).toBe("Name is required");
  });

  it("should return error for whitespace-only string", () => {
    expect(validateRequired("   ", "Name")).toBe("Name is required");
  });

  it("should return null for valid string", () => {
    expect(validateRequired("John", "Name")).toBeNull();
  });
});

describe("validateLength", () => {
  it("should return error for string too short", () => {
    expect(validateLength("Hi", 3, 100, "Message")).toBe(
      "Message must be at least 3 characters"
    );
  });

  it("should return error for string too long", () => {
    expect(validateLength("This is too long", 1, 5, "Title")).toBe(
      "Title must be no more than 5 characters"
    );
  });

  it("should return null for valid length", () => {
    expect(validateLength("Hello", 1, 10, "Word")).toBeNull();
  });
});
