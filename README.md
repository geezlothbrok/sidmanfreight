# Sidman Freight — Client

Marketing site for Sidman Freight, built with Vite + React 19 + TypeScript,
styled with Tailwind CSS v4 and shadcn/ui.

## Getting started

```bash
pnpm install
pnpm dev        # http://localhost:5173
```

## Scripts

| Command        | What it does                                  |
| -------------- | --------------------------------------------- |
| `pnpm dev`     | Dev server with HMR on port 5173              |
| `pnpm build`   | Typecheck (`tsc -b`) then production build    |
| `pnpm preview` | Serve the production build locally            |
| `pnpm lint`    | Run oxlint                                    |

## Structure

```
src/
├── components/
│   ├── ui/         shadcn/ui primitives (generated — edit with care)
│   ├── layout/     Navbar, Footer, Logo, RootLayout
│   └── sections/   Reusable marketing blocks (Hero, ServiceCard, CTA, …)
├── pages/          One component per route
├── data/site.ts    All copy, services, stats, and FAQs live here
├── lib/utils.ts    cn() class merge helper
└── index.css       Tailwind entry + design tokens
```

**Content lives in [`src/data/site.ts`](src/data/site.ts).** Company details,
the six services, stats, values, and FAQs are all defined there — change copy
in that one file rather than hunting through components.

## Routes

`/` · `/services` · `/about` · `/contact` — plus a catch-all 404.

## Backend integration

The contact form POSTs to `/api/contact`, which Vite proxies to
`http://localhost:3000` (see [`vite.config.ts`](vite.config.ts)). Until that
endpoint exists the form validates client-side and shows a graceful fallback
pointing at the phone number and email. Adjust the proxy target when the
backend settles on a port.

Expected request body:

```ts
{ name, email, companyName, phone, origin, destination, message }
```

## Design tokens

Brand colors are defined as CSS variables in `src/index.css` (`--brand`,
`--accent-amber`) and exposed to Tailwind as `bg-brand`, `text-brand`, etc.
Both light and dark palettes are defined; dark mode activates via a `.dark`
class on the root element (no toggle is wired up yet).
