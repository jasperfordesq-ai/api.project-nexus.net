// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const fs = require('fs/promises');
const { ApiError, callVolunteeringApi, uploadVolunteerCredential } = require('../lib/api');
const { asyncRoute } = require('../lib/routeHelpers');

const router = express.Router();
const ACCESSIBILITY_NEED_TYPES = [
  { value: 'mobility', label: 'Mobility' },
  { value: 'visual', label: 'Visual or sight' },
  { value: 'hearing', label: 'Hearing' },
  { value: 'cognitive', label: 'Cognitive or learning' },
  { value: 'dietary', label: 'Dietary' },
  { value: 'language', label: 'Language or communication' },
  { value: 'other', label: 'Other' }
];
const CREDENTIAL_TYPES = [
  { value: 'police_check', label: 'Police / background check' },
  { value: 'first_aid', label: 'First aid' },
  { value: 'safeguarding', label: 'Safeguarding' },
  { value: 'dbs', label: 'DBS check' },
  { value: 'driving_licence', label: 'Driving licence' },
  { value: 'other', label: 'Other' }
];
const CREDENTIAL_TYPE_LABELS = Object.fromEntries(CREDENTIAL_TYPES.map((type) => [type.value, type.label]));
const CREDENTIAL_STATUS_LABELS = {
  pending: 'Awaiting review',
  verified: 'Verified',
  rejected: 'Rejected',
  expired: 'Expired'
};
const CREDENTIAL_STATUS_CLASSES = {
  pending: 'govuk-tag--yellow',
  verified: 'govuk-tag--green',
  rejected: 'govuk-tag--red',
  expired: 'govuk-tag--grey'
};
const EXPENSE_TYPES = [
  { value: 'travel', label: 'Travel' },
  { value: 'meals', label: 'Meals' },
  { value: 'supplies', label: 'Supplies' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'parking', label: 'Parking' },
  { value: 'other', label: 'Other' }
];
const EXPENSE_TYPE_LABELS = Object.fromEntries(EXPENSE_TYPES.map((type) => [type.value, type.label]));
const ALERT_PRIORITY_LABELS = {
  normal: 'Normal',
  urgent: 'Urgent',
  critical: 'Critical'
};
const ALERT_PRIORITY_CLASSES = {
  normal: 'govuk-tag--blue',
  urgent: 'govuk-tag--orange',
  critical: 'govuk-tag--red'
};
const GROUP_RESERVATION_STATUS_LABELS = {
  active: 'Active',
  confirmed: 'Confirmed',
  pending: 'Pending',
  cancelled: 'Cancelled'
};
const GROUP_RESERVATION_STATUS_CLASSES = {
  active: 'govuk-tag--green',
  confirmed: 'govuk-tag--green',
  pending: 'govuk-tag--yellow',
  cancelled: 'govuk-tag--grey'
};
const GROUP_MEMBER_STATUS_LABELS = {
  confirmed: 'Confirmed',
  pending: 'Pending',
  declined: 'Declined'
};
const GROUP_MEMBER_STATUS_CLASSES = {
  confirmed: 'govuk-tag--green',
  pending: 'govuk-tag--yellow',
  declined: 'govuk-tag--red'
};

function tokenFrom(req) {
  return req.signedCookies.token || '';
}

function trimmed(value, limit = null) {
  const text = String(value || '').trim();
  return limit === null ? text : text.slice(0, limit);
}

function positiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function decimalNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function checked(value) {
  return value === true || ['1', 'true', 'on', 'yes'].includes(String(value || '').toLowerCase());
}

function stringArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  const single = trimmed(value);
  return single ? [single] : [];
}

function uploadedFile(req, fieldName) {
  const file = req.files && req.files[fieldName];
  return file && typeof file === 'object' ? file : null;
}

async function removeUploadedFile(file) {
  if (!file || !file.filepath) return;
  try {
    await fs.unlink(file.filepath);
  } catch {
    // Temporary upload cleanup is best-effort only.
  }
}

function loginRedirect() {
  return '/login?status=auth-required';
}

function isAuthError(error) {
  return error instanceof ApiError && error.status === 401;
}

function redirectOnAuthError(error, res) {
  if (isAuthError(error)) {
    res.redirect(loginRedirect());
    return true;
  }
  return false;
}

function dataFrom(result) {
  return result && typeof result === 'object' && result.data !== undefined
    ? result.data
    : result;
}

function collectionFrom(result) {
  const data = dataFrom(result);
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
}

function resultId(result) {
  const data = dataFrom(result);
  return data && typeof data === 'object' ? positiveInteger(data.id) : null;
}

async function callApi(token, method, path, data = undefined) {
  if (data === undefined) {
    return callVolunteeringApi(token, method, path);
  }

  return callVolunteeringApi(token, method, path, data);
}

async function runAction(req, res, method, path, data, successRedirect, failureRedirect) {
  const token = tokenFrom(req);
  if (!token) {
    return res.redirect(loginRedirect());
  }

  try {
    const result = await callApi(token, method, path, data);
    const redirect = typeof successRedirect === 'function'
      ? successRedirect(result)
      : successRedirect;
    return res.redirect(redirect);
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    return res.redirect(failureRedirect);
  }
}

function orgManageRedirect(orgId, status) {
  return `/volunteering/organisations/${orgId}/manage?status=${encodeURIComponent(status)}`;
}

function orgWalletRedirect(orgId, status) {
  return `/volunteering/organisations/${orgId}/wallet?status=${encodeURIComponent(status)}`;
}

function orgSettingsRedirect(orgId, status) {
  return `/volunteering/organisations/${orgId}/settings?status=${encodeURIComponent(status)}`;
}

function opportunityRedirect(id, status) {
  return `/volunteering/opportunities/${id}?status=${encodeURIComponent(status)}`;
}

function accessibilityStatus(status) {
  if (status === 'accessibility-saved') {
    return { type: 'success', message: 'Your accessibility needs have been saved.' };
  }
  if (status === 'accessibility-failed') {
    return { type: 'error', message: 'Your accessibility needs could not be saved. Try again.' };
  }
  return null;
}

function dateLabel(value) {
  const text = trimmed(value);
  if (!text) return '';
  const dateOnly = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const date = dateOnly
    ? new Date(Date.UTC(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3])))
    : new Date(text);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(date);
}

function dateTimeLabel(value) {
  const text = trimmed(value);
  if (!text) return '';
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC'
  }).format(date);
}

function hoursLabel(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(1) : '0.0';
}

