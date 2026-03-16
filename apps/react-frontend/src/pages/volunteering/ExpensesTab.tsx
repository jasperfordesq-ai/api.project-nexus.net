// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * ExpensesTab - View and submit volunteer expense claims
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Button,
  Chip,
  Input,
  Select,
  SelectItem,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Textarea,
} from '@heroui/react';
import {
  Receipt,
  Plus,
  AlertTriangle,
  Calendar,
  Car,
  UtensilsCrossed,
  Package,
  Wrench,
  ParkingCircle,
  MoreHorizontal,
} from 'lucide-react';
import { GlassCard } from '@/components/ui';
import { EmptyState } from '@/components/feedback';
import { useToast } from '@/contexts';
import { api } from '@/lib/api';
import { logError } from '@/lib/logger';

/* ───────────────────────── Types ───────────────────────── */

type ExpenseType = 'travel' | 'meals' | 'supplies' | 'equipment' | 'parking' | 'other';
type ExpenseStatus = 'pending' | 'approved' | 'rejected' | 'paid';

interface Expense {
  id: number;
  expense_type: ExpenseType;
  amount: string;
  currency: string;
  description: string;
  status: ExpenseStatus;
  submitted_at: string;
  reviewed_at: string | null;
  review_notes: string | null;
  paid_at: string | null;
  payment_reference: string | null;
}

const EXPENSE_TYPE_OPTIONS: { key: ExpenseType; label: string; icon: React.ReactNode }[] = [
  { key: 'travel', label: 'Travel', icon: <Car className="w-4 h-4" /> },
  { key: 'meals', label: 'Meals', icon: <UtensilsCrossed className="w-4 h-4" /> },
  { key: 'supplies', label: 'Supplies', icon: <Package className="w-4 h-4" /> },
  { key: 'equipment', label: 'Equipment', icon: <Wrench className="w-4 h-4" /> },
  { key: 'parking', label: 'Parking', icon: <ParkingCircle className="w-4 h-4" /> },
  { key: 'other', label: 'Other', icon: <MoreHorizontal className="w-4 h-4" /> },
];

const STATUS_COLOR: Record<ExpenseStatus, 'warning' | 'success' | 'danger' | 'primary'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  paid: 'primary',
};

/* ───────────────────────── Component ───────────────────────── */

