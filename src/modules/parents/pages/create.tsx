import React from "react";
import { ParentForm } from "../components/parent-form";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export const ParentCreate: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Tambah Orang Tua / Wali" 
        description="Masukkan data kontak wali yang siap dipakai untuk komunikasi sekolah dan relasi siswa."
        action={
          <Link
            to="/parents"
            className="flex items-center gap-2 bg-white text-muted-foreground border px-4 py-2 rounded-md hover:bg-muted transition-colors shadow-sm font-medium text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Daftar Wali
          </Link>
        }
      />
      <ParentForm action="create" />
    </div>
  );
};
