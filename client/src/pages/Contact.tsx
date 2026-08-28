import { useState, type FormEvent } from "react"
import { Clock, Loader2, Mail, MapPin, Phone, Send } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PageHeader } from "@/components/sections/PageHeader"
import { Section } from "@/components/sections/Section"
import { company } from "@/data/site"
import { cn } from "@/lib/utils"
import contactBg from "@/assets/images/contactus-1600.jpg"

type FormValues = {
  name: string
  email: string
  companyName: string
  phone: string
  origin: string
  destination: string
  message: string
}

type FormErrors = Partial<Record<keyof FormValues, string>>

type Status =
  | { state: "idle" }
  | { state: "submitting" }
  | { state: "success" }
  | { state: "error"; message: string }

/**
 * Contact submissions go to the PHP backend's `contact` action, which relays
 * them over SMTP from the company mailbox. In dev, vite.config.ts proxies
 * /backend to the local PHP server.
 */
// Same resolution as the staff portal (Login/Dashboard/Finance): the relative
// path is a DEV-ONLY convenience that vite.config.ts proxies. Off localhost it
// must be the API subdomain — the frontend domain has no PHP, and the SPA
// rewrite would return index.html with a 200, so response.json() would throw.
const CONTACT_API_BASE =
  import.meta.env.VITE_API_URL ||
  (window.location.hostname === "localhost"
    ? "/backend/manager_api.php"
    : "https://api.sidmanfreightconsult.com/manager_api.php")

const CONTACT_ENDPOINT = `${CONTACT_API_BASE}?action=contact`

const emptyForm: FormValues = {
  name: "",
  email: "",
  companyName: "",
  phone: "",
  origin: "",
  destination: "",
  message: "",
}

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {}

  if (!values.name.trim()) errors.name = "Please tell us your name."
  if (!values.email.trim()) {
    errors.email = "We need an email to send the quote to."
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = "That email address does not look right."
  }
  if (!values.message.trim()) {
    errors.message = "A short description helps us quote accurately."
  } else if (values.message.trim().length < 20) {
    errors.message = "Please add a little more detail (20 characters or more)."
  }

  return errors
}

const contactDetails = [
  ...company.phones.map((phone, index) => ({
    icon: Phone,
    label: index === 0 ? "Phone" : "Alternate phone",
    value: phone.display,
    href: `tel:${phone.tel}`,
  })),
  ...company.emails.map((email, index) => ({
    icon: Mail,
    label: index === 0 ? "Email" : "Alternate email",
    value: email,
    href: `mailto:${email}`,
  })),
  {
    icon: MapPin,
    label: "Office",
    value: `${company.address.city}, ${company.address.country}`,
    href: undefined,
  },
  {
    icon: Clock,
    label: "Hours",
    value: company.hours,
    href: undefined,
  },
]

