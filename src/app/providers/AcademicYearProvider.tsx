import React, { createContext, useContext, useState } from "react";

interface AcademicYearContextType {
  activeYearId: string | null;
  setActiveYearId: (id: string | null) => void;
}

const AcademicYearContext = createContext<AcademicYearContextType>({
  activeYearId: null,
  setActiveYearId: () => {},
});

export const AcademicYearProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeYearId, setActiveYearId] = useState<string | null>(null);

  return (
    <AcademicYearContext.Provider value={{ activeYearId, setActiveYearId }}>
      {children}
    </AcademicYearContext.Provider>
  );
};

export const useAcademicYear = () => useContext(AcademicYearContext);
