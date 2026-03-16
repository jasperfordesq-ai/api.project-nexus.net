// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * DonationsTab - Active giving days with progress and donation history
 */

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Button,
  Chip,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Textarea,
  Progress,
} from '@heroui/react';
import {
  Heart,
  Calendar,
  Users,
  CreditCard,
  AlertTriangle,
  RefreshCw,
  Plus,
  DollarSign,
  EyeOff,
} from 'lucide-react';
import { GlassCard } from '@/components/ui';
import { EmptyState } from '@/components/feedback';
import { api } from '@/lib/api';
import { logError } from '@/lib/logger';
import { useToast } from '@/contexts/ToastContext';

/* ───────────────────────── Types ───────────────────────── */

interface GivingDay {
  id: number;
  title: string;
  description: string;
  goal_amount: number;
  raised_amount: number;
  donor_count: number;
  starts_at: string;
  ends_at: string;
  status: 'active' | 'upcoming' | 'ended';
}

interface GivingDayStats {
  total_raised: number;
  total_donors: number;
  active_campaigns: number;
}

interface Donation {
  id: number;
  amount: number;
  payment_method: string;
  message: string | null;
  anonymous: boolean;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  giving_day_title: string;
  created_at: string;
}

interface DonationForm {
  giving_day_id: number | null;
  amount: string;
  payment_method: string;
  message: string;
  anonymous: boolean;
}

/* ───────────────────────── Constants ───────────────────────── */

const PAYMENT_METHODS = ['card', 'bank_transfer', 'paypal'];

const STATUS_COLOR: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  completed: 'success',
  pending: 'warning',
  failed: 'danger',
  refunded: 'default',
};

/* ───────────────────────── Component ───────────────────────── */

