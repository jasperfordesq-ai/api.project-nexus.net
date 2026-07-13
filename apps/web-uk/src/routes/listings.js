// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const fs = require('fs/promises');
const { requireAuth } = require('../middleware/auth');
const {
  getListings,
  getListing,
  createListing,
  updateListing,
  deleteListing,
  getListingCategories,
  setListingSkillTags,
  uploadListingImage,
  callListingApi,
  createExchangeRequest,
  getExchangeConfig,
  checkExchangeForListing,
  createComment,
  getComments,
  toggleFeedLike,
  callWalletApi,
  ApiError
} = require('../lib/api');
const { asyncRoute } = require('../lib/routeHelpers');
const { audit } = require('../lib/auditLogger');
const { getRequestIntlLocale } = require('../lib/request-intl-locale');
const { getRequestProfile } = require('../lib/request-profile');
const { resolveBackendAssetUrl, flagEnabled } = require('../lib/accessible-shell');

const router = express.Router();

const LISTING_CONFIG_DEFAULTS = Object.freeze({
  'listing.allow_offers': true,
  'listing.allow_requests': true,
  'listing.require_category': true,
  'listing.require_location': false,
  'listing.require_hours_estimate': false,
  'listing.enable_skill_tags': true,
  'listing.enable_service_type': true,
  'listing.require_image': false,
  'listing.min_title_length': 5,
  'listing.min_description_length': 20,
  'listing.max_image_size_mb': 8
});
const LISTING_SERVICE_TYPES = new Set(['physical_only', 'remote_only', 'hybrid', 'location_dependent']);

function tokenFrom(req) {
  return (req.signedCookies && req.signedCookies.token) || req.token || '';
}

function trimmed(value, limit = null) {
  const text = String(value || '').trim();
  return limit === null ? text : text.slice(0, limit);
}

function positiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function boundedNumber(value, min, max, fallback = null) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, number));
}

function dataFrom(result) {
  return result && typeof result === 'object' && result.data !== undefined
    ? result.data
    : result;
}

function characterLength(value) {
  return Array.from(String(value || '')).length;
}

function collectionFrom(result) {
  const data = dataFrom(result);
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  if (data && Array.isArray(data.data)) return data.data;
  if (Array.isArray(result?.items)) return result.items;
  return [];
}

function listingFrom(result) {
  const data = dataFrom(result);
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
  return data.listing && typeof data.listing === 'object' ? data.listing : data;
}

function profileFrom(result) {
  const data = dataFrom(result);
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
  return data.user || data.profile || data;
}