function monthLabel(value) {
  const text = trimmed(value);
  const match = text.match(/^(\d{4})-(\d{2})$/);
  if (!match) return text;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
  if (Number.isNaN(date.getTime())) return text;

  return new Intl.DateTimeFormat('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(date);
}

function certificateStatus(status) {
  if (status === 'certificate-generated') {
    return { type: 'success', message: 'Your certificate has been generated.' };
  }
  if (status === 'certificate-no-hours') {
    return { type: 'error', message: 'You do not have any approved volunteering hours to certify yet.' };
  }
  return null;
}

function hoursStatus(status) {
  if (status === 'hours-created') {
    return { type: 'success', message: 'Your hours have been submitted for review.' };
  }
  if (status === 'hours-failed') {
    return { type: 'error', message: 'Your hours could not be logged. Check the details and try again.' };
  }
  return null;
}

function wellbeingStatus(status) {
  if (status === 'checkin-saved') {
    return { type: 'success', message: 'Your check-in has been saved.' };
  }
  if (status === 'mood-invalid') {
    return { type: 'error', message: 'Choose a mood between 1 and 5.' };
  }
  if (status === 'checkin-failed') {
    return { type: 'error', message: 'Your check-in could not be saved. Please try again.' };
  }
  return null;
}

function donationStatus(status, donateError = '') {
  if (status === 'donate-recorded') {
    return {
      type: 'success',
      message: 'Thank you. Your donation has been recorded and is awaiting confirmation of payment.'
    };
  }
  if (status === 'donate-failed') {
    const messages = {
      amount: 'Enter a donation amount greater than zero',
      'amount-max': 'Enter a donation amount within the allowed limit',
      validation: 'Check your answers and try again'
    };
    return {
      type: 'error',
      message: messages[donateError] || 'Your donation could not be recorded. Please try again.',
      field: 'donate-amount'
    };
  }
  return null;
}

function emergencyAlertStatus(status) {
  const messages = {
    'alert-accepted': {
      type: 'success',
      message: 'Thank you. You have accepted the shift and the coordinator has been notified.'
    },
    'alert-declined': {
      type: 'success',
      message: 'You have declined the shift request.'
    },
    'alert-respond-failed': {
      type: 'error',
      message: 'Your response could not be recorded. The request may have been filled or expired.'
    }
  };
  return messages[status] || null;
}

function groupSignupStatus(status) {
  const messages = {
    'member-added': {
      type: 'success',
      message: 'The member has been added to the reservation.'
    },
    'member-removed': {
      type: 'success',
      message: 'The member has been removed from the reservation.'
    },
    'reservation-cancelled': {
      type: 'success',
      message: 'The reservation has been cancelled.'
    },
    'member-id-required': {
      type: 'error',
      message: 'Enter a member ID'
    },
    'member-add-failed': {
      type: 'error',
      message: 'The member could not be added. Check that you lead this group and that slots are still available.'
    },
    'member-remove-failed': {
      type: 'error',
      message: 'The member could not be removed. Check that you lead this group.'
    },
    'reservation-cancel-failed': {
      type: 'error',
      message: 'The reservation could not be cancelled. Check that you lead this group.'
    }
  };
  return messages[status] || null;
}

function expenseStatus(status) {
  const messages = {
    'expense-submitted': {
      type: 'success',
      message: 'Your expense claim has been submitted and is awaiting review.'
    },
    'expense-org-required': {
      type: 'error',
      message: 'Choose an organisation',
      field: 'organization_id'
    },
    'expense-amount-invalid': {
      type: 'error',
      message: 'Enter an amount greater than zero',
      field: 'amount'
    },
    'expense-description-required': {
      type: 'error',
      message: 'Enter a description',
      field: 'description'
    },
    'expense-validation': {
      type: 'error',
      message: 'Your claim could not be submitted. Check your answers and any expense limits, then try again.'
    },
    'expense-forbidden': {
      type: 'error',
      message: 'You are not allowed to claim expenses from this organisation.'
    },
    'expense-not-found': {
      type: 'error',
      message: 'That organisation could not be found.'
    },
    'expense-failed': {
      type: 'error',
      message: 'Your claim could not be submitted. Please try again.'
    }
  };
  return messages[status] || null;
}

function credentialStatus(status) {
  const messages = {
    'credential-uploaded': { type: 'success', message: 'Your credential has been uploaded and is awaiting review.' },
    'credential-deleted': { type: 'success', message: 'The credential has been deleted.' },
    'credential-type-required': {
      type: 'error',
      message: 'Select a credential type.',
      field: 'credential_type',
      linkText: 'Select a credential type'
    },
    'credential-file-required': {
      type: 'error',
      message: 'Choose a file to upload.',
      field: 'document',
      linkText: 'Choose a file to upload'
    },
    'credential-file-type': {
      type: 'error',
      message: 'The file must be a PDF, JPG, PNG or WEBP.',
      field: 'document',
      linkText: 'Choose a PDF, JPG, PNG or WEBP file'
    },
    'credential-file-size': {
      type: 'error',
      message: 'The file must be smaller than 10MB.',
      field: 'document',
      linkText: 'Choose a smaller file'
    },
    'credential-upload-failed': {
      type: 'error',
      message: 'The credential could not be uploaded. Please try again.'
    },
    'credential-delete-failed': {
      type: 'error',
      message: 'The credential could not be deleted. Please try again.'
    }
  };
  return messages[status] || null;
}

function headline(value) {
  return trimmed(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function credentialRowsFrom(result) {
  const data = dataFrom(result);
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.credentials)) return data.credentials;
  if (data && Array.isArray(data.items)) return data.items;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
}

function credentialStatusPresentation(status) {
  const value = trimmed(status) || 'pending';
  return {
    value,
    label: CREDENTIAL_STATUS_LABELS[value] || headline(value) || 'Awaiting review',
    className: CREDENTIAL_STATUS_CLASSES[value] || 'govuk-tag--grey'
  };
}

function normalizeHourSummary(result) {
  const summary = dataFrom(result);
  const data = summary && typeof summary === 'object' ? summary : {};
  return {
    approvedHoursLabel: hoursLabel(data.total_approved_hours ?? data.approved_hours ?? data.total_verified),
    pendingHoursLabel: hoursLabel(data.pending_hours ?? data.total_pending),
    thisMonthHoursLabel: hoursLabel(data.this_month_hours),
    approvedTotal: Number(data.total_approved_hours ?? data.approved_hours ?? data.total_verified) || 0,
    byOrganization: Array.isArray(data.by_organization)
      ? data.by_organization.map((row) => ({
        name: trimmed(row?.name),
        hoursLabel: hoursLabel(row?.hours)
      })).filter((row) => row.name)
      : [],
    byMonth: Array.isArray(data.by_month)
      ? data.by_month.map((row) => ({
        monthLabel: monthLabel(row?.month),
        hoursLabel: hoursLabel(row?.hours)
      })).filter((row) => row.monthLabel)
      : []
  };
}

function riskPresentation(value) {
  const risk = ['low', 'moderate', 'high'].includes(trimmed(value)) ? trimmed(value) : 'low';
  const labels = {
    low: 'Low',
    moderate: 'Moderate',
    high: 'High'
  };
  const classNames = {
    low: 'govuk-tag--green',
    moderate: 'govuk-tag--yellow',
    high: 'govuk-tag--red'
  };
  return {
    value: risk,
    label: labels[risk],
    className: classNames[risk]
  };
}

function warningLabel(value) {
  const text = trimmed(value?.message ?? value?.type ?? value);
  const labels = {
    frequency: 'Your shift frequency is declining.',
    cancellation: 'Your cancellation rate is higher than usual.',
    hours: 'Your logged hours are dropping significantly.',
    engagement: 'It has been a while since your last activity.'
  };
  return labels[text] || text;
}

function moodLabel(value) {
  const mood = Number(value);
  const labels = {
    1: '1 - Struggling',
    2: '2 - Low',
    3: '3 - Okay',
    4: '4 - Good',
    5: '5 - Great'
  };
  return labels[mood] || trimmed(value);
}

function normalizeCheckin(row) {
  const checkin = row && typeof row === 'object' ? row : {};
  const mood = Number(checkin.mood);
  return {
    id: positiveInteger(checkin.id),
    createdAtLabel: dateLabel(checkin.created_at ?? checkin.createdAt),
    moodLabel: moodLabel(mood),
    note: trimmed(checkin.note)
  };
}

function normalizeWellbeingDashboard(result) {
  const dashboard = dataFrom(result);
  const data = dashboard && typeof dashboard === 'object' ? dashboard : {};
  const rawScore = Number(data.score);
  const score = Number.isFinite(rawScore) ? Math.max(0, Math.min(100, Math.round(rawScore))) : 100;
  const warnings = Array.isArray(data.warnings)
    ? data.warnings.map(warningLabel).filter(Boolean)
    : [];
  const checkins = Array.isArray(data.recent_checkins)
    ? data.recent_checkins
    : (Array.isArray(data.recentCheckins) ? data.recentCheckins : []);

  return {
    score,
    risk: riskPresentation(data.burnout_risk ?? data.burnoutRisk),
    hoursThisWeekLabel: hoursLabel(data.hours_this_week ?? data.hoursThisWeek),
    hoursThisMonthLabel: hoursLabel(data.hours_this_month ?? data.hoursThisMonth),
    streakDays: Number.isFinite(Number(data.streak_days ?? data.streakDays))
      ? Number(data.streak_days ?? data.streakDays)
      : 0,
    warnings,
    moodOptions: [1, 2, 3, 4, 5].map((value) => ({
      value,
      label: moodLabel(value),
      checked: value === 3
    })),
    recentCheckins: checkins.map(normalizeCheckin)
  };
}

function moneyLabel(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(2) : '0.00';
}

function percentageLabel(value, total) {
  const amount = Number(value);
  const goal = Number(total);
  if (!Number.isFinite(amount) || !Number.isFinite(goal) || goal <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((amount / goal) * 100)));
}

