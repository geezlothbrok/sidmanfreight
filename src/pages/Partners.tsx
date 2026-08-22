import { Link } from "react-router-dom"
import { ArrowRight, Check } from "lucide-react"

import { Section, SectionHeading } from "@/components/sections/Section"
import { PageHeader } from "@/components/sections/PageHeader"
import { Button } from "@/components/ui/button"
import { partners, company } from "@/data/site"
import partnersBg from "@/assets/images/services-1600.jpg"

export function Partners() {
  return (
    <div className="dark relative isolate bg-background text-foreground">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-20 bg-cover bg-fixed bg-center"
        style={{ backgroundImage: `url(${partnersBg})` }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-[oklch(0.16_0.05_264)]/94 via-[oklch(0.14_0.04_264)]/90 to-[oklch(0.16_0.05_264)]/95"
      />

      <PageHeader
        eyebrow={partners.eyebrow}
        title={partners.title}
        description={partners.intro}
        titleClassName="text-brand-gold"
      />

      <Section>
        <SectionHeading
          align="start"
          eyebrow="For freight forwarders"
          title="Become our partner"
          description={`Looking for a licensed local agent at the Port of Tema? Route your clients' cargo through ${company.name} for local handling, customs clearance, and secure final-mile delivery.`}
        />

        <ul className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {partners.reasons.map((reason) => (
            <li key={reason.title} className="rounded-2xl border border-white/25 bg-white/10 shadow-[0_8px_32px_rgb(0_0_0/0.37),inset_0_1px_0_rgb(255_255_255/0.18)] backdrop-blur-3xl backdrop-saturate-150 p-5">
              <h3 className="font-heading text-lg font-semibold text-brand-cyan">
                {reason.title}
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-white/90">
                {reason.body}
              </p>
            </li>
          ))}
        </ul>

        <Button
          asChild
          size="lg"
          variant="outline"
          className="mt-12 border-white/25 bg-white/[0.08] text-white shadow-[0_8px_32px_rgb(0_0_0/0.45)] backdrop-blur-2xl backdrop-saturate-150 hover:bg-white/[0.16] hover:text-white dark:border-white/25 dark:bg-white/[0.08] dark:hover:bg-white/[0.16]"
        >
          <Link to="/contact">
            Start a partnership
            <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </Link>
        </Button>
      </Section>

      <Section muted>
        <SectionHeading
          align="start"
          eyebrow="For shipping lines"
          title={partners.shipAgency.title}
          description={partners.shipAgency.intro}
        />

        <div className="mt-10 rounded-2xl border border-white/25 bg-white/10 shadow-[0_8px_32px_rgb(0_0_0/0.37),inset_0_1px_0_rgb(255_255_255/0.18)] backdrop-blur-3xl backdrop-saturate-150 p-6 sm:p-8">
          <h3 className="font-heading text-lg font-semibold">
            What we handle as your ship agent
          </h3>
          <ul className="mt-5 grid gap-3.5 lg:grid-cols-2">
            {partners.shipAgency.duties.map((duty) => (
              <li key={duty} className="flex items-start gap-3 text-sm">
                <Check
                  className="mt-0.5 size-4 shrink-0 text-brand-gold"
                  aria-hidden="true"
                />
                <span className="leading-relaxed text-white/85">
                  {duty}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-8 max-w-2xl text-base leading-relaxed text-pretty">
          Every ship calling in Ghana needs an agent. We can be yours.
        </p>

        <Button
          asChild
          size="lg"
          variant="outline"
          className="mt-8 border-white/25 bg-white/[0.08] text-white shadow-[0_8px_32px_rgb(0_0_0/0.45)] backdrop-blur-2xl backdrop-saturate-150 hover:bg-white/[0.16] hover:text-white dark:border-white/25 dark:bg-white/[0.08] dark:hover:bg-white/[0.16]"
        >
          <Link to="/contact">
            Discuss ship agency services
            <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </Link>
        </Button>
      </Section>
    </div>
  )
}
