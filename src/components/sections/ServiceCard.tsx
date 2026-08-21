import { Check } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { Service } from "@/data/site"

export function ServiceCard({
  service,
  detailed = false,
}: {
  service: Service
  detailed?: boolean
}) {
  const Icon = service.icon

  return (
    <Card className="h-full transition-shadow hover:shadow-md">
      <CardHeader>
        <span className="mb-3 grid size-10 place-items-center rounded-lg bg-brand-muted text-brand dark:bg-brand/15">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <CardTitle className="text-lg">{service.title}</CardTitle>
        <CardDescription className="leading-relaxed">
          {service.summary}
        </CardDescription>
      </CardHeader>

      {detailed ? (
        <CardContent>
          <ul className="space-y-2.5">
            {service.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5 text-sm">
                <Check
                  className="mt-0.5 size-4 shrink-0 text-brand"
                  aria-hidden="true"
                />
                <span className="text-muted-foreground">{feature}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      ) : null}
    </Card>
  )
}
