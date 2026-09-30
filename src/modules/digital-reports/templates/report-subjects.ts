import { useList } from "@/lib/refine-compat";

export type ReportSubjectOption = { id: string; name: string; unit_id: string | null };

/** Active subjects that a report template item can pull its Gradebook score from. */
export function useReportSubjects(unitId?: string | null): ReportSubjectOption[] {
  const { data } = useList({
    resource: "subjects",
    pagination: { mode: "off" },
    filters: [{ field: "is_active", operator: "eq", value: true }],
    sorters: [{ field: "name", order: "asc" }],
  });
  const rows = (data?.data || []) as ReportSubjectOption[];
  return rows.filter((subject) => !unitId || !subject.unit_id || subject.unit_id === unitId);
}
