// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { getBalance, getTransactions, getTransaction, transferCredits, donateCredits, getUsers, getProfile, ApiError } = require('../lib/api');
const { asyncRoute } = require('../lib/routeHelpers');
const { audit } = require('../lib/auditLogger');

const router = express.Router();

router.use(requireAuth);

// Wallet overview
router.get('/', asyncRoute(async (req, res) => {
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

// Transaction history
router.get('/transactions', asyncRoute(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const type = req.query.type || '';

  const [transactionsData, currentUser] = await Promise.all([
    getTransactions(req.token, { page, limit: 20, type }),
    getProfile(req.token)
  ]);

  const transactions = transactionsData.items || transactionsData.data || (Array.isArray(transactionsData) ? transactionsData : []);
  // Compute relative_type (sent/received) from sender_id relative to the current user
  transactions.forEach(tx => {
    tx.relative_type = String(tx.sender_id || tx.senderId) === String(currentUser.id) ? 'sent' : 'received';
  });
  const pagination = transactionsData.pagination || {
    page,
    totalPages: 1,
    total: transactions.length
  };

  res.render('wallet/transactions', {
    title: 'Transaction history',
    transactions,
    pagination: {
      currentPage: pagination.page || pagination.currentPage,
      totalPages: pagination.pages || pagination.totalPages || pagination.total_pages || 1,
      total: pagination.total || pagination.totalCount
    },
    filters: { type },
    currentUser
  });
}));

// View single transaction
router.get('/transactions/:id', asyncRoute(async (req, res) => {
  const [transaction, currentUser] = await Promise.all([
    getTransaction(req.token, req.params.id),
    getProfile(req.token)
  ]);
  // Compute relative_type (sent/received) from sender_id relative to the current user
  transaction.relative_type = String(transaction.sender_id || transaction.senderId) === String(currentUser.id) ? 'sent' : 'received';

  res.render('wallet/transaction-detail', {
    title: 'Transaction details',
    transaction
  });
}, { notFoundTitle: 'Transaction not found' }));

// Transfer form
router.get('/transfer', asyncRoute(async (req, res) => {
  const [balanceData, usersData] = await Promise.all([
    getBalance(req.token),
    getUsers(req.token)
  ]);

  res.render('wallet/transfer', {
    title: 'Transfer credits',
    balance: balanceData.balance || balanceData,
    users: usersData.items || usersData.data || (Array.isArray(usersData) ? usersData : []),
    values: null,
    errors: null,
    fieldErrors: {},
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}));

// Process transfer
router.post('/transfer', audit.walletTransfer(), asyncRoute(async (req, res) => {
  const { receiver_id, amount, description } = req.body;

  // Basic validation
  const errors = [];
  const fieldErrors = {};

  if (!receiver_id) {
    errors.push({ text: 'Select a recipient', href: '#receiver_id' });
    fieldErrors.receiver_id = 'Select a recipient';
  }

  const amountNum = parseFloat(amount);
  if (!amount || isNaN(amountNum) || amountNum <= 0) {
    errors.push({ text: 'Enter a valid amount greater than 0', href: '#amount' });
    fieldErrors.amount = 'Enter a valid amount greater than 0';
  }

  // Fetch profile and balance for self-transfer and insufficient balance checks
  const [currentProfile, balanceData] = await Promise.all([
    getProfile(req.token),
    getBalance(req.token)
  ]);
  const balance = balanceData.balance !== undefined ? balanceData.balance : balanceData;

  if (receiver_id && String(receiver_id) === String(currentProfile.id)) {
    errors.push({ text: 'You cannot transfer credits to yourself', href: '#receiver_id' });
    fieldErrors.receiver_id = 'You cannot transfer credits to yourself';
  }

  if (!isNaN(amountNum) && amountNum > 0 && amountNum > balance) {
    errors.push({ text: 'Insufficient balance', href: '#amount' });
    fieldErrors.amount = 'Insufficient balance';
  }

  if (errors.length > 0) {
    const usersData = await getUsers(req.token);

    return res.render('wallet/transfer', {
      title: 'Transfer credits',
      balance,
      users: usersData.items || usersData.data || (Array.isArray(usersData) ? usersData : []),
      values: { receiver_id, amount, description },
      errors,
      fieldErrors,
      csrfToken: req.csrfToken ? req.csrfToken() : ''
    });
  }

  try {
    await transferCredits(req.token, parseInt(receiver_id), amountNum, description);

    if (req.flash) {
      req.flash('success', 'Transfer completed successfully');
    }
    res.redirect('/wallet');
  } catch (error) {
    // Handle validation errors from API by re-rendering form
    if (error instanceof ApiError && (error.status === 400 || error.status === 422)) {
      const [balanceData, usersData] = await Promise.all([
        getBalance(req.token),
        getUsers(req.token)
      ]);

      return res.render('wallet/transfer', {
        title: 'Transfer credits',
        balance: balanceData.balance || balanceData,
        users: usersData.items || usersData.data || (Array.isArray(usersData) ? usersData : []),
        values: req.body,
        errors: [{ text: error.message }],
        fieldErrors: error.data?.errors || {},
        csrfToken: req.csrfToken ? req.csrfToken() : ''
      });
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

router.post('/donate', asyncRoute(async (req, res) => {
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
