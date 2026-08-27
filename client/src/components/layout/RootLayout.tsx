import { useEffect } from "react"
import { Outlet, useLocation } from "react-router-dom"

import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"

export function RootLayout() {
  const { pathname, hash } = useLocation()

  // The landing page is a single full-bleed hero — no footer beneath it.
  const isLanding = pathname === "/"

  useEffect(() => {
    // A hash link should land on its section, not be yanked back to the top.
    if (hash) {
      const target = document.querySelector(hash)
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" })
        return
      }
    }
    window.scrollTo({ top: 0, behavior: "instant" })
  }, [pathname, hash])

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[60] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:ring-3 focus:ring-ring/50"
      >
        Skip to content
      </a>
      <Navbar />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      {isLanding ? null : <Footer />}
    </div>
  )
}
