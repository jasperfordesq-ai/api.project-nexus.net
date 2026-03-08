"use client";

import { ReactNode, forwardRef } from "react";
import { Button, ButtonGroup, ButtonProps, ButtonGroupProps } from "@heroui/react";
import { motion, HTMLMotionProps } from "framer-motion";
import { Loader2 } from "lucide-react";

export interface GlassButtonProps extends Omit<ButtonProps, "variant"> {
  variant?: "solid" | "bordered" | "light" | "flat" | "faded" | "shadow" | "ghost" | "gradient";
  glowColor?: "none" | "primary" | "secondary" | "accent";
}

const glowStyles = {
  none: "",
  primary: "hover:shadow-[0_0_20px_rgba(99,102,241,0.3)]",
  secondary: "hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]",
  accent: "hover:shadow-[0_0_20px_rgba(6,182,212,0.3)]",
};

export const GlassButton = forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ variant = "solid", glowColor = "none", className = "", children, ...props }, ref) => {
    // Gradient variant is custom
    if (variant === "gradient") {
      return (
        <Button
          ref={ref}
          className={`bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-0 ${glowStyles[glowColor]} ${className}`}
          {...props}
        >
          {children}
        </Button>
      );
    }

    // Ghost variant (glass effect)
    if (variant === "ghost") {
      return (
        <Button
          ref={ref}
          className={`bg-white/5 backdrop-blur-sm border border-white/10 text-white hover:bg-white/10 ${glowStyles[glowColor]} ${className}`}
          {...props}
        >
          {children}
        </Button>
      );
    }

    return (
      <Button
        ref={ref}
        variant={variant as ButtonProps["variant"]}
        className={`${glowStyles[glowColor]} ${className}`}
        {...props}
      >
        {children}
      </Button>
    );
  }
);

GlassButton.displayName = "GlassButton";

// Icon button
export interface GlassIconButtonProps extends Omit<GlassButtonProps, "isIconOnly"> {
  icon: ReactNode;
  "aria-label": string;
}

export const GlassIconButton = forwardRef<HTMLButtonElement, GlassIconButtonProps>(
  ({ icon, ...props }, ref) => {
    return (
      <GlassButton ref={ref} isIconOnly {...props}>
        {icon}
      </GlassButton>
    );
  }
);

GlassIconButton.displayName = "GlassIconButton";

// Loading button
export interface GlassLoadingButtonProps extends GlassButtonProps {
  isLoading?: boolean;
  loadingText?: string;
}

export const GlassLoadingButton = forwardRef<HTMLButtonElement, GlassLoadingButtonProps>(
  ({ isLoading, loadingText, children, disabled, ...props }, ref) => {
    return (
      <GlassButton ref={ref} disabled={isLoading || disabled} {...props}>
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            {loadingText || children}
          </>
        ) : (
          children
        )}
      </GlassButton>
    );
  }
);

GlassLoadingButton.displayName = "GlassLoadingButton";

// Animated button with motion
export interface MotionGlassButtonProps extends GlassButtonProps {
  whileHover?: HTMLMotionProps<"button">["whileHover"];
  whileTap?: HTMLMotionProps<"button">["whileTap"];
}

export function MotionGlassButton({
  whileHover = { scale: 1.02 },
  whileTap = { scale: 0.98 },
  children,
  ...props
}: MotionGlassButtonProps) {
  return (
    <motion.div whileHover={whileHover} whileTap={whileTap}>
      <GlassButton {...props}>{children}</GlassButton>
    </motion.div>
  );
}

// Button group with glass styling
export interface GlassButtonGroupProps extends ButtonGroupProps {
  children: ReactNode;
}

export function GlassButtonGroup({ children, ...props }: GlassButtonGroupProps) {
  return (
    <ButtonGroup
      className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-1"
      {...props}
    >
      {children}
    </ButtonGroup>
  );
}

// Action buttons (common patterns)
export function GlassPrimaryButton(props: Omit<GlassButtonProps, "variant">) {
  return <GlassButton variant="gradient" glowColor="primary" {...props} />;
}

export function GlassSecondaryButton(props: Omit<GlassButtonProps, "variant">) {
  return <GlassButton variant="ghost" {...props} />;
}

export function GlassDangerButton(props: Omit<GlassButtonProps, "color">) {
  return <GlassButton color="danger" {...props} />;
}

export { Button, ButtonGroup };
