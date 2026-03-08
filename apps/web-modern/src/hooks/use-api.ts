"use client";

import { useState, useEffect, useCallback } from "react";

interface UseApiOptions<T> {
  immediate?: boolean;
  initialData?: T;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

interface UseApiReturn<T> {
  data: T | undefined;
  isLoading: boolean;
  error: Error | null;
  execute: () => Promise<T | undefined>;
  reset: () => void;
}

export function useApi<T>(
  fetcher: () => Promise<T>,
  options: UseApiOptions<T> = {}
): UseApiReturn<T> {
  const { immediate = true, initialData, onSuccess, onError } = options;

  const [data, setData] = useState<T | undefined>(initialData);
  const [isLoading, setIsLoading] = useState(immediate);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetcher();
      setData(result);
      onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error");
      setError(error);
      onError?.(error);
      return undefined;
    } finally {
      setIsLoading(false);
    }
  }, [fetcher, onSuccess, onError]);

  const reset = useCallback(() => {
    setData(initialData);
    setError(null);
    setIsLoading(false);
  }, [initialData]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate, execute]);

  return { data, isLoading, error, execute, reset };
}

// Mutation hook for POST/PUT/DELETE operations
interface UseMutationOptions<T, V> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

interface UseMutationReturn<T, V> {
  data: T | undefined;
  isLoading: boolean;
  error: Error | null;
  mutate: (variables: V) => Promise<T | undefined>;
  reset: () => void;
}

export function useMutation<T, V = void>(
  mutator: (variables: V) => Promise<T>,
  options: UseMutationOptions<T, V> = {}
): UseMutationReturn<T, V> {
  const { onSuccess, onError } = options;

  const [data, setData] = useState<T | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(
    async (variables: V) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await mutator(variables);
        setData(result);
        onSuccess?.(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        setError(error);
        onError?.(error);
        return undefined;
      } finally {
        setIsLoading(false);
      }
    },
    [mutator, onSuccess, onError]
  );

  const reset = useCallback(() => {
    setData(undefined);
    setError(null);
    setIsLoading(false);
  }, []);

  return { data, isLoading, error, mutate, reset };
}
