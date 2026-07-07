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
  downloadGroupFile,
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
const DOWNLOAD_HEADER_NAMES = [
  'content-type',
  'content-disposition',
  'content-length',
  'cache-control',
  'pragma',
  'expires',
  'etag',
  'last-modified'
];
const GROUP_INVITE_SUCCESS_MESSAGES = {
  'invite-link-created': 'A new invite link was generated.',
  'invite-emails-sent': 'The invitations have been sent.',
  'invite-revoked': 'The invitation has been revoked.'
};
const GROUP_INVITE_ERROR_MESSAGES = {
  'invite-link-failed': 'The invite link could not be generated. Please try again.',
  'invite-emails-required': 'Enter at least one email address.',
  'invite-emails-too-many': 'You can invite up to 50 email addresses at a time.',
  'invite-email-failed': 'The invitations could not be sent. Please try again.',
  'invite-revoke-failed': 'The invitation could not be revoked.',
  'invite-forbidden': 'You do not have permission to invite members to this group.'
};
const GROUP_NOTIFICATION_SUCCESS_MESSAGES = {
  'prefs-saved': 'Your notification preferences have been saved.'
};
const GROUP_NOTIFICATION_ERROR_MESSAGES = {
  'prefs-failed': 'Your notification preferences could not be saved. Please try again.'
};
const GROUP_IMAGE_SUCCESS_MESSAGES = {
  'avatar-updated': 'The group avatar has been updated.',
  'cover-updated': 'The cover image has been updated.'
};
const GROUP_IMAGE_ERROR_MESSAGES = {
  'image-missing': 'Choose an image to upload.',
  'image-failed': 'The image could not be uploaded. Please try again.'
};
const GROUP_ANNOUNCEMENT_SUCCESS_MESSAGES = {
  'ann-created': 'The announcement has been posted.',
  'ann-updated': 'The announcement has been updated.',
  'ann-deleted': 'The announcement has been deleted.',
  'ann-pinned': 'The announcement has been pinned.',
  'ann-unpinned': 'The announcement has been unpinned.'
};
const GROUP_ANNOUNCEMENT_ERROR_MESSAGES = {
  'ann-create-failed': 'The announcement could not be posted. Please try again.',
  'ann-update-failed': 'The announcement could not be updated. Please try again.',
  'ann-delete-failed': 'The announcement could not be deleted. Please try again.',
  'ann-pin-failed': 'The pin status could not be changed. Please try again.',
  'ann-forbidden': 'You do not have permission to manage announcements for this group.',
  'ann-not-found': 'That announcement could not be found.',
  'ann-title-required': 'Enter a title for the announcement.',
  'ann-content-required': 'Enter content for the announcement.'
};
const GROUP_DISCUSSION_SUCCESS_MESSAGES = {
  'discussion-created': 'Your discussion has been posted.',
  'reply-posted': 'Your reply has been posted.'
};
const GROUP_DISCUSSION_ERROR_MESSAGES = {
  'discussion-failed': 'Your discussion could not be posted. Please try again.',
  'reply-failed': 'Your reply could not be posted. Please try again.'
};
const GROUP_FILE_SUCCESS_MESSAGES = {
  'file-uploaded': 'The file has been uploaded.',
  'file-deleted': 'The file has been deleted.'
};
const GROUP_FILE_ERROR_MESSAGES = {
  'file-upload-failed': 'The file could not be uploaded. Please try again.',
  'file-too-large': 'The file exceeds the 25 MB limit. Choose a smaller file.',
  'file-type-invalid': 'That file type is not allowed. Check the accepted formats and try again.',
  'file-missing': 'Choose a file to upload.',
  'file-delete-failed': 'The file could not be deleted. Please try again.',
  'file-forbidden': 'You do not have permission to perform this action.',
  'file-not-found': 'That file could not be found.'
};

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

function dataFrom(result) {
  return result && typeof result === 'object' && result.data !== undefined ? result.data : result;
}

