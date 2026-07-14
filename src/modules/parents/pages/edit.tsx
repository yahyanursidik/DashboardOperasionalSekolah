import React from "react";
import { ParentForm } from "../components/parent-form";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Eye } from "lucide-react";

export const ParentEdit: React.FC = () => {
  const { id } = useParams();

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Ubah Data Orang Tua / Wali" 
        description="Perbarui informasi kontak, status komunikasi, dan data diri wali siswa."
        action={
          <div className="flex items-center gap-2">
            <Link
              to="/parents"
              className="flex items-center gap-2 bg-white text-muted-foreground border px-4 py-2 rounded-md hover:bg-muted transition-colors shadow-sm font-medium text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Daftar Wali
            </Link>
            {id && (
              <Link
                to={`/parents/show/${id}`}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm"
              >
                <Eye className="w-4 h-4" />
                Lihat Profil
              </Link>
            )}
          </div>
        }
      />
      <ParentForm action="edit" />
    </div>
  );
};
