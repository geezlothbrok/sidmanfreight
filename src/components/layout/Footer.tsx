import { Link } from "react-router-dom"
import { Mail, MapPin, Phone } from "lucide-react"

import { Separator } from "@/components/ui/separator"
import { Logo } from "@/components/layout/Logo"
import { company, navLinks, services } from "@/data/site"

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="mx-auto w-full max-w-6xl px-5 py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              {company.description}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Services</h3>
            <ul className="mt-4 space-y-2.5">
              {services.slice(0, 5).map((service) => (
                <li key={service.slug}>
                  <Link
                    to="/services"
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {service.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Company</h3>
            <ul className="mt-4 space-y-2.5">
              {navLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Get in touch</h3>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>
                  {company.address.city}, {company.address.country}
                </span>
              </li>
              {company.phones.map((phone) => (
                <li key={phone.tel} className="flex items-center gap-2.5">
                  <Phone className="size-4 shrink-0" aria-hidden="true" />
                  <a
                    href={`tel:${phone.tel}`}
                    className="transition-colors hover:text-foreground"
                  >
                    {phone.display}
                  </a>
                </li>
              ))}
              <li className="flex items-center gap-2.5">
                <Mail className="size-4 shrink-0" aria-hidden="true" />
                <a
                  href={`mailto:${company.email}`}
                  className="transition-colors hover:text-foreground"
                >
                  {company.email}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <Separator className="my-9" />

        <div className="flex flex-col items-center justify-between gap-3 text-xs text-muted-foreground sm:flex-row">
          <p>
            © {year} {company.name}. All rights reserved.
          </p>
          <p>{company.hours}</p>
        </div>
      </div>
    </footer>
  )
}
