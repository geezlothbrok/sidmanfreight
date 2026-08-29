/**
 * Post-build SEO pass.
 *
 * WHY THIS EXISTS
 * The site is a client-rendered SPA: one index.html serves every route, so
 * without this step /services, /contact and /duty-calculator all ship the same
 * <title> and description. Google would then either index six pages under one
 * title or, more often, pick its own — and social crawlers (WhatsApp, LinkedIn,
 * Facebook, X) never run JavaScript at all, so every shared link would preview
 * with the homepage copy.
 *
 * A real prerender (react-dom/server) is not an option here: six modules read
 * `window.location.hostname` at module scope to pick the API URL, which throws
 * `window is not defined` the moment the bundle is imported in Node. So instead
 * of rendering the app, this writes one static HTML *shell* per route with the
 * correct head — same bundle, same markup, different metadata. Crawlers get
 * accurate tags immediately; React hydrates and takes over as usual.
 *
 * Vercel checks the filesystem before applying rewrites, so dist/services/
 * index.html wins for /services and only unmatched paths fall through to the
 * SPA rewrite in vercel.json.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { ORG, ROUTES, SITE_URL, PRIVATE_PATHS, FAQS } from "../src/seo.config.js"

const DIST = join(dirname(fileURLToPath(import.meta.url)), "..", "dist")

/**
 * The FAQ copy in src/data/site.ts is marked PLACEHOLDER — written to fill the
 * layout, not supplied by the client. FAQPage markup is eligible for rich
 * results, meaning Google can surface those answers verbatim in search, so
 * publishing unverified claims ("we hold a national customs brokerage license")
 * as structured data would state them with more authority than the page does.
 * Flip to true once the answers are confirmed.
 */
const INCLUDE_FAQ_SCHEMA = false

const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")

const canonical = (path) =>
  path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path}`

/** Organization + LocalBusiness, emitted on every page under a stable @id so
 *  the per-page graphs can reference it instead of repeating it. */
function organizationNode() {
  return {
    "@type": ["Organization", "LocalBusiness"],
    "@id": `${SITE_URL}/#organization`,
    name: ORG.legalName,
    alternateName: ORG.name,
    url: SITE_URL,
    logo: ORG.logo,
    image: ORG.image,
    email: ORG.email,
    telephone: ORG.phones[0],
    address: {
      "@type": "PostalAddress",
      addressLocality: ORG.city,
      addressRegion: ORG.region,
      addressCountry: ORG.country,
    },
    openingHours: ORG.hours,
    areaServed: [
      { "@type": "Country", name: "Ghana" },
      { "@type": "Place", name: "Port of Tema" },
      { "@type": "Place", name: "West Africa" },
    ],
    // Only the capabilities the site states plainly — no certifications or
    // memberships, which would be claims this repo cannot verify.
    knowsAbout: [
      "Freight forwarding",
      "Customs clearance",
      "Ocean freight",
      "Air freight",
      "Road haulage",
      "Ship agency",
      "Cargo Tracking Note (CTN)",
      "Certificate of Conformity (CoC)",
    ],
  }
}

function breadcrumbNode(route) {
  if (route.path === "/") return null
  const label = route.title.split(/[|—]/)[0].trim()
  return {
    "@type": "BreadcrumbList",
    "@id": `${canonical(route.path)}#breadcrumb`,
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: label, item: canonical(route.path) },
    ],
  }
}

function servicesNode(route) {
  if (route.path !== "/services") return null
  // Service NAMES only. The feature bullets and summaries in site.ts are
  // flagged as placeholder copy, so they are deliberately not published as
  // structured data.
  const names = [
    "Ocean Freight (FCL & LCL)",
    "Air Freight",
    "Road Freight (FTL & LTL)",
    "Customs Brokerage",
    "Warehousing & Distribution",
    "Ship Agency",
  ]
  return {
    "@type": "OfferCatalog",
    "@id": `${canonical(route.path)}#catalog`,
    name: "Freight and logistics services",
    itemListElement: names.map((name, i) => ({
      "@type": "Offer",
      position: i + 1,
      itemOffered: {
        "@type": "Service",
        name,
        provider: { "@id": `${SITE_URL}/#organization` },
        areaServed: { "@type": "Country", name: "Ghana" },
      },
    })),
  }
}

