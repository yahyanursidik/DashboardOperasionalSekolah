import React from "react";
import { useList } from "@refinedev/core";
import { BookOpen, FileText, Layers, Palette, Users, BrainCircuit, LibraryBig, ArrowRight, ShieldCheck, Activity } from "lucide-react";
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

  const { data: subjectCurriculumsData } = useList({
    resource: "subject_curriculums",
    filters: activeUnitId ? [{ field: "subjects.unit_id", operator: "eq", value: activeUnitId }] : [],
    meta: { select: "*, subjects(unit_id)" },
    pagination: { mode: "off" }
  });

  const { data: paudCurriculumsData } = useList({
    resource: "paud_curriculums",
    filters: activeUnitId ? [{ field: "unit_id", operator: "eq", value: activeUnitId }] : [],
    pagination: { mode: "off" }
  });

  const subjects = subjectsData?.data || [];
  const subjectCurriculums = subjectCurriculumsData?.data || [];
  const paudCurriculums = paudCurriculumsData?.data || [];

  return (
    <div className="space-y-8 pb-8 animate-in fade-in duration-500">
      {/* Hero Section */}
      <div className="bg-primary rounded-3xl p-8 lg:p-12 text-primary-foreground shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 scale-150 transform translate-x-1/4 -translate-y-1/4 pointer-events-none">
          <BrainCircuit className="w-64 h-64" />
        </div>
        <div className="relative z-10 max-w-2xl space-y-5">
          <span className="inline-flex items-center gap-1.5 bg-primary-foreground/20 border border-primary-foreground/30 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md text-primary-foreground shadow-sm">
            <ShieldCheck className="w-4 h-4" /> Pusat Kurikulum & Pembelajaran
          </span>
          <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">Manajemen Kurikulum Modern</h1>
          <p className="text-primary-foreground/90 text-lg leading-relaxed font-medium">
            Sistem terintegrasi untuk menyusun Capaian Pembelajaran, Alur Tujuan Pembelajaran, Prota, Prosem, RPPM, dan Modul Ajar/RPPH secara runtut menggunakan paradigma Kurikulum Merdeka.
          </p>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card p-6 rounded-2xl border shadow-sm flex items-center gap-5 hover:border-primary/50 hover:shadow-md hover:ring-4 hover:ring-primary/10 transition-all relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:scale-110 transition-transform">
            <LibraryBig className="w-32 h-32 text-primary" />
          </div>
          <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
            <LibraryBig className="w-7 h-7" />
          </div>
          <div className="relative z-10">
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Mata Pelajaran</p>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="text-4xl font-black text-foreground tracking-tight">{subjects.length}</h3>
              <span className="text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md">Total Mapel</span>
            </div>
          </div>
        </div>

        <div className="bg-card p-6 rounded-2xl border shadow-sm flex items-center gap-5 hover:border-primary/50 hover:shadow-md hover:ring-4 hover:ring-primary/10 transition-all relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:scale-110 transition-transform">
            <BookOpen className="w-32 h-32 text-primary" />
          </div>
          <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
            <BookOpen className="w-7 h-7" />
          </div>
          <div className="relative z-10">
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Kurikulum SD</p>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="text-4xl font-black text-foreground tracking-tight">{subjectCurriculums.length}</h3>
              <span className="text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md">Kelas Tersusun</span>
            </div>
          </div>
        </div>

        <div className="bg-card p-6 rounded-2xl border shadow-sm flex items-center gap-5 hover:border-primary/50 hover:shadow-md hover:ring-4 hover:ring-primary/10 transition-all relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:scale-110 transition-transform">
            <Palette className="w-32 h-32 text-primary" />
          </div>
          <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
            <Palette className="w-7 h-7" />
          </div>
          <div className="relative z-10">
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Kurikulum PAUD</p>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="text-4xl font-black text-foreground tracking-tight">{paudCurriculums.length}</h3>
              <span className="text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md">Jenjang Tersusun</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Modules Navigation */}
      <div className="space-y-5">
        <div className="flex items-center gap-3 px-1">
          <div className="w-1.5 h-6 bg-primary rounded-full shadow-sm"></div>
          <h3 className="font-extrabold text-2xl text-foreground tracking-tight">Modul Administrasi</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link to="/curriculum/subjects" className="group block bg-card p-6 rounded-2xl border shadow-sm hover:border-primary/50 hover:shadow-md hover:ring-4 hover:ring-primary/10 transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="w-14 h-14 bg-primary/10 text-primary rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all shadow-sm">
                <BookOpen className="w-7 h-7" />
              </div>
              <span className="text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center text-sm font-bold bg-primary/10 px-3 py-1.5 rounded-full">Buka Modul <ArrowRight className="w-4 h-4 ml-1.5" /></span>
            </div>
            <h4 className="font-extrabold text-xl text-foreground mb-2">Mata Pelajaran & Kurikulum SD</h4>
            <p className="text-muted-foreground text-sm leading-relaxed font-medium">
              Kelola master data mata pelajaran (Nasional & Khas), serta susun kerangka Deep Learning: CP, ATP, Prota, Promes, dan 18 Pertemuan Modul Ajar (SD).
            </p>
          </Link>

          <Link to="/curriculum/paud" className="group block bg-card p-6 rounded-2xl border shadow-sm hover:border-primary/50 hover:shadow-md hover:ring-4 hover:ring-primary/10 transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="w-14 h-14 bg-primary/10 text-primary rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all shadow-sm">
                <Palette className="w-7 h-7" />
              </div>
              <span className="text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center text-sm font-bold bg-primary/10 px-3 py-1.5 rounded-full">Buka Modul <ArrowRight className="w-4 h-4 ml-1.5" /></span>
            </div>
            <h4 className="font-extrabold text-xl text-foreground mb-2">Kurikulum Tingkat PAUD</h4>
            <p className="text-muted-foreground text-sm leading-relaxed font-medium">
              Susun satu dokumen induk Fase Fondasi untuk KB, TK A, dan TK B berisi ATP, Prota, serta Prosem; lalu turunkan menjadi RPPM dan RPPH/Modul Ajar per tingkat.
            </p>
          </Link>

          <Link to="/curriculum/subjects/directory" className="group block bg-card p-6 rounded-2xl border shadow-sm hover:border-primary/50 hover:shadow-md hover:ring-4 hover:ring-primary/10 transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="w-14 h-14 bg-primary/10 text-primary rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all shadow-sm">
                <Users className="w-7 h-7" />
              </div>
              <span className="text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center text-sm font-bold bg-primary/10 px-3 py-1.5 rounded-full">Buka Modul <ArrowRight className="w-4 h-4 ml-1.5" /></span>
            </div>
            <h4 className="font-extrabold text-xl text-foreground mb-2">Direktori Guru Pengampu</h4>
            <p className="text-muted-foreground text-sm leading-relaxed font-medium">
              Pemetaan guru mata pelajaran ke setiap kelas, pengelolaan jam mengajar mingguan (JP), dan distribusi beban kerja tenaga pendidik.
            </p>
          </Link>

          <Link to="/curriculum/documents" className="group block bg-card p-6 rounded-2xl border shadow-sm hover:border-primary/50 hover:shadow-md hover:ring-4 hover:ring-primary/10 transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="w-14 h-14 bg-primary/10 text-primary rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all shadow-sm">
                <FileText className="w-7 h-7" />
              </div>
              <span className="text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center text-sm font-bold bg-primary/10 px-3 py-1.5 rounded-full">Buka Modul <ArrowRight className="w-4 h-4 ml-1.5" /></span>
            </div>
            <h4 className="font-extrabold text-xl text-foreground mb-2">Dokumen Pendukung</h4>
            <p className="text-muted-foreground text-sm leading-relaxed font-medium">
              Repositori dokumen kurikulum tambahan. Unggah dan kelola file PDF pendukung seperti instrumen asesmen, pedoman, atau SK Kurikulum.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
};
