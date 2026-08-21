import type { LucideIcon } from "lucide-react"
import {
  Truck,
  Ship,
  Plane,
  Warehouse,
  FileCheck,
  PackageSearch,
} from "lucide-react"

/**
 * Single source of truth for site copy.
 *
 * CONFIRMED by the client: company name, tagline, and both phone numbers.
 * PLACEHOLDER — replace before launch: email, address, founding year, and every
 * figure in `stats` / `timeline` (see About page). These were written to fill the
 * layout and are not real business data.
 */
export const company = {
  name: "Sidman Freight Consult Ltd",
  shortName: "Sidman Freight",
  tagline: "Smart! Swift! Sustainable Freight Solutions",
  description:
    "Full-service freight forwarding and logistics — road, ocean, and air — with the customs expertise and live visibility to keep your supply chain moving.",
  founded: 2009,
  phones: [
    { display: "024 221 6051", tel: "+233242216051" },
    { display: "026 524 0272", tel: "+233265240272" },
  ],
  email: "info@sidmanfreight.com",
  address: {
    city: "Accra",
    country: "Ghana",
  },
  hours: "Mon–Fri, 8:00 AM – 5:00 PM GMT",
} as const

export const hero = {
  eyebrow: "Freight forwarding & customs brokerage",
  headline: ["Smart. Swift.", "Sustainable freight."],
  subhead:
    "Road, ocean, and air cargo moved end to end — cleared by our own licensed brokers and tracked every step of the way.",
  primaryCta: { label: "Get a Quote", to: "/contact" },
  secondaryCta: { label: "Our services", to: "/services" },
  /** Set to a video URL to reveal the play card over the hero image. */
  videoUrl: null as string | null,
} as const

export const navLinks = [
  { label: "Home", to: "/" },
  { label: "Services", to: "/services" },
  { label: "About", to: "/about" },
  { label: "Contact", to: "/contact" },
] as const

export type Service = {
  slug: string
  title: string
  summary: string
  icon: LucideIcon
  features: string[]
}

export const services: Service[] = [
  {
    slug: "ftl-ltl",
    title: "Road Freight (FTL & LTL)",
    summary:
      "Dedicated full-truckload and cost-efficient less-than-truckload lanes across North America.",
    icon: Truck,
    features: [
      "Nationwide FTL, LTL, and partial coverage",
      "Temperature-controlled and flatbed equipment",
      "Vetted carrier network with live tracking",
      "Guaranteed and expedited transit options",
    ],
  },
  {
    slug: "ocean",
    title: "Ocean Freight",
    summary:
      "FCL and LCL sailings on the major trade lanes, with consolidation at origin and destination.",
    icon: Ship,
    features: [
      "FCL, LCL, and breakbulk handling",
      "Weekly consolidations from Asia and Europe",
      "Port-to-port and door-to-door service",
      "Container drayage and demurrage management",
    ],
  },
  {
    slug: "air",
    title: "Air Freight",
    summary:
      "Time-critical airfreight when the schedule matters more than the rate card.",
    icon: Plane,
    features: [
      "Next-flight-out and consolidated air service",
      "Charter arrangement for oversized loads",
      "Dangerous goods certified handling",
      "Airport-to-door final mile",
    ],
  },
  {
    slug: "warehousing",
    title: "Warehousing & Distribution",
    summary:
      "Bonded and general storage close to the ports, with pick, pack, and fulfillment built in.",
    icon: Warehouse,
    features: [
      "Bonded and general-order warehousing",
      "Cross-docking and transloading",
      "Pick, pack, kitting, and labeling",
      "Real-time inventory visibility",
    ],
  },
  {
    slug: "customs",
    title: "Customs Brokerage",
    summary:
      "Licensed brokers who clear your cargo the first time, without surprise assessments.",
    icon: FileCheck,
    features: [
      "Licensed customs brokerage in all US ports",
      "HTS classification and duty optimization",
      "ISF, AES, and PGA filings",
      "Bond procurement and compliance audits",
    ],
  },
  {
    slug: "visibility",
    title: "Supply Chain Visibility",
    summary:
      "One portal for every shipment, every document, and every exception — updated as it happens.",
    icon: PackageSearch,
    features: [
      "Milestone tracking across all modes",
      "Proactive exception and delay alerts",
      "Document repository with BOL and POD",
      "Landed-cost and lane performance reporting",
    ],
  },
]

export const stats = [
  { value: "15+", label: "Years in operation" },
  { value: "48", label: "Countries served" },
  { value: "12k+", label: "Shipments per year" },
  { value: "99.2%", label: "On-time delivery" },
] as const

export const values = [
  {
    title: "Straight answers",
    body: "If a container is going to miss its sailing, you hear it from us first — not from your customer. No buried surcharges, no vanishing account managers.",
  },
  {
    title: "Operators, not resellers",
    body: "Our team came off the docks and out of the dispatch office. We book the freight we know how to move, and we say no to the freight we don't.",
  },
  {
    title: "Compliance as a default",
    body: "Licensed brokers on staff review every entry. Clean filings mean fewer holds, fewer penalties, and cargo that keeps moving.",
  },
] as const

export const faqs = [
  {
    question: "How quickly can I get a rate?",
    answer:
      "Most domestic road quotes come back within two hours during business hours. Ocean and air quotes involving customs or special handling typically take up to one business day.",
  },
  {
    question: "Do you handle customs clearance yourselves?",
    answer:
      "Yes. We hold a national customs brokerage license and file entries in-house, so clearance is coordinated by the same team managing your freight — not handed to a third party.",
  },
  {
    question: "What is your minimum shipment size?",
    answer:
      "There isn't one. We move single LTL pallets and full vessel charters, and everything between. Smaller accounts get the same operations team as our largest.",
  },
  {
    question: "Can I track shipments in real time?",
    answer:
      "Every account gets portal access with milestone tracking across road, ocean, and air, plus automatic alerts when a shipment deviates from its plan.",
  },
  {
    question: "Are you insured for high-value cargo?",
    answer:
      "We carry full contingent cargo liability and can arrange all-risk cargo insurance per shipment or as an annual open policy. Coverage terms are confirmed in writing before pickup.",
  },
] as const