function donationMethodLabel(value) {
  const labels = {
    bank_transfer: 'Bank transfer',
    paypal: 'PayPal',
    card: 'Card',
    stripe: 'Card'
  };
  const method = trimmed(value);
  return labels[method] || method || '-';
}

function donationStatusPresentation(value) {
  const status = trimmed(value) || 'pending';
  const labels = {
    pending: 'Pending',
    completed: 'Completed',
    failed: 'Failed',
    refunded: 'Refunded'
  };
  const classNames = {
    pending: 'govuk-tag--yellow',
    completed: 'govuk-tag--green',
    failed: 'govuk-tag--red',
    refunded: 'govuk-tag--grey'
  };
  return {
    value: status,
    label: labels[status] || headline(status) || 'Pending',
    className: classNames[status] || 'govuk-tag--grey'
  };
}

function givingDayStatusPresentation(value, isActive = false) {
  const status = trimmed(value) || (isActive ? 'active' : 'ended');
  const labels = {
    active: 'Active',
    upcoming: 'Upcoming',
    ended: 'Ended'
  };
  const classNames = {
    active: 'govuk-tag--green',
    upcoming: 'govuk-tag--blue',
    ended: 'govuk-tag--grey'
  };
  return {
    value: status,
    label: labels[status] || headline(status) || 'Ended',
    className: classNames[status] || 'govuk-tag--grey'
  };
}

function donorsLabel(count) {
  const number = Number(count);
  if (!Number.isFinite(number) || number <= 0) return 'No donors yet';
  return number === 1 ? '1 donor' : `${number} donors`;
}

function normalizeGivingDay(row) {
  const day = row && typeof row === 'object' ? row : {};
  const goal = Number(day.goal_amount ?? day.target_amount);
  const raised = Number(day.raised_amount);
  const status = givingDayStatusPresentation(day.status, checked(day.is_active));
  const donorCount = Number(day.donor_count);
  const percent = percentageLabel(raised, goal);
  return {
    id: positiveInteger(day.id),
    title: trimmed(day.title ?? day.name),
    description: trimmed(day.description),
    status,
    goalLabel: moneyLabel(goal),
    raisedLabel: moneyLabel(raised),
    donorCount: Number.isFinite(donorCount) ? donorCount : 0,
    donorsLabel: donorsLabel(donorCount),
    endDateLabel: dateLabel(day.end_date ?? day.ends_at ?? day.endsAt),
    percent
  };
}

function normalizeDonation(row) {
  const donation = row && typeof row === 'object' ? row : {};
  return {
    id: positiveInteger(donation.id),
    amountLabel: moneyLabel(donation.amount),
    currency: trimmed(donation.currency),
    status: donationStatusPresentation(donation.status),
    methodLabel: donationMethodLabel(donation.payment_method ?? donation.paymentMethod),
    createdAtLabel: dateLabel(donation.created_at ?? donation.createdAt),
    message: trimmed(donation.message),
    isAnonymous: checked(donation.is_anonymous ?? donation.isAnonymous)
  };
}

function normalizeDonationDashboard(givingDaysResult, donationsResult) {
  const givingDays = collectionFrom(givingDaysResult).map(normalizeGivingDay);
  const donations = collectionFrom(donationsResult).map(normalizeDonation);
  const stats = givingDays.reduce((totals, day) => ({
    totalRaised: totals.totalRaised + Number(day.raisedLabel),
    totalDonors: totals.totalDonors + day.donorCount,
    activeCampaigns: totals.activeCampaigns + (day.status.value === 'active' ? 1 : 0)
  }), { totalRaised: 0, totalDonors: 0, activeCampaigns: 0 });

  return {
    givingDays,
    donations,
    paymentMethods: [
      { value: 'bank_transfer', label: 'Bank transfer', checked: true },
      { value: 'paypal', label: 'PayPal', checked: false }
    ],
    stats: {
      totalRaisedLabel: moneyLabel(stats.totalRaised),
      totalDonors: stats.totalDonors,
      activeCampaigns: stats.activeCampaigns
    }
  };
}

function alertRowsFrom(result) {
  const data = dataFrom(result);
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.alerts)) return data.alerts;
  if (data && Array.isArray(data.items)) return data.items;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
}

function alertPriorityPresentation(value) {
  const priority = trimmed(value) || 'urgent';
  return {
    value: priority,
    label: ALERT_PRIORITY_LABELS[priority] || headline(priority) || 'Urgent',
    className: ALERT_PRIORITY_CLASSES[priority] || 'govuk-tag--grey'
  };
}

