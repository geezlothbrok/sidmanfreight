import { BrowserRouter, Route, Routes } from "react-router-dom"

import { RootLayout } from "@/components/layout/RootLayout"
import { Home } from "@/pages/Home"
import { Services } from "@/pages/Services"
import { About } from "@/pages/About"
import { Contact } from "@/pages/Contact"
import { NotFound } from "@/pages/NotFound"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<RootLayout />}>
          <Route index element={<Home />} />
          <Route path="/services" element={<Services />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
