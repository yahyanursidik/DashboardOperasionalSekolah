import React, { useState } from "react";
import { useSelect } from "@refinedev/core";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import { CalendarCheck, ArrowRight, Building, Users } from "lucide-react";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";

export const AttendanceSelector: React.FC = () => {
  const navigate = useNavigate();
  const { activeUnitId } = useCurrentUnit();

  const [selectedUnit, setSelectedUnit] = useState(activeUnitId || "");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const { options: unitOptions } = useSelect({ resource: "units", optionLabel: "name", optionValue: "id" });
  const { options: classOptions } = useSelect({ 
    resource: "classes", 
    optionLabel: "name", 
    optionValue: "id",
    filters: selectedUnit ? [{ field: "unit_id", operator: "eq", value: selectedUnit }] : [],
    queryOptions: { enabled: !!selectedUnit }
  });

  const handleProceed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass || !selectedDate) return;
    navigate(`/attendance/class/${selectedClass}?date=${selectedDate}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Absensi Kelas Harian"
        description="Pilih kelas dan tanggal untuk mengisi kehadiran siswa."
      />

      <div className="max-w-xl mx-auto mt-12 bg-card rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-8 text-center bg-muted/30 border-b">
          <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-full flex items-center justify-center mb-4">
            <CalendarCheck className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold">Mulai Absensi</h2>
          <p className="text-sm text-muted-foreground mt-1">Sistem pencatatan cepat kehadiran siswa.</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleProceed} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold flex items-center gap-2 text-muted-foreground"><Building className="w-4 h-4"/> Unit Pendidikan <span className="text-red-500">*</span></label>
              <select
                required
                value={selectedUnit}
                onChange={(e) => { setSelectedUnit(e.target.value); setSelectedClass(""); }}
                className="w-full border border-input rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none bg-background hover:bg-muted/30 font-medium"
              >
                <option value="">-- Pilih Unit Pendidikan --</option>
                {unitOptions?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold flex items-center gap-2 text-muted-foreground"><Users className="w-4 h-4"/> Kelas / Rombongan Belajar <span className="text-red-500">*</span></label>
              <select
                required
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                disabled={!selectedUnit}
                className="w-full border border-input rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none bg-background hover:bg-muted/30 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                <option value="">-- Pilih Kelas Target --</option>
                {classOptions?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold flex items-center gap-2 text-muted-foreground"><CalendarCheck className="w-4 h-4"/> Tanggal Absensi <span className="text-red-500">*</span></label>
              <input
                type="date"
                required
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full border border-input rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none bg-background hover:bg-muted/30 font-medium"
              />
            </div>

            <button
              type="submit"
              disabled={!selectedClass || !selectedDate}
              className="w-full mt-6 flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-3.5 rounded-xl hover:bg-emerald-700 transition-all font-bold shadow-md hover:shadow-lg disabled:opacity-50 disabled:hover:shadow-md active:scale-[0.98]"
            >
              Buka Lembar Absensi <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