function normalizeEmergencyAlert(row) {
  const alert = row && typeof row === 'object' ? row : {};
  const shift = alert.shift && typeof alert.shift === 'object' ? alert.shift : {};
  const opportunity = alert.opportunity && typeof alert.opportunity === 'object' ? alert.opportunity : {};
  const organization = alert.organization && typeof alert.organization === 'object' ? alert.organization : {};
  const coordinator = alert.coordinator && typeof alert.coordinator === 'object' ? alert.coordinator : {};
  const startLabel = dateTimeLabel(shift.start_time ?? shift.startTime);
  const endLabel = dateTimeLabel(shift.end_time ?? shift.endTime);

  return {
    id: positiveInteger(alert.id),
    priority: alertPriorityPresentation(alert.priority),
    message: trimmed(alert.message),
    myResponse: trimmed(alert.my_response ?? alert.myResponse) || 'pending',
    skills: stringArray(alert.required_skills ?? alert.requiredSkills).join(', '),
    expiresAtLabel: dateTimeLabel(alert.expires_at ?? alert.expiresAt),
    opportunityTitle: trimmed(opportunity.title) || 'Volunteering opportunity',
    location: trimmed(opportunity.location),
    organizationName: trimmed(organization.name),
    coordinatorName: trimmed(coordinator.name),
    shiftLabel: startLabel && endLabel ? `${startLabel} - ${endLabel}` : startLabel
  };
}

function normalizeEmergencyAlertDashboard(result) {
  const data = dataFrom(result);
  const meta = data && typeof data === 'object' ? data : {};
  const nextCursor = trimmed(meta.cursor ?? meta.next_cursor ?? meta.nextCursor);
  const hasMore = Boolean(meta.has_more ?? meta.hasMore);

  return {
    alerts: alertRowsFrom(result).map(normalizeEmergencyAlert).filter((alert) => alert.id),
    nextHref: hasMore && nextCursor ? `/volunteering/emergency-alerts?cursor=${encodeURIComponent(nextCursor)}` : ''
  };
}

function groupReservationRowsFrom(result) {
  const data = dataFrom(result);
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.reservations)) return data.reservations;
  if (data && Array.isArray(data.items)) return data.items;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
}

function statusPresentation(value, labels, classNames, fallback) {
  const status = trimmed(value) || fallback;
  return {
    value: status,
    label: labels[status] || headline(status) || headline(fallback),
    className: classNames[status] || 'govuk-tag--grey'
  };
}

function normalizeGroupMember(row) {
  const member = row && typeof row === 'object' ? row : {};
  return {
    id: positiveInteger(member.id ?? member.user_id ?? member.userId),
    name: trimmed(member.name),
    status: statusPresentation(
      member.status,
      GROUP_MEMBER_STATUS_LABELS,
      GROUP_MEMBER_STATUS_CLASSES,
      'pending'
    )
  };
}

function normalizeGroupReservation(row) {
  const reservation = row && typeof row === 'object' ? row : {};
  const shift = reservation.shift && typeof reservation.shift === 'object' ? reservation.shift : {};
  const opportunity = reservation.opportunity && typeof reservation.opportunity === 'object' ? reservation.opportunity : {};
  const organization = reservation.organization && typeof reservation.organization === 'object' ? reservation.organization : {};
  const members = Array.isArray(reservation.members) ? reservation.members.map(normalizeGroupMember) : [];
  const confirmedCount = members.filter((member) => member.status.value === 'confirmed').length;
  const maxMembers = positiveInteger(reservation.max_members ?? reservation.maxMembers);
  const isLeader = checked(reservation.is_leader ?? reservation.isLeader);
  const status = statusPresentation(
    reservation.status,
    GROUP_RESERVATION_STATUS_LABELS,
    GROUP_RESERVATION_STATUS_CLASSES,
    'active'
  );
  const isCancelled = status.value === 'cancelled';

  return {
    id: positiveInteger(reservation.id),
    groupName: trimmed(reservation.group_name ?? reservation.groupName) || 'Group sign-ups',
    status,
    isLeader,
    isCancelled,
    opportunityId: positiveInteger(opportunity.id),
    opportunityTitle: trimmed(opportunity.title),
    organizationName: trimmed(organization.name),
    location: trimmed(opportunity.location),
    shiftLabel: dateTimeLabel(shift.start_time ?? shift.startTime),
    createdAtLabel: dateLabel(reservation.created_at ?? reservation.createdAt),
    members,
    confirmedCount,
    maxMembers,
    membersCountLabel: maxMembers ? `${confirmedCount} of ${maxMembers} slots filled` : `${members.length} members`,
    canAddMembers: isLeader && !isCancelled && (!maxMembers || confirmedCount < maxMembers)
  };
}

function expenseRowsFrom(result) {
  const data = dataFrom(result);
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.expenses)) return data.expenses;
  if (data && Array.isArray(data.items)) return data.items;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
}

function expenseStatusPresentation(value) {
  const status = trimmed(value) || 'pending';
  const labels = {
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    paid: 'Paid'
  };
  const classNames = {
    pending: 'govuk-tag--yellow',
    approved: 'govuk-tag--green',
    rejected: 'govuk-tag--red',
    paid: 'govuk-tag--blue'
  };
  return {
    value: status,
    label: labels[status] || headline(status) || 'Pending',
    className: classNames[status] || 'govuk-tag--grey'
  };
}

function normalizeExpense(row) {
  const expense = row && typeof row === 'object' ? row : {};
  const type = trimmed(expense.expense_type ?? expense.expenseType);
  const status = expenseStatusPresentation(expense.status);
  const currency = trimmed(expense.currency);
  return {
    id: positiveInteger(expense.id),
    type,
    typeLabel: EXPENSE_TYPE_LABELS[type] || headline(type) || 'Other',
    amountLabel: moneyLabel(expense.amount),
    currency,
    amountWithCurrency: `${currency ? `${currency} ` : ''}${moneyLabel(expense.amount)}`,
    description: trimmed(expense.description),
    status,
    submittedAtLabel: dateLabel(expense.submitted_at ?? expense.submittedAt ?? expense.created_at ?? expense.createdAt),
    reviewNotes: trimmed(expense.review_notes ?? expense.reviewNotes)
  };
}

function normalizeExpenseDashboard(expensesResult, organizationsResult) {
  const data = dataFrom(expensesResult);
  const statsData = data && typeof data === 'object' && data.stats && typeof data.stats === 'object'
    ? data.stats
    : {};
  const expenses = expenseRowsFrom(expensesResult).map(normalizeExpense);
  const fallbackStats = expenses.reduce((totals, expense) => {
    const amount = Number(expense.amountLabel);
    return {
      totalClaimed: totals.totalClaimed + amount,
      approved: totals.approved + (['approved', 'paid'].includes(expense.status.value) ? amount : 0),
      paid: totals.paid + (expense.status.value === 'paid' ? amount : 0)
    };
  }, { totalClaimed: 0, approved: 0, paid: 0 });

  return {
    expenses,
    organizations: collectionFrom(organizationsResult).map(normalizeOrganization).filter(Boolean),
    expenseTypes: EXPENSE_TYPES,
    stats: {
      totalClaimedLabel: moneyLabel(statsData.total_submitted ?? statsData.total_claimed ?? fallbackStats.totalClaimed),
      approvedLabel: moneyLabel(statsData.approved_total ?? statsData.total_approved ?? fallbackStats.approved),
      paidLabel: moneyLabel(statsData.paid_total ?? statsData.total_paid ?? fallbackStats.paid)
    }
  };
}

