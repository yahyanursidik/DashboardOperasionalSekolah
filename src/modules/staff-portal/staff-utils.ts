export const staffPositionLabels: Record<string, string> = {
  cleaning_service: "Cleaning Service",
  satpam: "Satpam / Keamanan",
  sarpras: "Sarana Prasarana",
  bendahara: "Keuangan / Bendahara",
  school_center: "School Center",
  tu: "Tata Usaha",
  pustakawan: "Pustakawan",
  laboran: "Laboran",
  penanggung_jawab: "Penanggung Jawab",
  lainnya: "Staf Pendukung",
};

export const staffPortalPositions = Object.keys(staffPositionLabels);

export function formatStaffPosition(position?: string | null) {
  return staffPositionLabels[position || ""] || (position || "-").replace(/_/g, " ");
}

export function getInitials(name?: string | null) {
  return (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

export function staffStatusLabel(status?: string | null) {
  const map: Record<string, string> = {
    active: "Aktif",
    inactive: "Nonaktif",
    resigned: "Resign",
  };
  return map[status || ""] || status || "-";
}

export const operationalReportCategories = [
  { value: "cleanliness", label: "Kebersihan" },
  { value: "security_incident", label: "Insiden Keamanan" },
  { value: "facility_damage", label: "Kerusakan Sarpras" },
  { value: "supply_request", label: "Kebutuhan Persediaan" },
  { value: "service_issue", label: "Kendala Layanan" },
  { value: "administration", label: "Administrasi" },
  { value: "finance_handover", label: "Serah Terima Keuangan" },
  { value: "health_safety", label: "Kesehatan & Keselamatan" },
  { value: "other", label: "Lainnya" },
];

export function suggestedReportCategory(position?: string | null) {
  const defaults: Record<string, string> = {
    cleaning_service: "cleanliness",
    satpam: "security_incident",
    sarpras: "facility_damage",
    bendahara: "finance_handover",
    school_center: "service_issue",
    tu: "administration",
    pustakawan: "service_issue",
    laboran: "health_safety",
  };
  return defaults[position || ""] || "other";
}
