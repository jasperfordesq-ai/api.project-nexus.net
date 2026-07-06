// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const fs = require('fs/promises');
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
  callGroupApi,
  uploadGroupImage,
  uploadGroupFile,
  createFeedPostV2,
  getEvents,
  getUsers,
  ApiError
} = require('../lib/api');
const { requireAuth } = require('../middleware/auth');
const { asyncRoute } = require('../lib/routeHelpers');
const { audit } = require('../lib/auditLogger');

const router = express.Router();

router.use(requireAuth);

const GROUP_NOTIFICATION_FREQUENCIES = ['instant', 'digest', 'muted'];

function trimmed(value, limit = null) {
  const text = String(value || '').trim();
  return limit === null ? text : text.slice(0, limit);
}

function optionalText(value, limit = null) {
  const text = trimmed(value, limit);
  return text === '' ? null : text;
}

function positiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function checked(value) {
  return value === true || ['1', 'true', 'on', 'yes'].includes(String(value || '').toLowerCase());
}

function allowed(value, choices, fallback) {
  const text = trimmed(value);
  return choices.includes(text) ? text : fallback;
}

function statusRedirect(path, status, fragment = '') {
  return `${path}?status=${encodeURIComponent(status)}${fragment}`;
}

function groupRedirect(id, status, fragment = '') {
  return statusRedirect(`/groups/${id}`, status, fragment);
}

function groupSubpageRedirect(id, segment, status, fragment = '') {
  return statusRedirect(`/groups/${id}/${segment}`, status, fragment);
}

function announcementEditRedirect(id, annId, status) {
  return statusRedirect(`/groups/${id}/announcements/${annId}/edit`, status);
}

function discussionRedirect(id, discussionId, status, fragment = '') {
  return statusRedirect(`/groups/${id}/discussions/${discussionId}`, status, fragment);
}

function loginRedirect() {
  return '/login?status=auth-required';
}

function isAuthError(error) {
  return error instanceof ApiError && error.status === 401;
}

async function callGroup(token, method, path, data = undefined) {
  if (data === undefined) {
    return callGroupApi(token, method, path);
  }

  return callGroupApi(token, method, path, data);
}

async function requireGroupAction(req, res, failureRedirect, action) {
  if (!req.token) {
    return res.redirect(loginRedirect());
  }

  try {
    return await action(req.token);
  } catch (error) {
    if (isAuthError(error)) {
      return res.redirect(loginRedirect());
    }

    return res.redirect(typeof failureRedirect === 'function' ? failureRedirect(error) : failureRedirect);
  }
}

function resultId(result) {
  return positiveInteger(result?.data?.id)
    || positiveInteger(result?.discussion?.id)
    || positiveInteger(result?.id);
}

function parseInviteEmails(value) {
  return String(value || '')
    .split(/[\n,]+/)
    .map((email) => email.trim())
    .filter(Boolean);
}

function announcementPayload(body) {
  const title = trimmed(body.title, 255);
  const content = trimmed(body.content, 20000);

  if (title === '') {
    return { error: 'ann-title-required' };
  }

  if (content === '') {
    return { error: 'ann-content-required' };
  }

  return {
    title,
    content,
    is_pinned: checked(body.is_pinned),
    expires_at: optionalText(body.expires_at)
  };
}

function discussionPayload(body) {
  const title = trimmed(body.title, 255);
  const content = trimmed(body.content, 20000);

  if (title === '' || content === '') {
    return null;
  }

  return { title, content };
}

function hasUploadedValue(req, fieldName) {
  return !!req.file || !!(req.files && req.files[fieldName]) || trimmed(req.body[fieldName]) !== '';
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

// List all groups
router.get('/', asyncRoute(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = 20;
  const searchQuery = req.query.search ? req.query.search.trim() : '';

  const [groupsResult, myGroupsResult] = await Promise.all([
    getGroups(req.token, { page, limit, search: searchQuery }),
    getMyGroups(req.token).catch(() => ({ data: [] }))
  ]);

  const groups = groupsResult.data || [];
  const myGroups = myGroupsResult.data || [];
  const myGroupIds = {};
  myGroups.forEach(g => { myGroupIds[g.id] = true; });

  res.render('groups/index', {
    title: 'Groups',
    groups,
    myGroupIds,
    searchQuery,
    pagination: groupsResult.pagination || { page, totalPages: 1 },
    successMessage: req.flash ? req.flash('success')[0] : null,
    errorMessage: req.flash ? req.flash('error')[0] : null
  });
}));

