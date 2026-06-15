import React, { createContext, useContext, useState } from "react";

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

  return (
    <AcademicYearContext.Provider value={{ activeYearId, setActiveYearId, activeSemesterId, setActiveSemesterId }}>
      {children}
    </AcademicYearContext.Provider>
  );
};

export const useAcademicYear = () => useContext(AcademicYearContext);
