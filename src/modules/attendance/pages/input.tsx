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
    <div className="space-y-6 max-w-4xl mx-auto pb-32">
      <div className="flex items-center gap-4 bg-card p-6 rounded-2xl border shadow-sm">
        <button onClick={() => navigate("/attendance")} className="p-3 border rounded-xl hover:bg-muted transition-colors"><ArrowLeft className="w-5 h-5"/></button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-foreground">Absensi Kelas: <span className="text-primary">{cls?.name}</span></h1>
          <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
            <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md font-medium"><CalendarCheck className="w-4 h-4"/> {new Date(dateStr!).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
            <span className="mx-1">•</span>
            <span className="font-medium">{cls?.units?.name}</span>
          </p>
        </div>
      </div>

      <div className="flex justify-between items-center bg-card p-5 rounded-2xl shadow-sm border border-emerald-100">
        <div className="flex items-center gap-3 text-sm">
          <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-foreground text-lg">{students.length} Siswa</span>
            <p className="text-xs text-muted-foreground">Total siswa di rombel ini</p>
          </div>
        </div>
        <button 
          onClick={handleMarkAllHadir}
          className="text-sm bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2.5 rounded-xl font-bold hover:bg-emerald-100 flex items-center gap-2 transition-colors active:scale-95"
        >
          <CheckCircle2 className="w-5 h-5"/> Set Semua Hadir (H)
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
                <div key={student.id} className="p-4 sm:p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-5 hover:bg-slate-50/50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold shrink-0">{idx + 1}</div>
                    <div>
                      <p className="font-bold text-base text-foreground group-hover:text-primary transition-colors">{student.full_name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">NIS: {student.nis || "-"} • {student.gender === 'L' ? 'Ikhwan' : 'Akhawat'}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 sm:gap-3 pl-12 xl:pl-0 flex-wrap">
                    {statusOptions.map(opt => {
                      const isActive = record.status === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => handleStatusChange(student.id, opt.value)}
                          className={`w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-2xl border-2 font-black text-lg sm:text-xl transition-all shadow-sm ${
                            isActive ? `${opt.activeColor} shadow-md scale-105 ring-2 ring-offset-1 ring-${opt.activeColor.split('-')[1]}-500` : `bg-white text-slate-400 border-slate-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-600 hover:scale-105`
                          }`}
                          title={opt.label + " - " + opt.value.toUpperCase()}
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
        <div className="w-full sm:w-auto bg-white/80 backdrop-blur-md border border-slate-200 shadow-2xl rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between sm:justify-end gap-4 animate-in slide-in-from-bottom-5">
          <div className="text-center sm:text-left sm:pr-8 border-b sm:border-b-0 sm:border-r border-slate-200 pb-3 sm:pb-0">
             <p className="text-sm font-bold text-slate-800">Simpan Data Absensi</p>
             <p className="text-xs text-slate-500">Pastikan data seluruh siswa sudah sesuai.</p>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving || students.length === 0}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary text-primary-foreground px-10 py-3.5 rounded-xl hover:bg-primary/90 transition-all shadow-md hover:shadow-lg font-bold text-sm disabled:opacity-70 active:scale-95"
          >
            <Save className="w-5 h-5" />
            {isSaving ? "Menyimpan ke Database..." : "Konfirmasi & Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
};
