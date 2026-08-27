import { cn } from "@/lib/utils"
import { useInView } from "@/lib/use-in-view"
import { pageContainer } from "@/lib/layout"

export function PageHeader({
  eyebrow,
  title,
  description,
  titleClassName,
  backgroundImage,
  overlayClassName,
  eyebrowClassName,
  paddingClassName,
}: {
  eyebrow: string
  title: string
  description: string
  /** Opt-in title colour. Only safe on pages with a dark header backdrop. */
  titleClassName?: string
  /**
   * Photo backdrop for pages whose body stays light. Switches the header into
   * dark scope so the copy reads against the scrim rather than the photo.
   */
  backgroundImage?: string
  /** Override the scrim strength per page; brighter photos need more. */
  overlayClassName?: string
  /** Override the eyebrow colour; white survives a lighter scrim than cyan. */
  eyebrowClassName?: string
  /** Override the block's vertical rhythm per page. */
  paddingClassName?: string
}) {
  const { ref, inView } = useInView<HTMLDivElement>()

  return (
    <section
      className={cn(
        "relative isolate overflow-hidden border-b",
        backgroundImage
          ? "dark border-white/10 bg-background text-foreground"
          : "border-border bg-muted/30"
      )}
    >
      {backgroundImage ? (
        <>
          <img
            src={backgroundImage}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 -z-20 size-full object-cover"
            fetchPriority="high"
          />
          <div
            aria-hidden="true"
            className={cn(
              "absolute inset-0 -z-10 bg-[oklch(0.14_0.04_264)]",
              overlayClassName ?? "opacity-[0.68]"
            )}
          />
        </>
      ) : (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(50%_70%_at_50%_0%,var(--brand-muted),transparent_70%)]"
        />
      )}
      <div
        ref={ref}
        className={cn(
          pageContainer,
          // Photo headers get extra headroom so the copy sits lower in the frame
          // instead of riding the top edge of the image.
          paddingClassName ??
            (backgroundImage
              ? "pt-28 pb-14 sm:pt-32 sm:pb-16 lg:pt-36 lg:pb-20"
              : "py-20 sm:py-28 lg:py-32"),
          "reveal-section",
          inView && "reveal-section-in"
        )}
      >
        <div className="max-w-3xl">
          <p
            className={cn(
              "text-sm font-semibold tracking-[0.14em] uppercase sm:text-base",
              backgroundImage ? "text-brand-cyan" : "text-brand",
              eyebrowClassName
            )}
          >
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
          <p
            className={cn(
              "mt-7 max-w-2xl text-lg leading-relaxed text-pretty sm:mt-8",
              backgroundImage ? "text-white" : "text-muted-foreground"
            )}
          >
            {description}
          </p>
        </div>
      </div>
    </section>
  )
}
