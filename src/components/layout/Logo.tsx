import { Link } from "react-router-dom"

import logoUrl from "@/assets/images/sidman_logo1.png"
import logoSolidUrl from "@/assets/images/logo-trimmed.jpg"
import { company } from "@/data/site"
import { cn } from "@/lib/utils"

export function Logo({
  className,
  solid = false,
}: {
  className?: string
  /**
   * Uses the white-backed JPG instead of the transparent PNG. Reads as a clean
   * plate on dark surfaces, where the navy wordmark would otherwise disappear.
   */
  solid?: boolean
}) {
  return (
    <Link
      to="/"
      className={cn(
        "inline-flex shrink-0 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        className
      )}
      aria-label={`${company.name} — home`}
    >
      <img
        src={solid ? logoSolidUrl : logoUrl}
        alt={company.name}
        width={solid ? 800 : 356}
        height={solid ? 536 : 243}
        className="h-10 w-auto sm:h-12"
      />
    </Link>
  )
}
