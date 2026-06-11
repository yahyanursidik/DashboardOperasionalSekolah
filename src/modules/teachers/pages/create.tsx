import React from "react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { TeacherForm } from "../components/teacher-form";

export const TeacherCreate: React.FC = () => {
  return (
    <div>
      <PageHeader
        title="Tambah Guru / Karyawan"
        description="Masukkan data induk guru baru."
      />
      <TeacherForm action="create" />
    </div>
  );
};
