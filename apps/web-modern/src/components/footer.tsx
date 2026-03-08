// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import Link from "next/link";
import { Github, ExternalLink } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full border-t border-white/10 bg-black/20 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Creator and License Info */}
          <div className="text-center md:text-left">
            <p className="text-white/70 text-sm">
              <span className="font-semibold text-white">Created by Jasper Ford</span>
              <span className="mx-2">·</span>
              <span>Co-founded with Mary Casey</span>
            </p>
            <p className="text-white/50 text-xs mt-1">
              Licensed under{" "}
              <a
                href="https://www.gnu.org/licenses/agpl-3.0.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                GNU AGPL v3
              </a>
            </p>
          </div>

          {/* Links */}
          <div className="flex items-center justify-center gap-6 text-sm">
            <Link
              href="/about"
              className="text-white/60 hover:text-white transition-colors"
            >
              About
            </Link>
            <Link
              href="/privacy"
              className="text-white/60 hover:text-white transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="text-white/60 hover:text-white transition-colors"
            >
              Terms
            </Link>
            <a
              href="https://github.com/jasperfordesq-ai/api.project-nexus.net"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-white/60 hover:text-white transition-colors"
            >
              <Github className="w-4 h-4" />
              <span>Source</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-4 pt-4 border-t border-white/5 text-center">
          <p className="text-white/40 text-xs">
            © 2024–2026 Jasper Ford. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
