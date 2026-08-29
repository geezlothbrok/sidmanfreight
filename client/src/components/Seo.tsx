import { useEffect } from "react"
import { useLocation } from "react-router-dom"

import { ROUTES, PRIVATE_PATHS, SITE_URL, ORG } from "@/seo.config.js"

/**
 * Keeps the document head correct during client-side navigation.
 *
 * scripts/seo-build.js already bakes the right tags into the static HTML for
 * each route, which is what crawlers read. But once React takes over, a user
 * moving from /services to /contact never triggers a document load, so without
 * this the tab title, canonical link and og:url would all still describe the
 * page they first landed on. That matters beyond cosmetics: the canonical tag
 * is read by crawlers that DO execute JavaScript, and a stale one tells Google
 * that /contact is a duplicate of /services.
 *
 * Mounted once in RootLayout rather than per page, so a new route only needs an
 * entry in seo.config.js — there is no component to remember to add, and the
 * static build and the client can never disagree about a page's title.
 */

type Meta = { title: string; description: string; canonical: string; index: boolean }

function metaFor(pathname: string): Meta {
  // Normalise a trailing slash so "/services/" and "/services" resolve alike.
  const path = pathname !== "/" && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname

  const isPrivate = PRIVATE_PATHS.some(
    (p: string) => path === p || path.startsWith(`${p}/`)
  )
  if (isPrivate) {
    // The staff portal must never be indexed. robots.txt disallows crawling it,
    // but a page that gets linked from elsewhere can still be indexed without
    // being crawled — only a noindex tag actually keeps it out of results.
    return {
      title: `Staff Portal | ${ORG.name}`,
      description: "",
      canonical: "",
      index: false,
    }
  }

  const route = ROUTES.find((r: { path: string }) => r.path === path)
  if (!route) {
    return { title: `Page not found | ${ORG.name}`, description: "", canonical: "", index: false }
  }
  return {
    // route.title is the complete title — the static build uses it verbatim, so
    // appending the brand here would make the two disagree after hydration.
    title: route.title,
    description: route.description,
    canonical: route.path === "/" ? `${SITE_URL}/` : `${SITE_URL}${route.path}`,
    index: true,
  }
}

/** Create the tag if it is missing, then set it — the static HTML already has
 *  most of these, but the SPA fallback and the portal routes do not. */
function setTag(selector: string, create: () => HTMLElement, attr: string, value: string) {
  let el = document.head.querySelector(selector)
  if (!el) {
    if (!value) return
    el = create()
    document.head.appendChild(el)
  }
  if (value) el.setAttribute(attr, value)
  else el.remove()
}

export function Seo() {
  const { pathname } = useLocation()

  useEffect(() => {
    const meta = metaFor(pathname)

    document.title = meta.title

    setTag(
      'meta[name="description"]',
      () => Object.assign(document.createElement("meta"), { name: "description" }),
      "content",
      meta.description
    )
    setTag(
      'link[rel="canonical"]',
      () => Object.assign(document.createElement("link"), { rel: "canonical" }),
      "href",
      meta.canonical
    )
    setTag(
      'meta[name="robots"]',
      () => Object.assign(document.createElement("meta"), { name: "robots" }),
      "content",
      meta.index ? "index, follow, max-image-preview:large, max-snippet:-1" : "noindex, nofollow"
    )

    // og:title / og:description / og:url exist in the static head; keep them in
    // step so a link copied from the address bar after navigating still previews
    // as the page the user is actually looking at.
    const og: Array<[string, string]> = [
      ["og:title", meta.title],
      ["og:description", meta.description],
      ["og:url", meta.canonical],
    ]
    for (const [property, value] of og) {
      if (!value) continue
      setTag(
        `meta[property="${property}"]`,
        () => {
          const el = document.createElement("meta")
          el.setAttribute("property", property)
          return el
        },
        "content",
        value
      )
    }
  }, [pathname])

  return null
}
