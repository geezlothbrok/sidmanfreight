import { Link } from "react-router-dom"
import { ArrowRight, Phone } from "lucide-react"

import { Button } from "@/components/ui/button"
import { company } from "@/data/site"

export function CTASection({
  title = "Ready to move something?",
  description = "Send us the lane, the commodity, and the deadline. You will have a firm quote and a named point of contact — usually the same business day.",
}: {
  title?: string
  description?: string
}) {
  return (
    <section className="bg-brand text-brand-foreground">
      <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:py-20">
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
              className="h-11 w-full bg-background px-6 text-base text-foreground hover:bg-background/90 sm:w-auto"
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
              className="h-11 w-full border-brand-foreground/30 bg-transparent px-6 text-base text-brand-foreground hover:bg-brand-foreground/10 hover:text-brand-foreground sm:w-auto dark:border-brand-foreground/30 dark:bg-transparent dark:hover:bg-brand-foreground/10"
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
