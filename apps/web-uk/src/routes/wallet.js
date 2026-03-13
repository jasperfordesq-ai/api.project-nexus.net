// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { getBalance, getTransactions, getTransaction, transferCredits, getUsers, ApiError } = require('../lib/api');
const { asyncRoute } = require('../lib/routeHelpers');
const { audit } = require('../lib/auditLogger');

const router = express.Router();

router.use(requireAuth);

// Wallet overview
router.get('/', asyncRoute(async (req, res) => {
  const [balanceData, transactionsData] = await Promise.all([
    getBalance(req.token),
    getTransactions(req.token, { limit: 5 })
  ]);

  res.render('wallet/index', {
    title: 'Wallet',
    balance: balanceData.balance || balanceData,
    transactions: transactionsData.items || transactionsData.data || (Array.isArray(transactionsData) ? transactionsData : []),
    successMessage: req.flash ? req.flash('success')[0] : null
  });
}));

// Transaction history
router.get('/transactions', asyncRoute(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const type = req.query.type || '';

  const transactionsData = await getTransactions(req.token, { page, limit: 20, type });

  const transactions = transactionsData.items || transactionsData.data || (Array.isArray(transactionsData) ? transactionsData : []);
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
      totalPages: pagination.totalPages || pagination.total_pages || 1,
      total: pagination.total || pagination.totalCount
    },
    filters: { type }
  });
}));

// View single transaction
router.get('/transactions/:id', asyncRoute(async (req, res) => {
  const transaction = await getTransaction(req.token, req.params.id);

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

  if (errors.length > 0) {
    const [balanceData, usersData] = await Promise.all([
      getBalance(req.token),
      getUsers(req.token)
    ]);

    return res.render('wallet/transfer', {
      title: 'Transfer credits',
      balance: balanceData.balance || balanceData,
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
