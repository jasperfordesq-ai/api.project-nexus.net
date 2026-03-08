#!/usr/bin/env node
/**
 * Branding Guard - Ensures no government branding exists in our templates
 *
 * This project is NOT a UK government service.
 * We must NOT use logos, branding, or imply government affiliation.
 *
 * Run: npm run brand:check
 */

const fs = require('fs');
const path = require('path');

// Patterns that are NEVER allowed (actual usage, not comments about them)
const FORBIDDEN_PATTERNS = [
  { pattern: /govukFooter\s*\(/g, description: 'govukFooter macro (includes crest by default)' },
  { pattern: /govukHeader\s*\(/g, description: 'govukHeader macro (includes crest by default)' },
  { pattern: /govuk-footer__copyright-logo/g, description: 'Copyright logo class' },
  { pattern: /<svg[^>]*crest/gi, description: 'Crest SVG element' },
  { pattern: /class="[^"]*\bogl\b[^"]*"/gi, description: 'OGL class' },
];

const VIEWS_DIR = path.join(__dirname, '..', 'src', 'views');

function isCommentLine(line) {
  const trimmed = line.trim();
  // Nunjucks comments: {# ... #}
  // Also check if line contains only comment content
  return trimmed.startsWith('{#') ||
         trimmed.endsWith('#}') ||
         (trimmed.includes('{#') && trimmed.includes('#}')) ||
         trimmed.startsWith('<!--') ||
         trimmed.startsWith('//') ||
         trimmed.startsWith('/*') ||
         trimmed.startsWith('*');
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const violations = [];

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const isComment = isCommentLine(line);

    // Skip comment lines entirely - we allow explanations of what we DON'T use
    if (isComment) {
      return;
    }

    // Check forbidden patterns in non-comment lines only
    FORBIDDEN_PATTERNS.forEach(({ pattern, description }) => {
      pattern.lastIndex = 0;
      if (pattern.test(line)) {
        violations.push({
          file: filePath,
          line: lineNum,
          description,
          content: line.trim()
        });
      }
    });
  });

  return violations;
}

function scanDirectory(dir) {
  let allViolations = [];

  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);

    if (item.isDirectory()) {
      allViolations = allViolations.concat(scanDirectory(fullPath));
    } else if (item.name.endsWith('.njk') || item.name.endsWith('.html')) {
      allViolations = allViolations.concat(scanFile(fullPath));
    }
  }

  return allViolations;
}

console.log('Branding Guard - Checking for forbidden government branding...\n');

const violations = scanDirectory(VIEWS_DIR);

if (violations.length > 0) {
  console.error('BRANDING VIOLATIONS FOUND:\n');

  violations.forEach(({ file, line, description, content }) => {
    const relativePath = path.relative(process.cwd(), file);
    console.error(`  ${relativePath}:${line}`);
    console.error(`    Issue: ${description}`);
    console.error(`    Content: ${content.substring(0, 80)}${content.length > 80 ? '...' : ''}`);
    console.error('');
  });

  console.error(`\nFound ${violations.length} branding violation(s).`);
  console.error('This project is NOT a UK government service.');
  console.error('Remove all government branding and marks.\n');
  process.exit(1);
} else {
  console.log('No branding violations found.');
  console.log('  - No govukFooter macro usage');
  console.log('  - No govukHeader macro usage');
  console.log('  - No copyright logo classes');
  console.log('  - No crest SVG elements');
  console.log('\nBranding check passed.\n');
  process.exit(0);
}
