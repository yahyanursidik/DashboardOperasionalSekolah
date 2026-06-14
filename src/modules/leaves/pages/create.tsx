import React, { useState } from "react";
import { useCreate, useSelect } from "@refinedev/core";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import { ArrowLeft, Save, Upload, FileText, Calendar } from "lucide-react";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";
import { supabaseClient } from "../../../lib/supabase/client";
import { toast } from "sonner";

const leaveTypes = [
  { value: 'sakit', label: 'Sakit' },
  { value: 'izin', label: 'Izin Pribadi' },
  { value: 'cuti_tahunan', label: 'Cuti Tahunan' },
  { value: 'cuti_melahirkan', label: 'Cuti Melahirkan' },
  { value: 'dinas_luar', label: 'Dinas Luar' },
  { value: 'lainnya', label: 'Lainnya' },
];

export const LeaveCreate: React.FC = () => {
  const navigate = useNavigate();
  const { activeYearId } = useAcademicYear();
  const { activeUnitId } = useCurrentUnit();
  const { mutate: createLeave, isLoading: isSaving } = useCreate();

  const [employeeId, setEmployeeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [leaveType, setLeaveType] = useState("sakit");
  const [reason, setReason] = useState("");
  
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { options: employeeOptions } = useSelect({ 
    resource: "employees", 
    optionLabel: "full_name", 
    optionValue: "id",
    filters: activeUnitId ? [{ field: "unit_id", operator: "eq", value: activeUnitId }] : []
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast.error("Ukuran file maksimal 5MB");
        e.target.value = '';
        return;
      }
      setFile(selectedFile);
    }
  };

  const uploadFile = async (): Promise<string | null> => {
    if (!file) return null;
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `leaves/${fileName}`;

      const { error } = await supabaseClient.storage
        .from('leave_documents')
        .upload(filePath, file);

      if (error) throw error;
      
      const { data } = supabaseClient.storage.from('leave_documents').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Gagal mengunggah dokumen");
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) return toast.error("Pilih pegawai terlebih dahulu");
    if (new Date(startDate) > new Date(endDate)) return toast.error("Tanggal selesai tidak boleh sebelum tanggal mulai");

    const proofUrl = await uploadFile();
    if (file && !proofUrl) return; // Jika ada file tapi gagal upload, batalkan submit

    createLeave({
      resource: "leave_requests",
      values: {
        employee_id: employeeId,
        start_date: startDate,
        end_date: endDate,
        leave_type: leaveType,
        reason,
        proof_document: proofUrl,
        status: 'pending',
        academic_year_id: activeYearId,
        unit_id: activeUnitId
      },
      successNotification: () => ({ message: "Pengajuan izin berhasil dibuat", type: "success" })
    }, {
      onSuccess: () => navigate("/leaves")
    });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Form Pengajuan Izin/Cuti"
        description="Isi formulir berikut untuk mengajukan ketidakhadiran pegawai."
      />

      <div className="bg-card rounded-xl border shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Pegawai</label>
            <select
              required
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background"
            >
              <option value="">-- Pilih Pegawai --</option>
              {employeeOptions?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipe Izin</label>
              <select
                required
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background"
              >
                {leaveTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2"><Calendar className="w-4 h-4"/> Rentang Tanggal</label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background"
                />
                <span className="text-muted-foreground">-</span>
                <input
                  type="date"
                  required
                  min={startDate}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Keterangan / Alasan Detail</label>
            <textarea
              required
              rows={3}
              placeholder="Jelaskan alasan izin/cuti secara singkat..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background resize-none"
            />
          </div>

          <div className="space-y-2 p-4 border rounded-lg bg-muted/30 border-dashed">
            <label className="text-sm font-medium flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-500" /> Lampiran Dokumen (Opsional)
            </label>
            <p className="text-xs text-muted-foreground mb-2">Upload surat keterangan dokter, surat undangan, atau bukti pendukung lainnya (Maks. 5MB, format gambar/PDF).</p>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileChange}
              className="block w-full text-sm text-muted-foreground
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-primary/10 file:text-primary
                hover:file:bg-primary/20
              "
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => navigate("/leaves")}
              className="flex items-center gap-2 px-6 py-2.5 border rounded-md hover:bg-muted transition-colors text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" /> Batal
            </button>
            <button
              type="submit"
              disabled={isSaving || isUploading}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-8 py-2.5 rounded-md hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm disabled:opacity-70"
            >
              {isUploading ? <Upload className="w-4 h-4 animate-bounce" /> : <Save className="w-4 h-4" />}
              {isUploading ? "Mengunggah..." : isSaving ? "Menyimpan..." : "Ajukan Izin"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
