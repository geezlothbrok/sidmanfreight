import { useState, type FormEvent } from "react"
import { Truck, Check, AlertCircle } from "lucide-react"

import { PageHeader } from "@/components/sections/PageHeader"
import { Section } from "@/components/sections/Section"
import {
  Field, FieldLabel, FieldControl, FieldError,
  Input, Dropdown, Button,
} from "@rfdtech/components"
import "@rfdtech/components/style.css"
import { company } from "@/data/site"
import contactBg from "@/assets/images/contactus-1600.jpg"

/**
 * Vehicle duty enquiry.
 *
 * Deliberately not a calculator: Ghana's duty depends on HS classification,
 * CIF value, age penalties and the current exchange rate, so a number computed
 * in the browser would be wrong often enough to be a liability. The form
 * collects what a broker needs to quote accurately and sends it to the office,
 * which replies with a real figure.
 */
const FUEL_TYPES = ["Petrol", "Diesel", "Hybrid", "Electric", "Other"] as const

// See Contact.tsx: relative path is dev-only, proxied by vite.config.ts.
const DUTY_API_BASE =
  import.meta.env.VITE_API_URL ||
  (window.location.hostname === "localhost"
    ? "/backend/manager_api.php"
    : "https://api.sidmanfreightconsult.com/manager_api.php")

const ENDPOINT = `${DUTY_API_BASE}?action=contact`

type Values = {
  make: string
  model: string
  chassisNumber: string
  year: string
  fuelType: string
  fuelTypeOther: string
  fullName: string
  email: string
  phone: string
}

const empty: Values = {
  make: "", model: "", chassisNumber: "", year: "",
  fuelType: "", fuelTypeOther: "", fullName: "", email: "", phone: "",
}

type Status =
  | { state: "idle" }
  | { state: "submitting" }
  | { state: "success" }
  | { state: "error"; message: string }

