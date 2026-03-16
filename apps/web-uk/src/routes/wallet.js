// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { getBalance, getTransactions, getTransaction, transferCredits, getUsers, getProfile, ApiError } = require('../lib/api');
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

module.exports = router;
