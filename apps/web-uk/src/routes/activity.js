// Copyright (C) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const { callProfileApi, ApiError } = require('../lib/api');
const { asyncRoute } = require('../lib/routeHelpers');

const router = express.Router();

function tokenFrom(req) {
  return (req.signedCookies && req.signedCookies.token) || req.token || '';
}

function loginRedirect() {
  return '/login?status=auth-required';
}

function payloadFrom(result) {
  if (result && result.data && typeof result.data === 'object' && !Array.isArray(result.data)) {
    return result.data;
  }
  if (result && typeof result === 'object' && !Array.isArray(result)) {
    return result;
  }
  return {};
}

function arrayFrom(value) {
  return Array.isArray(value) ? value : [];
}

function numberFrom(value) {
  const numeric = Number.parseFloat(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function intFrom(value) {
  const numeric = Number.parseInt(value, 10);
  return Number.isFinite(numeric) ? numeric : 0;
}

function boolFrom(value) {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  if (typeof value === 'string') {
    return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
  }
  return false;
}

function formatNumber(value, fractionDigits = 1) {
  return numberFrom(value).toLocaleString('en-GB', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  });
}

function formatInteger(value) {
  return intFrom(value).toLocaleString('en-GB');
}

function textFrom(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function formatDate(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

function truncate(value, maxLength = 160) {
  const text = textFrom(value);
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 3).trim()}...`;
}

function normalizeSkill(skill) {
  const name = textFrom(skill.skill_name ?? skill.name);
  const endorsements = intFrom(skill.endorsements ?? skill.endorsements_count);
  return {
    name,
    isOffering: boolFrom(skill.is_offering ?? skill.offering),
    isRequesting: boolFrom(skill.is_requesting ?? skill.requesting),
    endorsements,
    endorsementsLabel: endorsements > 0 ? `Endorsed ${formatInteger(endorsements)} times` : ''
  };
}

function normalizeMonthly(monthly) {
  const rows = arrayFrom(monthly).map((row) => {
    const given = numberFrom(row.given ?? row.hours_given);
    const received = numberFrom(row.received ?? row.hours_received);
    return {
      label: textFrom(row.label ?? row.month),
      given,
      received,
      total: given + received,
      givenLabel: formatNumber(given),
      receivedLabel: formatNumber(received),
      totalLabel: formatNumber(given + received),
      percent: 0
    };
  }).filter((row) => row.label);

  const maxTotal = rows.reduce((max, row) => Math.max(max, row.total), 0);
  return rows.map((row) => ({
    ...row,
    percent: maxTotal > 0 ? Math.round((row.total / maxTotal) * 100) : 0
  }));
}

function normalizeTimelineItem(item) {
  const text = truncate(item.description ?? item.title ?? item.message ?? item.content);
  const dateLabel = formatDate(item.created_at ?? item.date);
  return {
    text,
    dateLabel
  };
}

function normalizeActivity(payload) {
  const data = payloadFrom(payload);
  const hours = data.hours_summary && typeof data.hours_summary === 'object' ? data.hours_summary : {};
  const connections = data.connection_stats && typeof data.connection_stats === 'object' ? data.connection_stats : {};
  const engagement = data.engagement && typeof data.engagement === 'object' ? data.engagement : {};
  const skillsBreakdown = data.skills_breakdown && typeof data.skills_breakdown === 'object' ? data.skills_breakdown : {};
  const netBalance = Object.prototype.hasOwnProperty.call(hours, 'net_balance') ? numberFrom(hours.net_balance) : null;

  return {
    hoursGivenLabel: formatNumber(hours.hours_given),
    hoursReceivedLabel: formatNumber(hours.hours_received),
    connectionsLabel: formatInteger(connections.total_connections),
    groupsJoinedLabel: formatInteger(connections.groups_joined),
    engagement: {
      postsLabel: formatInteger(engagement.posts_count),
      commentsLabel: formatInteger(engagement.comments_count),
      likesGivenLabel: formatInteger(engagement.likes_given),
      likesReceivedLabel: formatInteger(engagement.likes_received)
    },
    hasEngagement: Object.keys(engagement).length > 0,
    netBalanceLabel: netBalance === null ? '' : `${formatNumber(netBalance)} hrs`,
    skills: arrayFrom(skillsBreakdown.skills)
      .map(normalizeSkill)
      .filter((skill) => skill.name),
    monthly: normalizeMonthly(data.monthly_hours),
    timeline: arrayFrom(data.timeline)
      .map(normalizeTimelineItem)
      .filter((item) => item.text || item.dateLabel)
  };
}

router.get('/', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) {
    return res.redirect(loginRedirect());
  }

  let payload = {};
  try {
    payload = await callProfileApi(token, 'GET', '/activity/dashboard');
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return res.redirect(loginRedirect());
    }
    payload = {};
  }

  return res.render('activity/index', {
    title: 'My activity',
    activeNav: 'activity',
    communityName: res.locals.tenantName || res.locals.serviceName || 'this community',
    activity: normalizeActivity(payload)
  });
}));

module.exports = router;
