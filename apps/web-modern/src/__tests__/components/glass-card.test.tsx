import { render, screen } from "@testing-library/react";
import { GlassCard, MotionGlassCard, StructuredGlassCard } from "@/components/glass-card";

describe("GlassCard", () => {
  it("renders children correctly", () => {
    render(
      <GlassCard>
        <p>Test content</p>
      </GlassCard>
    );
    expect(screen.getByText("Test content")).toBeInTheDocument();
  });

  it("applies glassmorphism styles", () => {
    const { container } = render(
      <GlassCard>
        <p>Content</p>
      </GlassCard>
    );
    // The Card component uses inline tailwind classes
    expect(container.firstChild).toHaveClass("bg-white/5");
    expect(container.firstChild).toHaveClass("backdrop-blur-xl");
  });

  it("applies hover glow effect by default", () => {
    const { container } = render(
      <GlassCard>
        <p>Content</p>
      </GlassCard>
    );
    // Default glow is "primary"
    expect(container.firstChild).toHaveClass("hover:shadow-[0_0_30px_rgba(99,102,241,0.3)]");
  });

  it("applies different glow colors", () => {
    const { container } = render(
      <GlassCard glow="secondary">
        <p>Content</p>
      </GlassCard>
    );
    expect(container.firstChild).toHaveClass("hover:shadow-[0_0_30px_rgba(168,85,247,0.3)]");
  });

  it("applies no glow when glow is none", () => {
    const { container } = render(
      <GlassCard glow="none">
        <p>Content</p>
      </GlassCard>
    );
    expect(container.firstChild).not.toHaveClass("hover:shadow-[0_0_30px_rgba(99,102,241,0.3)]");
  });

  it("applies hover transition styles when hover is true", () => {
    const { container } = render(
      <GlassCard hover>
        <p>Content</p>
      </GlassCard>
    );
    expect(container.firstChild).toHaveClass("transition-all");
    expect(container.firstChild).toHaveClass("duration-300");
  });

  it("merges custom className", () => {
    const { container } = render(
      <GlassCard className="custom-class">
        <p>Content</p>
      </GlassCard>
    );
    expect(container.firstChild).toHaveClass("custom-class");
  });
});

describe("MotionGlassCard", () => {
  it("renders children correctly", () => {
    render(
      <MotionGlassCard>
        <p>Motion content</p>
      </MotionGlassCard>
    );
    expect(screen.getByText("Motion content")).toBeInTheDocument();
  });

  it("applies glassmorphism base classes", () => {
    const { container } = render(
      <MotionGlassCard>
        <p>Content</p>
      </MotionGlassCard>
    );
    expect(container.firstChild).toHaveClass("rounded-xl");
    expect(container.firstChild).toHaveClass("bg-white/5");
    expect(container.firstChild).toHaveClass("backdrop-blur-xl");
  });

  it("applies padding based on padding prop", () => {
    const { container } = render(
      <MotionGlassCard padding="lg">
        <p>Content</p>
      </MotionGlassCard>
    );
    expect(container.firstChild).toHaveClass("p-8");
  });
});

describe("StructuredGlassCard", () => {
  it("renders children correctly", () => {
    render(
      <StructuredGlassCard>
        <p>Body content</p>
      </StructuredGlassCard>
    );
    expect(screen.getByText("Body content")).toBeInTheDocument();
  });

  it("renders header when provided", () => {
    render(
      <StructuredGlassCard header={<h2>Header</h2>}>
        <p>Body content</p>
      </StructuredGlassCard>
    );
    expect(screen.getByText("Header")).toBeInTheDocument();
  });

  it("renders footer when provided", () => {
    render(
      <StructuredGlassCard footer={<button>Submit</button>}>
        <p>Body content</p>
      </StructuredGlassCard>
    );
    expect(screen.getByText("Submit")).toBeInTheDocument();
  });
});
