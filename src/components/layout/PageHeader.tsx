import React from "react";
import { useLocation, Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

const breadcrumbLabels: Record<string, string> = {
  schedules: "Jadwal Pelajaran & Kerja",
  patterns: "Pola Jadwal Unit",
  create: "Tambah",
  edit: "Ubah",
  show: "Detail",
};

function getBreadcrumbLabel(path: string) {
  return breadcrumbLabels[path] || path
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, action }) => {
  const location = useLocation();
  const paths = location.pathname.split("/").filter(Boolean);
  
  let homePath = "/";
  if (location.pathname.startsWith("/hrd")) homePath = "/hrd";
  else if (location.pathname.startsWith("/bendahara")) homePath = "/bendahara";
  else if (location.pathname.startsWith("/teacher")) homePath = "/teacher";
  else if (location.pathname.startsWith("/staff")) homePath = "/staff";
  else if (location.pathname.startsWith("/portal")) homePath = "/portal";
  else if (location.pathname.startsWith("/admin-spmb")) homePath = "/admin-spmb";

  return (
    <div className="flex flex-col mb-8 gap-4">
      {paths.length > 0 && (
        <nav className="flex items-center text-sm text-muted-foreground">
          <Link to={homePath} className="hover:text-foreground transition-colors">Beranda</Link>
          {paths.map((path, index) => {
            const isLast = index === paths.length - 1;
            const routeTo = `/${paths.slice(0, index + 1).join("/")}`;
            const label = getBreadcrumbLabel(path);
            
            return (
              <React.Fragment key={path}>
                <ChevronRight className="w-4 h-4 mx-1 opacity-50" />
                {isLast ? (
                  <span className="font-medium text-foreground">{label}</span>
                ) : (
                  <Link to={routeTo} className="hover:text-foreground transition-colors">
                    {label}
                  </Link>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
          {description && (
            <p className="text-muted-foreground mt-1 text-sm">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
};
