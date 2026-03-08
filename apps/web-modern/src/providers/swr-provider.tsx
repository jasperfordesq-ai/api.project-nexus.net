"use client";

import { SWRConfig } from "swr";
import { type ReactNode } from "react";
import { logger } from "@/lib/logger";

interface SWRProviderProps {
  children: ReactNode;
}

export function SWRProvider({ children }: SWRProviderProps) {
  return (
    <SWRConfig
      value={{
        // Global configuration
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        dedupingInterval: 2000,
        errorRetryCount: 3,
        errorRetryInterval: 5000,
        loadingTimeout: 10000,

        // Global error handler
        onError: (error, key) => {
          logger.error(`SWR Error [${key}]:`, error);
        },
      }}
    >
      {children}
    </SWRConfig>
  );
}
