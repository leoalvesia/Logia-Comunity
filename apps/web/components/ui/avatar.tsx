"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn, getInitials, levelColor } from "../../lib/utils";

const AvatarRoot = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
      className,
    )}
    {...props}
  />
));
AvatarRoot.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full object-cover", className)}
    {...props}
  />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold",
      className,
    )}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

// Badge sizing per avatar size
const BADGE_CONFIG: Record<string, { size: number; font: number; offset: number }> = {
  sm: { size: 14, font: 8,  offset: -1 },
  md: { size: 17, font: 9,  offset: -1 },
  lg: { size: 20, font: 10, offset: -1 },
  xl: { size: 24, font: 11, offset: -2 },
};

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  /** When provided, renders a colored level badge at the bottom-right */
  level?: number;
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-lg",
};

export function Avatar({ src, name, size = "md", className, level }: AvatarProps) {
  const badge = level !== undefined ? BADGE_CONFIG[size] : null;

  return (
    <div className="relative inline-flex shrink-0">
      <AvatarRoot className={cn(sizeClasses[size], className)}>
        {src && <AvatarImage src={src} alt={name} />}
        <AvatarFallback>{getInitials(name)}</AvatarFallback>
      </AvatarRoot>

      {badge && level !== undefined && (
        <span
          className="absolute rounded-full flex items-center justify-center font-bold text-white ring-2 ring-background pointer-events-none"
          style={{
            width: badge.size,
            height: badge.size,
            fontSize: badge.font,
            bottom: badge.offset,
            right: badge.offset,
            backgroundColor: levelColor(level),
            lineHeight: 1,
          }}
          aria-label={`Nível ${level}`}
        >
          {level}
        </span>
      )}
    </div>
  );
}

export { AvatarRoot, AvatarImage, AvatarFallback };
