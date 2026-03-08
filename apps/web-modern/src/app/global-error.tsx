"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { logger } from "@/lib/logger";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error - logger handles dev/prod distinction
    logger.error("Global application error:", error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body
        style={{
          background: "#0a0a0f",
          color: "#ededed",
          fontFamily: "Inter, system-ui, -apple-system, sans-serif",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
        }}
      >
        {/* Background decorations */}
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "24rem",
            height: "24rem",
            background: "rgba(239, 68, 68, 0.1)",
            borderRadius: "9999px",
            filter: "blur(64px)",
            transform: "translate(-50%, -50%)",
          }}
        />
        <div
          style={{
            position: "fixed",
            bottom: 0,
            right: 0,
            width: "24rem",
            height: "24rem",
            background: "rgba(249, 115, 22, 0.1)",
            borderRadius: "9999px",
            filter: "blur(64px)",
            transform: "translate(50%, 50%)",
          }}
        />

        <div
          style={{
            background: "rgba(255, 255, 255, 0.05)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "1rem",
            padding: "2rem",
            maxWidth: "32rem",
            width: "100%",
            textAlign: "center",
            position: "relative",
          }}
        >
          <div
            style={{
              width: "5rem",
              height: "5rem",
              borderRadius: "9999px",
              background: "rgba(239, 68, 68, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.5rem",
            }}
          >
            <AlertTriangle
              style={{ width: "2.5rem", height: "2.5rem", color: "#f87171" }}
            />
          </div>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: "bold",
              color: "white",
              marginBottom: "0.5rem",
            }}
          >
            Critical Error
          </h1>
          <p
            style={{
              color: "rgba(255, 255, 255, 0.6)",
              marginBottom: "1.5rem",
            }}
          >
            A critical error occurred. Please refresh the page or try again later.
          </p>
          {process.env.NODE_ENV === "development" && error && (
            <div
              style={{
                marginBottom: "1.5rem",
                padding: "1rem",
                borderRadius: "0.5rem",
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                textAlign: "left",
                overflow: "auto",
                maxHeight: "10rem",
              }}
            >
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "#f87171",
                  fontFamily: "monospace",
                  whiteSpace: "pre-wrap",
                }}
              >
                {error.message}
                {error.digest && (
                  <>
                    {"\n\n"}Error ID: {error.digest}
                  </>
                )}
              </p>
            </div>
          )}
          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              justifyContent: "center",
            }}
          >
            <button
              onClick={reset}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.75rem 1.5rem",
                borderRadius: "0.5rem",
                background: "rgba(255, 255, 255, 0.1)",
                border: "none",
                color: "white",
                cursor: "pointer",
                fontWeight: "500",
                fontSize: "0.875rem",
              }}
            >
              <RefreshCw style={{ width: "1rem", height: "1rem" }} />
              Try Again
            </button>
            <a
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.75rem 1.5rem",
                borderRadius: "0.5rem",
                background: "linear-gradient(to right, #6366f1, #a855f7)",
                border: "none",
                color: "white",
                cursor: "pointer",
                fontWeight: "500",
                fontSize: "0.875rem",
                textDecoration: "none",
              }}
            >
              <Home style={{ width: "1rem", height: "1rem" }} />
              Go Home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
