// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

"use client";

import { motion } from "framer-motion";
import { Navbar } from "@/components/navbar";
import { HeroSection } from "@/components/hero-section";
import { DashboardGrid } from "@/components/dashboard-grid";
import { Button, Divider } from "@heroui/react";
import { useAuth } from "@/contexts/auth-context";
import { ChevronDown } from "lucide-react";

export default function Home() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <Navbar user={user} onLogout={logout} />

      {/* Hero Section */}
      <HeroSection />

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="flex justify-center pb-8"
      >
        <Button
          variant="light"
          className="text-white/50 hover:text-white animate-bounce"
          onPress={() => {
            document.getElementById("dashboard-preview")?.scrollIntoView({
              behavior: "smooth",
            });
          }}
        >
          <ChevronDown className="w-6 h-6" />
        </Button>
      </motion.div>

      {/* Dashboard Preview Section */}
      <section id="dashboard-preview" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Your Personal Dashboard
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto">
              Track your time credits, manage listings, and connect with your
              community - all in one beautiful interface.
            </p>
          </motion.div>

          {/* Dashboard Grid */}
          <DashboardGrid />
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Divider className="bg-white/10" />
      </div>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="grid md:grid-cols-3 gap-8"
          >
            {[
              {
                title: "Equal Value",
                description:
                  "Every hour is worth the same. Whether you're teaching piano or mowing lawns, your time has equal value.",
                gradient: "from-indigo-500 to-blue-500",
              },
              {
                title: "Build Trust",
                description:
                  "Reviews and ratings help you find reliable service providers and build your reputation in the community.",
                gradient: "from-purple-500 to-pink-500",
              },
              {
                title: "Stay Local",
                description:
                  "Connect with neighbors and strengthen your local community through meaningful skill exchanges.",
                gradient: "from-cyan-500 to-teal-500",
              },
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="relative group"
              >
                <div className="p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 hover:border-white/20 transition-all duration-300">
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-r ${feature.gradient} flex items-center justify-center mb-6`}
                  >
                    <span className="text-2xl font-bold text-white">
                      {index + 1}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-white/60">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
    </div>
  );
}
