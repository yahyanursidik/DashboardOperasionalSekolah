import React, { useState } from "react";
import { useShow, useList, useCreate, useDelete } from "@refinedev/core";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Users, UserPlus, Trash2, CheckCircle2 } from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";

export const TahsinHalaqohShow: React.FC = () => {
  const { id } = useParams();
  const [isAdding, setIsAdding] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState("");

  const { queryResult } = useShow({
    resource: "tahsin_halaqohs",
    id,
    meta: { select: "*, employees(full_name)" }
  });
  const halaqoh = queryResult?.data?.data;

  // Fetch current members
  const { data: membersData, isLoading: isLoadingMembers, refetch: refetchMembers } = useList({
    resource: "tahfidz_halaqoh_members",
    filters: [{ field: "halaqoh_id", operator: "eq", value: id }],
    meta: { select: "*, students(id, full_name, nis, nisn, classes(name))" },
    pagination: { mode: "off" }
  });
  const members = membersData?.data || [];
  const memberStudentIds = members.map(m => m.student_id);

  // Fetch all active students for dropdown
  const { data: allStudents } = useList({
    resource: "students",
    filters: [{ field: "status", operator: "eq", value: "active" }],
    meta: { select: "id, full_name, classes(name)" },
    pagination: { mode: "off" }
  });

  const availableStudents = allStudents?.data?.filter(s => !memberStudentIds.includes(s.id)) || [];

  const { mutate: createMutate, isLoading: isCreating } = useCreate();
  const { mutate: deleteMutate } = useDelete();

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    
    createMutate({
      resource: "tahfidz_halaqoh_members", // Still using the same mapping table
      values: {
        halaqoh_id: id,
        student_id: selectedStudent,
      }
    }, {
      onSuccess: () => {
        setIsAdding(false);
        setSelectedStudent("");
        refetchMembers();
      }
    });
  };

  const handleRemoveMember = (memberId: string) => {
    if (window.confirm("Keluarkan santri dari halaqoh tahsin ini?")) {
      deleteMutate({
        resource: "tahfidz_halaqoh_members",
        id: memberId,
      }, {
        onSuccess: () => refetchMembers()
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to="/tahsin-halaqohs"
          className="p-2 hover:bg-muted rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <PageHeader
          title={`Halaqoh Tahsin: ${halaqoh?.name || "Memuat..."}`}
          description={`Guru Tahsin: ${halaqoh?.employees?.full_name || "Belum ditentukan"}`}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Info Card */}
        <div className="col-span-1 space-y-6">
          <div className="bg-card border rounded-xl shadow-sm p-6 space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2 border-b pb-2">
              <Users className="w-5 h-5 text-emerald-600" />
              Informasi Halaqoh
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">Nama Halaqoh</p>
                <p className="font-medium text-base">{halaqoh?.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Guru Pengampu</p>
                <p className="font-medium">{halaqoh?.employees?.full_name || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Anggota</p>
                <p className="font-medium">{members.length} Santri</p>
              </div>
              <div>
                <p className="text-muted-foreground">Deskripsi</p>
                <p className="font-medium">{halaqoh?.description || "Tidak ada deskripsi"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Members List */}
        <div className="col-span-1 md:col-span-2 space-y-6">
          <div className="bg-card border rounded-xl shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b flex items-center justify-between bg-muted/20">
              <h3 className="font-semibold text-lg">Daftar Anggota Santri</h3>
              <button
                onClick={() => setIsAdding(!isAdding)}
                className="flex items-center gap-2 bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm text-sm font-medium"
              >
                {isAdding ? <XIcon className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                {isAdding ? "Batal" : "Tambah Anggota"}
              </button>
            </div>

            {isAdding && (
              <div className="p-4 bg-emerald-50 border-b border-emerald-100">
                <form onSubmit={handleAddMember} className="flex gap-2">
                  <select
                    required
                    value={selectedStudent}
                    onChange={(e) => setSelectedStudent(e.target.value)}
                    className="flex-1 flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  >
                    <option value="">-- Pilih Santri --</option>
                    {availableStudents.map(student => (
                      <option key={student.id} value={student.id}>
                        {student.full_name} ({student.classes?.name || "Tanpa Kelas"})
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={isCreating || !selectedStudent}
                    className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm font-medium disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Simpan
                  </button>
                </form>
              </div>
            )}

            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 border-b sticky top-0">
                  <tr>
                    <th className="px-6 py-3 font-semibold text-muted-foreground">Nama Santri</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground">Kelas</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground">NIS</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {isLoadingMembers ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                        Memuat data anggota...
                      </td>
                    </tr>
                  ) : members.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center">
                        <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-muted-foreground font-medium">Belum ada anggota di halaqoh tahsin ini</p>
                        <p className="text-sm text-muted-foreground/80 mt-1">Klik tombol Tambah Anggota untuk memasukkan santri.</p>
                      </td>
                    </tr>
                  ) : (
                    members.map((member) => (
                      <tr key={member.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4 font-bold text-gray-900">{member.students?.full_name}</td>
                        <td className="px-6 py-4">{member.students?.classes?.name || "-"}</td>
                        <td className="px-6 py-4 font-mono text-xs">{member.students?.nis || "-"}</td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleRemoveMember(member.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-flex items-center gap-1"
                            title="Keluarkan dari halaqoh"
                          >
                            <Trash2 className="w-4 h-4" /> <span className="sr-only">Hapus</span>
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
