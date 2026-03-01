"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AdminAuthContextType {
  user: AdminUser | null;
  loading: boolean;
  logout: () => void;
}

const AdminAuthCtx = createContext<AdminAuthContextType>({
  user: null,
  loading: true,
  logout: () => {},
});

export function useAdminAuth() {
  return useContext(AdminAuthCtx);
}

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) throw new Error("Not authenticated");
        const data = await r.json();
        if (data.data?.role !== "admin") throw new Error("Not admin");
        setUser(data.data);
      })
      .catch(() => {
        if (pathname !== "/admin/login") router.push("/admin/login");
      })
      .finally(() => setLoading(false));
  }, [pathname, router]);

  const logout = async () => {
    await fetch("/api/auth/signout", { method: "POST", credentials: "include" });
    setUser(null);
    router.push("/admin/login");
  };

  return (
    <AdminAuthCtx.Provider value={{ user, loading, logout }}>
      {children}
    </AdminAuthCtx.Provider>
  );
}
