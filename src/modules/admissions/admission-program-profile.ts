import { isElementaryApplicant, isHblApplicant, isPreschoolApplicant, type AdmissionRequirementContext } from "./admissions-config";

export type AdmissionProgramKind = "preschool_hbl" | "preschool_onsite" | "elementary" | "general";
export type AdmissionProfileField = { key: string; label: string; required?: boolean; type?: "text" | "textarea" | "select"; options?: string[] };

const selection = (key: string, label: string, options: string[], required = false): AdmissionProfileField => ({ key, label, options, required, type: "select" });
const text = (key: string, label: string, required = false): AdmissionProfileField => ({ key, label, required, type: "text" });
const area = (key: string, label: string, required = false): AdmissionProfileField => ({ key, label, required, type: "textarea" });

const transferFields: AdmissionProfileField[] = [
  area("transfer_reason", "Alasan perpindahan sekolah", true),
  text("previous_school_city", "Kota/kabupaten sekolah sebelumnya"),
  selection("last_completed_grade", "Kelas/tingkat terakhir yang diselesaikan", ["PAUD/TK", "Kelas 1", "Kelas 2", "Kelas 3", "Kelas 4", "Kelas 5", "Kelas 6", "Lainnya"]),
];

const fieldsByKind: Record<AdmissionProgramKind, AdmissionProfileField[]> = {
  preschool_hbl: [
    selection("home_learning_space", "Ruang belajar di rumah", ["Ruang khusus yang tenang", "Area bersama yang cukup tenang", "Masih perlu penyesuaian"], true),
    selection("daily_learning_window", "Waktu belajar yang paling memungkinkan", ["Pagi", "Siang", "Sore", "Perlu konsultasi"], true),
    text("preschool_primary_caregiver", "Pendamping utama anak di rumah"),
    area("home_learning_routine_notes", "Catatan rutinitas belajar/istirahat anak di rumah"),
  ],
  preschool_onsite: [
    selection("preschool_separation_readiness", "Kesiapan berpisah sementara dengan orang tua", ["Sudah terbiasa", "Sedang dibiasakan", "Perlu pendampingan awal"], true),
    selection("preschool_meal_independence", "Kemandirian saat makan/minum", ["Mandiri", "Perlu diingatkan", "Perlu bantuan"], true),
    text("preschool_primary_caregiver", "Pengasuh/pendamping utama anak di rumah"),
    area("preschool_routine_notes", "Kebiasaan penting anak yang perlu diketahui guru"),
  ],
  elementary: [
    selection("elementary_learning_support", "Kebutuhan dukungan belajar", ["Tidak ada yang perlu disampaikan", "Perlu dikonsultasikan dengan guru", "Sedang menerima pendampingan"], true),
    text("elementary_learning_strengths", "Minat atau kekuatan belajar anak"),
    area("elementary_support_notes", "Catatan pembelajaran/kebutuhan dukungan untuk guru"),
  ],
  general: [
    text("family_expectation", "Harapan keluarga terhadap program"),
    area("additional_program_notes", "Catatan tambahan untuk panitia"),
  ],
};

export const getAdmissionProgramProfile = (context?: AdmissionRequirementContext | string | null) => {
  const hbl = isHblApplicant(context);
  const preschool = isPreschoolApplicant(context);
  const elementary = isElementaryApplicant(context);
  const kind: AdmissionProgramKind = hbl ? "preschool_hbl" : preschool ? "preschool_onsite" : elementary ? "elementary" : "general";
  return {
    kind,
    label: kind === "preschool_hbl" ? "Preschool Homebased Learning" : kind === "preschool_onsite" ? "Preschool Regular / Onsite" : kind === "elementary" ? "Elementary School" : "Program sekolah",
    fields: fieldsByKind[kind],
    requiresOnsiteDetails: kind !== "preschool_hbl",
    requiresToiletReadiness: kind === "preschool_onsite",
  };
};

export const getAdmissionProfileFields = (context?: AdmissionRequirementContext | string | null) => [
  ...getAdmissionProgramProfile(context).fields,
  ...(typeof context === "string" ? context === "transfer" ? transferFields : [] : context?.entry_type === "transfer" ? transferFields : []),
];

export const getAdmissionReadinessQuestions = (context?: AdmissionRequirementContext | string | null) => {
  const kind = getAdmissionProgramProfile(context).kind;
  const shared = [{ key: "family_collaboration", label: "Keluarga bersedia bekerja sama dengan sekolah dalam pembiasaan adab, ibadah, dan perkembangan anak." }];
  if (kind === "preschool_hbl") return [
    { key: "hbl_device", label: "Perangkat dan koneksi yang digunakan anak dapat disiapkan pada waktu belajar yang disepakati." },
    { key: "hbl_facilitator", label: "Ada pendamping dewasa yang dapat membantu anak memulai sesi belajar di rumah." },
    { key: "hbl_routine", label: "Keluarga dapat menyiapkan rutinitas belajar dan istirahat yang cukup bagi anak." },
    ...shared,
  ];
  if (kind === "preschool_onsite") return [
    { key: "separation", label: "Anak mampu berpisah sementara dari orang tua dengan tenang atau sedang dalam proses pembiasaan." },
    { key: "communication", label: "Anak mampu menyampaikan kebutuhan dasar secara lisan atau isyarat." },
    { key: "instruction", label: "Anak terbiasa mengikuti instruksi sederhana." },
    { key: "selfcare", label: "Anak dapat makan dan menggunakan toilet dengan bantuan minimal atau keluarga telah menyampaikan kebutuhan dukungan." },
    ...shared,
  ];
  if (kind === "elementary") return [
    { key: "study_routine", label: "Anak memiliki atau sedang membangun kebiasaan belajar di rumah." },
    { key: "learning_support", label: "Keluarga telah menyampaikan kebutuhan dukungan belajar yang perlu diketahui guru." },
    { key: "attendance", label: "Keluarga dapat mendukung kehadiran dan ketepatan waktu anak." },
    ...shared,
  ];
  return [
    { key: "participation", label: "Keluarga memahami dan bersedia mengikuti ketentuan program yang dipilih." },
    { key: "communication", label: "Orang tua/wali dapat dihubungi melalui kontak yang dicantumkan pada formulir." },
    ...shared,
  ];
};
