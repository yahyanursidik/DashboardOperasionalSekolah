import React from "react";
import { useShow, useList, useDelete } from "@refinedev/core";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Plus, Edit, Trash2, FileText, BookOpen } from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";

export const SubjectShow: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { mutate: deleteCurriculum } = useDelete();

  const { queryResult } = useShow({
    resource: "subjects",
    id,
    meta: { select: "*, units(name)" }
  });
  const subject = queryResult?.data?.data;

  const { data: curriculumsData, isLoading: curriculumsLoading } = useList({
    resource: "subject_curriculums",
    filters: [{ field: "subject_id", operator: "eq", value: id }],
    sorters: [{ field: "grade_level", order: "asc" }],
    meta: { select: "*, academic_years(name)" }
  });

  if (queryResult.isLoading) return <div className="p-8 text-center text-muted-foreground">Memuat data...</div>;
  if (!subject) return <div className="p-8 text-center text-rose-500">Mata pelajaran tidak ditemukan.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/curriculum/subjects" className="p-2 hover:bg-muted rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <PageHeader 
          title={`Detail Mata Pelajaran: ${subject.name}`} 
          description={`${subject.code ? subject.code + ' - ' : ''}Kategori: ${subject.category} | Unit: ${subject.units?.name || '-'}`}
          action={
            <Link
              to={`/curriculum/subjects/edit/${id}`}
              className="flex items-center gap-2 border px-4 py-2 rounded-md hover:bg-muted transition-colors font-medium text-sm"
            >
              <Edit className="w-4 h-4" /> Edit Mapel
            </Link>
          }
        />
      </div>

      <div className="bg-card rounded-xl border shadow-sm p-6">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Kurikulum & Modul Ajar (Per Jenjang Kelas)
            </h3>
            <p className="text-sm text-muted-foreground mt-1">Kelola CP, ATP, Prota, Prosem, dan Modul Ajar (Deep Learning) untuk tiap jenjang kelas.</p>
          </div>
          <Link
            to={`/curriculum/subject-curriculums/create?subject_id=${id}`}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm"
          >
            <Plus className="w-4 h-4" /> Tambah Kurikulum Kelas
          </Link>
        </div>

        {curriculumsLoading ? (
          <div className="py-8 text-center text-muted-foreground">Memuat kurikulum...</div>
        ) : curriculumsData?.data?.length === 0 ? (
          <div className="py-12 text-center border-2 border-dashed rounded-xl bg-muted/20">
            <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            <h4 className="font-medium text-slate-700">Belum ada data kurikulum</h4>
            <p className="text-sm text-muted-foreground mt-1">Tambahkan kurikulum untuk jenjang kelas tertentu pada mata pelajaran ini.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {curriculumsData?.data?.map((curr: any) => (
              <div key={curr.id} className="border rounded-xl p-5 hover:border-primary/50 transition-colors bg-background shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200 mb-2">
                      Kelas {curr.grade_level}
                    </div>
                    <h4 className="font-semibold text-slate-800">Tahun Ajaran: {curr.academic_years?.name || '-'}</h4>
                  </div>
                  <div className="flex gap-1">
                    <Link
                      to={`/curriculum/subject-curriculums/edit/${curr.id}`}
                      className="p-1.5 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => {
                        if (confirm("Hapus kurikulum kelas ini?")) {
                          deleteCurriculum({ resource: "subject_curriculums", id: curr.id });
                        }
                      }}
                      className="p-1.5 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                      title="Hapus"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className={`p-2 rounded border ${curr.cp_text ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                    {curr.cp_text ? '✓ CP Terisi' : '✗ CP Kosong'}
                  </div>
                  <div className={`p-2 rounded border ${curr.atp_text ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                    {curr.atp_text ? '✓ ATP Terisi' : '✗ ATP Kosong'}
                  </div>
                  <div className={`p-2 rounded border ${Array.isArray(curr.prota_data) && curr.prota_data.length > 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                    {Array.isArray(curr.prota_data) && curr.prota_data.length > 0 ? '✓ Prota Terisi' : '✗ Prota Kosong'}
                  </div>
                  <div className={`p-2 rounded border ${curr.prosem_data && Array.isArray(curr.prosem_data.rows) && curr.prosem_data.rows.length > 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                    {curr.prosem_data && Array.isArray(curr.prosem_data.rows) && curr.prosem_data.rows.length > 0 ? '✓ Prosem Terisi' : '✗ Prosem Kosong'}
                  </div>
                  <div className={`p-2 rounded border col-span-2 ${Array.isArray(curr.learning_plan_data) && curr.learning_plan_data.length > 0 ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                    {Array.isArray(curr.learning_plan_data) && curr.learning_plan_data.length > 0 ? '✓ Modul Ajar (Deep Learning) Siap' : '✗ Modul Ajar Belum Ada'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
