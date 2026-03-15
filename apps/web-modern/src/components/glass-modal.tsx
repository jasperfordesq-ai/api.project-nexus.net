"use client";

import { ReactNode, useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalProps,
} from "@heroui/react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export interface GlassModalProps extends Omit<ModalProps, "children"> {
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  showCloseButton?: boolean;
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  glow?: "none" | "primary" | "secondary" | "accent";
}

const glowStyles = {
  none: "",
  primary: "shadow-[0_0_30px_rgba(99,102,241,0.15)]",
  secondary: "shadow-[0_0_30px_rgba(168,85,247,0.15)]",
  accent: "shadow-[0_0_30px_rgba(6,182,212,0.15)]",
};

export function GlassModal({
  title,
  children,
  footer,
  showCloseButton = true,
  size = "md",
  glow = "primary",
  isOpen,
  onOpenChange,
  ...props
}: GlassModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size={size}
      backdrop="blur"
      classNames={{
        backdrop: "bg-black/50 backdrop-blur-sm",
        base: `bg-zinc-900/80 backdrop-blur-xl border border-white/10 ${glowStyles[glow]}`,
        header: "border-b border-white/10",
        body: "py-6",
        footer: "border-t border-white/10",
        closeButton: "text-white/50 hover:text-white hover:bg-white/10",
      }}
      {...props}
    >
      <ModalContent>
        {(onClose) => (
          <>
            {title && (
              <ModalHeader className="flex flex-col gap-1">
                <span className="text-white font-semibold">{title}</span>
              </ModalHeader>
            )}
            <ModalBody className="text-white/70">{children}</ModalBody>
            {footer && <ModalFooter>{footer}</ModalFooter>}
          </>
        )}
      </ModalContent>
    </Modal>
  );
}

// Confirmation Modal variant
export interface ConfirmModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  variant?: "danger" | "warning" | "info";
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onOpenChange,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  variant = "info",
  isLoading: externalLoading = false,
}: ConfirmModalProps) {
  const [internalLoading, setInternalLoading] = useState(false);
  const isLoading = externalLoading || internalLoading;

  const variantStyles = {
    danger: "bg-red-500 hover:bg-red-600",
    warning: "bg-amber-500 hover:bg-amber-600",
    info: "bg-indigo-500 hover:bg-indigo-600",
  };

  const handleConfirm = async () => {
    setInternalLoading(true);
    try {
      await onConfirm();
    } finally {
      setInternalLoading(false);
      onOpenChange(false);
    }
  };

  return (
    <GlassModal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={title}
      size="sm"
      footer={
        <div className="flex gap-3 w-full">
          <button
            onClick={() => {
              onCancel?.();
              onOpenChange(false);
            }}
            disabled={isLoading}
            className="flex-1 px-4 py-2 rounded-lg bg-white/5 text-white hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className={`flex-1 px-4 py-2 rounded-lg text-white transition-colors ${variantStyles[variant]} disabled:opacity-50`}
          >
            {isLoading ? "Loading..." : confirmLabel}
          </button>
        </div>
      }
    >
      <p>{message}</p>
    </GlassModal>
  );
}

export { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter };
