// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const fs = require('fs/promises');
const {
  getGroups,
  getGroup,
  createGroup,
  updateGroup,
  deleteGroup,
  getGroupMembers,
  joinGroup,
  leaveGroup,
  callGroupApi,
  uploadGroupImage,
  uploadGroupFile,
  downloadGroupFile,
  createFeedPostV2,
  getEvents,
  ApiError
} = require('../lib/api');
const { requireAuth } = require('../middleware/auth');
const { asyncRoute } = require('../lib/routeHelpers');
const { audit } = require('../lib/auditLogger');
const { getRequestIntlLocale } = require('../lib/request-intl-locale');
const { getRequestProfile } = require('../lib/request-profile');

const router = express.Router();

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
const GROUP_FILE_MAX_SIZE = 25 * 1024 * 1024;
const GROUP_FILE_ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'text/csv', 'text/markdown',
  'application/zip', 'application/x-rar-compressed',
  'video/mp4', 'video/webm',
  'audio/mpeg', 'audio/wav', 'audio/ogg'
]);
const GROUP_MANAGE_SUCCESS_MESSAGES = {
  'member-promoted': 'The member is now an admin.',
  'member-demoted': 'The member is no longer an admin.',
  'member-removed': 'The member has been removed from the group.',
  'request-approved': 'The join request has been approved.',
  'request-rejected': 'The join request has been rejected.'
};
const GROUP_MANAGE_ERROR_MESSAGES = {
  'member-failed': 'The member could not be updated. Please try again.',
  'request-failed': 'The join request could not be updated. Please try again.'
};
const GROUP_PAGE_SUCCESS_MESSAGES = {
  'group-created': 'Your group has been created.',
  'group-updated': 'The group settings have been saved.',
  'group-deleted': 'The group has been deleted.',
  'group-joined': 'You have joined the group.',
  'group-left': 'You have left the group.'
};
const GROUP_PAGE_ERROR_MESSAGES = {
  'group-failed': 'We could not update your membership. Please try again.',
  'group-update-failed': 'The group settings could not be saved. Please try again.',
  'group-delete-failed': 'The group could not be deleted. Please try again.'
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

function objectFrom(result) {
  const data = dataFrom(result);
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
  if (data.user && typeof data.user === 'object') return data.user;
  if (data.profile && typeof data.profile === 'object') return data.profile;
  return data;
}

function urlFor(res, path) {
  return typeof res?.locals?.urlFor === 'function' ? res.locals.urlFor(path) : path;
}

function redirectTo(res, pathname) {
  const target = typeof pathname === 'string' && pathname ? pathname : '/';
  const activePrefix = typeof res?.locals?.accessibleRoutePrefix === 'string'
    ? res.locals.accessibleRoutePrefix
    : '';
  if (
    activePrefix
    && (
      target === activePrefix
      || target.startsWith(`${activePrefix}/`)
      || target.startsWith(`${activePrefix}?`)
      || target.startsWith(`${activePrefix}#`)
    )
  ) {
    return res.redirect(target);
  }
  return res.redirect(urlFor(res, target));
}

function statusRedirect(res, path, status, fragment = '') {
  return `${urlFor(res, path)}?status=${encodeURIComponent(status)}${fragment}`;
}

function groupRedirect(res, id, status, fragment = '') {
  return statusRedirect(res, `/groups/${id}`, status, fragment);
}

function groupSubpageRedirect(res, id, segment, status, fragment = '') {
  return statusRedirect(res, `/groups/${id}/${segment}`, status, fragment);
}

function announcementEditRedirect(res, id, annId, status) {
  return statusRedirect(res, `/groups/${id}/announcements/${annId}/edit`, status);
}

function discussionRedirect(res, id, discussionId, status, fragment = '') {
  return statusRedirect(res, `/groups/${id}/discussions/${discussionId}`, status, fragment);
}

function loginRedirect() {
  return '/login?status=auth-required';
}

function isAuthError(error) {
  return error instanceof ApiError && error.status === 401;
}

function apiErrorEntries(error) {
  return error instanceof ApiError && Array.isArray(error.data?.errors)
    ? error.data.errors.filter((entry) => entry && typeof entry === 'object')
    : [];
}

function apiErrorCode(error) {
  const first = apiErrorEntries(error)[0] || {};
  return trimmed(first.code || error?.data?.code || error?.data?.error).toUpperCase();
}

function groupFormErrors(error, fallback) {
  const entries = apiErrorEntries(error);
  if (entries.length === 0) {
    return [{ text: error instanceof Error && error.message ? error.message : fallback }];
  }
  return entries.map((entry) => ({
    text: trimmed(entry.message) || fallback,
    ...(trimmed(entry.field) ? { href: `#${trimmed(entry.field)}` } : {})
  }));
}

function groupTags(value) {
  const raw = Array.isArray(value) ? value : String(value || '').split(',');
  return raw.map((tag) => trimmed(tag)).filter(Boolean);
}

async function uploadGroupCover(token, groupId, file) {
  if (!file) return;
  const buffer = await fs.readFile(file.filepath);
  await uploadGroupImage(token, groupId, {
    type: 'cover',
    file: {
      buffer,
      filename: trimmed(file.originalFilename) || 'group-cover',
      contentType: trimmed(file.mimetype) || 'application/octet-stream',
      size: file.size
    }
  });
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
    return redirectTo(res, loginRedirect());
  }

  try {
    return await action(req.token);
  } catch (error) {
    if (isAuthError(error)) {
      return redirectTo(res, loginRedirect());
    }

    const failurePath = typeof failureRedirect === 'function' ? failureRedirect(error) : failureRedirect;
    return redirectTo(res, failurePath);
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
  return date.toLocaleDateString(getRequestIntlLocale(), {
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
  const viewerMembership = raw.viewer_membership || raw.viewerMembership;
  const viewerMembershipKnown = ['my_membership', 'myMembership', 'viewer_membership', 'viewerMembership', 'membership', 'my_role', 'myRole']
    .some((key) => Object.prototype.hasOwnProperty.call(raw, key));
  return {
    ...raw,
    id: positiveInteger(raw.id) || fallbackId,
    name: trimmed(raw.name || raw.title) || 'Group',
    imageUrl: trimmed(raw.image_url || raw.imageUrl || raw.avatar_url || raw.avatarUrl || ''),
    coverImageUrl: trimmed(raw.cover_image_url || raw.coverImageUrl || raw.cover_url || raw.coverUrl || ''),
    tagsText: groupTags(raw.tags).join(', '),
    my_membership: raw.my_membership || raw.myMembership || raw.membership || viewerMembership || null,
    myMembership: raw.myMembership || raw.my_membership || raw.membership || viewerMembership || null,
    viewerMembershipKnown
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

function normalizeGroupMember(item, ownerId = null) {
  const raw = item && typeof item === 'object' ? item : {};
  const user = raw.user && typeof raw.user === 'object' ? raw.user : {};
  const id = positiveInteger(raw.id) || positiveInteger(raw.user_id) || positiveInteger(raw.userId) || positiveInteger(user.id);
  const role = ['owner', 'admin', 'member'].includes(trimmed(raw.role)) ? trimmed(raw.role) : 'member';
  const isOwner = (id !== null && id === ownerId) || role === 'owner';
  const normalizedRole = isOwner ? 'owner' : role;

  return {
    id,
    name: trimmed(raw.name || raw.display_name || raw.displayName || user.name || user.display_name || user.displayName || '') || (id ? `#${id}` : 'Member'),
    role: normalizedRole,
    roleLabel: normalizedRole === 'owner' ? 'Owner' : normalizedRole === 'admin' ? 'Admin' : 'Member',
    roleClass: normalizedRole === 'owner' || normalizedRole === 'admin' ? 'govuk-tag--blue' : 'govuk-tag--grey',
    isOwner
  };
}

function normalizeJoinRequest(item) {
  const raw = item && typeof item === 'object' ? item : {};
  const user = raw.user && typeof raw.user === 'object' ? raw.user : {};
  const id = positiveInteger(raw.id)
    || positiveInteger(raw.user_id)
    || positiveInteger(raw.userId)
    || positiveInteger(raw.requester_id)
    || positiveInteger(raw.requesterId)
    || positiveInteger(user.id);

  return {
    id,
    name: trimmed(raw.name || raw.display_name || raw.displayName || user.name || user.display_name || user.displayName || '') || (id ? `#${id}` : 'Member')
  };
}

function groupMembership(group) {
  return group?.my_membership
    || group?.myMembership
    || group?.viewer_membership
    || group?.viewerMembership
    || group?.membership
    || null;
}

function isPlatformAdmin(profile) {
  const role = trimmed(profile?.role || profile?.user_role || profile?.account_role || '');
  return ['admin', 'tenant_admin', 'super_admin', 'god'].includes(role)
    || checked(profile?.is_super_admin)
    || checked(profile?.is_tenant_super_admin);
}

function isGroupAdmin(group, profile = {}) {
  const membership = groupMembership(group);
  const role = trimmed(membership?.role || group?.my_role || group?.myRole || '');
  const status = trimmed(membership?.status || membership?.state || group?.my_status || group?.myStatus || '');
  const profileId = positiveInteger(profile?.id || profile?.user_id || profile?.userId);
  const ownerId = positiveInteger(group?.owner_id || group?.ownerId);

  return (['admin', 'owner'].includes(role) && (status === '' || status === 'active'))
    || (profileId !== null && ownerId === profileId)
    || isPlatformAdmin(profile);
}

function isGroupOwner(group, profile = {}) {
  const membership = groupMembership(group);
  const role = trimmed(membership?.role || group?.my_role || group?.myRole || '');
  const profileId = positiveInteger(profile?.id || profile?.user_id || profile?.userId);
  const ownerId = positiveInteger(group?.owner_id || group?.ownerId);

  return role === 'owner'
    || (profileId !== null && ownerId !== null && profileId === ownerId);
}

function isActiveGroupMember(group, profile = {}) {
  if (isGroupAdmin(group, profile)) return true;
  const membership = groupMembership(group);
  const role = trimmed(membership?.role || '');
  const status = trimmed(membership?.status || membership?.state || '');
  if (status !== '' && status !== 'active') return false;
  return ['member', 'admin', 'owner'].includes(role)
    || status === 'active'
    || checked(group?.is_member || group?.isMember);
}

function hasViewerMembershipContract(group) {
  return group?.viewerMembershipKnown === true;
}

function isKnownGroupAdmin(group, profile) {
  if (isGroupAdmin(group, profile)) return true;
  if (hasViewerMembershipContract(group)) return false;

  const profileId = positiveInteger(profile?.id || profile?.user_id || profile?.userId);
  const ownerId = positiveInteger(group?.owner_id || group?.ownerId);
  return profileId !== null && ownerId !== null ? false : null;
}

function isKnownGroupMember(group, profile) {
  if (isActiveGroupMember(group, profile)) return true;
  return hasViewerMembershipContract(group) ? false : null;
}

function renderForbidden(res) {
  return res.status(403).render('errors/403', { title: 'Forbidden' });
}

function renderNotFound(res, title = 'Page not found') {
  return res.status(404).render('errors/404', { title });
}

function renderTooManyRequests(res) {
  return res.status(429).render('errors/429', { title: 'Too many requests' });
}

function groupFileUploadErrorStatus(error) {
  if (!(error instanceof ApiError)) return 'file-upload-failed';
  if (error.status === 403) return 'file-forbidden';
  if (error.status !== 422) return 'file-upload-failed';

  const code = trimmed(
    error.data?.code
    || error.data?.error_code
    || (Array.isArray(error.data?.errors) ? error.data.errors[0]?.code : '')
  ).toUpperCase();
  if (code === 'FILE_TOO_LARGE') return 'file-too-large';
  if (code === 'INVALID_TYPE') return 'file-type-invalid';
  if (code === 'INVALID_FILE') return 'file-missing';

  const message = trimmed(error.message).toLowerCase();
  if (message.includes('25 mb') || message.includes('25mb') || message.includes('too large') || message.includes('size')) {
    return 'file-too-large';
  }
  if (message.includes('type') || message.includes('format') || message.includes('mime')) {
    return 'file-type-invalid';
  }
  return 'file-upload-failed';
}

async function groupAccessContext(req, id) {
  const groupResult = await getGroup(req.token, id);
  const profileResult = await getRequestProfile(req, req.token);
  return {
    group: normalizeGroup(dataFrom(groupResult)?.group || dataFrom(groupResult), Number(id)),
    profile: objectFrom(profileResult)
  };
}

function groupFileValidationStatus(file) {
  if (!file) return 'file-missing';
  if (Number(file.size) > GROUP_FILE_MAX_SIZE) return 'file-too-large';
  const mimeType = trimmed(file.mimetype).toLowerCase();
  if (mimeType !== '' && !GROUP_FILE_ALLOWED_MIME_TYPES.has(mimeType)) return 'file-type-invalid';
  return null;
}

function groupPageStatus(status) {
  const value = trimmed(status);
  return {
    successMessage: GROUP_PAGE_SUCCESS_MESSAGES[value] || null,
    errorMessage: GROUP_PAGE_ERROR_MESSAGES[value] || null
  };
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

function manageStatus(status) {
  const value = trimmed(status);
  if (Object.prototype.hasOwnProperty.call(GROUP_MANAGE_SUCCESS_MESSAGES, value)) {
    return {
      statusBanner: {
        type: 'success',
        title: 'Success',
        message: GROUP_MANAGE_SUCCESS_MESSAGES[value]
      }
    };
  }

  if (Object.prototype.hasOwnProperty.call(GROUP_MANAGE_ERROR_MESSAGES, value)) {
    return {
      statusBanner: {
        type: 'error',
        title: 'There is a problem',
        message: GROUP_MANAGE_ERROR_MESSAGES[value]
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
router.get('/', requireAuth, asyncRoute(async (req, res) => {
  const limit = 30;
  const searchQuery = trimmed(req.query.q || req.query.search);
  const cursor = trimmed(req.query.cursor) || undefined;
  const groupsFilter = allowed(req.query.filter, ['all', 'joined', 'public', 'private'], 'all');
  const filters = {
    per_page: limit,
    cursor,
    q: searchQuery || undefined
  };
  if (groupsFilter === 'joined') filters.member = 'me';
  if (groupsFilter === 'public' || groupsFilter === 'private') filters.visibility = groupsFilter;

  const groupsResult = await getGroups(req.token, filters);

  const groups = collectionFrom(groupsResult)
    .map((group) => normalizeGroup(group, positiveInteger(group?.id)));
  const meta = groupsResult?.meta || {};
  const statusMessages = groupPageStatus(req.query.status);
  const nextQuery = new URLSearchParams();
  if (searchQuery) nextQuery.set('q', searchQuery);
  if (groupsFilter !== 'all') nextQuery.set('filter', groupsFilter);
  const nextCursor = trimmed(meta.cursor || meta.next_cursor);
  if (nextCursor) nextQuery.set('cursor', nextCursor);

  res.render('groups/index', {
    title: 'Groups',
    groups,
    searchQuery,
    groupsFilter,
    pagination: {
      hasMore: Boolean(meta.has_more),
      cursor: nextCursor,
      nextHref: urlFor(res, `/groups?${nextQuery.toString()}`)
    },
    successMessage: statusMessages.successMessage || (req.flash ? req.flash('success')[0] : null),
    errorMessage: statusMessages.errorMessage || (req.flash ? req.flash('error')[0] : null)
  });
}, { redirectOn401: loginRedirect() }));

// Create group form
router.get('/new', requireAuth, (req, res) => {
  res.render('groups/new', {
    title: 'Create a group',
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
});

// Create group
router.post('/new', requireAuth, audit.groupCreate(), asyncRoute(async (req, res) => {
  const cover = uploadedFile(req, 'cover');
  const { name, description, location, tags } = req.body;
  const visibility = ['public', 'private'].includes(req.body.visibility)
    ? req.body.visibility
    : (req.body.is_private === 'true' ? 'private' : 'public');

  const errors = [];

  if (!name || !name.trim()) {
    errors.push({ text: 'Enter a group name', href: '#name' });
  } else if (name.length > 255) {
    errors.push({ text: 'Group name must be 255 characters or fewer', href: '#name' });
  }

  if (String(location || '').length > 255) {
    errors.push({ text: 'Location must be 255 characters or fewer', href: '#location' });
  }

  if (errors.length > 0) {
    await removeUploadedFile(cover);
    return res.render('groups/new', {
      title: 'Create a group',
      errors,
      values: { name, description, location, visibility, tags },
      csrfToken: req.csrfToken ? req.csrfToken() : ''
    });
  }

  try {
    const tagList = groupTags(tags);
    const tagLabel = res.locals.t('groups.create.tags_label');
    const descriptionText = trimmed(description);
    const descriptionWithTags = tagList.length > 0
      ? trimmed(`${descriptionText}\n\n${tagLabel}: ${tagList.join(', ')}`)
      : descriptionText;
    const result = await createGroup(req.token, {
      name: name.trim(),
      description: descriptionWithTags || null,
      location: location ? location.trim() : null,
      visibility
    });

    const createdGroup = dataFrom(result)?.group || dataFrom(result);
    const groupId = positiveInteger(createdGroup && createdGroup.id);
    if (groupId === null) {
      throw new ApiError('Laravel did not return the created group', 502);
    }
    let coverError = null;
    if (cover) {
      try {
        await uploadGroupCover(req.token, groupId, cover);
      } catch (error) {
        coverError = error;
      }
    }
    if (req.flash) {
      req.flash('success', 'Group created successfully');
      if (coverError) req.flash('error', 'The group was created, but its cover image could not be uploaded.');
    }
    res.redirect(urlFor(res, `/groups/${groupId}`));
  } catch (error) {
    if (error instanceof ApiError && error.status === 403 && apiErrorCode(error) === 'ONBOARDING_REQUIRED') {
      return res.redirect(urlFor(res, '/onboarding'));
    }
    if (error instanceof ApiError && error.status === 403) {
      return renderForbidden(res);
    }
    if (error instanceof ApiError && error.status !== 401) {
      return res.render('groups/new', {
        title: 'Create a group',
        errors: groupFormErrors(error, 'Unable to create group'),
        values: { name, description, location, visibility, tags },
        csrfToken: req.csrfToken ? req.csrfToken() : ''
      });
    }
    throw error;
  } finally {
    await removeUploadedFile(cover);
  }
}));

// View group details
router.get('/:id(\\d+)', requireAuth, asyncRoute(async (req, res) => {
  const { id } = req.params;

  const [groupResult, membersResult, eventsResult] = await Promise.all([
    getGroup(req.token, id),
    getGroupMembers(req.token, id, { per_page: 100 }),
    getEvents(req.token, { group_id: id, when: 'upcoming', per_page: 5 }).catch((error) => {
      if (isAuthError(error)) throw error;
      return { data: [] };
    })
  ]);

  const group = normalizeGroup(dataFrom(groupResult)?.group || dataFrom(groupResult), Number(id));
  const members = collectionFrom(membersResult);
  const events = collectionFrom(eventsResult);
  const myMembership = group.myMembership || group.my_membership;
  const membershipStatus = trimmed(myMembership?.status || myMembership?.state);
  const isAdmin = isGroupAdmin(group);
  const isMember = isActiveGroupMember(group);
  const isPending = membershipStatus === 'pending';
  const statusMessages = groupPageStatus(req.query.status);

  res.render('groups/detail', {
    title: group.name,
    group,
    members,
    events,
    myMembership,
    isAdmin,
    isMember,
    isPending,
    groupCanParticipate: isMember,
    csrfToken: req.csrfToken ? req.csrfToken() : '',
    successMessage: statusMessages.successMessage || (req.flash ? req.flash('success')[0] : null),
    errorMessage: statusMessages.errorMessage || (req.flash ? req.flash('error')[0] : null)
  });
}, { notFoundTitle: 'Group not found' }));

// Edit group form
router.get('/:id(\\d+)/edit', requireAuth, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);

  const [groupResult, profileResult] = await Promise.all([
    getGroup(req.token, id),
    getRequestProfile(req, req.token)
  ]);
  const group = normalizeGroup(dataFrom(groupResult)?.group || dataFrom(groupResult), Number(id));
  const profile = objectFrom(profileResult);
  const myMembership = group.myMembership || group.my_membership;

  // Check permission
  if (!isGroupAdmin(group, profile)) {
    if (req.flash) {
      req.flash('error', 'You do not have permission to edit this group');
    }
    return res.redirect(urlFor(res, `/groups/${id}`));
  }

  res.render('groups/edit', {
    title: `Edit ${group.name}`,
    group,
    myMembership,
    isOwner: isGroupOwner(group, profile),
    deleteConfirmationRequired: false,
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}, { notFoundTitle: 'Group not found' }));

router.get('/:id(\\d+)/invite', requireAuth, asyncRoute(async (req, res) => {
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

router.get('/:id(\\d+)/notifications', requireAuth, asyncRoute(async (req, res) => {
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

router.get('/:id(\\d+)/image', requireAuth, asyncRoute(async (req, res) => {
  const id = req.params.id;
  const { group, profile } = await groupAccessContext(req, id);
  if (isKnownGroupAdmin(group, profile) !== true) {
    return renderForbidden(res);
  }

  return res.render('groups/image', {
    title: 'Group images',
    activeNav: 'explore',
    group,
    ...imageStatus(req.query.status)
  });
}, { redirectOn401: loginRedirect(), notFoundTitle: 'Group not found' }));

router.get('/:id(\\d+)/announcements', requireAuth, asyncRoute(async (req, res) => {
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

router.get('/:id(\\d+)/announcements/:annId(\\d+)/edit', requireAuth, asyncRoute(async (req, res) => {
  const { id, annId } = req.params;
  const groupResult = await getGroup(req.token, id);
  const group = normalizeGroup(dataFrom(groupResult)?.group || dataFrom(groupResult), Number(id));
  if (!isGroupAdmin(group)) {
    return res.status(403).render('errors/403', { title: 'Forbidden' });
  }

  const announcementsResult = await callGroup(req.token, 'GET', `/${id}/announcements`);
  const announcementData = collectionFrom(announcementsResult)
    .find((announcement) => String(positiveInteger(announcement?.id)) === String(annId));
  if (!announcementData) {
    return res.status(404).render('errors/404', { title: 'Announcement not found' });
  }

  const announcement = normalizeAnnouncement(announcementData);

  return res.render('groups/announcement-edit', {
    title: 'Edit announcement',
    activeNav: 'explore',
    group,
    announcement,
    ...announcementStatus(req.query.status)
  });
}, { redirectOn401: loginRedirect(), notFoundTitle: 'Announcement not found' }));

router.get('/:id(\\d+)/discussions', requireAuth, asyncRoute(async (req, res) => {
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

router.get('/:id(\\d+)/discussions/new', requireAuth, asyncRoute(async (req, res) => {
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

router.get('/:id(\\d+)/discussions/:discussionId(\\d+)', requireAuth, asyncRoute(async (req, res) => {
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

router.get('/:id(\\d+)/files/:fileId(\\d+)/download', requireAuth, asyncRoute(async (req, res) => {
  const { id, fileId } = req.params;
  const { group, profile } = await groupAccessContext(req, id);
  if (isKnownGroupMember(group, profile) !== true) {
    return renderForbidden(res);
  }

  let download;

  try {
    download = await downloadGroupFile(req.token, `/${id}/files/${fileId}/download`);
  } catch (error) {
    if (isAuthError(error)) {
      return redirectTo(res, loginRedirect());
    }
    if (error instanceof ApiError && error.status === 403) {
      return renderForbidden(res);
    }
    if (error instanceof ApiError && error.status === 404) {
      return renderNotFound(res, 'File not found');
    }
    throw error;
  }

  res.status(download.status || 200);
  applyDownloadHeaders(res, download.headers);
  return res.send(Buffer.isBuffer(download.body) ? download.body : Buffer.from(download.body || ''));
}, { redirectOn401: loginRedirect(), notFoundTitle: 'File not found' }));

router.get('/:id(\\d+)/files', requireAuth, asyncRoute(async (req, res) => {
  const id = req.params.id;
  const { group, profile } = await groupAccessContext(req, id);
  if (isKnownGroupMember(group, profile) !== true) {
    return renderForbidden(res);
  }

  let filesResult;
  try {
    filesResult = await callGroup(req.token, 'GET', `/${id}/files?per_page=50`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) {
      return renderForbidden(res);
    }
    throw error;
  }

  const currentUserId = positiveInteger(profile.id || profile.user_id || profile.userId);
  const isAdmin = isGroupAdmin(group, profile);
  const files = collectionFrom(filesResult)
    .map(normalizeGroupFile)
    .filter((file) => file.id !== null)
    .map((file) => ({
      ...file,
      canDelete: isAdmin || (currentUserId !== null && file.uploadedBy === currentUserId)
    }));

  return res.render('groups/files', {
    title: 'Group files',
    activeNav: 'explore',
    group,
    files,
    isAdmin,
    currentUserId,
    ...fileStatus(req.query.status)
  });
}, { redirectOn401: loginRedirect(), notFoundTitle: 'Group not found' }));

router.get('/:id(\\d+)/manage', requireAuth, asyncRoute(async (req, res) => {
  const id = req.params.id;
  const groupResult = await getGroup(req.token, id);
  const group = normalizeGroup(dataFrom(groupResult)?.group || dataFrom(groupResult), Number(id));
  const ownerId = positiveInteger(group.owner_id || group.ownerId);
  const visibility = trimmed(group.visibility || 'public') || 'public';
  const isPrivate = checked(group.is_private ?? group.isPrivate) || visibility !== 'public';

  const [membersResult, requestsResult] = await Promise.all([
    getGroupMembers(req.token, id, { per_page: 100 }),
    callGroup(req.token, 'GET', `/${id}/requests`).catch((error) => {
      if (isAuthError(error)) throw error;
      return { data: [] };
    })
  ]);

  const members = collectionFrom(membersResult)
    .map((member) => normalizeGroupMember(member, ownerId))
    .filter((member) => member.id !== null);
  const pendingRequests = collectionFrom(requestsResult)
    .map(normalizeJoinRequest)
    .filter((requestItem) => requestItem.id !== null);

  return res.render('groups/manage', {
    title: 'Manage group',
    activeNav: 'explore',
    group,
    members,
    pendingRequests,
    isPrivate,
    ...manageStatus(req.query.status)
  });
}, { redirectOn401: loginRedirect(), notFoundTitle: 'Group not found' }));

// Update group
router.post('/:id(\\d+)/edit', requireAuth, audit.groupUpdate(), asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const cover = uploadedFile(req, 'cover');
  const { name, description, location, tags } = req.body;
  const visibility = ['public', 'private'].includes(req.body.visibility)
    ? req.body.visibility
    : (req.body.is_private === 'true' ? 'private' : 'public');

  const errors = [];

  if (!name || !name.trim()) {
    errors.push({ text: 'Enter a group name', href: '#name' });
  } else if (name.length > 255) {
    errors.push({ text: 'Group name must be 255 characters or fewer', href: '#name' });
  }

  if (String(location || '').length > 255) {
    errors.push({ text: 'Location must be 255 characters or fewer', href: '#location' });
  }

  if (errors.length > 0) {
    await removeUploadedFile(cover);
    return res.render('groups/edit', {
      title: 'Edit group',
      group: { id, name, description, location, visibility, tagsText: trimmed(tags) },
      errors,
      csrfToken: req.csrfToken ? req.csrfToken() : ''
    });
  }

  try {
    await updateGroup(req.token, id, {
      name: name.trim(),
      description: description ? description.trim() : null,
      location: location ? location.trim() : null,
      visibility,
      tags: groupTags(tags)
    });

    let coverError = null;
    if (cover) {
      try {
        await uploadGroupCover(req.token, id, cover);
      } catch (error) {
        coverError = error;
      }
    }
    if (coverError && req.flash) {
      req.flash('error', 'The group was updated, but its cover image could not be uploaded.');
    }

    return res.redirect(groupRedirect(res, id, 'group-updated'));
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) {
      return renderForbidden(res);
    }
    if (error instanceof ApiError && error.status === 404) {
      return renderNotFound(res, 'Group not found');
    }
    if (error instanceof ApiError && error.status === 429) {
      return renderTooManyRequests(res);
    }
    if (error instanceof ApiError && [400, 409, 422].includes(error.status)) {
      return res.render('groups/edit', {
        title: 'Edit group',
        group: { id, name, description, location, visibility, tagsText: trimmed(tags) },
        errors: groupFormErrors(error, 'Unable to update group'),
        csrfToken: req.csrfToken ? req.csrfToken() : ''
      });
    }
    throw error;
  } finally {
    await removeUploadedFile(cover);
  }
}));

// Delete group
router.post('/:id(\\d+)/delete', requireAuth, audit.groupDelete(), asyncRoute(async (req, res) => {
  const id = Number(req.params.id);

  if (trimmed(req.body.confirm).toLowerCase() !== 'yes') {
    const [groupResult, profileResult] = await Promise.all([
      getGroup(req.token, id),
      getRequestProfile(req, req.token)
    ]);
    const group = normalizeGroup(dataFrom(groupResult)?.group || dataFrom(groupResult), id);
    const profile = objectFrom(profileResult);
    const myMembership = group.myMembership || group.my_membership;
    if (!isGroupOwner(group, profile)) {
      return renderForbidden(res);
    }

    return res.status(400).render('groups/edit', {
      title: `Edit ${group.name}`,
      group,
      myMembership,
      isOwner: true,
      errors: [{ text: 'Confirm that you understand the group will be permanently deleted.', href: '#confirm-delete' }],
      deleteConfirmationRequired: true,
      csrfToken: req.csrfToken ? req.csrfToken() : ''
    });
  }

  try {
    await deleteGroup(req.token, id);

    return res.redirect(statusRedirect(res, '/groups', 'group-deleted'));
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) {
      return renderForbidden(res);
    }
    if (error instanceof ApiError && error.status === 404) {
      return renderNotFound(res, 'Group not found');
    }
    if (error instanceof ApiError && error.status === 429) {
      return renderTooManyRequests(res);
    }
    if (error instanceof ApiError && [400, 409, 422].includes(error.status)) {
      return res.redirect(groupRedirect(res, id, 'group-delete-failed'));
    }
    throw error;
  }
}));

// Join group
router.post('/:id(\\d+)/join', requireAuth, audit.groupJoin(), asyncRoute(async (req, res) => {
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
      return res.redirect(urlFor(res, `/groups/${id}`));
    }
    throw error; // Re-throw for asyncRoute to handle 401/503
  }

  res.redirect(urlFor(res, `/groups/${id}`));
}));

// Leave group
router.post('/:id(\\d+)/leave', requireAuth, audit.groupLeave(), asyncRoute(async (req, res) => {
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
      return res.redirect(urlFor(res, `/groups/${id}`));
    }
    throw error; // Re-throw for asyncRoute to handle 401/503
  }

  res.redirect(urlFor(res, `/groups/${id}`));
}));

router.post('/:id(\\d+)/invite/link', requireAuth, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const expiryDays = positiveInteger(req.body.expiry_days);
  const payload = {
    expiry_days: expiryDays !== null && expiryDays <= 90 ? expiryDays : null
  };

  return requireGroupAction(req, res, groupSubpageRedirect(res, id, 'invite', 'invite-link-failed'), async (token) => {
    await callGroup(token, 'POST', `/${id}/invites/link`, payload);
    return res.redirect(groupSubpageRedirect(res, id, 'invite', 'invite-link-created'));
  });
}));

router.post('/:id(\\d+)/invite/email', requireAuth, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const emails = parseInviteEmails(req.body.emails);

  if (emails.length === 0) {
    return res.redirect(groupSubpageRedirect(res, id, 'invite', 'invite-emails-required'));
  }

  if (emails.length > 50) {
    return res.redirect(groupSubpageRedirect(res, id, 'invite', 'invite-emails-too-many'));
  }

  const payload = {
    emails,
    message: optionalText(req.body.message, 5000)
  };

  return requireGroupAction(req, res, groupSubpageRedirect(res, id, 'invite', 'invite-email-failed'), async (token) => {
    await callGroup(token, 'POST', `/${id}/invites/email`, payload);
    return res.redirect(groupSubpageRedirect(res, id, 'invite', 'invite-emails-sent'));
  });
}));

router.post('/:id(\\d+)/invite/:inviteId(\\d+)/revoke', requireAuth, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const inviteId = Number(req.params.inviteId);

  return requireGroupAction(req, res, groupSubpageRedirect(res, id, 'invite', 'invite-revoke-failed'), async (token) => {
    await callGroup(token, 'DELETE', `/${id}/invites/${inviteId}`);
    return res.redirect(groupSubpageRedirect(res, id, 'invite', 'invite-revoked'));
  });
}));

router.post('/:id(\\d+)/notifications', requireAuth, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const payload = {
    frequency: allowed(req.body.frequency, GROUP_NOTIFICATION_FREQUENCIES, 'instant'),
    email_enabled: checked(req.body.email_enabled),
    push_enabled: checked(req.body.push_enabled)
  };

  return requireGroupAction(req, res, groupSubpageRedirect(res, id, 'notifications', 'prefs-failed'), async (token) => {
    await callGroup(token, 'PUT', `/${id}/notification-prefs`, payload);
    return res.redirect(groupSubpageRedirect(res, id, 'notifications', 'prefs-saved'));
  });
}));

router.post('/:id(\\d+)/image', requireAuth, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const file = uploadedFile(req, 'image');
  let group;
  let profile;
  try {
    ({ group, profile } = await groupAccessContext(req, id));
  } catch (error) {
    await removeUploadedFile(file);
    throw error;
  }
  if (isKnownGroupAdmin(group, profile) !== true) {
    await removeUploadedFile(file);
    return renderForbidden(res);
  }

  const type = allowed(req.body.type, ['avatar', 'cover'], 'avatar');

  if (!file) {
    return res.redirect(groupSubpageRedirect(res, id, 'image', 'image-missing'));
  }

  return requireGroupAction(req, res, groupSubpageRedirect(res, id, 'image', 'image-failed'), async (token) => {
    try {
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
    } finally {
      await removeUploadedFile(file);
    }
    return res.redirect(groupSubpageRedirect(res, id, 'image', type === 'cover' ? 'cover-updated' : 'avatar-updated'));
  });
}));

router.post('/:id(\\d+)/files', requireAuth, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const file = uploadedFile(req, 'file');
  let group;
  let profile;
  try {
    ({ group, profile } = await groupAccessContext(req, id));
  } catch (error) {
    await removeUploadedFile(file);
    throw error;
  }
  if (isKnownGroupMember(group, profile) !== true) {
    await removeUploadedFile(file);
    return renderForbidden(res);
  }

  const validationStatus = groupFileValidationStatus(file);

  if (validationStatus) {
    await removeUploadedFile(file);
    return res.redirect(groupSubpageRedirect(res, id, 'files', validationStatus));
  }

  return requireGroupAction(req, res, (error) => (
    groupSubpageRedirect(res, id, 'files', groupFileUploadErrorStatus(error))
  ), async (token) => {
    try {
      const buffer = await fs.readFile(file.filepath);
      await uploadGroupFile(token, id, {
        folder: optionalText(req.body.folder, 100),
        description: optionalText(req.body.description, 500),
        file: {
          buffer,
          filename: trimmed(file.originalFilename) || 'group-file',
          contentType: trimmed(file.mimetype) || 'application/octet-stream',
          size: file.size
        }
      });
    } finally {
      await removeUploadedFile(file);
    }
    return res.redirect(groupSubpageRedirect(res, id, 'files', 'file-uploaded'));
  });
}));

router.post('/:id(\\d+)/files/:fileId(\\d+)/delete', requireAuth, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const fileId = Number(req.params.fileId);
  const { group, profile } = await groupAccessContext(req, id);
  if (isKnownGroupMember(group, profile) !== true) {
    return renderForbidden(res);
  }

  return requireGroupAction(req, res, (error) => {
    const status = error instanceof ApiError && error.status === 404
      ? 'file-not-found'
      : error instanceof ApiError && error.status === 403
        ? 'file-forbidden'
        : 'file-delete-failed';
    return groupSubpageRedirect(res, id, 'files', status);
  }, async (token) => {
    await callGroup(token, 'DELETE', `/${id}/files/${fileId}`);
    return res.redirect(groupSubpageRedirect(res, id, 'files', 'file-deleted'));
  });
}));

router.post('/:id(\\d+)/announcements', requireAuth, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const payload = announcementPayload(req.body);

  if (payload.error) {
    return res.redirect(groupSubpageRedirect(res, id, 'announcements', payload.error));
  }

  return requireGroupAction(req, res, groupSubpageRedirect(res, id, 'announcements', 'ann-create-failed'), async (token) => {
    await callGroup(token, 'POST', `/${id}/announcements`, payload);
    return res.redirect(groupSubpageRedirect(res, id, 'announcements', 'ann-created'));
  });
}));

router.post('/:id(\\d+)/announcements/:annId(\\d+)/edit', requireAuth, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const annId = Number(req.params.annId);
  const payload = announcementPayload(req.body);

  if (payload.error) {
    return res.redirect(announcementEditRedirect(res, id, annId, payload.error));
  }

  return requireGroupAction(req, res, announcementEditRedirect(res, id, annId, 'ann-update-failed'), async (token) => {
    await callGroup(token, 'PUT', `/${id}/announcements/${annId}`, payload);
    return res.redirect(groupSubpageRedirect(res, id, 'announcements', 'ann-updated'));
  });
}));

router.post('/:id(\\d+)/announcements/:annId(\\d+)/delete', requireAuth, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const annId = Number(req.params.annId);

  return requireGroupAction(req, res, groupSubpageRedirect(res, id, 'announcements', 'ann-delete-failed'), async (token) => {
    await callGroup(token, 'DELETE', `/${id}/announcements/${annId}`);
    return res.redirect(groupSubpageRedirect(res, id, 'announcements', 'ann-deleted'));
  });
}));

router.post('/:id(\\d+)/announcements/:annId(\\d+)/pin', requireAuth, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const annId = Number(req.params.annId);
  const isPinned = checked(req.body.is_pinned);

  return requireGroupAction(req, res, groupSubpageRedirect(res, id, 'announcements', 'ann-pin-failed'), async (token) => {
    await callGroup(token, 'PUT', `/${id}/announcements/${annId}`, { is_pinned: isPinned });
    return res.redirect(groupSubpageRedirect(res, id, 'announcements', isPinned ? 'ann-pinned' : 'ann-unpinned'));
  });
}));

