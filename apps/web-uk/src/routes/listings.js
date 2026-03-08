const express = require('express');
const { requireAuth } = require('../middleware/auth');
const {
  getListings,
  getListing,
  createListing,
  updateListing,
  deleteListing,
  getListingReviews,
  ApiError
} = require('../lib/api');
const { asyncRoute } = require('../lib/routeHelpers');
const { audit } = require('../lib/auditLogger');

const router = express.Router();

router.use(requireAuth);

// List all listings with search/filter/pagination
router.get('/', asyncRoute(async (req, res) => {
  const { search, status, page = 1 } = req.query;
  const params = { search, status, page, limit: 20 };

  const data = await getListings(req.token, params);

  // Handle both array and paginated response formats
  let listings, pagination;
  if (Array.isArray(data)) {
    listings = data;
    pagination = null;
  } else {
    listings = data.data || data.items || [];
    pagination = {
      currentPage: parseInt(page, 10),
      totalPages: data.totalPages || Math.ceil((data.total || listings.length) / 20),
      total: data.total || listings.length
    };
  }

  res.render('listings/index', {
    title: 'Listings',
    listings,
    pagination,
    filters: { search, status },
    successMessage: req.flash ? req.flash('success')[0] : null
  });
}));

// New listing form
router.get('/new', (req, res) => {
  res.render('listings/form', {
    title: 'Create listing',
    listing: null,
    values: null,
    errors: null,
    fieldErrors: {},
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
});

// Create listing
router.post('/new', audit.listingCreate(), asyncRoute(async (req, res) => {
  const { title, description, status } = req.body;

  // Basic validation
  const errors = [];
  const fieldErrors = {};

  if (!title || !title.trim()) {
    errors.push({ text: 'Enter a title', href: '#title' });
    fieldErrors.title = 'Enter a title';
  }

  if (!status) {
    errors.push({ text: 'Select a status', href: '#status' });
    fieldErrors.status = 'Select a status';
  }

  if (errors.length > 0) {
    return res.render('listings/form', {
      title: 'Create listing',
      listing: null,
      values: { title, description, status },
      errors,
      fieldErrors,
      csrfToken: req.csrfToken ? req.csrfToken() : ''
    });
  }

  try {
    await createListing(req.token, { title: title.trim(), description, status });

    if (req.flash) {
      req.flash('success', 'Listing created successfully');
    }
    res.redirect('/listings');
  } catch (error) {
    // Handle validation errors from API specifically for form re-render
    if (error instanceof ApiError && error.status === 400) {
      return res.render('listings/form', {
        title: 'Create listing',
        listing: null,
        values: req.body,
        errors: [{ text: error.message }],
        fieldErrors: error.data?.errors || {},
        csrfToken: req.csrfToken ? req.csrfToken() : ''
      });
    }
    throw error; // Re-throw for asyncRoute to handle 401/404/etc
  }
}));

// View listing detail
router.get('/:id', asyncRoute(async (req, res) => {
  const [listing, reviewsResult] = await Promise.all([
    getListing(req.token, req.params.id),
    getListingReviews(req.token, req.params.id).catch(() => ({ data: [], summary: null }))
  ]);

  res.render('listings/detail', {
    title: listing.title || listing.name || 'Listing details',
    listing,
    reviews: reviewsResult.data || [],
    reviewSummary: reviewsResult.summary || null,
    successMessage: req.flash ? req.flash('success')[0] : null,
    errorMessage: req.flash ? req.flash('error')[0] : null,
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}, { notFoundTitle: 'Listing not found' }));

// Edit listing form
router.get('/:id/edit', asyncRoute(async (req, res) => {
  const listing = await getListing(req.token, req.params.id);

  res.render('listings/form', {
    title: 'Edit listing',
    listing,
    values: null,
    errors: null,
    fieldErrors: {},
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}, { notFoundTitle: 'Listing not found' }));

// Update listing
router.post('/:id/edit', audit.listingUpdate(), asyncRoute(async (req, res) => {
  const { id } = req.params;
  const { title, description, status } = req.body;

  // Basic validation
  const errors = [];
  const fieldErrors = {};

  if (!title || !title.trim()) {
    errors.push({ text: 'Enter a title', href: '#title' });
    fieldErrors.title = 'Enter a title';
  }

  if (!status) {
    errors.push({ text: 'Select a status', href: '#status' });
    fieldErrors.status = 'Select a status';
  }

  if (errors.length > 0) {
    return res.render('listings/form', {
      title: 'Edit listing',
      listing: { id },
      values: { title, description, status },
      errors,
      fieldErrors,
      csrfToken: req.csrfToken ? req.csrfToken() : ''
    });
  }

  try {
    await updateListing(req.token, id, { title: title.trim(), description, status });

    if (req.flash) {
      req.flash('success', 'Listing updated successfully');
    }
    res.redirect('/listings');
  } catch (error) {
    // Handle validation errors from API specifically for form re-render
    if (error instanceof ApiError && error.status === 400) {
      return res.render('listings/form', {
        title: 'Edit listing',
        listing: { id: req.params.id },
        values: req.body,
        errors: [{ text: error.message }],
        fieldErrors: error.data?.errors || {},
        csrfToken: req.csrfToken ? req.csrfToken() : ''
      });
    }
    throw error; // Re-throw for asyncRoute to handle 401/404/etc
  }
}));

// Delete confirmation page
router.get('/:id/delete', asyncRoute(async (req, res) => {
  const listing = await getListing(req.token, req.params.id);

  res.render('listings/delete', {
    title: 'Delete listing',
    listing,
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}, { notFoundTitle: 'Listing not found' }));

// Delete listing
router.post('/:id/delete', audit.listingDelete(), asyncRoute(async (req, res) => {
  await deleteListing(req.token, req.params.id);

  if (req.flash) {
    req.flash('success', 'Listing deleted successfully');
  }
  res.redirect('/listings');
}, { notFoundTitle: 'Listing not found' }));

module.exports = router;
