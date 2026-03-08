"use client";

import { useEffect } from "react";
import { Button } from "@heroui/react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";
import { logger } from "@/lib/logger";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error - logger handles dev/prod distinction
    logger.error("Application error:", error);

    // In production, you could send this to an error reporting service
    // e.g., Sentry, LogRocket, etc.
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-red-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 max-w-lg w-full text-center relative">
        <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-10 h-10 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">
          Something went wrong
        </h1>
        <p className="text-white/60 mb-6">
          We encountered an unexpected error. Please try again or return to the home page.
        </p>
        {process.env.NODE_ENV === "development" && error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-left overflow-auto max-h-40">
            <p className="text-xs text-red-400 font-mono whitespace-pre-wrap">
              {error.message}
              {error.digest && (
                <>
                  {"\n\n"}Error ID: {error.digest}
                </>
              )}
            </p>
          </div>
        )}
        <div className="flex gap-3 justify-center">
          <Button
            onPress={reset}
            variant="flat"
            className="bg-white/10 text-white hover:bg-white/20"
            startContent={<RefreshCw className="w-4 h-4" />}
          >
            Try Again
          </Button>
          <Link href="/">
            <Button
              className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
              startContent={<Home className="w-4 h-4" />}
            >
              Go Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
