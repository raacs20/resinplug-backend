"use client";

import { useEffect, useState } from "react";

const SETTINGS_CONFIG = [
  { key: "announcementBar", label: "Announcement Bar Text", type: "text", placeholder: "THE ABSOLUTE CHEAPEST RESIN IN USA! • FREE DELIVERY FROM $XX" },
  { key: "announcementBarEnabled", label: "Announcement Bar Enabled", type: "toggle" },
  { key: "freeShippingThreshold", label: "Free Shipping Threshold ($)", type: "number", placeholder: "200" },
  { key: "siteTitle", label: "Site Title", type: "text", placeholder: "ResinPlug" },
  { key: "siteDescription", label: "Site Description", type: "text", placeholder: "The Absolute Cheapest Resin in the USA" },
  { key: "featuredCollection", label: "Featured Collection (homepage)", type: "text", placeholder: "Bestsellers" },
  { key: "maintenanceMode", label: "Maintenance Mode", type: "toggle" },
];

export default function AdminSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setSettings(data.data || {}))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/admin/settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-gray-400">Loading settings...</div>;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Site Settings</h1>
        {saved && <span className="text-green-400 text-sm">✓ Saved!</span>}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
        {SETTINGS_CONFIG.map((config) => (
          <div key={config.key}>
            <label className="block text-sm text-gray-400 mb-1.5">{config.label}</label>
            {config.type === "toggle" ? (
              <button
                onClick={() => setSettings({ ...settings, [config.key]: settings[config.key] === "true" ? "false" : "true" })}
                className={`w-12 h-6 rounded-full transition-colors ${settings[config.key] === "true" ? "bg-green-500" : "bg-gray-700"}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transform transition-transform ${settings[config.key] === "true" ? "translate-x-6" : "translate-x-0.5"}`} />
              </button>
            ) : (
              <input
                type={config.type === "number" ? "number" : "text"}
                value={settings[config.key] || ""}
                onChange={(e) => setSettings({ ...settings, [config.key]: e.target.value })}
                placeholder={config.placeholder}
                className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500"
              />
            )}
          </div>
        ))}

        <div className="pt-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