function normalizeOrganization(row) {
  const organization = row && typeof row === 'object' ? row : {};
  const id = positiveInteger(organization.id);
  return id === null ? null : {
    id,
    name: trimmed(organization.name) || `Organisation ${id}`
  };
}

function normalizeApplication(row) {
  const application = row && typeof row === 'object' ? row : {};
  const opportunity = application.opportunity && typeof application.opportunity === 'object'
    ? application.opportunity
    : {};
  const organization = application.organization && typeof application.organization === 'object'
    ? application.organization
    : {};
  return {
    id: positiveInteger(application.id),
    status: trimmed(application.status),
    opportunity: {
      id: positiveInteger(opportunity.id ?? application.opportunity_id ?? application.opportunityId),
      title: trimmed(opportunity.title ?? application.opportunity_title ?? application.opportunityTitle)
    },
    organization: normalizeOrganization({
      id: organization.id ?? application.organization_id ?? application.organizationId,
      name: organization.name ?? application.organization_name ?? application.organizationName
    })
  };
}

function hoursOrganizations(organizations, applications) {
  const byId = new Map();
  for (const organization of organizations.map(normalizeOrganization).filter(Boolean)) {
    byId.set(organization.id, organization);
  }
  for (const application of applications) {
    if (application.organization) {
      byId.set(application.organization.id, application.organization);
    }
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
}

function hourStatusPresentation(status) {
  const value = trimmed(status) || 'pending';
  if (value === 'pending') {
    return {
      value,
      label: 'Submitted',
      className: 'govuk-tag--yellow',
      note: 'Waiting for the organisation to review and approve these hours.'
    };
  }
  if (value === 'approved') {
    return {
      value,
      label: 'Approved',
      className: 'govuk-tag--green',
      note: 'Approved. The time credits for these hours have been added to your wallet automatically.'
    };
  }
  if (value === 'declined' || value === 'rejected') {
    return {
      value,
      label: 'Declined',
      className: 'govuk-tag--red',
      note: ''
    };
  }
  return {
    value,
    label: headline(value),
    className: 'govuk-tag--grey',
    note: ''
  };
}

function normalizeHourLog(row) {
  const log = row && typeof row === 'object' ? row : {};
  const organization = log.organization && typeof log.organization === 'object' ? log.organization : {};
  const status = hourStatusPresentation(log.status);
  return {
    id: positiveInteger(log.id),
    dateLabel: dateLabel(log.date ?? log.date_logged ?? log.dateLogged ?? log.logged_at ?? log.loggedAt ?? log.created_at),
    hoursLabel: hoursLabel(log.hours),
    status,
    organizationName: trimmed(organization.name ?? log.organization_name ?? log.organizationName),
    description: trimmed(log.description)
  };
}

function normalizeCertificate(row) {
  const certificate = row && typeof row === 'object' ? row : {};
  const code = trimmed(certificate.verification_code ?? certificate.verificationCode);
  const dateRange = certificate.date_range && typeof certificate.date_range === 'object'
    ? certificate.date_range
    : (certificate.dateRange && typeof certificate.dateRange === 'object' ? certificate.dateRange : {});
  const organizations = Array.isArray(certificate.organizations)
    ? certificate.organizations
    : (Array.isArray(certificate.organisations) ? certificate.organisations : []);

  return {
    verificationCode: code,
    totalHoursLabel: hoursLabel(certificate.total_hours ?? certificate.totalHours),
    rangeStartLabel: dateLabel(dateRange.start ?? certificate.start_date ?? certificate.startDate),
    rangeEndLabel: dateLabel(dateRange.end ?? certificate.end_date ?? certificate.endDate),
    generatedAtLabel: dateLabel(certificate.generated_at ?? certificate.generatedAt),
    organizations: organizations.map((organization) => ({
      name: trimmed(organization?.name) || 'Independent volunteering',
      hoursLabel: hoursLabel(organization?.hours)
    })),
    downloadPath: code ? `/volunteering/certificates/${encodeURIComponent(code)}/download` : ''
  };
}

function normalizeCredential(row) {
  const credential = row && typeof row === 'object' ? row : {};
  const type = trimmed(credential.credential_type ?? credential.type);
  const status = credentialStatusPresentation(credential.status);
  const typeLabel = CREDENTIAL_TYPE_LABELS[type]
    || trimmed(credential.type_label ?? credential.typeLabel)
    || headline(type)
    || 'Credential';

  return {
    id: positiveInteger(credential.id),
    type,
    typeLabel,
    fileName: trimmed(credential.file_name ?? credential.document_name ?? credential.fileName ?? credential.documentName),
    status,
    expiryLabel: dateLabel(credential.expires_at ?? credential.expiry_date ?? credential.expiryDate) || 'No expiry',
    uploadedLabel: dateLabel(
      credential.created_at
      ?? credential.upload_date
      ?? credential.uploadDate
      ?? credential.createdAt
    ) || '-'
  };
}

function accessibilityPayload(rows) {
  const selected = [];
  const shared = {
    description: '',
    accommodations: '',
    emergencyName: '',
    emergencyPhone: ''
  };

  for (const item of rows) {
    const row = item && typeof item === 'object' ? item : {};
    const needType = trimmed(row.need_type ?? row.needType);
    if (ACCESSIBILITY_NEED_TYPES.some((type) => type.value === needType)) {
      selected.push(needType);
    }
    if (!shared.description && row.description) shared.description = trimmed(row.description);
    if (!shared.accommodations && (row.accommodations_required ?? row.accommodationsRequired)) {
      shared.accommodations = trimmed(row.accommodations_required ?? row.accommodationsRequired);
    }
    if (!shared.emergencyName && (row.emergency_contact_name ?? row.emergencyContactName)) {
      shared.emergencyName = trimmed(row.emergency_contact_name ?? row.emergencyContactName);
    }
    if (!shared.emergencyPhone && (row.emergency_contact_phone ?? row.emergencyContactPhone)) {
      shared.emergencyPhone = trimmed(row.emergency_contact_phone ?? row.emergencyContactPhone);
    }
  }

  return {
    selectedTypes: [...new Set(selected)],
    details: shared
  };
}

router.get('/certificates', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) {
    return res.redirect(loginRedirect());
  }

  let certificates = [];
  let loadError = null;
  try {
    certificates = collectionFrom(await callApi(token, 'GET', '/certificates')).map(normalizeCertificate);
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    loadError = 'We could not load your certificates. Please try again.';
  }

  return res.render('volunteering/certificates', {
    title: 'Volunteer certificates',
    activeNav: 'volunteering',
    certificates,
    loadError,
    status: certificateStatus(trimmed(req.query.status)),
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}, { redirectOn401: loginRedirect() }));

router.get('/accessibility', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) {
    return res.redirect(loginRedirect());
  }

  const accessibility = accessibilityPayload(collectionFrom(await callApi(token, 'GET', '/accessibility-needs')));
  return res.render('volunteering/accessibility', {
    title: 'Your accessibility needs',
    activeNav: 'volunteering',
    needTypes: ACCESSIBILITY_NEED_TYPES,
    selectedTypes: accessibility.selectedTypes,
    accessibility: accessibility.details,
    status: accessibilityStatus(trimmed(req.query.status)),
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}, { redirectOn401: loginRedirect() }));

