import React, { useState } from "react";
import { useTable } from "@refinedev/react-table";
import { useList, useDelete } from "@refinedev/core";
import { flexRender } from "@tanstack/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { useNavigate } from "react-router-dom";
import {
  Eye,
  Edit,
  Plus,
  Search,
  FilterX,
  UploadCloud,
  Download,
  FileSpreadsheet,
  Trash2,
  AlertTriangle,
  Loader2,
  ClipboardCheck,
  GraduationCap,
  HeartPulse,
  School,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Link } from "react-router-dom";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";
import Papa from "papaparse";
import { supabaseClient } from "../../../lib/supabase/client";
import { toast } from "sonner";
import { Modal } from "../../../components/common/Modal";

// Helper function to calculate completeness
export const calculateCompleteness = (student: any) => {
  const fields = [
    "full_name", "gender", "unit_id", "nis", 
    "nisn", "class_id", "birth_place", "date_of_birth", "address"
  ];
  const filled = fields.filter(f => student[f] !== null && student[f] !== "").length;
  return Math.round((filled / fields.length) * 100);
};

const hasValue = (value: unknown) => value !== null && value !== undefined && String(value).trim() !== "";

export const getStudentQualitySummary = (student: any, hasLinkedGuardian = false) => {
  const score = calculateCompleteness(student);
  const hasIdentity = hasValue(student.full_name) && hasValue(student.gender) && hasValue(student.nis);
  const hasNationalIdentity = hasValue(student.nisn);
  const hasClass = hasValue(student.class_id);
  const hasAddress = hasValue(student.address);
  const hasGuardianContact =
    hasLinkedGuardian ||
    hasValue(student.parent_phone) ||
    hasValue(student.phone_number) ||
    hasValue(student.phone) ||
    hasValue(student.emergency_contact_phone);
  const hasHealthAttention =
    hasValue(student.allergies) ||
    hasValue(student.medical_history) ||
    hasValue(student.special_needs) ||
    hasValue(student.health_notes) ||
    hasValue(student.emergency_contact_phone);

  const missing: string[] = [];
  if (!hasIdentity) missing.push("Identitas dasar");
  if (!hasNationalIdentity) missing.push("NISN");
  if (!hasClass) missing.push("Kelas");
  if (!hasAddress) missing.push("Alamat");
  if (!hasGuardianContact) missing.push("Kontak wali");

  const ready = student.status === "active" && hasIdentity && hasClass && hasGuardianContact && score >= 80;

  return {
    score,
    ready,
    hasIdentity,
    hasNationalIdentity,
    hasClass,
    hasAddress,
    hasGuardianContact,
    hasHealthAttention,
    missing,
  };
};

// --- DELETE CONFIRM MODAL ---
const DeleteConfirmModal: React.FC<{
  isOpen: boolean;
  studentName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}> = ({ isOpen, studentName, onConfirm, onCancel, isDeleting }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => !isDeleting && onCancel()}></div>
      <div className="relative bg-card w-full max-w-md rounded-xl shadow-xl border overflow-hidden">
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold mb-2">Hapus Data Siswa?</h3>
          <p className="text-muted-foreground text-sm">
            Apakah Anda yakin ingin menghapus data <span className="font-semibold text-foreground">{studentName}</span>?
            Tindakan ini tidak dapat dibatalkan. Pastikan data tidak berelasi dengan tabel lain.
          </p>
        </div>
        <div className="flex bg-muted/30 p-4 border-t gap-3 justify-end">
          <button onClick={onCancel} disabled={isDeleting} className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-muted transition-colors">Batal</button>
          <button onClick={onConfirm} disabled={isDeleting} className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors flex items-center gap-2">
            {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
            Hapus Permanen
          </button>
        </div>
      </div>
    </div>
  );
};

