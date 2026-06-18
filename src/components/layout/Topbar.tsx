import React, { useEffect } from "react";
import { useLogout, useSelect } from "@refinedev/core";
import { LogOut, Building, Search, Bell, Calendar, Menu } from "lucide-react";
import { useCurrentUser } from "../../hooks/useAuth";
import { useCurrentUnit } from "../../app/providers/UnitProvider";
import { useAcademicYear } from "../../app/providers/AcademicYearProvider";

interface TopbarProps {
  onMenuClick?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onMenuClick }) => {
  const { mutate: logout } = useLogout();
  const { user } = useCurrentUser();
  const { activeUnitId, setActiveUnitId, availableUnits } = useCurrentUnit();
  const { activeYearId, setActiveYearId } = useAcademicYear();

  const { options: yearOptions } = useSelect({ 
    resource: "academic_years", 
    optionLabel: "name", 
    optionValue: "id",
    sorters: [{ field: "name", order: "desc" }]
  });

  // Auto-select active year
  useEffect(() => {
    if (!activeYearId && yearOptions && yearOptions.length > 0) {
      setActiveYearId(yearOptions[0].value.toString());
    }
  }, [yearOptions, activeYearId, setActiveYearId]);

  return (
    <header className="h-16 border-b bg-white flex items-center justify-between px-4 sm:px-6 shadow-sm dark:bg-card shrink-0">
      <div className="flex items-center gap-4 flex-1">
        {/* Mobile Menu Button */}
        <button 
          onClick={onMenuClick}
          className="md:hidden p-2 -ml-2 text-muted-foreground hover:bg-muted rounded-md transition-colors"
        >
          <Menu className="w-6 h-6 text-primary" />
        </button>

        {/* Global Search */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full w-full max-w-sm border border-transparent focus-within:border-primary/30 focus-within:bg-background transition-all">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Cari siswa, guru, kelas..." 
            className="bg-transparent border-none focus:ring-0 text-sm w-full outline-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* Academic Year Switcher */}
        <div className="hidden sm:flex items-center gap-2 text-sm px-2 py-1 bg-muted/50 rounded-md">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <select
            value={activeYearId || ""}
            onChange={(e) => setActiveYearId(e.target.value)}
            className="bg-transparent border-none text-sm font-medium focus:ring-0 cursor-pointer outline-none"
          >
            {yearOptions?.map(y => (
              <option key={y.value} value={y.value}>{y.label}</option>
            ))}
          </select>
        </div>

        {/* Unit Switcher */}
        {availableUnits.length > 0 && (
          <div className="hidden sm:flex items-center gap-2 text-sm px-2 py-1 bg-muted/50 rounded-md">
            <Building className="w-4 h-4 text-muted-foreground" />
            <select
              value={activeUnitId || ""}
              onChange={(e) => setActiveUnitId(e.target.value || null)}
              className="bg-transparent border-none text-sm font-medium focus:ring-0 cursor-pointer outline-none"
            >
              <option value="">Semua Unit</option>
              {availableUnits.map((id) => (
                <option key={id} value={id}>
                  Unit {id.slice(0, 4)}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Notifications */}
        <button className="relative p-2 rounded-full hover:bg-muted transition-colors">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <span className="absolute top-1 right-1.5 w-2 h-2 bg-destructive rounded-full border border-white"></span>
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-3 pl-2 sm:pl-4 sm:border-l">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-sm font-semibold leading-none">{user?.name || "Admin User"}</span>
            <span className="text-xs text-muted-foreground mt-1">Super Admin</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold overflow-hidden">
            {user?.avatar ? (
              <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              (user?.name || "A").charAt(0).toUpperCase()
            )}
          </div>
          <button 
            onClick={() => logout()}
            className="p-1.5 rounded-full hover:bg-destructive/10 transition-colors ml-1"
            title="Logout"
          >
            <LogOut className="w-4 h-4 text-muted-foreground hover:text-destructive" />
          </button>
        </div>
      </div>
    </header>
  );
};
