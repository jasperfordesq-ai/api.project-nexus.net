"use client";

import { Card, CardHeader, CardBody, CardFooter } from "@heroui/react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { forwardRef } from "react";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: "primary" | "secondary" | "accent" | "none";
  padding?: "none" | "sm" | "md" | "lg";
}

const glowStyles = {
  primary: "hover:shadow-[0_0_30px_rgba(99,102,241,0.3)]",
  secondary: "hover:shadow-[0_0_30px_rgba(168,85,247,0.3)]",
  accent: "hover:shadow-[0_0_30px_rgba(6,182,212,0.3)]",
  none: "",
};

const paddingStyles = {
  none: "p-0",
  sm: "p-3",
  md: "p-5",
  lg: "p-8",
};

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ children, className = "", hover = true, glow = "primary", padding = "md" }, ref) => {
    return (
      <Card
        ref={ref}
        className={`
          bg-white/5 backdrop-blur-xl backdrop-saturate-150
          border border-white/10
          ${hover ? "transition-all duration-300 hover:bg-white/10 hover:border-white/20" : ""}
          ${glow !== "none" ? glowStyles[glow] : ""}
          ${className}
        `}
      >
        <CardBody className={paddingStyles[padding]}>
          {children}
        </CardBody>
      </Card>
    );
  }
);

GlassCard.displayName = "GlassCard";

// Animated version with Framer Motion
type MotionGlassCardProps = GlassCardProps & Omit<HTMLMotionProps<"div">, keyof GlassCardProps>;

export const MotionGlassCard = forwardRef<HTMLDivElement, MotionGlassCardProps>(
  ({ children, className = "", hover = true, glow = "primary", padding = "md", ...motionProps }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={`
          rounded-xl bg-white/5 backdrop-blur-xl backdrop-saturate-150
          border border-white/10
          ${hover ? "transition-colors duration-300 hover:bg-white/10 hover:border-white/20" : ""}
          ${glow !== "none" ? glowStyles[glow] : ""}
          ${paddingStyles[padding]}
          ${className}
        `}
        {...motionProps}
      >
        {children}
      </motion.div>
    );
  }
);

MotionGlassCard.displayName = "MotionGlassCard";

// Structured Glass Card with Header/Body/Footer
interface StructuredGlassCardProps {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: "primary" | "secondary" | "accent" | "none";
}

export function StructuredGlassCard({
  header,
  footer,
  children,
  className = "",
  hover = true,
  glow = "primary",
}: StructuredGlassCardProps) {
  return (
    <Card
      className={`
        bg-white/5 backdrop-blur-xl backdrop-saturate-150
        border border-white/10
        ${hover ? "transition-all duration-300 hover:bg-white/10 hover:border-white/20" : ""}
        ${glow !== "none" ? glowStyles[glow] : ""}
        ${className}
      `}
    >
      {header && (
        <CardHeader className="px-5 pt-5 pb-0">
          {header}
        </CardHeader>
      )}
      <CardBody className="px-5 py-4">
        {children}
      </CardBody>
      {footer && (
        <CardFooter className="px-5 pb-5 pt-0">
          {footer}
        </CardFooter>
      )}
    </Card>
  );
}
