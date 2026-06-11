import React from "react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { ClassForm } from "../components/class-form";

export const ClassEdit: React.FC = () => {
  return (
    <div>
      <PageHeader
        title="Ubah Data Kelas"
        description="Perbarui informasi kelas."
      />
      <ClassForm action="edit" />
    </div>
  );
};
