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

export const AcademicYearProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeYearId, setActiveYearId] = useState<string | null>(null);
  const [activeSemesterId, setActiveSemesterId] = useState<string | null>(null);

  useEffect(() => {
    const fetchDefaultYear = async () => {
      if (activeYearId) return;

      const { data: activeYearsData } = await supabaseClient
        .from("academic_years")
        .select("id")
        .eq("is_active", true)
        .order("start_date", { ascending: false })
        .limit(1);
      const activeYears = activeYearsData as Array<{ id: string }> | null;

      if (activeYears?.[0]?.id) {
        setActiveYearId(activeYears[0].id);
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
        .select("id")
        .eq("academic_year_id", activeYearId)
        .eq("is_active", true)
        .order("start_date", { ascending: false })
        .limit(1);
      const activeSemesters = activeSemestersData as Array<{ id: string }> | null;

      if (activeSemesters?.[0]?.id) {
        setActiveSemesterId(activeSemesters[0].id);
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
