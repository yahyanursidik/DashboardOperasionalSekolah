import React, { useState } from "react";
import { useList, useInvalidate } from "@refinedev/core";
import { X, Copy, AlertTriangle } from "lucide-react";
import { supabaseClient } from "../../../lib/supabase/client";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";
import { toast } from "sonner";

interface CopyScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CopyScheduleModal: React.FC<CopyScheduleModalProps> = ({ isOpen, onClose }) => {
  const invalidate = useInvalidate();
  const { activeYearId, activeSemesterId } = useAcademicYear();
  const { activeUnitId } = useCurrentUnit();
  
  const [sourceSemesterId, setSourceSemesterId] = useState("");
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: semestersData } = useList({
    resource: "semesters",
    sorters: [{ field: "start_date", order: "desc" }],
    pagination: { pageSize: 100 },
    meta: { select: "*, academic_years(name)" },
  });

  const handleCopy = async () => {
    if (!sourceSemesterId) {
      toast.error("Pilih semester sumber!");
      return;
    }
    if (!activeYearId || !activeSemesterId || !activeUnitId) {
      toast.error("Unit, tahun ajaran, atau semester aktif belum diatur!");
      return;
    }
    if (sourceSemesterId === activeSemesterId) {
      toast.error("Semester sumber dan tujuan tidak boleh sama!");
      return;
    }

    setIsProcessing(true);
    try {
      // 1. Fetch schedules from source
      const { data: sourceSchedules, error: fetchError } = await supabaseClient
        .from("employee_schedules")
        .select("*")
        .eq("semester_id", sourceSemesterId)
        .eq("unit_id", activeUnitId);

      if (fetchError) throw fetchError;

      if (!sourceSchedules || sourceSchedules.length === 0) {
        toast.error("Tidak ada jadwal yang ditemukan di semester sumber untuk unit ini.");
        setIsProcessing(false);
        return;
      }

      const { data: targetSchedules, error: targetError } = await supabaseClient
        .from("employee_schedules")
        .select("id")
        .eq("semester_id", activeSemesterId)
        .eq("unit_id", activeUnitId);

      if (targetError) throw targetError;

      if ((targetSchedules?.length || 0) > 0 && !replaceExisting) {
        toast.error("Semester tujuan sudah memiliki jadwal. Aktifkan opsi ganti jadwal tujuan jika ingin menimpa.");
        setIsProcessing(false);
        return;
      }

      if ((targetSchedules?.length || 0) > 0 && replaceExisting) {
        const { error: deleteError } = await supabaseClient
          .from("employee_schedules")
          .delete()
          .eq("semester_id", activeSemesterId)
          .eq("unit_id", activeUnitId);

        if (deleteError) throw deleteError;
      }

      // 2. Map payload for current year
      const payload = sourceSchedules.map((sch: any) => {
        const excludedFields = new Set(["id", "created_at", "updated_at", "academic_year_id", "semester_id"]);
        const rest = Object.fromEntries(Object.entries(sch).filter(([key]) => !excludedFields.has(key)));
        return {
          ...rest,
          academic_year_id: activeYearId,
          semester_id: activeSemesterId,
        };
      });

      // 3. Insert payload
      const { error: insertError } = await supabaseClient
        .from("employee_schedules")
        .insert(payload);

      if (insertError) throw insertError;

      toast.success(`Berhasil menyalin ${payload.length} jadwal ke semester aktif!`);
      invalidate({
        resource: "employee_schedules",
        invalidates: ["list"],
      });
      onClose();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Gagal menyalin jadwal");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-card w-full max-w-md rounded-xl shadow-xl overflow-hidden border">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Copy className="w-5 h-5 text-primary" />
            Salin Jadwal Massal
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-md text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-amber-500/10 text-amber-600 p-3 rounded-lg flex gap-3 items-start border border-amber-500/20">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm">
              Fitur ini menyalin <strong>semua jadwal</strong> (mengajar, piket, shift) dari semester sumber ke semester aktif.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Salin DARI Tahun Ajaran / Semester:</label>
            <select
              value={sourceSemesterId}
              onChange={(e) => setSourceSemesterId(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 bg-background outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">-- Pilih Semester Sumber --</option>
              {semestersData?.data.map((semester: any) => (
                <option key={semester.id} value={semester.id}>
                  {semester.academic_years?.name || "-"} - {semester.name}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-2">
            <label className="block text-sm font-medium mb-1 text-muted-foreground">Tujuan (Semester Aktif):</label>
            <div className="px-3 py-2 bg-muted/50 rounded-lg border text-sm font-medium">
              {semestersData?.data.find((semester: any) => semester.id === activeSemesterId)?.academic_years?.name || "Tahun aktif"} - {semestersData?.data.find((semester: any) => semester.id === activeSemesterId)?.name || "Semester aktif"}
            </div>
          </div>

          <label className="flex items-start gap-3 rounded-lg border p-3 text-sm cursor-pointer hover:bg-muted/40">
            <input
              type="checkbox"
              checked={replaceExisting}
              onChange={(event) => setReplaceExisting(event.target.checked)}
              className="mt-1"
            />
            <span>
              <span className="font-semibold block">Ganti jadwal tujuan jika sudah ada</span>
              <span className="text-xs text-muted-foreground">
                Jadwal semester aktif untuk unit ini akan dihapus terlebih dahulu sebelum jadwal sumber disalin.
              </span>
            </span>
          </label>
        </div>

        <div className="p-4 border-t bg-muted/20 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 border rounded-md hover:bg-muted text-sm font-medium transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleCopy}
            disabled={isProcessing || !sourceSemesterId || sourceSemesterId === activeSemesterId}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {isProcessing ? "Menyalin..." : "Salin Jadwal"}
          </button>
        </div>
      </div>
    </div>
  );
};