export function ExpensesTab() {
  const toast = useToast();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [items, setItems] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formType, setFormType] = useState<ExpenseType>('travel');
  const [formAmount, setFormAmount] = useState('');
  const [formCurrency, setFormCurrency] = useState('EUR');
  const [formDescription, setFormDescription] = useState('');

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get<{ items: Expense[]; cursor?: string; has_more: boolean }>(
        '/v2/volunteering/expenses'
      );
      if (response.success && response.data) {
        const data = response.data;
        setItems(Array.isArray(data.items) ? data.items : []);
      } else {
        setError('Unable to load expenses. Please try again.');
      }
    } catch (err) {
      logError('Failed to load expenses', err);
      setError('Unable to load expenses. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const sum = (filter?: (e: Expense) => boolean) =>
      items
        .filter(filter ?? (() => true))
        .reduce((acc, e) => acc + parseFloat(e.amount || '0'), 0);
    return {
      claimed: sum(),
      approved: sum((e) => e.status === 'approved' || e.status === 'paid'),
      paid: sum((e) => e.status === 'paid'),
    };
  }, [items]);

  const resetForm = () => {
    setFormType('travel');
    setFormAmount('');
    setFormCurrency('EUR');
    setFormDescription('');
  };

  const handleSubmit = async (onClose: () => void) => {
    if (!formAmount || !formDescription) {
      toast.error('Please fill in all required fields.');
      return;
    }
    try {
      setIsSubmitting(true);
      const response = await api.post('/v2/volunteering/expenses', {
        expense_type: formType,
        amount: parseFloat(formAmount),
        currency: formCurrency,
        description: formDescription,
      });
      if (response.success) {
        toast.success('Expense submitted successfully.');
        resetForm();
        onClose();
        load();
      } else {
        toast.error('Failed to submit expense.');
      }
    } catch (err) {
      logError('Failed to submit expense', err);
      toast.error('Failed to submit expense.');
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

  const fmt = (val: number) =>
    val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="w-5 h-5 text-emerald-400" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-theme-primary">My Expenses</h2>
        </div>
        <Button
          size="sm"
          className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
          startContent={<Plus className="w-4 h-4" aria-hidden="true" />}
          onPress={onOpen}
        >
          Submit Expense
        </Button>
      </div>

      {/* Stats */}
      {!error && !isLoading && items.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Claimed', value: stats.claimed, color: 'text-theme-primary' },
            { label: 'Approved', value: stats.approved, color: 'text-emerald-500' },
            { label: 'Paid', value: stats.paid, color: 'text-blue-500' },
          ].map((s) => (
            <GlassCard key={s.label} className="p-3 text-center">
              <p className="text-xs text-theme-muted">{s.label}</p>
              <p className={`text-lg font-bold ${s.color}`}>{fmt(s.value)}</p>
            </GlassCard>
          ))}
        </div>
      )}

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
      {!error && !isLoading && items.length === 0 && (
        <EmptyState
          icon={<Receipt className="w-12 h-12" aria-hidden="true" />}
          title="No expenses yet"
          description="You have not submitted any expense claims. Click Submit Expense to get started."
        />
      )}

      {/* Expense List */}
      {!error && !isLoading && items.length > 0 && (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-3">
          {items.map((expense) => (
            <motion.div key={expense.id} variants={itemVariants}>
              <GlassCard className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Chip size="sm" variant="flat" color="default">
                        {expense.expense_type}
                      </Chip>
                      <span className="font-bold text-theme-primary text-lg">
                        {expense.currency} {fmt(parseFloat(expense.amount || '0'))}
                      </span>
                    </div>
                    <p className="text-sm text-theme-secondary mb-1">{expense.description}</p>
                    <div className="flex items-center gap-1 text-xs text-theme-subtle">
                      <Calendar className="w-3 h-3" aria-hidden="true" />
                      {new Date(expense.submitted_at).toLocaleDateString()}
                    </div>
                    {expense.review_notes && (
                      <p className="text-xs text-theme-subtle mt-1 italic">
                        Note: {expense.review_notes}
                      </p>
                    )}
                  </div>
                  <Chip size="sm" variant="flat" color={STATUS_COLOR[expense.status]}>
                    {expense.status}
                  </Chip>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Submit Modal */}
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
              <ModalHeader className="text-theme-primary">Submit Expense</ModalHeader>
              <ModalBody className="gap-4">
                <Select
                  label="Expense Type"
                  selectedKeys={[formType]}
                  onSelectionChange={(keys) => {
                    const val = Array.from(keys)[0] as ExpenseType;
                    if (val) setFormType(val);
                  }}
                  variant="bordered"
                >
                  {EXPENSE_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.key} startContent={opt.icon}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </Select>
                <div className="flex gap-3">
                  <Input
                    label="Amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formAmount}
                    onValueChange={setFormAmount}
                    variant="bordered"
                    className="flex-1"
                    isRequired
                  />
                  <Input
                    label="Currency"
                    value={formCurrency}
                    onValueChange={setFormCurrency}
                    variant="bordered"
                    className="w-24"
                  />
                </div>
                <Textarea
                  label="Description"
                  value={formDescription}
                  onValueChange={setFormDescription}
                  variant="bordered"
                  minRows={2}
                  maxRows={4}
                  isRequired
                />
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onClose}>Cancel</Button>
                <Button
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
                  onPress={() => handleSubmit(onClose)}
                  isLoading={isSubmitting}
                >
                  Submit
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}

export default ExpensesTab;
