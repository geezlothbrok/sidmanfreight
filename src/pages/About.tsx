import { Section, SectionHeading } from "@/components/sections/Section"
import { PageHeader } from "@/components/sections/PageHeader"
import { CTASection } from "@/components/sections/CTASection"
import { Separator } from "@/components/ui/separator"
import { company, stats, values } from "@/data/site"

const timeline = [
  {
    year: "2009",
    title: "The first lane",
    body: "Two dispatchers and a single trucking lane, moving freight for importers nobody else would quote.",
  },
  {
    year: "2013",
    title: "Customs brokerage license",
    body: "Brought clearance in-house rather than farming it out, cutting average port dwell for our accounts by two days.",
  },
  {
    year: "2017",
    title: "Ocean consolidation program",
    body: "Opened weekly LCL consolidations from Asia and Europe, giving smaller shippers container economics without a container.",
  },
  {
    year: "2021",
    title: "Visibility portal",
    body: "Replaced status emails with live milestone tracking across every mode, plus a searchable document archive.",
  },
  {
    year: "Today",
    title: "48 countries, one team",
    body: "Still operator-led, still answering the phone — now across road, ocean, air, warehousing, and brokerage.",
  },
]

export function About() {
  return (
    <>
      <PageHeader
        eyebrow="About us"
        title="Operators who never stopped working the freight"
        description={`${company.name} has been moving freight since ${company.founded}. The company has grown, but the people quoting your lane still know what it takes to move it.`}
      />

      <Section>
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHeading
              align="start"
              eyebrow="Our story"
              title="Built for the shipments other forwarders decline"
            />
            <div className="mt-6 space-y-4 text-base leading-relaxed text-muted-foreground">
              <p>
                We began with the freight the big forwarders would not touch — odd
                dimensions, tight windows, importers too small to warrant an account
                manager. That work taught us the part of logistics that does not fit
                in a rate table: what to do when the plan breaks.
              </p>
              <p>
                Fifteen years on, we handle vessel charters and single pallets with
                the same operations team. The commodity changes. The standard does
                not — you get a straight answer, a firm rate, and someone who picks
                up the phone.
              </p>
              <p>
                We are deliberately not the cheapest quote in your inbox. We are the
                one that holds through to the invoice, and the one that tells you
                early when something is going sideways.
              </p>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-px self-start overflow-hidden rounded-xl border border-border bg-border">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-background px-6 py-8">
                <dd className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  {stat.value}
                </dd>
                <dt className="mt-1.5 text-sm text-muted-foreground">{stat.label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </Section>

      <Section muted>
        <SectionHeading
          eyebrow="How we operate"
          title="Three things we will not trade away"
        />

        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {values.map((value) => (
            <div key={value.title} className="border-t-2 border-brand pt-5">
              <h3 className="text-base font-semibold">{value.title}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                {value.body}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <SectionHeading
          align="start"
          eyebrow="Milestones"
          title="Fifteen years, one lane at a time"
        />

        <ol className="mt-12 space-y-0">
          {timeline.map((entry, index) => (
            <li key={entry.year}>
              <div className="grid gap-3 py-6 sm:grid-cols-[8rem_1fr] sm:gap-8">
                <div className="flex items-baseline gap-3">
                  <span className="text-sm font-semibold tracking-[0.1em] text-brand uppercase">
                    {entry.year}
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-semibold">{entry.title}</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                    {entry.body}
                  </p>
                </div>
              </div>
              {index < timeline.length - 1 ? <Separator /> : null}
            </li>
          ))}
        </ol>
      </Section>

      <CTASection
        title="Want to talk to the people who would run your account?"
        description="No discovery call, no deck. Send the lane and we will put the coordinator who would actually handle it on the phone."
      />
    </>
  )
}
