// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const fs = require('fs/promises');
const { ApiError, callMarketplaceApi, uploadMarketplaceListingImages } = require('../lib/api');
const { asyncRoute } = require('../lib/routeHelpers');

const router = express.Router();

const PRICE_TYPES = ['fixed', 'negotiable', 'free', 'contact'];
const CONDITIONS = ['new', 'like_new', 'good', 'fair', 'poor'];
const DELIVERY_METHODS = ['pickup', 'shipping', 'both', 'community_delivery'];
const REPORT_REASONS = ['counterfeit', 'illegal', 'unsafe', 'misleading', 'discrimination', 'ip_violation', 'other'];
const SELLER_TYPES = ['private', 'business'];
const COUPON_DISCOUNT_TYPES = ['percent', 'fixed', 'bogo'];
const COUPON_STATUSES = ['draft', 'active', 'paused', 'expired'];

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

async function uploadListingImage(token, listingId, image) {
  if (!image || !listingId) return;
  await uploadMarketplaceListingImages(token, listingId, {
    file: {
      buffer: await fs.readFile(image.filepath),
      filename: trimmed(image.originalFilename) || 'marketplace-image',
      contentType: trimmed(image.mimetype) || 'application/octet-stream',
      size: image.size
    }
  });
}

function decimalNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function checked(value) {
  return value === true || ['1', 'true', 'on', 'yes'].includes(String(value || '').toLowerCase());
}

function allowed(value, choices, fallback) {
  const text = trimmed(value);
  return choices.includes(text) ? text : fallback;
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
    return callMarketplaceApi(token, method, path);
  }

  return callMarketplaceApi(token, method, path, data);
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

function listingRedirect(id, status) {
  return `/marketplace/${id}?status=${encodeURIComponent(status)}`;
}

function mineRedirect(status) {
  return `/marketplace/mine?status=${encodeURIComponent(status)}`;
}

function offersRedirect(tab, status) {
  return `/marketplace/offers?tab=${encodeURIComponent(tab)}&status=${encodeURIComponent(status)}`;
}

function ordersRedirect(req, status) {
  const target = trimmed(req.body.redirect_to) === 'sales' || trimmed(req.body.role) === 'seller'
    ? '/marketplace/sales'
    : '/marketplace/orders';
  return `${target}?status=${encodeURIComponent(status)}`;
}

function listingPayload(body) {
  const title = trimmed(body.title, 200);
  const description = trimmed(body.description, 10000);
  const priceType = allowed(body.price_type, PRICE_TYPES, 'fixed');
  const payload = {
    title,
    description,
    price_type: priceType,
    status: 'active'
  };

  const tagline = trimmed(body.tagline, 300);
  if (tagline !== '') {
    payload.tagline = tagline;
  }

  if (priceType === 'free') {
    payload.price = null;
    payload.time_credit_price = null;
  } else {
    const price = decimalNumber(body.price);
    if (String(body.price || '').trim() !== '' && price >= 0) {
      payload.price = price;
      payload.price_currency = trimmed(body.price_currency || 'EUR', 3).toUpperCase() || 'EUR';
    }

    const timeCreditPrice = decimalNumber(body.time_credit_price);
    if (String(body.time_credit_price || '').trim() !== '' && timeCreditPrice >= 0) {
      payload.time_credit_price = timeCreditPrice;
    }
  }

  const condition = allowed(body.condition, CONDITIONS, '');
  if (condition !== '') {
    payload.condition = condition;
  }

  payload.delivery_method = allowed(body.delivery_method, DELIVERY_METHODS, 'pickup');

  const categoryId = positiveInteger(body.category_id);
  if (categoryId !== null) {
    payload.category_id = categoryId;
  }

  const location = trimmed(body.location, 255);
  if (location !== '') {
    payload.location = location;
  }

  const quantity = positiveInteger(body.quantity);
  if (quantity !== null) {
    payload.quantity = quantity;
  }

  return payload;
}

function pickupSlotPayload(body) {
  const capacity = positiveInteger(body.capacity);
  return {
    slot_start: trimmed(body.slot_start),
    slot_end: trimmed(body.slot_end),
    capacity: capacity === null ? 1 : Math.min(capacity, 1000),
    is_recurring: checked(body.is_recurring),
    is_active: body.is_active === undefined ? true : checked(body.is_active)
  };
}

