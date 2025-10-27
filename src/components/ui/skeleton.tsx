import { cn } from "@/lib/utils"
import React from "react";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("relative bg-accent rounded-md overflow-hidden", className)}
      {...props}
    >
      <div className="absolute inset-0 animate-shimmer" />
    </div>
  )
}

export { Skeleton }