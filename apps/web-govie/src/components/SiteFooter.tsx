// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later

/*
 * SiteFooter — Nexus Community custom footer
 *
 * Intentionally excludes all government logos, state emblems, and official
 * Irish government identifiers. See BRANDING.md for the full disclaimer.
 */

import { Link } from 'react-router-dom'

const APP_VERSION = import.meta.env.VITE_APP_VERSION || '0.1.0'

export function SiteFooter() {
  return (
    <footer className="nexus-footer" aria-label="Site footer">
      <div className="nexus-footer__inner">
        <div className="nexus-footer__grid">
          <div>
            <p className="nexus-footer__heading">About</p>
            <ul className="nexus-footer__links">
              <li><Link className="nexus-footer__link" to="/about">About Nexus</Link></li>
              <li><Link className="nexus-footer__link" to="/how-it-works">How it works</Link></li>
              <li><Link className="nexus-footer__link" to="/faq">FAQ</Link></li>
            </ul>
          </div>

          <div>
            <p className="nexus-footer__heading">Services</p>
            <ul className="nexus-footer__links">
              <li><Link className="nexus-footer__link" to="/services">Browse services</Link></li>
              <li><Link className="nexus-footer__link" to="/services/submit">Offer a service</Link></li>
              <li><Link className="nexus-footer__link" to="/services?type=request">Find help</Link></li>
            </ul>
          </div>

          <div>
            <p className="nexus-footer__heading">Account</p>
            <ul className="nexus-footer__links">
              <li><Link className="nexus-footer__link" to="/login">Sign in</Link></li>
              <li><Link className="nexus-footer__link" to="/register">Join the community</Link></li>
              <li><Link className="nexus-footer__link" to="/profile">My profile</Link></li>
            </ul>
          </div>

          <div>
            <p className="nexus-footer__heading">Legal</p>
            <ul className="nexus-footer__links">
              <li><Link className="nexus-footer__link" to="/legal/privacy">Privacy policy</Link></li>
              <li><Link className="nexus-footer__link" to="/legal/terms">Terms of use</Link></li>
              <li><Link className="nexus-footer__link" to="/legal/cookies">Cookie policy</Link></li>
            </ul>
          </div>
        </div>

        <div className="nexus-footer__bottom">
          {/*
           * Non-affiliation disclaimer — MANDATORY.
           * This block MUST be present in all deployed instances.
           * See BRANDING.md and NOTICE for attribution requirements.
           */}
          <p className="nexus-footer__disclaimer">
            <strong>Nexus Community is not a government service.</strong> This platform is operated
            independently and is not affiliated with, endorsed by, or operated by the Government of
            Ireland or any Irish state agency. It uses the publicly available
            GOV.IE Design System open-source packages solely as a UI foundation.
            Source code is available under the{' '}
            <a
              href="https://www.gnu.org/licenses/agpl-3.0.html"
              className="nexus-footer__link"
              target="_blank"
              rel="noopener noreferrer"
            >
              AGPL v3 licence
            </a>
            .
          </p>

          <p className="nexus-footer__meta">
            © {new Date().getFullYear()} Jasper Ford. Licensed under AGPL-3.0-or-later.
            &nbsp;·&nbsp; v{APP_VERSION}
          </p>
        </div>
      </div>
    </footer>
  )
}