function couponPayload(body) {
  const discountType = allowed(body.discount_type, COUPON_DISCOUNT_TYPES, 'percent');
  const discountValue = decimalNumber(body.discount_value);
  const payload = {
    title: trimmed(body.title, 200),
    description: trimmed(body.description, 2000),
    discount_type: discountType,
    discount_value: discountType === 'bogo' ? 0 : Math.max(0, discountValue),
    status: allowed(body.status, COUPON_STATUSES, 'draft'),
    applies_to: 'all_listings'
  };

  const code = trimmed(body.code, 64);
  if (code !== '') {
    payload.code = code;
  }

  const minOrder = positiveInteger(body.min_order_cents);
  if (minOrder !== null) {
    payload.min_order_cents = minOrder;
  }

  const maxUses = positiveInteger(body.max_uses);
  if (maxUses !== null) {
    payload.max_uses = maxUses;
  }

  const validUntil = trimmed(body.valid_until);
  if (validUntil !== '') {
    payload.valid_until = validUntil;
  }

  return payload;
}

router.post('/create', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());
  const payload = listingPayload(req.body);
  const image = uploadedFile(req, 'image');
  if (payload.title === '' || payload.description === '') {
    await removeUploadedFile(image);
    return res.redirect('/marketplace/create?status=listing-validation');
  }

  try {
    const result = await callApi(token, 'POST', '/listings', payload);
    const id = resultId(result);
    await uploadListingImage(token, id, image);
    return res.redirect(listingRedirect(id || 'mine', 'listing-created'));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    return res.redirect('/marketplace/create?status=listing-create-failed');
  } finally {
    await removeUploadedFile(image);
  }
}));

router.post('/:id(\\d+)/update', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());
  const id = Number(req.params.id);
  const payload = listingPayload(req.body);
  const image = uploadedFile(req, 'image');
  if (payload.title === '' || payload.description === '') {
    await removeUploadedFile(image);
    return res.redirect(`/marketplace/${id}/edit?status=listing-validation`);
  }

  try {
    await callApi(token, 'PUT', `/listings/${id}`, payload);
    await uploadListingImage(token, id, image);
    return res.redirect(listingRedirect(id, 'listing-saved'));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    return res.redirect(`/marketplace/${id}/edit?status=listing-save-failed`);
  } finally {
    await removeUploadedFile(image);
  }
}));

router.post('/:id(\\d+)/delete', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  return runAction(
    req,
    res,
    'DELETE',
    `/listings/${id}`,
    undefined,
    mineRedirect('deleted'),
    mineRedirect('delete-failed')
  );
}));

router.post('/:id(\\d+)/renew', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const durationDays = positiveInteger(req.body.duration_days);
  const payload = durationDays === null ? undefined : { duration_days: Math.min(durationDays, 90) };
  return runAction(
    req,
    res,
    'POST',
    `/listings/${id}/renew`,
    payload,
    mineRedirect('renewed'),
    mineRedirect('renew-failed')
  );
}));

router.post('/:id(\\d+)/save', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  return runAction(
    req,
    res,
    'POST',
    `/listings/${id}/save`,
    undefined,
    listingRedirect(id, 'saved'),
    listingRedirect(id, 'save-failed')
  );
}));

router.post('/:id(\\d+)/unsave', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const success = trimmed(req.body.redirect_to) === 'saved'
    ? '/marketplace/saved?status=unsaved'
    : listingRedirect(id, 'unsaved');
  return runAction(
    req,
    res,
    'DELETE',
    `/listings/${id}/save`,
    undefined,
    success,
    listingRedirect(id, 'unsave-failed')
  );
}));

router.post('/:id(\\d+)/buy', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const quantity = positiveInteger(req.body.quantity) || 1;
  const payload = {
    listing_id: id,
    quantity
  };

  const shippingMethod = trimmed(req.body.shipping_method, 100);
  if (shippingMethod !== '') {
    payload.shipping_method = shippingMethod;
  }

  const deliveryNotes = trimmed(req.body.delivery_notes, 500);
  if (deliveryNotes !== '') {
    payload.delivery_notes = deliveryNotes;
  }

  const couponCode = trimmed(req.body.coupon_code, 64);
  if (couponCode !== '') {
    payload.coupon_code = couponCode;
  }

  return runAction(
    req,
    res,
    'POST',
    '/orders',
    payload,
    '/marketplace/orders?status=ordered',
    `/marketplace/${id}/buy?status=order-failed`
  );
}));

