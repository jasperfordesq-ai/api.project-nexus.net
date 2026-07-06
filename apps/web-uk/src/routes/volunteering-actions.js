// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const fs = require('fs/promises');
const { ApiError, callVolunteeringApi, uploadVolunteerCredential } = require('../lib/api');
const { asyncRoute } = require('../lib/routeHelpers');

const router = express.Router();

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
