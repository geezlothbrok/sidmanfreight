import { Link } from "react-router-dom"
import { ArrowRight, Phone } from "lucide-react"

import { Button } from "@/components/ui/button"
import { company } from "@/data/site"
import { cn } from "@/lib/utils"
import { useInView } from "@/lib/use-in-view"
import { pageContainer } from "@/lib/layout"

export function CTASection({
  title = "Ready to move something?",
  description = "Send us the lane, the commodity, and the deadline. You will have a firm quote and a named point of contact — usually the same business day.",
}: {
  title?: string
  description?: string
}) {
  const { ref, inView } = useInView<HTMLDivElement>()

  return (
    <section className="bg-[oklch(0.24_0.166_264)] text-white">
      <div
        ref={ref}
        className={cn(pageContainer, "py-16 sm:py-20", "reveal-section", inView && "reveal-section-in")}
      >
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            {title}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-pretty opacity-90">
            {description}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="h-11 w-full bg-white px-6 text-base text-[oklch(0.24_0.166_264)] hover:bg-white/90 sm:w-auto"
            >
              <Link to="/contact">
                Request a quote
                <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-11 w-full border-white/35 bg-transparent px-6 text-base text-white hover:bg-white/10 hover:text-white sm:w-auto dark:border-white/35 dark:bg-transparent dark:hover:bg-white/10"
            >
              <a href={`tel:${company.phones[0].tel}`}>
                <Phone data-icon="inline-start" aria-hidden="true" />
                {company.phones[0].display}
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
