/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabaseClient } from "../../lib/supabase/client";

interface AcademicYearContextType {
  activeYearId: string | null;
  setActiveYearId: (id: string | null) => void;
  activeSemesterId?: string | null;
  setActiveSemesterId?: (id: string | null) => void;
}

const AcademicYearContext = createContext<AcademicYearContextType>({
  activeYearId: null,
  setActiveYearId: () => {},
  activeSemesterId: null,
  setActiveSemesterId: () => {},
});

type DatedPeriod = {
  id: string;
  start_date?: string | null;
  end_date?: string | null;
};

function getLocalDateIso() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function selectCurrentPeriod(periods: DatedPeriod[] | null) {
  if (!periods?.length) return null;
  const today = getLocalDateIso();
  return periods.find((period) =>
    (!period.start_date || period.start_date <= today)
    && (!period.end_date || today <= period.end_date)
  ) || periods[0];
}

export const AcademicYearProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeYearId, setActiveYearId] = useState<string | null>(null);
  const [activeSemesterId, setActiveSemesterId] = useState<string | null>(null);

  useEffect(() => {
    const fetchDefaultYear = async () => {
      if (activeYearId) return;

      const { data: activeYearsData } = await supabaseClient
        .from("academic_years")
        .select("id, start_date, end_date")
        .eq("is_active", true)
        .order("start_date", { ascending: false })
        .limit(10);
      const activeYears = activeYearsData as DatedPeriod[] | null;
      const currentActiveYear = selectCurrentPeriod(activeYears);

      if (currentActiveYear?.id) {
        setActiveYearId(currentActiveYear.id);
        return;
      }

      const { data: latestYearsData } = await supabaseClient
        .from("academic_years")
        .select("id")
        .order("name", { ascending: false })
        .limit(1);
      const latestYears = latestYearsData as Array<{ id: string }> | null;

      if (latestYears?.[0]?.id) setActiveYearId(latestYears[0].id);
    };

    fetchDefaultYear();
  }, [activeYearId]);

  useEffect(() => {
    const fetchDefaultSemester = async () => {
      if (!activeYearId) {
        setActiveSemesterId(null);
        return;
      }

      const { data: activeSemestersData } = await supabaseClient
        .from("semesters")
        .select("id, start_date, end_date")
        .eq("academic_year_id", activeYearId)
        .eq("is_active", true)
        .order("start_date", { ascending: false })
        .limit(10);
      const activeSemesters = activeSemestersData as DatedPeriod[] | null;
      const currentActiveSemester = selectCurrentPeriod(activeSemesters);

      if (currentActiveSemester?.id) {
        setActiveSemesterId(currentActiveSemester.id);
        return;
      }

      const { data: latestSemestersData } = await supabaseClient
        .from("semesters")
        .select("id")
        .eq("academic_year_id", activeYearId)
        .order("start_date", { ascending: false })
        .limit(1);
      const latestSemesters = latestSemestersData as Array<{ id: string }> | null;

      setActiveSemesterId(latestSemesters?.[0]?.id || null);
    };

    fetchDefaultSemester();
  }, [activeYearId]);

  return (
    <AcademicYearContext.Provider value={{ activeYearId, setActiveYearId, activeSemesterId, setActiveSemesterId }}>
      {children}
    </AcademicYearContext.Provider>
  );
};

export const useAcademicYear = () => useContext(AcademicYearContext);
