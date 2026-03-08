// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/*
 * IMPORTANT — Branding disclaimer:
 * This application uses the @govie-ds/react and @govie-ds/theme-govie
 * open-source packages as a UI foundation. It is NOT affiliated with,
 * endorsed by, or operated by the Government of Ireland or any Irish
 * state agency. See BRANDING.md for the full disclaimer.
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// GOV.IE Design System theme — provides CSS custom properties (colours, spacing, typography).
// We override primary colours in src/styles/main.css to distinguish Nexus Community
// from any official government service.
import '@govie-ds/theme-govie/theme.css'

// Lato font (bundled via @fontsource — no external CDN required)
import '@fontsource/lato/400.css'
import '@fontsource/lato/700.css'

// Application styles (Nexus Community brand overrides + layout utilities)
import './styles/main.css'

import App from './App'

const root = document.getElementById('root')
if (!root) throw new Error('Root element #root not found in index.html')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
