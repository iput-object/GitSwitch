import React from "react";
import { cn } from "../../utils/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, description, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <div className="w-full text-left">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-xs font-medium text-neutral-400"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            "w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-neutral-100 outline-none transition-colors focus:border-primary-400/50 focus:bg-white/[0.07]",
            className
          )}
          {...props}
        />
        {description && (
          <span className="mt-1.5 block text-xs text-neutral-500">
            {description}
          </span>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";
