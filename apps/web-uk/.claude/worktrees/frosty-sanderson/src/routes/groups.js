// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const {
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
  getEvents,
  getUsers,
  ApiError
} = require('../lib/api');
const { requireAuth } = require('../middleware/auth');
const { asyncRoute } = require('../lib/routeHelpers');
const { audit } = require('../lib/auditLogger');

const router = express.Router();

router.use(requireAuth);

// List all groups
router.get('/', asyncRoute(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = 20;
  const searchQuery = req.query.search ? req.query.search.trim() : '';

  const [groupsResult, myGroupsResult] = await Promise.all([
    getGroups(req.token, { page, limit, search: searchQuery }),
    getMyGroups(req.token)
  ]);

  const groups = groupsResult.data || [];
  const myGroups = myGroupsResult.data || [];
  const myGroupIds = new Set(myGroups.map(g => g.id));

  res.render('groups/index', {
    title: 'Groups',
    groups,
    myGroupIds,
    searchQuery,
    pagination: groupsResult.pagination || { page, total_pages: 1 },
    successMessage: req.flash ? req.flash('success')[0] : null,
    errorMessage: req.flash ? req.flash('error')[0] : null
  });
}));

// My groups
router.get('/my', asyncRoute(async (req, res) => {
  const result = await getMyGroups(req.token);
  const groups = result.data || [];

  res.render('groups/my', {
    title: 'My groups',
    groups,
    successMessage: req.flash ? req.flash('success')[0] : null
  });
}));

