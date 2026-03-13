// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Lightweight HTML sanitizer for rendering user/CMS content safely.
 * Strips dangerous tags (script, iframe, object, etc.) and event handlers
 * while preserving safe formatting HTML.
 *
 * For production hardening, consider replacing with DOMPurify:
 *   npm install dompurify @types/dompurify
 *   import DOMPurify from 'dompurify';
 *   export const sanitizeHtml = (html: string) => DOMPurify.sanitize(html);
 */

// Tags that are NEVER allowed
const DANGEROUS_TAGS = [
  'script', 'iframe', 'object', 'embed', 'applet', 'form',
  'input', 'textarea', 'select', 'button', 'link', 'meta',
  'style', 'base', 'svg', 'math',
];

// Attributes that indicate event handlers or dangerous URIs
const DANGEROUS_ATTR_PATTERN = /^on|^formaction$|^xlink:|^data-bind/i;
const DANGEROUS_URI_PATTERN = /^\s*(javascript|vbscript|data):/i;

/**
 * Sanitize HTML string by removing dangerous elements and attributes.
 * Safe for use with dangerouslySetInnerHTML.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';

  // Use DOMParser when available (browser environment)
  if (typeof window !== 'undefined' && typeof DOMParser !== 'undefined') {
    return sanitizeWithDom(html);
  }

  // SSR fallback: strip dangerous tags with regex (less precise but safe)
  return sanitizeWithRegex(html);
}

function sanitizeWithDom(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Remove dangerous elements
  for (const tag of DANGEROUS_TAGS) {
    const elements = doc.body.querySelectorAll(tag);
    elements.forEach((el) => el.remove());
  }

  // Remove dangerous attributes from all elements
  const allElements = doc.body.querySelectorAll('*');
  allElements.forEach((el) => {
    const attrs = Array.from(el.attributes);
    for (const attr of attrs) {
      if (DANGEROUS_ATTR_PATTERN.test(attr.name)) {
        el.removeAttribute(attr.name);
      }
      // Check for javascript: URIs in href/src/action
      if (['href', 'src', 'action', 'poster', 'background'].includes(attr.name)) {
        if (DANGEROUS_URI_PATTERN.test(attr.value)) {
          el.removeAttribute(attr.name);
        }
      }
    }
  });

  return doc.body.innerHTML;
}

function sanitizeWithRegex(html: string): string {
  let result = html;

  // Remove dangerous tags and their contents
  for (const tag of DANGEROUS_TAGS) {
    const openClose = new RegExp(`<${tag}[\\s\\S]*?</${tag}>`, 'gi');
    const selfClose = new RegExp(`<${tag}[^>]*\\/?>`, 'gi');
    result = result.replace(openClose, '');
    result = result.replace(selfClose, '');
  }

  // Remove event handler attributes
  result = result.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  // Remove javascript: URIs
  result = result.replace(/\s+(?:href|src|action)\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi, '');

  return result;
}
