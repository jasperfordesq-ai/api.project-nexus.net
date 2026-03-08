// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Contributor utilities for loading and grouping contributors from the canonical JSON file.
 * Per NOTICE requirements, ALL contributors must be displayed on About pages.
 */

const path = require('path');
const fs = require('fs');

/**
 * Load contributors from contributors.json
 * @returns {Array} Array of contributor objects
 */
function getContributors() {
  const contributorsPath = path.join(__dirname, '..', '..', 'contributors.json');
  try {
    const data = fs.readFileSync(contributorsPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to load contributors.json:', error.message);
    return [];
  }
}

/**
 * Group contributors by type for display
 * @returns {Object} Contributors grouped by type
 */
function getContributorGroups() {
  const contributors = getContributors();

  return {
    creator: contributors.find(c => c.type === 'creator') || null,
    founders: contributors.filter(c => c.type === 'founder'),
    contributors: contributors.filter(c => c.type === 'contributor'),
    acknowledgements: contributors.filter(c => c.type === 'acknowledgement')
  };
}

/**
 * Get the research foundation acknowledgement
 * @returns {Object|null} Research foundation contributor or null
 */
function getResearchFoundation() {
  const contributors = getContributors();
  return contributors.find(c => c.role === 'Research Foundation') || null;
}

module.exports = {
  getContributors,
  getContributorGroups,
  getResearchFoundation
};