function collectionFrom(result) {
  const data = dataFrom(result);
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  if (data && Array.isArray(data.data)) return data.data;
  if (Array.isArray(result?.items)) return result.items;
  return [];
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

function applyDownloadHeaders(res, headers = {}) {
  DOWNLOAD_HEADER_NAMES.forEach((name) => {
    if (headers[name]) {
      res.set(name, headers[name]);
    }
  });
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

function dateLabel(value) {
  const text = trimmed(value);
  if (!text) return '';
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

function dateInputValue(value) {
  const text = trimmed(value);
  if (!text) return '';
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function normalizeGroup(item, fallbackId = null) {
  const raw = item && typeof item === 'object' ? item : {};
  return {
    ...raw,
    id: positiveInteger(raw.id) || fallbackId,
    name: trimmed(raw.name || raw.title) || 'Group',
    imageUrl: trimmed(raw.image_url || raw.imageUrl || raw.avatar_url || raw.avatarUrl || ''),
    coverImageUrl: trimmed(raw.cover_image_url || raw.coverImageUrl || raw.cover_url || raw.coverUrl || '')
  };
}

function normalizeAnnouncement(item) {
  const raw = item && typeof item === 'object' ? item : {};
  const author = raw.author && typeof raw.author === 'object' ? raw.author : {};
  return {
    id: positiveInteger(raw.id),
    title: trimmed(raw.title || '') || 'Announcement',
    content: trimmed(raw.content || ''),
    isPinned: checked(raw.is_pinned ?? raw.isPinned),
    isExpired: checked(raw.is_expired ?? raw.isExpired),
    authorName: trimmed(author.name || raw.author_name || raw.authorName || ''),
    postedAtLabel: dateLabel(raw.created_at || raw.createdAt || raw.posted_at || raw.postedAt),
    expiresAtInput: dateInputValue(raw.expires_at || raw.expiresAt)
  };
}

function normalizeDiscussion(item) {
  const raw = item && typeof item === 'object' ? item : {};
  const author = raw.author && typeof raw.author === 'object' ? raw.author : {};
  return {
    id: positiveInteger(raw.id),
    title: trimmed(raw.title || '') || 'View discussion',
    content: trimmed(raw.content || ''),
    authorName: trimmed(author.name || raw.author_name || raw.authorName || ''),
    replyCount: Number(raw.reply_count ?? raw.replyCount ?? raw.replies_count ?? raw.repliesCount ?? 0) || 0,
    isPinned: checked(raw.is_pinned ?? raw.isPinned),
    createdAtLabel: dateLabel(raw.created_at || raw.createdAt || raw.posted_at || raw.postedAt)
  };
}

function normalizeInvite(item) {
  const raw = item && typeof item === 'object' ? item : {};
  const type = trimmed(raw.invite_type || raw.inviteType || raw.type) === 'email' ? 'email' : 'link';
  return {
    id: positiveInteger(raw.id),
    type,
    email: trimmed(raw.email || ''),
    inviterName: trimmed(raw.inviter_name || raw.inviterName || raw.created_by_name || raw.createdByName || '') || '-',
    expiresAtLabel: dateLabel(raw.expires_at || raw.expiresAt) || '-'
  };
}

function formatBytes(value) {
  const bytes = Number(value) || 0;
  if (bytes >= 1048576) return `${Math.round((bytes / 1048576) * 10) / 10} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

function normalizeGroupFile(item) {
  const raw = item && typeof item === 'object' ? item : {};
  const fileName = trimmed(raw.file_name || raw.fileName || raw.name || raw.filename || '') || 'File';
  return {
    id: positiveInteger(raw.id),
    fileName,
    sizeLabel: formatBytes(raw.file_size || raw.fileSize || raw.size),
    uploaderName: trimmed(raw.uploader_name || raw.uploaderName || raw.uploaded_by_name || raw.uploadedByName || '') || '-',
    uploadedBy: positiveInteger(raw.uploaded_by || raw.uploadedBy || raw.user_id || raw.userId),
    uploadedAtLabel: dateLabel(raw.created_at || raw.createdAt || raw.uploaded_at || raw.uploadedAt) || '-'
  };
}

function isGroupAdmin(group) {
  const role = trimmed(group?.my_membership?.role || group?.myMembership?.role || group?.membership?.role || '');
  return ['admin', 'owner'].includes(role);
}

function isActiveGroupMember(group) {
  const membership = group?.my_membership || group?.myMembership || group?.membership || null;
  const role = trimmed(membership?.role || '');
  const status = trimmed(membership?.status || membership?.state || '');
  return ['member', 'admin', 'owner'].includes(role) || status === 'active' || checked(group?.is_member || group?.isMember);
}

function inviteGeneratedLink(result) {
  const data = dataFrom(result) || {};
  return trimmed(data.generated_link || data.generatedLink || data.invite_url || data.inviteUrl || '');
}

function inviteStatus(status) {
  const value = trimmed(status);
  if (Object.prototype.hasOwnProperty.call(GROUP_INVITE_SUCCESS_MESSAGES, value)) {
    return {
      statusBanner: {
        type: 'success',
        title: 'Success',
        message: GROUP_INVITE_SUCCESS_MESSAGES[value]
      }
    };
  }

  if (Object.prototype.hasOwnProperty.call(GROUP_INVITE_ERROR_MESSAGES, value)) {
    return {
      statusBanner: {
        type: 'error',
        title: 'There is a problem',
        message: GROUP_INVITE_ERROR_MESSAGES[value]
      }
    };
  }

  return { statusBanner: null };
}

function notificationStatus(status) {
  const value = trimmed(status);
  if (Object.prototype.hasOwnProperty.call(GROUP_NOTIFICATION_SUCCESS_MESSAGES, value)) {
    return {
      statusBanner: {
        type: 'success',
        title: 'Success',
        message: GROUP_NOTIFICATION_SUCCESS_MESSAGES[value]
      }
    };
  }

  if (Object.prototype.hasOwnProperty.call(GROUP_NOTIFICATION_ERROR_MESSAGES, value)) {
    return {
      statusBanner: {
        type: 'error',
        title: 'There is a problem',
        message: GROUP_NOTIFICATION_ERROR_MESSAGES[value]
      }
    };
  }

  return { statusBanner: null };
}

function imageStatus(status) {
  const value = trimmed(status);
  if (Object.prototype.hasOwnProperty.call(GROUP_IMAGE_SUCCESS_MESSAGES, value)) {
    return {
      statusBanner: {
        type: 'success',
        title: 'Success',
        message: GROUP_IMAGE_SUCCESS_MESSAGES[value]
      }
    };
  }

  if (Object.prototype.hasOwnProperty.call(GROUP_IMAGE_ERROR_MESSAGES, value)) {
    return {
      statusBanner: {
        type: 'error',
        title: 'There is a problem',
        message: GROUP_IMAGE_ERROR_MESSAGES[value]
      }
    };
  }

  return { statusBanner: null };
}

function announcementStatus(status) {
  const value = trimmed(status);
  if (Object.prototype.hasOwnProperty.call(GROUP_ANNOUNCEMENT_SUCCESS_MESSAGES, value)) {
    return {
      statusBanner: {
        type: 'success',
        title: 'Success',
        message: GROUP_ANNOUNCEMENT_SUCCESS_MESSAGES[value]
      }
    };
  }

  if (Object.prototype.hasOwnProperty.call(GROUP_ANNOUNCEMENT_ERROR_MESSAGES, value)) {
    const href = value === 'ann-title-required'
      ? '#ann-title'
      : value === 'ann-content-required'
        ? '#ann-content'
        : null;
    return {
      statusBanner: {
        type: 'error',
        title: 'There is a problem',
        message: GROUP_ANNOUNCEMENT_ERROR_MESSAGES[value],
        href
      }
    };
  }

  return { statusBanner: null };
}

function discussionStatus(status) {
  const value = trimmed(status);
  if (Object.prototype.hasOwnProperty.call(GROUP_DISCUSSION_SUCCESS_MESSAGES, value)) {
    return {
      statusBanner: {
        type: 'success',
        title: 'Success',
        message: GROUP_DISCUSSION_SUCCESS_MESSAGES[value]
      }
    };
  }

  if (Object.prototype.hasOwnProperty.call(GROUP_DISCUSSION_ERROR_MESSAGES, value)) {
    return {
      statusBanner: {
        type: 'error',
        title: value === 'discussion-failed' ? 'There is a problem posting your discussion' : 'There is a problem',
        message: GROUP_DISCUSSION_ERROR_MESSAGES[value],
        href: '#content'
      }
    };
  }

  return { statusBanner: null };
}

function fileStatus(status) {
  const value = trimmed(status);
  if (Object.prototype.hasOwnProperty.call(GROUP_FILE_SUCCESS_MESSAGES, value)) {
    return {
      statusBanner: {
        type: 'success',
        title: 'Success',
        message: GROUP_FILE_SUCCESS_MESSAGES[value]
      }
    };
  }

  if (Object.prototype.hasOwnProperty.call(GROUP_FILE_ERROR_MESSAGES, value)) {
    return {
      statusBanner: {
        type: 'error',
        title: 'There is a problem',
        message: GROUP_FILE_ERROR_MESSAGES[value],
        href: ['file-missing', 'file-too-large', 'file-type-invalid', 'file-upload-failed'].includes(value)
          ? '#file-input'
          : null
      }
    };
  }

  return { statusBanner: null };
}

function booleanPref(raw, key, fallback) {
  if (!raw || !Object.prototype.hasOwnProperty.call(raw, key)) {
    return fallback;
  }

  return raw[key] === true || raw[key] === 1 || raw[key] === '1' || raw[key] === 'true';
}

function normalizeNotificationPrefs(result) {
  const data = dataFrom(result) || {};
  const raw = data.preferences || data.preference || data;
  return {
    prefFrequency: allowed(raw.frequency, GROUP_NOTIFICATION_FREQUENCIES, 'instant'),
    prefEmailEnabled: booleanPref(raw, 'email_enabled', true),
    prefPushEnabled: booleanPref(raw, 'push_enabled', true)
  };
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

router.get('/:id(\\d+)/invite', asyncRoute(async (req, res) => {
  const id = req.params.id;
  const [groupResult, invitesResult] = await Promise.all([
    getGroup(req.token, id),
    callGroup(req.token, 'GET', `/${id}/invites`).catch((error) => {
      if (isAuthError(error)) throw error;
      return { data: { items: [] } };
    })
  ]);

  const group = normalizeGroup(dataFrom(groupResult)?.group || dataFrom(groupResult), Number(id));
  const pendingInvites = collectionFrom(invitesResult)
    .map(normalizeInvite)
    .filter((invite) => invite.id !== null);

  return res.render('groups/invite', {
    title: 'Invite members',
    activeNav: 'explore',
    group,
    generatedLink: inviteGeneratedLink(invitesResult),
    pendingInvites,
    ...inviteStatus(req.query.status)
  });
}, { redirectOn401: loginRedirect(), notFoundTitle: 'Group not found' }));

router.get('/:id(\\d+)/notifications', asyncRoute(async (req, res) => {
  const id = req.params.id;
  const [groupResult, prefsResult] = await Promise.all([
    getGroup(req.token, id),
    callGroup(req.token, 'GET', `/${id}/notification-prefs`).catch((error) => {
      if (isAuthError(error)) throw error;
      return {
        data: {
          frequency: 'instant',
          email_enabled: true,
          push_enabled: true
        }
      };
    })
  ]);

  const group = normalizeGroup(dataFrom(groupResult)?.group || dataFrom(groupResult), Number(id));

  return res.render('groups/notifications', {
    title: 'Notification preferences',
    activeNav: 'explore',
    group,
    ...normalizeNotificationPrefs(prefsResult),
    ...notificationStatus(req.query.status)
  });
}, { redirectOn401: loginRedirect(), notFoundTitle: 'Group not found' }));

router.get('/:id(\\d+)/image', asyncRoute(async (req, res) => {
  const id = req.params.id;
  const groupResult = await getGroup(req.token, id);
  const group = normalizeGroup(dataFrom(groupResult)?.group || dataFrom(groupResult), Number(id));

  return res.render('groups/image', {
    title: 'Group images',
    activeNav: 'explore',
    group,
    ...imageStatus(req.query.status)
  });
}, { redirectOn401: loginRedirect(), notFoundTitle: 'Group not found' }));

router.get('/:id(\\d+)/announcements', asyncRoute(async (req, res) => {
  const id = req.params.id;
  const [groupResult, announcementsResult] = await Promise.all([
    getGroup(req.token, id),
    callGroup(req.token, 'GET', `/${id}/announcements`).catch((error) => {
      if (isAuthError(error)) throw error;
      return { data: { items: [] } };
    })
  ]);

  const group = normalizeGroup(dataFrom(groupResult)?.group || dataFrom(groupResult), Number(id));
  const announcements = collectionFrom(announcementsResult)
    .map(normalizeAnnouncement)
    .filter((announcement) => announcement.id !== null);

  return res.render('groups/announcements', {
    title: 'Announcements',
    activeNav: 'explore',
    group,
    announcements,
    isAdmin: isGroupAdmin(group),
    ...announcementStatus(req.query.status)
  });
}, { redirectOn401: loginRedirect(), notFoundTitle: 'Group not found' }));

router.get('/:id(\\d+)/announcements/:annId(\\d+)/edit', asyncRoute(async (req, res) => {
  const { id, annId } = req.params;
  const [groupResult, announcementResult] = await Promise.all([
    getGroup(req.token, id),
    callGroup(req.token, 'GET', `/${id}/announcements/${annId}`)
  ]);

  const group = normalizeGroup(dataFrom(groupResult)?.group || dataFrom(groupResult), Number(id));
  const announcementData = dataFrom(announcementResult)?.announcement || dataFrom(announcementResult);
  const announcement = normalizeAnnouncement(announcementData);

  return res.render('groups/announcement-edit', {
    title: 'Edit announcement',
    activeNav: 'explore',
    group,
    announcement,
    ...announcementStatus(req.query.status)
  });
}, { redirectOn401: loginRedirect(), notFoundTitle: 'Announcement not found' }));

router.get('/:id(\\d+)/discussions', asyncRoute(async (req, res) => {
  const id = req.params.id;
  const groupResult = await getGroup(req.token, id);
  const group = normalizeGroup(dataFrom(groupResult)?.group || dataFrom(groupResult), Number(id));
  const isMember = isActiveGroupMember(group);
  const discussionsResult = isMember
    ? await callGroup(req.token, 'GET', `/${id}/discussions`).catch((error) => {
      if (isAuthError(error)) throw error;
      return { data: { items: [] } };
    })
    : { data: { items: [] } };
  const discussions = collectionFrom(discussionsResult)
    .map(normalizeDiscussion)
    .filter((discussion) => discussion.id !== null);

  return res.render('groups/discussions', {
    title: 'Discussions',
    activeNav: 'explore',
    group,
    isMember,
    discussions,
    ...discussionStatus(req.query.status)
  });
}, { redirectOn401: loginRedirect(), notFoundTitle: 'Group not found' }));

router.get('/:id(\\d+)/discussions/new', asyncRoute(async (req, res) => {
  const id = req.params.id;
  const groupResult = await getGroup(req.token, id);
  const group = normalizeGroup(dataFrom(groupResult)?.group || dataFrom(groupResult), Number(id));

  return res.render('groups/discussion-create', {
    title: 'Start a discussion',
    activeNav: 'explore',
    group,
    ...discussionStatus(req.query.status)
  });
}, { redirectOn401: loginRedirect(), notFoundTitle: 'Group not found' }));

router.get('/:id(\\d+)/discussions/:discussionId(\\d+)', asyncRoute(async (req, res) => {
  const { id, discussionId } = req.params;
  const [groupResult, discussionResult] = await Promise.all([
    getGroup(req.token, id),
    callGroup(req.token, 'GET', `/${id}/discussions/${discussionId}/messages`)
  ]);
  const group = normalizeGroup(dataFrom(groupResult)?.group || dataFrom(groupResult), Number(id));
  const data = dataFrom(discussionResult) || {};
  const discussion = normalizeDiscussion(data.discussion || data.thread || data);
  const messages = collectionFrom({ data })
    .map(normalizeDiscussion)
    .filter((message) => message.id !== null);

  return res.render('groups/discussion-detail', {
    title: discussion.title,
    activeNav: 'explore',
    group,
    discussion,
    messages,
    ...discussionStatus(req.query.status)
  });
}, { redirectOn401: loginRedirect(), notFoundTitle: 'Discussion not found' }));

router.get('/:id(\\d+)/files/:fileId(\\d+)/download', asyncRoute(async (req, res) => {
  const { id, fileId } = req.params;
  let download;

  try {
    download = await downloadGroupFile(req.token, `/${id}/files/${fileId}/download`);
  } catch (error) {
    if (isAuthError(error)) {
      return res.redirect(loginRedirect());
    }
    if (error instanceof ApiError && error.status === 403) {
      return res.redirect(groupSubpageRedirect(id, 'files', 'file-forbidden'));
    }
    if (error instanceof ApiError && error.status === 404) {
      return res.redirect(groupSubpageRedirect(id, 'files', 'file-not-found'));
    }

    return res.redirect(groupSubpageRedirect(id, 'files', 'file-upload-failed'));
  }

  res.status(download.status || 200);
  applyDownloadHeaders(res, download.headers);
  return res.send(Buffer.isBuffer(download.body) ? download.body : Buffer.from(download.body || ''));
}, { redirectOn401: loginRedirect(), notFoundTitle: 'File not found' }));

router.get('/:id(\\d+)/files', asyncRoute(async (req, res) => {
  const id = req.params.id;
  const [groupResult, filesResult] = await Promise.all([
    getGroup(req.token, id),
    callGroup(req.token, 'GET', `/${id}/files`).catch((error) => {
      if (isAuthError(error)) throw error;
      return { data: { items: [] } };
    })
  ]);

  const group = normalizeGroup(dataFrom(groupResult)?.group || dataFrom(groupResult), Number(id));
  const files = collectionFrom(filesResult)
    .map(normalizeGroupFile)
    .filter((file) => file.id !== null);

  return res.render('groups/files', {
    title: 'Group files',
    activeNav: 'explore',
    group,
    files,
    isAdmin: isGroupAdmin(group),
    ...fileStatus(req.query.status)
  });
}, { redirectOn401: loginRedirect(), notFoundTitle: 'Group not found' }));

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
