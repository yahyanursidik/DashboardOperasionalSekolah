import React from "react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { TeacherForm } from "../components/teacher-form";

export const TeacherEdit: React.FC = () => {
  return (
    <div>
      <PageHeader
        title="Ubah Data Guru"
        description="Perbarui informasi profil induk guru."
      />
      <TeacherForm action="edit" />
    </div>
  );
};
