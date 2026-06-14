import React from "react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { TeacherForm } from "../components/teacher-form";
import { useForm } from "@refinedev/react-hook-form";

export const TeacherCreate: React.FC = () => {
  const { onFinish, mutationResult } = useForm({
    resource: "employees",
    action: "create",
    redirect: "list",
  });

  return (
    <div>
      <PageHeader
        title="Tambah Guru / Karyawan"
        description="Masukkan data induk guru baru."
      />
      <TeacherForm action="create" defaultValues={{ position: "guru" }} />
    </div>
  );
};