router.post('/:id(\\d+)/offer', asyncRoute(async (req, res) => {
  if (!tokenFrom(req)) return res.redirect(loginRedirect());
  const id = Number(req.params.id);
  const amount = decimalNumber(req.body.amount);
  if (amount <= 0) {
    return res.redirect(`/marketplace/${id}/offer?status=offer-amount-invalid`);
  }

  const payload = { amount };
  const message = trimmed(req.body.message, 500);
  if (message !== '') {
    payload.message = message;
  }

  return runAction(
    req,
    res,
    'POST',
    `/listings/${id}/offers`,
    payload,
    '/marketplace/offers?status=offer-sent',
    `/marketplace/${id}/offer?status=offer-failed`
  );
}));

router.post('/:id(\\d+)/report', asyncRoute(async (req, res) => {
  if (!tokenFrom(req)) return res.redirect(loginRedirect());
  const id = Number(req.params.id);
  const reason = allowed(req.body.reason, REPORT_REASONS, '');
  const description = trimmed(req.body.description, 5000);
  if (reason === '' || description === '') {
    return res.redirect(`/marketplace/${id}/report?status=report-validation`);
  }

  return runAction(
    req,
    res,
    'POST',
    `/listings/${id}/report`,
    { reason, description },
    listingRedirect(id, 'reported'),
    `/marketplace/${id}/report?status=report-failed`
  );
}));

router.post('/offers/:id(\\d+)/accept', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  return runAction(
    req,
    res,
    'PUT',
    `/offers/${id}/accept`,
    undefined,
    offersRedirect('received', 'accepted'),
    offersRedirect('received', 'accept-failed')
  );
}));

router.post('/offers/:id(\\d+)/decline', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  return runAction(
    req,
    res,
    'PUT',
    `/offers/${id}/decline`,
    undefined,
    offersRedirect('received', 'declined'),
    offersRedirect('received', 'decline-failed')
  );
}));

router.post('/offers/:id(\\d+)/withdraw', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  return runAction(
    req,
    res,
    'DELETE',
    `/offers/${id}`,
    undefined,
    offersRedirect('sent', 'withdrawn'),
    offersRedirect('sent', 'withdraw-failed')
  );
}));

router.post('/orders/:id(\\d+)/ship', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const payload = {};
  const trackingNumber = trimmed(req.body.tracking_number, 255);
  if (trackingNumber !== '') {
    payload.tracking_number = trackingNumber;
  }
  const trackingUrl = trimmed(req.body.tracking_url, 500);
  if (trackingUrl !== '') {
    payload.tracking_url = trackingUrl;
  }
  const shippingMethod = trimmed(req.body.shipping_method, 100);
  if (shippingMethod !== '') {
    payload.shipping_method = shippingMethod;
  }

  return runAction(
    req,
    res,
    'PUT',
    `/orders/${id}/ship`,
    payload,
    '/marketplace/sales?status=shipped',
    '/marketplace/sales?status=ship-failed'
  );
}));

router.post('/orders/:id(\\d+)/confirm', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  return runAction(
    req,
    res,
    'PUT',
    `/orders/${id}/confirm-delivery`,
    undefined,
    '/marketplace/orders?status=confirmed',
    '/marketplace/orders?status=confirm-failed'
  );
}));

router.post('/orders/:id(\\d+)/cancel', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const reason = trimmed(req.body.reason, 500) || 'Cancelled from the accessible marketplace.';
  return runAction(
    req,
    res,
    'PUT',
    `/orders/${id}/cancel`,
    { reason },
    ordersRedirect(req, 'cancelled'),
    ordersRedirect(req, 'cancel-failed')
  );
}));

router.post('/orders/:id(\\d+)/pay', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  return runAction(
    req,
    res,
    'POST',
    '/payments/create-intent',
    { order_id: id },
    '/marketplace/orders?status=payment-started',
    '/marketplace/orders?status=pay-failed'
  );
}));

router.post('/orders/:id(\\d+)/rate', asyncRoute(async (req, res) => {
  if (!tokenFrom(req)) return res.redirect(loginRedirect());
  const id = Number(req.params.id);
  const rating = positiveInteger(req.body.rating);
  if (rating === null || rating < 1 || rating > 5) {
    return res.redirect(ordersRedirect(req, 'rate-invalid'));
  }

  return runAction(
    req,
    res,
    'POST',
    `/orders/${id}/rate`,
    {
      rating,
      comment: trimmed(req.body.comment, 1000),
      is_anonymous: checked(req.body.is_anonymous)
    },
    ordersRedirect(req, 'rated'),
    ordersRedirect(req, 'rate-failed')
  );
}));

