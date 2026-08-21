import { Link } from "react-router-dom"

import logoUrl from "@/assets/images/sidman_logo1.png"
import { company } from "@/data/site"
import { cn } from "@/lib/utils"

export function Logo({ className }: { className?: string }) {
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
        src={logoUrl}
        alt={company.name}
        width={356}
        height={243}
        className="h-10 w-auto sm:h-12"
      />
    </Link>
  )
}
