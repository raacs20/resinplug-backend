"use client";

import "./globals.css";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { AdminAuthProvider, useAdminAuth } from "./components/AdminAuthProvider";

/* ── Sidebar nav items ── */
const NAV = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/products", label: "Products", icon: "📦" },
  { href: "/admin/orders", label: "Orders", icon: "🛒" },
  { href: "/admin/coupons", label: "Coupons", icon: "🎟️" },
  { href: "/admin/reviews", label: "Reviews", icon: "⭐" },
  { href: "/admin/customers", label: "Customers", icon: "👥" },
  { href: "/admin/settings", label: "Settings", icon: "⚙️" },
];

function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading, logout } = useAdminAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Login page has no sidebar
  if (pathname === "/admin/login") {
    return <div className="min-h-screen bg-gray-950 text-white">{children}</div>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-gray-900 border-r border-gray-800 flex flex-col transform transition-transform lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-5 border-b border-gray-800">
          <h1 className="text-xl font-bold text-orange-500">ResinPlug</h1>
          <p className="text-xs text-gray-400 mt-1">Admin Dashboard</p>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV.map((item) => {
            const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${active ? "bg-orange-500/15 text-orange-400" : "text-gray-400 hover:bg-gray-800 hover:text-white"}`}>
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-800">
          <div className="text-sm text-gray-400 mb-2 truncate">{user?.email}</div>
          <button onClick={logout} className="w-full text-sm text-red-400 hover:text-red-300 text-left">Sign Out</button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-gray-800 flex items-center px-4 lg:px-6 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden mr-3 text-gray-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h2 className="text-sm font-medium text-gray-300 capitalize">
            {pathname === "/admin" ? "Dashboard" : pathname.split("/").pop()?.replace(/-/g, " ")}
          </h2>
        </header>
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthProvider>
      <AdminShell>{children}</AdminShell>
    </AdminAuthProvider>
  );
}
