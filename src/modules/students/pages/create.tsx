import React from "react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { StudentForm } from "../components/student-form";

export const StudentCreate: React.FC = () => {
  return (
    <div>
      <PageHeader
        title="Tambah Siswa Baru"
        description="Masukkan data profil siswa baru ke dalam sistem."
      />
      <StudentForm action="create" />
    </div>
  );
};
