"use client";

import { Button } from "@heroui/react";
import { FileQuestion, Home, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 max-w-lg w-full text-center relative">
        <div className="w-20 h-20 rounded-full bg-indigo-500/20 flex items-center justify-center mx-auto mb-6">
          <FileQuestion className="w-10 h-10 text-indigo-400" />
        </div>
        <h1 className="text-6xl font-bold text-white mb-2">404</h1>
        <h2 className="text-xl font-semibold text-white mb-2">Page Not Found</h2>
        <p className="text-white/60 mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="javascript:history.back()">
            <Button
              variant="flat"
              className="bg-white/10 text-white hover:bg-white/20"
              startContent={<ArrowLeft className="w-4 h-4" />}
            >
              Go Back
            </Button>
          </Link>
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
