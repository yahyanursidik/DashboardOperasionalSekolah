import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { supabaseClient } from "../../../lib/supabase/client";

export interface ReportIdentity {
  schoolName: string;
  address: string;
  phone: string;
  email: string;
  logoUrl: string;
  principalName: string;
  homeroomName: string;
  semesterName: string;
  academicYearName: string;
  issuedAt: string;
}

const db = supabaseClient as unknown as {
  from: (table: string) => {
    select: (columns: string) => { eq: (column: string, value: string) => { maybeSingle: () => Promise<{ data: any; error: { message: string } | null }> } };
  };
};

/**
 * School letterhead and signatories for one report. Relationship embeds are tried first;
 * if an optional relation is missing in this database, the plain columns are used instead
 * so PDF generation never fails because of identity data.
 */
export async function loadReportIdentity(report: any, fallback: { appName: string; logoUrl: string }): Promise<ReportIdentity> {
  const classResult = await db.from("classes")
    .select("name, homeroom:employees!homeroom_teacher_id(full_name), units(name, address, phone, email, principal:employees!principal_employee_id(full_name))")
    .eq("id", report.class_id).maybeSingle();
  const classRow = classResult.error
    ? (await db.from("classes").select("name, units(name)").eq("id", report.class_id).maybeSingle()).data
    : classResult.data;

  const periodResult = await db.from("report_periods")
    .select("publish_date, semesters(name), academic_years(name)")
    .eq("id", report.report_period_id).maybeSingle();
  const period = periodResult.data || {};
  const unit = classRow?.units || {};

  return {
    schoolName: unit.name || fallback.appName,
    address: unit.address || "",
    phone: unit.phone || "",
    email: unit.email || "",
    logoUrl: fallback.logoUrl,
    principalName: unit.principal?.full_name || "",
    homeroomName: classRow?.homeroom?.full_name || "",
    semesterName: period.semesters?.name || "",
    academicYearName: period.academic_years?.name || "",
    issuedAt: period.publish_date || new Date().toISOString(),
  };
}

/**
 * Renders the element to an A4 PDF across as many pages as needed. Page breaks are placed at
 * the bottom of table rows / blocks (`tr`, `h3`, `[data-pdf-block]`) so rows are not cut in half.
 */
export async function renderElementToPdf(element: HTMLElement) {
  const canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false });
  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidthMm = pdf.internal.pageSize.getWidth();
  const pageHeightMm = pdf.internal.pageSize.getHeight();
  const pxPerCssPx = canvas.height / element.scrollHeight;
  const pageHeightPx = Math.floor(canvas.width * (pageHeightMm / pageWidthMm));
  // The element already carries its own padding at the very top and bottom; continuation
  // pages get the same breathing room from these margins.
  const marginMm = 15;
  const marginPx = Math.floor(canvas.width * (marginMm / pageWidthMm));

  const containerTop = element.getBoundingClientRect().top;
  const breakpoints = Array.from(element.querySelectorAll<HTMLElement>("tr, h3, [data-pdf-block]"))
    .map((node) => Math.round((node.getBoundingClientRect().bottom - containerTop) * pxPerCssPx))
    .filter((value) => value > 0 && value <= canvas.height)
    .sort((a, b) => a - b);

  let start = 0;
  let pageIndex = 0;
  while (start < canvas.height - 1) {
    const topMarginPx = pageIndex === 0 ? 0 : marginPx;
    const available = pageHeightPx - topMarginPx - marginPx;
    const limit = start + available;
    let end = Math.min(limit, canvas.height);
    if (limit < canvas.height) {
      const candidate = breakpoints.filter((value) => value > start + available * 0.5 && value <= limit).pop();
      if (candidate) end = candidate;
    }

    const slice = document.createElement("canvas");
    slice.width = canvas.width;
    slice.height = end - start;
    const context = slice.getContext("2d");
    if (!context) throw new Error("Canvas PDF tidak tersedia di peramban ini.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, slice.width, slice.height);
    context.drawImage(canvas, 0, start, canvas.width, slice.height, 0, 0, canvas.width, slice.height);

    if (pageIndex > 0) pdf.addPage();
    pdf.addImage(slice.toDataURL("image/jpeg", 0.95), "JPEG", 0, pageIndex === 0 ? 0 : marginMm, pageWidthMm, (slice.height * pageWidthMm) / canvas.width);
    start = end;
    pageIndex += 1;
  }

  return pdf.output("blob");
}
