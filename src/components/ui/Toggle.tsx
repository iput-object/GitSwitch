import { cn } from "../../utils/cn";

type ToggleProps = {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
};

export function Toggle({ label, description, checked, onChange, className }: ToggleProps) {
  return (
    <div className={cn("flex items-center justify-between py-3", className)}>
      <div className="flex flex-col pr-4">
        <span className="text-sm font-medium text-neutral-200">{label}</span>
        {description && (
          <span className="text-xs text-neutral-500 mt-0.5">{description}</span>
        )}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900",
          checked ? "bg-primary-500" : "bg-neutral-700"
        )}
      >
        <span className="sr-only">Toggle {label}</span>
        <span
          className={cn(
            "pointer-events-none inline-block h-4 w-4 transform rounded-full shadow ring-0 transition duration-200 ease-in-out",
            checked ? "translate-x-4 bg-white" : "translate-x-0 bg-neutral-300"
          )}
        />
      </button>
    </div>
  );
}