// My groups
router.get('/my', asyncRoute(async (req, res) => {
  const result = await getMyGroups(req.token);
  const groups = result.items || result.data || [];

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
    getGroupMembers(req.token, id).catch(() => ({ data: [] })),
    getEvents(req.token, { group_id: id, upcoming_only: true, limit: 5 }).catch(() => ({ data: [] }))
  ]);

  const group = groupResult.group || groupResult;
  const members = membersResult.data || membersResult.items || [];
  const events = eventsResult.data || eventsResult.items || [];
  const myMembership = groupResult.myMembership || groupResult.my_membership;

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
  const myMembership = groupResult.myMembership || groupResult.my_membership;

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

router.post('/:id(\\d+)/invite/link', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const expiryDays = positiveInteger(req.body.expiry_days);
  const payload = {
    expiry_days: expiryDays !== null && expiryDays <= 90 ? expiryDays : null
  };

  return requireGroupAction(req, res, groupSubpageRedirect(id, 'invite', 'invite-link-failed'), async (token) => {
    await callGroup(token, 'POST', `/${id}/invites/link`, payload);
    return res.redirect(groupSubpageRedirect(id, 'invite', 'invite-link-created'));
  });
}));

router.post('/:id(\\d+)/invite/email', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const emails = parseInviteEmails(req.body.emails);

  if (emails.length === 0) {
    return res.redirect(groupSubpageRedirect(id, 'invite', 'invite-emails-required'));
  }

  if (emails.length > 50) {
    return res.redirect(groupSubpageRedirect(id, 'invite', 'invite-emails-too-many'));
  }

  const payload = {
    emails,
    message: optionalText(req.body.message, 5000)
  };

  return requireGroupAction(req, res, groupSubpageRedirect(id, 'invite', 'invite-email-failed'), async (token) => {
    await callGroup(token, 'POST', `/${id}/invites/email`, payload);
    return res.redirect(groupSubpageRedirect(id, 'invite', 'invite-emails-sent'));
  });
}));

router.post('/:id(\\d+)/invite/:inviteId(\\d+)/revoke', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const inviteId = Number(req.params.inviteId);

  return requireGroupAction(req, res, groupSubpageRedirect(id, 'invite', 'invite-revoke-failed'), async (token) => {
    await callGroup(token, 'DELETE', `/${id}/invites/${inviteId}`);
    return res.redirect(groupSubpageRedirect(id, 'invite', 'invite-revoked'));
  });
}));

router.post('/:id(\\d+)/notifications', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const payload = {
    frequency: allowed(req.body.frequency, GROUP_NOTIFICATION_FREQUENCIES, 'instant'),
    email_enabled: checked(req.body.email_enabled),
    push_enabled: checked(req.body.push_enabled)
  };

  return requireGroupAction(req, res, groupSubpageRedirect(id, 'notifications', 'prefs-failed'), async (token) => {
    await callGroup(token, 'PUT', `/${id}/notification-prefs`, payload);
    return res.redirect(groupSubpageRedirect(id, 'notifications', 'prefs-saved'));
  });
}));

router.post('/:id(\\d+)/image', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const type = allowed(req.body.type, ['avatar', 'cover'], 'avatar');
  const file = uploadedFile(req, 'image');

  if (!file && !hasUploadedValue(req, 'image')) {
    return res.redirect(groupSubpageRedirect(id, 'image', 'image-missing'));
  }

  return requireGroupAction(req, res, groupSubpageRedirect(id, 'image', 'image-failed'), async (token) => {
    try {
      if (!file) {
        await callGroup(token, 'POST', `/${id}/image?type=${encodeURIComponent(type)}`, {
          type,
          image: req.body.image
        });
      } else {
        const buffer = await fs.readFile(file.filepath);
        await uploadGroupImage(token, id, {
          type,
          file: {
            buffer,
            filename: trimmed(file.originalFilename) || 'group-image',
            contentType: trimmed(file.mimetype) || 'application/octet-stream',
            size: file.size
          }
        });
      }
    } finally {
      await removeUploadedFile(file);
    }
    return res.redirect(groupSubpageRedirect(id, 'image', type === 'cover' ? 'cover-updated' : 'avatar-updated'));
  });
}));

