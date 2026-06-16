import React from "react";
import { useList } from "@refinedev/core";
import { BookOpen, FileText, Layers, TrendingUp } from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { useCurrentUnit } from "../../app/providers/UnitProvider";
import { Link } from "react-router-dom";

export const CurriculumDashboard: React.FC = () => {
  const { activeUnitId } = useCurrentUnit();

  const { data: subjectsData } = useList({
    resource: "subjects",
    filters: activeUnitId ? [{ field: "unit_id", operator: "eq", value: activeUnitId }] : [],
    pagination: { mode: "off" }
  });

  const { data: documentsData } = useList({
    resource: "curriculum_documents",
    filters: activeUnitId ? [{ field: "subjects.unit_id", operator: "eq", value: activeUnitId }] : [],
    meta: { select: "*, subjects(unit_id)" },
    pagination: { mode: "off" }
  });

  const subjects = subjectsData?.data || [];
  const documents = documentsData?.data || [];

  const nasionalSubjects = subjects.filter(s => s.category === "Nasional");
  const khasSubjects = subjects.filter(s => s.category === "Khas Sekolah");

  const modulAjar = documents.filter(d => d.document_type === "Modul Ajar");
  const otherDocs = documents.filter(d => d.document_type !== "Modul Ajar");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kurikulum & Pembelajaran"
        description="Pusat administrasi Kurikulum Merdeka (Deep Learning) dan Kurikulum Khas Sekolah."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat Cards */}
        <div className="bg-card p-5 rounded-xl border shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Mata Pelajaran Nasional</p>
            <h3 className="text-2xl font-bold">{nasionalSubjects.length}</h3>
          </div>
        </div>

        <div className="bg-card p-5 rounded-xl border shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Mata Pelajaran Khas</p>
            <h3 className="text-2xl font-bold">{khasSubjects.length}</h3>
          </div>
        </div>

        <div className="bg-card p-5 rounded-xl border shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Modul Ajar / RPP</p>
            <h3 className="text-2xl font-bold">{modulAjar.length}</h3>
          </div>
        </div>

        <div className="bg-card p-5 rounded-xl border shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Dokumen CP/ATP</p>
            <h3 className="text-2xl font-bold">{otherDocs.length}</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-card rounded-xl border shadow-sm p-6 space-y-4">
          <h3 className="font-semibold text-lg border-b pb-3">Akses Cepat</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link to="/curriculum/subjects" className="p-4 rounded-xl border bg-muted/20 hover:bg-muted/50 transition-colors group">
              <BookOpen className="w-8 h-8 text-blue-600 mb-3 group-hover:scale-110 transition-transform" />
              <h4 className="font-semibold">Mata Pelajaran</h4>
              <p className="text-xs text-muted-foreground mt-1">Kelola data mata pelajaran, pengelompokan Nasional &amp; Khas.</p>
            </Link>
            <Link to="/curriculum/documents" className="p-4 rounded-xl border bg-muted/20 hover:bg-muted/50 transition-colors group">
              <FileText className="w-8 h-8 text-purple-600 mb-3 group-hover:scale-110 transition-transform" />
              <h4 className="font-semibold">Modul Ajar &amp; Dokumen</h4>
              <p className="text-xs text-muted-foreground mt-1">Unggah Modul Ajar, ATP, CP, dan kaitkan ke Kelas/Mapel.</p>
            </Link>
            <Link to="/curriculum/subjects/directory" className="p-4 rounded-xl border bg-amber-50 border-amber-200 hover:bg-amber-100 transition-colors group col-span-full">
              <div className="flex items-center gap-3">
                <Layers className="w-8 h-8 text-amber-600 group-hover:scale-110 transition-transform shrink-0" />
                <div>
                  <h4 className="font-semibold text-amber-800">Direktori Mapel → Guru</h4>
                  <p className="text-xs text-amber-700 mt-0.5">Lihat siapa yang mengajar setiap mata pelajaran. Bantu perencanaan penugasan &amp; penjadwalan.</p>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Kurikulum Merdeka Info */}
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-xl border shadow-sm p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <BookOpen className="w-32 h-32" />
          </div>
          <div className="space-y-4 relative z-10">
            <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider backdrop-blur-md">Paradigma Baru</span>
            <h3 className="font-bold text-2xl">Kurikulum Merdeka:<br/>Deep Learning</h3>
            <p className="text-indigo-100 text-sm leading-relaxed max-w-sm">
              Kelola administrasi pembelajaran berbasis eksplorasi mendalam. Kaitkan CP (Capaian Pembelajaran) dan ATP ke modul ajar yang dirancang spesifik untuk mendukung model *Deep Learning* di setiap kelas.
            </p>
          </div>
          <Link to="/curriculum/documents/create" className="inline-flex mt-6 bg-white text-indigo-600 hover:bg-indigo-50 font-semibold px-4 py-2.5 rounded-lg w-max transition-colors text-sm items-center gap-2 relative z-10 shadow-sm">
            <FileText className="w-4 h-4" />
            Unggah Modul Baru
          </Link>
        </div>
      </div>
    </div>
  );
};
