/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseClient } from "../../lib/supabase/client";

export const localDateValue = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const monthRange = (month: string) => {
  if (!month) return { start: "", end: "" };
  const [year, monthNumber] = month.split("-").map(Number);
  const endDay = new Date(year, monthNumber, 0).getDate();
  return { start: `${month}-01`, end: `${month}-${String(endDay).padStart(2, "0")}` };
};

export const formatPercent = (value: number) => `${Number.isFinite(value) ? value.toFixed(1) : "0.0"}%`;

interface ExportAuditInput {
  reportKey: string;
  reportLabel: string;
  format: "csv" | "xlsx" | "pdf" | "print";
  rowCount: number;
  unitId?: string | null;
  academicYearId?: string | null;
  semesterId?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  filters?: Record<string, unknown>;
}

export const recordReportExport = async (input: ExportAuditInput) => {
  const { error } = await supabaseClient.from("report_export_logs").insert({
    report_key: input.reportKey,
    report_label: input.reportLabel,
    export_format: input.format,
    row_count: input.rowCount,
    unit_id: input.unitId || null,
    academic_year_id: input.academicYearId || null,
    semester_id: input.semesterId || null,
    date_from: input.dateFrom || null,
    date_to: input.dateTo || null,
    filters: input.filters || {},
  });
  if (error) console.warn("Report export audit could not be recorded", error.message);
};

export interface ReportQueryFilter {
  field: string;
  operator: "eq" | "gte" | "lte" | "in" | "contains";
  value: unknown;
}

export const fetchAllReportRows = async <T>(table: string, select: string, filters: ReportQueryFilter[], orderBy?: string) => {
  const pageSize = 1000;
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    // Supabase's generated schema cannot type dynamic report tables, while the
    // selected columns remain controlled by each report definition.
    let query: any = supabaseClient.from(table as any).select(select);
    filters.forEach((filter) => {
      if (filter.operator === "eq") query = query.eq(filter.field, filter.value);
      if (filter.operator === "gte") query = query.gte(filter.field, filter.value);
      if (filter.operator === "lte") query = query.lte(filter.field, filter.value);
      if (filter.operator === "in") query = query.in(filter.field, filter.value as unknown[]);
      if (filter.operator === "contains") query = query.ilike(filter.field, `%${String(filter.value)}%`);
    });
    if (orderBy) query = query.order(orderBy, { ascending: true });
    const { data, error } = await query.range(from, from + pageSize - 1);
    if (error) throw error;
    const page = (data || []) as T[];
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
};
