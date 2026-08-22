import { cn } from "@/lib/utils"
import { useInView } from "@/lib/use-in-view"
import { pageContainer } from "@/lib/layout"

export function PageHeader({
  eyebrow,
  title,
  description,
  titleClassName,
}: {
  eyebrow: string
  title: string
  description: string
  /** Opt-in title colour. Only safe on pages with a dark header backdrop. */
  titleClassName?: string
}) {
  const { ref, inView } = useInView<HTMLDivElement>()

  return (
    <section className="relative overflow-hidden border-b border-border bg-muted/30">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(50%_70%_at_50%_0%,var(--brand-muted),transparent_70%)]"
      />
      <div
        ref={ref}
        className={cn(pageContainer, "py-20 sm:py-28 lg:py-32", "reveal-section", inView && "reveal-section-in")}
      >
        <div className="max-w-3xl">
          <p className="text-sm font-semibold tracking-[0.14em] text-brand uppercase sm:text-base">
            {eyebrow}
          </p>
          <h1
            className={cn(
              "font-heading mt-6 text-4xl leading-[1.12] font-semibold tracking-tight text-balance sm:mt-7 sm:text-5xl",
              titleClassName
            )}
          >
            {title}
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-relaxed text-pretty text-muted-foreground sm:mt-8">
            {description}
          </p>
        </div>
      </div>
    </section>
  )
}