function booleanValue(value, fallback) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const normalized = trimmed(value).toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function numberValue(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function listingConfigFrom(req) {
  const tenant = req.accessibleRouting?.tenant && typeof req.accessibleRouting.tenant === 'object'
    ? req.accessibleRouting.tenant
    : {};
  const configured = tenant.listing_config && typeof tenant.listing_config === 'object'
    ? tenant.listing_config
    : {};
  const config = { ...LISTING_CONFIG_DEFAULTS, ...configured };

  return {
    allowOffers: booleanValue(config['listing.allow_offers'], true),
    allowRequests: booleanValue(config['listing.allow_requests'], true),
    requireCategory: booleanValue(config['listing.require_category'], true),
    requireLocation: booleanValue(config['listing.require_location'], false),
    requireHours: booleanValue(config['listing.require_hours_estimate'], false),
    enableSkillTags: booleanValue(config['listing.enable_skill_tags'], true),
    enableServiceType: booleanValue(config['listing.enable_service_type'], true),
    requireImage: booleanValue(config['listing.require_image'], false),
    minTitleLength: Math.round(numberValue(config['listing.min_title_length'], 5, 1, 255)),
    minDescriptionLength: Math.round(numberValue(config['listing.min_description_length'], 20, 1, 10000)),
    maxImageSizeMb: numberValue(config['listing.max_image_size_mb'], 8, 1, 25)
  };
}

function listingCategoryFrom(value) {
  const category = value && typeof value === 'object' ? value : {};
  const id = positiveInteger(category.id);
  const name = trimmed(category.name || category.title);
  return id !== null && name ? { id, name } : null;
}

async function listingFormSupport(req) {
  const config = listingConfigFrom(req);
  let setupErrorMessage = null;
  let categoriesResult;

  try {
    categoriesResult = await getListingCategories(tokenFrom(req));
  } catch (error) {
    if (isAuthError(error)) throw error;
    setupErrorMessage = 'Sorry, there is a problem loading listing categories.';
    categoriesResult = { data: [] };
  }

  const categories = collectionFrom(categoriesResult)
    .map(listingCategoryFrom)
    .filter(Boolean);
  const allowedTypes = [];
  if (config.allowOffers) allowedTypes.push('offer');
  if (config.allowRequests) allowedTypes.push('request');
  if (!setupErrorMessage && config.requireCategory && categories.length === 0) {
    setupErrorMessage = 'No listing categories are currently available. Contact your community administrator.';
  }
  if (!setupErrorMessage && allowedTypes.length === 0) {
    setupErrorMessage = 'This community is not currently accepting offers or requests.';
  }

  return { config, categories, allowedTypes, setupErrorMessage };
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

async function uploadListingCoverImage(token, listingId, image) {
  if (!image || !image.filepath || listingId === null) return;
  const buffer = await fs.readFile(image.filepath);
  await uploadListingImage(token, listingId, {
    file: {
      buffer,
      filename: trimmed(image.originalFilename) || 'listing-image',
      contentType: trimmed(image.mimetype) || 'application/octet-stream',
      size: image.size
    }
  });
}

function skillTagsFrom(value) {
  const seen = new Set();
  return String(value || '')
    .split(',')
    .map(tag => trimmed(tag, 100))
    .filter((tag) => {
      const key = tag.toLocaleLowerCase('en');
      if (!tag || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 10);
}

function listingFormValues(source = {}, listing = null) {
  const base = listing && typeof listing === 'object' ? listing : {};
  const values = source && typeof source === 'object' ? source : {};
  const skillTags = values.skill_tags !== undefined
    ? values.skill_tags
    : (Array.isArray(base.skill_tags) ? base.skill_tags.join(', ') : (base.skill_tags || ''));

  return {
    title: values.title !== undefined ? values.title : (base.title || ''),
    description: values.description !== undefined ? values.description : (base.description || ''),
    type: values.type !== undefined ? values.type : (base.type || 'offer'),
    category_id: values.category_id !== undefined ? values.category_id : (base.category_id || base.category?.id || ''),
    hours_estimate: values.hours_estimate !== undefined
      ? values.hours_estimate
      : (base.hours_estimate ?? base.estimated_hours ?? ''),
    service_type: values.service_type !== undefined ? values.service_type : (base.service_type || 'physical_only'),
    location: values.location !== undefined ? values.location : (base.location || ''),
    skill_tags: skillTags,
    has_existing_image: values.has_existing_image === '1' || values.has_existing_image === true || Boolean(base.image_url)
  };
}

function listingPayloadFrom(values) {
  const hours = trimmed(values.hours_estimate);
  return {
    title: trimmed(values.title),
    description: trimmed(values.description),
    type: trimmed(values.type),
    category_id: positiveInteger(values.category_id),
    hours_estimate: hours === '' ? null : Number(hours),
    service_type: LISTING_SERVICE_TYPES.has(trimmed(values.service_type))
      ? trimmed(values.service_type)
      : 'physical_only',
    location: trimmed(values.location) || null
  };
}

function validateListingValues(values, config, allowedTypes, image = null, hasExistingImage = false) {
  const errors = [];
  const fieldErrors = {};
  const add = (field, text) => {
    if (fieldErrors[field]) return;
    fieldErrors[field] = text;
    errors.push({ text, href: `#${field}` });
  };
  const title = trimmed(values.title);
  const description = trimmed(values.description);
  const type = trimmed(values.type);
  const categoryText = trimmed(values.category_id);
  const hoursText = trimmed(values.hours_estimate);
  const location = trimmed(values.location);
  const titleLength = characterLength(title);
  const descriptionLength = characterLength(description);
  const locationLength = characterLength(location);

  if (!title) add('title', 'Enter a title');
  else if (titleLength < config.minTitleLength) add('title', `Title must be at least ${config.minTitleLength} characters`);
  else if (titleLength > 255) add('title', 'Title must be 255 characters or fewer');

  if (!description) add('description', 'Enter a description');
  else if (descriptionLength < config.minDescriptionLength) add('description', `Description must be at least ${config.minDescriptionLength} characters`);
  else if (descriptionLength > 10000) add('description', 'Description must be 10,000 characters or fewer');

  if (!allowedTypes.includes(type)) add('type', 'Select an available listing type');
  if (config.requireCategory && !categoryText) add('category_id', 'Select a category');
  else if (categoryText && positiveInteger(categoryText) === null) add('category_id', 'Select a valid category');

  if (config.requireHours && !hoursText) add('hours_estimate', 'Enter the estimated hours');
  if (hoursText) {
    const hours = Number(hoursText);
    if (!Number.isFinite(hours) || hours < 0.5 || hours > 2000) {
      add('hours_estimate', 'Estimated hours must be between 0.5 and 2,000');
    }
  }

  if (config.requireLocation && !location) add('location', 'Enter a location');
  else if (locationLength > 255) add('location', 'Location must be 255 characters or fewer');

  if (config.enableServiceType && !LISTING_SERVICE_TYPES.has(trimmed(values.service_type))) {
    add('service_type', 'Select how the service will be delivered');
  }
  if (config.requireImage && !image && !hasExistingImage) add('image', 'Choose an image');
  if (image) {
    const allowedMimes = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
    if (!allowedMimes.has(trimmed(image.mimetype).toLowerCase())) {
      add('image', 'Choose a JPEG, PNG, GIF or WebP image');
    } else if (Number(image.size) > config.maxImageSizeMb * 1024 * 1024) {
      add('image', `Image must be ${config.maxImageSizeMb} MB or smaller`);
    }
  }

  return { errors, fieldErrors };
}

function apiErrorsFrom(error) {
  if (!(error instanceof ApiError) || !error.data || typeof error.data !== 'object') return [];
  const entries = error.data.errors;
  if (Array.isArray(entries)) {
    return entries
      .filter(entry => entry && typeof entry === 'object')
      .map(entry => ({
        code: trimmed(entry.code).toUpperCase(),
        message: trimmed(entry.message),
        field: trimmed(entry.field)
      }));
  }
  if (entries && typeof entries === 'object') {
    return Object.entries(entries).flatMap(([field, messages]) => {
      const values = Array.isArray(messages) ? messages : [messages];
      return values.map(message => ({
        code: 'VALIDATION_ERROR',
        message: trimmed(message),
        field
      })).filter(entry => entry.message);
    });
  }
  return [];
}

function listingFormErrorState(error, fallback) {
  const apiErrors = apiErrorsFrom(error);
  if (apiErrors.length === 0) {
    return { errors: [{ text: trimmed(error?.message) || fallback }], fieldErrors: {} };
  }
  const fieldAliases = { tags: 'skill_tags' };
  const fieldErrors = {};
  const errors = apiErrors.map((entry) => {
    const field = fieldAliases[entry.field] || entry.field;
    const text = entry.message || fallback;
    if (field && !fieldErrors[field]) fieldErrors[field] = text;
    return { text, ...(field ? { href: `#${field}` } : {}) };
  });
  return { errors, fieldErrors };
}

async function listingFormViewData(req, options) {
  const support = await listingFormSupport(req);
  const currentCategoryId = positiveInteger(
    options.values?.category_id
    || options.listing?.category_id
    || options.listing?.category?.id
  );
  if (currentCategoryId !== null && !support.categories.some(category => category.id === currentCategoryId)) {
    support.categories.push({
      id: currentCategoryId,
      name: trimmed(options.listing?.category_name || options.listing?.category?.name)
        || `Current category (${currentCategoryId})`
    });
  }
  return {
    title: options.title,
    listing: options.listing || null,
    listingImageUrl: resolveBackendAssetUrl(options.listing?.image_url || options.listing?.imageUrl),
    values: options.values || null,
    errors: options.errors || null,
    fieldErrors: options.fieldErrors || {},
    ...support,
    setupErrorMessage: options.setupErrorMessage || support.setupErrorMessage,
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  };
}

function renderForbidden(res, error) {
  return res.status(403).render('errors/403', {
    title: 'Forbidden',
    message: trimmed(error?.message) || 'You do not have permission to manage this listing.'
  });
}

function isOnboardingRequired(error) {
  return error instanceof ApiError && error.status === 403 && apiErrorCode(error) === 'ONBOARDING_REQUIRED';
}

function listingStatusMessage(status) {
  const messages = {
    'listing-created': 'Listing created successfully',
    'listing-updated': 'Listing updated successfully',
    'listing-deleted': 'Listing deleted successfully'
  };
  return messages[trimmed(status)] || null;
}

function listingStatusErrorMessage(status) {
  const messages = {
    'exchange-disabled': 'Exchange workflows are not enabled for this community.',
    'own-listing': 'You cannot request an exchange for your own listing.',
    'listing-delete-failed': 'The listing could not be deleted.'
  };
  return messages[trimmed(status)] || null;
}

function listingDetailStatus(status, t) {
  const successKeys = {
    'listing-created': 'listings.create.created',
    'listing-updated': 'listings.edit.updated',
    'listing-saved': 'polish_listings.status_listing_saved',
    'listing-unsaved': 'polish_listings.status_listing_unsaved',
    'listing-renewed': 'polish_listings.status_listing_renewed',
    'listing-reported': 'polish_listings.status_listing_reported'
  };
  const errorKeys = {
    'listing-delete-failed': 'listings.edit.delete_failed',
    'save-failed': 'polish_listings.status_listing_save_failed',
    'unsave-failed': 'polish_listings.status_listing_save_failed',
    'renew-failed': 'polish_listings.status_listing_renew_failed',
    'report-failed': 'polish_listings.status_listing_report_failed',
    'already-reported': 'polish_listings.status_listing_already_reported'
  };
  const normalized = trimmed(status);
  if (successKeys[normalized]) return { type: 'success', message: t(successKeys[normalized]) };
  if (errorKeys[normalized]) return { type: 'error', message: t(errorKeys[normalized]) };
  return null;
}

function listingGalleryFrom(listing) {
  const images = Array.isArray(listing.images) ? listing.images : [];
  return images.map((image) => {
    const item = image && typeof image === 'object' ? image : {};
    const url = resolveBackendAssetUrl(item.url || item.image_url || item.imageUrl);
    if (!url) return null;
    return {
      url,
      altText: trimmed(item.alt_text || item.altText)
    };
  }).filter(Boolean);
}

function listingSkillTagsFrom(listing) {
  const tags = Array.isArray(listing.skill_tags) ? listing.skill_tags : [];
  const seen = new Set();
  return tags.map((tag) => {
    const value = tag && typeof tag === 'object' ? (tag.name || tag.tag) : tag;
    return trimmed(value);
  }).filter((tag) => {
    const key = tag.toLocaleLowerCase('en');
    if (!tag || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function listingAuthorFrom(listing) {
  const user = listing.user && typeof listing.user === 'object' ? listing.user : {};
  const name = trimmed(listing.author_name || listing.authorName || user.name);
  const id = listingOwnerId(listing);
  if (!name) return null;
  return {
    id,
    name,
    initial: Array.from(name)[0]?.toLocaleUpperCase() || '',
    avatarUrl: resolveBackendAssetUrl(listing.author_avatar || listing.authorAvatar || user.avatar_url || user.avatar),
    tagline: trimmed(listing.author_tagline || listing.authorTagline || user.tagline),
    rating: Number.isFinite(Number(listing.author_rating)) ? Number(listing.author_rating) : null,
    reviewsCount: Math.max(0, Number(listing.author_reviews_count) || 0),
    exchangesCount: Math.max(0, Number(listing.author_exchanges_count) || 0)
  };
}

function relatedListingsFrom(value) {
  if (!Array.isArray(value)) return [];
  return value.map((listing) => {
    const item = listing && typeof listing === 'object' ? listing : {};
    const id = positiveInteger(item.id);
    const title = trimmed(item.title || item.name);
    return id !== null && title ? { id, title } : null;
  }).filter(Boolean);
}

async function exchangeWorkflowEnabled(token) {
  const payload = await getExchangeConfig(token);
  const data = dataFrom(payload) || {};
  return data.exchange_workflow_enabled === true;
}

async function listingExchangeContext(token, listingId) {
  const configPayload = await getExchangeConfig(token);
  const config = dataFrom(configPayload) || {};
  const exchangeWorkflowEnabled = config.exchange_workflow_enabled === true;

  if (!exchangeWorkflowEnabled) {
    return {
      exchangeWorkflowEnabled: false,
      directMessagingEnabled: config.direct_messaging_enabled === true,
      exchangeContextReady: true,
      activeExchange: null
    };
  }

  const activePayload = await checkExchangeForListing(token, listingId);
  const active = dataFrom(activePayload);
  return {
    exchangeWorkflowEnabled: true,
    directMessagingEnabled: config.direct_messaging_enabled === true,
    exchangeContextReady: true,
    activeExchange: active && typeof active === 'object' && positiveInteger(active.id) !== null
      ? active
      : null
  };
}

function loginRedirect() {
  return '/login?status=auth-required';
}

function urlFor(res, path) {
  return typeof res.locals?.urlFor === 'function' ? res.locals.urlFor(path) : path;
}

function redirectTo(res, path) {
  return res.redirect(urlFor(res, path));
}

function isAuthError(error) {
  return error instanceof ApiError && error.status === 401;
}

function apiErrorCode(error) {
  const data = error && error.data && typeof error.data === 'object' ? error.data : {};
  return apiErrorsFrom(error)[0]?.code || String(data.code || data.error || data.error_code || '').toUpperCase();
}

function redirectOnAuthError(error, res) {
  if (isAuthError(error)) {
    redirectTo(res, loginRedirect());
    return true;
  }
  return false;
}

function listingRedirect(id, status, fragment = '') {
  return `/listings/${id}?status=${encodeURIComponent(status)}${fragment}`;
}

async function callListing(token, method, path, data = undefined) {
  if (data === undefined) {
    return callListingApi(token, method, path);
  }

  return callListingApi(token, method, path, data);
}

async function runListingAction(req, res, method, path, data, successRedirect, failureRedirect) {
  const token = tokenFrom(req);
  if (!token) {
    return redirectTo(res, loginRedirect());
  }

  try {
    await callListing(token, method, path, data);
    return redirectTo(res, successRedirect);
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    return redirectTo(res, failureRedirect);
  }
}

function listingType(value) {
  const type = trimmed(value).toLowerCase();
  return ['offer', 'request'].includes(type) ? type : 'offer';
}

function generateDescriptionRedirect(listingId, status) {
  const target = listingId === null ? '/listings/new' : `/listings/${listingId}/edit`;
  return `${target}?status=${encodeURIComponent(status)}#description`;
}

function reportPayload(body) {
  const allowedReasons = new Set(['inappropriate', 'safety_concern', 'misleading', 'spam', 'not_timebank_service', 'other']);
  const reason = trimmed(body.reason);
  if (!allowedReasons.has(reason)) {
    return null;
  }

  return {
    reason,
    details: trimmed(body.details, 500) || null
  };
}

function listingOwnerId(listing) {
  return positiveInteger(listing && (listing.user_id || listing.author_id || listing.userId || listing.authorId))
    || positiveInteger(listing && listing.user && listing.user.id)
    || positiveInteger(listing && listing.provider && listing.provider.id)
    || positiveInteger(listing && listing.public_contract && listing.public_contract.provider && listing.public_contract.provider.id);
}

function listingReportStatus(status) {
  const messages = {
    'report-invalid': 'Select a reason for reporting',
    'report-failed': 'We could not submit your report. Please try again.',
    'already-reported': 'You have already reported this listing.'
  };
  const message = messages[trimmed(status)];
  return message ? { type: 'error', message } : null;
}

function listingReportReasons() {
  return [
    { value: 'inappropriate', label: 'Inappropriate content' },
    { value: 'safety_concern', label: 'Safety concern' },
    { value: 'misleading', label: 'Misleading information' },
    { value: 'spam', label: 'Spam or misleading' },
    { value: 'not_timebank_service', label: 'Not a timebank service' },
    { value: 'other', label: 'Other' }
  ];
}

function suggestedExchangeHours(listing) {
  const raw = Number(listing && (listing.hours_estimate ?? listing.estimated_hours));
  const hours = Number.isFinite(raw) && raw > 0 ? raw : 1;
  return Math.max(0.25, Math.min(24, hours));
}

function oneDecimal(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(1) : '';
}

function exchangeRequestStatus(status) {
  const messages = {
    'compliance-failed': 'This exchange needs requirements to be resolved before it can be requested.',
    'exchange-failed': 'The exchange request could not be created.'
  };
  const message = messages[trimmed(status)];
  return message ? { type: 'error', message } : null;
}

function listingAuthorName(listing) {
  return trimmed(listing && (listing.author_name || listing.authorName))
    || trimmed(listing && listing.user && listing.user.name)
    || '';
}

function listingAnalyticsDays(value) {
  const allowed = new Set([7, 14, 30, 60, 90]);
  const days = Number(value);
  return allowed.has(days) ? days : 30;
}

function integerLabel(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number).toLocaleString(getRequestIntlLocale()) : '0';
}

function decimalLabel(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0';
  return number.toLocaleString(getRequestIntlLocale(), { maximumFractionDigits: 1 });
}

function dateParts(value) {
  const text = trimmed(value);
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]) - 1,
    day: Number(match[3])
  };
}

function dateLabel(value, month = 'long') {
  const parts = dateParts(value);
  if (!parts) return '';
  return new Intl.DateTimeFormat(getRequestIntlLocale(), {
    day: 'numeric',
    month,
    year: month === 'long' ? 'numeric' : undefined,
    timeZone: 'UTC'
  }).format(new Date(Date.UTC(parts.year, parts.month, parts.day)));
}

function contactTypeLabel(value) {
  const labels = {
    message: 'Message',
    phone: 'Phone',
    email: 'Email',
    exchange_request: 'Exchange request'
  };
  const type = trimmed(value);
  if (labels[type]) return labels[type];
  return type
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function analyticsSeries(rows) {
  const series = Array.isArray(rows) ? rows : [];
  const max = series.reduce((highest, row) => Math.max(highest, Number(row && row.count) || 0), 1);
  return series.map((row) => {
    const count = Math.max(0, Number(row && row.count) || 0);
    return {
      dateLabel: dateLabel(row && row.date, 'short'),
      count,
      countLabel: integerLabel(count),
      max
    };
  });
}

function decorateListingAnalytics(result) {
  const data = dataFrom(result) || {};
  const summary = data && typeof data.summary === 'object' && data.summary !== null ? data.summary : {};
  const viewsOverTime = analyticsSeries(data.views_over_time || data.viewsOverTime);
  const contactsOverTime = analyticsSeries(data.contacts_over_time || data.contactsOverTime);
  const contactTypes = (Array.isArray(data.contact_types || data.contactTypes) ? (data.contact_types || data.contactTypes) : [])
    .map((row) => ({
      label: contactTypeLabel(row && (row.contact_type || row.contactType)),
      countLabel: integerLabel(row && row.count)
    }));
  const trend = Number(summary.views_trend_percent ?? summary.viewsTrendPercent ?? 0);

  return {
    hasData: Object.keys(summary).length > 0 || viewsOverTime.length > 0 || contactsOverTime.length > 0,
    summary: {
      totalViews: integerLabel(summary.total_views ?? summary.totalViews),
      uniqueViewers: integerLabel(summary.unique_viewers ?? summary.uniqueViewers),
      totalContacts: integerLabel(summary.total_contacts ?? summary.totalContacts),
      totalSaves: integerLabel(summary.total_saves ?? summary.totalSaves),
      contactRate: decimalLabel(summary.contact_rate ?? summary.contactRate),
      saveRate: decimalLabel(summary.save_rate ?? summary.saveRate),
      trendLabel: trend > 0
        ? `Up ${decimalLabel(Math.abs(trend))}% on the previous 7 days`
        : trend < 0
          ? `Down ${decimalLabel(Math.abs(trend))}% on the previous 7 days`
          : 'No change on the previous 7 days'
    },
    createdAtLabel: dateLabel(data.created_at || data.createdAt),
    expiresAtLabel: dateLabel(data.expires_at || data.expiresAt),
    viewsOverTime,
    contactsOverTime,
    contactTypes
  };
}

function listingCommentsStatus(status, t) {
  const states = {
    'comment-added': { type: 'success', title: t('states.success_title'), message: t('govuk_alpha_listings.comments.states.comment-added') },
    'reply-added': { type: 'success', title: t('states.success_title'), message: t('govuk_alpha_listings.comments.states.reply-added') },
    'comment-invalid': { type: 'error', title: t('states.error_title'), message: t('govuk_alpha_listings.comments.states.comment-invalid'), anchor: 'body' },
    'comment-failed': { type: 'error', title: t('states.error_title'), message: t('govuk_alpha_listings.comments.states.comment-failed'), anchor: 'body' }
  };
  return states[trimmed(status)] || null;
}

function normalizeListingComment(comment, depth = 0) {
  const item = comment && typeof comment === 'object' ? comment : {};
  const replies = Array.isArray(item.replies) && depth < 4
    ? item.replies.map((reply) => normalizeListingComment(reply, depth + 1))
    : [];
  const author = item.author && typeof item.author === 'object' ? item.author : {};

  return {
    id: positiveInteger(item.id),
    content: trimmed(item.content || item.body || item.text, 5000),
    authorName: trimmed(author.name || item.author_name || item.authorName),
    createdAtLabel: dateLabel(item.created_at || item.createdAt),
    edited: Boolean(item.edited || item.is_edited || item.isEdited),
    replies
  };
}

function commentsPayload(result) {
  const data = dataFrom(result);
  if (Array.isArray(data)) {
    return { comments: data.map((comment) => normalizeListingComment(comment)), count: data.length };
  }

  const object = data && typeof data === 'object' ? data : {};
  const rows = Array.isArray(object.comments) ? object.comments : [];
  const comments = rows.map((comment) => normalizeListingComment(comment));
  const count = positiveInteger(object.count || object.total || object.comments_count || object.commentsCount);
  return { comments, count: count || countListingComments(comments) };
}

function countListingComments(comments) {
  return comments.reduce((total, comment) => total + 1 + countListingComments(comment.replies || []), 0);
}

async function walletBalanceForExchange(token) {
  try {
    const result = await callWalletApi(token, 'GET', '/balance');
    const data = dataFrom(result) || {};
    const balance = Number(data.balance ?? data.available_balance ?? data.current_balance);
    return Number.isFinite(balance) ? balance : null;
  } catch {
    return null;
  }
}

router.post('/generate-description', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return redirectTo(res, loginRedirect());

  const listingId = positiveInteger(req.body.listing_id);
  const title = trimmed(req.body.title, 255);
  if (title === '') {
    return redirectTo(res, generateDescriptionRedirect(listingId, 'ai-title-required'));
  }

  const payload = {
    title,
    type: listingType(req.body.type),
    category: trimmed(req.body.category || req.body.category_name || req.body.category_id),
    notes: trimmed(req.body.notes || req.body.description, 5000)
  };

  if (payload.category === '') delete payload.category;
  if (payload.notes === '') delete payload.notes;

  let status = 'ai-generated';
  try {
    await callListing(token, 'POST', '/generate-description', payload);
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    status = error instanceof ApiError && error.status === 403 ? 'ai-disabled' : 'ai-failed';
  }

  return redirectTo(res, generateDescriptionRedirect(listingId, status));
}));

router.post('/:id(\\d+)/save', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  return runListingAction(
    req,
    res,
    'POST',
    `/${id}/save`,
    undefined,
    listingRedirect(id, 'listing-saved'),
    listingRedirect(id, 'save-failed')
  );
}));

router.post('/:id(\\d+)/unsave', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  return runListingAction(
    req,
    res,
    'DELETE',
    `/${id}/save`,
    undefined,
    listingRedirect(id, 'listing-unsaved'),
    listingRedirect(id, 'unsave-failed')
  );
}));

