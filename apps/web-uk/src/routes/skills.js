// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const {
  ApiError,
  getSkillCategories,
  getSkillCategory,
  getSkillMembers
} = require('../lib/api');
const { asyncRoute } = require('../lib/routeHelpers');

const router = express.Router();

const PROFICIENCY_LABELS = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  expert: 'Expert'
};

function tokenFrom(req) {
  return req.signedCookies.token || '';
}

function dataFrom(result) {
  return result && typeof result === 'object' && result.data !== undefined ? result.data : result;
}

function collectionFrom(result) {
  const data = dataFrom(result);
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  if (data && Array.isArray(data.items)) return data.items;
  if (data && Array.isArray(data.categories)) return data.categories;
  return [];
}

function objectFrom(result) {
  const data = dataFrom(result);
  return data && typeof data === 'object' && !Array.isArray(data) ? data : null;
}

function positiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function queryText(value) {
  return String(value || '').trim().slice(0, 100);
}

function titleCaseLabel(value) {
  const key = String(value || '').trim().toLowerCase();
  return PROFICIENCY_LABELS[key] || '';
}

function normalizeCategory(node) {
  const raw = node && typeof node === 'object' ? node : {};
  const id = positiveInteger(raw.id);
  const name = String(raw.name || raw.title || '').trim();
  const children = Array.isArray(raw.children) ? raw.children : [];

  return {
    id,
    name,
    children: children.map(normalizeCategory).filter((child) => child.name)
  };
}

function normalizeSkill(item) {
  const raw = item && typeof item === 'object' ? item : {};
  const name = String(raw.skill_name || raw.name || '').trim();

  return {
    name,
    userCount: Number(raw.user_count || raw.members_count || raw.member_count || 0) || 0,
    offeringCount: Number(raw.offering_count || raw.offers_count || 0) || 0,
    requestingCount: Number(raw.requesting_count || raw.wants_count || 0) || 0
  };
}

function normalizeMember(item) {
  const raw = item && typeof item === 'object' ? item : {};
  const id = positiveInteger(raw.id || raw.user_id);
  const name = String(raw.name || `${raw.first_name || ''} ${raw.last_name || ''}`).trim();

  return {
    id,
    name,
    proficiencyLabel: titleCaseLabel(raw.proficiency_level || raw.proficiency),
    isOffering: Boolean(raw.is_offering),
    isRequesting: Boolean(raw.is_requesting)
  };
}

function isAuthError(error) {
  return error instanceof ApiError && error.status === 401;
}

function redirectTo(res, pathname) {
  const urlFor = typeof res.locals.urlFor === 'function' ? res.locals.urlFor : (value) => value;
  return res.redirect(urlFor(pathname));
}

router.get('/', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) {
    return redirectTo(res, '/login?status=auth-required');
  }

  const categoryId = positiveInteger(req.query.category);
  const skillQuery = queryText(req.query.skill);
  let skillTree = [];
  let selectedCategory = null;
  let categorySkills = [];
  let skillMembers = [];
  let apiError = null;

  try {
    skillTree = collectionFrom(await getSkillCategories(token))
      .map(normalizeCategory)
      .filter((category) => category.name);

    if (categoryId !== null) {
      const category = objectFrom(await getSkillCategory(token, categoryId));
      selectedCategory = category ? normalizeCategory(category) : null;
      categorySkills = Array.isArray(category?.skills)
        ? category.skills.map(normalizeSkill).filter((skill) => skill.name)
        : [];
    }

    if (skillQuery) {
      skillMembers = collectionFrom(await getSkillMembers(token, skillQuery, { limit: 40 }))
        .map(normalizeMember)
        .filter((member) => member.name);
    }
  } catch (error) {
    if (isAuthError(error)) throw error;
    apiError = 'Skills are temporarily unavailable. Try again in a few minutes.';
  }

  return res.render('skills/index', {
    title: 'Skills',
    activeNav: 'explore',
    skillTree,
    skillQuery,
    skillMembers,
    selectedCategory,
    categorySkills,
    apiError
  });
}, { redirectOn401: '/login?status=auth-required' }));

module.exports = router;
