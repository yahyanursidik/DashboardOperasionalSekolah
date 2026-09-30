import React from "react";
import { Link, useLocation } from "react-router";
import { Compass } from "lucide-react";

const portalHomes: Array<{ prefix: string; href: string; label: string }> = [
  { prefix: "/portal", href: "/portal", label: "Portal Orang Tua" },
  { prefix: "/teacher", href: "/teacher", label: "Portal Guru" },
  { prefix: "/staff", href: "/staff", label: "Portal Staf" },
  { prefix: "/bendahara", href: "/bendahara", label: "Portal Bendahara" },
  { prefix: "/hrd", href: "/hrd", label: "Portal HRD" },
  { prefix: "/admin-spmb", href: "/admin-spmb", label: "Portal Admin SPMB" },
  { prefix: "/spmb", href: "/spmb", label: "Portal SPMB" },
  { prefix: "/ekskul-portal", href: "/ekskul-portal", label: "Portal Ekstrakurikuler" },
  { prefix: "/cbt", href: "/cbt", label: "Portal Ujian CBT" },
];

export const NotFoundPage: React.FC = () => {
  const { pathname } = useLocation();
  const home = portalHomes.find((item) => pathname === item.prefix || pathname.startsWith(`${item.prefix}/`))
    || { href: "/", label: "Beranda Admin" };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-5">
      <section className="w-full max-w-md rounded-xl border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <Compass className="h-7 w-7 text-muted-foreground" />
        </div>
        <p className="text-sm font-semibold text-muted-foreground">404</p>
        <h1 className="mt-1 text-xl font-bold text-foreground">Halaman tidak ditemukan</h1>
        <p className="mt-2 break-all text-sm text-muted-foreground">
          Alamat <code className="rounded bg-muted px-1">{pathname}</code> tidak tersedia atau sudah dipindahkan.
        </p>
        <Link
          to={home.href}
          className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground"
        >
          Kembali ke {home.label}
        </Link>
      </section>
    </main>
  );
};
