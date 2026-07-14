// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const espree = require('espree');

const HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);
const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const WRAPPERS = {
  callListingApi: wrapper('/api/v2/listings', 1, 2, 3),
  callNewsletterApi: wrapper('/api/v2/newsletter/unsubscribe', 0, 1, 2, false, null, 'guest'),
  callVolunteeringApi: wrapper('/api/v2/volunteering', 1, 2, 3),
  callMarketplaceApi: wrapper('/api/v2/marketplace', 1, 2, 3),
  callMerchantOnboardingApi: wrapper('/api/v2/merchant-onboarding', 1, 2, 3),
  callCouponApi: wrapper('/api/v2/coupons', 1, 2, 3),
  callIdeationApi: wrapper('/api/v2', 1, 2, 3),
  callGroupExchangeApi: wrapper('/api/v2/group-exchanges', 1, 2, 3),
  callEventApi: wrapper('/api/v2/events', 1, 2, 3),
  callAdminEventApi: wrapper('/api/v2/admin/events', 1, 2, 3),
  callEventTemplateApi: wrapper('/api/v2/event-templates', 1, 2, 3),
  downloadEventApi: wrapper('/api/v2/events', null, 1, null, true, 'GET'),
  callGoalApi: wrapper('/api/v2/goals', 1, 2, 3),
  callCourseApi: wrapper('/api/v2/courses', 1, 2, 3),
  callGroupApi: wrapper('/api/v2/groups', 1, 2, 3),
  downloadGroupFile: wrapper('/api/v2/groups', null, 1, null, true, 'GET'),
  callJobApi: wrapper('/api/v2/jobs', 1, 2, 3),
  callAdminJobApi: wrapper('/api/v2/admin/jobs', 1, 2, 3),
  callJobDownload: wrapper('/api/v2/jobs', null, 1, null, true, 'GET'),
  callUserSettingsApi: wrapper('/api/v2/users/me', 1, 2, 3),
  callProfileApi: wrapper('/api/v2', 1, 2, 3),
  callWebAuthnApi: wrapper('/api/webauthn', 1, 2, 3),
  callWalletApi: wrapper('/api/v2/wallet', 1, 2, 3),
  callWalletDownload: wrapper('/api/v2/wallet', null, 1, null, true, 'GET'),
  callMatchesApi: wrapper('/api/v2/matches', 1, 2, 3),
  callMessageApi: wrapper('/api/v2/messages', 1, 2, 3),
  callConversationApi: wrapper('/api/v2/conversations', 1, 2, 3),
  callPodcastApi: wrapper('/api/v2/podcasts', 1, 2, 3),
  callFederationApi: wrapper('/api/v2/federation', 1, 2, 3),
  callGamificationApi: wrapper('/api/v2/gamification', 1, 2, 3),
  callReviewApi: wrapper('/api/v2/reviews', 1, 2, 3)
};

function wrapper(prefix, methodIndex, pathIndex, dataIndex, binary = false, defaultMethod = null, authMode = 'required') {
  return { prefix, methodIndex, pathIndex, dataIndex, binary, defaultMethod, authMode };
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function listFiles(dirPath, predicate = () => true) {
  if (!fs.existsSync(dirPath)) return [];
  const files = [];
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(fullPath, predicate));
    else if (predicate(fullPath)) files.push(fullPath);
  }
  return files.sort();
}

function parseJavaScript(source, filePath = 'source.js') {
  try {
    return espree.parse(source, {
      ecmaVersion: 2022,
      sourceType: 'script',
      loc: true,
      range: true
    });
  } catch (error) {
    error.message = `${filePath}: ${error.message}`;
    throw error;
  }
}

function walk(node, visitor, parent = null) {
  if (!node || typeof node !== 'object') return;
  visitor(node, parent);
  for (const [key, value] of Object.entries(node)) {
    if (key === 'parent' || key === 'loc' || key === 'range') continue;
    if (Array.isArray(value)) {
      for (const child of value) walk(child, visitor, node);
    } else if (value && typeof value.type === 'string') {
      walk(value, visitor, node);
    }
  }
}

