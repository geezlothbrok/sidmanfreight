import type { ReactNode } from "react"
import { useInView } from "@/lib/use-in-view"
import { cn } from "@/lib/utils"
import { pageContainer } from "@/lib/layout"

export function Section({
  children,
  className,
  muted = false,
  reveal = true,
  id,
}: {
  children: ReactNode
  className?: string
  muted?: boolean
  reveal?: boolean
  /** Anchor target, so nav links can deep-link to a section. */
  id?: string
}) {
  const { ref, inView } = useInView<HTMLDivElement>()

  return (
    <section id={id} className={cn(muted && "bg-muted/30", className)}>
      <div
        ref={reveal ? ref : undefined}
        className={cn(
          pageContainer,
          "py-16 sm:py-20 lg:py-24",
          reveal && "reveal-section",
          reveal && inView && "reveal-section-in"
        )}
      >
        {children}
      </div>
    </section>
  )
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  titleClassName,
  className,
}: {
  eyebrow?: string
  title: string
  description?: string
  align?: "center" | "start"
  /** Per-section size or colour override for the heading. */
  titleClassName?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "max-w-2xl",
        align === "center" ? "mx-auto text-center" : "text-left",
        className
      )}
    >
      {eyebrow ? (
        <p className="text-sm font-semibold tracking-[0.14em] text-brand uppercase sm:text-base">
          {eyebrow}
        </p>
      ) : null}
      <h2
        className={cn(
          "font-heading mt-4 text-2xl font-semibold tracking-tight text-balance sm:text-3xl",
          titleClassName
        )}
      >
        {title}
      </h2>
      {description ? (
        <p className="mt-4 text-base leading-relaxed text-pretty text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  )
}
