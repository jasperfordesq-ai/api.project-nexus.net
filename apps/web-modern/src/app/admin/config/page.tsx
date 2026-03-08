"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Input,
  Spinner,
  Switch,
  Card,
  CardBody,
  CardHeader,
  Divider,
} from "@heroui/react";
import {
  Settings,
  ChevronLeft,
  AlertCircle,
  Save,
  Palette,
  Bell,
  Shield,
  Globe,
} from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { AdminProtectedRoute } from "@/components/admin-protected-route";
import { GlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api, type TenantConfig } from "@/lib/api";

export default function AdminConfigPage() {
  return (
    <AdminProtectedRoute>
      <AdminConfigContent />
    </AdminProtectedRoute>
  );
}

interface ConfigSection {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  fields: ConfigField[];
}

interface ConfigField {
  key: string;
  label: string;
  type: "text" | "boolean" | "number" | "color";
  description?: string;
}

const CONFIG_SECTIONS: ConfigSection[] = [
  {
    key: "branding",
    label: "Branding",
    description: "Customize the look and feel",
    icon: <Palette className="w-5 h-5" />,
    fields: [
      { key: "site_name", label: "Site Name", type: "text", description: "The name displayed in the header" },
      { key: "primary_color", label: "Primary Color", type: "color", description: "Main brand color" },
      { key: "logo_url", label: "Logo URL", type: "text", description: "URL to your logo image" },
    ],
  },
  {
    key: "features",
    label: "Features",
    description: "Enable or disable features",
    icon: <Globe className="w-5 h-5" />,
    fields: [
      { key: "enable_messaging", label: "Messaging", type: "boolean", description: "Allow users to send messages" },
      { key: "enable_groups", label: "Groups", type: "boolean", description: "Allow community groups" },
      { key: "enable_events", label: "Events", type: "boolean", description: "Allow event creation" },
      { key: "enable_gamification", label: "Gamification", type: "boolean", description: "Enable XP and badges" },
    ],
  },
  {
    key: "moderation",
    label: "Moderation",
    description: "Content moderation settings",
    icon: <Shield className="w-5 h-5" />,
    fields: [
      { key: "require_listing_approval", label: "Require Listing Approval", type: "boolean", description: "New listings require admin approval" },
      { key: "auto_approve_trusted", label: "Auto-approve Trusted Users", type: "boolean", description: "Skip approval for established users" },
    ],
  },
  {
    key: "notifications",
    label: "Notifications",
    description: "Notification preferences",
    icon: <Bell className="w-5 h-5" />,
    fields: [
      { key: "email_notifications", label: "Email Notifications", type: "boolean", description: "Send email notifications" },
      { key: "digest_frequency", label: "Digest Frequency", type: "text", description: "daily, weekly, or never" },
    ],
  },
];

function AdminConfigContent() {
  const { user, logout } = useAuth();
  const [config, setConfig] = useState<Record<string, string>>({});
  const [originalConfig, setOriginalConfig] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchConfig = async () => {
    setIsLoading(true);
    try {
      const response = await api.adminGetConfig();
      const configMap: Record<string, string> = {};
      response.data.forEach((item: TenantConfig) => {
        configMap[item.key] = item.value;
      });
      setConfig(configMap);
      setOriginalConfig(configMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load configuration");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleChange = (key: string, value: string | boolean) => {
    setConfig((prev) => ({
      ...prev,
      [key]: typeof value === "boolean" ? String(value) : value,
    }));
    setSuccessMessage(null);
  };

  const hasChanges = () => {
    return JSON.stringify(config) !== JSON.stringify(originalConfig);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      // Convert config object to array of key-value pairs
      const configItems = Object.entries(config).map(([key, value]) => ({
        key,
        value,
      }));
      await api.adminUpdateConfig(configItems);
      setOriginalConfig({ ...config });
      setSuccessMessage("Configuration saved successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save configuration");
    } finally {
      setIsSaving(false);
    }
  };

  const renderField = (field: ConfigField) => {
    const value = config[field.key] || "";

    switch (field.type) {
      case "boolean":
        return (
          <div key={field.key} className="flex items-center justify-between py-3">
            <div>
              <p className="text-white font-medium">{field.label}</p>
              {field.description && (
                <p className="text-white/50 text-sm">{field.description}</p>
              )}
            </div>
            <Switch
              isSelected={value === "true"}
              onValueChange={(checked) => handleChange(field.key, checked)}
            />
          </div>
        );

      case "color":
        return (
          <div key={field.key} className="py-3">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Input
                  label={field.label}
                  placeholder="#6366f1"
                  value={value}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  description={field.description}
                  classNames={{
                    input: "text-white",
                    inputWrapper: "bg-white/5 border-white/10",
                  }}
                />
              </div>
              <div
                className="w-10 h-10 rounded-lg border border-white/20"
                style={{ backgroundColor: value || "#6366f1" }}
              />
            </div>
          </div>
        );

      default:
        return (
          <div key={field.key} className="py-3">
            <Input
              label={field.label}
              placeholder={`Enter ${field.label.toLowerCase()}`}
              value={value}
              onChange={(e) => handleChange(field.key, e.target.value)}
              description={field.description}
              classNames={{
                input: "text-white",
                inputWrapper: "bg-white/5 border-white/10",
              }}
            />
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar user={user} onLogout={logout} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button isIconOnly variant="ghost" size="sm">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <Settings className="w-8 h-8 text-cyan-400" />
                <h1 className="text-3xl font-bold text-white">Configuration</h1>
              </div>
              <p className="text-white/50 mt-1">Manage tenant settings</p>
            </div>
          </div>
          <Button
            color="primary"
            startContent={<Save className="w-4 h-4" />}
            onPress={handleSave}
            isLoading={isSaving}
            isDisabled={!hasChanges()}
          >
            Save Changes
          </Button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-red-400">{error}</p>
            <Button size="sm" variant="light" onPress={() => setError(null)}>
              Dismiss
            </Button>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-3">
            <Save className="w-5 h-5 text-green-400" />
            <p className="text-green-400">{successMessage}</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="space-y-6">
            {CONFIG_SECTIONS.map((section) => (
              <GlassCard key={section.key}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-white/10 rounded-lg text-white">
                    {section.icon}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">{section.label}</h2>
                    <p className="text-white/50 text-sm">{section.description}</p>
                  </div>
                </div>
                <Divider className="bg-white/10 my-4" />
                <div className="space-y-2">
                  {section.fields.map((field) => renderField(field))}
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
