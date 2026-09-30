export type CbtAudience = "recruitment" | "student";

/**
 * The CBT bank/question screens are shared by recruitment (admin, HRD portal) and student
 * exams (admin academic menu, teacher portal). The route decides which audience they manage.
 */
export function getCbtScope(pathname: string): { audience: CbtAudience; banksPath: string; examsPath: string } {
  if (pathname.startsWith("/teacher/cbt")) return { audience: "student", banksPath: "/teacher/cbt/banks", examsPath: "/teacher/cbt" };
  if (pathname.startsWith("/academic/cbt")) return { audience: "student", banksPath: "/academic/cbt/banks", examsPath: "/academic/cbt" };
  if (pathname.startsWith("/hrd")) return { audience: "recruitment", banksPath: "/hrd/cbt/banks", examsPath: "/hrd/cbt/exams" };
  return { audience: "recruitment", banksPath: "/recruitment/cbt/banks", examsPath: "/recruitment/cbt/exams" };
}
