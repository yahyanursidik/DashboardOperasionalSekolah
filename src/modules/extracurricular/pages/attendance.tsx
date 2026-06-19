import React, { useState } from "react";
import { useList, useCreate, useUpdate } from "@refinedev/core";
import { PageHeader } from "../../../components/layout/PageHeader";
import { CheckSquare, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

export const AttendanceList: React.FC = () => {
  const { data: programsData, isLoading: loadingPrograms } = useList({ resource: "extracurriculars", filters: [{ field: "is_active", operator: "eq", value: true }] });
  const [selectedProgram, setSelectedProgram] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

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

  const { data: attendanceData, isLoading: loadingAttendance, refetch } = useList({
    resource: "extracurricular_attendances",
    filters: [
      { field: "extracurricular_id", operator: "eq", value: selectedProgram },
      { field: "date", operator: "eq", value: selectedDate }
    ],
    queryOptions: { enabled: !!selectedProgram && !!selectedDate }
  });

  const { mutate: createMany, isLoading: isCreating } = useCreate();
  const { mutate: update, isLoading: isUpdating } = useUpdate();
  const isSaving = isCreating || isUpdating;

  // Local state for attendance inputs before saving
  const [attendanceForm, setAttendanceForm] = useState<Record<string, { id?: string, status: string, notes: string }>>({});

  // Sync server data to local form when loaded
  React.useEffect(() => {
    if (attendanceData?.data && membersData?.data) {
      const newForm: any = {};
      membersData.data.forEach((member: any) => {
        const existingRecord = attendanceData.data.find(a => a.member_id === member.id);
        newForm[member.id as string] = {
          id: existingRecord?.id,
          status: existingRecord?.status || 'PRESENT',
          notes: existingRecord?.notes || ''
        };
      });
      setAttendanceForm(newForm);
    }
  }, [attendanceData, membersData]);

  const handleStatusChange = (memberId: string, status: string) => {
    setAttendanceForm(prev => ({ ...prev, [memberId]: { ...prev[memberId], status } }));
  };

  const handleNotesChange = (memberId: string, notes: string) => {
    setAttendanceForm(prev => ({ ...prev, [memberId]: { ...prev[memberId], notes } }));
  };

  const handleSave = () => {
    if (!selectedProgram || !selectedDate) return;

    // We process sequentially or batch if supported. For simplicity, we can do multiple updates/creates, or a single bulk create if your backend supports it.
    // Refine's useCreate can take an array of values if backend bulk inserts are supported, otherwise we map.
    // Let's assume we need to update existing ones and create new ones.
    
    let promises = [];
    
    for (const memberId of Object.keys(attendanceForm)) {
      const record = attendanceForm[memberId];
      if (record.id) {
        // Update
        promises.push(new Promise((resolve, reject) => {
          update({ 
            resource: "extracurricular_attendances", 
            id: record.id!, 
            values: { status: record.status, notes: record.notes } 
          }, { onSuccess: resolve, onError: reject });
        }));
      } else {
        // Create
        promises.push(new Promise((resolve, reject) => {
          createMany({ 
            resource: "extracurricular_attendances", 
            values: { 
              extracurricular_id: selectedProgram, 
              member_id: memberId, 
              date: selectedDate, 
              status: record.status, 
              notes: record.notes 
            } 
          }, { onSuccess: resolve, onError: reject });
        }));
      }
    }

    if (promises.length === 0) return;

    Promise.all(promises).then(() => {
      toast.success("Data absensi berhasil disimpan");
      refetch();
    }).catch(() => {
      toast.error("Terjadi kesalahan saat menyimpan data absensi");
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Absensi Ekstrakurikuler"
        description="Catat kehadiran peserta program ekstrakurikuler per pertemuan."
      />
      
      <div className="bg-card border rounded-xl shadow-sm p-4 sm:p-6 flex flex-col sm:flex-row gap-4 items-end">
        <div className="w-full sm:w-1/2">
          <label className="block text-sm font-medium mb-1">Pilih Program Ekskul</label>
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
        <div className="w-full sm:w-1/4">
          <label className="block text-sm font-medium mb-1">Tanggal Pertemuan</label>
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
        <div className="w-full sm:w-1/4">
          <button 
            onClick={handleSave} 
            disabled={!selectedProgram || !membersData?.data?.length || isSaving}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors shadow-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSaving ? "Menyimpan..." : "Simpan Absensi"}
          </button>
        </div>
      </div>

      {selectedProgram && (
        <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium border-b">
                <tr>
                  <th className="px-6 py-4 whitespace-nowrap">Nama Peserta</th>
                  <th className="px-6 py-4 whitespace-nowrap">Status Kehadiran</th>
                  <th className="px-6 py-4 whitespace-nowrap">Catatan Tambahan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loadingMembers || loadingAttendance ? (
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
                        <CheckSquare className="w-12 h-12 text-muted-foreground mb-3 opacity-20" />
                        <p className="text-muted-foreground">Tidak ada peserta aktif di program ini.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  membersData?.data?.map((member: any) => {
                    const name = member.student_id ? member.students?.full_name : member.external_students?.full_name;
                    const record = attendanceForm[member.id] || { status: 'PRESENT', notes: '' };

                    return (
                      <tr key={member.id} className="hover:bg-muted/10 transition-colors">
                        <td className="px-6 py-4 font-medium">{name}</td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            {['PRESENT', 'ABSENT', 'SICK', 'PERMISSION'].map(status => (
                              <button
                                key={status}
                                onClick={() => handleStatusChange(member.id, status)}
                                className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                                  record.status === status 
                                    ? status === 'PRESENT' ? 'bg-green-100 text-green-700 border-green-200'
                                      : status === 'ABSENT' ? 'bg-red-100 text-red-700 border-red-200'
                                      : status === 'SICK' ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
                                      : 'bg-blue-100 text-blue-700 border-blue-200'
                                    : 'bg-background text-muted-foreground hover:bg-muted'
                                }`}
                              >
                                {status === 'PRESENT' ? 'Hadir' : status === 'ABSENT' ? 'Alpa' : status === 'SICK' ? 'Sakit' : 'Izin'}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <input 
                            type="text" 
                            placeholder="Catatan..." 
                            value={record.notes}
                            onChange={(e) => handleNotesChange(member.id, e.target.value)}
                            className="w-full px-3 py-1.5 border rounded-md outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary text-sm bg-background"
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