export function DutyCalculator() {
  const [values, setValues] = useState<Values>(empty)
  const [errors, setErrors] = useState<Partial<Record<keyof Values, string>>>({})
  const [status, setStatus] = useState<Status>({ state: "idle" })

  const set = (key: keyof Values) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((v) => ({ ...v, [key]: e.target.value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const validate = () => {
    const next: Partial<Record<keyof Values, string>> = {}
    // The chassis number is what lets a broker identify the exact model and
    // year, so it is the one vehicle field that is genuinely required.
    if (!values.chassisNumber.trim()) next.chassisNumber = "We need the chassis or VIN to identify the vehicle."
    if (!values.fullName.trim()) next.fullName = "Please tell us your name."
    if (!values.phone.trim()) next.phone = "We reply by phone, so this one is required."
    if (values.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
      next.email = "That email address does not look right."
    }
    return next
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const next = validate()
    setErrors(next)
    if (Object.keys(next).length > 0) return

    setStatus({ state: "submitting" })
    const fuel =
      values.fuelType === "Other" && values.fuelTypeOther
        ? values.fuelTypeOther
        : values.fuelType

    try {
      const body = new FormData()
      body.append("name", values.fullName)
      body.append("email", values.email || company.emails[0])
      body.append("phone", values.phone)
      body.append("subject", `Vehicle duty enquiry — ${values.make || "vehicle"} ${values.model}`.trim())
      body.append(
        "message",
        [
          "Vehicle duty enquiry from the website:",
          "",
          `Make:         ${values.make || "—"}`,
          `Model:        ${values.model || "—"}`,
          `Year:         ${values.year || "—"}`,
          `Chassis/VIN:  ${values.chassisNumber}`,
          `Fuel type:    ${fuel || "—"}`,
          "",
          `Contact:      ${values.fullName}`,
          `Phone:        ${values.phone}`,
          `Email:        ${values.email || "not supplied"}`,
        ].join("\n")
      )
      // Honeypot — see Contact.tsx. Sent empty on purpose.
      body.append("company", "")

      const res = await fetch(ENDPOINT, { method: "POST", body })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok || data.error) throw new Error(data.error || "Request failed")

      setValues(empty)
      setStatus({ state: "success" })
    } catch {
      setStatus({
        state: "error",
        message: `We could not send that just now. Please call ${company.phones[0].display} or email ${company.emails[0]}.`,
      })
    }
  }

  const submitting = status.state === "submitting"

  return (
    <>
      <PageHeader
        backgroundImage={contactBg}
        titleClassName="text-brand-gold"
        eyebrow="Vehicle duty"
        title="Vehicle duty calculator"
        description="Share the vehicle details and we will come back with an estimated duty — usually within one working day."
      />

      <Section>
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 flex items-start gap-3.5 rounded-xl border border-brand/20 bg-brand-muted/60 p-5 dark:bg-brand/10">
            <Truck className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden="true" />
            <p className="text-sm leading-relaxed text-muted-foreground">
              Duty depends on the vehicle's classification, its CIF value, its age
              and the day's exchange rate — so we quote it by hand rather than
              guessing with a formula. Send the chassis number and we will do the
              classification properly.
            </p>
          </div>

          {status.state === "success" ? (
            <div
              role="status"
              className="rounded-xl border border-brand-gold/40 bg-brand-gold/10 p-6"
            >
              <p className="flex items-center gap-2.5 font-semibold">
                <Check className="size-5 text-brand-gold" aria-hidden="true" />
                Your enquiry is in.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                We have the vehicle details and will come back with an estimated
                duty, usually within one working day.
              </p>
              <Button
                variant="outline"
                className="mt-5"
                onClick={() => setStatus({ state: "idle" })}
              >
                Send another
              </Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate className="grid gap-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <FormRow label="Make" hint="e.g. Toyota">
                  <Input value={values.make} onChange={set("make")} placeholder="Toyota" />
                </FormRow>
                <FormRow label="Model" hint="e.g. Corolla">
                  <Input value={values.model} onChange={set("model")} placeholder="Corolla" />
                </FormRow>
              </div>

              <FormRow label="Chassis / VIN" required error={errors.chassisNumber}>
                <Input
                  value={values.chassisNumber}
                  onChange={set("chassisNumber")}
                  placeholder="JT2BF22K1W0123456"
                  aria-invalid={!!errors.chassisNumber}
                />
              </FormRow>

              <div className="grid gap-5 sm:grid-cols-2">
                <FormRow label="Year">
                  <Input
                    value={values.year}
                    onChange={set("year")}
                    inputMode="numeric"
                    placeholder="2018"
                  />
                </FormRow>
                <Field>
                  <FieldLabel>Fuel type</FieldLabel>
                  <FieldControl>
                    <Dropdown
                      aria-label="Fuel type"
                      value={values.fuelType}
                      onValueChange={(v) => setValues((prev) => ({ ...prev, fuelType: v ?? "" }))}
                      options={FUEL_TYPES.map((t) => ({ value: t, label: t }))}
                      placeholder="Select fuel type"
                      clearable
                    />
                  </FieldControl>
                </Field>
              </div>

              {values.fuelType === "Other" ? (
                <FormRow label="Which fuel?" hint="e.g. LPG, CNG">
                  <Input value={values.fuelTypeOther} onChange={set("fuelTypeOther")} placeholder="LPG" />
                </FormRow>
              ) : null}

              <FormRow label="Full name" required error={errors.fullName}>
                <Input
                  value={values.fullName}
                  onChange={set("fullName")}
                  placeholder="Ama Mensah"
                  aria-invalid={!!errors.fullName}
                />
              </FormRow>

              <div className="grid gap-5 sm:grid-cols-2">
                <FormRow label="Email" error={errors.email}>
                  <Input
                    type="email"
                    value={values.email}
                    onChange={set("email")}
                    placeholder="you@company.com"
                    aria-invalid={!!errors.email}
                  />
                </FormRow>
                <FormRow label="Phone" required error={errors.phone}>
                  <Input
                    value={values.phone}
                    onChange={set("phone")}
                    placeholder="+233 24 000 0000"
                    aria-invalid={!!errors.phone}
                  />
                </FormRow>
              </div>

              {status.state === "error" ? (
                <p role="alert" className="flex items-start gap-2 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  {status.message}
                </p>
              ) : null}

              <Button type="submit" size="lg" className="mt-1 justify-self-start" disabled={submitting}>
                {submitting ? "Sending…" : "Get duty estimate"}
              </Button>
            </form>
          )}
        </div>
      </Section>
    </>
  )
}

function FormRow({
  label, hint, required, error, children,
}: {
  label: string
  hint?: string
  required?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <Field invalid={!!error}>
      <FieldLabel>
        {label}
        {required ? <span className="text-brand-gold"> *</span> : null}
      </FieldLabel>
      <FieldControl>{children}</FieldControl>
      {error ? <FieldError>{error}</FieldError> : null}
      {!error && hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </Field>
  )
}
