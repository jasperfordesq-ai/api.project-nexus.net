"use client";

import { Button } from "@heroui/react";
import { motion } from "framer-motion";
import { ArrowRight, Clock, Users, Zap, Sparkles } from "lucide-react";
import Link from "next/link";

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const features = [
  {
    icon: Clock,
    title: "Time Credits",
    description: "Exchange skills using time as currency",
  },
  {
    icon: Users,
    title: "Community",
    description: "Connect with local service providers",
  },
  {
    icon: Zap,
    title: "Instant",
    description: "Quick and seamless transactions",
  },
];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-32">
      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl animate-pulse" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center"
          initial="initial"
          animate="animate"
          variants={staggerContainer}
        >
          {/* Badge */}
          <motion.div variants={fadeInUp} className="mb-6">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-white/70">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>The Future of Time Banking</span>
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={fadeInUp}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight"
          >
            <span className="text-white">Exchange Skills,</span>
            <br />
            <span className="text-gradient">Build Community</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            variants={fadeInUp}
            className="mt-6 text-lg sm:text-xl text-white/60 max-w-2xl mx-auto"
          >
            NEXUS is a modern time banking platform where every hour of service
            is valued equally. Trade your skills, earn time credits, and connect
            with your community.
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={fadeInUp}
            className="mt-10 flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link href="/register">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 text-white font-semibold px-8 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-shadow"
                endContent={<ArrowRight className="w-5 h-5" />}
              >
                Get Started Free
              </Button>
            </Link>
            <Link href="/about">
              <Button
                size="lg"
                variant="bordered"
                className="w-full sm:w-auto border-white/20 text-white hover:bg-white/10"
              >
                Learn More
              </Button>
            </Link>
          </motion.div>

          {/* Feature Pills */}
          <motion.div
            variants={fadeInUp}
            className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto"
          >
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
                  <feature.icon className="w-5 h-5 text-indigo-400" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-white">{feature.title}</p>
                  <p className="text-sm text-white/50">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Stats Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-24 grid grid-cols-2 sm:grid-cols-4 gap-8"
        >
          {[
            { value: "10K+", label: "Active Users" },
            { value: "50K+", label: "Hours Exchanged" },
            { value: "500+", label: "Skills Listed" },
            { value: "98%", label: "Satisfaction Rate" },
          ].map((stat, index) => (
            <div key={stat.label} className="text-center">
              <motion.p
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.9 + index * 0.1 }}
                className="text-3xl sm:text-4xl font-bold text-gradient"
              >
                {stat.value}
              </motion.p>
              <p className="mt-1 text-sm text-white/50">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
