// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Button,
  Avatar,
  Chip,
  Skeleton,
  Select,
  SelectItem,
} from "@heroui/react";
import {
  Award,
  Plus,
  ThumbsUp,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { MotionGlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { logger } from "@/lib/logger";
import { containerVariantsFast, itemVariants } from "@/lib/animations";

interface Skill {
  id: number;
  skill_id: number;
  skill_name: string;
  proficiency: string;
  endorsement_count: number;
}

interface CatalogSkill {
  id: number;
  name: string;
  category: string;
}

interface TopEndorsed {
  user_id: number;
  first_name: string;
  last_name: string;
  total_endorsements: number;
}

const proficiencyColors: Record<string, string> = {
  beginner: "bg-blue-500/20 text-blue-400",
  intermediate: "bg-purple-500/20 text-purple-400",
  advanced: "bg-emerald-500/20 text-emerald-400",
  expert: "bg-yellow-500/20 text-yellow-400",
};

export default function SkillsPage() {
  return (
    <ProtectedRoute>
      <SkillsContent />
    </ProtectedRoute>
  );
}

function SkillsContent() {
  const { user, logout } = useAuth();
  const [mySkills, setMySkills] = useState<Skill[]>([]);
  const [catalog, setCatalog] = useState<CatalogSkill[]>([]);
  const [topEndorsed, setTopEndorsed] = useState<TopEndorsed[]>([]);
  const [selectedSkill, setSelectedSkill] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [skills, cat, top] = await Promise.allSettled([
        api.getUserSkills(user.id),
        api.getSkillCatalog(),
        api.getTopEndorsed(),
      ]);
      if (skills.status === "fulfilled") setMySkills(skills.value || []);
      if (cat.status === "fulfilled") setCatalog(cat.value || []);
      if (top.status === "fulfilled") setTopEndorsed(top.value || []);
    } catch (error) {
      logger.error("Failed to fetch skills:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);
  const handleAddSkill = async () => {
    if (!selectedSkill) return;
    try {
      await api.addMySkill({ skill_id: Number(selectedSkill) });
      setSelectedSkill("");
      fetchData();
    } catch (error) {
      logger.error("Failed to add skill:", error);
    }
  };

  const handleRemoveSkill = async (skillId: number) => {
    try {
      await api.removeMySkill(skillId);
      setMySkills((prev) => prev.filter((s) => s.skill_id !== skillId));
    } catch (error) {
      logger.error("Failed to remove skill:", error);
    }
  };

  const availableSkills = catalog.filter(
    (c) => !mySkills.some((s) => s.skill_id === c.id)
  );

  return (
    <div className="min-h-screen">
      <Navbar user={user} onLogout={logout} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Award className="w-8 h-8 text-indigo-400" />
            Skills & Endorsements
          </h1>
          <p className="text-white/50 mt-1">Showcase your skills and endorse others</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-6 rounded-xl bg-white/5 border border-white/10">
                <Skeleton className="w-3/4 h-5 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <motion.div variants={containerVariantsFast} initial="hidden" animate="visible" className="space-y-6">
            {/* Add Skill */}
            <MotionGlassCard variants={itemVariants} glow="none" padding="lg">
              <h2 className="text-lg font-semibold text-white mb-4">Add a Skill</h2>
              <div className="flex gap-3">
                <Select
                  placeholder="Select a skill"
                  selectedKeys={selectedSkill ? new Set([selectedSkill]) : new Set()}
                  onSelectionChange={(keys) => setSelectedSkill(Array.from(keys)[0] as string)}
                  classNames={{
                    trigger: "bg-white/5 border border-white/10 text-white",
                    value: "text-white",
                    popoverContent: "bg-black/90 border border-white/10",
                  }}
                  className="flex-1"
                >
                  {availableSkills.map((skill) => (
                    <SelectItem key={String(skill.id)} className="text-white">
                      {skill.name} ({skill.category})
                    </SelectItem>
                  ))}
                </Select>
                <Button
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
                  startContent={<Plus className="w-4 h-4" />}
                  onPress={handleAddSkill}
                  isDisabled={!selectedSkill}
                >
                  Add
                </Button>
              </div>
            </MotionGlassCard>

            {/* My Skills */}
            <MotionGlassCard variants={itemVariants} glow="none" padding="lg">
              <h2 className="text-lg font-semibold text-white mb-4">My Skills</h2>
              {mySkills.length > 0 ? (
                <div className="space-y-3">
                  {mySkills.map((skill) => (
                    <div key={skill.skill_id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                      <div className="flex items-center gap-3">
                        <Award className="w-5 h-5 text-indigo-400" />
                        <div>
                          <p className="text-white font-medium">{skill.skill_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Chip size="sm" variant="flat" className={proficiencyColors[skill.proficiency] || "bg-gray-500/20 text-gray-400"}>
                              {skill.proficiency}
                            </Chip>
                            <span className="text-xs text-white/40 flex items-center gap-1">
                              <ThumbsUp className="w-3 h-3" /> {skill.endorsement_count} endorsements
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button size="sm" variant="light" className="text-red-400" onPress={() => handleRemoveSkill(skill.skill_id)}>
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-white/50 text-center py-4">No skills added yet</p>
              )}
            </MotionGlassCard>

            {/* Top Endorsed */}
            <MotionGlassCard variants={itemVariants} glow="none" padding="lg">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                Most Endorsed Members
              </h2>
              <div className="space-y-3">
                {topEndorsed.slice(0, 10).map((member, i) => (
                  <Link key={member.user_id} href={`/members/${member.user_id}`}>
                    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                      <span className="text-sm font-bold text-white/40 w-6">{i + 1}</span>
                      <Avatar name={`${member.first_name} ${member.last_name}`} size="sm" className="ring-2 ring-white/10" />
                      <p className="text-white font-medium flex-1">{member.first_name} {member.last_name}</p>
                      <span className="text-sm text-indigo-400">{member.total_endorsements} endorsements</span>
                    </div>
                  </Link>
                ))}
              </div>
            </MotionGlassCard>
          </motion.div>
        )}
      </div>
    </div>
  );
}