router.post('/:id(\\d+)/files', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const file = uploadedFile(req, 'file');

  if (!file && !hasUploadedValue(req, 'file')) {
    return res.redirect(groupSubpageRedirect(id, 'files', 'file-missing'));
  }

  return requireGroupAction(req, res, groupSubpageRedirect(id, 'files', 'file-upload-failed'), async (token) => {
    try {
      if (!file) {
        await callGroup(token, 'POST', `/${id}/files`, {
          file: req.body.file,
          folder: optionalText(req.body.folder, 255),
          description: optionalText(req.body.description, 2000)
        });
      } else {
        const buffer = await fs.readFile(file.filepath);
        await uploadGroupFile(token, id, {
          folder: optionalText(req.body.folder, 255),
          description: optionalText(req.body.description, 2000),
          file: {
            buffer,
            filename: trimmed(file.originalFilename) || 'group-file',
            contentType: trimmed(file.mimetype) || 'application/octet-stream',
            size: file.size
          }
        });
      }
    } finally {
      await removeUploadedFile(file);
    }
    return res.redirect(groupSubpageRedirect(id, 'files', 'file-uploaded'));
  });
}));

router.post('/:id(\\d+)/files/:fileId(\\d+)/delete', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const fileId = Number(req.params.fileId);

  return requireGroupAction(req, res, groupSubpageRedirect(id, 'files', 'file-delete-failed'), async (token) => {
    await callGroup(token, 'DELETE', `/${id}/files/${fileId}`);
    return res.redirect(groupSubpageRedirect(id, 'files', 'file-deleted'));
  });
}));

router.post('/:id(\\d+)/announcements', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const payload = announcementPayload(req.body);

  if (payload.error) {
    return res.redirect(groupSubpageRedirect(id, 'announcements', payload.error));
  }

  return requireGroupAction(req, res, groupSubpageRedirect(id, 'announcements', 'ann-create-failed'), async (token) => {
    await callGroup(token, 'POST', `/${id}/announcements`, payload);
    return res.redirect(groupSubpageRedirect(id, 'announcements', 'ann-created'));
  });
}));

router.post('/:id(\\d+)/announcements/:annId(\\d+)/edit', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const annId = Number(req.params.annId);
  const payload = announcementPayload(req.body);

  if (payload.error) {
    return res.redirect(announcementEditRedirect(id, annId, payload.error));
  }

  return requireGroupAction(req, res, announcementEditRedirect(id, annId, 'ann-update-failed'), async (token) => {
    await callGroup(token, 'PUT', `/${id}/announcements/${annId}`, payload);
    return res.redirect(groupSubpageRedirect(id, 'announcements', 'ann-updated'));
  });
}));

router.post('/:id(\\d+)/announcements/:annId(\\d+)/delete', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const annId = Number(req.params.annId);

  return requireGroupAction(req, res, groupSubpageRedirect(id, 'announcements', 'ann-delete-failed'), async (token) => {
    await callGroup(token, 'DELETE', `/${id}/announcements/${annId}`);
    return res.redirect(groupSubpageRedirect(id, 'announcements', 'ann-deleted'));
  });
}));

router.post('/:id(\\d+)/announcements/:annId(\\d+)/pin', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const annId = Number(req.params.annId);
  const isPinned = checked(req.body.is_pinned);

  return requireGroupAction(req, res, groupSubpageRedirect(id, 'announcements', 'ann-pin-failed'), async (token) => {
    await callGroup(token, 'PUT', `/${id}/announcements/${annId}`, { is_pinned: isPinned });
    return res.redirect(groupSubpageRedirect(id, 'announcements', isPinned ? 'ann-pinned' : 'ann-unpinned'));
  });
}));