router.get('/emergency-alerts', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) {
    return res.redirect(loginRedirect());
  }

  let dashboard = normalizeEmergencyAlertDashboard({});
  let loadError = null;
  const cursor = trimmed(req.query.cursor, 512);
  try {
    const path = cursor ? `/emergency-alerts?cursor=${encodeURIComponent(cursor)}` : '/emergency-alerts';
    dashboard = normalizeEmergencyAlertDashboard(await callApi(token, 'GET', path));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    loadError = 'We could not load your urgent shift requests. Please try again.';
  }

  return res.render('volunteering/emergency-alerts', {
    title: 'Urgent shift requests',
    activeNav: 'volunteering',
    dashboard,
    loadError,
    status: emergencyAlertStatus(trimmed(req.query.status)),
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}, { redirectOn401: loginRedirect() }));

router.get('/group-signups', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) {
    return res.redirect(loginRedirect());
  }

  let reservations = [];
  let loadError = null;
  try {
    reservations = groupReservationRowsFrom(await callApi(token, 'GET', '/group-reservations'))
      .map(normalizeGroupReservation)
      .filter((reservation) => reservation.id);
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    loadError = 'We could not load your group sign-ups. Please try again.';
  }

  return res.render('volunteering/group-signups', {
    title: 'Group sign-ups',
    activeNav: 'volunteering',
    reservations,
    loadError,
    status: groupSignupStatus(trimmed(req.query.status)),
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}, { redirectOn401: loginRedirect() }));

router.get('/credentials', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) {
    return res.redirect(loginRedirect());
  }

  let credentials = [];
  let loadError = null;
  try {
    credentials = credentialRowsFrom(await callApi(token, 'GET', '/credentials')).map(normalizeCredential);
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    loadError = 'We could not load your credentials. Please try again.';
  }

  return res.render('volunteering/credentials', {
    title: 'My credentials',
    activeNav: 'volunteering',
    credentialTypes: CREDENTIAL_TYPES,
    credentials,
    loadError,
    status: credentialStatus(trimmed(req.query.status)),
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}, { redirectOn401: loginRedirect() }));

router.get('/hours', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) {
    return res.redirect(loginRedirect());
  }

  let summary = normalizeHourSummary({});
  let logs = [];
  let applications = [];
  let organizations = [];
  let loadError = null;
  try {
    summary = normalizeHourSummary(await callApi(token, 'GET', '/hours/summary'));
    logs = collectionFrom(await callApi(token, 'GET', '/hours?per_page=10')).map(normalizeHourLog);
    applications = collectionFrom(
      await callApi(token, 'GET', '/applications?status=approved&per_page=50')
    ).map(normalizeApplication);
    organizations = hoursOrganizations(
      collectionFrom(await callApi(token, 'GET', '/my-organisations?per_page=50')),
      applications
    );
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    loadError = 'We could not load your volunteering hours. Please try again.';
  }

  const nextGoal = summary.approvedTotal > 0 ? Math.ceil(summary.approvedTotal / 50) * 50 : 0;

  return res.render('volunteering/hours', {
    title: 'Volunteering hours',
    activeNav: 'volunteering',
    summary,
    nextGoal,
    logs,
    applications,
    organizations,
    loadError,
    today: new Date().toISOString().slice(0, 10),
    status: hoursStatus(trimmed(req.query.status)),
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}, { redirectOn401: loginRedirect() }));

router.get('/wellbeing', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) {
    return res.redirect(loginRedirect());
  }

  let wellbeing = normalizeWellbeingDashboard({});
  let loadError = null;
  try {
    wellbeing = normalizeWellbeingDashboard(await callApi(token, 'GET', '/wellbeing'));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    loadError = 'We could not load your wellbeing dashboard. Please try again.';
  }

  return res.render('volunteering/wellbeing', {
    title: 'My wellbeing',
    activeNav: 'volunteering',
    wellbeing,
    loadError,
    status: wellbeingStatus(trimmed(req.query.status)),
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}, { redirectOn401: loginRedirect() }));

router.get('/donations', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) {
    return res.redirect(loginRedirect());
  }

  let dashboard = normalizeDonationDashboard({}, {});
  let loadError = null;
  try {
    const givingDays = await callApi(token, 'GET', '/giving-days');
    const donations = await callApi(token, 'GET', '/donations?per_page=20');
    dashboard = normalizeDonationDashboard(givingDays, donations);
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    loadError = 'We could not load your donations. Please try again.';
  }

  return res.render('volunteering/donations', {
    title: 'Donations and giving',
    activeNav: 'volunteering',
    dashboard,
    loadError,
    status: donationStatus(trimmed(req.query.status), trimmed(req.query.donate_error)),
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}, { redirectOn401: loginRedirect() }));

router.get('/expenses', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) {
    return res.redirect(loginRedirect());
  }

  let dashboard = normalizeExpenseDashboard({}, {});
  let loadError = null;
  try {
    const expenses = await callApi(token, 'GET', '/expenses?per_page=50');
    const organizations = await callApi(token, 'GET', '/my-organisations?per_page=50');
    dashboard = normalizeExpenseDashboard(expenses, organizations);
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    loadError = 'We could not load your expenses. Please try again.';
  }

  return res.render('volunteering/expenses', {
    title: 'My expenses',
    activeNav: 'volunteering',
    dashboard,
    loadError,
    status: expenseStatus(trimmed(req.query.status)),
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}, { redirectOn401: loginRedirect() }));

router.post('/opportunities/create', asyncRoute(async (req, res) => {
  const organizationId = positiveInteger(req.body.organization_id);
  const title = trimmed(req.body.title);
  const description = trimmed(req.body.description);
  if (organizationId === null || title === '' || description === '') {
    return res.redirect('/volunteering/opportunities/create?status=opp-validation');
  }

  const categoryId = positiveInteger(req.body.category_id);
  const payload = {
    organization_id: organizationId,
    title,
    description,
    location: trimmed(req.body.location),
    is_remote: checked(req.body.is_remote),
    skills_needed: trimmed(req.body.skills_needed),
    start_date: trimmed(req.body.start_date) || null,
    end_date: trimmed(req.body.end_date) || null,
    category_id: categoryId,
    federated_visibility: checked(req.body.federated_visibility) ? 'network' : 'local'
  };

  return runAction(
    req,
    res,
    'POST',
    '/opportunities',
    payload,
    (result) => opportunityRedirect(resultId(result) || 'create', 'opp-created'),
    '/volunteering/opportunities/create?status=opp-create-failed'
  );
}));

router.post('/opportunities/:id(\\d+)/apply', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const payload = {
    message: trimmed(req.body.message),
    shift_id: positiveInteger(req.body.shift_id)
  };

  return runAction(
    req,
    res,
    'POST',
    `/opportunities/${id}/apply`,
    payload,
    opportunityRedirect(id, 'apply-created'),
    opportunityRedirect(id, 'apply-failed')
  );
}));