router.post('/:id(\\d+)/renew', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  return runListingAction(
    req,
    res,
    'POST',
    `/${id}/renew`,
    undefined,
    listingRedirect(id, 'listing-renewed'),
    listingRedirect(id, 'renew-failed')
  );
}));

router.post('/:id(\\d+)/like', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return redirectTo(res, loginRedirect());

  const id = Number(req.params.id);
  let status = 'like-failed';
  try {
    const result = await toggleFeedLike(token, {
      target_type: 'listing',
      target_id: id
    });
    const data = dataFrom(result);
    status = data && data.action === 'unliked' ? 'unliked' : 'liked';
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
  }

  return redirectTo(res, listingRedirect(id, status, '#like'));
}));

router.post('/:id(\\d+)/comments', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return redirectTo(res, loginRedirect());

  const id = Number(req.params.id);
  const body = trimmed(req.body.body || req.body.content, 5000);
  if (body === '') {
    return redirectTo(res, `/listings/${id}/comments?status=comment-invalid#add-comment`);
  }

  const parentId = positiveInteger(req.body.parent_id);
  const payload = {
    target_type: 'listing',
    target_id: id,
    content: body
  };
  if (parentId !== null) {
    payload.parent_id = parentId;
  }

  let status = parentId !== null ? 'reply-added' : 'comment-added';
  try {
    await createComment(token, payload);
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    status = error instanceof ApiError && [400, 422].includes(error.status)
      ? 'comment-invalid'
      : 'comment-failed';
  }

  return redirectTo(res, `/listings/${id}/comments?status=${status}#add-comment`);
}));