router.post('/onboarding', asyncRoute(async (req, res) => {
  if (!tokenFrom(req)) return res.redirect(loginRedirect());
  const sellerType = allowed(req.body.seller_type, SELLER_TYPES, 'business');
  const businessName = trimmed(req.body.business_name, 200);
  const displayName = trimmed(req.body.display_name, 100);
  if (sellerType === 'business' && businessName === '') {
    return res.redirect('/marketplace/onboarding?status=business-name-required');
  }
  if (displayName === '') {
    return res.redirect('/marketplace/onboarding?status=display-name-required');
  }

  const payload = {
    seller_type: sellerType,
    display_name: displayName
  };
  if (businessName !== '') {
    payload.business_name = businessName;
  }
  const bio = trimmed(req.body.bio, 1000);
  if (bio !== '') {
    payload.bio = bio;
  }

  return runAction(
    req,
    res,
    'POST',
    '/seller/profile',
    payload,
    '/marketplace/onboarding?status=onboarding-complete',
    '/marketplace/onboarding?status=onboarding-failed'
  );
}));

router.post('/slots', asyncRoute(async (req, res) => runAction(
  req,
  res,
  'POST',
  '/seller/pickup-slots',
  pickupSlotPayload(req.body),
  '/marketplace/slots?status=slot-created',
  '/marketplace/slots?status=slot-create-failed'
)));

router.post('/slots/scan', asyncRoute(async (req, res) => {
  if (!tokenFrom(req)) return res.redirect(loginRedirect());
  const qrCode = trimmed(req.body.qr_code, 64);
  if (qrCode === '') {
    return res.redirect('/marketplace/slots?status=pickup-scan-failed');
  }

  return runAction(
    req,
    res,
    'POST',
    '/seller/pickup-scan',
    { qr_code: qrCode },
    '/marketplace/slots?status=pickup-confirmed',
    '/marketplace/slots?status=pickup-scan-failed'
  );
}));

router.post('/slots/:id(\\d+)/update', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  return runAction(
    req,
    res,
    'PUT',
    `/seller/pickup-slots/${id}`,
    pickupSlotPayload(req.body),
    `/marketplace/slots/${id}/edit?status=slot-saved`,
    `/marketplace/slots/${id}/edit?status=slot-save-failed`
  );
}));

router.post('/slots/:id(\\d+)/delete', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  return runAction(
    req,
    res,
    'DELETE',
    `/seller/pickup-slots/${id}`,
    undefined,
    '/marketplace/slots?status=slot-deleted',
    '/marketplace/slots?status=slot-delete-failed'
  );
}));

router.post('/coupons/new', asyncRoute(async (req, res) => {
  if (!tokenFrom(req)) return res.redirect(loginRedirect());
  const payload = couponPayload(req.body);
  if (payload.title === '') {
    return res.redirect('/marketplace/coupons/new?status=coupon-title-required');
  }

  return runAction(
    req,
    res,
    'POST',
    '/seller/coupons',
    payload,
    '/marketplace/coupons?status=coupon-created',
    '/marketplace/coupons/new?status=coupon-create-failed'
  );
}));

router.post('/coupons/:id(\\d+)/update', asyncRoute(async (req, res) => {
  if (!tokenFrom(req)) return res.redirect(loginRedirect());
  const id = Number(req.params.id);
  const payload = couponPayload(req.body);
  if (payload.title === '') {
    return res.redirect(`/marketplace/coupons/${id}/edit?status=coupon-title-required`);
  }

  return runAction(
    req,
    res,
    'PUT',
    `/seller/coupons/${id}`,
    payload,
    `/marketplace/coupons/${id}/edit?status=coupon-saved`,
    `/marketplace/coupons/${id}/edit?status=coupon-save-failed`
  );
}));

router.post('/coupons/:id(\\d+)/delete', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  return runAction(
    req,
    res,
    'DELETE',
    `/seller/coupons/${id}`,
    undefined,
    '/marketplace/coupons?status=coupon-deleted',
    '/marketplace/coupons?status=coupon-delete-failed'
  );
}));

module.exports = router;
