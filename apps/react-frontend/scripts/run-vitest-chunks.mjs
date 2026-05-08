// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { spawn, spawnSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const srcDir = join(root, 'src');
const vitestBin = join(root, 'node_modules', 'vitest', 'vitest.mjs');
const chunkSize = Number.parseInt(process.env.VITEST_CHUNK_SIZE || '5', 10);
const chunkTimeoutMs = Number.parseInt(process.env.VITEST_CHUNK_TIMEOUT_MS || '300000', 10);
const startChunk = Math.max(Number.parseInt(process.env.VITEST_START_CHUNK || '1', 10), 1);

function collectTests(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist' || entry === 'coverage') continue;
      collectTests(fullPath, files);
      continue;
    }

    if (/\.(test|spec)\.(js|jsx|ts|tsx)$/.test(entry)) {
      files.push(relative(root, fullPath).replaceAll('\\', '/'));
    }
  }

  return files;
}

const tests = collectTests(srcDir).sort();

if (tests.length === 0) {
  console.log('[vitest-chunks] No test files found.');
  process.exit(0);
}

console.log(`[vitest-chunks] Running ${tests.length} test files in chunks of ${chunkSize}.`);
if (startChunk > 1) {
  console.log(`[vitest-chunks] Skipping to chunk ${startChunk} because VITEST_START_CHUNK is set.`);
}

function killProcessTree(pid) {
  if (!pid) return;

  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(pid), '/f', '/t'], { stdio: 'ignore' });
    return;
  }

  try {
    process.kill(-pid, 'SIGKILL');
  } catch {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      // Process already exited.
    }
  }
}

function runVitestChunk(args, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, {
      cwd: root,
      env: {
        ...process.env,
        CI: process.env.CI || 'true',
        NODE_OPTIONS: process.env.NODE_OPTIONS || '--max-old-space-size=6144',
      },
      stdio: 'inherit',
      detached: process.platform !== 'win32',
    });

    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      killProcessTree(child.pid);
    }, timeoutMs);

    child.on('error', (error) => {
      clearTimeout(timer);
      resolve({ status: 1, error, timedOut });
    });

    child.on('exit', (status, signal) => {
      clearTimeout(timer);
      resolve({ status, signal, timedOut });
    });
  });
}

for (let start = (startChunk - 1) * chunkSize; start < tests.length; start += chunkSize) {
  const chunk = tests.slice(start, start + chunkSize);
  const chunkNumber = Math.floor(start / chunkSize) + 1;
  const chunkCount = Math.ceil(tests.length / chunkSize);

  console.log(`[vitest-chunks] Chunk ${chunkNumber}/${chunkCount}: ${chunk[0]} ... ${chunk.at(-1)}`);

  const result = await runVitestChunk([vitestBin, 'run', '--reporter=dot', ...chunk], chunkTimeoutMs);

  if (result.error) {
    console.error(`[vitest-chunks] Failed to start Vitest: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    if (result.timedOut || result.signal) {
      console.error(`[vitest-chunks] Chunk ${chunkNumber}/${chunkCount} stopped by ${result.timedOut ? 'timeout' : `signal ${result.signal}`}. Timeout: ${chunkTimeoutMs}ms.`);
    }
    console.error(`[vitest-chunks] Chunk ${chunkNumber}/${chunkCount} failed.`);
    process.exit(result.status || 1);
  }
}

console.log('[vitest-chunks] All chunks passed.');
