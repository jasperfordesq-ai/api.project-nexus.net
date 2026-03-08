/**
 * Shared animation variants for Framer Motion
 * Extracted to avoid recreating objects on every render
 */

import type { Variants } from "framer-motion";

/**
 * Container variants for staggered children animations
 */
export const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

/**
 * Fast stagger container (0.05s between children)
 */
export const containerVariantsFast: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

/**
 * Item variants for fade-up animation
 */
export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

/**
 * Item variants for fade-in from left
 */
export const itemVariantsLeft: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
};

/**
 * Item variants for fade-in from right
 */
export const itemVariantsRight: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0 },
};

/**
 * Scale-in animation for modals/cards
 */
export const scaleInVariants: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1 },
};

/**
 * Slide down animation for dropdowns
 */
export const slideDownVariants: Variants = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0 },
};

/**
 * Page transition variants
 */
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

/**
 * Header animation (fade down)
 */
export const headerVariants: Variants = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
};
