export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <section className="relative overflow-hidden border-b border-border bg-muted/30">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(50%_70%_at_50%_0%,var(--brand-muted),transparent_70%)]"
      />
      <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:py-20">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold tracking-[0.14em] text-brand uppercase">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            {title}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-pretty text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
    </section>
  )
}
