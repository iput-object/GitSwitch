import React from "react";
import { motion, type HTMLMotionProps } from "motion/react";
import { cn } from "../../utils/cn";

export interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      fullWidth = false,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed",
          // Variants
          variant === "primary" &&
            "bg-primary-500 text-neutral-950 hover:bg-primary-600",
          variant === "secondary" &&
            "border border-white/10 bg-white/5 text-neutral-200 hover:bg-white/10",
          variant === "danger" &&
            "border border-red-500/50 bg-red-500/10 text-red-500 hover:bg-red-500/20",
          variant === "ghost" &&
            "bg-transparent text-neutral-400 hover:text-neutral-200 hover:bg-white/5",
          // Sizes
          size === "sm" && "px-3 py-1.5 text-xs",
          size === "md" && "px-4 py-2 text-sm",
          size === "lg" && "px-6 py-3 text-base rounded-full", // matching AddProfile style for primary large buttons
          // Full width
          fullWidth && "w-full",
          className
        )}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);
Button.displayName = "Button";
