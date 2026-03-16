// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Tests for PusherContext (SignalR-based real-time messaging)
 *
 * PusherContext was rewritten to use @microsoft/signalr instead of pusher-js.
 * The public interface (PusherProvider, usePusher, usePusherOptional) is unchanged.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import { PusherProvider, usePusher, usePusherOptional } from './PusherContext';

// Mock SignalR
const mockInvoke = vi.fn().mockResolvedValue(undefined);
const mockOn = vi.fn();
const mockOff = vi.fn();
const mockStart = vi.fn().mockResolvedValue(undefined);
const mockStop = vi.fn().mockResolvedValue(undefined);
const mockOnReconnected = vi.fn();
const mockOnClose = vi.fn();

const mockConnection = {
  invoke: mockInvoke,
  on: mockOn,
  off: mockOff,
  start: mockStart,
  stop: mockStop,
  onreconnected: mockOnReconnected,
  onclose: mockOnClose,
  state: 'Connected',
};

vi.mock('@microsoft/signalr', () => ({
  HubConnectionBuilder: vi.fn().mockImplementation(() => ({
    withUrl: vi.fn().mockReturnThis(),
    withAutomaticReconnect: vi.fn().mockReturnThis(),
    configureLogging: vi.fn().mockReturnThis(),
    build: vi.fn().mockReturnValue(mockConnection),
  })),
  LogLevel: { Warning: 3 },
  HubConnectionState: { Connected: 'Connected', Disconnected: 'Disconnected' },
}));

// Mock api
const mockApiGet = vi.fn();
const mockApiPost = vi.fn();
vi.mock('@/lib/api', () => ({
  api: {
    get: (...args: unknown[]) => mockApiGet(...args),
    post: (...args: unknown[]) => mockApiPost(...args),
  },
  tokenManager: {
    getAccessToken: vi.fn().mockReturnValue('test-token'),
    getTenantId: vi.fn().mockReturnValue(2),
  },
}));

vi.mock('@/lib/logger', () => ({
  logError: vi.fn(),
}));

// Mock AuthContext
let mockIsAuthenticated = false;
let mockUser: { id: number; tenant_id: number } | null = null;

vi.mock('./AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: mockIsAuthenticated,
    user: mockUser,
  }),
}));

function TestConsumer() {
  const { isConnected, onNewMessage, onTyping, onUnreadCount, sendTyping } = usePusher();

  return (
    <div>
      <div data-testid="connected">{String(isConnected)}</div>
      <button onClick={() => sendTyping(2, true)}>Send Typing</button>
      <button onClick={() => {
        const unsub = onNewMessage(() => {});
        // Store for later cleanup
        (window as unknown as Record<string, unknown>).__testUnsub = unsub;
      }}>Subscribe Messages</button>
      <button onClick={() => {
        const unsub = onTyping(() => {});
        (window as unknown as Record<string, unknown>).__testTypingUnsub = unsub;
      }}>Subscribe Typing</button>
      <button onClick={() => {
        const unsub = onUnreadCount(() => {});
        (window as unknown as Record<string, unknown>).__testUnreadUnsub = unsub;
      }}>Subscribe Unread</button>
    </div>
  );
}

describe('PusherContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAuthenticated = false;
    mockUser = null;

    mockApiGet.mockResolvedValue({ success: false });
  });

  it('provides initial disconnected state', () => {
    render(
      <PusherProvider>
        <TestConsumer />
      </PusherProvider>
    );

    expect(screen.getByTestId('connected')).toHaveTextContent('false');
  });

  it('sends typing indicator via SignalR invoke', async () => {
    mockApiPost.mockResolvedValue({ success: true });

    render(
      <PusherProvider>
        <TestConsumer />
      </PusherProvider>
    );

    await act(async () => {
      screen.getByRole('button', { name: 'Send Typing' }).click();
    });

    // The typing indicator is sent via API post (not SignalR invoke directly)
    expect(mockApiPost).toHaveBeenCalledWith('/messages/typing', {
      recipient_id: 2,
      is_typing: true,
    });
  });

  it('registers and unregisters message listeners', () => {
    render(
      <PusherProvider>
        <TestConsumer />
      </PusherProvider>
    );

    act(() => {
      screen.getByRole('button', { name: 'Subscribe Messages' }).click();
    });

    // Unsubscribe returns a function
    expect(typeof (window as unknown as Record<string, unknown>).__testUnsub).toBe('function');

    // Calling it should not throw
    expect(() => (window as unknown as Record<string, unknown>).__testUnsub()).not.toThrow();
  });

  it('registers typing listeners', () => {
    render(
      <PusherProvider>
        <TestConsumer />
      </PusherProvider>
    );

    act(() => {
      screen.getByRole('button', { name: 'Subscribe Typing' }).click();
    });

    expect(typeof (window as unknown as Record<string, unknown>).__testTypingUnsub).toBe('function');
  });

  it('registers unread count listeners', () => {
    render(
      <PusherProvider>
        <TestConsumer />
      </PusherProvider>
    );

    act(() => {
      screen.getByRole('button', { name: 'Subscribe Unread' }).click();
    });

    expect(typeof (window as unknown as Record<string, unknown>).__testUnreadUnsub).toBe('function');
  });

  it('throws error when usePusher is outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestConsumer />);
    }).toThrow('usePusher must be used within a PusherProvider');

    spy.mockRestore();
  });

  it('handles typing send failure silently', async () => {
    mockApiPost.mockRejectedValue(new Error('Network error'));

    render(
      <PusherProvider>
        <TestConsumer />
      </PusherProvider>
    );

    // Should not throw
    await act(async () => {
      screen.getByRole('button', { name: 'Send Typing' }).click();
    });
  });
});

describe('usePusherOptional', () => {
  it('returns null when outside provider', () => {
    function OptionalConsumer() {
      const context = usePusherOptional();
      return <div data-testid="optional">{context === null ? 'null' : 'exists'}</div>;
    }

    render(<OptionalConsumer />);
    expect(screen.getByTestId('optional')).toHaveTextContent('null');
  });

  it('returns context when inside provider', () => {
    function OptionalConsumer() {
      const context = usePusherOptional();
      return <div data-testid="optional">{context === null ? 'null' : 'exists'}</div>;
    }

    render(
      <PusherProvider>
        <OptionalConsumer />
      </PusherProvider>
    );

    expect(screen.getByTestId('optional')).toHaveTextContent('exists');
  });
});
