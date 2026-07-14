import React from "react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { StudentForm } from "../components/student-form";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Eye } from "lucide-react";

export const StudentEdit: React.FC = () => {
  const { id } = useParams();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ubah Data Siswa"
        description="Lengkapi data induk, akademik, kesehatan, dan kontak darurat agar profil siswa siap dipakai lintas fitur sekolah."
        action={
          <div className="flex items-center gap-2">
            <Link
              to="/students"
              className="flex items-center gap-2 bg-white text-muted-foreground border px-4 py-2 rounded-md hover:bg-muted transition-colors shadow-sm font-medium text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Daftar Siswa
            </Link>
            {id && (
              <Link
                to={`/students/show/${id}`}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm"
              >
                <Eye className="w-4 h-4" />
                Lihat Profil
              </Link>
            )}
          </div>
        }
      />
      <StudentForm action="edit" />
    </div>
  );
};
