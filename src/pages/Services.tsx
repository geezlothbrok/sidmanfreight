import { Section, SectionHeading } from "@/components/sections/Section"
import { ServiceCard } from "@/components/sections/ServiceCard"
import { CTASection } from "@/components/sections/CTASection"
import { PageHeader } from "@/components/sections/PageHeader"
import { services } from "@/data/site"

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
  return (
    <>
      <PageHeader
        eyebrow="Services"
        title="Freight services built around the lane, not the brochure"
        description="Road, ocean, air, warehousing, and customs — operated by one team, billed on one invoice, tracked in one portal."
      />

      <Section>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <ServiceCard key={service.slug} service={service} detailed />
          ))}
        </div>
      </Section>

      <Section muted>
        <SectionHeading
          eyebrow="What you get either way"
          title="Standard on every account"
          description="These are not premium tiers. They apply to a single pallet and a full charter alike."
        />

        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {commitments.map((item) => (
            <div key={item.title} className="border-t-2 border-brand pt-5">
              <h3 className="text-base font-semibold">{item.title}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <CTASection
        title="Not sure which mode fits?"
        description="Tell us the deadline and the budget. We will tell you honestly whether it should fly, sail, or roll — and what each one costs."
      />
    </>
  )
}
