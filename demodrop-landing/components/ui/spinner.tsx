import * as React from "react"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

const Spinner = React.forwardRef<React.ElementRef<"svg">, React.ComponentPropsWithoutRef<"svg">>(
  ({ className, ...props }, ref) => {
    return (
      <Loader2
        ref={ref}
        role="status"
        aria-label="Loading"
        className={cn("size-4 animate-spin", className)}
        {...props}
      />
    )
  },
)
Spinner.displayName = "Spinner"

export { Spinner }
