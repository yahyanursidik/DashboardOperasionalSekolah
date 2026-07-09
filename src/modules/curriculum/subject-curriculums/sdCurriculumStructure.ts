export const SD_PHASES = [
  {
    id: "A",
    label: "Fase A",
    grades: [1, 2],
    rangeLabel: "Kelas 1-2",
    description: "CP dan ATP berlaku untuk satu fase, perangkat ajar diturunkan per kelas.",
  },
  {
    id: "B",
    label: "Fase B",
    grades: [3, 4],
    rangeLabel: "Kelas 3-4",
    description: "CP dan ATP berlaku untuk satu fase, perangkat ajar diturunkan per kelas.",
  },
  {
    id: "C",
    label: "Fase C",
    grades: [5, 6],
    rangeLabel: "Kelas 5-6",
    description: "CP dan ATP berlaku untuk satu fase, perangkat ajar diturunkan per kelas.",
  },
] as const;

export type SdPhaseId = (typeof SD_PHASES)[number]["id"];

export const getSdPhaseByGrade = (grade?: number | null) => {
  if (!grade) return undefined;
  return SD_PHASES.find((phase) => (phase.grades as readonly number[]).includes(Number(grade)));
};

export const getSdPhaseLabelByGrade = (grade?: number | null) => {
  const phase = getSdPhaseByGrade(grade);
  return phase ? `${phase.label} (${phase.rangeLabel})` : "Pilih kelas untuk melihat fase";
};

export const getSdPhaseCompletion = (records: any[], phaseGrades: readonly number[]) => {
  const phaseRecords = records.filter((record) => phaseGrades.includes(Number(record.grade_level)));
  const cpAtpSource = phaseRecords.find((record) => record.cp_text || record.atp_text);
  const classRecords = phaseGrades.map((grade) => phaseRecords.find((record) => Number(record.grade_level) === grade));

  return {
    records: phaseRecords,
    cpFilled: Boolean(cpAtpSource?.cp_text),
    atpFilled: Boolean(cpAtpSource?.atp_text),
    classRecords,
    completedClasses: classRecords.filter(Boolean).length,
  };
};

export const hasRows = (value: unknown) => Array.isArray(value) && value.length > 0;

export const getRppmRows = (record: any) => {
  const rows = record?.prosem_data?.rppm;
  return Array.isArray(rows) ? rows : [];
};

export const getRpphRows = (record: any) => {
  const rows = record?.learning_plan_data;
  return Array.isArray(rows) ? rows : [];
};
