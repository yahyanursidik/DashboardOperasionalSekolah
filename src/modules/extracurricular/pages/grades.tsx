import React, { useState } from "react";
import { useList, useCreate, useUpdate } from "@refinedev/core";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Award, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

export const GradesList: React.FC = () => {
  const { data: programsData, isLoading: loadingPrograms } = useList({ resource: "extracurriculars", filters: [{ field: "is_active", operator: "eq", value: true }] });
  const { data: yearsData } = useList({ resource: "academic_years", sorters: [{ field: "name", order: "desc" }] });
  const { data: semestersData } = useList({ resource: "semesters" });

  const [selectedProgram, setSelectedProgram] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedSemester, setSelectedSemester] = useState<string>("");

  const { data: membersData, isLoading: loadingMembers } = useList({ 
    resource: "extracurricular_members",
    meta: {
      select: "*, students(full_name), external_students(full_name)"
    },
    filters: [
      { field: "extracurricular_id", operator: "eq", value: selectedProgram },
      { field: "status", operator: "eq", value: "ACTIVE" }
    ],
    queryOptions: { enabled: !!selectedProgram }
  });

  const { data: gradesData, isLoading: loadingGrades, refetch } = useList({
    resource: "extracurricular_grades",
    filters: [
      { field: "extracurricular_id", operator: "eq", value: selectedProgram },
      { field: "academic_year_id", operator: "eq", value: selectedYear },
      { field: "semester_id", operator: "eq", value: selectedSemester }
    ],
    queryOptions: { enabled: !!selectedProgram && !!selectedYear && !!selectedSemester }
  });

  const { mutate: createMany, isLoading: isCreating } = useCreate();
  const { mutate: update, isLoading: isUpdating } = useUpdate();
  const isSaving = isCreating || isUpdating;

  // Local state for grade inputs before saving
  const [gradeForm, setGradeForm] = useState<Record<string, { id?: string, score: string, description: string }>>({});

  // Sync server data to local form when loaded
  React.useEffect(() => {
    if (gradesData?.data && membersData?.data) {
      const newForm: any = {};
      membersData.data.forEach((member: any) => {
        const existingRecord = gradesData.data.find(g => g.member_id === member.id);
        newForm[member.id as string] = {
          id: existingRecord?.id,
          score: existingRecord?.score || '',
          description: existingRecord?.description || ''
        };
      });
      setGradeForm(newForm);
    }
  }, [gradesData, membersData]);

  const handleScoreChange = (memberId: string, score: string) => {
    setGradeForm(prev => ({ ...prev, [memberId]: { ...prev[memberId], score } }));
  };

  const handleDescChange = (memberId: string, description: string) => {
    setGradeForm(prev => ({ ...prev, [memberId]: { ...prev[memberId], description } }));
  };

  const handleSave = () => {
    if (!selectedProgram || !selectedYear || !selectedSemester) return;

    let promises = [];
    
    for (const memberId of Object.keys(gradeForm)) {
      const record = gradeForm[memberId];
      if (!record.score && !record.description) continue; // Skip empty records

      if (record.id) {
        // Update
        promises.push(new Promise((resolve, reject) => {
          update({ 
            resource: "extracurricular_grades", 
            id: record.id!, 
            values: { score: record.score, description: record.description } 
          }, { onSuccess: resolve, onError: reject });
        }));
      } else {
        // Create
        promises.push(new Promise((resolve, reject) => {
          createMany({ 
            resource: "extracurricular_grades", 
            values: { 
              extracurricular_id: selectedProgram, 
              member_id: memberId, 
              academic_year_id: selectedYear,
              semester_id: selectedSemester,
              score: record.score, 
              description: record.description 
            } 
          }, { onSuccess: resolve, onError: reject });
        }));
      }
    }

    if (promises.length === 0) {
      toast.info("Tidak ada nilai yang diinputkan.");
      return;
    }

    Promise.all(promises).then(() => {
      toast.success("Data nilai ekskul berhasil disimpan");
      refetch();
    }).catch(() => {
      toast.error("Terjadi kesalahan saat menyimpan data nilai");
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Penilaian Ekstrakurikuler"
        description="Input nilai rapor dan catatan perkembangan peserta ekskul."
      />
      
      <div className="bg-card border rounded-xl shadow-sm p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
        <div>
          <label className="block text-sm font-medium mb-1">Program Ekskul</label>
          <select 
            value={selectedProgram}
            onChange={(e) => setSelectedProgram(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-background"
            disabled={loadingPrograms}
          >
            <option value="">-- Pilih Program --</option>
            {programsData?.data?.map((p: any) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Tahun Ajaran</label>
          <select 
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-background"
          >
            <option value="">-- Pilih Tahun --</option>
            {yearsData?.data?.map((y: any) => (
              <option key={y.id} value={y.id}>{y.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Semester</label>
          <select 
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-background"
          >
            <option value="">-- Pilih Semester --</option>
            {semestersData?.data?.filter((s: any) => s.academic_year_id === selectedYear).map((s: any) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <button 
            onClick={handleSave} 
            disabled={!selectedProgram || !selectedYear || !selectedSemester || !membersData?.data?.length || isSaving}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors shadow-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSaving ? "Menyimpan..." : "Simpan Nilai"}
          </button>
        </div>
      </div>

      {selectedProgram && selectedYear && selectedSemester && (
        <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium border-b">
                <tr>
                  <th className="px-6 py-4 whitespace-nowrap">Nama Peserta</th>
                  <th className="px-6 py-4 whitespace-nowrap w-32 text-center">Nilai (Angka/Huruf)</th>
                  <th className="px-6 py-4 whitespace-nowrap">Catatan Perkembangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loadingMembers || loadingGrades ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center">
                      <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
                      <span className="text-muted-foreground text-sm">Memuat data peserta...</span>
                    </td>
                  </tr>
                ) : membersData?.data?.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Award className="w-12 h-12 text-muted-foreground mb-3 opacity-20" />
                        <p className="text-muted-foreground">Tidak ada peserta aktif di program ini.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  membersData?.data?.map((member: any) => {
                    const name = member.student_id ? member.students?.full_name : member.external_students?.full_name;
                    const record = gradeForm[member.id] || { score: '', description: '' };

                    return (
                      <tr key={member.id} className="hover:bg-muted/10 transition-colors">
                        <td className="px-6 py-4 font-medium">{name}</td>
                        <td className="px-6 py-4 text-center">
                          <input 
                            type="text" 
                            placeholder="A/B/C/90" 
                            value={record.score}
                            onChange={(e) => handleScoreChange(member.id, e.target.value)}
                            className="w-20 px-3 py-1.5 border rounded-md outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary text-sm bg-background text-center uppercase font-semibold"
                            maxLength={5}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <textarea 
                            placeholder="Catatan perkembangan, deskripsi capaian..." 
                            value={record.description}
                            onChange={(e) => handleDescChange(member.id, e.target.value)}
                            className="w-full px-3 py-2 border rounded-md outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary text-sm bg-background min-h-[40px] resize-y"
                            rows={1}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
