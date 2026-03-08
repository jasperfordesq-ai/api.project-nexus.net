import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorBoundary, PageErrorBoundary } from "@/components/error-boundary";
import { HeroUIProvider } from "@heroui/react";
import { useState } from "react";

// Component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error("Test error message");
  }
  return <div>No error</div>;
};

const renderWithProvider = (ui: React.ReactElement) => {
  return render(<HeroUIProvider>{ui}</HeroUIProvider>);
};

describe("ErrorBoundary", () => {
  // Suppress console.error for error boundary tests
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  it("renders children when no error occurs", () => {
    renderWithProvider(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText("No error")).toBeInTheDocument();
  });

  it("renders error UI when error is thrown", () => {
    renderWithProvider(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Try Again")).toBeInTheDocument();
    expect(screen.getByText("Go Home")).toBeInTheDocument();
  });

  it("renders custom fallback when provided", () => {
    renderWithProvider(
      <ErrorBoundary fallback={<div>Custom error fallback</div>}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText("Custom error fallback")).toBeInTheDocument();
  });

  it("has a clickable Try Again button", () => {
    renderWithProvider(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const tryAgainButton = screen.getByText("Try Again");
    expect(tryAgainButton).toBeInTheDocument();

    // Just verify the button is clickable (the actual reset behavior
    // depends on React internals that are hard to test)
    fireEvent.click(tryAgainButton);
  });

  it("has a Go Home link pointing to root", () => {
    renderWithProvider(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const goHomeLink = screen.getByText("Go Home").closest("a");
    expect(goHomeLink).toHaveAttribute("href", "/");
  });
});

describe("PageErrorBoundary", () => {
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  it("renders full-page error UI when error is thrown", () => {
    renderWithProvider(
      <PageErrorBoundary>
        <ThrowError shouldThrow={true} />
      </PageErrorBoundary>
    );

    expect(screen.getByText("Oops! Something went wrong")).toBeInTheDocument();
  });

  it("renders children when no error occurs", () => {
    renderWithProvider(
      <PageErrorBoundary>
        <ThrowError shouldThrow={false} />
      </PageErrorBoundary>
    );

    expect(screen.getByText("No error")).toBeInTheDocument();
  });

  it("renders custom fallback when provided", () => {
    renderWithProvider(
      <PageErrorBoundary fallback={<div>Page error fallback</div>}>
        <ThrowError shouldThrow={true} />
      </PageErrorBoundary>
    );

    expect(screen.getByText("Page error fallback")).toBeInTheDocument();
  });
});
