import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { BarChart3, CalendarDays, CheckCircle2, ClipboardCheck, Loader2, Target } from "lucide-react";
import { toast } from "sonner";
import { supabaseClient } from "../../lib/supabase/client";

const competencies = [
  { key: "skor_pedagogik", label: "Pedagogik" },
  { key: "skor_kepribadian", label: "Kepribadian" },
  { key: "skor_sosial", label: "Sosial" },
  { key: "skor_profesional", label: "Profesional" },
];

export const TeacherPerformance: React.FC = () => {
  const { employee } = useOutletContext<any>();
  const [assessments, setAssessments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const { data, error } = await supabaseClient.from("pkg_assessments").select("id, tahun_pelajaran, periode, tanggal_penilaian, penilai, jabatan_penilai, skor_pedagogik, skor_kepribadian, skor_sosial, skor_profesional, nilai_akhir, nilai_npkg, predikat, catatan, rekomendasi, status, units(name)").eq("employee_id", employee.id).order("tanggal_penilaian", { ascending: false });
      if (error) toast.error("Riwayat PKG belum dapat dimuat", { description: error.message });
      setAssessments(data || []);
      setIsLoading(false);
    };
    load();
  }, [employee.id]);

  const latestFinal = assessments.find((item) => item.status === "final");

  return (
    <div className="space-y-5 p-4 md:p-0">
      <header><div className="flex items-center gap-2"><BarChart3 className="h-6 w-6 text-emerald-700" /><h1 className="text-xl font-bold text-gray-950">Kinerja & PKG</h1></div><p className="mt-1 text-sm text-gray-500">Hasil penilaian, refleksi, dan arah pengembangan profesional Anda.</p></header>

      {isLoading ? <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-emerald-700" /></div> : !latestFinal ? <div className="rounded-md border border-dashed bg-white p-10 text-center"><ClipboardCheck className="mx-auto h-10 w-10 text-gray-300" /><p className="mt-3 font-bold text-gray-700">Belum ada PKG yang difinalkan</p><p className="mt-1 text-sm text-gray-500">Hasil akan tampil setelah penilai menyelesaikan dan memfinalkan penilaian.</p></div> : <>
        <section className="grid gap-4 rounded-md border bg-white p-5 md:grid-cols-[.7fr_1.3fr]">
          <div className="flex flex-col justify-center border-b pb-5 md:border-b-0 md:border-r md:pb-0 md:pr-5"><p className="text-xs font-bold uppercase text-gray-500">Nilai PKG Terakhir</p><div className="mt-2 flex items-end gap-2"><span className="text-5xl font-black text-emerald-800">{latestFinal.nilai_akhir ?? "-"}</span><span className="pb-1 text-sm text-gray-500">/ 100</span></div><span className="mt-3 w-fit rounded bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">{latestFinal.predikat || "Belum ada predikat"}</span><p className="mt-4 flex items-center gap-1.5 text-xs text-gray-500"><CalendarDays className="h-3.5 w-3.5" />{new Date(`${latestFinal.tanggal_penilaian}T00:00:00`).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}</p></div>
          <div><div className="mb-4 flex items-center justify-between"><div><h2 className="font-bold text-gray-950">Kompetensi Guru</h2><p className="text-xs text-gray-500">{latestFinal.tahun_pelajaran} - {String(latestFinal.periode).replace("_", " ")}</p></div><CheckCircle2 className="h-6 w-6 text-emerald-600" /></div><div className="grid gap-3 sm:grid-cols-2">{competencies.map((item) => <div key={item.key} className="rounded-md border bg-gray-50 p-3"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-gray-600">{item.label}</span><span className="font-bold text-gray-950">{latestFinal[item.key] ?? "-"}</span></div></div>)}</div><p className="mt-4 text-xs text-gray-500">Penilai: <span className="font-semibold text-gray-700">{latestFinal.penilai}</span>{latestFinal.jabatan_penilai ? `, ${latestFinal.jabatan_penilai}` : ""}</p></div>
        </section>

        {(latestFinal.catatan || latestFinal.rekomendasi) && <section className="grid gap-4 md:grid-cols-2">{latestFinal.catatan && <div className="rounded-md border bg-white p-4"><div className="mb-2 flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-blue-700" /><h2 className="font-bold text-gray-950">Catatan Penilai</h2></div><p className="whitespace-pre-wrap text-sm leading-6 text-gray-600">{latestFinal.catatan}</p></div>}{latestFinal.rekomendasi && <div className="rounded-md border bg-white p-4"><div className="mb-2 flex items-center gap-2"><Target className="h-5 w-5 text-amber-700" /><h2 className="font-bold text-gray-950">Rencana Pengembangan</h2></div><p className="whitespace-pre-wrap text-sm leading-6 text-gray-600">{latestFinal.rekomendasi}</p></div>}</section>}

        <section className="rounded-md border bg-white"><div className="border-b px-4 py-3"><h2 className="font-bold text-gray-950">Riwayat Penilaian</h2></div><div className="divide-y">{assessments.map((item) => <div key={item.id} className="grid gap-2 px-4 py-3 sm:grid-cols-[1fr_1fr_.7fr_.6fr] sm:items-center"><div><p className="font-semibold text-gray-900">{item.tahun_pelajaran}</p><p className="text-xs capitalize text-gray-500">{String(item.periode).replace("_", " ")}</p></div><p className="text-sm text-gray-600">{new Date(`${item.tanggal_penilaian}T00:00:00`).toLocaleDateString("id-ID")}</p><p className="text-sm font-bold text-gray-900">{item.status === "final" ? item.nilai_akhir ?? "-" : "Dalam proses"}</p><span className={`w-fit rounded px-2 py-1 text-[10px] font-bold uppercase ${item.status === "final" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{item.status === "final" ? "Final" : "Draft"}</span></div>)}</div></section>
      </>}
    </div>
  );
};