function expressionName(node) {
  if (!node) return 'dynamic';
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'MemberExpression') {
    const object = expressionName(node.object);
    const property = node.computed ? expressionName(node.property) : node.property.name;
    return `${object}.${property}`;
  }
  if (node.type === 'CallExpression') return expressionName(node.callee).split('.').pop() || 'value';
  return 'dynamic';
}

function staticValue(node, variables = new Map(), seen = new Set()) {
  if (!node) return '';
  if (node.type === 'Literal') return String(node.value ?? '');
  if (node.type === 'Identifier') {
    if (variables.has(node.name) && !seen.has(node.name)) {
      const nextSeen = new Set(seen);
      nextSeen.add(node.name);
      return staticValue(variables.get(node.name), variables, nextSeen);
    }
    if (/query$/i.test(node.name)) return '?{query}';
    return `{${node.name}}`;
  }
  if (node.type === 'TemplateLiteral') {
    let value = '';
    node.quasis.forEach((quasi, index) => {
      value += quasi.value.cooked ?? quasi.value.raw;
      if (node.expressions[index]) value += staticValue(node.expressions[index], variables, seen);
    });
    return value;
  }
  if (node.type === 'BinaryExpression' && node.operator === '+') {
    return staticValue(node.left, variables, seen) + staticValue(node.right, variables, seen);
  }
  if (node.type === 'CallExpression') {
    if (expressionName(node.callee).endsWith('encodeURIComponent') && node.arguments[0]) {
      return `{${expressionName(node.arguments[0]).split('.').pop()}}`;
    }
    if (/(?:query|params|searchParams|toString)$/i.test(expressionName(node.callee))) return '?{query}';
    return `{${expressionName(node)}}`;
  }
  if (node.type === 'LogicalExpression') {
    const right = staticValue(node.right, variables, seen);
    return right || `{${expressionName(node.left)}}`;
  }
  if (node.type === 'ConditionalExpression') {
    const consequent = staticValue(node.consequent, variables, seen);
    const alternate = staticValue(node.alternate, variables, seen);
    if (!alternate) return consequent;
    if (!consequent) return alternate;
    if (consequent === alternate) return consequent;
    if (consequent.startsWith('?') && !alternate.startsWith('?')) return consequent;
    if (alternate.startsWith('?') && !consequent.startsWith('?')) return alternate;
    return '{dynamic}';
  }
  if (node.type === 'MemberExpression') return `{${expressionName(node)}}`;
  return `{${expressionName(node)}}`;
}

function functionVariables(functionNode) {
  const variables = new Map();
  walk(functionNode.body, (node) => {
    if (node.type !== 'VariableDeclarator' || node.id.type !== 'Identifier' || !node.init) return;
    variables.set(node.id.name, node.init);
  });
  return variables;
}

function objectProperty(objectNode, propertyName, variables = new Map()) {
  if (!objectNode) return null;
  if (objectNode.type === 'Identifier' && variables.has(objectNode.name)) {
    return objectProperty(variables.get(objectNode.name), propertyName, variables);
  }
  if (objectNode.type !== 'ObjectExpression') return null;
  for (const property of objectNode.properties) {
    if (property.type !== 'Property') continue;
    const name = property.computed ? staticValue(property.key, variables) : (property.key.name || property.key.value);
    if (name === propertyName) return property.value;
  }
  return null;
}

function normalizeMethod(value, fallback = 'GET') {
  const method = String(value || fallback).replace(/[{}]/g, '').toUpperCase();
  return HTTP_METHODS.has(method) ? method : 'DYNAMIC';
}

function normalizePath(value) {
  let normalized = String(value || '/').trim().replace(/\\/g, '/');
  normalized = normalized.replace(/\?.*$/, '');
  normalized = normalized.replace(/\{[^}]+\}/g, '{param}');
  normalized = normalized.replace(/\/+/g, '/');
  if (!normalized.startsWith('/')) normalized = `/${normalized}`;
  return normalized.length > 1 ? normalized.replace(/\/$/, '') : normalized;
}