router.post('/:listingId(\\d+)/exchange-request', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return redirectTo(res, loginRedirect());

  const listingId = Number(req.params.listingId);
  const workflowEnabled = await exchangeWorkflowEnabled(token);
  if (!workflowEnabled) {
    return redirectTo(res, listingRedirect(listingId, 'exchange-disabled'));
  }

  const prepTime = trimmed(req.body.prep_time) === ''
    ? null
    : boundedNumber(req.body.prep_time, 0, 24, null);
  const message = trimmed(req.body.message, 5000);
  const payload = {
    listing_id: listingId,
    proposed_hours: boundedNumber(req.body.proposed_hours, 0.25, 24, 1)
  };
  if (prepTime !== null) {
    payload.prep_time = prepTime;
  }
  if (message !== '') {
    payload.message = message;
  }

  try {
    const result = await createExchangeRequest(token, payload);
    const data = dataFrom(result);
    const exchangeId = positiveInteger(
      data && (data.id || data.exchange_id || (data.exchange && data.exchange.id))
    );
    if (exchangeId !== null) {
      return redirectTo(res, `/exchanges/${exchangeId}?status=exchange-created`);
    }
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    const code = apiErrorCode(error);
    if (code === 'COMPLIANCE_VIOLATION') {
      return redirectTo(res, `/listings/${listingId}/exchange-request?status=compliance-failed`);
    }
    if (code === 'FEATURE_DISABLED') {
      return redirectTo(res, listingRedirect(listingId, 'exchange-disabled'));
    }
  }

  return redirectTo(res, `/listings/${listingId}/exchange-request?status=exchange-failed`);
}));