router.post('/:id(\\d+)/discussions/new', requireAuth, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const payload = discussionPayload(req.body);

  if (payload === null) {
    return res.redirect(urlFor(res, `/groups/${id}/discussions/new`));
  }

  return requireGroupAction(req, res, groupSubpageRedirect(res, id, 'discussions/new', 'discussion-failed'), async (token) => {
    const result = await callGroup(token, 'POST', `/${id}/discussions`, payload);
    const discussionId = resultId(result);
    const target = discussionId
      ? discussionRedirect(res, id, discussionId, 'discussion-created')
      : groupSubpageRedirect(res, id, 'discussions', 'discussion-created');
    return res.redirect(target);
  });
}));

router.post('/:id(\\d+)/discussions/:discussionId(\\d+)/reply', requireAuth, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const discussionId = Number(req.params.discussionId);
  const content = trimmed(req.body.content, 20000);

  if (content === '') {
    return res.redirect(urlFor(res, `/groups/${id}/discussions/${discussionId}`));
  }

  return requireGroupAction(req, res, discussionRedirect(res, id, discussionId, 'reply-failed', '#discussion-replies'), async (token) => {
    await callGroup(token, 'POST', `/${id}/discussions/${discussionId}/messages`, { content });
    return res.redirect(discussionRedirect(res, id, discussionId, 'reply-posted', '#discussion-replies'));
  });
}));

