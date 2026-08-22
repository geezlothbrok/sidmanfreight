import { Link } from "react-router-dom"
import {
  ArrowRight,
  Mail,
  MapPin,
  Phone,
} from "lucide-react"

import { Section, SectionHeading } from "@/components/sections/Section"
import { PageHeader } from "@/components/sections/PageHeader"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { company, mission, vision, values, services } from "@/data/site"
import { useInView } from "@/lib/use-in-view"
import { cn } from "@/lib/utils"
import heroImage from "@/assets/images/land-1440.jpg"
import aboutBg from "@/assets/images/about-1600.jpg"

/** The three words in the company tagline, expanded in the language of the mission. */
const pillars = [
  {
    word: "Smart",
    body: "Routing, documentation, and clearance planned before the cargo moves — so the paperwork is never what holds it up.",
  },
  {
    word: "Swift",
    body: "Road, ocean, and air handled end to end, with the clearance work running in parallel rather than after the fact.",
  },
  {
    word: "Sustainable",
    body: "Eco-friendly practices and community development treated as part of the job, not an afterthought.",
  },
]

export function About() {
  const { ref: visionRef, inView: visionInView } = useInView<HTMLDivElement>()

  return (
    <div className="dark relative isolate bg-background text-foreground">
      {/*
        Page-wide backdrop. `bg-fixed` keeps the photo viewport-sized instead of
        stretching it over the full 4,000px page, which would upscale it badly.
        The scrim is what makes the copy readable, so it is deliberately heavy.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-20 bg-cover bg-fixed bg-center"
        style={{ backgroundImage: `url(${aboutBg})` }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-[oklch(0.16_0.05_264)]/92 via-[oklch(0.14_0.04_264)]/88 to-[oklch(0.16_0.05_264)]/94"
      />

      <PageHeader
        eyebrow="About us"
        title={company.tagline.replace(/!/g, ".")}
        titleClassName="text-brand-gold"
        description={`${company.name} is a Ghanaian freight forwarding and logistics company based in ${company.address.city}, moving cargo by road, ocean, and air for businesses trading between Ghana and the rest of the world.`}
      />

      <Section>
        <p className="text-xs font-semibold tracking-[0.18em] text-brand-gold uppercase">
          Why choose us?
        </p>

        <ul className="mt-10 grid gap-10 md:grid-cols-3 md:gap-8">
          {pillars.map((pillar) => (
            <li key={pillar.word}>
              <h2 className="font-heading text-xl font-semibold">{pillar.word}</h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
                {pillar.body}
              </p>
            </li>
          ))}
        </ul>
      </Section>

      <Section muted>
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
          <Card className="border-white/15 bg-white/[0.06] backdrop-blur-md">
            <CardHeader>
              <CardTitle className="font-heading text-2xl text-brand-cyan sm:text-3xl">
                Mission statement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <blockquote className="max-w-[58ch] text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
                {mission}
              </blockquote>
            </CardContent>
          </Card>

          <Card className="border-white/15 bg-white/[0.06] backdrop-blur-md">
            <CardHeader>
              <CardTitle className="font-heading text-2xl text-brand-cyan sm:text-3xl">
                Vision statement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <blockquote className="max-w-[58ch] text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
                {vision}
              </blockquote>
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section>
        <SectionHeading
          eyebrow="What we stand for"
          title="Core values"
          description="Five commitments that decide how we quote, how we move your cargo, and how we tell you when something changes."
        />

        <ul className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {values.map((value, index) => (
            <li key={value.title} className="border-t-2 border-brand-gold pt-5">
              <span className="text-xs font-semibold tracking-[0.18em] text-brand-gold uppercase">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="font-heading mt-2.5 text-lg font-semibold">
                {value.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {value.body}
              </p>
            </li>
          ))}
        </ul>
      </Section>

      {/* Vision restated over the fleet image, to break up a text-heavy page. */}
      <section className="relative isolate overflow-hidden">
        <img
          src={heroImage}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 -z-20 size-full object-cover"
          loading="lazy"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-r from-[oklch(0.24_0.166_264)]/85 via-[oklch(0.24_0.166_264)]/70 to-[oklch(0.24_0.166_264)]/40"
        />
        <div
          ref={visionRef}
          className={cn(
            "mx-auto w-full max-w-[1920px] px-6 py-20 sm:px-10 sm:py-24 lg:px-16 xl:px-24",
            "reveal-section",
            visionInView && "reveal-section-in"
          )}
        >
          <p className="text-sm font-semibold tracking-[0.18em] text-brand-gold uppercase [text-shadow:0_1px_10px_rgb(0_0_0/0.65)] sm:text-base">
            Where we are headed
          </p>
          <blockquote className="font-heading mt-6 max-w-4xl text-xl leading-snug font-semibold text-balance text-white [text-shadow:0_2px_16px_rgb(0_0_0/0.5)] sm:text-2xl lg:text-3xl">
            {vision}
          </blockquote>
        </div>
      </section>

      <Section>
        <SectionHeading
          align="start"
          eyebrow="What we move"
          title="One partner across every mode"
          description="Road, ocean, and air, with clearance and storage handled by the same team that booked the freight."
        />

        <ul className="mt-10 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => {
            const Icon = service.icon
            return (
              <li key={service.slug} className="flex items-start gap-5">
                <span className="mt-0.5 grid size-20 shrink-0 place-items-center rounded-xl bg-brand-muted text-brand dark:bg-brand/20">
                  <Icon className="size-10" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-base font-semibold text-brand-cyan">
                    {service.title}
                  </h3>
                  <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
                    {service.summary}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>

        <Button asChild variant="outline" size="lg" className="mt-10">
          <Link to="/services">
            See what each service includes
            <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </Link>
        </Button>
      </Section>

      <Section muted>
        <SectionHeading
          align="start"
          eyebrow="Find us"
          title={`Based in ${company.address.city}, working the ports daily`}
          titleClassName="text-xl sm:text-2xl"
          description="Our office sits beside Ghana's busiest container port, so clearance questions get answered by someone who was there this morning."
        />

        <dl className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex items-start gap-3.5">
            <MapPin className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden="true" />
            <div>
              <dt className="text-sm font-semibold text-brand">Office</dt>
              <dd className="mt-1 text-sm text-muted-foreground">
                {company.address.city}, {company.address.country}
              </dd>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <Phone className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden="true" />
            <div>
              <dt className="text-sm font-semibold text-brand">Phone</dt>
              <dd className="mt-1 space-y-1">
                {company.phones.map((phone) => (
                  <a
                    key={phone.tel}
                    href={`tel:${phone.tel}`}
                    className="block text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {phone.display}
                  </a>
                ))}
              </dd>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <Mail className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden="true" />
            <div>
              <dt className="text-sm font-semibold text-brand">Email</dt>
              <dd className="mt-1 space-y-1">
                {company.emails.map((email) => (
                  <a
                    key={email}
                    href={`mailto:${email}`}
                    className="block text-sm break-all text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {email}
                  </a>
                ))}
              </dd>
            </div>
          </div>
        </dl>
      </Section>
    </div>
  )
}
