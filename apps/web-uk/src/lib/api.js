// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const TENANT_ID = process.env.TENANT_ID || '';
const { cache } = require('./cache');
const { getApiBaseUrl } = require('./backend-contract');

const API_BASE_URL = getApiBaseUrl();

// Cache TTL for different types of data (in milliseconds)
const CACHE_TTL = {
  COUNTS: 15000,    // 15 seconds for notification/message counts
  PROFILE: 60000    // 1 minute for user profile data
};

// Helper to create a cache key from token
function cacheKey(token, suffix) {
  // Use first 40 chars of token as user identifier to avoid collisions
  return `${token.substring(0, 40)}:${suffix}`;
}

class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

class ApiOfflineError extends Error {
  constructor(message = 'Unable to connect to the service') {
    super(message);
    this.name = 'ApiOfflineError';
    this.status = 503;
  }
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const isFormData = typeof globalThis.FormData !== 'undefined' && options.body instanceof globalThis.FormData;

  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...options.headers
  };

  // Include X-Tenant-ID header for tenant resolution (required for unauthenticated requests)
  if (TENANT_ID) {
    headers['X-Tenant-ID'] = TENANT_ID;
  }

  const config = {
    ...options,
    headers
  };

  let response;
  try {
    response = await fetch(url, config);
  } catch (error) {
    // Network error - API is offline or unreachable
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.message.includes('fetch failed')) {
      throw new ApiOfflineError();
    }
    throw error;
  }

  let data;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    throw new ApiError(
      data.error || data.message || data.title || 'API request failed',
      response.status,
      data
    );
  }

  return data;
}

async function downloadRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers = {
    ...options.headers
  };

  if (TENANT_ID) {
    headers['X-Tenant-ID'] = TENANT_ID;
  }

  const config = {
    ...options,
    headers
  };

  let response;
  try {
    response = await fetch(url, config);
  } catch (error) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.message.includes('fetch failed')) {
      throw new ApiOfflineError();
    }
    throw error;
  }

  const contentType = response.headers.get('content-type') || '';

  if (!response.ok) {
    let data;
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    throw new ApiError(
      data.error || data.message || data.title || 'API request failed',
      response.status,
      data
    );
  }

  return {
    status: response.status,
    body: Buffer.from(await response.arrayBuffer()),
    headers: {
      'content-type': contentType,
      'content-disposition': response.headers.get('content-disposition') || '',
      'content-length': response.headers.get('content-length') || '',
      'cache-control': response.headers.get('cache-control') || '',
      pragma: response.headers.get('pragma') || '',
      expires: response.headers.get('expires') || '',
      etag: response.headers.get('etag') || '',
      'last-modified': response.headers.get('last-modified') || ''
    }
  };
}

// Auth
async function login(email, password, tenantSlug) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      tenant_slug: tenantSlug
    })
  });
}

async function validateToken(token) {
  return request('/api/auth/validate', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function register(data) {
  return request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

async function refreshToken(refreshToken) {
  return request('/api/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshToken })
  });
}

async function logout(token) {
  return request('/api/auth/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function submitContact(data) {
  return request('/api/v2/contact', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

async function verify2fa(token, code) {
  return request('/api/auth/2fa/verify', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ code })
  });
}

async function forgotPassword(email, tenantSlug) {
  return request('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({
      email,
      tenant_slug: tenantSlug
    })
  });
}

async function resetPassword(token, password, passwordConfirmation = password) {
  return request('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({
      token,
      password,
      password_confirmation: passwordConfirmation
    })
  });
}

async function resendVerification(email) {
  return request('/api/auth/resend-verification-by-email', {
    method: 'POST',
    body: JSON.stringify({ email })
  });
}

// TODO: The backend has no /api/auth/change-password endpoint.
// A dedicated change-password endpoint needs to be added to AuthController or UsersController
// (e.g. POST /api/users/me/password accepting { current_password, new_password }).
// Until then this function will always return a 404 error — callers should surface
// a meaningful error message rather than crashing.
async function changePassword(token, currentPassword, newPassword) {
  try {
    return await request('/api/users/me/password', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword
      })
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      throw new ApiError(
        'Password change is not available at this time. Please use the "Forgot password" link on the login page to reset your password.',
        404,
        error.data
      );
    }
    throw error;
  }
}

