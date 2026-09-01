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
 * CONFIRMED by the client: company name, tagline, phone numbers, emails, address,
 * opening hours, mission, vision, and core values.
 * PLACEHOLDER — still to replace: the `services` copy and `faqs`, which were
 * written to fill the layout and are not supplied business data.
 */
export const company = {
  name: "Sidman Freight Consult Ltd",
  shortName: "Sidman Freight",
  tagline: "Smart! Swift! Sustainable Freight Solutions",
  description:
    "Full-service freight forwarding and logistics — road, ocean, and air — with the customs expertise and live visibility to keep your supply chain moving.",
  phones: [
    { display: "024 221 6051", tel: "+233242216051" },
    { display: "026 524 0272", tel: "+233265240272" },
  ],
  emails: [
    "sidmanfreightconsultltd@gmail.com",
    "info@sidmanfreightconsult.com",
  ],
  address: {
    city: "Tema",
    country: "Ghana",
  },
  hours: "Open 24/7",
} as const

export const mission =
  "At Sidman Freight Consult Ltd, we deliver smart, swift, and sustainable freight solutions that connect Ghana to the world. Our mission is to provide reliable, transparent, and customer-focused logistics services that empower businesses to thrive in global trade."

export const vision =
  "To be Ghana's leading freight forwarding partner, setting the benchmark in West Africa for innovation, efficiency, and sustainability in logistics — transforming the way goods move across borders."

export const hero = {
  eyebrow: "Freight forwarding & customs brokerage",
  headline: ["Smart. Swift.", "Sustainable freight."],
  subhead:
    "Road, ocean, and air cargo moved end to end — cleared by our own licensed brokers and tracked every step of the way.",
  primaryCta: { label: "Get a Quote", to: "/contact" },
  secondaryCta: { label: "Our services", to: "/services" },
  /** In-page jump to the CargoTracker section (id="track") on the home page. */
  trackCta: { label: "Track Your Cargo", href: "#track" },
  /** Set to a video URL to reveal the play card over the hero image. */
  videoUrl: null as string | null,
} as const

export const navLinks = [
  { label: "Home", to: "/" },
  { label: "Services", to: "/services" },
  { label: "Partners", to: "/partners" },
  { label: "About", to: "/about" },
  { label: "Contact", to: "/contact" },
] as const


/**
 * China–Ghana trade desk.
 *
 * The CTN and CoC explanations and the clearance sequence are Ghanaian import
 * regulation, not marketing claims. The capability claims — origin hubs covered,
 * in-house brokers — need confirming against what Sidman actually operates.
 */
export const chinaGhana = {
  eyebrow: "Trade corridor",
  title: "China–Ghana trade desk",
  intro:
    "Cargo moving out of China's major export hubs — Guangzhou, Yiwu, and Shanghai — through to the Port of Tema, with the regulatory paperwork handled from origin to arrival.",
  advantages: [
    {
      title: "Direct hub coverage",
      body: "Bookings out of Guangzhou, Yiwu, and Shanghai, coordinated through to discharge at Tema.",
    },
    {
      title: "Compliance handled at origin",
      body: "CTN and CoC paperwork raised before the vessel sails, so cargo is not held or fined on arrival.",
    },
    {
      title: "FCL and LCL",
      body: "A full container when the volume justifies it, weekly consolidation when it does not.",
    },
    {
      title: "Cleared by our own brokers",
      body: "Duty assessment and tariff classification handled in-house at Tema, not passed to a third party.",
    },
  ],
  compliance: [
    {
      code: "CTN",
      title: "Cargo Tracking Note",
      body: "A CTN is mandatory for cargo shipped to Ghana. Shipment details must be pre-declared before the vessel departs origin. We apply for and secure it in advance, which is what prevents penalties and demurrage at Tema.",
    },
    {
      code: "CoC",
      title: "Certificate of Conformity",
      body: "Under Ghana's conformity assessment programme, many imported goods require a CoC confirming they meet the required quality and safety standards. We coordinate inspection and certification at origin, before the goods ship.",
    },
  ],
  process: [
    {
      title: "Booking and documentation",
      body: "We book the space and prepare shipping documents directly with your supplier or agent in China.",
    },
    {
      title: "Origin port handling",
      body: "Cargo is consolidated where needed, loaded, and dispatched from your chosen origin port.",
    },
    {
      title: "Ocean or air freight to Tema",
      body: "The shipment is tracked in transit, with milestone updates rather than status chasing.",
    },
    {
      title: "CTN and CoC check",
      body: "We verify and submit both documents ahead of arrival, so nothing is outstanding when the vessel berths.",
    },
    {
      title: "Customs clearance at Tema",
      body: "Duty assessment, tariff classification, and clearance formalities handled with Ghana Customs.",
    },
    {
      title: "Final delivery",
      body: "Cleared cargo delivered to your warehouse or onward destination anywhere in Ghana.",
    },
  ],
} as const

/**
 * Partners page. Ship agency duties below are GPHA/Ghana port requirements.
 * Confirm Sidman actually holds ship agency licensing before publishing.
 */
export const partners = {
  eyebrow: "Agents & partners",
  title: "Partner with Sidman Freight",
  intro:
    "A licensed local agent at the Port of Tema — for international freight forwarders who need reliable handling in Ghana, and for shipping lines that need full agency representation.",
  reasons: [
    {
      title: "Licensed and local",
      body: "An established team operating directly at Tema, not a broker sub-contracting your cargo onward.",
    },
    {
      title: "Fast-track clearance",
      body: "Clearance turnaround measured in days, with duty and classification questions answered the same day.",
    },
    {
      title: "Transparent communication",
      body: "One named contact per account and real-time updates on every shipment routed through us.",
    },
    {
      title: "Nationwide delivery",
      body: "Secure final-mile delivery anywhere in Ghana once cargo clears the port.",
    },
  ],
  shipAgency: {
    title: "Ship agency services",
    intro:
      "Every vessel calling at a Ghanaian port must be represented by a locally registered shipping agent. Without one, a vessel cannot legally discharge cargo or operate in Ghanaian waters. We act as your official representative.",
    duties: [
      "Register and represent your vessel with the Ghana Ports and Harbours Authority (GPHA)",
      "Prepare and submit all mandatory arrival and departure documentation",
      "Notify Customs and the port authorities of cargo details in advance",
      "Settle port dues, husbandry expenses, and payments on behalf of the vessel",
      "Coordinate berthing, loading, and discharge operations",
      "Act as your single legal point of contact in Ghana",
    ],
  },
} as const

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
      "Dedicated full-truckload and cost-efficient part-load haulage from the ports into Ghana and across West Africa.",
    icon: Truck,
    features: [
      "Full-load, part-load, and groupage coverage",
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
      "Licensed customs brokerage at Tema and Takoradi ports",
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

export const values = [
  {
    title: "Reliability",
    body: "We ensure shipments arrive safely and on time, every time.",
  },
  {
    title: "Integrity",
    body: "We uphold honesty and transparency in every transaction.",
  },
  {
    title: "Customer focus",
    body: "We tailor solutions to meet the unique needs of each client.",
  },
  {
    title: "Collaboration",
    body: "We build strong partnerships locally and globally to drive success.",
  },
  {
    title: "Sustainability",
    body: "We commit to eco-friendly practices and community development.",
  },
] as const

export const faqs = [
  {
    question: "How quickly can I get a rate?",
    answer:
      "Most inland haulage quotes come back within two hours during business hours. Ocean and air quotes involving customs or special handling typically take up to one business day.",
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
