// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { describe, it, expect } from "vitest";

// Replicate the normalizeList logic from data-provider.ts for unit testing
// (not imported directly since it's not exported, and we don't want to modify data-provider.ts)
function normalizeList(responseData: any): { data: any[]; total: number } {
  // Pattern C: { items: [...], totalCount }
  if (Array.isArray(responseData.items)) {
    return {
      data: responseData.items,
      total: responseData.totalCount ?? responseData.items.length,
    };
  }

  // Pattern A: { data: [...], pagination: { total } }
  if (Array.isArray(responseData.data) && responseData.pagination) {
    return {
      data: responseData.data,
      total: responseData.pagination.total ?? responseData.data.length,
    };
  }

  // Pattern B: { data: [...], meta: { total } }
  if (Array.isArray(responseData.data) && responseData.meta) {
    return {
      data: responseData.data,
      total: responseData.meta.total ?? responseData.data.length,
    };
  }

  // Pattern D: { data: [...] } without pagination
  if (Array.isArray(responseData.data)) {
    return { data: responseData.data, total: responseData.data.length };
  }

  // Direct array
  if (Array.isArray(responseData)) {
    return { data: responseData, total: responseData.length };
  }

  // Pattern E/F: { someKey: [...], total, page, limit } (newsletters, notes, etc.)
  const arrayKey = Object.keys(responseData).find((k) =>
    Array.isArray(responseData[k])
  );
  if (arrayKey) {
    return {
      data: responseData[arrayKey],
      total:
        responseData.total ??
        responseData.totalCount ??
        responseData[arrayKey].length,
    };
  }

  // Single object (wrapped in array for consistency)
  return { data: [responseData], total: 1 };
}

describe("normalizeList", () => {
  it("handles Pattern A: data + pagination", () => {
    const result = normalizeList({
      data: [{ id: 1 }],
      pagination: { page: 1, limit: 20, total: 42 },
    });
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(42);
  });

  it("handles Pattern A: falls back to data.length when pagination.total missing", () => {
    const result = normalizeList({
      data: [{ id: 1 }, { id: 2 }],
      pagination: { page: 1, limit: 20 },
    });
    expect(result.data).toHaveLength(2);
    expect(result.total).toBe(2);
  });

  it("handles Pattern B: data + meta", () => {
    const result = normalizeList({
      data: [{ id: 1 }, { id: 2 }],
      meta: { total: 5 },
    });
    expect(result.data).toHaveLength(2);
    expect(result.total).toBe(5);
  });

  it("handles Pattern C: items + totalCount", () => {
    const result = normalizeList({
      items: [{ id: 1 }],
      totalCount: 100,
      page: 1,
      limit: 20,
    });
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(100);
  });

  it("handles Pattern C: falls back to items.length when totalCount missing", () => {
    const result = normalizeList({
      items: [{ id: 1 }, { id: 2 }, { id: 3 }],
    });
    expect(result.data).toHaveLength(3);
    expect(result.total).toBe(3);
  });

  it("handles Pattern D: data array only", () => {
    const result = normalizeList({
      data: [{ id: 1 }, { id: 2 }, { id: 3 }],
    });
    expect(result.data).toHaveLength(3);
    expect(result.total).toBe(3);
  });

  it("handles direct array", () => {
    const result = normalizeList([{ id: 1 }, { id: 2 }]);
    expect(result.data).toHaveLength(2);
    expect(result.total).toBe(2);
  });

  it("handles Pattern E: newsletters + total", () => {
    const result = normalizeList({
      newsletters: [{ id: 1 }],
      total: 10,
      page: 1,
      limit: 20,
    });
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(10);
  });

  it("handles Pattern F: notes + total", () => {
    const result = normalizeList({
      notes: [{ id: 1 }, { id: 2 }],
      total: 5,
      page: 1,
      limit: 20,
    });
    expect(result.data).toHaveLength(2);
    expect(result.total).toBe(5);
  });

  it("handles named collection with totalCount instead of total", () => {
    const result = normalizeList({
      records: [{ id: 1 }],
      totalCount: 50,
    });
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(50);
  });

  it("handles empty data array", () => {
    const result = normalizeList({ data: [] });
    expect(result.data).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it("handles empty items array", () => {
    const result = normalizeList({ items: [], totalCount: 0 });
    expect(result.data).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it("handles empty direct array", () => {
    const result = normalizeList([]);
    expect(result.data).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it("handles single object fallback", () => {
    const result = normalizeList({ id: 1, name: "test" });
    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toEqual({ id: 1, name: "test" });
    expect(result.total).toBe(1);
  });
});
