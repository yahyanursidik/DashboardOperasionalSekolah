import React from "react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { SarprasSectionNav } from "../components/SarprasSectionNav";
import { AssetsList } from "./assets";

export const UnifiedAssetsDashboard: React.FC = () => (
  <div className="space-y-6">
    <PageHeader title="Aset & Inventaris" description="Kelola identitas, lokasi, kondisi, penanggung jawab, nilai, dan siklus hidup aset sekolah per unit." />
    <SarprasSectionNav />
    <AssetsList isTabMode />
  </div>
);
