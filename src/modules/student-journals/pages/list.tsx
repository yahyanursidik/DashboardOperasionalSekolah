import React, { useState } from "react";
import { useList, useDelete } from "@refinedev/core";
import { Link, useNavigate } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import { BookOpen, Plus, Filter, Calendar, MapPin, Eye, Edit, Trash2, ShieldAlert, Award, Star, Activity, AlertTriangle } from "lucide-react";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";

export const StudentJournalsList: React.FC = () => {
  const navigate = useNavigate();
  const { activeUnitId } = useCurrentUnit();
  const { activeYearId } = useAcademicYear();
  const { mutate: deleteJournal } = useDelete();

  const [filterCategory, setFilterCategory] = useState("");
  const [filterVisibility, setFilterVisibility] = useState("");
  const [filterSemesterId, setFilterSemesterId] = useState("");

  const { data: semestersData } = useList({
    resource: "semesters",
    filters: activeYearId ? [{ field: "academic_year_id", operator: "eq", value: activeYearId }] : [],
    pagination: { mode: "off" }
  });

  const filters: any[] = [];
  if (filterCategory) filters.push({ field: "category", operator: "eq", value: filterCategory });
  if (filterVisibility) filters.push({ field: "visibility", operator: "eq", value: filterVisibility });
  if (activeUnitId) filters.push({ field: "unit_id", operator: "eq", value: activeUnitId });
  if (activeYearId) filters.push({ field: "academic_year_id", operator: "eq", value: activeYearId });

  if (filterSemesterId && semestersData?.data) {
    const sem = semestersData.data.find(s => s.id === filterSemesterId);
    if (sem) {
      filters.push({ field: "date_recorded", operator: "gte", value: sem.start_date });
      filters.push({ field: "date_recorded", operator: "lte", value: sem.end_date });
    }
  }

  const { data, isLoading } = useList({
    resource: "student_journals",
    meta: { select: "*, students(full_name, nis), employees(full_name)" },
    filters,
    sorters: [{ field: "date_recorded", order: "desc" }, { field: "created_at", order: "desc" }],
    pagination: { pageSize: 50 }
  });

  const getCategoryDetails = (category: string) => {
    switch(category) {
      case 'akademik': return { icon: <BookOpen className="w-4 h-4" />, label: 'Akademik', color: 'text-blue-600 bg-blue-50 border-blue-200' };
      case 'karakter': return { icon: <Star className="w-4 h-4" />, label: 'Karakter', color: 'text-purple-600 bg-purple-50 border-purple-200' };
      case 'kendala': return { icon: <AlertTriangle className="w-4 h-4" />, label: 'Kendala Belajar', color: 'text-amber-600 bg-amber-50 border-amber-200' };
      case 'ekskul': return { icon: <Award className="w-4 h-4" />, label: 'Ekskul & Bakat', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' };
      case 'kasus': return { icon: <ShieldAlert className="w-4 h-4" />, label: 'Kasus/Disiplin', color: 'text-red-600 bg-red-50 border-red-200' };
      case 'kesehatan': return { icon: <Activity className="w-4 h-4" />, label: 'Kesehatan/UKS', color: 'text-rose-600 bg-rose-50 border-rose-200' };
      case 'anekdot': return { icon: <Eye className="w-4 h-4" />, label: 'Catatan Anekdot', color: 'text-teal-600 bg-teal-50 border-teal-200' };
      case 'stppa': return { icon: <Star className="w-4 h-4 fill-current" />, label: 'STPPA', color: 'text-indigo-600 bg-indigo-50 border-indigo-200' };
      default: return { icon: <BookOpen className="w-4 h-4" />, label: category, color: 'text-slate-600 bg-slate-50 border-slate-200' };
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Jurnal & Rekam Jejak Siswa"
        description="Pencatatan perkembangan, kendala, kasus, dan observasi anekdot siswa."
        action={
          <Link
            to="/student-journals/create"
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm"
          >
            <Plus className="w-4 h-4" /> Tulis Jurnal
          </Link>
        }
      />

      <div className="flex gap-4 items-center bg-card p-3 rounded-xl border shadow-sm flex-wrap">
        <Filter className="w-4 h-4 text-muted-foreground ml-2" />
        <select 
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="border rounded-md px-3 py-1.5 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="">Semua Kategori</option>
          <option value="akademik">Akademik</option>
          <option value="karakter">Karakter & Perilaku</option>
          <option value="kendala">Kendala Belajar</option>
          <option value="ekskul">Ekskul & Bakat</option>
          <option value="kesehatan">Kesehatan/UKS</option>
          <option value="kasus">Kasus/Pelanggaran</option>
          <option value="anekdot">Catatan Anekdot</option>
          <option value="stppa">STPPA (PAUD)</option>
        </select>

        <select 
          value={filterVisibility}
          onChange={(e) => setFilterVisibility(e.target.value)}
          className="border rounded-md px-3 py-1.5 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="">Semua Visibilitas</option>
          <option value="internal">Hanya Internal (Sekolah)</option>
          <option value="parents">Bisa Dilihat Orang Tua</option>
        </select>

        <select 
          value={filterSemesterId}
          onChange={(e) => setFilterSemesterId(e.target.value)}
          className="border rounded-md px-3 py-1.5 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="">Semua Semester (Tahun Aktif)</option>
          {semestersData?.data?.map((sem: any) => (
            <option key={sem.id} value={sem.id}>Semester {sem.name}</option>
          ))}
        </select>
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground animate-pulse">Memuat data jurnal...</div>
        ) : (
          <div className="divide-y divide-border">
            {data?.data.map((journal) => {
              const cat = getCategoryDetails(journal.category);
              return (
                <div key={journal.id} className="p-4 sm:p-5 hover:bg-muted/30 transition-colors flex flex-col sm:flex-row gap-4">
                  <div className="w-48 shrink-0 space-y-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {new Date(journal.date_recorded).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{journal.students?.full_name}</p>
                      <p className="text-xs text-muted-foreground">NIS: {journal.students?.nis}</p>
                    </div>
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-4">
                      <h4 className="font-semibold text-base line-clamp-1">{journal.title}</h4>
                      <div className="flex gap-2 shrink-0">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border ${cat.color}`}>
                          {cat.icon} {cat.label}
                        </span>
                        {journal.visibility === 'parents' && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200" title="Bisa dilihat oleh orang tua">
                            Ortu
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                      {journal.description}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
                      <span className="flex items-center gap-1">
                        Pencatat: {journal.employees?.full_name || 'Admin'}
                      </span>
                      {journal.action_taken && (
                        <span className="flex items-center gap-1 truncate max-w-[200px]" title={journal.action_taken}>
                          <strong>Tindakan:</strong> {journal.action_taken}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:pl-4 sm:border-l shrink-0 pt-2 sm:pt-0">
                     <button 
                      onClick={() => navigate(`/student-journals/edit/${journal.id}`)}
                      className="p-1.5 text-muted-foreground hover:text-primary transition-colors bg-muted rounded-md"
                      title="Edit Jurnal"
                    ><Edit className="w-4 h-4"/></button>
                    <button 
                      onClick={() => { if(confirm('Hapus rekam jejak ini?')) deleteJournal({ resource: "student_journals", id: journal.id as string }) }}
                      className="p-1.5 text-muted-foreground hover:text-destructive transition-colors bg-muted rounded-md"
                      title="Hapus Jurnal"
                    ><Trash2 className="w-4 h-4"/></button>
                  </div>
                </div>
              );
            })}
            {(!data?.data || data.data.length === 0) && (
              <div className="text-center p-12 text-muted-foreground">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>Belum ada rekaman jurnal/jejak siswa.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
