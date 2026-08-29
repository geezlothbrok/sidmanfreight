/**
 * Single source of truth for SEO metadata.
 *
 * Imported by BOTH the app (src/components/Seo.tsx, for title/description
 * updates during client-side navigation) and the post-build script
 * (scripts/seo-build.js, which bakes the same values into static HTML so
 * crawlers that do not execute JavaScript still read the right tags).
 *
 * Keeping one copy is the point: a title that differs between the static HTML
 * and the hydrated page is worse than having no per-page title at all, because
 * Google may index one and display the other.
 *
 * CANONICAL HOST — `www` is canonical. The Vercel project 308-redirects the
 * apex to www, so every canonical URL, sitemap entry, and og:url must use www
 * or they point at a redirect.
 */

export const SITE_URL = "https://www.sidmanfreightconsult.com"

/** Only facts confirmed by the client (see src/data/site.ts). */
export const ORG = {
  legalName: "Sidman Freight Consult Ltd",
  name: "Sidman Freight Consult",
  city: "Tema",
  region: "Greater Accra",
  country: "GH",
  phones: ["+233242216051", "+233265240272"],
  email: "info@sidmanfreightconsult.com",
  /** Confirmed as "Open 24/7". */
  hours: "Mo-Su 00:00-23:59",
  logo: `${SITE_URL}/og-image.jpg`,
  image: `${SITE_URL}/og-image.jpg`,
}

/**
 * One entry per public route. Portal routes are deliberately absent — they are
 * disallowed in robots.txt and must never be indexed.
 *
 * Each `title` is the COMPLETE <title>; the brand is not appended for you.
 * Keep them under ~60 characters or Google truncates them in results, and lead
 * with the search intent rather than the brand — someone searching "customs
 * clearance Tema" should see those words before the company name.
 */
export const ROUTES = [
  {
    path: "/",
    title: "Freight Forwarding & Customs Clearance in Tema | Sidman",
    description:
      "Sidman Freight Consult moves ocean, air, and road cargo into Ghana and clears it at Tema with in-house brokers. Get a freight quote the same day.",
    priority: "1.0",
    changefreq: "weekly",
  },
  {
    path: "/services",
    title: "Ocean, Air & Road Freight Services | Sidman Freight",
    description:
      "Ocean FCL and LCL, air freight, road haulage, bonded warehousing, and licensed customs brokerage at Tema and Takoradi — handled end to end by one team.",
    priority: "0.9",
    changefreq: "monthly",
  },
  {
    path: "/partners",
    title: "Ship Agency at Port of Tema | Sidman Freight",
    description:
      "Local agency representation at the Port of Tema for shipping lines and overseas freight forwarders — GPHA registration, port dues, berthing, and clearance.",
    priority: "0.8",
    changefreq: "monthly",
  },
  {
    path: "/about",
    title: "About Us — Freight Forwarders in Tema, Ghana",
    description:
      "A Tema-based freight forwarder connecting Ghana to the world with smart, swift, and sustainable logistics. Our mission, vision, and the values behind them.",
    priority: "0.6",
    changefreq: "yearly",
  },
  {
    path: "/contact",
    title: "Contact Us & Get a Freight Quote | Sidman Freight",
    description:
      "Call 024 221 6051 or send an enquiry for ocean, air, or road freight into Ghana and customs clearance at Tema. Open 24/7, most quotes back within hours.",
    priority: "0.8",
    changefreq: "yearly",
  },
  {
    path: "/duty-calculator",
    title: "Ghana Import Duty Calculator | Sidman Freight",
    description:
      "Estimate Ghana customs duty before you ship. Enter the vehicle or cargo details and get an indicative duty figure, then have our brokers confirm it.",
    priority: "0.9",
    changefreq: "monthly",
  },
]

/** Routes that must never be indexed — the staff portal and its sub-pages. */
export const PRIVATE_PATHS = [
  "/login",
  "/dashboard",
  "/manager-dashboard",
  "/finance",
]

export const routeFor = (path) =>
  ROUTES.find((r) => r.path === path) ?? ROUTES[0]

/**
 * FAQ answers published as FAQPage structured data.
 *
 * Deliberately EMPTY. The FAQ copy in src/data/site.ts is flagged there as
 * placeholder — written to fill the layout, not supplied by the client — and it
 * makes concrete claims ("we hold a national customs brokerage license", "full
 * contingent cargo liability"). FAQPage markup is eligible for rich results, so
 * Google can surface those answers verbatim under the company's name, stating
 * them with more authority than the page itself does.
 *
 * Once the answers are confirmed, copy them here as { question, answer } and
 * set INCLUDE_FAQ_SCHEMA = true in scripts/seo-build.js. FAQ rich results are
 * worth having — they just need to be true first.
 */
export const FAQS = []
