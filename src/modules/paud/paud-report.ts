/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  formatPaudDate,
  PAUD_ASPECTS,
  PAUD_CP_ELEMENTS,
  PAUD_LEARNING_MODE_LABELS,
  PAUD_PHASES,
  PAUD_SCALE_LABELS,
  type PaudLearningMode,
  type PaudScale,
} from "./paud-config";

const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch] as string));
const text = (value: unknown) => escapeHtml(value).replace(/\n/g, "<br>");

export type PaudReportInput = {
  schoolName: string;
  unitName?: string | null;
  className?: string | null;
  semesterName?: string | null;
  student: { full_name: string; nickname?: string | null; nis?: string | null; nisn?: string | null; date_of_birth?: string | null };
  /** Published (or, for staff previews, any) assessments of one semester, any phase. */
  assessments: any[];
  learningMode?: PaudLearningMode;
};

const scaleCell = (scale?: PaudScale | null) => scale ? `<b>${scale}</b><div class="q">${escapeHtml(PAUD_SCALE_LABELS[scale])}</div>` : `<span class="q">-</span>`;

/** Opens the semester development report (Laporan Perkembangan Anak) in a print window. */
export function printPaudReport(input: PaudReportInput) {
  const byPhase = new Map(input.assessments.filter((item) => item.phase).map((item) => [item.phase, item]));
  const phases = PAUD_PHASES.filter((phase) => byPhase.has(phase.id));
  const final = byPhase.get("akhir") || byPhase.get("tengah") || byPhase.get("awal") || input.assessments[0];
  if (!final) return false;
  const mode = input.learningMode || final.learning_mode || "reguler";

  const progressRows = PAUD_CP_ELEMENTS.map((element) => `<tr><td>${escapeHtml(element.title)}</td>${phases.map((phase) => `<td class="c">${scaleCell(byPhase.get(phase.id)?.[`${element.id}_scale`])}</td>`).join("")}</tr>`).join("");
  const narratives = PAUD_CP_ELEMENTS.map((element) => `<h3>${escapeHtml(element.title)}</h3><p>${text(final[`${element.id}_desc`] || "-")}</p>`).join("");
  const aspectRows = PAUD_ASPECTS.filter((aspect) => final[`${aspect.id}_scale`] || final[`${aspect.id}_desc`])
    .map((aspect) => `<tr><td>${escapeHtml(aspect.title)}</td><td class="c">${scaleCell(final[`${aspect.id}_scale`])}</td><td>${text(final[`${aspect.id}_desc`] || "")}</td></tr>`).join("");
  const hasAttendance = [final.attendance_present, final.attendance_sick, final.attendance_permit, final.attendance_absent].some((value) => value !== null && value !== undefined);
  const hasGrowth = final.growth_weight || final.growth_height || final.growth_head;

  const win = window.open("", "_blank", "width=900,height=1000");
  if (!win) return false;
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Laporan Perkembangan ${escapeHtml(input.student.full_name)}</title><style>
    body{font-family:Arial,sans-serif;margin:14mm;color:#0f172a;font-size:12.5px;line-height:1.5}
    h1{font-size:18px;margin:0}h2{font-size:14px;margin:20px 0 6px;border-bottom:2px solid #0f172a;padding-bottom:3px}h3{font-size:13px;margin:12px 0 2px}
    p{margin:0 0 6px}.muted,.q{color:#64748b}.q{font-size:10.5px}.c{text-align:center}
    table{width:100%;border-collapse:collapse;margin-top:6px}th,td{border:1px solid #cbd5e1;padding:6px 8px;vertical-align:top;text-align:left}th{background:#f1f5f9;font-size:11px}
    .id{display:grid;grid-template-columns:1fr 1fr;gap:2px 24px;margin-top:12px}.box{border:1px solid #cbd5e1;border-radius:6px;padding:8px 10px;margin-top:8px}
    .sign{margin-top:40px;display:grid;grid-template-columns:1fr 1fr 1fr;text-align:center;gap:16px}
    @media print{h2{break-after:avoid}.box,tr{break-inside:avoid}}
  </style></head><body>
  <h1>${escapeHtml(input.schoolName)}</h1>
  <div class="muted">Laporan Perkembangan Anak · Kurikulum Merdeka Fase Fondasi${input.semesterName ? ` · Semester ${escapeHtml(input.semesterName)}` : ""}</div>
  <div class="id">
    <div>Nama anak: <b>${escapeHtml(input.student.full_name)}</b>${input.student.nickname ? ` (${escapeHtml(input.student.nickname)})` : ""}</div>
    <div>Kelas: <b>${escapeHtml(input.className || "-")}</b></div>
    <div>NIS / NISN: ${escapeHtml(input.student.nis || "-")} / ${escapeHtml(input.student.nisn || "-")}</div>
    <div>Unit: ${escapeHtml(input.unitName || "-")}</div>
    <div>Tanggal lahir: ${escapeHtml(formatPaudDate(input.student.date_of_birth))}</div>
    <div>Layanan belajar: ${escapeHtml(PAUD_LEARNING_MODE_LABELS[mode as PaudLearningMode] || mode)}</div>
  </div>

  <h2>Perkembangan Capaian Pembelajaran</h2>
  <table><thead><tr><th>Elemen</th>${phases.map((phase) => `<th class="c">${escapeHtml(phase.title)}<div class="q">${escapeHtml(formatPaudDate(byPhase.get(phase.id)?.date))}</div></th>`).join("")}</tr></thead><tbody>${progressRows}</tbody></table>

  <h2>Deskripsi Capaian${final.phase ? ` (${escapeHtml(PAUD_PHASES.find((phase) => phase.id === final.phase)?.title || "")})` : ""}</h2>
  ${narratives}

  ${final.p5_theme || final.p5_desc ? `<h2>Projek Penguatan Profil Pelajar Pancasila</h2><p><b>${escapeHtml(final.p5_theme || "")}</b></p><p>${text(final.p5_desc || "")}</p>` : ""}
  ${aspectRows ? `<h2>Rincian Aspek Perkembangan (STPPA)</h2><table><thead><tr><th>Aspek</th><th class="c">Capaian</th><th>Catatan</th></tr></thead><tbody>${aspectRows}</tbody></table>` : ""}

  ${hasAttendance || hasGrowth ? `<h2>Kehadiran dan Pertumbuhan</h2><table><tbody>
    ${hasAttendance ? `<tr><td>Kehadiran</td><td>Hadir ${final.attendance_present ?? 0} · Sakit ${final.attendance_sick ?? 0} · Izin ${final.attendance_permit ?? 0} · Tanpa keterangan ${final.attendance_absent ?? 0}</td></tr>` : ""}
    ${hasGrowth ? `<tr><td>Pertumbuhan</td><td>Berat ${final.growth_weight ?? "-"} kg · Tinggi ${final.growth_height ?? "-"} cm · Lingkar kepala ${final.growth_head ?? "-"} cm</td></tr>` : ""}
  </tbody></table>` : ""}

  <h2>Catatan dan Kemitraan Keluarga</h2>
  ${final.strengths ? `<div class="box"><b>Kekuatan dan minat anak</b><p>${text(final.strengths)}</p></div>` : ""}
  ${final.follow_up ? `<div class="box"><b>Tindak lanjut di sekolah</b><p>${text(final.follow_up)}</p></div>` : ""}
  ${final.parent_partnership ? `<div class="box"><b>Saran kegiatan di rumah</b><p>${text(final.parent_partnership)}</p></div>` : ""}
  ${final.teacher_note ? `<div class="box"><b>Catatan guru kelas</b><p>${text(final.teacher_note)}</p></div>` : ""}
  ${final.parent_reflection ? `<div class="box"><b>Tanggapan orang tua</b><p>${text(final.parent_reflection)}</p></div>` : ""}

  <div class="sign"><div>Orang tua / wali<br><br><br><br>(....................)</div><div>Guru kelas<br><br><br><br>${escapeHtml(final.employees?.full_name || "(....................)")}</div><div>Kepala sekolah<br><br><br><br>(....................)</div></div>
  <script>window.onload=()=>window.print()</script></body></html>`);
  win.document.close();
  return true;
}
