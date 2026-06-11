import React, { useState } from "react";
import { useShow, useList, useCreate, useDelete, useSelect } from "@refinedev/core";
import { PageHeader } from "../../../components/layout/PageHeader";
import { User, Edit, ArrowLeft, Briefcase, GraduationCap, Building, Phone, Mail, MapPin, X, Plus, Trash2, FolderOpen, History } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";

export const TeacherShow: React.FC = () => {
  const { queryResult } = useShow({
    meta: { select: "*, units(name)" }
  });
  const { data, isLoading } = queryResult;
  const navigate = useNavigate();
  const record = data?.data;
  
  const { activeYearId } = useAcademicYear();

  // Assignments data
  const { data: assignmentsData, isLoading: assignmentsLoading, refetch: refetchAssignments } = useList({
    resource: "teacher_assignments",
    filters: [
      { field: "teacher_id", operator: "eq", value: record?.id },
      { field: "academic_year_id", operator: "eq", value: activeYearId }
    ],
    meta: { select: "*, units(name), classes(name)" },
    queryOptions: { enabled: !!record?.id && !!activeYearId }
  });

  const { mutate: deleteAssignment } = useDelete();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [assignmentType, setAssignmentType] = useState("wali_kelas");
  const [unitId, setUnitId] = useState("");
  const [classId, setClassId] = useState("");
  const [subject, setSubject] = useState("");

  const { options: unitOptions } = useSelect({ resource: "units", optionLabel: "name", optionValue: "id" });
  const { options: classOptions } = useSelect({ 
    resource: "classes", 
    optionLabel: "name", 
    optionValue: "id",
    filters: unitId ? [{ field: "unit_id", operator: "eq", value: unitId }] : [],
    queryOptions: { enabled: !!unitId }
  });

  const { mutate: createAssignment, isLoading: isAssigning } = useCreate();

  const handleCreateAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    createAssignment({
      resource: "teacher_assignments",
      values: {
        teacher_id: record?.id,
        unit_id: unitId,
        class_id: classId || null,
        role: assignmentType,
        subject: subject || null,
        academic_year_id: activeYearId,
        is_active: true
      },
      successNotification: () => ({ message: "Penugasan Berhasil Ditambahkan", type: "success" })
    }, {
      onSuccess: () => {
        setIsModalOpen(false);
        refetchAssignments();
        // Reset form
        setUnitId(""); setClassId(""); setSubject("");
      }
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-20 bg-muted animate-pulse rounded-xl"></div>
        <div className="h-64 bg-muted animate-pulse rounded-xl"></div>
      </div>
    );
  }

  if (!record) {
    return <div className="p-8 text-center text-muted-foreground">Pegawai tidak ditemukan.</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profil Pegawai"
        description="Detail informasi dan penugasan akademik pegawai."
        action={
          <div className="flex gap-2">
            <button
              onClick={() => navigate("/teachers")}
              className="flex items-center gap-2 bg-white text-muted-foreground border px-4 py-2 rounded-md hover:bg-muted transition-colors shadow-sm font-medium text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali
            </button>
            <Link
              to={`/teachers/edit/${record.id}`}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm"
            >
              <Edit className="w-4 h-4" />
              Ubah Data
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card rounded-xl border shadow-sm p-6 text-center">
            <div className="w-24 h-24 mx-auto rounded-full bg-emerald-50 flex items-center justify-center border-4 border-white shadow-sm mb-4">
              <User className="w-12 h-12 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold">{record.full_name}</h2>
            <p className="text-sm text-muted-foreground mb-4">{record.role_title || "Pegawai"}</p>
            
            <div className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border mb-6 ${record.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
              Status: {record.status} ({record.is_active ? 'Aktif' : 'Suspend'})
            </div>

            <div className="text-left border-t pt-4 space-y-4">
              <div className="flex items-start gap-3 text-sm">
                <Building className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">{record.units?.name || "Belum Ditentukan"}</p>
                  <p className="text-xs text-muted-foreground">Unit Utama</p>
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">{record.phone || "-"}</p>
                  <p className="text-xs text-muted-foreground">No. Handphone / WA</p>
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">{record.email || "-"}</p>
                  <p className="text-xs text-muted-foreground">Alamat Email</p>
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">{record.address || "-"}</p>
                  <p className="text-xs text-muted-foreground">Alamat Domisili</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border shadow-sm p-6">
            <h3 className="font-semibold text-sm flex items-center gap-2 mb-4 text-muted-foreground">
              <FolderOpen className="w-4 h-4" /> Dokumen Kepegawaian
            </h3>
            <div className="bg-muted/30 border border-dashed rounded-lg p-6 text-center">
              <p className="text-xs text-muted-foreground">Modul dokumen belum diaktifkan.</p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-xl border shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-emerald-600" /> Penugasan Pegawai
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Tahun Ajaran Aktif: <span className="font-medium text-foreground">TA 2024/2025</span>
                </p>
              </div>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="text-sm flex items-center gap-1 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-md font-medium hover:bg-emerald-100 transition-colors"
              >
                <Plus className="w-4 h-4" /> Tambah Penugasan
              </button>
            </div>
            
            {assignmentsLoading ? (
              <p className="text-sm text-muted-foreground animate-pulse">Memuat penugasan...</p>
            ) : assignmentsData?.data?.length === 0 ? (
              <div className="bg-muted/30 border border-dashed rounded-lg p-8 text-center">
                <p className="text-sm text-muted-foreground">Pegawai ini belum memiliki penugasan di Tahun Ajaran aktif.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {assignmentsData?.data?.map((assignment: any) => {
                  const roles: Record<string, string> = {
                    wali_kelas: "Wali Kelas",
                    guru_mapel: "Guru Mata Pelajaran",
                    guru_quran: "Guru Al-Qur'an",
                    guru_diniyah: "Guru Diniyah",
                    staff: "Staff Non-Akademik"
                  };
                  return (
                    <div key={assignment.id} className="border rounded-xl p-4 flex items-center justify-between hover:border-emerald-500/50 transition-colors bg-background">
                      <div className="flex gap-4 items-center">
                        <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                          <GraduationCap className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{roles[assignment.role] || assignment.role}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <span className="bg-muted px-2 py-0.5 rounded-md">{assignment.units?.name || "Umum"}</span>
                            {assignment.classes && (
                              <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-medium">
                                Kelas: {assignment.classes.name}
                              </span>
                            )}
                            {assignment.subject && <span>Mata Pelajaran: <strong className="text-foreground">{assignment.subject}</strong></span>}
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          if (confirm("Hapus penugasan ini?")) {
                            deleteAssignment({ resource: "teacher_assignments", id: assignment.id, successNotification: () => ({ message: "Penugasan dihapus", type: "success" }) }, { onSuccess: () => refetchAssignments() });
                          }
                        }}
                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                        title="Hapus Penugasan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-card rounded-xl border shadow-sm p-6">
            <h3 className="font-semibold text-sm flex items-center gap-2 mb-4 text-muted-foreground">
              <History className="w-4 h-4" /> Riwayat Audit (Log Aktivitas)
            </h3>
            <div className="bg-muted/30 border border-dashed rounded-lg p-6 text-center">
              <p className="text-xs text-muted-foreground">Log aktivitas belum tersedia.</p>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: Tambah Penugasan */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-4 border-b flex items-center justify-between bg-muted/30">
              <h3 className="font-semibold text-lg">Tambah Penugasan Baru</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-md hover:bg-muted"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-6">
              <form onSubmit={handleCreateAssignment} className="space-y-4">
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Jenis Penugasan</label>
                  <select 
                    required 
                    value={assignmentType}
                    onChange={(e) => setAssignmentType(e.target.value)}
                    className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                  >
                    <option value="wali_kelas">Wali Kelas</option>
                    <option value="guru_mapel">Guru Mata Pelajaran</option>
                    <option value="guru_quran">Guru Al-Qur'an / Tahfizh</option>
                    <option value="guru_diniyah">Guru Diniyah</option>
                    <option value="staff">Staff Non-Akademik</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Unit Pendidikan <span className="text-destructive">*</span></label>
                  <select 
                    required 
                    value={unitId}
                    onChange={(e) => { setUnitId(e.target.value); setClassId(""); }}
                    className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                  >
                    <option value="">-- Pilih Unit --</option>
                    {unitOptions?.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                  </select>
                </div>

                {['wali_kelas', 'guru_mapel', 'guru_quran', 'guru_diniyah'].includes(assignmentType) && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Kelas {assignmentType === 'wali_kelas' && <span className="text-destructive">*</span>}</label>
                    <select 
                      required={assignmentType === 'wali_kelas'}
                      value={classId}
                      onChange={(e) => setClassId(e.target.value)}
                      className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                      disabled={!unitId}
                    >
                      <option value="">-- Pilih Kelas --</option>
                      {classOptions?.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                    {!unitId && <p className="text-[10px] text-muted-foreground">Pilih unit terlebih dahulu.</p>}
                  </div>
                )}

                {['guru_mapel', 'guru_diniyah'].includes(assignmentType) && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Mata Pelajaran <span className="text-destructive">*</span></label>
                    <input 
                      required
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Contoh: Matematika"
                      className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                )}

                {assignmentType === 'staff' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Deskripsi Tugas / Peran</label>
                    <input 
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Contoh: Administrasi Keuangan"
                      className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                )}

                <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mt-4">
                  <p className="text-xs text-amber-800">
                    Penugasan ini akan otomatis terikat dengan Tahun Ajaran <strong>TA 2024/2025</strong>.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm border rounded-md hover:bg-muted">Batal</button>
                  <button type="submit" disabled={isAssigning} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-70">
                    {isAssigning ? "Menyimpan..." : "Simpan Penugasan"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
