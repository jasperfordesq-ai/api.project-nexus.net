// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Button, Chip } from "@heroui/react";
import { ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { MotionGlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";

export interface ParityAction {
  label: string;
  href: string;
}

interface V15ParityPageProps {
  title: string;
  description: string;
  backHref: string;
  backLabel: string;
  badge?: string;
  actions?: ParityAction[];
  children?: ReactNode;
}

export function V15ParityPage({
  title,
  description,
  backHref,
  backLabel,
  badge,
  actions = [],
  children,
}: V15ParityPageProps) {
  const { user, logout } = useAuth();

  return (
    <ProtectedRoute>
      <div className="min-h-screen">
        <Navbar user={user} onLogout={logout} />
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {backLabel}
          </Link>

          <MotionGlassCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            glow="none"
            padding="lg"
          >
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                {badge && (
                  <Chip
                    size="sm"
                    variant="flat"
                    className="mb-4 bg-indigo-500/20 text-indigo-300"
                  >
                    {badge}
                  </Chip>
                )}
                <h1 className="text-3xl font-bold text-white">{title}</h1>
                <p className="text-white/55 mt-2 max-w-2xl">{description}</p>
              </div>
              {actions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {actions.map((action) => (
                    <Link key={action.href} href={action.href}>
                      <Button className="bg-white/10 text-white hover:bg-white/20">
                        {action.label}
                      </Button>
                    </Link>
                  ))}
                </div>
              )}
            </div>
            {children && <div className="mt-8">{children}</div>}
          </MotionGlassCard>
        </main>
      </div>
    </ProtectedRoute>
  );
}

export function ParityGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{children}</div>;
}

export function ParityStat({
  label,
  value,
  tone = "indigo",
}: {
  label: string;
  value: string;
  tone?: "indigo" | "emerald" | "amber" | "rose";
}) {
  const tones = {
    indigo: "text-indigo-300 bg-indigo-500/10 border-indigo-500/20",
    emerald: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20",
    amber: "text-amber-300 bg-amber-500/10 border-amber-500/20",
    rose: "text-rose-300 bg-rose-500/10 border-rose-500/20",
  };

  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm opacity-75 mt-1">{label}</p>
    </div>
  );
}
