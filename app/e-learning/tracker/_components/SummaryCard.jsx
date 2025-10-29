// src/components/TrackingPeserta/SummaryCard.jsx

import React from "react";

export const SummaryCard = ({ title, value, percentage, icon: Icon, color }) => (
  <div
    className={`p-5 rounded-xl shadow-lg border-${color}-500 bg-white backdrop-blur-md hover:scale-105 transition`}
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
      </div>
      <div className={`p-3 rounded-full bg-${color}-100 text-${color}-600`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
    {percentage !== undefined && (
      <p className={`mt-2 text-sm font-semibold text-${color}-600`}>
        {percentage.toFixed(1)}% Keseluruhan
      </p>
    )}
  </div>
);