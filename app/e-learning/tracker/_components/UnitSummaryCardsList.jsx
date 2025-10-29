// src/components/TrackingPeserta/UnitSummaryCardsList.jsx

import React from "react";

const UnitSummaryCard = ({
  name,
  uploaded,
  notUploaded,
  total,
  percentage,
}) => (
  <div className="p-4 rounded-xl shadow-md border border-gray-100 bg-white hover:shadow-lg transition hover:scale-105">
    <h3 className="text-lg font-bold text-gray-800 mb-2 border-b pb-1">
      {name}
    </h3>

    <div className="grid grid-cols-3 gap-2 text-sm">
      <div className="text-center p-2 rounded bg-blue-50">
        <p className="font-bold text-blue-800">{total}</p>
        <p className="text-xs text-blue-600">Total</p>
      </div>

      <div className="text-center p-2 rounded bg-green-50">
        <p className="font-bold text-green-800">{uploaded}</p>
        <p className="text-xs text-green-600">Upload</p>
      </div>

      <div className="text-center p-2 rounded bg-red-50">
        <p className="font-bold text-red-800">{notUploaded}</p>
        <p className="text-xs text-red-600">Belum</p>
      </div>
    </div>

    <p
      className={`mt-3 text-center text-sm font-semibold ${percentage > 50 ? "text-green-600" : "text-orange-600"}`}
    >
      {percentage.toFixed(1)}% Selesai
    </p>
  </div>
);

export const UnitSummaryCardsList = ({ unitSummary }) => {
  return (
    <>
      <h2 className="text-2xl font-semibold mb-4">Monitoring Progress Unit</h2>
      <div className="flex flex-wrap items-center justify-center gap-6 overflow-y-auto p-2">
        {unitSummary.map((unit) => (
          <UnitSummaryCard
            key={unit.name}
            name={unit.name}
            uploaded={unit.uploaded}
            notUploaded={unit.notUploaded}
            total={unit.total}
            percentage={unit.percentage}
          />
        ))}
      </div>
    </>
  );
};