function displayPath(value) {
  let result = String(value || '/').trim().replace(/\\/g, '/');
  result = result.replace(/\{([^}]+)\}/g, (match, name) => name === 'dynamic' ? '{dynamic}' : '{param}');
  result = result.replace(/\/+/g, '/');
  if (!result.startsWith('/')) result = `/${result}`;
  return result;
}

function sourceSlice(source, node) {
  return node && node.range ? source.slice(node.range[0], node.range[1]) : '';
}

function inferRequestShape(source, functionNode, method, dataNode = null) {
  if (READ_METHODS.has(method)) return 'query/path parameters; no request body expected';
  const body = sourceSlice(source, functionNode.body);
  if (/new\s+globalThis\.FormData|new\s+FormData/.test(body)) return 'multipart/form-data; see helper fields and Laravel operation';
  if (dataNode && dataNode.type === 'ObjectExpression') {
    const keys = dataNode.properties
      .filter((property) => property.type === 'Property')
      .map((property) => property.key.name || property.key.value)
      .filter(Boolean);
    if (keys.length) return `JSON object: ${keys.join(', ')}`;
  }
  const jsonMatch = body.match(/JSON\.stringify\(\s*\{([^}]*)\}\s*\)/s);
  if (jsonMatch) {
    const keys = [...jsonMatch[1].matchAll(/(?:^|,)\s*([A-Za-z_$][\w$]*)\s*(?=[:,])/g)].map((match) => match[1]);
    if (keys.length) return `JSON object: ${[...new Set(keys)].join(', ')}`;
  }
  return 'JSON caller payload; validate against Laravel operation';
}

