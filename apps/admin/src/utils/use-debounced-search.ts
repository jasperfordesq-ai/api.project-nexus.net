// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useCallback, useEffect, useRef } from "react";

/**
 * Returns a debounced search callback and an immediate-search handler.
 * Used by admin list pages that have Input.Search with both onChange (debounced)
 * and onSearch (immediate) behaviour.
 */
export function useDebouncedSearch(
  onSearch: (value: string) => void,
  delay = 300,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear any pending timer on unmount to avoid calling setState on an unmounted component
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const debounced = useCallback(
    (value: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onSearch(value), delay);
    },
    [onSearch, delay],
  );

  const immediate = useCallback(
    (value: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      onSearch(value);
    },
    [onSearch],
  );

  return { debounced, immediate };
}