// Create group form
router.get('/new', (req, res) => {
  res.render('groups/new', {
    title: 'Create a group',
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
});

// Create group
router.post('/new', audit.groupCreate(), asyncRoute(async (req, res) => {
  const { name, description, is_private } = req.body;

  const errors = [];

  if (!name || !name.trim()) {
    errors.push({ text: 'Enter a group name', href: '#name' });
  } else if (name.length > 255) {
    errors.push({ text: 'Group name must be 255 characters or fewer', href: '#name' });
  }

  if (errors.length > 0) {
    return res.render('groups/new', {
      title: 'Create a group',
      errors,
      values: { name, description, is_private },
      csrfToken: req.csrfToken ? req.csrfToken() : ''
    });
  }

  try {
    const result = await createGroup(req.token, {
      name: name.trim(),
      description: description ? description.trim() : null,
      is_private: is_private === 'true'
    });

    if (req.flash) {
      req.flash('success', 'Group created successfully');
    }

    const groupId = result.group?.id || result.id;
    res.redirect(`/groups/${groupId}`);
  } catch (error) {
    // Handle non-401 API errors by re-rendering form
    if (error instanceof ApiError && error.status !== 401) {
      return res.render('groups/new', {
        title: 'Create a group',
        errors: [{ text: error.message || 'Unable to create group' }],
        values: { name, description, is_private },
        csrfToken: req.csrfToken ? req.csrfToken() : ''
      });
    }
    throw error; // Re-throw for asyncRoute to handle 401/503
  }
}));

// View group details
router.get('/:id', asyncRoute(async (req, res) => {
  const { id } = req.params;

  const [groupResult, membersResult, eventsResult] = await Promise.all([
    getGroup(req.token, id),
    getGroupMembers(req.token, id),
    getEvents(req.token, { group_id: id, upcoming_only: true, limit: 5 })
  ]);

  const group = groupResult.group || groupResult;
  const members = membersResult.data || [];
  const events = eventsResult.data || [];
  const myMembership = groupResult.my_membership;

  res.render('groups/detail', {
    title: group.name,
    group,
    members,
    events,
    myMembership,
    successMessage: req.flash ? req.flash('success')[0] : null,
    errorMessage: req.flash ? req.flash('error')[0] : null
  });
}, { notFoundTitle: 'Group not found' }));

// Edit group form
router.get('/:id/edit', asyncRoute(async (req, res) => {
  const { id } = req.params;

  const groupResult = await getGroup(req.token, id);
  const group = groupResult.group || groupResult;
  const myMembership = groupResult.my_membership;

  // Check permission
  if (!myMembership || !['admin', 'owner'].includes(myMembership.role)) {
    if (req.flash) {
      req.flash('error', 'You do not have permission to edit this group');
    }
    return res.redirect(`/groups/${id}`);
  }

  res.render('groups/edit', {
    title: `Edit ${group.name}`,
    group,
    myMembership,
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}, { notFoundTitle: 'Group not found' }));

// Update group
router.post('/:id/edit', audit.groupUpdate(), asyncRoute(async (req, res) => {
  const { id } = req.params;
  const { name, description, is_private } = req.body;

  const errors = [];

  if (!name || !name.trim()) {
    errors.push({ text: 'Enter a group name', href: '#name' });
  } else if (name.length > 255) {
    errors.push({ text: 'Group name must be 255 characters or fewer', href: '#name' });
  }

  if (errors.length > 0) {
    return res.render('groups/edit', {
      title: 'Edit group',
      group: { id, name, description, is_private: is_private === 'true' },
      errors,
      csrfToken: req.csrfToken ? req.csrfToken() : ''
    });
  }

  try {
    await updateGroup(req.token, id, {
      name: name.trim(),
      description: description ? description.trim() : null,
      is_private: is_private === 'true'
    });

    if (req.flash) {
      req.flash('success', 'Group updated successfully');
    }

    res.redirect(`/groups/${id}`);
  } catch (error) {
    // Handle non-401 API errors with flash message
    if (error instanceof ApiError && error.status !== 401) {
      if (req.flash) {
        req.flash('error', error.message || 'Unable to update group');
      }
      return res.redirect(`/groups/${id}/edit`);
    }
    throw error; // Re-throw for asyncRoute to handle 401/503
  }
}));

// Delete group
router.post('/:id/delete', audit.groupDelete(), asyncRoute(async (req, res) => {
  const { id } = req.params;

  try {
    await deleteGroup(req.token, id);

    if (req.flash) {
      req.flash('success', 'Group deleted successfully');
    }

    res.redirect('/groups');
  } catch (error) {
    // Handle non-401 API errors with flash message
    if (error instanceof ApiError && error.status !== 401) {
      if (req.flash) {
        req.flash('error', error.message || 'Unable to delete group');
      }
      return res.redirect(`/groups/${id}`);
    }
    throw error; // Re-throw for asyncRoute to handle 401/503
  }
}));

// Join group
router.post('/:id/join', audit.groupJoin(), asyncRoute(async (req, res) => {
  const { id } = req.params;

  try {
    await joinGroup(req.token, id);

    if (req.flash) {
      req.flash('success', 'You have joined the group');
    }
  } catch (error) {
    // Handle non-401 API errors with flash message
    if (error instanceof ApiError && error.status !== 401) {
      if (req.flash) {
        req.flash('error', error.message || 'Unable to join group');
      }
      return res.redirect(`/groups/${id}`);
    }
    throw error; // Re-throw for asyncRoute to handle 401/503
  }

  res.redirect(`/groups/${id}`);
}));

// Leave group
router.post('/:id/leave', audit.groupLeave(), asyncRoute(async (req, res) => {
  const { id } = req.params;

  try {
    await leaveGroup(req.token, id);

    if (req.flash) {
      req.flash('success', 'You have left the group');
    }
  } catch (error) {
    // Handle non-401 API errors with flash message
    if (error instanceof ApiError && error.status !== 401) {
      if (req.flash) {
        req.flash('error', error.message || 'Unable to leave group');
      }
      return res.redirect(`/groups/${id}`);
    }
    throw error; // Re-throw for asyncRoute to handle 401/503
  }

  res.redirect(`/groups/${id}`);
}));

// Members management page
router.get('/:id/members', asyncRoute(async (req, res) => {
  const { id } = req.params;

  const [groupResult, membersResult, usersResult] = await Promise.all([
    getGroup(req.token, id),
    getGroupMembers(req.token, id),
    getUsers(req.token)
  ]);

  const group = groupResult.group || groupResult;
  const members = membersResult.data || [];
  const myMembership = groupResult.my_membership;
  const allUsers = usersResult.users || usersResult || [];

  // Filter out users who are already members
  const memberIds = new Set(members.map(m => m.id));
  const nonMembers = allUsers.filter(u => !memberIds.has(u.id));

  res.render('groups/members', {
    title: `${group.name} - Members`,
    group,
    members,
    nonMembers,
    myMembership,
    successMessage: req.flash ? req.flash('success')[0] : null,
    errorMessage: req.flash ? req.flash('error')[0] : null
  });
}, { notFoundTitle: 'Group not found' }));

// Add member
router.post('/:id/members/add', asyncRoute(async (req, res) => {
  const { id } = req.params;
  const { user_id } = req.body;

  try {
    await addGroupMember(req.token, id, user_id);

    if (req.flash) {
      req.flash('success', 'Member added successfully');
    }
  } catch (error) {
    // Handle non-401 API errors with flash message
    if (error instanceof ApiError && error.status !== 401) {
      if (req.flash) {
        req.flash('error', error.message || 'Unable to add member');
      }
      return res.redirect(`/groups/${id}/members`);
    }
    throw error; // Re-throw for asyncRoute to handle 401/503
  }

  res.redirect(`/groups/${id}/members`);
}));

// Remove member
router.post('/:id/members/:memberId/remove', asyncRoute(async (req, res) => {
  const { id, memberId } = req.params;

  try {
    await removeGroupMember(req.token, id, memberId);

    if (req.flash) {
      req.flash('success', 'Member removed successfully');
    }
  } catch (error) {
    // Handle non-401 API errors with flash message
    if (error instanceof ApiError && error.status !== 401) {
      if (req.flash) {
        req.flash('error', error.message || 'Unable to remove member');
      }
      return res.redirect(`/groups/${id}/members`);
    }
    throw error; // Re-throw for asyncRoute to handle 401/503
  }

  res.redirect(`/groups/${id}/members`);
}));

// Update member role
router.post('/:id/members/:memberId/role', asyncRoute(async (req, res) => {
  const { id, memberId } = req.params;
  const { role } = req.body;

  try {
    await updateGroupMemberRole(req.token, id, memberId, role);

    if (req.flash) {
      req.flash('success', 'Member role updated');
    }
  } catch (error) {
    // Handle non-401 API errors with flash message
    if (error instanceof ApiError && error.status !== 401) {
      if (req.flash) {
        req.flash('error', error.message || 'Unable to update role');
      }
      return res.redirect(`/groups/${id}/members`);
    }
    throw error; // Re-throw for asyncRoute to handle 401/503
  }

  res.redirect(`/groups/${id}/members`);
}));

// Transfer ownership
router.post('/:id/transfer-ownership', asyncRoute(async (req, res) => {
  const { id } = req.params;
  const { new_owner_id } = req.body;

  try {
    await transferGroupOwnership(req.token, id, new_owner_id);

    if (req.flash) {
      req.flash('success', 'Ownership transferred successfully');
    }
  } catch (error) {
    // Handle non-401 API errors with flash message
    if (error instanceof ApiError && error.status !== 401) {
      if (req.flash) {
        req.flash('error', error.message || 'Unable to transfer ownership');
      }
      return res.redirect(`/groups/${id}/members`);
    }
    throw error; // Re-throw for asyncRoute to handle 401/503
  }

  res.redirect(`/groups/${id}/members`);
}));

module.exports = router;