function inferAuthMode(source, functionNode) {
  const body = sourceSlice(source, functionNode.body);
  if (!/Authorization\s*:\s*`Bearer\s+\$\{token\}`/.test(body)) return 'guest';
  if (/token\s*\?\s*\{\s*Authorization|headers\s*=\s*token\s*\?/.test(body)) return 'optional';
  return 'required';
}

function collectExportedNames(ast) {
  const names = new Set();
  walk(ast, (node) => {
    if (node.type !== 'AssignmentExpression' || node.left.type !== 'MemberExpression') return;
    if (expressionName(node.left) !== 'module.exports' || node.right.type !== 'ObjectExpression') return;
    for (const property of node.right.properties) {
      if (property.type !== 'Property') continue;
      names.add(property.value.name || property.key.name || property.key.value);
    }
  });
  return names;
}

function collectFunctions(ast) {
  const functions = new Map();
  walk(ast, (node) => {
    if (node.type === 'FunctionDeclaration' && node.id?.name) functions.set(node.id.name, node);
  });
  return functions;
}

function collectDirectContracts(apiSource, apiAst) {
  const exports = collectExportedNames(apiAst);
  const functions = collectFunctions(apiAst);
  const contracts = [];

  for (const name of [...exports].sort()) {
    if (WRAPPERS[name]) continue;
    const functionNode = functions.get(name);
    if (!functionNode) continue;
    const variables = functionVariables(functionNode);
    walk(functionNode.body, (node) => {
      if (node.type !== 'CallExpression' || node.callee.type !== 'Identifier') return;
      if (!['request', 'downloadRequest'].includes(node.callee.name)) return;
      const endpoint = displayPath(staticValue(node.arguments[0], variables));
      const optionsNode = node.arguments[1];
      const methodNode = objectProperty(optionsNode, 'method', variables);
      const method = normalizeMethod(staticValue(methodNode, variables), 'GET');
      const dataNode = objectProperty(optionsNode, 'body', variables);
      contracts.push({
        helper: name,
        method,
        path: endpoint,
        requestShape: inferRequestShape(apiSource, functionNode, method, dataNode),
        authMode: inferAuthMode(apiSource, functionNode),
        binary: node.callee.name === 'downloadRequest',
        sourceFile: 'src/lib/api.js',
        sourceLine: node.loc.start.line
      });
    });
  }
  return contracts;
}

function importedApiHelpers(ast) {
  const names = new Set();
  walk(ast, (node) => {
    if (node.type !== 'VariableDeclarator' || node.id.type !== 'ObjectPattern') return;
    const init = node.init;
    if (init?.type !== 'CallExpression' || init.callee?.name !== 'require') return;
    const requestedPath = init.arguments[0]?.value;
    if (typeof requestedPath !== 'string' || !/(?:^|\/)api$/.test(requestedPath)) return;
    for (const property of node.id.properties) {
      if (property.type !== 'Property') continue;
      const name = property.key.name || property.key.value;
      if (name) names.add(name);
    }
  });
  return names;
}

function collectConsumers(webUkRoot) {
  const sourceRoot = path.join(webUkRoot, 'src');
  const consumerFiles = listFiles(sourceRoot, (filePath) => filePath.endsWith('.js') && !filePath.endsWith(path.join('lib', 'api.js')));
  const consumers = new Map();
  const parsed = [];
  for (const filePath of consumerFiles) {
    const source = readText(filePath);
    const ast = parseJavaScript(source, filePath);
    const imported = importedApiHelpers(ast);
    if (!imported.size) continue;
    const relativePath = path.relative(webUkRoot, filePath).replace(/\\/g, '/');
    for (const name of imported) {
      if (!consumers.has(name)) consumers.set(name, []);
      consumers.get(name).push(relativePath);
    }
    parsed.push({ filePath, relativePath, source, ast, imported });
  }
  return { consumers, parsed };
}

function collectWrapperContracts(parsedConsumers) {
  const contracts = [];
  for (const consumer of parsedConsumers) {
    const aliases = new Map();
    const functions = collectFunctions(consumer.ast);
    const calledNames = new Set();
    walk(consumer.ast, (node) => {
      if (node.type === 'CallExpression' && node.callee.type === 'Identifier') calledNames.add(node.callee.name);
    });
    for (const [functionName, functionNode] of functions) {
      if (!calledNames.has(functionName)) continue;
      let wrapperCall = null;
      walk(functionNode.body, (node) => {
        if (wrapperCall || node.type !== 'CallExpression' || node.callee.type !== 'Identifier') return;
        if (WRAPPERS[node.callee.name] && consumer.imported.has(node.callee.name)) wrapperCall = node;
      });
      if (wrapperCall) {
        aliases.set(functionName, {
          functionNode,
          wrapperName: wrapperCall.callee.name,
          wrapperCall
        });
      }
    }

    function aliasArgument(alias, wrapperIndex, callNode) {
      if (wrapperIndex === null) return null;
      const wrapperArgument = alias.wrapperCall.arguments[wrapperIndex];
      if (wrapperArgument?.type !== 'Identifier') return wrapperArgument;
      const parameterIndex = alias.functionNode.params.findIndex(
        (parameter) => parameter.type === 'Identifier' && parameter.name === wrapperArgument.name
      );
      return parameterIndex === -1 ? wrapperArgument : callNode.arguments[parameterIndex];
    }

    walk(consumer.ast, (node) => {
      if (node.type !== 'CallExpression' || node.callee.type !== 'Identifier') return;
      const alias = aliases.get(node.callee.name);
      const wrapperName = alias?.wrapperName || node.callee.name;
      const config = WRAPPERS[wrapperName];
      if (!config) return;
      if (!alias && !consumer.imported.has(node.callee.name)) return;
      if (!alias) {
        const enclosingAlias = [...aliases.values()].find((candidate) => (
          node.range[0] >= candidate.functionNode.body.range[0]
          && node.range[1] <= candidate.functionNode.body.range[1]
          && candidate.wrapperName === node.callee.name
        ));
        if (enclosingAlias) return;
      }
      const argumentAt = (index) => alias ? aliasArgument(alias, index, node) : node.arguments[index];
      const methodValue = config.methodIndex === null
        ? config.defaultMethod
        : staticValue(argumentAt(config.methodIndex));
      const method = normalizeMethod(methodValue, config.defaultMethod || 'GET');
      const childPath = staticValue(argumentAt(config.pathIndex));
      const joinedPath = displayPath(`${config.prefix}${childPath && childPath !== '{dynamic}' ? (childPath.startsWith('/') || childPath.startsWith('?') ? childPath : `/${childPath}`) : '/{dynamic}'}`);
      contracts.push({
        helper: wrapperName,
        method,
        path: joinedPath,
        requestShape: inferRequestShape(consumer.source, node, method, config.dataIndex === null ? null : argumentAt(config.dataIndex)),
        authMode: config.authMode,
        binary: config.binary,
        sourceFile: consumer.relativePath,
        sourceLine: node.loc.start.line,
        consumer: consumer.relativePath
      });
    });
  }
  return contracts;
}

function collectTestSources(webUkRoot) {
  const testRoot = path.join(webUkRoot, 'tests');
  return listFiles(testRoot, (filePath) => filePath.endsWith('.js')).map((filePath) => ({
    relativePath: path.relative(webUkRoot, filePath).replace(/\\/g, '/'),
    source: readText(filePath)
  }));
}

function findTests(testSources, helper, endpoint) {
  const pathToken = endpoint
    .replace(/\?.*$/, '')
    .replace(/\{param\}/g, '')
    .replace(/\/+$/, '')
    .split('/')
    .filter(Boolean)
    .slice(-2)
    .join('/');
  return testSources
    .filter((testFile) => {
      return new RegExp(`\\b${helper.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(testFile.source)
        || (pathToken.length >= 5 && testFile.source.includes(pathToken));
    })
    .map((testFile) => testFile.relativePath);
}

function openApiIndex(openApi) {
  const index = new Map();
  for (const [routePath, pathItem] of Object.entries(openApi.paths || {})) {
    for (const [method, operation] of Object.entries(pathItem || {})) {
      const normalizedMethod = method.toUpperCase();
      if (!HTTP_METHODS.has(normalizedMethod)) continue;
      index.set(`${normalizedMethod}|${normalizePath(routePath)}`, { routePath, operation });
    }
  }
  return index;
}

function describeSchema(schema) {
  if (!schema) return '';
  if (schema.$ref) return schema.$ref.replace('#/components/schemas/', 'schema:');
  if (schema.type === 'array') return `array<${describeSchema(schema.items) || 'item'}>`;
  if (schema.type) return schema.type;
  return 'documented schema';
}

function operationRequestShape(operation, fallback) {
  if (!operation) return fallback;
  const parameterNames = (operation.parameters || []).map((item) => `${item.in}:${item.name}`);
  const content = operation.requestBody?.content || {};
  const bodies = Object.entries(content).map(([contentType, media]) => `${contentType} ${describeSchema(media.schema)}`.trim());
  return [...parameterNames, ...bodies].join('; ') || fallback;
}

function operationResponseShape(operation, binary) {
  if (!operation) return binary ? 'binary response via downloadRequest' : 'JSON/text response via ApiError-aware request';
  const successful = Object.entries(operation.responses || {})
    .filter(([status]) => /^2\d\d$/.test(status))
    .flatMap(([status, response]) => Object.entries(response.content || {}).map(([contentType, media]) => `${status} ${contentType} ${describeSchema(media.schema)}`.trim()));
  if (successful.length) return successful.join('; ');
  return binary ? 'binary response via downloadRequest' : 'successful Laravel response envelope';
}

function stableUnique(values) {
  return [...new Set((values || []).filter(Boolean))].sort();
}

function contractKey(row) {
  return `${row.method}|${normalizePath(row.path)}|${row.helper}`;
}

function sha256(contents) {
  return crypto.createHash('sha256').update(contents).digest('hex');
}

function buildRows({ directContracts, wrapperContracts, consumers, openApi, testSources }) {
  const operationIndex = openApiIndex(openApi);
  const rowsByKey = new Map();
  for (const contract of [...directContracts, ...wrapperContracts]) {
    const key = contractKey(contract);
    if (!rowsByKey.has(key)) rowsByKey.set(key, { ...contract, consumers: [] });
    const row = rowsByKey.get(key);
    row.consumers.push(...(contract.consumer ? [contract.consumer] : (consumers.get(contract.helper) || [])));
  }

  return [...rowsByKey.values()].map((row) => {
    const normalized = normalizePath(row.path);
    const match = row.method === 'DYNAMIC' ? null : operationIndex.get(`${row.method}|${normalized}`);
    const operation = match?.operation || null;
    const statusCodes = operation ? Object.keys(operation.responses || {}).sort() : [];
    const authMode = operation?.security?.length > 0 ? 'required' : (row.authMode || 'guest');
    const mutation = row.method === 'DYNAMIC' ? 'dynamic' : !READ_METHODS.has(row.method);
    const tests = findTests(testSources, row.helper, displayPath(row.path));
    const frontendConsumers = stableUnique(row.consumers);
    return {
      id: `${row.method} ${displayPath(row.path)} [${row.helper}]`,
      method: row.method,
      path: displayPath(row.path),
      apiHelper: row.helper,
      source: `${row.sourceFile || 'src/lib/api.js'}:${row.sourceLine}`,
      tenantAuthority: 'request-scoped tenant header unless bearer, explicit tenant, Host, or Origin already supplies authority',
      authAndRole: authMode === 'required'
        ? 'bearer required by helper/OpenAPI; Laravel policy and consumer route guard remain authoritative'
        : (authMode === 'optional'
          ? 'guest-capable with optional bearer; Laravel policy remains authoritative'
          : 'guest-capable; request tenant context still applies'),
      requestShape: operationRequestShape(operation, row.requestShape),
      responseShape: operationResponseShape(operation, row.binary),
      statusCodes,
      errorEnvelope: 'non-2xx becomes ApiError(status,data); network failure becomes ApiOfflineError(503)',
      redirects: frontendConsumers.length ? `consumer-controlled: ${frontendConsumers.join(', ')}` : 'no routed consumer detected',
      sideEffects: mutation === true ? 'state-changing; disposable-environment runtime proof required' : (mutation === false ? 'read-only by HTTP method' : 'method dynamic; classify every callsite before runtime'),
      cleanup: mutation === true ? 'fixture-specific cleanup and final absence/equality proof required' : (mutation === false ? 'not applicable' : 'unresolved until method is concrete'),
      laravel: operation ? {
        status: 'matched-openapi',
        path: match.routePath,
        operationId: operation.operationId || '',
        controllerAction: operation['x-controller-action'] || '',
        tags: operation.tags || []
      } : {
        status: row.method === 'DYNAMIC' || normalized.includes('{param}') && row.path.includes('{dynamic}') ? 'dynamic-unresolved' : 'missing-openapi-match',
        path: '',
        operationId: '',
        controllerAction: '',
        tags: []
      },
      frontendConsumers,
      tests,
      evidence: tests.length ? 'static/mock test reference detected; inspect assertions before claiming contract certification' : 'no test reference detected'
    };
  }).sort((left, right) => left.path.localeCompare(right.path) || left.method.localeCompare(right.method) || left.apiHelper.localeCompare(right.apiHelper));
}

function escapeCell(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function renderMarkdown(report) {
  const lines = [
    '# Web UK Frontend-Consumer API Ledger',
    '',
    'Generated from `src/lib/api.js`, routed Web UK consumers, tests, and Laravel `openapi.json`.',
    'This is static evidence: an OpenAPI match or test reference does not prove runtime behavior, role policy, side effects, cleanup, or frontend parity.',
    '',
    `- Contracts: ${report.summary.contracts}`,
    `- Laravel OpenAPI matches: ${report.summary.matchedOpenApi}`,
    `- Missing OpenAPI matches: ${report.summary.missingOpenApi}`,
    `- Dynamic unresolved contracts: ${report.summary.dynamicUnresolved}`,
    `- State-changing contracts: ${report.summary.stateChanging}`,
    `- Rows without detected tests: ${report.summary.withoutTests}`,
    `- API source SHA-256: \`${report.sources.apiSha256}\``,
    `- Laravel OpenAPI SHA-256: \`${report.sources.laravelOpenApiSha256}\``,
    '',
    'The JSON companion contains the full request/response, status/error, redirect, side-effect, cleanup, Laravel implementation, consumer, and test fields.',
    '',
    '| Method | Path | Helper | Laravel | Side effects / cleanup | Consumers | Tests |',
    '|---|---|---|---|---|---|---|'
  ];
  for (const row of report.rows) {
    const laravel = row.laravel.status === 'matched-openapi'
      ? `${row.laravel.operationId || 'documented'}${row.laravel.controllerAction ? `<br>${row.laravel.controllerAction}` : ''}`
      : row.laravel.status;
    lines.push(`| ${escapeCell(row.method)} | \`${escapeCell(row.path)}\` | \`${escapeCell(row.apiHelper)}\` | ${escapeCell(laravel)} | ${escapeCell(row.sideEffects)}<br>${escapeCell(row.cleanup)} | ${escapeCell(row.frontendConsumers.join('<br>') || 'none detected')} | ${escapeCell(row.tests.join('<br>') || 'none detected')} |`);
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function generateApiConsumerLedger(options = {}) {
  const webUkRoot = options.webUkRoot || path.resolve(__dirname, '..');
  const laravelRoot = options.laravelRoot || process.env.LARAVEL_SOURCE_ROOT || 'C:\\platforms\\htdocs\\staging';
  const outDir = options.outDir || path.join(webUkRoot, 'docs', 'generated');
  const apiPath = options.apiPath || path.join(webUkRoot, 'src', 'lib', 'api.js');
  const openApiPath = options.openApiPath || path.join(laravelRoot, 'openapi.json');
  const apiSource = readText(apiPath);
  const openApiSource = readText(openApiPath);
  const apiAst = parseJavaScript(apiSource, apiPath);
  const { consumers, parsed } = collectConsumers(webUkRoot);
  const testSources = collectTestSources(webUkRoot);
  const allDirectContracts = collectDirectContracts(apiSource, apiAst);
  const wrapperContracts = collectWrapperContracts(parsed);
  const directContracts = allDirectContracts.filter((contract) => consumers.has(contract.helper));
  const rows = buildRows({
    directContracts,
    wrapperContracts,
    consumers,
    openApi: JSON.parse(openApiSource),
    testSources
  });
  const report = {
    schemaVersion: 1,
    sources: {
      api: path.relative(webUkRoot, apiPath).replace(/\\/g, '/'),
      apiSha256: sha256(apiSource),
      laravelOpenApi: openApiPath,
      laravelOpenApiSha256: sha256(openApiSource)
    },
    summary: {
      contracts: rows.length,
      matchedOpenApi: rows.filter((row) => row.laravel.status === 'matched-openapi').length,
      missingOpenApi: rows.filter((row) => row.laravel.status === 'missing-openapi-match').length,
      dynamicUnresolved: rows.filter((row) => row.laravel.status === 'dynamic-unresolved').length,
      stateChanging: rows.filter((row) => row.sideEffects.startsWith('state-changing')).length,
      withoutTests: rows.filter((row) => row.tests.length === 0).length
    },
    rows
  };

  ensureDir(outDir);
  fs.writeFileSync(path.join(outDir, 'frontend-api-consumer-ledger.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(outDir, 'frontend-api-consumer-ledger.md'), renderMarkdown(report), 'utf8');
  return report;
}

if (require.main === module) {
  const report = generateApiConsumerLedger();
  process.stdout.write(`${JSON.stringify(report.summary)}\n`);
  if (report.summary.dynamicUnresolved > 0) {
    process.stderr.write(`Warning: ${report.summary.dynamicUnresolved} dynamic contracts require manual classification.\n`);
  }
}

module.exports = {
  WRAPPERS,
  collectDirectContracts,
  collectWrapperContracts,
  generateApiConsumerLedger,
  normalizePath,
  parseJavaScript,
  renderMarkdown,
  staticValue
};