router.get('/:listingId(\\d+)/exchange-request', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return redirectTo(res, loginRedirect());

  const listingId = Number(req.params.listingId);
  const workflowEnabled = await exchangeWorkflowEnabled(token);
  if (!workflowEnabled) {
    return redirectTo(res, listingRedirect(listingId, 'exchange-disabled'));
  }

  const [listingResult, profileResult, walletBalance] = await Promise.all([
    callListing(token, 'GET', `/${listingId}`),
    getRequestProfile(req, token).catch(() => null),
    walletBalanceForExchange(token)
  ]);

  const listing = dataFrom(listingResult) || {};
  const currentUser = dataFrom(profileResult) || {};
  const ownerId = listingOwnerId(listing);
  const currentUserId = positiveInteger(currentUser.id);
  if (ownerId !== null && currentUserId !== null && ownerId === currentUserId) {
    return redirectTo(res, listingRedirect(listingId, 'own-listing'));
  }

  const suggestedHours = suggestedExchangeHours(listing);
  res.render('listings/exchange-request', {
    title: 'Request an exchange',
    listing: { ...listing, id: listingId },
    listingType: listingType(listing.type),
    authorName: listingAuthorName(listing),
    suggestedHours,
    suggestedHoursLabel: oneDecimal(suggestedHours),
    walletBalance,
    walletBalanceLabel: walletBalance === null ? '' : oneDecimal(walletBalance),
    status: exchangeRequestStatus(req.query.status),
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}, { notFoundTitle: 'Listing not found' }));

