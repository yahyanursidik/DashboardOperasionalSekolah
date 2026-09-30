import React from "react";
import { Link, useLocation } from "react-router";
import { Loader2, LogOut, RefreshCw, ShieldAlert } from "lucide-react";
import { useLogout } from "@/lib/refine-compat";
import { useCurrentRoles } from "../../hooks/useAuth";
import { canAccessResource, hasAdminPanelAccess } from "../../lib/permissions";
import { getRouteResource } from "../../config/route-access";

const portalLinks = [
  { href: "/portal", label: "Portal Orang Tua" },
  { href: "/teacher", label: "Portal Guru" },
  { href: "/staff", label: "Portal Staf" },
  { href: "/spmb", label: "Portal SPMB" },
];

/** Blocks the whole admin panel for accounts that hold no staff role (parents, SPMB, ekskul sign-ups). */
export const AdminPanelGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { roles, isLoading } = useCurrentRoles();
  const { mutate: logout } = useLogout();

  if (isLoading && !roles) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (hasAdminPanelAccess(roles)) return <>{children}</>;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-5">
      <section className="w-full max-w-md rounded-xl border bg-card p-8 text-center shadow-sm">
        <ShieldAlert className="mx-auto h-10 w-10 text-amber-600" />
        <h1 className="mt-4 text-xl font-bold text-foreground">Akun tidak memiliki akses panel admin</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Akun ini tidak memiliki peran pengelola sekolah. Gunakan portal yang sesuai, atau hubungi administrator bila Anda seharusnya memiliki akses.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          {portalLinks.map((item) => (
            <Link key={item.href} to={item.href} className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted">
              {item.label}
            </Link>
          ))}
        </div>
        <div className="mt-4 flex justify-center gap-2">
          <button type="button" onClick={() => window.location.reload()} className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
            <RefreshCw className="h-4 w-4" /> Muat ulang
          </button>
          <button type="button" onClick={() => logout()} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            <LogOut className="h-4 w-4" /> Keluar
          </button>
        </div>
      </section>
    </main>
  );
};

/** Enforces the same resource rules as the sidebar for pages opened directly by URL. */
export const AdminRouteGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { pathname } = useLocation();
  const { roles } = useCurrentRoles();
  const resource = getRouteResource(pathname);

  if (!resource || canAccessResource(roles, resource)) return <>{children}</>;

  return (
    <div className="flex flex-1 items-center justify-center py-16">
      <section className="w-full max-w-md rounded-xl border bg-card p-8 text-center shadow-sm">
        <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
        <p className="mt-3 text-sm font-semibold text-muted-foreground">403</p>
        <h1 className="mt-1 text-xl font-bold text-foreground">Akses ditolak</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Peran Anda tidak memiliki izin untuk membuka halaman ini. Hubungi administrator bila Anda memerlukan akses.
        </p>
        <Link to="/" className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground">
          Kembali ke Beranda
        </Link>
      </section>
    </div>
  );
};
