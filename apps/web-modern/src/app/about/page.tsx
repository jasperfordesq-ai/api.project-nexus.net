// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

"use client";

import { Card, CardBody, CardHeader, Divider, Link } from "@heroui/react";
import { motion } from "framer-motion";
import {
  Heart,
  Users,
  Scale,
  Github,
  ExternalLink,
  Award,
  Building2,
  UserPlus,
} from "lucide-react";
import {
  getContributorGroups,
  getResearchFoundation,
} from "@/lib/contributors";
import { Navbar } from "@/components/navbar";
import { useAuth } from "@/contexts/auth-context";

/**
 * About page displaying all contributors from contributors.json.
 * Per NOTICE requirements, ALL contributors must be displayed here.
 */
export default function AboutPage() {
  const { user, logout } = useAuth();
  const groups = getContributorGroups();
  const researchFoundation = getResearchFoundation();

  // Filter acknowledgements to exclude research foundation (shown separately)
  const otherAcknowledgements = groups.acknowledgements.filter(
    (a) => a.role !== "Research Foundation"
  );

  return (
    <>
      <Navbar user={user} onLogout={logout} />
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-white mb-4">
              About Project NEXUS
            </h1>
            <p className="text-xl text-white/70">
              A timebanking platform for community exchange
            </p>
          </div>

          {/* Creator Section */}
          <Card className="bg-white/5 backdrop-blur-xl border border-white/10 mb-8">
            <CardHeader className="flex gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/20">
                <Heart className="w-6 h-6 text-indigo-400" />
              </div>
              <div className="flex flex-col">
                <p className="text-lg font-semibold text-white">Created By</p>
              </div>
            </CardHeader>
            <Divider className="bg-white/10" />
            <CardBody>
              {groups.creator ? (
                <p className="text-white/80 text-lg">
                  This software was created by{" "}
                  <span className="font-semibold text-white">
                    {groups.creator.name}
                  </span>
                  .
                </p>
              ) : (
                <p className="text-white/60 text-lg">
                  Creator information unavailable.
                </p>
              )}
            </CardBody>
          </Card>

          {/* Founders Section */}
          <Card className="bg-white/5 backdrop-blur-xl border border-white/10 mb-8">
            <CardHeader className="flex gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Users className="w-6 h-6 text-purple-400" />
              </div>
              <div className="flex flex-col">
                <p className="text-lg font-semibold text-white">
                  Originating Time Bank Founders
                </p>
              </div>
            </CardHeader>
            <Divider className="bg-white/10" />
            <CardBody>
              <p className="text-white/80 text-lg">
                The originating Irish timebank initiative hOUR Timebank CLC was co-founded by:
              </p>
              {groups.founders.length > 0 ? (
                <ul className="list-disc list-inside mt-4 space-y-2 text-white/80">
                  {/* Include creator as founder if type is creator */}
                  {groups.creator && (
                    <li className="text-lg">
                      <span className="font-semibold text-white">
                        {groups.creator.name}
                      </span>
                    </li>
                  )}
                  {groups.founders.map((founder) => (
                    <li key={founder.name} className="text-lg">
                      <span className="font-semibold text-white">
                        {founder.name}
                      </span>
                      {founder.note && (
                        <span className="text-white/60 text-sm ml-2">
                          ({founder.note})
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-white/60 mt-4">
                  Founder information unavailable.
                </p>
              )}
            </CardBody>
          </Card>

          {/* Contributors Section */}
          <Card className="bg-white/5 backdrop-blur-xl border border-white/10 mb-8">
            <CardHeader className="flex gap-3">
              <div className="p-2 rounded-lg bg-teal-500/20">
                <UserPlus className="w-6 h-6 text-teal-400" />
              </div>
              <div className="flex flex-col">
                <p className="text-lg font-semibold text-white">Contributors</p>
              </div>
            </CardHeader>
            <Divider className="bg-white/10" />
            <CardBody>
              {groups.contributors.length > 0 ? (
                <ul className="space-y-3 text-white/80">
                  {groups.contributors.map((contributor) => (
                    <li key={contributor.name} className="text-lg">
                      <span className="font-semibold text-white">
                        {contributor.name}
                      </span>{" "}
                      - {contributor.role}
                      {contributor.note && (
                        <span className="text-white/60 text-sm block ml-4">
                          {contributor.note}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-white/60">
                  Contributors list unavailable.
                </p>
              )}
            </CardBody>
          </Card>

          {/* Research Foundation Section */}
          <Card className="bg-white/5 backdrop-blur-xl border border-white/10 mb-8">
            <CardHeader className="flex gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <Building2 className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="flex flex-col">
                <p className="text-lg font-semibold text-white">
                  Research Foundation
                </p>
              </div>
            </CardHeader>
            <Divider className="bg-white/10" />
            <CardBody>
              {researchFoundation ? (
                <p className="text-white/80 text-lg">
                  {researchFoundation.note ||
                    `This software is informed by and builds upon work by the ${researchFoundation.name}.`}
                </p>
              ) : (
                <p className="text-white/80 text-lg">
                  This software is informed by and builds upon a social impact
                  study commissioned by the{" "}
                  <span className="font-semibold text-white">
                    West Cork Development Partnership
                  </span>
                  .
                </p>
              )}
            </CardBody>
          </Card>

          {/* Acknowledgements Section */}
          <Card className="bg-white/5 backdrop-blur-xl border border-white/10 mb-8">
            <CardHeader className="flex gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <Award className="w-6 h-6 text-amber-400" />
              </div>
              <div className="flex flex-col">
                <p className="text-lg font-semibold text-white">
                  Acknowledgements
                </p>
              </div>
            </CardHeader>
            <Divider className="bg-white/10" />
            <CardBody>
              {otherAcknowledgements.length > 0 ? (
                <ul className="space-y-3 text-white/80">
                  {otherAcknowledgements.map((ack) => (
                    <li key={ack.name} className="text-lg">
                      <span className="font-semibold text-white">
                        {ack.name}
                      </span>
                      {ack.role && ack.role !== "Acknowledgement" && (
                        <span>, {ack.role}</span>
                      )}
                      {ack.note && (
                        <span className="text-white/60 text-sm block ml-4">
                          {ack.note}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-white/60">
                  Acknowledgements list unavailable.
                </p>
              )}
            </CardBody>
          </Card>

          {/* License Section */}
          <Card className="bg-white/5 backdrop-blur-xl border border-white/10 mb-8">
            <CardHeader className="flex gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/20">
                <Scale className="w-6 h-6 text-cyan-400" />
              </div>
              <div className="flex flex-col">
                <p className="text-lg font-semibold text-white">License</p>
              </div>
            </CardHeader>
            <Divider className="bg-white/10" />
            <CardBody>
              <p className="text-white/80 text-lg mb-4">
                This software is licensed under the{" "}
                <span className="font-semibold text-white">
                  GNU Affero General Public License version 3
                </span>{" "}
                or (at your option) any later version.
              </p>
              <p className="text-white/60 text-sm">
                The AGPL is a copyleft license that requires anyone who
                distributes or runs this software over a network to make the
                source code available to users.
              </p>
            </CardBody>
          </Card>

          {/* Source Code Section */}
          <Card className="bg-white/5 backdrop-blur-xl border border-white/10 mb-8">
            <CardHeader className="flex gap-3">
              <div className="p-2 rounded-lg bg-pink-500/20">
                <Github className="w-6 h-6 text-pink-400" />
              </div>
              <div className="flex flex-col">
                <p className="text-lg font-semibold text-white">Source Code</p>
              </div>
            </CardHeader>
            <Divider className="bg-white/10" />
            <CardBody>
              <p className="text-white/80 text-lg mb-4">
                In compliance with the AGPL license, the complete source code
                for this software is available at:
              </p>
              <Link
                href="https://github.com/jasperfordesq-ai/api.project-nexus.net"
                target="_blank"
                className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-lg"
              >
                <Github className="w-5 h-5" />
                github.com/jasperfordesq-ai/api.project-nexus.net
                <ExternalLink className="w-4 h-4" />
              </Link>
            </CardBody>
          </Card>

          {/* Copyright Notice */}
          <div className="text-center text-white/50 mt-12">
            <p>Copyright © 2024–2026 Jasper Ford</p>
            <p className="mt-2 text-sm">
              See NOTICE file for full attribution and acknowledgements.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
    </>
  );
}