// Users / Profile
async function getProfile(token) {
  return request('/api/users/me', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function updateProfile(token, data) {
  return request('/api/users/me', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function uploadProfileAvatar(token, data) {
  const form = new globalThis.FormData();
  if (data.file && data.file.buffer) {
    const blob = new globalThis.Blob([data.file.buffer], {
      type: data.file.contentType || 'application/octet-stream'
    });
    form.append('avatar', blob, data.file.filename || 'avatar');
  }

  return request('/api/v2/users/me/avatar', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });
}

async function uploadInsuranceCertificate(token, data) {
  const form = new globalThis.FormData();
  form.append('insurance_type', data.insurance_type || '');
  form.append('provider_name', data.provider_name || '');
  form.append('policy_number', data.policy_number || '');
  form.append('coverage_amount', data.coverage_amount || '');
  form.append('start_date', data.start_date || '');
  form.append('expiry_date', data.expiry_date || '');
  form.append('notes', data.notes || '');

  if (data.file && data.file.buffer) {
    const blob = new globalThis.Blob([data.file.buffer], {
      type: data.file.contentType || 'application/octet-stream'
    });
    form.append('certificate_file', blob, data.file.filename || 'certificate');
  }

  return request('/api/v2/users/me/insurance', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });
}

async function getOnboardingStatus(token) {
  return request('/api/v2/onboarding/status', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function getOnboardingConfig(token) {
  return request('/api/v2/onboarding/config', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function getOnboardingCategories(token) {
  return request('/api/v2/onboarding/categories', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function getOnboardingSafeguardingOptions(token) {
  return request('/api/v2/onboarding/safeguarding-options', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function saveOnboardingSafeguarding(token, preferences) {
  return request('/api/v2/onboarding/safeguarding', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ preferences })
  });
}

async function completeOnboarding(token, data) {
  return request('/api/v2/onboarding/complete', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function getUsers(token) {
  return request('/api/users', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function searchUsers(token, query, params = {}) {
  const search = new URLSearchParams();
  search.set('q', query || '');
  if (params.limit) search.set('limit', params.limit);

  return request(`/api/v2/users/search?${search.toString()}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function getUser(token, id) {
  return request(`/api/users/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

// Listings
async function getListings(token, params = {}) {
  const query = new URLSearchParams();
  if (params.type) query.set('type', params.type);
  if (params.status) query.set('status', params.status);
  if (params.user_id) query.set('user_id', params.user_id);
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);
  if (params.search) query.set('search', params.search);

  const queryString = query.toString();
  const endpoint = `/api/listings${queryString ? `?${queryString}` : ''}`;

  return request(endpoint, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function getListing(token, id) {
  return request(`/api/listings/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function createListing(token, data) {
  return request('/api/listings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function updateListing(token, id, data) {
  return request(`/api/listings/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function deleteListing(token, id) {
  return request(`/api/listings/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function callListingApi(token, method, path = '', data = undefined) {
  const normalizedPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';
  const options = {
    method,
    headers: { Authorization: `Bearer ${token}` }
  };

  if (data !== undefined) {
    options.body = JSON.stringify(data);
  }

  return request(`/api/v2/listings${normalizedPath}`, options);
}

// Laravel volunteering API
async function getVolunteerOrganisations(params = {}) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.per_page) query.set('per_page', params.per_page);
  if (params.cursor) query.set('cursor', params.cursor);

  const queryString = query.toString();
  const endpoint = `/api/v2/volunteering/organisations${queryString ? `?${queryString}` : ''}`;

  return request(endpoint);
}

async function getClubs(params = {}) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.page) query.set('page', params.page);
  if (params.per_page) query.set('per_page', params.per_page);

  const queryString = query.toString();
  const endpoint = `/api/v2/clubs${queryString ? `?${queryString}` : ''}`;

  return request(endpoint);
}

async function getVolunteeringOpportunities(params = {}) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.category_id) query.set('category_id', params.category_id);
  if (params.is_remote) query.set('is_remote', params.is_remote);
  if (params.per_page) query.set('per_page', params.per_page);
  if (params.cursor) query.set('cursor', params.cursor);

  const queryString = query.toString();
  const endpoint = `/api/v2/volunteering/opportunities${queryString ? `?${queryString}` : ''}`;

  return request(endpoint);
}

async function getVolunteerOrganisation(id) {
  return request(`/api/v2/volunteering/organisations/${encodeURIComponent(id)}?include=public_contract`);
}

async function getVolunteerOpportunity(id, token = '') {
  const options = token
    ? { headers: { Authorization: `Bearer ${token}` } }
    : {};

  return request(`/api/v2/volunteering/opportunities/${encodeURIComponent(id)}`, options);
}

async function getOrganisationOpportunities(organisationId, params = {}) {
  const query = new URLSearchParams();
  query.set('organization_id', organisationId);
  if (params.per_page) query.set('per_page', params.per_page);
  if (params.cursor) query.set('cursor', params.cursor);

  return request(`/api/v2/volunteering/opportunities?${query.toString()}`);
}

async function getOrganisationReviews(organisationId) {
  return request(`/api/v2/volunteering/reviews/organization/${encodeURIComponent(organisationId)}`);
}

async function getKnowledgeBaseArticles(params = {}) {
  const query = new URLSearchParams();

  if (params.q) {
    query.set('q', params.q);
    if (params.limit) query.set('limit', params.limit);
    return request(`/api/v2/kb/search?${query.toString()}`);
  }

  if (params.per_page) query.set('per_page', params.per_page);
  if (params.cursor) query.set('cursor', params.cursor);
  if (params.category_id) query.set('category_id', params.category_id);

  const queryString = query.toString();
  return request(`/api/v2/kb${queryString ? `?${queryString}` : ''}`);
}

async function getKnowledgeBaseArticle(id) {
  return request(`/api/v2/kb/${encodeURIComponent(id)}`);
}

async function getHelpFaqs(params = {}) {
  const query = new URLSearchParams();
  if (params.q) query.set('q', params.q);
  if (params.category_id) query.set('category_id', params.category_id);

  const queryString = query.toString();
  return request(`/api/v2/help/faqs${queryString ? `?${queryString}` : ''}`);
}

async function getMyVolunteerOrganisations(token, params = {}) {
  const query = new URLSearchParams();
  if (params.per_page) query.set('per_page', params.per_page);
  if (params.cursor) query.set('cursor', params.cursor);
  if (params.status) query.set('status', params.status);

  const queryString = query.toString();
  const endpoint = `/api/v2/volunteering/my-organisations${queryString ? `?${queryString}` : ''}`;

  return request(endpoint, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function createVolunteerOrganisation(token, data) {
  return request('/api/v2/volunteering/organisations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function callVolunteeringApi(token, method, path, data = undefined) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const options = {
    method,
    headers: { Authorization: `Bearer ${token}` }
  };

  if (data !== undefined) {
    options.body = JSON.stringify(data);
  }

  return request(`/api/v2/volunteering${normalizedPath}`, options);
}

async function uploadVolunteerCredential(token, data) {
  const form = new globalThis.FormData();
  form.append('credential_type', data.credential_type || data.type || '');
  if (data.expires_at) {
    form.append('expires_at', data.expires_at);
  }

  if (data.file && data.file.buffer) {
    const blob = new globalThis.Blob([data.file.buffer], {
      type: data.file.contentType || 'application/octet-stream'
    });
    form.append('file', blob, data.file.filename || 'credential');
  }

  return request('/api/v2/volunteering/credentials', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });
}

async function callMarketplaceApi(token, method, path, data = undefined) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const options = {
    method,
    headers: { Authorization: `Bearer ${token}` }
  };

  if (data !== undefined) {
    options.body = JSON.stringify(data);
  }

  return request(`/api/v2/marketplace${normalizedPath}`, options);
}

async function callCouponApi(token, method, path = '', data = undefined) {
  const normalizedPath = path === '' ? '' : (path.startsWith('/') ? path : `/${path}`);
  const options = {
    method,
    headers: { Authorization: `Bearer ${token}` }
  };

  if (data !== undefined) {
    options.body = JSON.stringify(data);
  }

  return request(`/api/v2/coupons${normalizedPath}`, options);
}

async function uploadMarketplaceListingImages(token, listingId, data) {
  const form = new globalThis.FormData();
  const files = Array.isArray(data.files) ? data.files : [data.file || data.image].filter(Boolean);
  for (const file of files) {
    if (!file || !file.buffer) continue;
    const blob = new globalThis.Blob([file.buffer], {
      type: file.contentType || 'application/octet-stream'
    });
    form.append('image', blob, file.filename || 'marketplace-image');
  }

  return request(`/api/v2/marketplace/listings/${listingId}/images`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });
}

async function uploadEventImage(token, eventId, data) {
  const form = new globalThis.FormData();
  const file = data.file || data.image;
  if (file && file.buffer) {
    const blob = new globalThis.Blob([file.buffer], {
      type: file.contentType || 'application/octet-stream'
    });
    form.append('image', blob, file.filename || 'event-image');
  }

  return request(`/api/v2/events/${eventId}/image`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });
}

async function callIdeationApi(token, method, path, data = undefined) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const options = {
    method,
    headers: { Authorization: `Bearer ${token}` }
  };

  if (data !== undefined) {
    options.body = JSON.stringify(data);
  }

  return request(`/api/v2${normalizedPath}`, options);
}

async function callGroupExchangeApi(token, method, path = '', data = undefined) {
  const normalizedPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';
  const options = {
    method,
    headers: { Authorization: `Bearer ${token}` }
  };

  if (data !== undefined) {
    options.body = JSON.stringify(data);
  }

  return request(`/api/v2/group-exchanges${normalizedPath}`, options);
}

async function callEventApi(token, method, path = '', data = undefined) {
  const normalizedPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';
  const options = {
    method,
    headers: { Authorization: `Bearer ${token}` }
  };

  if (data !== undefined) {
    options.body = JSON.stringify(data);
  }

  return request(`/api/v2/events${normalizedPath}`, options);
}

async function getEventCategories(token) {
  return request('/api/v2/categories?type=event', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function getGoals(token, params = {}) {
  const query = new URLSearchParams();
  if (params.user_id) query.set('user_id', params.user_id);
  if (params.status) query.set('status', params.status);
  if (params.visibility) query.set('visibility', params.visibility);
  if (params.per_page || params.limit) query.set('per_page', params.per_page || params.limit);
  if (params.cursor) query.set('cursor', params.cursor);

  const queryString = query.toString();
  const endpoint = `/api/v2/goals${queryString ? `?${queryString}` : ''}`;

  return request(endpoint, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function getGoal(token, id) {
  return request(`/api/v2/goals/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function callGoalApi(token, method, path = '', data = undefined) {
  const normalizedPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';
  const options = {
    method,
    headers: { Authorization: `Bearer ${token}` }
  };

  if (data !== undefined) {
    options.body = JSON.stringify(data);
  }

  return request(`/api/v2/goals${normalizedPath}`, options);
}

async function callCourseApi(token, method, path = '', data = undefined) {
  const normalizedPath = path
    ? (path.startsWith('/') || path.startsWith('?') ? path : `/${path}`)
    : '';
  const options = {
    method,
    headers: { Authorization: `Bearer ${token}` }
  };

  if (data !== undefined) {
    options.body = JSON.stringify(data);
  }

  return request(`/api/v2/courses${normalizedPath}`, options);
}

async function getMyCourses(token) {
  return request('/api/v2/me/courses', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function callGroupApi(token, method, path = '', data = undefined) {
  const normalizedPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';
  const options = {
    method,
    headers: { Authorization: `Bearer ${token}` }
  };

  if (data !== undefined) {
    options.body = JSON.stringify(data);
  }

  return request(`/api/v2/groups${normalizedPath}`, options);
}

async function uploadGroupImage(token, groupId, data) {
  const type = data.type === 'cover' ? 'cover' : 'avatar';
  const form = new globalThis.FormData();
  if (data.file && data.file.buffer) {
    const blob = new globalThis.Blob([data.file.buffer], {
      type: data.file.contentType || 'application/octet-stream'
    });
    form.append('image', blob, data.file.filename || 'group-image');
  }

  return request(`/api/v2/groups/${encodeURIComponent(groupId)}/image?type=${encodeURIComponent(type)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });
}

async function uploadGroupFile(token, groupId, data) {
  const form = new globalThis.FormData();
  form.append('folder', data.folder || '');
  form.append('description', data.description || '');

  if (data.file && data.file.buffer) {
    const blob = new globalThis.Blob([data.file.buffer], {
      type: data.file.contentType || 'application/octet-stream'
    });
    form.append('file', blob, data.file.filename || 'group-file');
  }

  return request(`/api/v2/groups/${encodeURIComponent(groupId)}/files`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });
}

async function callJobApi(token, method, path = '', data = undefined) {
  const normalizedPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';
  const options = {
    method,
    headers: { Authorization: `Bearer ${token}` }
  };

  if (data !== undefined) {
    options.body = JSON.stringify(data);
  }

  return request(`/api/v2/jobs${normalizedPath}`, options);
}

async function uploadJobApplication(token, jobId, data) {
  const form = new globalThis.FormData();
  form.append('message', data.message || '');

  if (data.file && data.file.buffer) {
    const blob = new globalThis.Blob([data.file.buffer], {
      type: data.file.contentType || 'application/octet-stream'
    });
    form.append('cv', blob, data.file.filename || 'cv');
  }

  return request(`/api/v2/jobs/${encodeURIComponent(jobId)}/apply`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });
}

async function callAdminJobApi(token, method, path = '', data = undefined) {
  const normalizedPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';
  const options = {
    method,
    headers: { Authorization: `Bearer ${token}` }
  };

  if (data !== undefined) {
    options.body = JSON.stringify(data);
  }

  return request(`/api/v2/admin/jobs${normalizedPath}`, options);
}

async function callJobDownload(token, path = '') {
  const normalizedPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';

  return downloadRequest(`/api/v2/jobs${normalizedPath}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function callUgcTranslateApi(token, data) {
  return request('/api/v2/ugc-translate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function callUserSettingsApi(token, method, path = '', data = undefined) {
  const normalizedPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';
  const options = {
    method,
    headers: { Authorization: `Bearer ${token}` }
  };

  if (data !== undefined) {
    options.body = JSON.stringify(data);
  }

  return request(`/api/v2/users/me${normalizedPath}`, options);
}

async function callProfileApi(token, method, path = '', data = undefined) {
  const normalizedPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';
  const options = {
    method,
    headers: { Authorization: `Bearer ${token}` }
  };

  if (data !== undefined) {
    options.body = JSON.stringify(data);
  }

  return request(`/api/v2${normalizedPath}`, options);
}

async function callWebAuthnApi(token, method, path = '', data = undefined) {
  const normalizedPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';
  const options = {
    method,
    headers: { Authorization: `Bearer ${token}` }
  };

  if (data !== undefined) {
    options.body = JSON.stringify(data);
  }

  return request(`/api/webauthn${normalizedPath}`, options);
}

async function getOrganisationJobs(organisationId, token, params = {}) {
  const query = new URLSearchParams();
  query.set('organization_id', organisationId);
  query.set('status', params.status || 'open');
  if (params.limit) query.set('limit', params.limit);
  if (params.cursor) query.set('cursor', params.cursor);

  const endpoint = `/api/v2/jobs?${query.toString()}`;

  return request(endpoint, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function getJobs(token, params = {}) {
  const query = new URLSearchParams();
  if (params.limit) query.set('limit', params.limit);
  if (params.offset !== undefined && params.offset !== null) query.set('offset', params.offset);
  if (params.status) query.set('status', params.status);
  if (params.sort) query.set('sort', params.sort);
  if (params.search) query.set('search', params.search);
  if (params.type) query.set('type', params.type);
  if (params.commitment) query.set('commitment', params.commitment);
  if (params.is_remote) query.set('is_remote', params.is_remote);
  if (params.organization_id) query.set('organization_id', params.organization_id);
  if (params.cursor) query.set('cursor', params.cursor);

  const endpoint = `/api/v2/jobs${query.toString() ? `?${query.toString()}` : ''}`;

  return request(endpoint, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
}

async function getJob(token, id) {
  return request(`/api/v2/jobs/${encodeURIComponent(id)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
}

// Wallet
async function getBalance(token) {
  return request('/api/wallet/balance', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function getTransactions(token, params = {}) {
  const query = new URLSearchParams();
  if (params.type) query.set('type', params.type);
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);

  const queryString = query.toString();
  const endpoint = `/api/wallet/transactions${queryString ? `?${queryString}` : ''}`;

  return request(endpoint, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function getTransaction(token, id) {
  return request(`/api/wallet/transactions/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function transferCredits(token, receiverId, amount, description) {
  return request('/api/wallet/transfer', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      receiver_id: receiverId,
      amount,
      description
    })
  });
}

async function transferWalletCredits(token, data) {
  return request('/api/v2/wallet/transfer', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function donateCredits(token, data) {
  return request('/api/v2/wallet/donate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function unsaveSavedItem(token, itemType, itemId) {
  const query = new URLSearchParams();
  query.set('item_type', itemType);
  query.set('item_id', itemId);

  return request(`/api/v2/me/saved-items?${query.toString()}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function saveSavedItem(token, data) {
  return request('/api/v2/me/saved-items', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function checkSavedItem(token, itemType, itemId) {
  const query = new URLSearchParams();
  query.set('item_type', itemType);
  query.set('item_id', itemId);

  return request(`/api/v2/me/saved-items/check?${query.toString()}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function getSavedCollections(token) {
  return request('/api/v2/me/collections', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function getSavedCollectionItems(token, id, params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.per_page) query.set('per_page', params.per_page);
  const queryString = query.toString();

  return request(`/api/v2/me/collections/${encodeURIComponent(id)}/items${queryString ? `?${queryString}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function getUserPublicCollections(token, userId) {
  return request(`/api/v2/users/${encodeURIComponent(userId)}/public-collections`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function getUserAppreciations(token, userId, params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.per_page) query.set('per_page', params.per_page);
  const queryString = query.toString();

  return request(`/api/v2/users/${encodeURIComponent(userId)}/appreciations${queryString ? `?${queryString}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function sendAppreciation(token, data) {
  return request('/api/v2/appreciations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function reactToAppreciation(token, id, reactionType) {
  return request(`/api/v2/appreciations/${encodeURIComponent(id)}/react`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ reaction_type: reactionType })
  });
}

async function getResources(token, params = {}) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.category_id) query.set('category_id', params.category_id);
  if (params.cursor) query.set('cursor', params.cursor);
  if (params.per_page) query.set('per_page', params.per_page);

  const queryString = query.toString();
  const endpoint = `/api/v2/resources${queryString ? `?${queryString}` : ''}`;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  return request(endpoint, { headers });
}

async function getResourceCategories(token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  return request('/api/v2/resources/categories', { headers });
}

async function getResourceCategoryTree(token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  return request('/api/v2/resources/categories/tree', { headers });
}

async function getSkillCategories(token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  return request('/api/v2/skills/categories', { headers });
}

async function getSkillCategory(token, id) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  return request(`/api/v2/skills/categories/${encodeURIComponent(id)}`, { headers });
}

async function getSkillMembers(token, skill, params = {}) {
  const query = new URLSearchParams();
  query.set('skill', skill);
  if (params.limit) query.set('limit', params.limit);

  return request(`/api/v2/skills/members?${query.toString()}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function downloadResource(token, id) {
  return downloadRequest(`/api/v2/resources/${encodeURIComponent(id)}/download`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function uploadResource(token, data) {
  const form = new globalThis.FormData();
  form.append('title', data.title || '');
  form.append('description', data.description || '');
  if (data.category_id) {
    form.append('category_id', data.category_id);
  }

  if (data.file && data.file.buffer) {
    const blob = new globalThis.Blob([data.file.buffer], {
      type: data.file.contentType || 'application/octet-stream'
    });
    form.append('file', blob, data.file.filename || 'resource');
  }

  return request('/api/v2/resources', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });
}

async function deleteResource(token, id) {
  return request(`/api/v2/resources/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function reorderResources(token, data) {
  return request('/api/v2/resources/reorder', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function createSavedCollection(token, data) {
  return request('/api/v2/me/collections', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function updateSavedCollection(token, id, data) {
  return request(`/api/v2/me/collections/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function deleteSavedCollection(token, id) {
  return request(`/api/v2/me/collections/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function deleteSavedItem(token, id) {
  return request(`/api/v2/me/saved-items/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function getBlogPosts(token = '', params = {}) {
  const query = new URLSearchParams();
  if (params.search || params.q) query.set('search', params.search || params.q);
  if (params.category_id || params.category) query.set('category_id', params.category_id || params.category);
  if (params.cursor) query.set('cursor', params.cursor);
  if (params.per_page || params.limit) query.set('per_page', params.per_page || params.limit);

  const queryString = query.toString();
  const endpoint = `/api/v2/blog${queryString ? `?${queryString}` : ''}`;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  return request(endpoint, { headers });
}

async function getBlogPost(token = '', slug) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  return request(`/api/v2/blog/${encodeURIComponent(slug)}`, { headers });
}

async function getComments(token = '', params = {}) {
  const query = new URLSearchParams();
  if (params.target_type) query.set('target_type', params.target_type);
  if (params.target_id) query.set('target_id', params.target_id);

  const queryString = query.toString();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  return request(`/api/v2/comments${queryString ? `?${queryString}` : ''}`, { headers });
}

async function getReactionSummary(token = '', type, id) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  return request(`/api/v2/reactions/${encodeURIComponent(type)}/${encodeURIComponent(id)}`, { headers });
}

async function getReactors(token = '', type, id, reactionType, params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.per_page) query.set('per_page', params.per_page);

  const queryString = query.toString();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  return request(`/api/v2/reactions/${encodeURIComponent(type)}/${encodeURIComponent(id)}/users/${encodeURIComponent(reactionType)}${queryString ? `?${queryString}` : ''}`, { headers });
}

async function getPolls(token, params = {}) {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  if (params.per_page || params.limit) query.set('per_page', params.per_page || params.limit);
  if (params.cursor) query.set('cursor', params.cursor);
  if (params.user_id) query.set('user_id', params.user_id);
  if (params.mine) query.set('mine', '1');
  if (params.category) query.set('category', params.category);
  if (params.event_id) query.set('event_id', params.event_id);

  const queryString = query.toString();
  return request(`/api/v2/polls${queryString ? `?${queryString}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function getPoll(token, id) {
  return request(`/api/v2/polls/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function getPollCategories(token) {
  return request('/api/v2/polls/categories', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function getPollRankedResults(token, id) {
  return request(`/api/v2/polls/${encodeURIComponent(id)}/ranked-results`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function getPollExport(token, id) {
  return downloadRequest(`/api/v2/polls/${encodeURIComponent(id)}/export`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function createPoll(token, data) {
  return request('/api/v2/polls', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function deletePoll(token, id) {
  return request(`/api/v2/polls/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function votePoll(token, id, data) {
  return request(`/api/v2/polls/${encodeURIComponent(id)}/vote`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function rankPoll(token, id, data) {
  return request(`/api/v2/polls/${encodeURIComponent(id)}/rank`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function dismissMatch(token, id, reason) {
  return request(`/api/v2/matches/${encodeURIComponent(id)}/dismiss`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ reason })
  });
}

async function performExchangeAction(token, id, action, data = {}) {
  const encodedId = encodeURIComponent(id);
  const endpoint = action === 'cancel'
    ? `/api/v2/exchanges/${encodedId}`
    : `/api/v2/exchanges/${encodedId}/${encodeURIComponent(action)}`;

  return request(endpoint, {
    method: action === 'cancel' ? 'DELETE' : 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function getExchangeConfig(token) {
  return request('/api/v2/exchanges/config', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function getExchanges(token, params = {}) {
  const query = new URLSearchParams();
  if (params.per_page) query.set('per_page', params.per_page);
  if (params.status) query.set('status', params.status);
  if (params.cursor) query.set('cursor', params.cursor);

  const queryString = query.toString();
  return request(`/api/v2/exchanges${queryString ? `?${queryString}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function getExchange(token, id) {
  return request(`/api/v2/exchanges/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function getExchangeRatings(token, id) {
  return request(`/api/v2/exchanges/${encodeURIComponent(id)}/ratings`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function createExchangeRequest(token, data) {
  return request('/api/v2/exchanges', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function rateExchange(token, id, data) {
  return request(`/api/v2/exchanges/${encodeURIComponent(id)}/rate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function sendAiChat(token, data) {
  return request('/api/ai/chat', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function getAiConversations(token, params = {}) {
  const query = new URLSearchParams();
  if (params.limit) query.set('limit', params.limit);
  if (params.offset) query.set('offset', params.offset);
  const queryString = query.toString();

  return request(`/api/ai/conversations${queryString ? `?${queryString}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function getAiConversation(token, id) {
  return request(`/api/ai/conversations/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function getExplore(token) {
  return request('/api/v2/explore', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function getMemberPremiumTiers(token) {
  return request('/api/v2/member-premium/tiers', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function getMemberPremiumMe(token) {
  return request('/api/v2/member-premium/me', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function createMemberPremiumCheckout(token, data) {
  return request('/api/v2/member-premium/checkout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function createMemberPremiumPortal(token, data) {
  return request('/api/v2/member-premium/billing-portal', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function cancelMemberPremium(token) {
  return request('/api/v2/member-premium/cancel', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
}

// Messages
async function callMessageApi(token, method, path = '', data = undefined) {
  const normalizedPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';
  const options = {
    method,
    headers: { Authorization: `Bearer ${token}` }
  };

  if (data !== undefined) {
    options.body = JSON.stringify(data);
  }

  return request(`/api/v2/messages${normalizedPath}`, options);
}

async function uploadVoiceMessage(token, data) {
  const form = new globalThis.FormData();
  form.append('recipient_id', String(data.recipient_id || data.recipientId || ''));

  if (data.file && data.file.buffer) {
    const blob = new globalThis.Blob([data.file.buffer], {
      type: data.file.contentType || 'application/octet-stream'
    });
    form.append('voice_message', blob, data.file.filename || 'voice-message');
  }

  return request('/api/v2/messages/voice', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });
}

async function uploadMessageAttachments(token, data) {
  const form = new globalThis.FormData();
  form.append('recipient_id', String(data.recipient_id || data.recipientId || ''));

  if (data.body !== undefined && data.body !== null) {
    form.append('body', String(data.body));
  }

  const files = Array.isArray(data.files) ? data.files : [data.file].filter(Boolean);
  files.forEach((file) => {
    if (!file || !file.buffer) return;
    const blob = new globalThis.Blob([file.buffer], {
      type: file.contentType || 'application/octet-stream'
    });
    form.append('attachments[]', blob, file.filename || 'attachment');
  });

  return request('/api/v2/messages', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });
}

async function callConversationApi(token, method, path = '', data = undefined) {
  const normalizedPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';
  const options = {
    method,
    headers: { Authorization: `Bearer ${token}` }
  };

  if (data !== undefined) {
    options.body = JSON.stringify(data);
  }

  return request(`/api/v2/conversations${normalizedPath}`, options);
}

async function callPodcastApi(token, method, path = '', data = undefined) {
  const normalizedPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';
  const options = {
    method,
    headers: { Authorization: `Bearer ${token}` }
  };

  if (data !== undefined) {
    options.body = JSON.stringify(data);
  }

  return request(`/api/v2/podcasts${normalizedPath}`, options);
}

async function uploadPodcastEpisode(token, showId, data) {
  const form = new globalThis.FormData();
  form.append('title', data.title || '');
  form.append('summary', data.summary || '');
  form.append('description', data.description || '');

  if (data.audio_url) {
    form.append('audio_url', data.audio_url);
  }
  if (data.episode_number !== undefined && data.episode_number !== null) {
    form.append('episode_number', String(data.episode_number));
  }

  if (data.file && data.file.buffer) {
    const blob = new globalThis.Blob([data.file.buffer], {
      type: data.file.contentType || 'application/octet-stream'
    });
    form.append('audio', blob, data.file.filename || 'podcast-audio');
  }

  return request(`/api/v2/podcasts/${encodeURIComponent(showId)}/episodes`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });
}

async function callFederationApi(token, method, path = '', data = undefined) {
  const normalizedPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';
  const options = {
    method,
    headers: { Authorization: `Bearer ${token}` }
  };

  if (data !== undefined) {
    options.body = JSON.stringify(data);
  }

  return request(`/api/v2/federation${normalizedPath}`, options);
}

async function getConversations(token) {
  return request('/api/messages', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function getConversation(token, id) {
  return request(`/api/messages/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function getUnreadCount(token) {
  // Check cache first
  const key = cacheKey(token, 'msg-unread');
  const cached = cache.get(key);
  if (cached !== undefined) {
    return cached;
  }

  const result = await request('/api/messages/unread-count', {
    headers: { Authorization: `Bearer ${token}` }
  });

  cache.set(key, result, CACHE_TTL.COUNTS);
  return result;
}

async function sendMessage(token, recipientId, content) {
  return request('/api/messages', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ recipient_id: recipientId, content })
  });
}

async function replyToConversation(token, conversationId, content) {
  return request(`/api/messages/${encodeURIComponent(conversationId)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ content })
  });
}

// Alias for sendMessage — kept for backward compatibility with callers
const startConversation = sendMessage;

async function markConversationRead(token, conversationId) {
  const result = await request(`/api/messages/${encodeURIComponent(conversationId)}/read`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` }
  });

  // Invalidate message unread count cache
  cache.delete(cacheKey(token, 'msg-unread'));

  return result;
}

// Connections
async function getConnections(token, status = null) {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return request(`/api/connections${query}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function getPendingConnections(token) {
  return request('/api/connections/pending', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function sendConnectionRequest(token, userId) {
  return request('/api/connections', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ user_id: parseInt(userId, 10) })
  });
}

async function getMemberConnectionStatus(token, userId) {
  return request(`/api/v2/connections/status/${encodeURIComponent(userId)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function sendMemberConnectionRequest(token, userId) {
  return request('/api/v2/connections/request', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ user_id: parseInt(userId, 10) })
  });
}

async function acceptMemberConnection(token, connectionId) {
  return request(`/api/v2/connections/${encodeURIComponent(connectionId)}/accept`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function declineMemberConnection(token, connectionId) {
  return request(`/api/v2/connections/${encodeURIComponent(connectionId)}/decline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function removeMemberConnection(token, connectionId) {
  return request(`/api/v2/connections/${encodeURIComponent(connectionId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function blockMember(token, userId, reason = '') {
  return request(`/api/v2/users/${encodeURIComponent(userId)}/block`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ reason })
  });
}

async function unblockMember(token, userId) {
  return request(`/api/v2/users/${encodeURIComponent(userId)}/block`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function endorseMemberSkill(token, userId, data) {
  return request(`/api/v2/members/${encodeURIComponent(userId)}/endorse`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function removeMemberEndorsement(token, userId, skillName) {
  return request(`/api/v2/members/${encodeURIComponent(userId)}/endorse`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ skill_name: skillName })
  });
}

async function acceptConnection(token, connectionId) {
  return request(`/api/connections/${encodeURIComponent(connectionId)}/accept`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function declineConnection(token, connectionId) {
  return request(`/api/connections/${encodeURIComponent(connectionId)}/decline`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function removeConnection(token, connectionId) {
  return request(`/api/connections/${encodeURIComponent(connectionId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
}

// Notifications
async function getNotifications(token, params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);
  if (params.unread_only) query.set('unread_only', 'true');

  const queryString = query.toString();
  const endpoint = `/api/notifications${queryString ? `?${queryString}` : ''}`;

  return request(endpoint, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function getNotification(token, id) {
  return request(`/api/notifications/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function getNotificationUnreadCount(token) {
  // Check cache first
  const key = cacheKey(token, 'notif-unread');
  const cached = cache.get(key);
  if (cached !== undefined) {
    return cached;
  }

  const result = await request('/api/notifications/unread-count', {
    headers: { Authorization: `Bearer ${token}` }
  });

  cache.set(key, result, CACHE_TTL.COUNTS);
  return result;
}

async function markNotificationRead(token, id) {
  const result = await request(`/api/notifications/${encodeURIComponent(id)}/read`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` }
  });

  // Invalidate notification unread count cache
  cache.delete(cacheKey(token, 'notif-unread'));

  return result;
}

async function markAllNotificationsRead(token) {
  const result = await request('/api/v2/notifications/read-all', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });

  // Invalidate notification unread count cache
  cache.delete(cacheKey(token, 'notif-unread'));

  return result;
}

async function markNotificationGroupRead(token, groupKey) {
  const result = await request('/api/v2/notifications/group/read', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ group_key: groupKey })
  });

  cache.delete(cacheKey(token, 'notif-unread'));
  return result;
}

async function deleteAllNotifications(token) {
  const result = await request('/api/v2/notifications', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });

  cache.delete(cacheKey(token, 'notif-unread'));
  return result;
}

async function deleteNotification(token, id) {
  const result = await request(`/api/notifications/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });

  // Invalidate notification unread count cache (deleting unread notification changes count)
  cache.delete(cacheKey(token, 'notif-unread'));

  return result;
}

// Groups
async function getGroups(token, params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);
  if (params.search) query.set('search', params.search);

  const queryString = query.toString();
  const endpoint = `/api/groups${queryString ? `?${queryString}` : ''}`;

  return request(endpoint, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function getMyGroups(token) {
  return request('/api/groups/my', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function getGroup(token, id) {
  return request(`/api/groups/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function createGroup(token, data) {
  return request('/api/groups', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function updateGroup(token, id, data) {
  return request(`/api/groups/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function deleteGroup(token, id) {
  return request(`/api/groups/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function getGroupMembers(token, groupId) {
  return request(`/api/groups/${encodeURIComponent(groupId)}/members`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function joinGroup(token, groupId) {
  return request(`/api/groups/${encodeURIComponent(groupId)}/join`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function leaveGroup(token, groupId) {
  return request(`/api/groups/${encodeURIComponent(groupId)}/leave`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function addGroupMember(token, groupId, userId) {
  return request(`/api/groups/${encodeURIComponent(groupId)}/members`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ user_id: userId })
  });
}

async function removeGroupMember(token, groupId, memberId) {
  return request(`/api/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(memberId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function updateGroupMemberRole(token, groupId, memberId, role) {
  return request(`/api/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(memberId)}/role`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ role })
  });
}

async function transferGroupOwnership(token, groupId, newOwnerId) {
  return request(`/api/groups/${encodeURIComponent(groupId)}/transfer-ownership`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ new_owner_id: newOwnerId })
  });
}

// Events
async function getEvents(token, params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);
  if (params.group_id) query.set('group_id', params.group_id);
  if (params.upcoming_only) query.set('upcoming_only', 'true');
  if (params.search) query.set('search', params.search);

  const queryString = query.toString();
  const endpoint = `/api/events${queryString ? `?${queryString}` : ''}`;

  return request(endpoint, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function getMyEvents(token) {
  return request('/api/events/my', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function getEvent(token, id) {
  return request(`/api/events/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function createEvent(token, data) {
  return request('/api/events', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function updateEvent(token, id, data) {
  return request(`/api/events/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function cancelEvent(token, id) {
  return request(`/api/events/${encodeURIComponent(id)}/cancel`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function deleteEvent(token, id) {
  return request(`/api/events/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function getEventRsvps(token, eventId, status = null) {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return request(`/api/events/${encodeURIComponent(eventId)}/rsvps${query}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function rsvpToEvent(token, eventId, status) {
  return request(`/api/events/${encodeURIComponent(eventId)}/rsvp`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status })
  });
}

async function removeEventRsvp(token, eventId) {
  return request(`/api/events/${encodeURIComponent(eventId)}/rsvp`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
}

// Feed
async function getFeedPosts(token, params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);
  if (params.group_id) query.set('group_id', params.group_id);

  const queryString = query.toString();
  const endpoint = `/api/feed${queryString ? `?${queryString}` : ''}`;

  return request(endpoint, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function getFeedPost(token, id) {
  return request(`/api/feed/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function createFeedPost(token, data) {
  return request('/api/feed', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function createFeedPostV2(token, data) {
  const file = data.file || data.image;
  if (file && file.buffer) {
    const form = new globalThis.FormData();
    for (const [key, value] of Object.entries(data)) {
      if (['file', 'image'].includes(key) || value === undefined || value === null) continue;
      form.append(key, String(value));
    }
    const blob = new globalThis.Blob([file.buffer], {
      type: file.contentType || 'application/octet-stream'
    });
    form.append('image', blob, file.filename || 'feed-image');

    return request('/api/v2/feed/posts', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form
    });
  }

  return request('/api/v2/feed/posts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function updateFeedPost(token, id, data) {
  return request(`/api/feed/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function updateFeedPostV2(token, id, data) {
  return request(`/api/v2/feed/posts/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function deleteFeedPost(token, id) {
  return request(`/api/feed/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function deleteFeedPostV2(token, id) {
  return request(`/api/v2/feed/posts/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function likeFeedPost(token, postId) {
  return request(`/api/feed/${encodeURIComponent(postId)}/like`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function unlikeFeedPost(token, postId) {
  return request(`/api/feed/${encodeURIComponent(postId)}/like`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function toggleFeedLike(token, data) {
  return request('/api/v2/feed/like', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function markFeedItemNotInterested(token, id, data = {}) {
  return request(`/api/v2/feed/posts/${encodeURIComponent(id)}/not-interested`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function hideFeedItem(token, id, data = {}) {
  return request(`/api/v2/feed/posts/${encodeURIComponent(id)}/hide`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function reportFeedItem(token, type, id, data = {}) {
  return request(`/api/v2/feed/items/${encodeURIComponent(type)}/${encodeURIComponent(id)}/report`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function muteFeedUser(token, id) {
  return request(`/api/v2/feed/users/${encodeURIComponent(id)}/mute`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function shareFeedItem(token, data) {
  return request('/api/v2/shares', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function voteFeedPoll(token, id, data) {
  return request(`/api/v2/feed/polls/${encodeURIComponent(id)}/vote`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function getFeedComments(token, postId, params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);

  const queryString = query.toString();
  const endpoint = `/api/feed/${encodeURIComponent(postId)}/comments${queryString ? `?${queryString}` : ''}`;

  return request(endpoint, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function addFeedComment(token, postId, content) {
  return request(`/api/feed/${encodeURIComponent(postId)}/comments`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ content })
  });
}

async function deleteFeedComment(token, postId, commentId) {
  return request(`/api/feed/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
}

// Reports
async function submitReport(token, data) {
  return request('/api/reports', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function submitSupportReport(token, data) {
  return request('/api/v2/support/reports', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function getMyReports(token, params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);
  if (params.status) query.set('status', params.status);

  const queryString = query.toString();
  const endpoint = `/api/reports/my${queryString ? `?${queryString}` : ''}`;

  return request(endpoint, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

// Gamification
async function getGamificationProfile(token) {
  return request('/api/gamification/profile', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function getGamificationProfileByUserId(token, userId) {
  return request(`/api/gamification/profile/${encodeURIComponent(userId)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function getAllBadges(token) {
  return request('/api/gamification/badges', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function getMyBadges(token) {
  return request('/api/gamification/badges/my', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function getLeaderboard(token, params = {}) {
  const query = new URLSearchParams();
  if (params.period) query.set('period', params.period);
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);

  const queryString = query.toString();
  const endpoint = `/api/gamification/leaderboard${queryString ? `?${queryString}` : ''}`;

  return request(endpoint, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function getXpHistory(token, params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);

  const queryString = query.toString();
  const endpoint = `/api/gamification/xp-history${queryString ? `?${queryString}` : ''}`;

  return request(endpoint, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function claimDailyReward(token) {
  return request('/api/v2/gamification/daily-reward', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function claimGamificationChallenge(token, id) {
  return request(`/api/v2/gamification/challenges/${encodeURIComponent(id)}/claim`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function purchaseGamificationShopItem(token, itemId) {
  return request('/api/v2/gamification/shop/purchase', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ item_id: itemId })
  });
}

async function updateGamificationShowcase(token, badgeKeys) {
  return request('/api/v2/gamification/showcase', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ badge_keys: badgeKeys })
  });
}

// Search
async function search(token, query, type = 'all', page = 1, limit = 20) {
  const params = new URLSearchParams();
  params.set('q', query);
  if (type && type !== 'all') params.set('type', type);
  if (page) params.set('page', page);
  if (limit) params.set('limit', limit);

  return request(`/api/search?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function searchSuggestions(token, query, limit = 5) {
  const params = new URLSearchParams();
  params.set('q', query);
  if (limit) params.set('limit', limit);

  return request(`/api/search/suggestions?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function saveSavedSearch(token, data) {
  return request('/api/v2/search/saved', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function deleteSavedSearch(token, id) {
  return request(`/api/v2/search/saved/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function runSavedSearch(token, id, data = {}) {
  return request(`/api/v2/search/saved/${encodeURIComponent(id)}/run`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function getMembers(token, query = '', page = 1, limit = 20) {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (page) params.set('page', page);
  if (limit) params.set('limit', limit);

  const queryString = params.toString();
  return request(`/api/users${queryString ? `?${queryString}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

// Reviews
async function getUserReviews(token, userId, page = 1, limit = 20) {
  const params = new URLSearchParams();
  if (page) params.set('page', page);
  if (limit) params.set('limit', limit);

  const queryString = params.toString();
  return request(`/api/users/${encodeURIComponent(userId)}/reviews${queryString ? `?${queryString}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function createUserReview(token, userId, data) {
  return request(`/api/users/${encodeURIComponent(userId)}/reviews`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function getListingReviews(token, listingId, page = 1, limit = 20) {
  const params = new URLSearchParams();
  if (page) params.set('page', page);
  if (limit) params.set('limit', limit);

  const queryString = params.toString();
  return request(`/api/listings/${encodeURIComponent(listingId)}/reviews${queryString ? `?${queryString}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function createListingReview(token, listingId, data) {
  return request(`/api/listings/${encodeURIComponent(listingId)}/reviews`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function getReview(token, reviewId) {
  return request(`/api/reviews/${encodeURIComponent(reviewId)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function updateReview(token, reviewId, data) {
  return request(`/api/reviews/${encodeURIComponent(reviewId)}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function deleteReview(token, reviewId) {
  return request(`/api/reviews/${encodeURIComponent(reviewId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function createReview(token, data) {
  return request('/api/v2/reviews', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function createComment(token, data) {
  return request('/api/v2/comments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function updateComment(token, id, data) {
  return request(`/api/v2/comments/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function deleteComment(token, id) {
  return request(`/api/v2/comments/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function toggleReaction(token, data) {
  return request('/api/v2/reactions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

// Helper to invalidate all cached data for a user (e.g., on logout)
function invalidateUserCache(token) {
  const prefix = token.substring(0, 40);
  for (const key of cache.cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

// ============================================================================
// Admin API - Requires admin role
// ============================================================================

async function adminGetDashboard(token) {
  return request('/api/admin/dashboard', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function adminGetUsers(token, params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);
  if (params.role) query.set('role', params.role);
  if (params.status) query.set('status', params.status);
  if (params.search) query.set('search', params.search);

  const queryString = query.toString();
  const endpoint = `/api/admin/users${queryString ? `?${queryString}` : ''}`;

  return request(endpoint, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function adminGetUser(token, id) {
  return request(`/api/admin/users/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function adminUpdateUser(token, id, data) {
  return request(`/api/admin/users/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function adminSuspendUser(token, id, reason = null) {
  return request(`/api/admin/users/${encodeURIComponent(id)}/suspend`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ reason })
  });
}

async function adminActivateUser(token, id) {
  return request(`/api/admin/users/${encodeURIComponent(id)}/activate`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function adminGetPendingListings(token, params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);

  const queryString = query.toString();
  const endpoint = `/api/admin/listings/pending${queryString ? `?${queryString}` : ''}`;

  return request(endpoint, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function adminApproveListing(token, id) {
  return request(`/api/admin/listings/${encodeURIComponent(id)}/approve`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function adminRejectListing(token, id, reason) {
  return request(`/api/admin/listings/${encodeURIComponent(id)}/reject`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ reason })
  });
}

async function adminGetCategories(token) {
  return request('/api/admin/categories', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function adminCreateCategory(token, data) {
  return request('/api/admin/categories', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function adminUpdateCategory(token, id, data) {
  return request(`/api/admin/categories/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function adminDeleteCategory(token, id) {
  return request(`/api/admin/categories/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function adminGetConfig(token) {
  return request('/api/admin/config', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function adminUpdateConfig(token, config) {
  return request('/api/admin/config', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(config)
  });
}

async function adminGetRoles(token) {
  return request('/api/admin/roles', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function adminCreateRole(token, data) {
  return request('/api/admin/roles', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function adminUpdateRole(token, id, data) {
  return request(`/api/admin/roles/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function adminDeleteRole(token, id) {
  return request(`/api/admin/roles/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
}

// Preferences
async function getPreferences(token) {
  return request('/api/preferences', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function updatePreferences(token, data) {
  return request('/api/preferences', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function getNotificationPreferences(token) {
  return request('/api/preferences/notifications', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function updateNotificationPreference(token, data) {
  return request('/api/preferences/notifications', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function getPrivacyPreferences(token) {
  return request('/api/preferences/privacy', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function updatePrivacyPreferences(token, data) {
  return request('/api/preferences/privacy', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

module.exports = {
  ApiError,
  ApiOfflineError,
  // Cache
  invalidateUserCache,
  // Auth
  login,
  register,
  refreshToken,
  logout,
  submitContact,
  forgotPassword,
  resetPassword,
  resendVerification,
  changePassword,
  validateToken,
  verify2fa,
  // Users
  getProfile,
  updateProfile,
  uploadProfileAvatar,
  uploadInsuranceCertificate,
  getOnboardingStatus,
  getOnboardingConfig,
  getOnboardingCategories,
  getOnboardingSafeguardingOptions,
  saveOnboardingSafeguarding,
  completeOnboarding,
  getUsers,
  searchUsers,
  getUser,
  // Listings
  getListings,
  getListing,
  createListing,
  updateListing,
  deleteListing,
  callListingApi,
  // Laravel volunteering
  getVolunteerOrganisations,
  getClubs,
  getVolunteeringOpportunities,
  getVolunteerOrganisation,
  getVolunteerOpportunity,
  getOrganisationOpportunities,
  getOrganisationReviews,
  getKnowledgeBaseArticles,
  getKnowledgeBaseArticle,
  getHelpFaqs,
  getMyVolunteerOrganisations,
  createVolunteerOrganisation,
  callVolunteeringApi,
  uploadVolunteerCredential,
  callMarketplaceApi,
  callCouponApi,
  uploadMarketplaceListingImages,
  callCourseApi,
  getMyCourses,
  callGroupApi,
  uploadGroupImage,
  uploadGroupFile,
  callIdeationApi,
  callGroupExchangeApi,
  callEventApi,
  getEventCategories,
  uploadEventImage,
  getGoals,
  getGoal,
  callGoalApi,
  callUgcTranslateApi,
  callUserSettingsApi,
  callProfileApi,
  callWebAuthnApi,
  getOrganisationJobs,
  getJobs,
  getJob,
  callJobApi,
  uploadJobApplication,
  callAdminJobApi,
  callJobDownload,
  // Wallet
  getBalance,
  getTransactions,
  getTransaction,
  transferCredits,
  transferWalletCredits,
  donateCredits,
  saveSavedItem,
  checkSavedItem,
  unsaveSavedItem,
  getSavedCollections,
  getSavedCollectionItems,
  getUserPublicCollections,
  getUserAppreciations,
  sendAppreciation,
  reactToAppreciation,
  getResources,
  getResourceCategories,
  getResourceCategoryTree,
  getSkillCategories,
  getSkillCategory,
  getSkillMembers,
  uploadResource,
  downloadResource,
  deleteResource,
  reorderResources,
  createSavedCollection,
  updateSavedCollection,
  deleteSavedCollection,
  deleteSavedItem,
  getBlogPosts,
  getBlogPost,
  getComments,
  getReactionSummary,
  getReactors,
  getPolls,
  getPoll,
  getPollCategories,
  getPollRankedResults,
  getPollExport,
  createPoll,
  deletePoll,
  votePoll,
  rankPoll,
  dismissMatch,
  getExchangeConfig,
  getExchanges,
  getExchange,
  getExchangeRatings,
  performExchangeAction,
  createExchangeRequest,
  rateExchange,
  sendAiChat,
  getAiConversations,
  getAiConversation,
  getExplore,
  getMemberPremiumTiers,
  getMemberPremiumMe,
  createMemberPremiumCheckout,
  createMemberPremiumPortal,
  cancelMemberPremium,
  // Messages
  callMessageApi,
  uploadVoiceMessage,
  uploadMessageAttachments,
  callConversationApi,
  callPodcastApi,
  uploadPodcastEpisode,
  callFederationApi,
  getConversations,
  getConversation,
  getUnreadCount,
  sendMessage,
  replyToConversation,
  startConversation,
  markConversationRead,
  // Connections
  getConnections,
  getPendingConnections,
  sendConnectionRequest,
  getMemberConnectionStatus,
  sendMemberConnectionRequest,
  acceptMemberConnection,
  declineMemberConnection,
  removeMemberConnection,
  blockMember,
  unblockMember,
  endorseMemberSkill,
  removeMemberEndorsement,
  acceptConnection,
  declineConnection,
  removeConnection,
  // Notifications
  getNotifications,
  getNotification,
  getNotificationUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  markNotificationGroupRead,
  deleteAllNotifications,
  deleteNotification,
  // Groups
  getGroups,
  getMyGroups,
  getGroup,
  createGroup,
  updateGroup,
  deleteGroup,
  getGroupMembers,
  joinGroup,
  leaveGroup,
  addGroupMember,
  removeGroupMember,
  updateGroupMemberRole,
  transferGroupOwnership,
  // Events
  getEvents,
  getMyEvents,
  getEvent,
  createEvent,
  updateEvent,
  cancelEvent,
  deleteEvent,
  getEventRsvps,
  rsvpToEvent,
  removeEventRsvp,
  // Feed
  getFeedPosts,
  getFeedPost,
  createFeedPost,
  createFeedPostV2,
  updateFeedPost,
  updateFeedPostV2,
  deleteFeedPost,
  deleteFeedPostV2,
  likeFeedPost,
  unlikeFeedPost,
  toggleFeedLike,
  markFeedItemNotInterested,
  hideFeedItem,
  reportFeedItem,
  muteFeedUser,
  shareFeedItem,
  voteFeedPoll,
  getFeedComments,
  addFeedComment,
  deleteFeedComment,
  // Reports
  submitReport,
  submitSupportReport,
  getMyReports,
  // Gamification
  getGamificationProfile,
  getGamificationProfileByUserId,
  getAllBadges,
  getMyBadges,
  getLeaderboard,
  getXpHistory,
  claimDailyReward,
  claimGamificationChallenge,
  purchaseGamificationShopItem,
  updateGamificationShowcase,
  // Search
  search,
  searchSuggestions,
  saveSavedSearch,
  deleteSavedSearch,
  runSavedSearch,
  getMembers,
  // Reviews
  getUserReviews,
  createUserReview,
  getListingReviews,
  createListingReview,
  getReview,
  updateReview,
  deleteReview,
  createReview,
  createComment,
  updateComment,
  deleteComment,
  toggleReaction,
  // Admin
  adminGetDashboard,
  adminGetUsers,
  adminGetUser,
  adminUpdateUser,
  adminSuspendUser,
  adminActivateUser,
  adminGetPendingListings,
  adminApproveListing,
  adminRejectListing,
  adminGetCategories,
  adminCreateCategory,
  adminUpdateCategory,
  adminDeleteCategory,
  adminGetConfig,
  adminUpdateConfig,
  adminGetRoles,
  adminCreateRole,
  adminUpdateRole,
  adminDeleteRole,
  // Preferences
  getPreferences,
  updatePreferences,
  getNotificationPreferences,
  updateNotificationPreference,
  getPrivacyPreferences,
  updatePrivacyPreferences
};
