import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm",
        destructive:
          "bg-rose-600 text-white hover:bg-rose-500 shadow-sm",
        outline:
          "border border-default-200 bg-transparent hover:bg-default-100 text-foreground",
        secondary:
          "bg-default-100 text-foreground hover:bg-default-200",
        ghost:
          "hover:bg-default-100 text-foreground",
        success:
          "bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm",
        warning:
          "bg-amber-500 text-white hover:bg-amber-400 shadow-sm",
        link:
          "text-indigo-600 dark:text-indigo-400 underline-offset-4 hover:underline h-auto p-0",
      },
      size: {
        default:  "h-9 px-4 py-2",
        sm:       "h-7 px-3 text-xs",
        lg:       "h-11 px-6 text-base",
        icon:     "h-9 w-9",
        "icon-sm": "h-7 w-7",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  ),
);
Button.displayName = "Button";

export { Button, buttonVariants };
