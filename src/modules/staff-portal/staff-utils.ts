export const staffPositionLabels: Record<string, string> = {
  cleaning_service: "Cleaning Service",
  satpam: "Satpam / Keamanan",
  sarpras: "Sarana Prasarana",
  bendahara: "Keuangan / Bendahara",
  school_center: "School Center",
  tu: "Tata Usaha",
  pustakawan: "Pustakawan",
  laboran: "Laboran",
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
