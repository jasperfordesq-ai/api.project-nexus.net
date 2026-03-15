// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { asyncRoute } = require('../lib/routeHelpers');
const {
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
  ApiError
} = require('../lib/api');
const { audit } = require('../lib/auditLogger');
const {
  validatePageNumber,
  isValidEmail,
  isValidLength,
  isValidEnum,
  isValidPositiveInt,
  sanitizeString,
  isValidSlug,
  validationResult,
  collectErrors,
  ALLOWED_USER_ROLES,
  ALLOWED_USER_STATUSES
} = require('../lib/inputValidator');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(requireAuth);
router.use(requireAdmin);

// ============================================================================
// Dashboard
// ============================================================================

router.get('/', asyncRoute(async (req, res) => {
  const dashboard = await adminGetDashboard(req.token);

  res.render('admin/dashboard', {
    title: 'Admin Dashboard',
    dashboard,
    user: req.user
  });
}));

// ============================================================================
// Users Management
// ============================================================================

router.get('/users', asyncRoute(async (req, res) => {
  const { page = 1, search, role, status } = req.query;

  // Validate query parameters
  const validatedPage = validatePageNumber(page);
  const validatedSearch = search ? sanitizeString(search).substring(0, 100) : undefined;
  const validatedRole = isValidEnum(role, ALLOWED_USER_ROLES) ? role : undefined;
  const validatedStatus = isValidEnum(status, ALLOWED_USER_STATUSES) ? status : undefined;

  const result = await adminGetUsers(req.token, {
    page: validatedPage,
    search: validatedSearch,
    role: validatedRole,
    status: validatedStatus,
    limit: 20
  });

  const users = result.items || result.data || [];
  const pagination = result.pagination;
  const totalPages = pagination ? (pagination.totalPages || pagination.total_pages || 1) : 1;

  res.render('admin/users/index', {
    title: 'Manage Users',
    users,
    pagination,
    paginationConfig: {
      baseUrl: '/admin/users',
      page: validatedPage,
      totalPages,
      queryParams: {
        search: validatedSearch || '',
        role: validatedRole || '',
        status: validatedStatus || ''
      }
    },
    filters: { search: validatedSearch, role: validatedRole, status: validatedStatus },
    user: req.user
  });
}));

router.get('/users/:id', asyncRoute(async (req, res) => {
  const result = await adminGetUser(req.token, req.params.id);
  const userData = result.user || result.data || result;

  res.render('admin/users/view', {
    title: 'User Details',
    userData,
    stats: result.stats,
    user: req.user,
    successMessage: req.flash ? req.flash('success')[0] : null,
    errorMessage: req.flash ? req.flash('error')[0] : null
  });
}));

