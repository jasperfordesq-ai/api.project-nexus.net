"use client";

import { HeroUIProvider } from "@heroui/react";
import { useRouter } from "next/navigation";
import { AuthProvider } from "@/contexts/auth-context";
import { SWRProvider } from "./swr-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <HeroUIProvider navigate={router.push}>
      <SWRProvider>
        <AuthProvider>{children}</AuthProvider>
      </SWRProvider>
    </HeroUIProvider>
  );
}
