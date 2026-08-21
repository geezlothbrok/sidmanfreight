import { Link } from "react-router-dom"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"

export function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col items-center px-5 py-28 text-center sm:py-36">
      <p className="text-xs font-semibold tracking-[0.14em] text-brand uppercase">
        Error 404
      </p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
        This one went to the wrong terminal
      </h1>
      <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
        The page you are looking for does not exist, or has been moved. Let us get
        you back on route.
      </p>
      <Button asChild size="lg" className="mt-8 h-11 px-6 text-base">
        <Link to="/">
          <ArrowLeft data-icon="inline-start" aria-hidden="true" />
          Back to home
        </Link>
      </Button>
    </div>
  )
}
