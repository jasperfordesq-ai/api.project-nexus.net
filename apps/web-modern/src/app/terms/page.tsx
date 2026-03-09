// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

"use client";

import { motion } from "framer-motion";
import { Navbar } from "@/components/navbar";
import { GlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";

export default function TermsPage() {
  const { user, logout } = useAuth();

  const sections = [
    {
      title: "1. Acceptance of Terms",
      content:
        "By accessing and using Project NEXUS, you agree to be bound by these Terms of Service. If you do not agree to these terms, you must not use the platform.",
    },
    {
      title: "2. Description of Service",
      content:
        "Project NEXUS is a timebanking platform that enables community members to exchange skills and services using time credits. One time credit equals one hour of service, regardless of the type of service provided.",
    },
    {
      title: "3. User Accounts",
      content:
        "You must register for an account to use NEXUS. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must provide accurate and complete information during registration.",
    },
    {
      title: "4. Time Credits",
      content:
        "Time credits are not currency and have no monetary value. They are a unit of exchange within the NEXUS platform. Credits cannot be purchased, sold, or transferred outside the platform. All hours are valued equally — one hour of any service equals one time credit.",
    },
    {
      title: "5. User Conduct",
      content:
        "You agree to use NEXUS respectfully and lawfully. You must not post false or misleading listings, harass other members, use the platform for illegal activities, or attempt to circumvent platform rules. Violations may result in account suspension or termination.",
    },
    {
      title: "6. Content and Listings",
      content:
        "You retain ownership of content you post on NEXUS. By posting, you grant NEXUS a non-exclusive license to display your content on the platform. Listings must accurately describe the services offered or requested. NEXUS reserves the right to remove content that violates these terms.",
    },
    {
      title: "7. Privacy",
      content:
        "Your privacy is important to us. Please review our Privacy Policy, which explains how we collect, use, and protect your personal information. By using NEXUS, you consent to the data practices described in the Privacy Policy.",
    },
    {
      title: "8. Limitation of Liability",
      content:
        "NEXUS facilitates connections between community members but is not responsible for the quality, safety, or legality of services exchanged. Users participate in exchanges at their own risk. NEXUS shall not be liable for any direct, indirect, or consequential damages arising from use of the platform.",
    },
    {
      title: "9. Open Source License",
      content:
        "Project NEXUS is free and open source software, licensed under the GNU Affero General Public License v3 (AGPL-3.0-or-later). The source code is available to all users as required by the license. You may view, modify, and distribute the source code under the terms of the AGPL.",
    },
    {
      title: "10. Changes to Terms",
      content:
        "We may update these terms from time to time. We will notify users of significant changes via the platform. Continued use of NEXUS after changes constitutes acceptance of the updated terms.",
    },
    {
      title: "11. Contact",
      content:
        "If you have questions about these Terms of Service, please contact us through the platform or visit the About page for more information.",
    },
  ];

  return (
    <div className="min-h-screen">
      <Navbar user={user} onLogout={logout} />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-white mb-4">
            Terms of Service
          </h1>
          <p className="text-white/60">
            Last updated: March 2026
          </p>
        </motion.div>

        <div className="space-y-6">
          {sections.map((section, index) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <GlassCard>
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-white mb-3">
                    {section.title}
                  </h2>
                  <p className="text-white/70 leading-relaxed">
                    {section.content}
                  </p>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
