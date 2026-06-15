import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabaseClient } from "../../../lib/supabase/client";
import { Printer } from "lucide-react";

export const ReportPrint: React.FC = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const studentId = searchParams.get("student_id");
  const semesterId = searchParams.get("semester_id");
  const classId = searchParams.get("class_id");

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!studentId || !semesterId || !classId) return;

      try {
        // Fetch Student
        const { data: student } = await supabaseClient.from("students").select("*").eq("id", studentId).single();
        
        // Fetch Class & Unit
        const { data: classObj } = await supabaseClient.from("classes").select("*, units(name)").eq("id", classId).single();
        
        // Fetch Semester
        const semesterResponse = await supabaseClient.from("semesters").select("*").eq("id", semesterId).single();
        const semester = semesterResponse.data as any;

        // Fetch Grades
        const { data: grades } = await supabaseClient.from("academic_grades").select("*, subjects(name)").eq("student_id", studentId).eq("semester_id", semesterId).eq("class_id", classId);

        // Fetch Report Card info
        const { data: reportCard } = await supabaseClient.from("academic_report_cards").select("*").eq("student_id", studentId).eq("semester_id", semesterId).eq("class_id", classId).single();

        // Fetch Attendance (Counts)
        const responseAtt = await supabaseClient.from("attendance_records")
          .select("status")
          .eq("student_id", studentId)
          .gte("date", semester?.start_date || "2000-01-01")
          .lte("date", semester?.end_date || "2100-01-01");

        const attendance = responseAtt.data as any[];
        const attendanceCounts = { S: 0, I: 0, A: 0 };
        attendance?.forEach(a => {
          if (a.status === "S") attendanceCounts.S++;
          if (a.status === "I") attendanceCounts.I++;
          if (a.status === "A") attendanceCounts.A++;
        });

        // Group grades by subject
        const gradesArr = grades as any[];
        const subjectsMap: Record<string, any> = {};
        gradesArr?.forEach(g => {
          if (!subjectsMap[g.subject_id]) {
            subjectsMap[g.subject_id] = {
              name: g.subjects?.name,
              tugas_1: "-", tugas_2: "-", uts: "-", uas: "-"
            };
          }
          subjectsMap[g.subject_id][g.grade_type] = g.score || "-";
        });

        setData({
          student,
          classObj,
          semester,
          subjects: Object.values(subjectsMap),
          reportCard: reportCard || {},
          attendance: attendanceCounts
        });
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [studentId, semesterId, classId]);

  if (loading) return <div className="p-8 text-center">Memuat Rapor...</div>;
  if (!data || !data.student) return <div className="p-8 text-center">Data tidak ditemukan. Pastikan parameter URL benar.</div>;

  const isPaud = data.classObj?.units?.name?.toLowerCase().includes("paud") || data.classObj?.units?.name?.toLowerCase().includes("tk");

  return (
    <div className="min-h-screen bg-gray-100 p-8 print:p-0 print:bg-white flex flex-col items-center">
      {/* Print Controls (Hidden on print) */}
      <div className="mb-8 print:hidden flex justify-between w-full max-w-[210mm]">
        <button onClick={() => window.close()} className="px-4 py-2 border bg-white rounded shadow-sm text-sm">Tutup</button>
        <button onClick={() => window.print()} className="px-4 py-2 bg-primary text-primary-foreground rounded shadow-sm text-sm flex items-center gap-2">
          <Printer className="w-4 h-4" /> Cetak Dokumen (Ctrl+P)
        </button>
      </div>

      {/* A4 Paper Container */}
      <div className="w-[210mm] min-h-[297mm] bg-white shadow-lg print:shadow-none p-[20mm] text-black">
        
        {/* Header */}
        <div className="text-center border-b-2 border-black pb-4 mb-6">
          <h1 className="text-2xl font-bold uppercase">Laporan Hasil Belajar Siswa</h1>
          <h2 className="text-xl font-bold">{data.classObj?.units?.name || "TSLS School"}</h2>
        </div>

          {/* Identity Table & Photo */}
          <div className="flex gap-6 mb-6 items-start">
            {data.student.photo_url && (
              <div className="w-24 h-32 border-2 border-black p-1 shrink-0 bg-white">
                <img 
                  src={data.student.photo_url.startsWith('http') ? data.student.photo_url : `https://ebdkupeqmpqrdfketgab.supabase.co/storage/v1/object/public/school-documents/${data.student.photo_url}`}
                  alt={data.student.full_name}
                  className="w-full h-full object-cover grayscale"
                />
              </div>
            )}
            <table className="w-full text-sm">
              <tbody>
                <tr>
                  <td className="w-32 py-1 font-semibold">Nama Siswa</td><td className="w-4">:</td><td>{data.student.full_name}</td>
                  <td className="w-32 py-1 font-semibold">Kelas</td><td className="w-4">:</td><td>{data.classObj?.name}</td>
                </tr>
                <tr>
                  <td className="py-1 font-semibold">NIS/NISN</td><td>:</td><td>{data.student.nis || "-"} / {data.student.nisn || "-"}</td>
                  <td className="py-1 font-semibold">Semester</td><td>:</td><td>{data.semester?.name}</td>
                </tr>
              </tbody>
            </table>
          </div>

        {/* Main Grades */}
        <div className="mb-6">
          <h3 className="font-bold mb-2">A. Pencapaian Akademik</h3>
          <table className="w-full text-sm border-collapse border border-black">
            <thead>
              <tr className="bg-gray-100 print:bg-gray-100">
                <th className="border border-black p-2 w-12 text-center">No</th>
                <th className="border border-black p-2 text-left">Mata Pelajaran</th>
                <th className="border border-black p-2 text-center">Tugas 1</th>
                <th className="border border-black p-2 text-center">Tugas 2</th>
                <th className="border border-black p-2 text-center">UTS</th>
                <th className="border border-black p-2 text-center">UAS</th>
              </tr>
            </thead>
            <tbody>
              {data.subjects.length === 0 ? (
                <tr><td colSpan={6} className="border border-black p-2 text-center text-gray-500">Belum ada nilai akademik diisi.</td></tr>
              ) : (
                data.subjects.map((sub: any, idx: number) => (
                  <tr key={idx}>
                    <td className="border border-black p-2 text-center">{idx + 1}</td>
                    <td className="border border-black p-2">{sub.name}</td>
                    <td className="border border-black p-2 text-center">{sub.tugas_1}</td>
                    <td className="border border-black p-2 text-center">{sub.tugas_2}</td>
                    <td className="border border-black p-2 text-center">{sub.uts}</td>
                    <td className="border border-black p-2 text-center">{sub.uas}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {isPaud && (
            <p className="text-xs mt-1 text-gray-600">* Keterangan Kualitatif: BB (Belum Berkembang), MB (Mulai Berkembang), BSH (Berkembang Sesuai Harapan), BSB (Berkembang Sangat Baik)</p>
          )}
        </div>

        {/* Diniyah / Tahfidz */}
        <div className="mb-6">
          <h3 className="font-bold mb-2">B. Pencapaian Keislaman</h3>
          <table className="w-full text-sm border-collapse border border-black">
            <tbody>
              <tr>
                <td className="border border-black p-2 w-1/2 font-semibold">Predikat Tahsin</td>
                <td className="border border-black p-2 w-1/2 text-center font-bold">{data.reportCard.tahsin_predicate || "-"}</td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-semibold">Predikat Tahfidz</td>
                <td className="border border-black p-2 text-center font-bold">{data.reportCard.tahfidz_predicate || "-"}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Sikap / Adab */}
        <div className="mb-6">
          <h3 className="font-bold mb-2">C. Sikap & Kepribadian</h3>
          <table className="w-full text-sm border-collapse border border-black">
            <tbody>
              <tr>
                <td className="border border-black p-2 w-1/2 font-semibold">Sikap Spiritual (Ibadah)</td>
                <td className="border border-black p-2 w-1/2 text-center font-bold">{data.reportCard.spiritual_predicate || "-"}</td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-semibold">Sikap Sosial (Adab & Perilaku)</td>
                <td className="border border-black p-2 text-center font-bold">{data.reportCard.social_predicate || "-"}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Attendance & Extracurricular */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="font-bold mb-2">D. Ekstrakurikuler</h3>
            <div className="border border-black p-3 min-h-[80px] text-sm">
              {data.reportCard.extracurricular || "-"}
            </div>
          </div>
          <div>
            <h3 className="font-bold mb-2">E. Ketidakhadiran</h3>
            <table className="w-full text-sm border-collapse border border-black h-[80px]">
              <tbody>
                <tr>
                  <td className="border border-black px-3 py-1">Sakit</td>
                  <td className="border border-black px-3 py-1 text-center w-12">{data.attendance.S}</td>
                  <td className="border border-black px-3 py-1 w-12">hari</td>
                </tr>
                <tr>
                  <td className="border border-black px-3 py-1">Izin</td>
                  <td className="border border-black px-3 py-1 text-center">{data.attendance.I}</td>
                  <td className="border border-black px-3 py-1">hari</td>
                </tr>
                <tr>
                  <td className="border border-black px-3 py-1">Alpa</td>
                  <td className="border border-black px-3 py-1 text-center">{data.attendance.A}</td>
                  <td className="border border-black px-3 py-1">hari</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Homeroom Notes */}
        <div className="mb-8">
          <h3 className="font-bold mb-2">F. Catatan Wali Kelas</h3>
          <div className="border border-black p-4 min-h-[100px] text-sm italic">
            {data.reportCard.homeroom_notes || "Belum ada catatan."}
          </div>
        </div>

        {/* Signatures */}
        <div className="flex justify-between mt-12 text-sm">
          <div className="text-center w-48">
            <p>Mengetahui,</p>
            <p>Orang Tua / Wali</p>
            <br /><br /><br /><br />
            <p className="border-b border-black w-full inline-block"></p>
          </div>
          
          <div className="text-center w-48">
            <p>Diberikan di: ____________</p>
            <p>Wali Kelas</p>
            <br /><br /><br /><br />
            <p className="border-b border-black w-full inline-block"></p>
          </div>
        </div>

      </div>
    </div>
  );
};