export function Contact() {
  const [values, setValues] = useState<FormValues>(emptyForm)
  const [errors, setErrors] = useState<FormErrors>({})
  const [status, setStatus] = useState<Status>({ state: "idle" })

  const update = (field: keyof FormValues) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setValues((prev) => ({ ...prev, [field]: event.target.value }))
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextErrors = validate(values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      setStatus({ state: "idle" })
      return
    }

    setStatus({ state: "submitting" })

    try {
      // The PHP backend sends this through the company's own mailbox over SMTP
      // (backend/smtp_mailer.php) — no third-party email service, and the
      // credentials never reach the browser.
      const body = new FormData()
      body.append("name", values.name)
      body.append("email", values.email)
      body.append("phone", values.phone)
      body.append(
        "subject",
        values.origin && values.destination
          ? `Quote request: ${values.origin} to ${values.destination}`
          : "Website enquiry"
      )
      body.append(
        "message",
        [
          values.companyName ? `Company: ${values.companyName}` : null,
          values.origin ? `Origin: ${values.origin}` : null,
          values.destination ? `Destination: ${values.destination}` : null,
          "",
          values.message,
        ]
          .filter((line) => line !== null)
          .join("\n")
      )
      // Honeypot: the backend treats a filled `company` field as a bot and
      // silently discards it. Deliberately left empty — the visible company
      // input is sent inside the message above, not here.
      body.append("company", "")

      const response = await fetch(CONTACT_ENDPOINT, { method: "POST", body })
      const data = (await response.json().catch(() => ({}))) as { error?: string }

      if (!response.ok || data.error) {
        throw new Error(data.error || `Request failed with status ${response.status}`)
      }

      setValues(emptyForm)
      setStatus({ state: "success" })
    } catch {
      setStatus({
        state: "error",
        message: `We could not send that just now. Please email ${company.emails[0]} or call ${company.phones[0].display}.`,
      })
    }
  }

  const submitting = status.state === "submitting"

  return (
    <>
      <PageHeader
        backgroundImage={contactBg}
        titleClassName="text-brand-gold"
        eyebrow="Contact"
        title="Tell us what needs to move"
        description="Send the lane, the commodity, and the deadline. Most quotes come back the same business day, from the coordinator who would run the account."
      />

      <Section>
        <div className="grid gap-10 lg:grid-cols-[1.35fr_1fr] lg:gap-14">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Request a quote</CardTitle>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} noValidate className="space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field
                    id="name"
                    label="Full name"
                    required
                    value={values.name}
                    onChange={update("name")}
                    error={errors.name}
                    autoComplete="name"
                  />
                  <Field
                    id="email"
                    label="Work email"
                    type="email"
                    required
                    value={values.email}
                    onChange={update("email")}
                    error={errors.email}
                    autoComplete="email"
                  />
                  <Field
                    id="companyName"
                    label="Company"
                    value={values.companyName}
                    onChange={update("companyName")}
                    error={errors.companyName}
                    autoComplete="organization"
                  />
                  <Field
                    id="phone"
                    label="Phone"
                    type="tel"
                    value={values.phone}
                    onChange={update("phone")}
                    error={errors.phone}
                    autoComplete="tel"
                  />
                  <Field
                    id="origin"
                    label="Origin"
                    placeholder="City or port"
                    value={values.origin}
                    onChange={update("origin")}
                    error={errors.origin}
                  />
                  <Field
                    id="destination"
                    label="Destination"
                    placeholder="City or port"
                    value={values.destination}
                    onChange={update("destination")}
                    error={errors.destination}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="message">
                    Shipment details <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="message"
                    name="message"
                    rows={5}
                    placeholder="Commodity, weight and dimensions, required delivery date, and anything unusual about the handling."
                    value={values.message}
                    onChange={update("message")}
                    aria-invalid={Boolean(errors.message)}
                    aria-describedby={errors.message ? "message-error" : undefined}
                  />
                  {errors.message ? (
                    <p id="message-error" className="text-sm text-destructive">
                      {errors.message}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Button
                    type="submit"
                    size="lg"
                    disabled={submitting}
                    className="h-11 px-6 text-base"
                  >
                    {submitting ? (
                      <>
                        <Loader2
                          data-icon="inline-start"
                          className="animate-spin"
                          aria-hidden="true"
                        />
                        Sending…
                      </>
                    ) : (
                      <>
                        <Send data-icon="inline-start" aria-hidden="true" />
                        Send request
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    We reply to every request. No mailing list, no follow-up drip.
                  </p>
                </div>

                <div aria-live="polite">
                  {status.state === "success" ? (
                    <p className="rounded-lg border border-brand/30 bg-brand-muted px-4 py-3 text-sm text-foreground dark:bg-brand/15">
                      Thanks — your request is in. A coordinator will be in touch
                      within one business day.
                    </p>
                  ) : null}
                  {status.state === "error" ? (
                    <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                      {status.message}
                    </p>
                  ) : null}
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-semibold">Reach us directly</h2>
              <ul className="mt-5 space-y-5">
                {contactDetails.map((detail) => {
                  const Icon = detail.icon
                  return (
                    <li key={detail.label} className="flex items-start gap-3.5">
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-muted text-brand dark:bg-brand/15">
                        <Icon className="size-4" aria-hidden="true" />
                      </span>
                      <div>
                        <p className="text-xs font-semibold tracking-[0.1em] text-muted-foreground uppercase">
                          {detail.label}
                        </p>
                        {detail.href ? (
                          <a
                            href={detail.href}
                            className="mt-1 block py-1 text-sm break-all transition-colors hover:text-brand"
                          >
                            {detail.value}
                          </a>
                        ) : (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {detail.value}
                          </p>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>

            <div className="rounded-xl border border-border bg-muted/40 p-6">
              <h3 className="text-sm font-semibold">Already shipping with us?</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Contact your coordinator directly for anything shipment-specific —
                they have the file open. This form is for new lanes and new accounts.
              </p>
            </div>
          </div>
        </div>
      </Section>
    </>
  )
}

function Field({
  id,
  label,
  error,
  required = false,
  className,
  ...props
}: React.ComponentProps<typeof Input> & {
  id: string
  label: string
  error?: string
  required?: boolean
}) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={id}>
        {label}
        {required ? <span className="text-destructive">*</span> : null}
      </Label>
      <Input
        id={id}
        name={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
      />
      {error ? (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
