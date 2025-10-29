// src/components/TrackingPeserta/GlobalSummaryCards.jsx

import React from "react";
import { Upload, Users } from "lucide-react";
import { SummaryCard } from "./SummaryCard";

export const GlobalSummaryCards = ({ summary }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
      <SummaryCard
        title="Total Peserta"
        value={summary.totalParticipants}
        icon={Users}
        color="blue"
      />
      <SummaryCard
        title="Total Sudah Upload"
        value={summary.totalUploaded}
        percentage={summary.overallPercentage}
        icon={Upload}
        color="green"
      />
      <SummaryCard
        title="Total Belum Upload"
        value={summary.totalParticipants - summary.totalUploaded}
        icon={Users}
        color="red"
      />
    </div>
  );
};