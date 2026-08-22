import { useEffect, useRef, useState } from "react"

/**
 * Fires once when the element first scrolls into view, then stops observing —
 * re-animating on every scroll past is more distracting than it is useful.
 *
 * Falls back to "visible" wherever IntersectionObserver is missing, so content
 * can never end up permanently stuck at opacity 0.
 */
export function useInView<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  // Start visible where the API is missing, rather than flipping state in the
  // effect — same fallback, without the extra render.
  const [inView, setInView] = useState(
    () => typeof IntersectionObserver === "undefined"
  )

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === "undefined") return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setInView(true)
        observer.disconnect()
      },
      // Hold off until a little of the section has actually cleared the fold.
      { threshold: 0.08, rootMargin: "0px 0px -10% 0px" }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return { ref, inView }
}