router.get('/:id(\\d+)/analytics', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return redirectTo(res, loginRedirect());

  const id = Number(req.params.id);
  const days = listingAnalyticsDays(req.query.days);
  let listingResult;
  let analyticsResult;

  try {
    [listingResult, analyticsResult] = await Promise.all([
      callListing(token, 'GET', `/${id}`),
      callListing(token, 'GET', `/${id}/analytics?days=${days}`)
    ]);
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    if (error instanceof ApiError && error.status === 403) {
      return res.status(403).render('errors/403', { title: 'Forbidden' });
    }
    if (error instanceof ApiError && error.status === 404) {
      return res.status(404).render('errors/404', { title: 'Listing not found' });
    }
    if (error instanceof ApiError && error.status === 429) {
      return res.status(429).render('errors/429', { title: 'Too many requests' });
    }
    throw error;
  }

  const listing = dataFrom(listingResult) || {};
  const analyticsData = dataFrom(analyticsResult) || {};
  const listingTitle = trimmed(listing.title || listing.name || analyticsData.title) || 'Listing analytics';

  return res.render('listings/analytics', {
    title: 'Listing analytics',
    listing: { ...listing, id },
    listingTitle,
    days,
    dayOptions: [7, 14, 30, 60, 90],
    analytics: decorateListingAnalytics(analyticsResult)
  });
}, { notFoundTitle: 'Listing not found' }));

router.get('/:id(\\d+)/comments', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return redirectTo(res, loginRedirect());

  const id = Number(req.params.id);
  const listingResult = await callListing(token, 'GET', `/${id}`);
  let commentsResult = { data: { comments: [], count: 0 } };

  try {
    commentsResult = await getComments(token, { target_type: 'listing', target_id: id });
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
  }

  const listing = dataFrom(listingResult) || {};
  const commentData = commentsPayload(commentsResult);
  return res.render('listings/comments', {
    title: res.locals.t('govuk_alpha_listings.comments.title'),
    listing: { ...listing, id },
    listingTitle: trimmed(listing.title || listing.name) || 'Comments',
    comments: commentData.comments,
    commentsCount: commentData.count,
    status: listingCommentsStatus(req.query.status, res.locals.t),
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}, { notFoundTitle: 'Listing not found' }));

router.post('/:id(\\d+)/report', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const payload = reportPayload(req.body);
  if (payload === null) {
    return redirectTo(res, `/listings/${id}/report?status=report-invalid`);
  }

  const token = tokenFrom(req);
  if (!token) return redirectTo(res, loginRedirect());

  let status = 'listing-reported';
  try {
    await callListing(token, 'POST', `/${id}/report`, payload);
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    status = error instanceof ApiError && error.status === 409
      ? 'already-reported'
      : 'report-failed';
  }

  return redirectTo(res, listingRedirect(id, status));
}));