router.post('/:id(\\d+)/discussions/new', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const payload = discussionPayload(req.body);

  if (payload === null) {
    return res.redirect(`/groups/${id}/discussions/new`);
  }

  return requireGroupAction(req, res, groupSubpageRedirect(id, 'discussions/new', 'discussion-failed'), async (token) => {
    const result = await callGroup(token, 'POST', `/${id}/discussions`, payload);
    const discussionId = resultId(result);
    const target = discussionId
      ? discussionRedirect(id, discussionId, 'discussion-created')
      : groupSubpageRedirect(id, 'discussions', 'discussion-created');
    return res.redirect(target);
  });
}));

router.post('/:id(\\d+)/discussions/:discussionId(\\d+)/reply', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const discussionId = Number(req.params.discussionId);
  const content = trimmed(req.body.content, 20000);

  if (content === '') {
    return res.redirect(`/groups/${id}/discussions/${discussionId}`);
  }

  return requireGroupAction(req, res, discussionRedirect(id, discussionId, 'reply-failed', '#discussion-replies'), async (token) => {
    await callGroup(token, 'POST', `/${id}/discussions/${discussionId}/messages`, { content });
    return res.redirect(discussionRedirect(id, discussionId, 'reply-posted', '#discussion-replies'));
  });
}));

router.post('/:id(\\d+)/feed', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const content = trimmed(req.body.content, 20000);

  if (content === '') {
    return res.redirect(groupRedirect(id, 'group-post-empty', '#group-feed'));
  }

  return requireGroupAction(req, res, groupRedirect(id, 'group-post-failed', '#group-feed'), async (token) => {
    await createFeedPostV2(token, {
      content,
      visibility: 'public',
      group_id: id
    });
    return res.redirect(groupRedirect(id, 'group-posted', '#group-feed'));
  });
}));

router.post('/:id(\\d+)/members/:memberId(\\d+)', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const memberId = Number(req.params.memberId);
  const action = trimmed(req.body.action);

  if (!['promote', 'demote', 'remove'].includes(action)) {
    return res.redirect(groupSubpageRedirect(id, 'manage', 'member-failed'));
  }

  return requireGroupAction(req, res, groupSubpageRedirect(id, 'manage', 'member-failed'), async (token) => {
    if (action === 'remove') {
      await callGroup(token, 'DELETE', `/${id}/members/${memberId}`);
      return res.redirect(groupSubpageRedirect(id, 'manage', 'member-removed'));
    }

    const role = action === 'promote' ? 'admin' : 'member';
    await callGroup(token, 'PUT', `/${id}/members/${memberId}`, { role });
    return res.redirect(groupSubpageRedirect(id, 'manage', action === 'promote' ? 'member-promoted' : 'member-demoted'));
  });
}));

router.post('/:id(\\d+)/requests/:requesterId(\\d+)', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const requesterId = Number(req.params.requesterId);
  const action = trimmed(req.body.action) === 'reject' ? 'reject' : 'accept';

  return requireGroupAction(req, res, groupSubpageRedirect(id, 'manage', 'request-failed'), async (token) => {
    await callGroup(token, 'POST', `/${id}/requests/${requesterId}`, { action });
    return res.redirect(groupSubpageRedirect(id, 'manage', action === 'reject' ? 'request-rejected' : 'request-approved'));
  });
}));

// Members management page
router.get('/:id/members', asyncRoute(async (req, res) => {
  const { id } = req.params;

  const [groupResult, membersResult, usersResult] = await Promise.all([
    getGroup(req.token, id),
    getGroupMembers(req.token, id).catch(() => ({ data: [] })),
    getUsers(req.token).catch(() => ({ data: [] }))
  ]);

  const group = groupResult.group || groupResult;
  const members = membersResult.data || [];
  const myMembership = groupResult.myMembership || groupResult.my_membership;
  const rawUsers = usersResult.items || usersResult.data || usersResult.users || usersResult;
  const allUsers = Array.isArray(rawUsers) ? rawUsers : [];

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
