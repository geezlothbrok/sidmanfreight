import { useState } from "react"
import { Link } from "react-router-dom"
import { ChevronRight, Play } from "lucide-react"

import heroImage from "@/assets/images/land-1920.jpg"
import heroImage1440 from "@/assets/images/land-1440.jpg"
import heroImage960 from "@/assets/images/land-960.jpg"
import { Button } from "@/components/ui/button"
import { company, hero } from "@/data/site"
import { cn } from "@/lib/utils"
import { pageContainer } from "@/lib/layout"

export function Hero() {
  const [videoOpen, setVideoOpen] = useState(false)

  return (
    <section className="relative isolate flex min-h-[100svh] flex-col justify-end overflow-hidden">
      <img
        src={heroImage}
        srcSet={`${heroImage960} 960w, ${heroImage1440} 1440w, ${heroImage} 1920w`}
        sizes="100vw"
        alt="A loaded container vessel under way at sea at sunrise"
        className="absolute inset-0 -z-20 size-full object-cover"
        fetchPriority="high"
      />

      {/*
        Scrim is directional, not a flat wash: heavy on the left where the copy
        sits, clearing toward the right so the sunrise and open water keep their
        colour. The second layer just seats the nav and the stats rule.
      */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-r from-black/85 via-black/55 to-black/15"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-b from-black/45 via-transparent to-black/45"
      />

      <div className={cn(pageContainer, "pt-32 pb-20 sm:pb-24")}>
        <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl xl:max-w-5xl">
            <p className="reveal-right flex items-center gap-2.5 text-xs font-semibold tracking-[0.16em] text-white/75 uppercase [animation-delay:150ms]">
              <span
                className="reveal-rule h-px w-8 bg-brand-gold [animation-delay:420ms]"
                aria-hidden="true"
              />
              {hero.eyebrow}
            </p>

            <h1 className="font-heading mt-5 text-4xl leading-[0.98] font-semibold tracking-tight text-white text-balance [text-shadow:0_2px_20px_rgb(0_0_0/0.55)] sm:text-5xl lg:text-6xl xl:text-7xl">
              {hero.headline.map((line, i) => (
                <span
                  key={line}
                  className="reveal-right block"
                  style={{ animationDelay: `${320 + i * 220}ms` }}
                >
                  {i === hero.headline.length - 1 ? (
                    <span className="text-brand-cyan">{line}</span>
                  ) : (
                    line
                  )}
                </span>
              ))}
            </h1>

            <p className="reveal-right mt-6 max-w-2xl text-base leading-relaxed text-pretty text-white/85 [text-shadow:0_1px_12px_rgb(0_0_0/0.5)] [animation-delay:900ms] sm:text-lg xl:text-xl">
              {hero.subhead}
            </p>

            <div className="reveal-right mt-9 flex flex-col gap-3 [animation-delay:1150ms] sm:flex-row sm:items-center">
              <Button
                asChild
                size="lg"
                className="h-12 w-full bg-white px-7 text-base text-brand hover:bg-white/90 sm:w-auto"
              >
                <Link to={hero.primaryCta.to}>
                  {hero.primaryCta.label}
                  <ChevronRight data-icon="inline-end" aria-hidden="true" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 w-full border-brand-gold bg-transparent px-7 text-base text-white hover:bg-brand-gold/15 hover:text-white sm:w-auto dark:border-brand-gold dark:bg-transparent dark:hover:bg-brand-gold/15"
              >
                <Link to={hero.secondaryCta.to}>{hero.secondaryCta.label}</Link>
              </Button>
              {/* Plain anchor, not a react-router Link: the tracker is a section
                  on this same page, so this is an in-page jump rather than a
                  route change. */}
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 w-full border-white/70 bg-transparent px-7 text-base text-white hover:bg-white/15 hover:text-white sm:w-auto dark:border-white/70 dark:bg-transparent dark:hover:bg-white/15"
              >
                <a href="#track">{hero.trackCta.label}</a>
              </Button>
            </div>
          </div>

          {hero.videoUrl ? (
            <button
              type="button"
              onClick={() => setVideoOpen(true)}
              className="group relative hidden aspect-video w-56 shrink-0 overflow-hidden rounded-2xl ring-1 ring-white/25 outline-none focus-visible:ring-3 focus-visible:ring-white/70 lg:block"
            >
              <img
                src={heroImage960}
                alt=""
                className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <span className="absolute inset-0 grid place-items-center bg-black/25">
                <span className="grid size-12 place-items-center rounded-full bg-brand-cyan text-white shadow-lg transition-transform duration-300 group-hover:scale-110">
                  <Play className="size-5 translate-x-px fill-current" aria-hidden="true" />
                </span>
              </span>
              <span className="sr-only">Play the {company.shortName} company film</span>
            </button>
          ) : null}
        </div>

        {/*
          Decorative wordmark, typed in from the bottom-right. aria-hidden because
          the logo already announces the company name — this would only repeat it.
        */}
        <p
          aria-hidden="true"
          className="type-in-right font-heading pointer-events-none absolute right-6 bottom-6 hidden max-w-[calc(100%-3rem)] overflow-hidden text-xl font-semibold tracking-[0.25em] whitespace-nowrap text-white/30 uppercase [animation-delay:1700ms] sm:right-10 sm:bottom-8 md:block lg:right-16 lg:text-2xl xl:right-24 xl:text-3xl"
        >
          <span className="type-caret mr-2 inline-block text-brand-gold">|</span>
          Sidman Freight Consult
        </p>
      </div>

      {videoOpen && hero.videoUrl ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Company film"
          className="fixed inset-0 z-[60] grid place-items-center bg-black/80 p-5"
          onClick={() => setVideoOpen(false)}
        >
          <video
            src={hero.videoUrl}
            controls
            autoPlay
            className="max-h-[80vh] w-full max-w-4xl rounded-xl"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}
    </section>
  )
}
