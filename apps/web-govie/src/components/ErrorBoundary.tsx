// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="nexus-error-page">
          <p className="nexus-error-page__code" aria-hidden="true">!</p>
          <h1 className="nexus-error-page__title">Something went wrong</h1>
          <p className="nexus-error-page__body">
            An unexpected error occurred. Our team has been notified.
          </p>
          {import.meta.env.DEV && this.state.error && (
            <details style={{ textAlign: 'left', maxWidth: 600, margin: '0 auto 24px' }}>
              <summary style={{ cursor: 'pointer', marginBottom: 8 }}>Error details</summary>
              <pre style={{ fontSize: 12, overflowX: 'auto', background: '#f4f4f4', padding: 16 }}>
                {this.state.error.stack}
              </pre>
            </details>
          )}
          <a
            href="/"
            className="nexus-btn nexus-btn--primary"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Return to homepage
          </a>
        </div>
      )
    }

    return this.props.children
  }
}
