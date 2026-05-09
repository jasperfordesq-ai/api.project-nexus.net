// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { Link, useSearchParams } from 'react-router-dom';
import { Button, Chip } from '@heroui/react';
import { AlertTriangle, CheckCircle2, KeyRound, LogIn, Settings } from 'lucide-react';
import { GlassCard } from '@/components/ui';
import { useAuth, useTenant } from '@/contexts';
import { usePageTitle } from '@/hooks';

export function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const { branding, tenantPath } = useTenant();
  const error = searchParams.get('error') || searchParams.get('error_description');
  const provider = searchParams.get('provider') || searchParams.get('state') || 'identity provider';

  usePageTitle(error ? 'Connection issue' : 'Connection received');

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <GlassCard className="w-full max-w-md p-6 sm:p-8">
        <div className="text-center">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5 ${
            error ? 'bg-red-500/15' : 'bg-emerald-500/15'
          }`}>
            {error ? (
              <AlertTriangle className="w-8 h-8 text-red-500" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="w-8 h-8 text-emerald-500" aria-hidden="true" />
            )}
          </div>

          <Chip size="sm" variant="flat" className="bg-theme-elevated text-theme-muted mb-3">
            OAuth callback
          </Chip>
          <h1 className="text-2xl font-bold text-theme-primary">
            {error ? 'Connection could not be completed' : 'Connection callback received'}
          </h1>
          <p className="text-theme-muted mt-3">
            {error
              ? 'The provider returned an error. You can retry from account settings or sign in again.'
              : `The ${provider} response reached Project NEXUS. Continue to your account to finish or review the connection.`}
          </p>
        </div>

        {error && (
          <div className="mt-5 rounded-lg border border-red-500/20 bg-red-500/10 p-3">
            <p className="text-sm text-red-600 dark:text-red-400 break-words">{error}</p>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3">
          {isAuthenticated ? (
            <Link to={tenantPath('/settings?tab=security')}>
              <Button
                className="w-full bg-gradient-to-r from-indigo-500 to-sky-600 text-white"
                startContent={<Settings className="w-4 h-4" aria-hidden="true" />}
              >
                Account settings
              </Button>
            </Link>
          ) : (
            <Link to={tenantPath('/login')}>
              <Button
                className="w-full bg-gradient-to-r from-indigo-500 to-sky-600 text-white"
                startContent={<LogIn className="w-4 h-4" aria-hidden="true" />}
              >
                Sign in
              </Button>
            </Link>
          )}
          <Link to={tenantPath('/verify-identity')}>
            <Button
              variant="flat"
              className="w-full bg-theme-elevated text-theme-primary"
              startContent={<KeyRound className="w-4 h-4" aria-hidden="true" />}
            >
              Identity verification
            </Button>
          </Link>
        </div>

        <p className="text-center text-theme-subtle text-sm mt-6">{branding.name}</p>
      </GlassCard>
    </div>
  );
}

export default AuthCallbackPage;
