import { useState } from "react"
import { NavLink, Link, useLocation } from "react-router-dom"
import { ChevronRight, Menu, Phone } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Logo } from "@/components/layout/Logo"
import { company, navLinks } from "@/data/site"
import { cn } from "@/lib/utils"
import { pageContainer } from "@/lib/layout"

export function Navbar() {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)

  // The landing page is one full-bleed photo, so the bar stays transparent over
  // it at every scroll position. Content pages need the solid plate, otherwise
  // the white nav text lands on white page background.
  const transparent = pathname === "/"

  return (
    <header
      className={cn(
        "top-0 z-50 w-full transition-colors duration-300",
        transparent
          ? "fixed border-b border-transparent bg-transparent"
          : "sticky border-b border-border/80 bg-background/85 backdrop-blur-md"
      )}
    >
      <div className={cn(pageContainer, "flex h-24 items-center justify-between gap-4")}>
        {/* The full lock-up has a white wordmark, so it is only legible while the
            navbar is transparent over the hero. Elsewhere the bar is light and
            the navy mark is the one that reads. */}
        <Logo onDark={transparent} />

        <nav
          className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-2.5 lg:flex xl:gap-8"
          aria-label="Main"
        >
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              className={({ isActive }) =>
                cn(
                  "font-heading rounded-md px-1 py-2 text-sm font-medium transition-colors",
                  isActive &&
                    "text-brand-gold underline decoration-brand-gold decoration-2 underline-offset-8",
                  !isActive &&
                    (transparent
                      ? "text-white/75 hover:text-white"
                      : "text-muted-foreground hover:text-foreground")
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3 md:gap-6">
          <a
            href={`tel:${company.phones[0].tel}`}
            className={cn(
              "hidden items-center gap-1.5 py-2 text-sm font-medium transition-colors min-[1340px]:flex",
              transparent
                ? "text-white/80 hover:text-white"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Phone className="size-3.5" aria-hidden="true" />
            {company.phones[0].display}
          </a>

          <Button
            asChild
            size="lg"
            className={cn(
              "hidden h-10 bg-[#C1121F] px-5 text-white hover:bg-[#9E0E19] md:inline-flex",
              transparent && "border-transparent"
            )}
          >
            <Link to="/duty-calculator">Duty Calculator</Link>
          </Button>

          <Button
            asChild
            size="lg"
            variant={transparent ? "outline" : "default"}
            className={cn(
              "hidden h-10 px-5 md:inline-flex",
              transparent &&
                "border-white/50 bg-transparent text-white hover:bg-white/10 hover:text-white dark:border-white/50 dark:bg-transparent dark:hover:bg-white/10"
            )}
          >
            <Link to="/contact">
              Get a Quote
              <ChevronRight data-icon="inline-end" aria-hidden="true" />
            </Link>
          </Button>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon-lg"
                className={cn(
                  "lg:hidden",
                  transparent && "text-white hover:bg-white/10 hover:text-white"
                )}
              >
                <Menu aria-hidden="true" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle className="text-left">Menu</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-4" aria-label="Mobile">
                {navLinks.map((link) => {
                  // Radix's Slot (via SheetClose asChild) merges className by
                  // string concatenation, so NavLink's function form would be
                  // stringified into the DOM rather than called. Resolve the
                  // active state here and hand Slot a plain string.
                  const isActive =
                    link.to === "/"
                      ? pathname === "/"
                      : pathname.startsWith(link.to)

                  return (
                    <SheetClose asChild key={link.to}>
                      <Link
                        to={link.to}
                        className={cn(
                          "font-heading rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-muted text-brand-gold underline decoration-brand-gold decoration-2 underline-offset-4"
                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                        )}
                        aria-current={isActive ? "page" : undefined}
                      >
                        {link.label}
                      </Link>
                    </SheetClose>
                  )
                })}
                <SheetClose asChild>
                  <Button asChild size="lg" className="mt-3 w-full bg-[#C1121F] text-white hover:bg-[#9E0E19]">
                    <Link to="/duty-calculator">Duty Calculator</Link>
                  </Button>
                </SheetClose>
                <SheetClose asChild>
                  <Button asChild size="lg" className="mt-2 w-full">
                    <Link to="/contact">Get a Quote</Link>
                  </Button>
                </SheetClose>
                <div className="mt-4 space-y-2 px-3">
                  {company.phones.map((phone) => (
                    <a
                      key={phone.tel}
                      href={`tel:${phone.tel}`}
                      className="flex items-center gap-2 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <Phone className="size-3.5" aria-hidden="true" />
                      {phone.display}
                    </a>
                  ))}
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
