import React from "react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { ClassForm } from "../components/class-form";

export const ClassCreate: React.FC = () => {
  return (
    <div>
      <PageHeader
        title="Tambah Rombongan Belajar"
        description="Buat kelas baru yang langsung siap dihubungkan dengan siswa, wali kelas, jadwal, absensi, nilai, dan kurikulum."
      />
      <ClassForm action="create" />
    </div>
  );
};