router.post('/opportunities/:id(\\d+)/shifts/:shiftId(\\d+)/signup', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const shiftId = Number(req.params.shiftId);

  return runAction(
    req,
    res,
    'POST',
    `/shifts/${shiftId}/signup`,
    undefined,
    opportunityRedirect(id, 'shift-signed-up'),
    opportunityRedirect(id, 'shift-signup-failed')
  );
}));

router.post('/opportunities/:id(\\d+)/shifts/:shiftId(\\d+)/cancel', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const shiftId = Number(req.params.shiftId);

  return runAction(
    req,
    res,
    'DELETE',
    `/shifts/${shiftId}/signup`,
    undefined,
    opportunityRedirect(id, 'shift-cancelled'),
    opportunityRedirect(id, 'shift-cancel-failed')
  );
}));

router.post('/applications/:id(\\d+)/withdraw', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  return runAction(
    req,
    res,
    'DELETE',
    `/applications/${id}`,
    undefined,
    '/volunteering?tab=applications&status=application-withdrawn',
    '/volunteering?tab=applications&status=application-withdraw-failed'
  );
}));

router.post('/hours', asyncRoute(async (req, res) => {
  const payload = {
    organization_id: positiveInteger(req.body.organization_id),
    opportunity_id: positiveInteger(req.body.opportunity_id),
    date: trimmed(req.body.date),
    hours: decimalNumber(req.body.hours),
    description: trimmed(req.body.description)
  };

  return runAction(
    req,
    res,
    'POST',
    '/hours',
    payload,
    '/volunteering/hours?status=hours-created',
    '/volunteering/hours?status=hours-failed'
  );
}));

router.post('/accessibility', asyncRoute(async (req, res) => {
  const payload = {
    need_types: stringArray(req.body.need_types),
    description: trimmed(req.body.description) || null,
    accommodations_required: trimmed(req.body.accommodations_required) || null,
    emergency_contact_name: trimmed(req.body.emergency_contact_name) || null,
    emergency_contact_phone: trimmed(req.body.emergency_contact_phone) || null
  };

  return runAction(
    req,
    res,
    'PUT',
    '/accessibility-needs',
    payload,
    '/volunteering/accessibility?status=accessibility-saved',
    '/volunteering/accessibility?status=accessibility-failed'
  );
}));

router.post('/certificates/generate', asyncRoute(async (req, res) => runAction(
  req,
  res,
  'POST',
  '/certificates',
  undefined,
  '/volunteering/certificates?status=certificate-generated',
  '/volunteering/certificates?status=certificate-no-hours'
)));

router.post('/waitlist/:shiftId(\\d+)/leave', asyncRoute(async (req, res) => {
  const shiftId = Number(req.params.shiftId);
  return runAction(
    req,
    res,
    'DELETE',
    `/shifts/${shiftId}/waitlist`,
    undefined,
    '/volunteering/waitlist?status=waitlist-left',
    '/volunteering/waitlist?status=waitlist-leave-failed'
  );
}));

router.post('/swaps', asyncRoute(async (req, res) => {
  const fromShiftId = positiveInteger(req.body.from_shift_id);
  const toShiftId = positiveInteger(req.body.to_shift_id);
  const toUserId = positiveInteger(req.body.to_user_id);
  if (fromShiftId === null || toShiftId === null || toUserId === null) {
    return res.redirect('/volunteering/swaps?status=swap-invalid');
  }

  return runAction(
    req,
    res,
    'POST',
    '/swaps',
    {
      from_shift_id: fromShiftId,
      to_shift_id: toShiftId,
      to_user_id: toUserId,
      message: trimmed(req.body.message)
    },
    '/volunteering/swaps?status=swap-requested',
    '/volunteering/swaps?status=swap-request-failed'
  );
}));

router.post('/swaps/:id(\\d+)/respond', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const action = trimmed(req.body.action) === 'reject' ? 'reject' : 'accept';
  const status = action === 'accept' ? 'swap-accepted' : 'swap-rejected';

  return runAction(
    req,
    res,
    'PUT',
    `/swaps/${id}`,
    { action },
    `/volunteering/swaps?status=${status}`,
    '/volunteering/swaps?status=swap-respond-failed'
  );
}));

router.post('/swaps/:id(\\d+)/cancel', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  return runAction(
    req,
    res,
    'DELETE',
    `/swaps/${id}`,
    undefined,
    '/volunteering/swaps?status=swap-cancelled',
    '/volunteering/swaps?status=swap-cancel-failed'
  );
}));

router.post('/emergency-alerts/:id(\\d+)/respond', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const response = trimmed(req.body.response) === 'declined' ? 'declined' : 'accepted';
  const status = response === 'accepted' ? 'alert-accepted' : 'alert-declined';

  return runAction(
    req,
    res,
    'PUT',
    `/emergency-alerts/${id}`,
    { response },
    `/volunteering/emergency-alerts?status=${status}`,
    '/volunteering/emergency-alerts?status=alert-respond-failed'
  );
}));

router.post('/credentials', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) {
    return res.redirect(loginRedirect());
  }

  const type = trimmed(req.body.credential_type || req.body.type, 100);
  const expiresAt = trimmed(req.body.expires_at || req.body.expiry_date);
  const file = uploadedFile(req, 'file') || uploadedFile(req, 'document');
  if (!type || !file) {
    await removeUploadedFile(file);
    return res.redirect('/volunteering/credentials?status=credential-upload-failed');
  }

  try {
    const buffer = await fs.readFile(file.filepath);
    await uploadVolunteerCredential(token, {
      credential_type: type,
      expires_at: expiresAt,
      file: {
        buffer,
        filename: trimmed(file.originalFilename) || 'credential',
        contentType: trimmed(file.mimetype) || 'application/octet-stream',
        size: file.size
      }
    });
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    return res.redirect('/volunteering/credentials?status=credential-upload-failed');
  } finally {
    await removeUploadedFile(file);
  }

  return res.redirect('/volunteering/credentials?status=credential-uploaded');
}));

router.post('/credentials/:id(\\d+)/delete', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  return runAction(
    req,
    res,
    'DELETE',
    `/credentials/${id}`,
    undefined,
    '/volunteering/credentials?status=credential-deleted',
    '/volunteering/credentials?status=credential-delete-failed'
  );
}));

router.post('/wellbeing/checkin', asyncRoute(async (req, res) => {
  const mood = positiveInteger(req.body.mood);
  if (mood === null || mood < 1 || mood > 5) {
    return res.redirect('/volunteering/wellbeing?status=mood-invalid');
  }

  return runAction(
    req,
    res,
    'POST',
    '/wellbeing/checkin',
    {
      mood,
      note: trimmed(req.body.note, 500)
    },
    '/volunteering/wellbeing?status=checkin-saved',
    '/volunteering/wellbeing?status=checkin-failed'
  );
}));

