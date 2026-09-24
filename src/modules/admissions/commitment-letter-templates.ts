import { isElementaryApplicant, isHblApplicant } from "./admissions-config";

export type CommitmentLetterKind = "elementary" | "preschool_onsite" | "preschool_hbl";

export type CommitmentLetterTemplate = {
  kind: CommitmentLetterKind;
  programLabel: string;
  title: string;
  description: string;
  commitments: string[];
  filename: string;
};

const templates: Record<CommitmentLetterKind, CommitmentLetterTemplate> = {
  elementary: {
    kind: "elementary",
    programLabel: "Elementary School",
    title: "Surat Komitmen Orang Tua/Wali — Elementary School",
    description: "Komitmen pendampingan belajar, kehadiran, adab, dan komunikasi keluarga dengan sekolah.",
    filename: "Surat Komitmen Elementary School",
    commitments: [
      "Mendampingi anak untuk hadir tepat waktu dan mengikuti kegiatan belajar sesuai jadwal sekolah.",
      "Mendukung pembiasaan adab, ibadah, disiplin, serta tata tertib yang berlaku di TS Lab School.",
      "Menjalin komunikasi yang baik dengan wali kelas/guru dan menyampaikan perubahan penting terkait kondisi anak.",
      "Memenuhi kewajiban administrasi serta mengikuti informasi dan kegiatan sekolah yang relevan bagi perkembangan anak.",
    ],
  },
  preschool_onsite: {
    kind: "preschool_onsite",
    programLabel: "Preschool Regular / Onsite",
    title: "Surat Komitmen Orang Tua/Wali — Preschool Regular / Onsite",
    description: "Komitmen adaptasi anak, kehadiran onsite, kesehatan, antar-jemput, dan komunikasi dengan guru.",
    filename: "Surat Komitmen Preschool Onsite",
    commitments: [
      "Mendampingi proses adaptasi anak secara positif serta menyiapkan kehadiran tepat waktu sesuai jadwal sekolah.",
      "Menyampaikan kondisi kesehatan, alergi, kebutuhan dukungan, dan perubahan penting anak kepada guru secara jujur dan tepat waktu.",
      "Mematuhi ketentuan keamanan antar-jemput, termasuk daftar penjemput yang telah diinformasikan kepada sekolah.",
      "Bekerja sama dengan guru dalam pembiasaan kemandirian, adab, makan/minum, serta rutinitas anak di sekolah dan rumah.",
    ],
  },
  preschool_hbl: {
    kind: "preschool_hbl",
    programLabel: "Preschool Homebased Learning / HBL",
    title: "Surat Komitmen Orang Tua/Wali — Preschool Homebased Learning",
    description: "Komitmen pendampingan belajar di rumah, kesiapan perangkat, zona waktu, keamanan tautan, dan pelaporan kegiatan.",
    filename: "Surat Komitmen Preschool HBL",
    commitments: [
      "Menyiapkan pendamping dewasa, perangkat, koneksi internet, dan ruang belajar yang aman sesuai waktu belajar yang telah disepakati.",
      "Mengikuti jadwal pembelajaran berdasarkan zona waktu keluarga dan memberitahukan guru bila ada kendala kehadiran.",
      "Mendampingi anak menggunakan tautan kelas/video-call dengan aman dan tidak membagikan tautan atau materi terbatas kepada pihak lain.",
      "Mendukung penyelesaian worksheet atau home project serta mengirimkan laporan/umpan balik sesuai arahan guru.",
    ],
  },
};

export const getCommitmentLetterKind = (applicant?: unknown): CommitmentLetterKind => {
  if (isHblApplicant(applicant as any)) return "preschool_hbl";
  if (isElementaryApplicant(applicant as any)) return "elementary";
  return "preschool_onsite";
};

export const getCommitmentLetterTemplate = (kind: CommitmentLetterKind) => templates[kind];

const escapeHtml = (value: unknown) => String(value || "-").replace(/[&<>\"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
}[character] || character));

export const downloadCommitmentLetterTemplate = (kind: CommitmentLetterKind, applicant?: any) => {
  const template = getCommitmentLetterTemplate(kind);
  const parentName = escapeHtml(applicant?.parent_name);
  const childName = escapeHtml(applicant?.name);
  const childNik = escapeHtml(applicant?.nik);
  const date = new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" }).format(new Date());
  const content = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(template.filename)}</title><style>body{font-family:Arial,sans-serif;color:#111827;line-height:1.55;margin:42px;max-width:720px}h1{text-align:center;font-size:16pt;margin:0 0 4px}h2{text-align:center;font-size:12pt;font-weight:normal;margin:0 0 30px}.meta{margin:20px 0}.meta p{margin:3px 0}ol{padding-left:24px}li{margin:10px 0}.signature{margin-top:48px;width:240px;text-align:center;margin-left:auto}.line{height:70px;border-bottom:1px solid #111827}</style></head><body><h1>SURAT KOMITMEN ORANG TUA/WALI</h1><h2>${escapeHtml(template.programLabel)}</h2><p>Yang bertanda tangan di bawah ini:</p><div class="meta"><p>Nama orang tua/wali: <strong>${parentName}</strong></p><p>Nama calon murid: <strong>${childName}</strong></p><p>NIK calon murid: ${childNik}</p></div><p>Sehubungan dengan pendaftaran calon murid pada program <strong>${escapeHtml(template.programLabel)}</strong> TS Lab School, saya menyatakan bersedia untuk:</p><ol>${template.commitments.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol><p>Saya menyatakan bahwa informasi yang disampaikan dalam pendaftaran adalah benar. Surat komitmen ini dibuat dengan penuh kesadaran untuk mendukung proses pendidikan anak bersama TS Lab School.</p><div class="signature"><p>${date}</p><p>Orang tua/wali,</p><div class="line"></div><p><strong>${parentName}</strong></p></div></body></html>`;
  const blob = new Blob([content], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${template.filename.replace(/[\\/:*?\"<>|]+/g, "_")}.doc`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};