router.get('/:id(\\d+)/report', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return redirectTo(res, loginRedirect());

  const id = Number(req.params.id);
  const [listingResult, profileResult] = await Promise.all([
    callListing(token, 'GET', `/${id}`),
    getRequestProfile(req, token).catch(() => null)
  ]);

  const listing = dataFrom(listingResult) || {};
  const currentUser = dataFrom(profileResult) || {};
  const ownerId = listingOwnerId(listing);
  const currentUserId = positiveInteger(currentUser.id);
  if (ownerId !== null && currentUserId !== null && ownerId === currentUserId) {
    return res.status(403).render('static-page', {
      title: 'Cannot report listing',
      heading: 'Cannot report listing',
      body: 'You cannot report your own listing.'
    });
  }

  res.render('listings/report', {
    title: 'Report a listing',
    listing: { ...listing, id },
    status: listingReportStatus(req.query.status),
    reasons: listingReportReasons(),
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}, { notFoundTitle: 'Listing not found' }));

// List all listings with search/filter/pagination
router.get('/', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  const search = trimmed(req.query.search || req.query.q);
  const type = ['offer', 'request'].includes(String(req.query.type || '')) ? String(req.query.type) : '';
  const cursor = trimmed(req.query.cursor);
  const params = {
    per_page: 20,
    ...(search ? { q: search } : {}),
    ...(type ? { type } : {}),
    ...(cursor ? { cursor } : {})
  };

  const [result, currentUserResult] = await Promise.all([
    getListings(token, params),
    token ? getRequestProfile(req, token).catch(() => null) : Promise.resolve(null)
  ]);
  const listings = collectionFrom(result);
  const meta = result?.meta || {};
  const pagination = {
    hasMore: Boolean(meta.has_more),
    cursor: trimmed(meta.cursor || meta.next_cursor),
    total: Number(meta.total_items ?? meta.total ?? listings.length) || 0
  };

  res.render('listings/index', {
    title: 'Listings',
    listings,
    pagination,
    filters: { search, type },
    hasFilters: Boolean(search || type),
    currentUser: profileFrom(currentUserResult),
    isAuthenticated: Boolean(token),
    successMessage: (req.flash ? req.flash('success')[0] : null) || listingStatusMessage(req.query.status),
    errorMessage: (req.flash ? req.flash('error')[0] : null) || listingStatusErrorMessage(req.query.status),
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}));

// New listing form
router.get('/new', requireAuth, asyncRoute(async (req, res) => {
  res.render('listings/form', await listingFormViewData(req, {
    title: 'Create listing',
    listing: null,
    values: null,
    errors: null,
    fieldErrors: {}
  }));
}, { redirectOn401: loginRedirect() }));

// Create listing
router.post('/new', requireAuth, audit.listingCreate(), asyncRoute(async (req, res) => {
  const image = uploadedFile(req, 'image');
  const config = listingConfigFrom(req);
  const allowedTypes = [
    ...(config.allowOffers ? ['offer'] : []),
    ...(config.allowRequests ? ['request'] : [])
  ];
  const values = listingFormValues(req.body);
  const validation = validateListingValues(values, config, allowedTypes, image);

  if (validation.errors.length > 0) {
    await removeUploadedFile(image);
    return res.render('listings/form', await listingFormViewData(req, {
      title: 'Create listing',
      listing: null,
      values,
      ...validation
    }));
  }

  try {
    const result = await createListing(req.token, listingPayloadFrom(values));
    const listingId = positiveInteger(listingFrom(result).id);
    if (listingId === null) {
      if (req.flash) {
        req.flash('error', 'The listing was saved, but Laravel did not return its ID.');
      }
      return redirectTo(res, '/listings');
    }

    const secondaryFailures = [];
    if (config.enableSkillTags) {
      try {
        await setListingSkillTags(req.token, listingId, skillTagsFrom(values.skill_tags));
      } catch (error) {
        secondaryFailures.push(error.message || 'skill tags could not be saved');
      }
    }
    if (image) {
      try {
        await uploadListingCoverImage(req.token, listingId, image);
      } catch (error) {
        secondaryFailures.push(error.message || 'the image could not be uploaded');
      }
    }

    if (req.flash) {
      req.flash('success', 'Listing created successfully');
      if (secondaryFailures.length > 0) {
        req.flash('error', `The listing was created, but ${secondaryFailures.join('; ')}.`);
      }
    }
    return redirectTo(res, `/listings/${listingId}?status=listing-created`);
  } catch (error) {
    if (isOnboardingRequired(error)) return redirectTo(res, '/onboarding');
    if (error instanceof ApiError && [400, 409, 422].includes(error.status)) {
      const state = listingFormErrorState(error, 'Unable to create listing');
      return res.render('listings/form', await listingFormViewData(req, {
        title: 'Create listing',
        listing: null,
        values,
        ...state
      }));
    }
    if (error instanceof ApiError && error.status === 403) return renderForbidden(res, error);
    throw error;
  } finally {
    await removeUploadedFile(image);
  }
}, { redirectOn401: loginRedirect(), notFoundTitle: 'Listing not found' }));

