import React from "react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { StudentForm } from "../components/student-form";

export const StudentEdit: React.FC = () => {
  return (
    <div>
      <PageHeader
        title="Ubah Data Siswa"
        description="Perbarui informasi profil siswa."
      />
      <StudentForm action="edit" />
    </div>
  );
};
