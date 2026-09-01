import { Link } from "react-router-dom"

import logoUrl from "@/assets/images/sidman_logo1.png"
import logoSolidUrl from "@/assets/images/logo-trimmed.jpg"
import logoOnDarkUrl from "@/assets/images/sid-logo.png"
import { company } from "@/data/site"
import { cn } from "@/lib/utils"

export function Logo({
  className,
  solid = false,
  onDark = false,
}: {
  className?: string
  /**
   * Uses the white-backed JPG instead of the transparent PNG. Reads as a clean
   * plate on dark surfaces, where the navy wordmark would otherwise disappear.
   */
  solid?: boolean
  /**
   * The full lock-up, whose "Sidman" wordmark and tagline are WHITE. Only legible
   * against a dark backdrop — the transparent navbar over the hero photo. On the
   * light navbar of every other page it would be invisible, so the navy mark is
   * still the default.
   */
  onDark?: boolean
}) {
  const src = onDark ? logoOnDarkUrl : solid ? logoSolidUrl : logoUrl
  // Intrinsic dimensions per asset, so the browser reserves the right box and
  // the nav does not reflow once the image decodes.
  const [width, height] = onDark ? [800, 530] : solid ? [800, 536] : [356, 243]
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
        src={src}
        alt={company.name}
        width={width}
        height={height}
        // Sized against the h-24 (96px) navbar, which is the tighter of the two
        // placements — h-20 leaves 8px of clearance top and bottom. Growing the
        // mark past this needs the bar to grow with it.
        className="h-16 w-auto sm:h-20"
      />
    </Link>
  )
}
