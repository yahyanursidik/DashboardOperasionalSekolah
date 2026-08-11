export type DatedAttendancePeriod = {
  id: string;
  name?: string | null;
  academic_year_id?: string | null;
  start_date?: string | null;
  end_date?: string | null;
};

function containsDate(period: DatedAttendancePeriod, date: string) {
  return (!period.start_date || period.start_date <= date)
    && (!period.end_date || date <= period.end_date);
}

function latestPeriod(periods: DatedAttendancePeriod[]) {
  return [...periods].sort((left, right) =>
    String(right.start_date || "").localeCompare(String(left.start_date || ""))
  )[0] || null;
}

export function resolveAttendancePeriod(
  academicYears: DatedAttendancePeriod[],
  semesters: DatedAttendancePeriod[],
  date: string,
  fallbackYearId?: string | null,
  fallbackSemesterId?: string | null,
) {
  const academicYear = latestPeriod(academicYears.filter((period) => containsDate(period, date)))
    || academicYears.find((period) => period.id === fallbackYearId)
    || null;
  const semesterCandidates = semesters.filter((period) =>
    (!academicYear || !period.academic_year_id || period.academic_year_id === academicYear.id)
    && containsDate(period, date)
  );
  const semester = latestPeriod(semesterCandidates)
    || semesters.find((period) => period.id === fallbackSemesterId && (!academicYear || period.academic_year_id === academicYear.id))
    || null;

  return { academicYear, semester };
}

export function scheduleMatchesAttendancePeriod(
  schedule: { academic_year_id?: string | null; semester_id?: string | null },
  academicYearId?: string | null,
  semesterId?: string | null,
) {
  return (!schedule.academic_year_id || !academicYearId || schedule.academic_year_id === academicYearId)
    && (!schedule.semester_id || !semesterId || schedule.semester_id === semesterId);
}
