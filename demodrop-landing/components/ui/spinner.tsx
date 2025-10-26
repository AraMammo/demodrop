import * as React from "react"
import { Loader2Icon } from "lucide-react"

import { cn } from "@/lib/utils"

const Spinner = React.forwardRef<React.ElementRef<"svg">, React.ComponentPropsWithoutRef<"svg">>(
  ({ className, ...props }, ref) => {
    return (
      <Loader2Icon
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
