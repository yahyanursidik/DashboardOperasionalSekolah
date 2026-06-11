import React from "react";
import { ParentForm } from "../components/parent-form";
import { PageHeader } from "../../../components/layout/PageHeader";

export const ParentCreate: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Tambah Orang Tua / Wali" 
        description="Masukkan data orang tua atau wali baru ke dalam sistem." 
      />
      <ParentForm action="create" />
    </div>
  );
};