export function DonationsTab() {
  const [givingDays, setGivingDays] = useState<GivingDay[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [, setStats] = useState<GivingDayStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const { success: toastSuccess, error: toastError } = useToast();

  const [form, setForm] = useState<DonationForm>({
    giving_day_id: null,
    amount: '',
    payment_method: 'card',
    message: '',
    anonymous: false,
  });

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [daysRes, donationsRes, statsRes] = await Promise.all([
        api.get<GivingDay[]>('/v2/volunteering/giving-days'),
        api.get<Donation[]>('/v2/volunteering/donations'),
        api.get<GivingDayStats>('/v2/volunteering/giving-days/stats'),
      ]);

      if (daysRes.success && daysRes.data) {
        const items = Array.isArray(daysRes.data) ? daysRes.data : [];
        setGivingDays(items);
      }
      if (donationsRes.success && donationsRes.data) {
        const items = Array.isArray(donationsRes.data) ? donationsRes.data : [];
        setDonations(items);
      }
      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data as GivingDayStats);
      }
    } catch (err) {
      logError('Failed to load donations data', err);
      setError('Unable to load donations data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openDonateModal = (dayId?: number) => {
    setForm({
      giving_day_id: dayId ?? null,
      amount: '',
      payment_method: 'card',
      message: '',
      anonymous: false,
    });
    onOpen();
  };

  const handleSubmit = async (onClose: () => void) => {
    if (!form.amount || parseFloat(form.amount) <= 0) {
      toastError('Please enter a valid amount.');
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await api.post('/v2/volunteering/donations', {
        giving_day_id: form.giving_day_id,
        amount: parseFloat(form.amount),
        payment_method: form.payment_method,
        message: form.message || null,
        anonymous: form.anonymous,
      });

      if (response.success) {
        toastSuccess('Donation recorded!');
        onClose();
        load();
      } else {
        toastError(response.error || 'Failed to record donation.');
      }
    } catch (err) {
      logError('Failed to submit donation', err);
      toastError('Failed to record donation. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-rose-400" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-theme-primary">Donations</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="flat"
            className="bg-theme-elevated text-theme-muted"
            startContent={<RefreshCw className="w-4 h-4" aria-hidden="true" />}
            onPress={load}
            isDisabled={isLoading}
          >
            Refresh
          </Button>
          <Button
            size="sm"
            className="bg-gradient-to-r from-rose-500 to-pink-600 text-white"
            startContent={<Plus className="w-4 h-4" aria-hidden="true" />}
            onPress={() => openDonateModal()}
          >
            Donate
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && !isLoading && (
        <GlassCard className="p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" aria-hidden="true" />
          <p className="text-theme-muted mb-4">{error}</p>
          <Button className="bg-gradient-to-r from-rose-500 to-pink-600 text-white" onPress={load}>
            Try Again
          </Button>
        </GlassCard>
      )}

      {/* Loading */}
      {!error && isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <GlassCard key={i} className="p-5 animate-pulse">
              <div className="h-5 bg-theme-hover rounded w-1/3 mb-3" />
              <div className="h-3 bg-theme-hover rounded w-2/3 mb-3" />
              <div className="h-3 bg-theme-hover rounded w-1/4" />
            </GlassCard>
          ))}
        </div>
      )}

      {/* Empty */}
      {!error && !isLoading && givingDays.length === 0 && donations.length === 0 && (
        <EmptyState
          icon={<Heart className="w-12 h-12" aria-hidden="true" />}
          title="No giving days or donations"
          description="When a giving day is active, you can make donations to support your community."
          action={
            <Button
              className="bg-gradient-to-r from-rose-500 to-pink-600 text-white"
              onPress={() => openDonateModal()}
            >
              Make a Donation
            </Button>
          }
        />
      )}

      {/* Active Giving Days */}
      {!error && !isLoading && givingDays.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-theme-secondary uppercase tracking-wide">
            Active Giving Days
          </h3>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            {givingDays.map((day) => {
              const pct = day.goal_amount > 0 ? Math.min(100, (day.raised_amount / day.goal_amount) * 100) : 0;
              return (
                <motion.div key={day.id} variants={itemVariants}>
                  <GlassCard className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-theme-primary text-lg">{day.title}</h4>
                          <Chip size="sm" color={day.status === 'active' ? 'success' : 'default'} variant="flat">
                            {day.status}
                          </Chip>
                        </div>
                        {day.description && (
                          <p className="text-sm text-theme-muted mb-3 line-clamp-2">{day.description}</p>
                        )}
                        <Progress
                          size="md"
                          value={pct}
                          color="success"
                          className="mb-2"
                          aria-label={`Progress: ${Math.round(pct)}%`}
                        />
                        <div className="flex flex-wrap items-center gap-3 text-xs text-theme-subtle">
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" aria-hidden="true" />
                            {day.raised_amount.toLocaleString()} / {day.goal_amount.toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" aria-hidden="true" />
                            {day.donor_count} donors
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" aria-hidden="true" />
                            {new Date(day.ends_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="bg-gradient-to-r from-rose-500 to-pink-600 text-white flex-shrink-0"
                        startContent={<Heart className="w-4 h-4" aria-hidden="true" />}
                        onPress={() => openDonateModal(day.id)}
                      >
                        Donate
                      </Button>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      )}

      {/* My Donations */}
      {!error && !isLoading && donations.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-theme-secondary uppercase tracking-wide">
            My Donations
          </h3>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-3"
          >
            {donations.map((d) => (
              <motion.div key={d.id} variants={itemVariants}>
                <GlassCard className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-theme-primary">
                          {d.amount.toLocaleString(undefined, { style: 'currency', currency: 'EUR' })}
                        </span>
                        <Chip size="sm" color={STATUS_COLOR[d.status] || 'default'} variant="flat">
                          {d.status}
                        </Chip>
                        {d.anonymous && (
                          <Chip size="sm" variant="flat" startContent={<EyeOff className="w-3 h-3" />}>
                            Anonymous
                          </Chip>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-theme-subtle">
                        <span>{d.giving_day_title}</span>
                        <span className="flex items-center gap-1">
                          <CreditCard className="w-3 h-3" aria-hidden="true" />
                          {d.payment_method.replace('_', ' ')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" aria-hidden="true" />
                          {new Date(d.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {d.message && (
                        <p className="text-xs text-theme-muted mt-1 line-clamp-1">{d.message}</p>
                      )}
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}

      {/* Donate Modal */}
      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        classNames={{
          base: 'bg-content1 border border-theme-default',
          header: 'border-b border-theme-default',
          footer: 'border-t border-theme-default',
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="text-theme-primary">Make a Donation</ModalHeader>
              <ModalBody className="gap-4">
                <Input
                  label="Amount"
                  type="number"
                  min="1"
                  step="0.01"
                  variant="bordered"
                  value={form.amount}
                  onValueChange={(v) => setForm((f) => ({ ...f, amount: v }))}
                  startContent={<DollarSign className="w-4 h-4 text-theme-subtle" />}
                  isRequired
                />
                <div className="flex flex-wrap gap-2">
                  {PAYMENT_METHODS.map((pm) => (
                    <Chip
                      key={pm}
                      variant={form.payment_method === pm ? 'solid' : 'flat'}
                      color={form.payment_method === pm ? 'primary' : 'default'}
                      className="cursor-pointer"
                      onClick={() => setForm((f) => ({ ...f, payment_method: pm }))}
                    >
                      {pm.replace('_', ' ')}
                    </Chip>
                  ))}
                </div>
                <Textarea
                  label="Message (optional)"
                  variant="bordered"
                  value={form.message}
                  onValueChange={(v) => setForm((f) => ({ ...f, message: v }))}
                  maxRows={3}
                />
                <Button
                  variant={form.anonymous ? 'solid' : 'flat'}
                  color={form.anonymous ? 'secondary' : 'default'}
                  size="sm"
                  startContent={<EyeOff className="w-4 h-4" aria-hidden="true" />}
                  onPress={() => setForm((f) => ({ ...f, anonymous: !f.anonymous }))}
                >
                  {form.anonymous ? 'Donating anonymously' : 'Donate anonymously'}
                </Button>
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onClose}>Cancel</Button>
                <Button
                  className="bg-gradient-to-r from-rose-500 to-pink-600 text-white"
                  onPress={() => handleSubmit(onClose)}
                  isLoading={isSubmitting}
                >
                  Confirm Donation
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}

export default DonationsTab;
