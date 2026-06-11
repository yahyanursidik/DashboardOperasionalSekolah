import React from "react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { TaskForm } from "../components/task-form";

export const TaskEdit: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit Tugas"
        description="Perbarui informasi atau ubah parameter penugasan."
      />
      <TaskForm action="edit" />
    </div>
  );
};
