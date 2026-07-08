import React, { useState, useMemo } from "react";
import { useShow, useList, useCreate, useDelete } from "@refinedev/core";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Users, UserPlus, Trash2, CheckCircle2, Clock, Search, BookOpen, Filter } from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { DeleteConfirmModal } from "../../../components/common/DeleteConfirmModal";
import { toast } from "sonner";

export const HalaqohShow: React.FC = () => {
  const { id } = useParams();
  const [isAdding, setIsAdding] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState("");
  
  // Search and Filters
  const [memberSearch, setMemberSearch] = useState("");
  const [filterUnit, setFilterUnit] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [studentSearch, setStudentSearch] = useState("");

  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: "", name: "" });

  const { queryResult } = useShow({
    resource: "tahfidz_halaqohs",
    id,
    meta: { select: "*, employees(name)" }
  });
  const halaqoh = queryResult?.data?.data;

  // Fetch current members
  const { data: membersData, isLoading: isLoadingMembers, refetch: refetchMembers } = useList({
    resource: "tahfidz_halaqoh_members",
    filters: [{ field: "halaqoh_id", operator: "eq", value: id }],
    meta: { select: "*, students(id, full_name, nis, nisn, class_id, classes(name, unit_id, units(id, name)))" },
    pagination: { mode: "off" }
  });
  const members = membersData?.data || [];
  const memberStudentIds = members.map(m => m.student_id);

  // Filter members by search
  const filteredMembers = useMemo(() => {
    if (!memberSearch) return members;
    return members.filter(m => 
      m.students?.full_name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.students?.nis?.includes(memberSearch)
    );
  }, [members, memberSearch]);

  // Fetch all active students for dropdown
  const { data: allStudents } = useList({
    resource: "students",
    filters: [{ field: "status", operator: "eq", value: "active" }],
    meta: { select: "id, full_name, class_id, classes(name, unit_id, units(id, name))" },
    pagination: { mode: "off" }
  });

  // Extract unique units and classes for filter dropdowns
  const availableUnits = useMemo(() => {
    const unitsMap = new Map();
    allStudents?.data?.forEach(s => {
      const u = s.classes?.units;
      if (u && !unitsMap.has(u.id)) {
        unitsMap.set(u.id, { id: u.id, name: u.name });
      }
    });
    return Array.from(unitsMap.values());
  }, [allStudents?.data]);

  const availableClasses = useMemo(() => {
    const classesMap = new Map();
    allStudents?.data?.forEach(s => {
      const c = s.classes;
      if (c && (!filterUnit || c.unit_id === filterUnit) && !classesMap.has(s.class_id)) {
        classesMap.set(s.class_id, { id: s.class_id, name: c.name });
      }
    });
    return Array.from(classesMap.values());
  }, [allStudents?.data, filterUnit]);

  const availableStudents = useMemo(() => {
    let list = allStudents?.data?.filter(s => !memberStudentIds.includes(s.id)) || [];
    
    if (filterUnit) {
      list = list.filter(s => s.classes?.unit_id === filterUnit);
    }
    if (filterClass) {
      list = list.filter(s => s.class_id === filterClass);
    }
    if (studentSearch) {
      list = list.filter(s => s.full_name?.toLowerCase().includes(studentSearch.toLowerCase()));
    }
    
    return list;
  }, [allStudents?.data, memberStudentIds, filterUnit, filterClass, studentSearch]);

  const { mutate: createMutate, isLoading: isCreating } = useCreate();
  const { mutate: deleteMutate } = useDelete();

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    
    createMutate({
      resource: "tahfidz_halaqoh_members",
      values: {
        halaqoh_id: id,
        student_id: selectedStudent,
      }
    }, {
      onSuccess: () => {
        toast.success("Siswa berhasil ditambahkan ke halaqoh");
        setSelectedStudent("");
        refetchMembers();
      },
      onError: () => {
        toast.error("Gagal menambahkan siswa");
      }
    });
  };

  const confirmRemoveMember = () => {
    deleteMutate({
      resource: "tahfidz_halaqoh_members",
      id: deleteModal.id,
    }, {
      onSuccess: () => {
        toast.success("Siswa berhasil dikeluarkan dari halaqoh");
        setDeleteModal({ isOpen: false, id: "", name: "" });
        refetchMembers();
      },
      onError: () => {
        toast.error("Gagal mengeluarkan siswa");
        setDeleteModal({ isOpen: false, id: "", name: "" });
      }
    });
  };

  return (
    <div className="space-y-6">
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: "", name: "" })}
        onConfirm={confirmRemoveMember}
        title="Keluarkan Anggota"
        message={`Apakah Anda yakin ingin mengeluarkan "${deleteModal.name}" dari halaqoh ini?`}
      />

      <div className="flex items-center gap-4">
        <Link
          to="/tahfidz-halaqohs"
          className="p-2 hover:bg-muted rounded-full transition-colors shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <PageHeader
          title={`Halaqoh: ${halaqoh?.name || "Memuat..."}`}
          description={`Muhaffizh: ${halaqoh?.employees?.name || "Belum ditentukan"}`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Info Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card border rounded-xl shadow-sm p-6 space-y-5">
            <h3 className="font-semibold text-lg flex items-center gap-2 border-b pb-3">
              <BookOpen className="w-5 h-5 text-emerald-600" />
              Informasi Halaqoh
            </h3>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">Nama Halaqoh</p>
                <p className="font-medium text-base">{halaqoh?.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Guru Pengampu</p>
                {halaqoh?.employee_id ? (
                  <Link to={`/employees/show/${halaqoh.employee_id}`} className="font-medium text-primary hover:underline">
                    {halaqoh.employees.name}
                  </Link>
                ) : (
                  <p className="font-medium text-muted-foreground italic">Belum ditentukan</p>
                )}
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Jadwal</p>
                {(halaqoh?.schedule_day || halaqoh?.schedule_time) ? (
                  <div className="flex items-center gap-1.5 font-medium">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    <span>{halaqoh.schedule_day || "-"}, {halaqoh.schedule_time || "-"}</span>
                  </div>
                ) : (
                  <p className="font-medium text-muted-foreground italic">Belum diatur</p>
                )}
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Total Anggota</p>
                <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-medium">
                  <Users className="w-3.5 h-3.5" />
                  {members.length} Siswa
                </div>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Deskripsi</p>
                <p className="font-medium">{halaqoh?.description || <span className="italic text-muted-foreground">Tidak ada deskripsi</span>}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Members List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border rounded-xl shadow-sm overflow-hidden flex flex-col h-[calc(100vh-200px)] min-h-[500px]">
            <div className="p-4 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-muted/20">
              <h3 className="font-semibold text-lg">Daftar Anggota Siswa</h3>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-48">
                  <input
                    type="text"
                    placeholder="Cari anggota..."
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
                <button
                  onClick={() => setIsAdding(!isAdding)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors shadow-sm text-sm font-medium whitespace-nowrap ${
                    isAdding 
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200' 
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  {isAdding ? <XIcon className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                  {isAdding ? "Batal" : "Tambah Anggota"}
                </button>
              </div>
            </div>

            {isAdding && (
              <div className="p-4 bg-emerald-50/50 border-b border-emerald-100 space-y-4">
                <div className="flex items-center gap-2 text-sm text-emerald-800 font-medium">
                  <Filter className="w-4 h-4" /> Filter Pencarian Siswa
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <select
                    value={filterUnit}
                    onChange={(e) => {
                      setFilterUnit(e.target.value);
                      setFilterClass("");
                      setSelectedStudent("");
                    }}
                    className="w-full flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:ring-emerald-500/20"
                  >
                    <option value="">Semua Unit</option>
                    {availableUnits.map((u: any) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                  
                  <select
                    value={filterClass}
                    onChange={(e) => {
                      setFilterClass(e.target.value);
                      setSelectedStudent("");
                    }}
                    disabled={!filterUnit}
                    className="w-full flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:ring-emerald-500/20 disabled:opacity-50"
                  >
                    <option value="">Semua Kelas</option>
                    {availableClasses.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>

                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Cari nama siswa..."
                      value={studentSearch}
                      onChange={(e) => {
                        setStudentSearch(e.target.value);
                        setSelectedStudent("");
                      }}
                      className="w-full pl-8 pr-3 py-1 h-9 border rounded-md text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                    <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <form onSubmit={handleAddMember} className="flex flex-col sm:flex-row gap-3 pt-2">
                  <select
                    required
                    value={selectedStudent}
                    onChange={(e) => setSelectedStudent(e.target.value)}
                    className="flex-1 flex h-10 rounded-md border border-emerald-200 bg-white px-3 py-2 text-sm shadow-sm focus:ring-emerald-500/20"
                  >
                    <option value="">-- Pilih Siswa dari Hasil Filter -- ({availableStudents.length} tersedia)</option>
                    {availableStudents.map((student: any) => (
                      <option key={student.id} value={student.id}>
                        {student.full_name} ({student.classes?.name || "Tanpa Kelas"})
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={isCreating || !selectedStudent}
                    className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm font-medium disabled:opacity-50 h-10"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Simpan
                  </button>
                </form>
              </div>
            )}

            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 border-b sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 font-semibold text-muted-foreground">Nama Siswa</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground">Unit</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground">Kelas</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {isLoadingMembers ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                        <div className="flex flex-col items-center justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                          <p>Memuat data anggota...</p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredMembers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mb-4">
                            <Users className="w-8 h-8 opacity-50" />
                          </div>
                          <h3 className="text-lg font-medium text-foreground mb-1">Tidak ada anggota</h3>
                          <p className="max-w-sm text-sm">
                            {memberSearch 
                              ? "Tidak ada siswa yang cocok dengan pencarian Anda." 
                              : "Belum ada anggota di halaqoh ini. Klik Tambah Anggota untuk memasukkan siswa."}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredMembers.map((member) => (
                      <tr key={member.id} className="hover:bg-muted/30 transition-colors group">
                        <td className="px-6 py-4">
                          <Link to={`/students/show/${member.student_id}`} className="font-bold text-gray-900 hover:text-primary transition-colors">
                            {member.students?.full_name}
                          </Link>
                          {member.students?.nis && (
                            <div className="text-xs text-muted-foreground font-mono mt-0.5">NIS: {member.students.nis}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">{member.students?.classes?.units?.name || "-"}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2 py-1 rounded bg-muted text-xs font-medium text-muted-foreground">
                            {member.students?.classes?.name || "Tanpa Kelas"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => setDeleteModal({ isOpen: true, id: member.id as string, name: member.students?.full_name || "Siswa" })}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 focus:opacity-100"
                            title="Keluarkan dari halaqoh"
                          >
                            <Trash2 className="w-4 h-4" /> <span className="text-xs font-medium">Keluarkan</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

// Helper for icon
const XIcon = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
  </svg>
);
