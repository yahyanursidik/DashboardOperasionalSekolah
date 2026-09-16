import React from "react";
import { PageHeader } from "../../components/layout/PageHeader";
import { HblAdminSettings } from "./hbl-admin-settings";
import { HblJourneyManager } from "./hbl-journey-manager";
import { HblMeetingManager } from "./hbl-meeting-manager";

export const HblAdminPage: React.FC = () => (
  <div className="space-y-6 pb-10">
    <PageHeader
      title="LMS Homebased Learning"
      description="Ruang kerja TSLS Learning Journey: program per unit dan semester, pekan belajar, aktivitas anak, materi multi-format, live meet, worksheet, serta home project."
    />
    <HblAdminSettings />
    <HblJourneyManager />
    <HblMeetingManager />
  </div>
);
