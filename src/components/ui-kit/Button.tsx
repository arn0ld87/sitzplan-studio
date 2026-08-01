import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-[6px] text-[13px] font-medium leading-none transition-[background-color,border-color,color,box-shadow] duration-[180ms] ease-out disabled:pointer-events-none disabled:text-ink-disabled disabled:border-line select-none whitespace-nowrap",
  {
    variants: {
      variant: {
        primary:
          "bg-action text-white border border-[color:var(--action)] hover:bg-action-hover hover:border-[color:var(--action-hover)]",
        secondary:
          "bg-elevated text-ink border border-line-control hover:border-[color:var(--line-plan)] hover:bg-panel",
        quiet: "bg-transparent text-ink-2 border border-transparent hover:bg-sunken hover:text-ink",
        soft: "bg-action-soft text-action-soft-ink border border-[color:var(--action-soft)] hover:border-[color:var(--action)]",
        danger:
          "bg-elevated text-danger border border-[color:var(--line-control)] hover:bg-danger-bg hover:border-[color:var(--danger)]",
      },
      size: {
        md: "h-10 px-3.5",
        sm: "h-8 px-2.5 text-[12px]",
        icon: "h-10 w-10 p-0",
        iconSm: "h-8 w-8 p-0",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
