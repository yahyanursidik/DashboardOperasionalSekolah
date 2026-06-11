import React from "react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { TaskForm } from "../components/task-form";

export const TaskCreate: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Buat Tugas Baru"
        description="Delegasikan tugas atau catat agenda pekerjaan Anda."
      />
      <TaskForm action="create" />
    </div>
  );
};
