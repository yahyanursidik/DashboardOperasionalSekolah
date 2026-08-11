/* eslint-disable @typescript-eslint/no-explicit-any */
import { getAdmissionStatus } from "./admissions-config";

export const admissionEntryTypes = ["new", "transfer"] as const;
export type AdmissionEntryType = (typeof admissionEntryTypes)[number];

export const admissionEntryTypeMeta: Record<AdmissionEntryType, { label: string; description: string }> = {
  new: { label: "Siswa baru", description: "Masuk pada tingkat awal atau melanjutkan dari jenjang sebelumnya." },
  transfer: { label: "Siswa pindahan", description: "Pindah dari sekolah lain ke kelas berjalan yang dituju." },
};

export const classTargetLabel = (row?: any) => {
  if (!row) return "Kelas belum ditentukan";
  return row.name || row.class_name || (row.grade_level != null ? `Kelas ${row.grade_level}` : "Kelas belum ditentukan");
};

export const applicantTargetLabel = (row?: any) => {
  const target = row?.desired_classes || row?.classes;
  return target ? classTargetLabel(target) : row?.desired_grade != null ? `Kelas ${row.desired_grade}` : "Kelas belum ditentukan";
};

export const entryTypeLabel = (value?: string | null) =>
  admissionEntryTypeMeta[(value as AdmissionEntryType) || "new"]?.label || "Siswa baru";

export const isSeatReserved = (row: any) => ["accepted", "enrolled"].includes(getAdmissionStatus(row));
export const isActiveApplication = (row: any) => !["draft", "rejected", "withdrawn"].includes(getAdmissionStatus(row));

export interface AdmissionQuotaUsage {
  applicants: number;
  reserved: number;
  enrolled: number;
  waiting: number;
  remaining: number;
  utilization: number;
}

export const getQuotaUsage = (plan: any, applicants: any[]): AdmissionQuotaUsage => {
  const matching = applicants.filter((row) =>
    row.batch_id === plan.batch_id
    && row.desired_class_id === plan.class_id
    && (row.entry_type || "new") === plan.entry_type
    && !row.archived_at,
  );
  const reserved = matching.filter(isSeatReserved).length;
  const quota = Number(plan.quota || 0);
  return {
    applicants: matching.filter(isActiveApplication).length,
    reserved,
    enrolled: matching.filter((row) => getAdmissionStatus(row) === "enrolled").length,
    waiting: matching.filter((row) => getAdmissionStatus(row) === "waitlisted").length,
    remaining: Math.max(0, quota - reserved),
    utilization: quota > 0 ? Math.min(100, Math.round((reserved / quota) * 100)) : 0,
  };
};

export const isAdmissionQuotaSchemaError = (error?: { code?: string; message?: string } | null) =>
  Boolean(error && (["PGRST202", "PGRST204", "PGRST205", "42703", "42P01"].includes(error.code || "")
    || /admission_quota_plans|desired_class_id|entry_type|admission_public_quota_options/i.test(error.message || "")));
