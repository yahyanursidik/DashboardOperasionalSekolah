import React, { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useOne, useList, useGetIdentity } from "@refinedev/core";
import { supabaseClient } from "../../../lib/supabase/client";
import { ArrowLeft, Save, Users, CalendarCheck, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";

// Local type for managing state before save
type LocalAttendanceRecord = {
  student_id: string;
  status: "hadir" | "izin" | "sakit" | "alpa" | "terlambat" | "pulang_awal";
  note: string;
};

const statusOptions = [
  { value: "hadir", label: "H", color: "bg-emerald-100 text-emerald-800 border-emerald-300", activeColor: "bg-emerald-600 text-white border-emerald-600" },
  { value: "sakit", label: "S", color: "bg-blue-100 text-blue-800 border-blue-300", activeColor: "bg-blue-600 text-white border-blue-600" },
  { value: "izin", label: "I", color: "bg-amber-100 text-amber-800 border-amber-300", activeColor: "bg-amber-600 text-white border-amber-600" },
  { value: "alpa", label: "A", color: "bg-red-100 text-red-800 border-red-300", activeColor: "bg-red-600 text-white border-red-600" },
  { value: "terlambat", label: "T", color: "bg-purple-100 text-purple-800 border-purple-300", activeColor: "bg-purple-600 text-white border-purple-600" },
];

export const AttendanceInput: React.FC = () => {
  const { classId } = useParams();
  const [searchParams] = useSearchParams();
  const dateStr = searchParams.get("date");
  const navigate = useNavigate();

  const { data: identity } = useGetIdentity<any>();
  const { activeYearId } = useAcademicYear();

  // Redirect if missing params
  useEffect(() => {
    if (!classId || !dateStr) {
      navigate("/attendance");
    }
  }, [classId, dateStr, navigate]);

  // Fetch Class Data
  const { data: classData, isLoading: classLoading } = useOne({
    resource: "classes",
    id: classId || "",
    meta: { select: "*, units(name)" },
    queryOptions: { enabled: !!classId }
  });

  // Fetch Students in this class
  const { data: studentsData, isLoading: studentsLoading } = useList({
    resource: "students",
    filters: [{ field: "class_id", operator: "eq", value: classId }],
    sorters: [{ field: "full_name", order: "asc" }],
    queryOptions: { enabled: !!classId }
  });

  // Fetch Existing Attendance for this date to pre-fill state
  const { data: existingRecordsData, isLoading: existingLoading } = useList({
    resource: "attendance_records",
    filters: [
      { field: "class_id", operator: "eq", value: classId },
      { field: "attendance_date", operator: "eq", value: dateStr }
    ],
    queryOptions: { enabled: !!classId && !!dateStr }
  });

  // Local State
  const [records, setRecords] = useState<Record<string, LocalAttendanceRecord>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Initialize state once data loads
  useEffect(() => {
    if (studentsData?.data && existingRecordsData?.data) {
      const initial: Record<string, LocalAttendanceRecord> = {};
      const existingMap = new Map(existingRecordsData.data.map((r: any) => [r.student_id, r]));

      studentsData.data.forEach((student: any) => {
        const existing = existingMap.get(student.id);
        initial[student.id] = {
          student_id: student.id,
          status: existing ? existing.status : "hadir", // Default to hadir if no record
          note: existing ? existing.note || "" : "",
        };
      });
      setRecords(initial);
    }
  }, [studentsData, existingRecordsData]);

  const handleStatusChange = (studentId: string, status: any) => {
    setRecords(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], status }
    }));
  };

  const handleMarkAllHadir = () => {
    setRecords(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(k => updated[k].status = "hadir");
      return updated;
    });
  };

  const handleSave = async () => {
    if (!classId || !dateStr || !activeYearId) return;
    setIsSaving(true);

    try {
      // Prepare payload for bulk upsert
      const payload = Object.values(records).map(r => ({
        student_id: r.student_id,
        class_id: classId,
        unit_id: classData?.data?.unit_id,
        academic_year_id: activeYearId,
        attendance_date: dateStr,
        status: r.status,
        note: r.note,
        recorded_by: identity?.id,
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabaseClient
        .from("attendance_records")
        .upsert(payload, { onConflict: "student_id,attendance_date" });

      if (error) throw error;

      toast.success("Berhasil disimpan!", { description: `Data absensi kelas ${classData?.data?.name} pada ${dateStr} telah diperbarui.` });
      navigate("/attendance"); // Go back to selector
    } catch (error: any) {
      console.error(error);
      toast.error("Gagal menyimpan absensi", { description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (classLoading || studentsLoading || existingLoading) {
    return <div className="p-12 text-center text-muted-foreground animate-pulse">Memuat data kelas...</div>;
  }

  const cls = classData?.data;
  const students = studentsData?.data || [];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-24">
      <div className="flex items-center gap-4 border-b pb-4">
        <button onClick={() => navigate("/attendance")} className="p-2 border rounded-md hover:bg-muted"><ArrowLeft className="w-5 h-5"/></button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">Absensi Kelas: {cls?.name}</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <CalendarCheck className="w-4 h-4"/> {new Date(dateStr!).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            <span className="mx-2">•</span>
            {cls?.units?.name}
          </p>
        </div>
      </div>

      <div className="flex justify-between items-center bg-card p-4 rounded-xl shadow-sm border">
        <div className="flex items-center gap-2 text-sm">
          <Users className="w-5 h-5 text-blue-500" />
          <span className="font-semibold">{students.length} Siswa</span>
        </div>
        <button 
          onClick={handleMarkAllHadir}
          className="text-xs bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-md font-medium hover:bg-emerald-100 flex items-center gap-1"
        >
          <CheckCircle2 className="w-4 h-4"/> Set Semua Hadir
        </button>
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        {students.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">Tidak ada siswa di kelas ini.</div>
        ) : (
          <div className="divide-y divide-border">
            {students.map((student: any, idx: number) => {
              const record = records[student.id];
              if (!record) return null;

              return (
                <div key={student.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted-foreground w-6">{idx + 1}.</span>
                    <div>
                      <p className="font-semibold text-sm sm:text-base">{student.full_name}</p>
                      <p className="text-xs text-muted-foreground">{student.nis || "NIS belum diset"} • {student.gender === 'L' ? 'Ikhwan' : 'Akhawat'}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 sm:gap-3 pl-9 sm:pl-0">
                    {statusOptions.map(opt => {
                      const isActive = record.status === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => handleStatusChange(student.id, opt.value)}
                          className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl border-2 font-bold text-sm sm:text-lg transition-all ${
                            isActive ? opt.activeColor : `bg-background text-muted-foreground border-border hover:border-muted-foreground/50`
                          }`}
                          title={opt.value.toUpperCase()}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Action Bar */}
      <div className="fixed bottom-0 sm:bottom-6 left-0 right-0 sm:left-auto sm:right-6 md:left-64 p-4 sm:p-0 z-40 flex justify-end">
        <div className="w-full sm:w-auto bg-card border shadow-xl rounded-2xl p-3 flex items-center justify-between sm:justify-end gap-4">
          <p className="text-xs text-muted-foreground hidden sm:block px-4">Pastikan data sudah benar sebelum menyimpan.</p>
          <button
            onClick={handleSave}
            disabled={isSaving || students.length === 0}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary text-primary-foreground px-8 py-3 rounded-xl hover:bg-primary/90 transition-colors shadow-sm font-semibold disabled:opacity-70"
          >
            <Save className="w-5 h-5" />
            {isSaving ? "Menyimpan..." : "Simpan Absensi"}
          </button>
        </div>
      </div>
    </div>
  );
};
