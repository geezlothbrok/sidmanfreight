import { BrowserRouter, Route, Routes } from "react-router-dom"

import { RootLayout } from "@/components/layout/RootLayout"
import { Home } from "@/pages/Home"
import { Services } from "@/pages/Services"
import { Partners } from "@/pages/Partners"
import { About } from "@/pages/About"
import { Contact } from "@/pages/Contact"
import { DutyCalculator } from "@/pages/DutyCalculator"
import { NotFound } from "@/pages/NotFound"

// Staff portal, mirrored from the reference project. Plain JSX on the
// @rfdtech/components design system, deliberately outside RootLayout so the
// public site's navbar and footer never appear over it.
import { Seo } from "@/components/Seo"
import Login from "@/pages/login/Login"
import Dashboard from "@/pages/dashboard/Dashboard"
import ManagerDashboard from "@/pages/dashboard/ManagerDashboard"
import Finance from "@/pages/dashboard/Finance"

export default function App() {
  return (
    <BrowserRouter>
      {/* Outside <Routes> so it also covers the portal pages, which sit outside
          RootLayout and must be served noindex. */}
      <Seo />
      <Routes>
        <Route element={<RootLayout />}>
          <Route index element={<Home />} />
          <Route path="/services" element={<Services />} />
          <Route path="/partners" element={<Partners />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/duty-calculator" element={<DutyCalculator />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/manager-dashboard" element={<ManagerDashboard />} />
        <Route path="/finance" element={<Finance />} />
      </Routes>
    </BrowserRouter>
  )
}