router.post('/:id(\\d+)/feed', requireAuth, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const content = trimmed(req.body.content, 20000);

  if (content === '') {
    return res.redirect(groupRedirect(res, id, 'group-post-empty', '#group-feed'));
  }

  return requireGroupAction(req, res, groupRedirect(res, id, 'group-post-failed', '#group-feed'), async (token) => {
    await createFeedPostV2(token, {
      content,
      visibility: 'public',
      group_id: id
    });
    return res.redirect(groupRedirect(res, id, 'group-posted', '#group-feed'));
  });
}));

router.post('/:id(\\d+)/members/:memberId(\\d+)', requireAuth, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const memberId = Number(req.params.memberId);
  const action = trimmed(req.body.action);

  if (!['promote', 'demote', 'remove'].includes(action)) {
    return res.redirect(groupSubpageRedirect(res, id, 'manage', 'member-failed'));
  }

  return requireGroupAction(req, res, groupSubpageRedirect(res, id, 'manage', 'member-failed'), async (token) => {
    if (action === 'remove') {
      await callGroup(token, 'DELETE', `/${id}/members/${memberId}`);
      return res.redirect(groupSubpageRedirect(res, id, 'manage', 'member-removed'));
    }

    const role = action === 'promote' ? 'admin' : 'member';
    await callGroup(token, 'PUT', `/${id}/members/${memberId}`, { role });
    return res.redirect(groupSubpageRedirect(res, id, 'manage', action === 'promote' ? 'member-promoted' : 'member-demoted'));
  });
}));

router.post('/:id(\\d+)/requests/:requesterId(\\d+)', requireAuth, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const requesterId = Number(req.params.requesterId);
  const action = trimmed(req.body.action) === 'reject' ? 'reject' : 'accept';

  return requireGroupAction(req, res, groupSubpageRedirect(res, id, 'manage', 'request-failed'), async (token) => {
    await callGroup(token, 'POST', `/${id}/requests/${requesterId}`, { action });
    return res.redirect(groupSubpageRedirect(res, id, 'manage', action === 'reject' ? 'request-rejected' : 'request-approved'));
  });
}));

module.exports = router;