router.post('/donations', asyncRoute(async (req, res) => {
  const amount = decimalNumber(req.body.amount);
  if (amount <= 0) {
    return res.redirect('/volunteering/donations?status=donate-failed&donate_error=amount#donate');
  }

  const givingDayId = positiveInteger(req.body.giving_day_id);
  const payload = {
    amount,
    currency: 'EUR',
    payment_method: trimmed(req.body.payment_method) === 'paypal' ? 'paypal' : 'bank_transfer',
    message: trimmed(req.body.message, 500),
    is_anonymous: checked(req.body.is_anonymous)
  };
  if (givingDayId !== null) {
    payload.giving_day_id = givingDayId;
  }

  return runAction(
    req,
    res,
    'POST',
    '/donations',
    payload,
    '/volunteering/donations?status=donate-recorded#donate',
    '/volunteering/donations?status=donate-failed#donate'
  );
}));

router.post('/group-signups/:id(\\d+)/members', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const userId = positiveInteger(req.body.user_id);
  if (userId === null) {
    return res.redirect('/volunteering/group-signups?status=member-id-required');
  }

  return runAction(
    req,
    res,
    'POST',
    `/group-reservations/${id}/members`,
    { user_id: userId },
    '/volunteering/group-signups?status=member-added',
    '/volunteering/group-signups?status=member-add-failed'
  );
}));

router.post('/group-signups/:id(\\d+)/members/:userId(\\d+)/remove', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const userId = Number(req.params.userId);
  return runAction(
    req,
    res,
    'DELETE',
    `/group-reservations/${id}/members/${userId}`,
    undefined,
    '/volunteering/group-signups?status=member-removed',
    '/volunteering/group-signups?status=member-remove-failed'
  );
}));

router.post('/group-signups/:id(\\d+)/cancel', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  return runAction(
    req,
    res,
    'DELETE',
    `/group-reservations/${id}`,
    undefined,
    '/volunteering/group-signups?status=reservation-cancelled',
    '/volunteering/group-signups?status=reservation-cancel-failed'
  );
}));

router.post('/expenses', asyncRoute(async (req, res) => {
  const organizationId = positiveInteger(req.body.organization_id);
  const amount = decimalNumber(req.body.amount);
  const description = trimmed(req.body.description);
  if (organizationId === null) {
    return res.redirect('/volunteering/expenses?status=expense-org-required');
  }
  if (amount <= 0) {
    return res.redirect('/volunteering/expenses?status=expense-amount-invalid');
  }
  if (description === '') {
    return res.redirect('/volunteering/expenses?status=expense-description-required');
  }

  const expenseType = trimmed(req.body.expense_type);
  return runAction(
    req,
    res,
    'POST',
    '/expenses',
    {
      organization_id: organizationId,
      expense_type: ['travel', 'meals', 'supplies', 'equipment', 'parking', 'other'].includes(expenseType)
        ? expenseType
        : 'travel',
      amount,
      description,
      currency: trimmed(req.body.currency, 10)
    },
    '/volunteering/expenses?status=expense-submitted',
    '/volunteering/expenses?status=expense-failed'
  );
}));

router.post('/training', asyncRoute(async (req, res) => {
  const trainingType = trimmed(req.body.training_type);
  const trainingName = trimmed(req.body.training_name);
  const completedAt = trimmed(req.body.completed_at);
  if (trainingType === '') {
    return res.redirect('/volunteering/training?status=training-type-required&tab=training');
  }
  if (trainingName === '') {
    return res.redirect('/volunteering/training?status=training-name-required&tab=training');
  }
  if (completedAt === '') {
    return res.redirect('/volunteering/training?status=training-date-required&tab=training');
  }

  return runAction(
    req,
    res,
    'POST',
    '/training',
    {
      training_type: trainingType,
      training_name: trainingName,
      provider: trimmed(req.body.provider) || null,
      completed_at: completedAt,
      expires_at: trimmed(req.body.expires_at) || null
    },
    '/volunteering/training?status=training-added&tab=training',
    '/volunteering/training?status=training-failed&tab=training'
  );
}));

router.post('/incidents', asyncRoute(async (req, res) => {
  const title = trimmed(req.body.title);
  const description = trimmed(req.body.description);
  if (title === '') {
    return res.redirect('/volunteering/incidents?status=incident-title-required&tab=incidents');
  }
  if (description.length < 20) {
    return res.redirect('/volunteering/incidents?status=incident-description-too-short&tab=incidents');
  }

  const severity = trimmed(req.body.severity);
  return runAction(
    req,
    res,
    'POST',
    '/incidents',
    {
      title,
      description,
      severity: ['low', 'medium', 'high', 'critical'].includes(severity)
        ? severity
        : 'low',
      category: trimmed(req.body.category) || 'general',
      incident_type: 'other'
    },
    '/volunteering/incidents?status=incident-reported&tab=incidents',
    '/volunteering/incidents?status=incident-failed&tab=incidents'
  );
}));

router.post('/organisations/:id(\\d+)/applications/:appId(\\d+)', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const appId = Number(req.params.appId);
  const action = trimmed(req.body.action) === 'decline' ? 'decline' : 'approve';
  const status = action === 'approve' ? 'application-approved' : 'application-declined';

  return runAction(
    req,
    res,
    'PUT',
    `/applications/${appId}`,
    {
      action,
      org_note: trimmed(req.body.org_note)
    },
    orgManageRedirect(id, status),
    orgManageRedirect(id, 'application-failed')
  );
}));

router.post('/organisations/:id(\\d+)/hours/:logId(\\d+)', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const logId = Number(req.params.logId);
  const action = trimmed(req.body.action) === 'decline' ? 'decline' : 'approve';
  const status = action === 'approve' ? 'hours-approved' : 'hours-declined';

  return runAction(
    req,
    res,
    'PUT',
    `/hours/${logId}/verify`,
    { action },
    orgManageRedirect(id, status),
    orgManageRedirect(id, 'hours-verify-failed')
  );
}));

router.post('/organisations/:id(\\d+)/settings', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const name = trimmed(req.body.name);
  if (name === '') {
    return res.redirect(orgSettingsRedirect(id, 'name-required'));
  }

  return runAction(
    req,
    res,
    'PUT',
    `/organisations/${id}`,
    {
      name,
      description: trimmed(req.body.description),
      contact_email: trimmed(req.body.contact_email),
      website: trimmed(req.body.website)
    },
    orgSettingsRedirect(id, 'settings-saved'),
    orgSettingsRedirect(id, 'settings-failed')
  );
}));

router.post('/organisations/:id(\\d+)/wallet/deposit', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const amount = decimalNumber(req.body.amount);
  if (amount <= 0) {
    return res.redirect(orgWalletRedirect(id, 'deposit-amount-invalid'));
  }

  return runAction(
    req,
    res,
    'POST',
    `/organisations/${id}/wallet/deposit`,
    {
      amount,
      note: trimmed(req.body.note) || null
    },
    orgWalletRedirect(id, 'deposit-made'),
    orgWalletRedirect(id, 'deposit-failed')
  );
}));

router.post('/organisations/:id(\\d+)/wallet/auto-pay', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const enabled = checked(req.body.enabled);

  return runAction(
    req,
    res,
    'PUT',
    `/organisations/${id}/wallet/auto-pay`,
    { enabled },
    orgWalletRedirect(id, enabled ? 'autopay-enabled' : 'autopay-disabled'),
    orgWalletRedirect(id, 'autopay-failed')
  );
}));

module.exports = router;