export const StudentsList: React.FC = () => {
  const navigate = useNavigate();
  const { activeUnitId } = useCurrentUnit();

  // Local Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [filterUnit, setFilterUnit] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterGender, setFilterGender] = useState("");
  const [filterStatus, setFilterStatus] = useState("active");

  // Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadUnitId, setUploadUnitId] = useState("");
  const [uploadClassId, setUploadClassId] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);

  // Delete State
  const { mutate: deleteMutate, isLoading: isDeleting } = useDelete();
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; name: string }>({ isOpen: false, id: "", name: "" });

  const { data: units } = useList({ resource: "units", pagination: { mode: "off" } });
  const { data: classes } = useList({ 
    resource: "classes", 
    filters: (activeUnitId || filterUnit) ? [{ field: "unit_id", operator: "eq", value: activeUnitId || filterUnit }] : [],
    pagination: { mode: "off" } 
  });

  const buildFilters = () => {
    const filters: any[] = [];
    
    // Prioritize activeUnitId from global context, otherwise use local filterUnit
    if (activeUnitId) {
      filters.push({ field: "unit_id", operator: "eq", value: activeUnitId });
    } else if (filterUnit) {
      filters.push({ field: "unit_id", operator: "eq", value: filterUnit });
    }

    if (filterClass) filters.push({ field: "class_id", operator: "eq", value: filterClass });
    if (filterGender) filters.push({ field: "gender", operator: "eq", value: filterGender });
    if (filterStatus) filters.push({ field: "status", operator: "eq", value: filterStatus });
    if (searchTerm) filters.push({ field: "full_name", operator: "ilike", value: `%${searchTerm}%` });
    
    return filters;
  };

  const qualityFilters = React.useMemo(
    () => buildFilters(),
    [activeUnitId, filterUnit, filterClass, filterGender, filterStatus, searchTerm]
  );

  const { data: qualityStudentsData, isLoading: isQualityLoading } = useList({
    resource: "students",
    filters: qualityFilters,
    pagination: { mode: "off" },
    meta: {
      select: "*, units(name), classes(name)",
    },
  });

  const { data: parentLinksData } = useList({
    resource: "student_parent_links",
    pagination: { mode: "off" },
    meta: { select: "student_id, is_primary, parents(full_name, phone)" },
  });

  const guardianStudentIds = React.useMemo(() => {
    const ids = new Set<string>();
    parentLinksData?.data?.forEach((link: any) => {
      if (link.student_id) ids.add(link.student_id);
    });
    return ids;
  }, [parentLinksData?.data]);

  const qualityMetrics = React.useMemo(() => {
    const students = qualityStudentsData?.data || [];
    return students.reduce(
      (acc, student: any) => {
        const quality = getStudentQualitySummary(student, guardianStudentIds.has(student.id));
        acc.total += 1;
        if (student.status === "active") acc.active += 1;
        if (quality.ready) acc.ready += 1;
        if (!quality.hasClass) acc.noClass += 1;
        if (!quality.hasGuardianContact) acc.noGuardian += 1;
        if (quality.hasHealthAttention) acc.healthWatch += 1;
        if (quality.missing.length > 0 || quality.score < 80) acc.incomplete += 1;
        return acc;
      },
      { total: 0, active: 0, ready: 0, noClass: 0, noGuardian: 0, incomplete: 0, healthWatch: 0 }
    );
  }, [qualityStudentsData?.data, guardianStudentIds]);

  const downloadTemplate = () => {
    const csvContent = "Nama Siswa,NIS,Jenjang,Jenis Kelamin,Tanggal Lahir,Alamat lengkap,Nama Ayah/Wali,Nama Ibu\nSiswa Contoh,2425001,SD,L,2010-05-15,Jl. Merdeka No 1,Ayah Contoh,Ibu Contoh";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "Template_Upload_Siswa.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadFile(file);
      
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
          setPreviewData(results.data);
        }
      });
    }
  };

  const processUpload = async () => {
    if (!uploadUnitId) {
      toast.error("Pilih Unit Sekolah terlebih dahulu!");
      return;
    }
    if (!uploadFile) {
      toast.error("Pilih file CSV yang akan diunggah!");
      return;
    }
    
    setIsUploading(true);
    
    try {
      const validRows = previewData.filter((row: any) => row['Nama Siswa']);
      
      if (validRows.length === 0) {
        toast.error("File CSV kosong atau format tidak sesuai.");
        setIsUploading(false);
        return;
      }

      const { data: existingStudents, error: fetchError } = await supabaseClient
        .from('students')
        .select('id, full_name, date_of_birth')
        .eq('unit_id', uploadUnitId);
        
      if (fetchError) throw fetchError;

      let skippedCount = 0;
      const studentsToInsert = validRows.map((row: any) => ({
        full_name: row['Nama Siswa'],
        nis: row['NIS']?.toString().trim() || `TEMP-${Math.floor(100000 + Math.random() * 900000)}`,
        nisn: null,
        gender: row['Jenis Kelamin'] === 'P' || row['Jenis Kelamin']?.toLowerCase() === 'perempuan' ? 'P' : 'L',
        birth_place: null,
        date_of_birth: row['Tanggal Lahir'] || null,
        address: row['Alamat lengkap'] || null,
        unit_id: uploadUnitId,
        class_id: uploadClassId || null,
        status: 'active'
      })).filter((newStudent: any) => {
        const exists = existingStudents.some((existing: any) => 
          existing.full_name?.toLowerCase() === newStudent.full_name?.toLowerCase() &&
          (!newStudent.date_of_birth || existing.date_of_birth === newStudent.date_of_birth)
        );
        if (exists) skippedCount++;
        return !exists;
      });

      let allProcessedStudents: any[] = [];

      if (studentsToInsert.length > 0) {
        const { data: insertedStudents, error } = await supabaseClient
          .from('students')
          .insert(studentsToInsert)
          .select('id, full_name, date_of_birth');
        
        if (error) throw error;
        if (insertedStudents) {
          allProcessedStudents = [...allProcessedStudents, ...insertedStudents];
        }
      }

      // Tambahkan existing students yang ada di validRows ke allProcessedStudents
      (existingStudents as any[])?.forEach(existing => {
        const isInCsv = validRows.some((r: any) => 
          existing.full_name?.toLowerCase() === r['Nama Siswa']?.toLowerCase() &&
          (!r['Tanggal Lahir'] || existing.date_of_birth === r['Tanggal Lahir'])
        );
        if (isInCsv) {
           allProcessedStudents.push(existing);
        }
      });

      // Process Parents
      const parentNames = new Set<string>();
      const studentParentLinksMap: { studentId: string, fatherName: string | null, motherName: string | null }[] = [];
      
      allProcessedStudents.forEach((student) => {
        const row = validRows.find((r: any) => 
           r['Nama Siswa']?.toLowerCase() === student.full_name?.toLowerCase()
        );
        if (row) {
          const fatherName = row['Nama Ayah/Wali']?.trim() || null;
          const motherName = row['Nama Ibu']?.trim() || null;
          
          if (fatherName) parentNames.add(fatherName);
          if (motherName) parentNames.add(motherName);
          
          studentParentLinksMap.push({
             studentId: student.id,
             fatherName,
             motherName
          });
        }
      });

      let parentsCount = 0;
      if (parentNames.size > 0) {
          const uniqueNames = Array.from(parentNames);
          
          // Fetch existing parents to avoid duplicate creation
          const { data: existingParents, error: fetchParentsError } = await supabaseClient
             .from('parents')
             .select('id, full_name')
             .in('full_name', uniqueNames);
             
          if (fetchParentsError) throw fetchParentsError;
          
          const parentIdMap = new Map<string, string>(); // Name -> ID
          (existingParents as any[])?.forEach(p => parentIdMap.set(p.full_name, p.id));
          
          // Determine which parents are completely new
          const newParentsToInsert = uniqueNames
             .filter(name => !parentIdMap.has(name))
             .map(name => ({ full_name: name, is_active: true }));
             
          if (newParentsToInsert.length > 0) {
             const { data: insertedParents, error: insertParentsError } = await supabaseClient
               .from('parents')
               .insert(newParentsToInsert)
               .select('id, full_name');
               
             if (insertParentsError) {
                console.error("Parent insert error:", insertParentsError);
                throw new Error("Gagal mengunggah data orang tua: " + insertParentsError.message);
             }
             
             (insertedParents as any[])?.forEach(p => parentIdMap.set(p.full_name, p.id));
          }
          
          parentsCount = newParentsToInsert.length;
          
          // Create Links
          const linksToInsert: any[] = [];
          studentParentLinksMap.forEach(map => {
             if (map.fatherName && parentIdMap.has(map.fatherName)) {
                linksToInsert.push({
                   student_id: map.studentId,
                   parent_id: parentIdMap.get(map.fatherName),
                   relationship: 'father',
                   is_primary: true
                });
             }
             if (map.motherName && parentIdMap.has(map.motherName)) {
                linksToInsert.push({
                   student_id: map.studentId,
                   parent_id: parentIdMap.get(map.motherName),
                   relationship: 'mother',
                   is_primary: false
                });
             }
          });
          
          if (linksToInsert.length > 0) {
             const studentIds = studentParentLinksMap.map(m => m.studentId);
             const { data: existingLinks } = await supabaseClient
                .from('student_parent_links')
                .select('student_id, parent_id')
                .in('student_id', studentIds);
                
             const existingLinksSet = new Set((existingLinks as any[])?.map(l => `${l.student_id}-${l.parent_id}`) || []);
             const finalLinks = linksToInsert.filter(l => !existingLinksSet.has(`${l.student_id}-${l.parent_id}`));
             
             if (finalLinks.length > 0) {
                 const { error: linksError } = await supabaseClient.from('student_parent_links').insert(finalLinks);
                 if (linksError) {
                    console.error("Links insert error:", linksError);
                    throw new Error("Gagal menautkan data orang tua: " + linksError.message);
                 }
             }
          }
      }
      
      toast.success(`Berhasil mengunggah ${studentsToInsert.length} siswa, serta memastikan ${parentNames.size} data orang tua terhubung! ${skippedCount > 0 ? `(${skippedCount} siswa di-skip)` : ''}`);
      setIsUploadModalOpen(false);
      setUploadFile(null);
      setPreviewData([]);
      setUploadClassId("");
      
      tableQueryResult.refetch();
    } catch (error: any) {
      console.error(error);
      toast.error("Gagal mengunggah data: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = () => {
    if (!deleteModal.id) return;
    deleteMutate(
      { resource: "students", id: deleteModal.id },
      {
        onSuccess: () => {
          toast.success("Siswa berhasil dihapus!");
          setDeleteModal({ isOpen: false, id: "", name: "" });
          tableQueryResult.refetch();
        },
        onError: (error: any) => {
          console.error(error);
          toast.error("Gagal menghapus siswa. Data mungkin berelasi dengan tabel lain.");
        }
      }
    );
  };

  const columns = React.useMemo<ColumnDef<any>[]>(
    () => [
      {
        id: "full_name",
        accessorKey: "full_name",
        header: "Nama Siswa",
        cell: function render({ row, getValue }) {
          const photoUrl = row.original.photo_url;
          return (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden border">
                {photoUrl ? (
                  <img 
                    src={photoUrl.startsWith('http') ? photoUrl : `https://ebdkupeqmpqrdfketgab.supabase.co/storage/v1/object/public/school-documents/${photoUrl}`}
                    alt={getValue<string>()}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="font-bold text-primary/50 text-xs">
                    {getValue<string>().charAt(0)}
                  </span>
                )}
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-foreground">{getValue<string>()}</span>
                {row.original.nickname && (
                  <span className="text-xs text-muted-foreground">Panggilan: {row.original.nickname}</span>
                )}
              </div>
            </div>
          );
        },
      },
      {
        id: "nis",
        accessorKey: "nis",
        header: "NIS / NISN",
        cell: function render({ row }) {
          return (
            <div className="flex flex-col text-sm">
              <span className="font-mono">{row.original.nis}</span>
              <span className="text-xs text-muted-foreground">{row.original.nisn || "-"}</span>
            </div>
          );
        },
      },
      {
        id: "gender",
        accessorKey: "gender",
        header: "L/P",
        cell: function render({ getValue }) {
          return getValue() === "L" ? "Ikhwan (L)" : "Akhawat (P)";
        },
      },
      {
        id: "unit",
        header: "Unit",
        cell: function render({ row }) {
          const u = row.original.units as any;
          const name = Array.isArray(u) ? u[0]?.name : u?.name;
          return <span className="text-xs font-bold px-2 py-1 bg-muted rounded-md">{name || "-"}</span>;
        },
      },
      {
        id: "class",
        header: "Kelas",
        cell: function render({ row }) {
          const c = row.original.classes as any;
          const name = Array.isArray(c) ? c[0]?.name : c?.name;
          return <span className="font-medium">{name || "Belum ada"}</span>;
        },
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Status",
        cell: function render({ getValue }) {
          const status = getValue<string>();
          const styles: Record<string, { bg: string, text: string, border: string, dot: string, label: string }> = {
            active: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500", label: "Aktif" },
            inactive: { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200", dot: "bg-slate-400", label: "Nonaktif" },
            graduated: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200", dot: "bg-indigo-500", label: "Lulus" },
            transferred: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-500", label: "Pindah" },
            dropped_out: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", dot: "bg-rose-500", label: "Dikeluarkan" },
          };
          const style = styles[status] || styles.active;
          return (
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-full border ${style.bg} ${style.text} ${style.border}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${style.dot} ${status === 'active' ? 'animate-pulse' : ''}`} />
              {style.label}
            </div>
          );
        },
      },
      {
        id: "completeness",
        header: "Kesiapan Data",
        cell: function render({ row }) {
          const quality = getStudentQualitySummary(row.original, guardianStudentIds.has(row.original.id));
          const score = quality.score;
          const color = score === 100 ? "text-emerald-600" : score >= 70 ? "text-amber-600" : "text-destructive";
          const missingPreview = quality.missing.slice(0, 2);
          return (
            <div className="min-w-[190px] space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-24 bg-muted rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full ${score === 100 ? 'bg-emerald-500' : score >= 70 ? 'bg-amber-500' : 'bg-destructive'}`} style={{ width: `${score}%` }}></div>
                </div>
                <span className={`text-xs font-semibold ${color}`}>{score}%</span>
                {quality.ready && (
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Siap
                  </span>
                )}
              </div>
              {missingPreview.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {missingPreview.map((item) => (
                    <span key={item} className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100">
                      {item}
                    </span>
                  ))}
                  {quality.missing.length > missingPreview.length && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      +{quality.missing.length - missingPreview.length}
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">Data utama lengkap</p>
              )}
            </div>
          );
        },
      },
      {
        id: "actions",
        accessorKey: "id",
        header: "Aksi",
        cell: function render({ row, getValue }) {
          return (
            <div className="flex items-center gap-1">
              <button
                onClick={() => navigate(`/students/show/${getValue()}`)}
                className="p-1.5 text-muted-foreground hover:text-primary transition-colors rounded-md hover:bg-primary/10"
                title="Lihat Detail"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate(`/students/edit/${getValue()}`)}
                className="p-1.5 text-muted-foreground hover:text-blue-600 transition-colors rounded-md hover:bg-blue-50"
                title="Ubah Data"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => setDeleteModal({ isOpen: true, id: getValue() as string, name: row.original.full_name })}
                className="p-1.5 text-muted-foreground hover:text-red-600 transition-colors rounded-md hover:bg-red-50"
                title="Hapus"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        },
      },
    ],
    [navigate, guardianStudentIds]
  );

  const { refineCore: { tableQueryResult, setFilters }, ...table } = useTable({
    columns,
    refineCoreProps: {
      resource: "students",
      meta: {
        select: "*, units(name), classes(name)",
      }
    },
  });

  React.useEffect(() => {
    setFilters(qualityFilters, "replace");
  }, [qualityFilters]);

  const isLoading = tableQueryResult.isLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data & Mutu Siswa"
        description="Pusat data induk siswa, kesiapan kelas, kontak wali, kesehatan, dan mutasi akademik."
        action={
          <div className="flex items-center gap-2">
            <Link
              to="/students/mass-promotion"
              className="flex items-center gap-2 bg-emerald-50 text-emerald-600 border border-emerald-200 px-4 py-2 rounded-md hover:bg-emerald-100 transition-colors shadow-sm font-medium text-sm"
            >
              <GraduationCap className="w-4 h-4" />
              Naik Kelas / Mutasi
            </Link>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center gap-2 bg-blue-50 text-blue-600 border border-blue-200 px-4 py-2 rounded-md hover:bg-blue-100 transition-colors shadow-sm font-medium text-sm"
            >
              <UploadCloud className="w-4 h-4" />
              Import CSV
            </button>
            <Link
              to="/students/create"
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm"
            >
              <Plus className="w-4 h-4" />
              Tambah Siswa
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
        {[
          {
            label: "Siswa Aktif",
            value: qualityMetrics.active,
            helper: `${qualityMetrics.total} data sesuai filter`,
            icon: Users,
            tone: "bg-blue-50 text-blue-700 border-blue-100",
          },
          {
            label: "Siap Operasional",
            value: qualityMetrics.ready,
            helper: "Identitas, kelas, dan kontak siap",
            icon: ShieldCheck,
            tone: "bg-emerald-50 text-emerald-700 border-emerald-100",
          },
          {
            label: "Belum Ada Kelas",
            value: qualityMetrics.noClass,
            helper: "Berdampak ke absensi dan rapor",
            icon: School,
            tone: "bg-amber-50 text-amber-700 border-amber-100",
          },
          {
            label: "Kontak Wali Kosong",
            value: qualityMetrics.noGuardian,
            helper: "Berdampak ke portal orang tua",
            icon: UserCheck,
            tone: "bg-rose-50 text-rose-700 border-rose-100",
          },
          {
            label: "Perhatian Kesehatan",
            value: qualityMetrics.healthWatch,
            helper: "Ada alergi, riwayat, atau kontak darurat",
            icon: HeartPulse,
            tone: "bg-violet-50 text-violet-700 border-violet-100",
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className={`rounded-lg border p-4 ${item.tone}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider opacity-80">{item.label}</p>
                  <p className="text-2xl font-bold mt-1">{isQualityLoading ? "-" : item.value}</p>
                </div>
                <Icon className="w-5 h-5 opacity-80" />
              </div>
              <p className="text-xs mt-2 opacity-80">{item.helper}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-card rounded-xl border shadow-sm p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-primary" />
              Alur kerja kesiswaan
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Gunakan urutan ini agar data siswa siap dipakai oleh kelas, absensi, rapor, pembayaran, portal wali, dan rekam jejak.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/classes" className="px-3 py-2 text-sm border rounded-md hover:bg-muted transition-colors">Kelola Kelas</Link>
            <Link to="/parents" className="px-3 py-2 text-sm border rounded-md hover:bg-muted transition-colors">Tautkan Wali</Link>
            <Link to="/attendance" className="px-3 py-2 text-sm border rounded-md hover:bg-muted transition-colors">Absensi</Link>
            <Link to="/student-journals" className="px-3 py-2 text-sm border rounded-md hover:bg-muted transition-colors">Jurnal Siswa</Link>
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="bg-card rounded-xl border shadow-sm p-4 space-y-4">
        
        {/* Search Bar */}
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Ketik nama siswa untuk mencari..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border rounded-md text-sm outline-none focus:ring-2 focus:ring-primary/50 font-medium"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-end gap-3">
          {!activeUnitId && (
            <div className="space-y-1.5 flex-1 min-w-[140px]">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Unit Sekolah</label>
              <select value={filterUnit} onChange={(e) => setFilterUnit(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                <option value="">Semua Unit</option>
                {units?.data?.map(u => <option key={u.id} value={u.id as string}>{u.name}</option>)}
              </select>
            </div>
          )}

          <div className="space-y-1.5 flex-1 min-w-[140px]">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Kelas</label>
            <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
              <option value="">Semua Kelas</option>
              {classes?.data?.map(c => <option key={c.id} value={c.id as string}>{c.name}</option>)}
            </select>
          </div>

          <div className="space-y-1.5 flex-1 min-w-[140px]">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
              <option value="">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="inactive">Nonaktif</option>
              <option value="graduated">Lulus</option>
              <option value="transferred">Pindah</option>
            </select>
          </div>

          <div className="space-y-1.5 flex-1 min-w-[140px]">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">L / P</label>
            <select value={filterGender} onChange={(e) => setFilterGender(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
              <option value="">Semua (L/P)</option>
              <option value="L">Ikhwan</option>
              <option value="P">Akhawat</option>
            </select>
          </div>

          <button 
            onClick={() => { setSearchTerm(""); setFilterUnit(""); setFilterClass(""); setFilterGender(""); setFilterStatus(""); }}
            className="px-4 py-2 border rounded-md text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex items-center gap-2 h-[38px]"
          >
            <FilterX className="w-4 h-4" /> Reset
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-card rounded-xl border shadow-sm overflow-hidden min-h-[400px] flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground space-y-4 p-12">
            <div className="animate-pulse flex flex-col items-center gap-4 w-full max-w-md">
              <div className="h-10 bg-muted w-full rounded-md"></div>
              <div className="h-10 bg-muted w-full rounded-md"></div>
              <div className="h-10 bg-muted w-full rounded-md"></div>
              <div className="h-10 bg-muted w-full rounded-md"></div>
            </div>
            <p className="animate-pulse">Memuat data siswa...</p>
          </div>
        ) : table.getRowModel().rows.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-16 text-center">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
              <Search className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold mb-1">Data Tidak Ditemukan</h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              Tidak ada siswa yang cocok dengan filter saat ini. Ubah kriteria filter atau tambah siswa baru.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium border-b">
                {table.getHeaderGroups().map((headerGroup: any) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header: any) => (
                      <th key={header.id} className="px-6 py-4 whitespace-nowrap">
                        {!header.isPlaceholder && flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-border">
                {table.getRowModel().rows.map((row: any) => (
                  <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                    {row.getVisibleCells().map((cell: any) => (
                      <td key={cell.id} className="px-6 py-3 whitespace-nowrap">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!isLoading && table.getRowModel().rows.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/20 mt-auto">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Halaman <strong>{table.getState().pagination.pageIndex + 1}</strong> dari <strong>{table.getPageCount()}</strong>
              </span>
              <select
                value={table.getState().pagination.pageSize}
                onChange={(e) => table.setPageSize(Number(e.target.value))}
                className="bg-background border border-input rounded-md text-sm px-2 py-1 ml-4 focus:ring-1 focus:ring-primary outline-none"
              >
                {[10, 20, 30, 40, 50].map((pageSize) => (
                  <option key={pageSize} value={pageSize}>
                    Tampilkan {pageSize}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="px-3 py-1 text-sm border rounded-md hover:bg-muted disabled:opacity-50 transition-colors"
              >
                Sebelumnya
              </button>
              <button
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="px-3 py-1 text-sm border rounded-md hover:bg-muted disabled:opacity-50 transition-colors"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <Modal isOpen={isUploadModalOpen} onClose={() => !isUploading && setIsUploadModalOpen(false)} title="Upload Masal Data Siswa">
        <div className="space-y-4">
          <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm flex gap-3 items-start border border-blue-100">
            <FileSpreadsheet className="w-5 h-5 shrink-0 mt-0.5 text-blue-600" />
            <div>
              <p className="font-semibold mb-1">Panduan Upload</p>
              <ul className="list-disc pl-4 space-y-1 text-blue-700/80">
                <li>Unduh template CSV terlebih dahulu jika belum memilikinya.</li>
                <li>Isi data siswa sesuai format pada template. Kolom <b>Nama Siswa</b> wajib diisi. (Kolom <b>NIS</b> opsional, akan diisi otomatis jika kosong)</li>
                <li>Pilih Unit dan Kelas (opsional) pada form di bawah, sehingga Anda tidak perlu mengetik ID Unit/Kelas di file.</li>
              </ul>
            </div>
          </div>

          <button
            onClick={downloadTemplate}
            className="w-full flex items-center justify-center gap-2 bg-white border-2 border-dashed border-gray-300 text-gray-700 hover:border-primary hover:text-primary px-4 py-3 rounded-xl transition-all font-medium text-sm"
          >
            <Download className="w-4 h-4" />
            Download Template CSV
          </button>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Unit Sekolah <span className="text-red-500">*</span></label>
              <select 
                value={uploadUnitId} 
                onChange={(e) => { setUploadUnitId(e.target.value); setUploadClassId(""); }} 
                className="w-full border rounded-md px-3 py-2 outline-none focus:border-primary text-sm"
              >
                <option value="">-- Pilih Unit --</option>
                {units?.data?.map(u => <option key={u.id} value={u.id as string}>{u.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Kelas (Opsional)</label>
              <select 
                value={uploadClassId} 
                onChange={(e) => setUploadClassId(e.target.value)} 
                className="w-full border rounded-md px-3 py-2 outline-none focus:border-primary text-sm"
                disabled={!uploadUnitId}
              >
                <option value="">-- Pilih Kelas --</option>
                {classes?.data?.filter(c => c.unit_id === uploadUnitId).map(c => (
                  <option key={c.id} value={c.id as string}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Upload File CSV</label>
            <input 
              type="file" 
              accept=".csv"
              onChange={handleFileChange}
              className="w-full border rounded-md px-3 py-2 text-sm file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
            />
          </div>

          {previewData.length > 0 && (
            <div className="bg-gray-50 p-3 rounded-lg border text-sm text-center">
              Ditemukan <span className="font-bold text-primary">{previewData.filter(r => r['Nama Siswa']).length}</span> baris data siswa yang valid siap untuk diunggah.
            </div>
          )}

          <div className="pt-4 flex justify-end gap-3 border-t mt-4">
            <button 
              onClick={() => setIsUploadModalOpen(false)}
              disabled={isUploading}
              className="px-4 py-2 border rounded-md text-gray-600 hover:bg-gray-50 text-sm font-medium"
            >
              Batal
            </button>
            <button 
              onClick={processUpload}
              disabled={isUploading || !uploadUnitId || !uploadFile}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 text-sm font-medium disabled:opacity-50 flex items-center gap-2"
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Mengunggah...
                </>
              ) : (
                "Mulai Upload"
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        studentName={deleteModal.name}
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal({ isOpen: false, id: "", name: "" })}
        isDeleting={isDeleting}
      />
    </div>
  );
};
