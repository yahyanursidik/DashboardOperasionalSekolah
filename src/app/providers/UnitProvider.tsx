import React, { createContext, useContext, useState, useEffect } from "react";
import { useCurrentRoles } from "../../hooks/useAuth";
import { hasRole } from "../../lib/permissions";

interface UnitContextType {
  activeUnitId: string | null;
  setActiveUnitId: (id: string | null) => void;
  availableUnits: string[];
}

const UnitContext = createContext<UnitContextType>({
  activeUnitId: null,
  setActiveUnitId: () => {},
  availableUnits: [],
});

export const UnitProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { roles } = useCurrentRoles();
  const [activeUnitId, setActiveUnitId] = useState<string | null>(null);

  const availableUnits = React.useMemo(() => {
    if (!roles) return [];
    // Extract unique non-null unit_ids
    const units = Array.from(new Set(roles.map(r => r.unit_id).filter(Boolean))) as string[];
    return units;
  }, [roles]);

  useEffect(() => {
    // Auto-select the first unit if none is selected and user is not super_admin
    // (Super admin might want a global view, represented by null)
    if (!activeUnitId && availableUnits.length > 0 && !hasRole(roles, 'super_admin')) {
      setActiveUnitId(availableUnits[0]);
    }
  }, [availableUnits, activeUnitId, roles]);

  return (
    <UnitContext.Provider value={{ activeUnitId, setActiveUnitId, availableUnits }}>
      {children}
    </UnitContext.Provider>
  );
};

export const useCurrentUnit = () => useContext(UnitContext);
