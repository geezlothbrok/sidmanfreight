import { Link } from "react-router-dom"
import { ArrowRight } from "lucide-react"

import { Section, SectionHeading } from "@/components/sections/Section"
import { ServiceCard } from "@/components/sections/ServiceCard"
import { PageHeader } from "@/components/sections/PageHeader"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { pageContainer } from "@/lib/layout"
import { useInView } from "@/lib/use-in-view"
import { services, chinaGhana } from "@/data/site"
import servicesBg from "@/assets/images/services-1600.jpg"
import chinaBg from "@/assets/images/china.jpg"

const commitments = [
  {
    title: "Quotes that hold",
    body: "The rate we quote is the rate we invoice. Accessorials are listed up front, and anything unforeseen is cleared with you before it is incurred.",
  },
  {
    title: "One coordinator per account",
    body: "A named person who knows your lanes, your consignees, and your paperwork — reachable directly, not through a ticket queue.",
  },
  {
    title: "Documents where you need them",
    body: "Bills of lading, entry summaries, and proofs of delivery land in your portal as they are issued, and stay searchable for seven years.",
  },
]

export function Services() {
  const { ref: chinaRef, inView: chinaInView } = useInView<HTMLDivElement>()

  return (
    <div className="dark relative isolate bg-background text-foreground">
      {/*
        Same treatment as the About page: viewport-fixed photo so it is not
        stretched over the whole scroll height, with a heavy navy scrim doing
        the work of keeping the copy readable.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-20 bg-cover bg-fixed bg-center"
        style={{ backgroundImage: `url(${servicesBg})` }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-[oklch(0.16_0.05_264)]/94 via-[oklch(0.14_0.04_264)]/90 to-[oklch(0.16_0.05_264)]/95"
      />

      <PageHeader
        eyebrow="Services"
        title="Freight services built around the lane, not the brochure"
        titleClassName="text-brand-gold"
        description="Road, ocean, air, warehousing, and customs — operated by one team, billed on one invoice, tracked in one portal."
      />

      <Section>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <ServiceCard key={service.slug} service={service} detailed />
          ))}
        </div>
      </Section>

      <section
        id="china-ghana"
        className="relative isolate scroll-mt-20 overflow-hidden"
      >
        <img
          src={chinaBg}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 -z-20 size-full object-cover"
          loading="lazy"
        />
        {/* The flags are highly saturated, so this scrim is heavier than the
            page's own — the copy over it is white, cyan, and gold. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[oklch(0.14_0.04_264)]/68"
        />
        <div
          ref={chinaRef}
          className={cn(
            pageContainer,
            "py-16 sm:py-20 lg:py-24",
            "reveal-section",
            chinaInView && "reveal-section-in"
          )}
        >
        <SectionHeading
          align="start"
          eyebrow={chinaGhana.eyebrow}
          title={chinaGhana.title}
          description={chinaGhana.intro}
          className="[text-shadow:0_2px_14px_rgb(0_0_0/0.75)]"
        />

        <ul className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {chinaGhana.advantages.map((item) => (
            <li
              key={item.title}
              className="rounded-2xl border border-white/25 bg-white/10 shadow-[0_8px_32px_rgb(0_0_0/0.37),inset_0_1px_0_rgb(255_255_255/0.18)] backdrop-blur-3xl backdrop-saturate-150 p-5"
            >
              <h3 className="font-heading text-lg font-semibold text-brand-cyan">
                {item.title}
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-white/90 [text-shadow:0_1px_6px_rgb(0_0_0/0.6)]">
                {item.body}
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-16">
          <h3 className="font-heading text-2xl font-semibold tracking-tight [text-shadow:0_2px_14px_rgb(0_0_0/0.75)]">
            CTN &amp; CoC compliance
          </h3>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-white/85 [text-shadow:0_1px_10px_rgb(0_0_0/0.7)]">
            Cargo moving from China into Ghana must satisfy two regulatory
            requirements before it can clear Tema. We manage both, start to finish.
          </p>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {chinaGhana.compliance.map((item) => (
              <div
                key={item.code}
                className="rounded-2xl border border-white/25 bg-white/10 shadow-[0_8px_32px_rgb(0_0_0/0.37),inset_0_1px_0_rgb(255_255_255/0.18)] backdrop-blur-3xl backdrop-saturate-150 p-6"
              >
                <p className="text-xs font-semibold tracking-[0.18em] text-brand-gold uppercase">
                  {item.code}
                </p>
                <h4 className="font-heading mt-2 text-lg font-semibold">
                  {item.title}
                </h4>
                <p className="mt-2.5 text-sm leading-relaxed text-white/90 [text-shadow:0_1px_6px_rgb(0_0_0/0.6)]">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16">
          <h3 className="font-heading text-2xl font-semibold tracking-tight [text-shadow:0_2px_14px_rgb(0_0_0/0.75)]">
            China → Ghana, step by step
          </h3>

          <ol className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {chinaGhana.process.map((step, index) => (
              <li
                key={step.title}
                className="flex items-start gap-4 rounded-2xl border border-white/25 bg-white/10 shadow-[0_8px_32px_rgb(0_0_0/0.37),inset_0_1px_0_rgb(255_255_255/0.18)] backdrop-blur-3xl backdrop-saturate-150 p-5"
              >
                <span
                  className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-gold text-sm font-semibold text-[oklch(0.24_0.166_264)]"
                  aria-hidden="true"
                >
                  {index + 1}
                </span>
                <div>
                  <h4 className="font-heading text-base font-semibold text-brand-cyan">
                    {step.title}
                  </h4>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/90 [text-shadow:0_1px_6px_rgb(0_0_0/0.6)]">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <Button
          asChild
          size="lg"
          variant="outline"
          className="mt-12 border-white/25 bg-white/[0.08] text-white shadow-[0_8px_32px_rgb(0_0_0/0.45)] backdrop-blur-2xl backdrop-saturate-150 hover:bg-white/[0.16] hover:text-white dark:border-white/25 dark:bg-white/[0.08] dark:hover:bg-white/[0.16]"
        >
          <Link to="/contact">
            Talk to the trade desk
            <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </Link>
        </Button>
        </div>
      </section>

      <Section>
        <SectionHeading
          eyebrow="What you get either way"
          title="Standard on every account"
          description="These are not premium tiers. They apply to a single pallet and a full charter alike."
        />

        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {commitments.map((item) => (
            <div key={item.title} className="border-t-2 border-brand-gold pt-5">
              <h3 className="text-base font-semibold">{item.title}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-white/90 [text-shadow:0_1px_6px_rgb(0_0_0/0.6)]">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}
