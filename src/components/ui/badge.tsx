import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-brand-blue text-white",
        secondary:
          "border-transparent bg-slate-100 text-slate-800",
        outline:
          "border border-slate-300 text-slate-700 bg-white",
        success:
          "border-transparent bg-emerald-50 text-emerald-800 border border-emerald-200",
        warning:
          "border-transparent bg-amber-50 text-amber-900 border border-amber-200",
        destructive:
          "border-transparent bg-red-50 text-red-800 border border-red-200",
        info:
          "border-transparent bg-blue-50 text-brand-blue border border-blue-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
