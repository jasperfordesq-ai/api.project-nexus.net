"use client";

import { useState, useEffect, useCallback } from "react";
import { Button, Input } from "@heroui/react";
import {
  Fingerprint,
  Trash2,
  Plus,
  Pencil,
  Check,
  X,
  Smartphone,
  Monitor,
  Usb,
} from "lucide-react";
import { getToken } from "@/lib/api";
import {
  registerPasskey,
  listPasskeys,
  deletePasskey,
  renamePasskey,
  detectPasskeyCapabilities,
  type PasskeyInfo,
  type PasskeyCapabilities,
} from "@/lib/passkeys";

export function PasskeyManager() {
  const [passkeys, setPasskeys] = useState<PasskeyInfo[]>([]);
  const [capabilities, setCapabilities] = useState<PasskeyCapabilities | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  const loadPasskeys = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const data = await listPasskeys(token);
      setPasskeys(data);
    } catch {
      setError("Failed to load passkeys");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    detectPasskeyCapabilities().then(setCapabilities);
    loadPasskeys();
  }, [loadPasskeys]);

  const handleRegister = async () => {
    const token = getToken();
    if (!token) return;

    setError(null);
    setIsRegistering(true);
    try {
      await registerPasskey(token);
      await loadPasskeys();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Registration failed";
      if (!msg.includes("AbortError") && !msg.includes("not allowed")) {
        setError(msg);
      }
    } finally {
      setIsRegistering(false);
    }
  };

  const handleDelete = async (id: number, name: string | null) => {
    const token = getToken();
    if (!token) return;

    if (!window.confirm(`Delete passkey "${name || "Passkey"}"? This cannot be undone.`)) {
      return;
    }

    setError(null);
    try {
      await deletePasskey(token, id);
      setPasskeys((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete passkey");
    }
  };

  const handleRename = async (id: number) => {
    const token = getToken();
    if (!token || !editName.trim()) return;

    try {
      await renamePasskey(token, id, editName.trim());
      setPasskeys((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, display_name: editName.trim() } : p
        )
      );
      setEditingId(null);
      setEditName("");
    } catch {
      setError("Failed to rename passkey");
    }
  };

  const getTransportIcon = (transports: string | null) => {
    if (!transports) return <Fingerprint className="w-5 h-5" />;
    if (transports.includes("internal"))
      return <Monitor className="w-5 h-5" />;
    if (transports.includes("hybrid"))
      return <Smartphone className="w-5 h-5" />;
    if (transports.includes("usb")) return <Usb className="w-5 h-5" />;
    return <Fingerprint className="w-5 h-5" />;
  };

  if (!capabilities?.webauthnSupported) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Passkeys</h3>
          <p className="text-sm text-white/50">
            Sign in without a password using your device
          </p>
        </div>
        <Button
          onPress={handleRegister}
          isLoading={isRegistering}
          isDisabled={passkeys.length >= 10}
          size="sm"
          className="bg-indigo-500 text-white"
          startContent={!isRegistering && <Plus className="w-4 h-4" />}
        >
          {passkeys.length >= 10 ? "Limit reached" : "Add passkey"}
        </Button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
          {error}
        </div>
      )}

      {isLoading ? (
        <p className="text-white/40 text-sm">Loading passkeys...</p>
      ) : passkeys.length === 0 ? (
        <div className="p-6 rounded-xl bg-white/5 border border-white/10 text-center">
          <Fingerprint className="w-8 h-8 text-white/20 mx-auto mb-3" />
          <p className="text-white/40 text-sm">
            No passkeys registered yet. Add one to sign in faster.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {passkeys.map((passkey) => (
            <div
              key={passkey.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10"
            >
              <div className="text-white/40">
                {getTransportIcon(passkey.transports)}
              </div>

              <div className="flex-1 min-w-0">
                {editingId === passkey.id ? (
                  <div className="flex items-center gap-2">
                    <Input
                      size="sm"
                      value={editName}
                      onValueChange={setEditName}
                      placeholder="Passkey name"
                      classNames={{
                        input: "text-white text-sm",
                        inputWrapper: "bg-white/10 border-white/20 h-8",
                      }}
                    />
                    <button
                      onClick={() => handleRename(passkey.id)}
                      className="text-green-400 hover:text-green-300"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-white/40 hover:text-white/60"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-white truncate">
                      {passkey.display_name || "Passkey"}
                    </p>
                    <p className="text-xs text-white/30">
                      Added{" "}
                      {new Date(passkey.created_at).toLocaleDateString()}
                      {passkey.last_used_at &&
                        ` · Last used ${new Date(passkey.last_used_at).toLocaleDateString()}`}
                    </p>
                  </>
                )}
              </div>

              {editingId !== passkey.id && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingId(passkey.id);
                      setEditName(passkey.display_name || "");
                    }}
                    className="p-1.5 text-white/30 hover:text-white/60 transition-colors"
                    aria-label="Rename passkey"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(passkey.id, passkey.display_name)}
                    className="p-1.5 text-white/30 hover:text-red-400 transition-colors"
                    aria-label="Delete passkey"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
