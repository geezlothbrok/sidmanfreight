import { Hero } from "@/components/sections/Hero"
import CargoTracker from "@/components/tracker/CargoTracker"

export function Home() {
  return (
    <>
      <Hero />
      {/* Public cargo tracking, directly under the hero — the same placement
          the feature has on the Hota site, and the target of the hero's
          "Track Your Cargo" link (the section carries id="track"). */}
      <CargoTracker />
    </>
  )
}
