// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const {
  getBalance,
  getTransactions,
  transferCredits,
  donateCredits,
  getProfile,
  callWalletApi,
  callWalletDownload,
  ApiError
} = require('../lib/api');
const { asyncRoute } = require('../lib/routeHelpers');
const { audit } = require('../lib/auditLogger');

const router = express.Router();

function dataFrom(result) {
  if (result && typeof result === 'object' && Object.prototype.hasOwnProperty.call(result, 'data')) {
    return result.data;
  }
  return result;
}

function itemsFrom(result, key = 'items') {
  const data = dataFrom(result);
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data[key])) return data[key];
  if (data && Array.isArray(data.items)) return data.items;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
}

function numberValue(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function creditsLabel(value) {
  return `${numberValue(value).toFixed(2)} credits`;
}

function monthYear(value, style = 'long') {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', { month: style, year: 'numeric' }).format(date);
}

function normalizeWallet(raw) {
  const wallet = dataFrom(raw) || {};
  const pendingIn = numberValue(wallet.pending_in ?? wallet.pending_incoming ?? wallet.pendingIn ?? wallet.pendingIncoming);
  const pendingOut = numberValue(wallet.pending_out ?? wallet.pending_outgoing ?? wallet.pendingOut ?? wallet.pendingOutgoing);
  return {
    balance: numberValue(wallet.balance),
    earned: numberValue(wallet.total_earned ?? wallet.totalEarned),
    spent: numberValue(wallet.total_spent ?? wallet.totalSpent),
    pendingIn,
    pendingOut,
    pendingTotal: pendingIn + pendingOut
  };
}

function normalizeFund(raw) {
  const fund = dataFrom(raw) || {};
  return {
    balance: numberValue(fund.balance),
    donated: numberValue(fund.total_donated ?? fund.totalDonated)
  };
}

function normalizeRecipient(row) {
  const recipient = row && typeof row === 'object' ? row : {};
  const id = Number.parseInt(recipient.id, 10);
  if (!Number.isFinite(id) || id <= 0) return null;
  return {
    id,
    name: String(recipient.name || [recipient.first_name, recipient.last_name].filter(Boolean).join(' ') || `Member #${id}`).trim(),
    location: String(recipient.location || '').trim(),
    since: String(recipient.since || '').trim() || monthYear(recipient.created_at ?? recipient.createdAt, 'short'),
    memberSince: monthYear(recipient.created_at ?? recipient.createdAt, 'long')
  };
}

function walletManageStatus(status, transferError = '', donateError = '') {
  const errors = {
    invalid: 'Check the details and try again.',
    insufficient: 'You do not have enough credits for that transfer.',
    'not-found': 'The recipient could not be found.',
    self: 'You cannot send credits to yourself.',
    inactive: 'That member cannot receive credits right now.',
    'too-large': 'Enter 1,000 credits or fewer.',
    decimals: 'Enter a valid credit amount.',
    failed: 'We could not complete that wallet action. Try again.'
  };

  if (status === 'transfer-failed') {
    return { type: 'error', href: '#transfer', message: errors[transferError] || errors.failed };
  }
  if (status === 'donate-failed') {
    return { type: 'error', href: '#donate', message: errors[donateError] || errors.failed };
  }
  if (status === 'transfer-sent') {
    return { type: 'success', message: 'Your time-credit transfer was sent.' };
  }
  if (status === 'donate-sent') {
    return { type: 'success', message: 'Your time-credit donation was sent.' };
  }
  return null;
}

function walletSearchPath(query) {
  const params = new URLSearchParams();
  params.set('q', query);
  params.set('limit', '10');
  return `/user-search?${params.toString()}`;
}

async function walletRecipientsFor(token, query) {
  const trimmed = String(query || '').trim();
  if (trimmed.length < 2) return [];
  return itemsFrom(await callWalletApi(token, 'GET', walletSearchPath(trimmed)), 'users')
    .map(normalizeRecipient)
    .filter(Boolean);
}

// Wallet overview
router.get('/', requireAuth, asyncRoute(async (req, res) => {
  const [balanceData, transactionsData, currentUser] = await Promise.all([
    getBalance(req.token),
    getTransactions(req.token, { limit: 5 }),
    getProfile(req.token)
  ]);

  const transactions = transactionsData.items || transactionsData.data || (Array.isArray(transactionsData) ? transactionsData : []);
  // Compute relative_type (sent/received) from sender_id relative to the current user
  transactions.forEach(tx => {
    tx.relative_type = String(tx.sender_id || tx.senderId) === String(currentUser.id) ? 'sent' : 'received';
  });

  res.render('wallet/index', {
    title: 'Wallet',
    balance: balanceData.balance || balanceData,
    transactions,
    status: typeof req.query.status === 'string' ? req.query.status : '',
    donateError: typeof req.query.donate_error === 'string' ? req.query.donate_error : '',
    successMessage: req.flash ? req.flash('success')[0] : null
  });
}));

router.get('/export.csv', requireAuth, asyncRoute(async (req, res) => {
  const result = await callWalletDownload(req.token, '/statement');
  res.status(result.status || 200);
  const headers = result.headers || {};
  res.set('Content-Type', headers['content-type'] || 'text/csv; charset=utf-8');
  res.set('Content-Disposition', headers['content-disposition'] || 'attachment; filename="wallet_statement.csv"');
  if (headers['cache-control']) res.set('Cache-Control', headers['cache-control']);
  if (headers.pragma) res.set('Pragma', headers.pragma);
  if (headers.expires) res.set('Expires', headers.expires);
  return res.send(result.body);
}));

router.get('/recipients', requireAuth, asyncRoute(async (req, res) => {
  const recipients = await walletRecipientsFor(req.token, req.query.q);
  return res.json({
    results: recipients.map((recipient) => ({
      id: recipient.id,
      name: recipient.name,
      location: recipient.location || null,
      since: recipient.since || null
    }))
  });
}));

router.get('/manage', requireAuth, asyncRoute(async (req, res) => {
  const recipientQuery = String(req.query.recipient_q || '').trim();
  const donateTarget = req.query.donate_target === 'user' ? 'user' : 'community_fund';
  const [walletRaw, fundRaw, recipients] = await Promise.all([
    callWalletApi(req.token, 'GET', '/balance'),
    callWalletApi(req.token, 'GET', '/community-fund'),
    walletRecipientsFor(req.token, recipientQuery)
  ]);

  res.render('wallet/manage', {
    title: 'Manage credits',
    wallet: normalizeWallet(walletRaw),
    fund: normalizeFund(fundRaw),
    recipients,
    recipientQuery,
    donateTarget,
    status: walletManageStatus(req.query.status, req.query.error, req.query.donate_error),
    creditsLabel,
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}));

// Process transfer
router.post('/transfer', requireAuth, audit.walletTransfer(), asyncRoute(async (req, res) => {
  const receiverId = req.body.recipient_id || req.body.receiver_id;
  const { amount } = req.body;
  const description = req.body.note || req.body.description;

  // Basic validation
  const errors = [];

  if (!receiverId) {
    errors.push('invalid');
  }

  const amountNum = parseFloat(amount);
  if (!amount || isNaN(amountNum) || amountNum <= 0) {
    errors.push('invalid');
  }

  // Fetch profile and balance for self-transfer and insufficient balance checks
  const [currentProfile, balanceData] = await Promise.all([
    getProfile(req.token),
    getBalance(req.token)
  ]);
  const balance = balanceData.balance !== undefined ? balanceData.balance : balanceData;

  if (receiverId && String(receiverId) === String(currentProfile.id)) {
    errors.push('self');
  }

  if (!isNaN(amountNum) && amountNum > 0 && amountNum > balance) {
    errors.push('insufficient');
  }

  if (errors.length > 0) {
    return res.redirect(`/wallet?status=transfer-failed&error=${encodeURIComponent(errors[0])}#transfer`);
  }

  try {
    await transferCredits(req.token, parseInt(receiverId, 10), amountNum, description);

    if (req.flash) {
      req.flash('success', 'Transfer completed successfully');
    }
    res.redirect('/wallet?status=transfer-sent#transactions');
  } catch (error) {
    if (error instanceof ApiError && (error.status === 400 || error.status === 422)) {
      return res.redirect('/wallet?status=transfer-failed&error=failed#transfer');
    }
    throw error; // Re-throw for asyncRoute to handle 401/503
  }
}));

function walletDonateFailure(error) {
  const encoded = encodeURIComponent(error || 'failed');
  return `/wallet?status=donate-failed&donate_error=${encoded}#donate`;
}

function walletDonationPayload(body) {
  const target = String(body.target || body.recipient_type || 'community_fund');
  const recipientId = String(body.recipient_id || '').trim();
  const amount = Number(body.amount);
  return {
    amount,
    message: String(body.message || '').trim().slice(0, 255),
    recipient_type: target === 'user' ? 'user' : 'community_fund',
    recipient_id: recipientId
  };
}

router.post('/donate', requireAuth, asyncRoute(async (req, res) => {
  const payload = walletDonationPayload(req.body);

  if (!Number.isFinite(payload.amount) || payload.amount <= 0) {
    return res.redirect(walletDonateFailure('invalid'));
  }
  if (Math.round(payload.amount) !== payload.amount) {
    return res.redirect(walletDonateFailure('decimals'));
  }
  if (payload.amount > 1000) {
    return res.redirect(walletDonateFailure('too-large'));
  }
  if (payload.recipient_type === 'user' && (!payload.recipient_id || Number(payload.recipient_id) <= 0)) {
    return res.redirect(walletDonateFailure('invalid'));
  }

  try {
    await donateCredits(req.token, {
      recipient_type: payload.recipient_type,
      recipient_id: payload.recipient_type === 'user' ? Number(payload.recipient_id) : undefined,
      amount: payload.amount,
      message: payload.message
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) throw error;
    const message = String(error.message || '');
    if (/insufficient/i.test(message)) {
      return res.redirect(walletDonateFailure('insufficient'));
    }
    if (/not found|recipient/i.test(message)) {
      return res.redirect(walletDonateFailure('not-found'));
    }
    return res.redirect(walletDonateFailure('failed'));
  }

  return res.redirect('/wallet?status=donate-sent#transactions');
}));

module.exports = router;