function faqNode(route) {
  // FAQS lives in seo.config.js rather than being imported from
  // src/data/site.ts, because this script runs in plain Node and cannot import
  // TypeScript. Copy the confirmed answers across when enabling.
  if (!INCLUDE_FAQ_SCHEMA || route.path !== "/" || FAQS.length === 0) return null
  return {
    "@type": "FAQPage",
    "@id": `${SITE_URL}/#faq`,
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  }
}

function jsonLd(route) {
  const graph = [
    organizationNode(),
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: ORG.name,
      publisher: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "en-GH",
    },
    {
      "@type": "WebPage",
      "@id": `${canonical(route.path)}#webpage`,
      url: canonical(route.path),
      name: route.title,
      description: route.description,
      isPartOf: { "@id": `${SITE_URL}/#website` },
      about: { "@id": `${SITE_URL}/#organization` },
    },
    breadcrumbNode(route),
    servicesNode(route),
    faqNode(route),
  ].filter(Boolean)

  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph })
}

function headFor(route) {
  const url = canonical(route.path)
  // route.title is already the complete title — see src/seo.config.js.
  const title = route.title
  return `    <title>${esc(title)}</title>
    <meta name="description" content="${esc(route.description)}" />
    <link rel="canonical" href="${url}" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
    <meta name="geo.region" content="GH-AA" />
    <meta name="geo.placename" content="Tema, Ghana" />

    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${esc(ORG.name)}" />
    <meta property="og:locale" content="en_GH" />
    <meta property="og:url" content="${url}" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(route.description)}" />
    <meta property="og:image" content="${ORG.image}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${esc(ORG.legalName)} — freight forwarding and customs clearance in Tema, Ghana" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(title)}" />
    <meta name="twitter:description" content="${esc(route.description)}" />
    <meta name="twitter:image" content="${ORG.image}" />

    <script type="application/ld+json">${jsonLd(route)}</script>`
}

/** Strip the tags we are about to replace so nothing is emitted twice. */
function stripExisting(head) {
  return head
    .replace(/\n?\s*<title>[\s\S]*?<\/title>/gi, "")
    .replace(/\n?\s*<meta\s+name="description"[^>]*>/gi, "")
    .replace(/\n?\s*<meta\s+property="og:[^"]*"[^>]*>/gi, "")
    .replace(/\n?\s*<meta\s+name="twitter:[^"]*"[^>]*>/gi, "")
    .replace(/\n?\s*<link\s+rel="canonical"[^>]*>/gi, "")
}

function sitemap() {
  const today = new Date().toISOString().slice(0, 10)
  const urls = ROUTES.map(
    (r) => `  <url>
    <loc>${canonical(r.path)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`
  ).join("\n")
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`
}

function robots() {
  return `# ${ORG.legalName}
User-agent: *
Allow: /
${PRIVATE_PATHS.map((p) => `Disallow: ${p}`).join("\n")}

Sitemap: ${SITE_URL}/sitemap.xml
`
}

function main() {
  if (!existsSync(DIST)) {
    console.error("seo-build: dist/ not found — run vite build first")
    process.exit(1)
  }

  const source = readFileSync(join(DIST, "index.html"), "utf8")
  const headMatch = source.match(/<head>([\s\S]*?)<\/head>/i)
  if (!headMatch) {
    console.error("seo-build: no <head> in dist/index.html")
    process.exit(1)
  }
  const baseHead = stripExisting(headMatch[1]).replace(/\n{2,}/g, "\n")

  for (const route of ROUTES) {
    const html = source.replace(
      /<head>[\s\S]*?<\/head>/i,
      `<head>${baseHead}\n${headFor(route)}\n  </head>`
    )
    const outDir = route.path === "/" ? DIST : join(DIST, route.path)
    mkdirSync(outDir, { recursive: true })
    writeFileSync(join(outDir, "index.html"), html)
    console.log(`  ${route.path.padEnd(18)} → ${route.title}`)
  }

  writeFileSync(join(DIST, "sitemap.xml"), sitemap())
  writeFileSync(join(DIST, "robots.txt"), robots())
  console.log(`  sitemap.xml        → ${ROUTES.length} urls`)
  console.log(`  robots.txt         → ${PRIVATE_PATHS.length} portal paths disallowed`)
}

main()