// View listing detail
router.get('/:id(\\d+)', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  const [listingResult, currentUserResult] = await Promise.all([
    getListing(token, req.params.id),
    token ? getRequestProfile(req, token).catch(() => null) : Promise.resolve(null)
  ]);
  const listing = listingFrom(listingResult);
  const currentUser = profileFrom(currentUserResult);
  const ownerId = listingOwnerId(listing);
  const currentUserId = positiveInteger(currentUser.id);
  const can_edit = ownerId !== null && currentUserId !== null && ownerId === currentUserId;
  const detailStatus = listingDetailStatus(req.query.status, res.locals.t);
  const tenant = req.accessibleRouting?.tenant || {};
  let exchangeContext = {
    exchangeWorkflowEnabled: false,
    directMessagingEnabled: false,
    exchangeContextReady: false,
    activeExchange: null
  };

  if (token && !can_edit) {
    try {
      exchangeContext = await listingExchangeContext(token, req.params.id);
    } catch (error) {
      if (isAuthError(error)) throw error;
      // Do not offer a second exchange request while the authoritative config or
      // active-exchange check is unavailable. This deliberately fails closed.
    }
  }

  res.render('listings/detail', {
    title: listing.title || listing.name || 'Listing details',
    listing: { ...listing, can_edit },
    listingImageUrl: resolveBackendAssetUrl(listing.image_url || listing.imageUrl),
    listingGallery: listingGalleryFrom(listing),
    listingSkillTags: listingSkillTagsFrom(listing),
    listingAuthor: listingAuthorFrom(listing),
    memberOffers: relatedListingsFrom(listing.member_offers || listing.memberOffers),
    memberRequests: relatedListingsFrom(listing.member_requests || listing.memberRequests),
    isSaved: listing.is_favorited === true || listing.isFavorited === true,
    hasLiked: listing.is_liked === true || listing.isLiked === true,
    likeCount: Math.max(0, Number(listing.likes_count ?? listing.likesCount) || 0),
    commentsCount: Math.max(0, Number(listing.comments_count ?? listing.commentsCount) || 0),
    isAuthenticated: Boolean(token),
    currentUserId,
    ownerId,
    connectionsEnabled: flagEnabled(tenant, 'connections', 'features', true),
    listingShareUrl: urlFor(res, `/listings/${listing.id}`),
    ...exchangeContext,
    successMessage: (req.flash ? req.flash('success')[0] : null) || (detailStatus?.type === 'success' ? detailStatus.message : null),
    errorMessage: (req.flash ? req.flash('error')[0] : null) || (detailStatus?.type === 'error' ? detailStatus.message : null),
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}, { notFoundTitle: 'Listing not found' }));

// Edit listing form
router.get('/:id(\\d+)/edit', requireAuth, asyncRoute(async (req, res) => {
  const [listingResult, currentUserResult] = await Promise.all([
    getListing(req.token, req.params.id),
    getRequestProfile(req, req.token)
  ]);
  const listing = listingFrom(listingResult);
  const currentUser = profileFrom(currentUserResult);

  // Only the owner may access the edit form
  const ownerId = listingOwnerId(listing);
  const currentUserId = positiveInteger(currentUser.id);
  if (ownerId === null || currentUserId === null || ownerId !== currentUserId) {
    return renderForbidden(res);
  }

  res.render('listings/form', await listingFormViewData(req, {
    title: 'Edit listing',
    listing,
    values: listingFormValues({}, listing),
    errors: null,
    fieldErrors: {}
  }));
}, { redirectOn401: loginRedirect(), notFoundTitle: 'Listing not found' }));

// Update listing
router.post('/:id(\\d+)/edit', requireAuth, audit.listingUpdate(), asyncRoute(async (req, res) => {
  const { id } = req.params;
  const image = uploadedFile(req, 'image');
  const config = listingConfigFrom(req);
  const allowedTypes = [
    ...(config.allowOffers ? ['offer'] : []),
    ...(config.allowRequests ? ['request'] : [])
  ];
  const values = listingFormValues(req.body);
  const validation = validateListingValues(values, config, allowedTypes, image, values.has_existing_image);

  if (validation.errors.length > 0) {
    await removeUploadedFile(image);
    return res.render('listings/form', await listingFormViewData(req, {
      title: 'Edit listing',
      listing: { id },
      values,
      ...validation
    }));
  }

  try {
    await updateListing(req.token, id, listingPayloadFrom(values));
    const secondaryFailures = [];
    if (config.enableSkillTags) {
      try {
        await setListingSkillTags(req.token, id, skillTagsFrom(values.skill_tags));
      } catch (error) {
        secondaryFailures.push(error.message || 'skill tags could not be saved');
      }
    }
    if (image) {
      try {
        await uploadListingCoverImage(req.token, positiveInteger(id), image);
      } catch (error) {
        secondaryFailures.push(error.message || 'the image could not be uploaded');
      }
    }

    if (req.flash) {
      req.flash('success', 'Listing updated successfully');
      if (secondaryFailures.length > 0) {
        req.flash('error', `The listing was updated, but ${secondaryFailures.join('; ')}.`);
      }
    }
    return redirectTo(res, `/listings/${id}?status=listing-updated`);
  } catch (error) {
    if (isOnboardingRequired(error)) return redirectTo(res, '/onboarding');
    if (error instanceof ApiError && [400, 409, 422].includes(error.status)) {
      const state = listingFormErrorState(error, 'Unable to update listing');
      return res.render('listings/form', await listingFormViewData(req, {
        title: 'Edit listing',
        listing: { id },
        values,
        ...state
      }));
    }
    if (error instanceof ApiError && error.status === 403) return renderForbidden(res, error);
    throw error;
  } finally {
    await removeUploadedFile(image);
  }
}, { redirectOn401: loginRedirect(), notFoundTitle: 'Listing not found' }));

// Delete listing
router.post('/:id(\\d+)/delete', requireAuth, audit.listingDelete(), asyncRoute(async (req, res) => {
  const { id } = req.params;
  try {
    await deleteListing(req.token, id);
    if (req.flash) req.flash('success', 'Listing deleted successfully');
    return redirectTo(res, '/listings?status=listing-deleted');
  } catch (error) {
    if (isOnboardingRequired(error)) return redirectTo(res, '/onboarding');
    if (error instanceof ApiError && error.status === 403) return renderForbidden(res, error);
    if (error instanceof ApiError && [400, 409, 422].includes(error.status)) {
      if (req.flash) req.flash('error', error.message || 'Unable to delete listing');
      return redirectTo(res, `/listings/${id}?status=listing-delete-failed`);
    }
    throw error;
  }
}, { redirectOn401: loginRedirect(), notFoundTitle: 'Listing not found' }));

module.exports = router;