router.get('/users/:id/edit', asyncRoute(async (req, res) => {
  const result = await adminGetUser(req.token, req.params.id);
  const userData = result.user || result.data || result;

  res.render('admin/users/edit', {
    title: 'Edit User',
    userData,
    user: req.user,
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}));

router.post('/users/:id/edit', audit.userUpdate(), asyncRoute(async (req, res) => {
  const { first_name, last_name, email, role } = req.body;

  // Validate input
  const validations = [
    validationResult(isValidLength(first_name, 1, 100), 'first_name', 'Enter a valid first name (1-100 characters)'),
    validationResult(isValidLength(last_name, 1, 100), 'last_name', 'Enter a valid last name (1-100 characters)'),
    validationResult(isValidEmail(email), 'email', 'Enter a valid email address'),
    validationResult(isValidEnum(role, ALLOWED_USER_ROLES, false), 'role', 'Select a valid role')
  ];

  const { errors, fieldErrors } = collectErrors(validations);

  if (errors.length > 0) {
    const result = await adminGetUser(req.token, req.params.id);
    return res.render('admin/users/edit', {
      title: 'Edit User',
      userData: { ...result.user, first_name, last_name, email, role },
      user: req.user,
      errors,
      fieldErrors,
      csrfToken: req.csrfToken ? req.csrfToken() : ''
    });
  }

  try {
    await adminUpdateUser(req.token, req.params.id, {
      first_name: sanitizeString(first_name),
      last_name: sanitizeString(last_name),
      email: email.trim().toLowerCase(),
      role
    });

    req.flash('success', 'User updated successfully');
    res.redirect(`/admin/users/${req.params.id}`);
  } catch (error) {
    if (error instanceof ApiError && error.status !== 401) {
      const result = await adminGetUser(req.token, req.params.id);
      return res.render('admin/users/edit', {
        title: 'Edit User',
        userData: result.user,
        user: req.user,
        error: error.message,
        csrfToken: req.csrfToken ? req.csrfToken() : ''
      });
    }
    throw error;
  }
}));

router.post('/users/:id/suspend', audit.userSuspend(), asyncRoute(async (req, res) => {
  const { reason } = req.body;

  try {
    await adminSuspendUser(req.token, req.params.id, reason);
    req.flash('success', 'User suspended successfully');
  } catch (error) {
    req.flash('error', error.message);
  }

  res.redirect(`/admin/users/${req.params.id}`);
}));

router.post('/users/:id/activate', audit.userActivate(), asyncRoute(async (req, res) => {
  try {
    await adminActivateUser(req.token, req.params.id);
    req.flash('success', 'User activated successfully');
  } catch (error) {
    req.flash('error', error.message);
  }

  res.redirect(`/admin/users/${req.params.id}`);
}));

// ============================================================================
// Content Moderation
// ============================================================================

router.get('/moderation', asyncRoute(async (req, res) => {
  const { page = 1 } = req.query;
  const validatedPage = validatePageNumber(page);
  const result = await adminGetPendingListings(req.token, { page: validatedPage, limit: 20 });

  const listings = result.items || result.data || [];
  const moderationPagination = result.pagination;
  const moderationTotalPages = moderationPagination ? (moderationPagination.totalPages || moderationPagination.total_pages || 1) : 1;

  res.render('admin/moderation/index', {
    title: 'Content Moderation',
    listings,
    pagination: moderationPagination,
    paginationConfig: {
      baseUrl: '/admin/moderation',
      page: validatedPage,
      totalPages: moderationTotalPages,
      queryParams: {}
    },
    user: req.user,
    successMessage: req.flash ? req.flash('success')[0] : null,
    errorMessage: req.flash ? req.flash('error')[0] : null
  });
}));

router.post('/moderation/:id/approve', audit.listingApprove(), asyncRoute(async (req, res) => {
  try {
    await adminApproveListing(req.token, req.params.id);
    req.flash('success', 'Listing approved successfully');
  } catch (error) {
    req.flash('error', error.message);
  }

  res.redirect('/admin/moderation');
}));

router.post('/moderation/:id/reject', audit.listingReject(), asyncRoute(async (req, res) => {
  const { reason } = req.body;

  try {
    await adminRejectListing(req.token, req.params.id, reason);
    req.flash('success', 'Listing rejected');
  } catch (error) {
    req.flash('error', error.message);
  }

  res.redirect('/admin/moderation');
}));

// ============================================================================
// Categories
// ============================================================================

router.get('/categories', asyncRoute(async (req, res) => {
  const result = await adminGetCategories(req.token);

  res.render('admin/categories/index', {
    title: 'Manage Categories',
    categories: result.items || result.data || [],
    user: req.user,
    successMessage: req.flash ? req.flash('success')[0] : null,
    errorMessage: req.flash ? req.flash('error')[0] : null
  });
}));

router.get('/categories/new', (req, res) => {
  res.render('admin/categories/form', {
    title: 'Add Category',
    category: null,
    user: req.user,
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
});

router.post('/categories/new', audit.categoryCreate(), asyncRoute(async (req, res) => {
  const { name, description, slug, sort_order, is_active } = req.body;

  // Validate input
  const validations = [
    validationResult(isValidLength(name, 1, 100), 'name', 'Enter a category name (1-100 characters)'),
    validationResult(isValidLength(description, 0, 500), 'description', 'Description must be under 500 characters')
  ];

  if (slug && slug.trim()) {
    validations.push(validationResult(isValidSlug(slug), 'slug', 'Slug must be lowercase letters, numbers and hyphens only'));
  }

  if (sort_order && sort_order.trim()) {
    validations.push(validationResult(isValidPositiveInt(sort_order, 0, 9999), 'sort_order', 'Sort order must be a number between 0 and 9999'));
  }

  const { errors, fieldErrors } = collectErrors(validations);

  if (errors.length > 0) {
    return res.render('admin/categories/form', {
      title: 'Add Category',
      category: req.body,
      user: req.user,
      errors,
      fieldErrors,
      csrfToken: req.csrfToken ? req.csrfToken() : ''
    });
  }

  try {
    await adminCreateCategory(req.token, {
      name: sanitizeString(name),
      description: sanitizeString(description),
      slug: slug ? slug.trim().toLowerCase() : undefined,
      sort_order: parseInt(sort_order, 10) || 0,
      is_active: is_active === 'on'
    });

    req.flash('success', 'Category created successfully');
    res.redirect('/admin/categories');
  } catch (error) {
    if (error instanceof ApiError && error.status !== 401) {
      return res.render('admin/categories/form', {
        title: 'Add Category',
        category: req.body,
        user: req.user,
        errors: [{ text: error.message }],
        csrfToken: req.csrfToken ? req.csrfToken() : ''
      });
    }
    throw error;
  }
}));

router.get('/categories/:id/edit', asyncRoute(async (req, res) => {
  const result = await adminGetCategories(req.token);
  const category = (result.items || result.data || []).find(c => c.id === parseInt(req.params.id));

  if (!category) {
    return res.status(404).render('errors/404', { title: 'Category not found' });
  }

  res.render('admin/categories/form', {
    title: 'Edit Category',
    category,
    user: req.user,
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}));

router.post('/categories/:id/edit', audit.categoryUpdate(), asyncRoute(async (req, res) => {
  const { name, description, slug, sort_order, is_active } = req.body;

  // Validate input
  const validations = [
    validationResult(isValidLength(name, 1, 100), 'name', 'Enter a category name (1-100 characters)'),
    validationResult(isValidLength(description, 0, 500), 'description', 'Description must be under 500 characters')
  ];

  if (slug && slug.trim()) {
    validations.push(validationResult(isValidSlug(slug), 'slug', 'Slug must be lowercase letters, numbers and hyphens only'));
  }

  if (sort_order && sort_order.trim()) {
    validations.push(validationResult(isValidPositiveInt(sort_order, 0, 9999), 'sort_order', 'Sort order must be a number between 0 and 9999'));
  }

  const { errors, fieldErrors } = collectErrors(validations);

  if (errors.length > 0) {
    return res.render('admin/categories/form', {
      title: 'Edit Category',
      category: { ...req.body, id: req.params.id },
      user: req.user,
      errors,
      fieldErrors,
      csrfToken: req.csrfToken ? req.csrfToken() : ''
    });
  }

  try {
    await adminUpdateCategory(req.token, req.params.id, {
      name: sanitizeString(name),
      description: sanitizeString(description),
      slug: slug ? slug.trim().toLowerCase() : undefined,
      sort_order: parseInt(sort_order, 10) || 0,
      is_active: is_active === 'on'
    });

    req.flash('success', 'Category updated successfully');
    res.redirect('/admin/categories');
  } catch (error) {
    if (error instanceof ApiError && error.status !== 401) {
      return res.render('admin/categories/form', {
        title: 'Edit Category',
        category: { ...req.body, id: req.params.id },
        user: req.user,
        errors: [{ text: error.message }],
        csrfToken: req.csrfToken ? req.csrfToken() : ''
      });
    }
    throw error;
  }
}));

router.post('/categories/:id/delete', audit.categoryDelete(), asyncRoute(async (req, res) => {
  try {
    await adminDeleteCategory(req.token, req.params.id);
    req.flash('success', 'Category deleted successfully');
  } catch (error) {
    req.flash('error', error.message);
  }

  res.redirect('/admin/categories');
}));

// ============================================================================
// Configuration
// ============================================================================

router.get('/config', asyncRoute(async (req, res) => {
  const result = await adminGetConfig(req.token);

  res.render('admin/config/index', {
    title: 'Tenant Configuration',
    config: result.config || {},
    configItems: result.data || [],
    user: req.user,
    successMessage: req.flash ? req.flash('success')[0] : null,
    errorMessage: req.flash ? req.flash('error')[0] : null,
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}));

router.post('/config', audit.configUpdate(), asyncRoute(async (req, res) => {
  // Build config object from form data
  const config = {};
  for (const [key, value] of Object.entries(req.body)) {
    if (key !== '_csrf') {
      config[key] = value;
    }
  }

  try {
    await adminUpdateConfig(req.token, config);
    req.flash('success', 'Configuration saved successfully');
  } catch (error) {
    req.flash('error', error.message);
  }

  res.redirect('/admin/config');
}));

// ============================================================================
// Roles
// ============================================================================

router.get('/roles', asyncRoute(async (req, res) => {
  const result = await adminGetRoles(req.token);

  res.render('admin/roles/index', {
    title: 'Manage Roles',
    roles: result.items || result.data || [],
    user: req.user,
    successMessage: req.flash ? req.flash('success')[0] : null,
    errorMessage: req.flash ? req.flash('error')[0] : null
  });
}));

router.get('/roles/new', (req, res) => {
  res.render('admin/roles/form', {
    title: 'Add Role',
    role: null,
    user: req.user,
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
});

router.post('/roles/new', audit.roleCreate(), asyncRoute(async (req, res) => {
  const { name, description, permissions } = req.body;

  // Validate input
  const validations = [
    validationResult(isValidLength(name, 1, 50), 'name', 'Enter a role name (1-50 characters)'),
    validationResult(isValidLength(description, 0, 255), 'description', 'Description must be under 255 characters')
  ];

  const { errors, fieldErrors } = collectErrors(validations);

  if (errors.length > 0) {
    return res.render('admin/roles/form', {
      title: 'Add Role',
      role: req.body,
      user: req.user,
      errors,
      fieldErrors,
      csrfToken: req.csrfToken ? req.csrfToken() : ''
    });
  }

  // permissions comes as array from checkboxes
  const permissionsArray = Array.isArray(permissions) ? permissions : (permissions ? [permissions] : []);

  // Sanitize permissions - only allow alphanumeric and underscores
  const sanitizedPermissions = permissionsArray
    .filter(p => typeof p === 'string' && /^[a-z_.]+$/i.test(p))
    .map(p => p.toLowerCase());

  try {
    await adminCreateRole(req.token, {
      name: sanitizeString(name),
      description: sanitizeString(description),
      permissions: JSON.stringify(sanitizedPermissions)
    });

    req.flash('success', 'Role created successfully');
    res.redirect('/admin/roles');
  } catch (error) {
    if (error instanceof ApiError && error.status !== 401) {
      return res.render('admin/roles/form', {
        title: 'Add Role',
        role: req.body,
        user: req.user,
        errors: [{ text: error.message }],
        csrfToken: req.csrfToken ? req.csrfToken() : ''
      });
    }
    throw error;
  }
}));

router.get('/roles/:id/edit', asyncRoute(async (req, res) => {
  const result = await adminGetRoles(req.token);
  const role = (result.items || result.data || []).find(r => r.id === parseInt(req.params.id));

  if (!role) {
    return res.status(404).render('errors/404', { title: 'Role not found' });
  }

  if (role.is_system) {
    req.flash('error', 'System roles cannot be edited');
    return res.redirect('/admin/roles');
  }

  // Parse permissions if it's a string
  if (typeof role.permissions === 'string') {
    try {
      role.permissions = JSON.parse(role.permissions);
    } catch (e) {
      role.permissions = [];
    }
  }

  res.render('admin/roles/form', {
    title: 'Edit Role',
    role,
    user: req.user,
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}));

router.post('/roles/:id/edit', audit.roleUpdate(), asyncRoute(async (req, res) => {
  const { name, description, permissions } = req.body;

  // Validate input
  const validations = [
    validationResult(isValidLength(name, 1, 50), 'name', 'Enter a role name (1-50 characters)'),
    validationResult(isValidLength(description, 0, 255), 'description', 'Description must be under 255 characters')
  ];

  const { errors, fieldErrors } = collectErrors(validations);

  if (errors.length > 0) {
    return res.render('admin/roles/form', {
      title: 'Edit Role',
      role: { ...req.body, id: req.params.id },
      user: req.user,
      errors,
      fieldErrors,
      csrfToken: req.csrfToken ? req.csrfToken() : ''
    });
  }

  const permissionsArray = Array.isArray(permissions) ? permissions : (permissions ? [permissions] : []);

  // Sanitize permissions - only allow alphanumeric and underscores
  const sanitizedPermissions = permissionsArray
    .filter(p => typeof p === 'string' && /^[a-z_.]+$/i.test(p))
    .map(p => p.toLowerCase());

  try {
    await adminUpdateRole(req.token, req.params.id, {
      name: sanitizeString(name),
      description: sanitizeString(description),
      permissions: JSON.stringify(sanitizedPermissions)
    });

    req.flash('success', 'Role updated successfully');
    res.redirect('/admin/roles');
  } catch (error) {
    if (error instanceof ApiError && error.status !== 401) {
      return res.render('admin/roles/form', {
        title: 'Edit Role',
        role: { ...req.body, id: req.params.id },
        user: req.user,
        errors: [{ text: error.message }],
        csrfToken: req.csrfToken ? req.csrfToken() : ''
      });
    }
    throw error;
  }
}));

router.post('/roles/:id/delete', audit.roleDelete(), asyncRoute(async (req, res) => {
  try {
    await adminDeleteRole(req.token, req.params.id);
    req.flash('success', 'Role deleted successfully');
  } catch (error) {
    req.flash('error', error.message);
  }

  res.redirect('/admin/roles');
}));

module.exports = router;
