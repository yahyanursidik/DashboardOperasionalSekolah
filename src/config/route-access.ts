import { navigationConfig } from "./navigation";

// Admin pages reachable by URL but not (or not exactly) listed in the sidebar.
// Everything else inherits the resource of the longest matching sidebar entry.
const extraRouteResources: Array<{ href: string; resource: string }> = [
  { href: "/teachers", resource: "teachers" },
  { href: "/academic", resource: "academic_grades" },
  { href: "/academic/report-print", resource: "academic_report_cards" },
  { href: "/document-types", resource: "document_types" },
  { href: "/attendance/reports", resource: "attendance_records" },
  { href: "/recruitment/cbt", resource: "recruitment_cbt" },
  { href: "/digital-library/categories", resource: "digital_library_categories" },
  { href: "/curriculum/documents", resource: "curriculum_documents" },
];

const routeResources = [
  ...navigationConfig.flatMap((group) => group.items)
    .filter((item) => item.resource && item.href !== "/")
    .map((item) => ({ href: item.href, resource: item.resource as string })),
  ...extraRouteResources,
].sort((a, b) => b.href.length - a.href.length);

/** Returns the permission resource guarding an admin path, or undefined for open pages (Beranda, Kalender). */
export function getRouteResource(pathname: string): string | undefined {
  const path = pathname.replace(/\/+$/, "") || "/";
  return routeResources.find((entry) => path === entry.href || path.startsWith(`${entry.href}/`))?.resource;
}
