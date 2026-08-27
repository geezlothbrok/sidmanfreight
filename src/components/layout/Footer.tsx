import { Link } from "react-router-dom"
import { Mail, MapPin, Phone } from "lucide-react"

import { Separator } from "@/components/ui/separator"
import { Logo } from "@/components/layout/Logo"
import { company, navLinks, services } from "@/data/site"
import { cn } from "@/lib/utils"
import { pageContainer } from "@/lib/layout"

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-white/10 bg-[rgb(12,11,43)] text-white">
      <div className={cn(pageContainer, "py-14")}>
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4 [&>*]:min-w-0">
          <div className="lg:col-span-1">
            <Logo solid />
            <p className="font-heading mt-4 max-w-xs text-sm leading-relaxed text-brand-cyan">
              {company.description}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white">Services</h3>
            <ul className="mt-3 space-y-0.5">
              {services.slice(0, 5).map((service) => (
                <li key={service.slug}>
                  <Link
                    to="/services"
                    className="font-heading inline-block py-1.5 text-sm text-white/70 transition-colors hover:text-brand-cyan"
                  >
                    {service.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white">Company</h3>
            <ul className="mt-3 space-y-0.5">
              {navLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="font-heading inline-block py-1.5 text-sm text-white/70 transition-colors hover:text-brand-cyan"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white">Get in touch</h3>
            <ul className="font-heading mt-4 space-y-3 text-sm text-white/70">
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
                    className="inline-block py-1 transition-colors hover:text-brand-cyan"
                  >
                    {phone.display}
                  </a>
                </li>
              ))}
              {company.emails.map((email) => (
                <li key={email} className="flex items-center gap-2.5">
                  <Mail className="size-4 shrink-0" aria-hidden="true" />
                  <a
                    href={`mailto:${email}`}
                    className="inline-block py-1 break-all transition-colors hover:text-brand-cyan"
                  >
                    {email}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Separator className="my-9 bg-white/15" />

        <div className="flex flex-col items-center justify-between gap-3 text-xs text-white/60 sm:flex-row">
          <p>
            © {year} {company.name}. All rights reserved.
          </p>
          <p>{company.hours}</p>
        </div>
      </div>
    </footer>
  )
}
