import React from "react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { ClassForm } from "../components/class-form";

export const ClassCreate: React.FC = () => {
  return (
    <div>
      <PageHeader
        title="Tambah Kelas"
        description="Buat kelas baru pada unit sekolah dan tahun ajaran terkait."
      />
      <ClassForm action="create" />
    </div>
  );
};
