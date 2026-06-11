import React from "react";
import { ParentForm } from "../components/parent-form";
import { PageHeader } from "../../../components/layout/PageHeader";

export const ParentEdit: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Ubah Data Orang Tua / Wali" 
        description="Perbarui informasi kontak dan data diri." 
      />
      <ParentForm action="edit" />
    </div>
  );
};
