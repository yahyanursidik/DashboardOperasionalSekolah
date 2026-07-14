import React from "react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { ClassForm } from "../components/class-form";

export const ClassEdit: React.FC = () => {
  return (
    <div>
      <PageHeader
        title="Ubah Pengaturan Kelas"
        description="Perbarui identitas rombel, kapasitas, wali kelas, unit, dan tahun ajaran tanpa membuat workflow akademik rancu."
      />
      <ClassForm action="edit" />
    </div>
  );
};
