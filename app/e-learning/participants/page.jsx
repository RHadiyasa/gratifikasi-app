// components/ParticipantList.js
"use client";
import React, { useState, useEffect } from "react";
import axios from "axios";

function ParticipantList() {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchParticipants = async () => {
      try {
        setLoading(true);
        // Memanggil Next.js API Route yang telah dibuat
        const response = await axios.get("/api/elearning/getAllParticipants");

        // Data berada di response.data.data
        setParticipants(response.data.data);
        setError(null);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(
          err.response?.data?.message || "Gagal terhubung ke server API."
        );
        setParticipants([]);
      } finally {
        setLoading(false);
      }
    };

    fetchParticipants();
  }, []);

  if (loading) {
    return <p>Memuat data peserta...</p>;
  }

  if (error) {
    return <p style={{ color: "red" }}>Error: {error}</p>;
  }

  return (
    <div>
      <h2>Daftar Peserta E-learning ({participants.length} data)</h2>

      {/* Struktur tampilan data seperti di MongoDB Compass */}
      <div
        style={{
          fontFamily: "monospace",
          whiteSpace: "pre-wrap",
          backgroundColor: "#f0f0f0",
          padding: "10px",
        }}
      >
        {participants.map((p, index) => (
          <div
            key={p._id}
            style={{
              borderBottom: "1px solid #ccc",
              marginBottom: "10px",
              paddingBottom: "5px",
            }}
          >
            <span style={{ color: "gray" }}>_id:</span>{" "}
            <span style={{ color: "brown" }}>ObjectId('{p._id}')</span>
            <br />
            <span style={{ color: "gray" }}>nama:</span> "{p.nama}"
            <br />
            <span style={{ color: "gray" }}>nip:</span> "{p.nip}"
            <br />
            <span style={{ color: "gray" }}>jabatan:</span> "
            {p.jabatan || "N/A"}"
            <br />
            <span style={{ color: "gray" }}>unit_eselon_ii:</span> "
            {p.unit_eselon_ii || "N/A"}"
            <br />
            <span style={{ color: "gray" }}>unit_eselon_i:</span> "
            {p.unit_eselon_i}"
            <br />
            <span style={{ color: "gray" }}>batch:</span> "{p.batch}"
            <br />
            <span style={{ color: "gray" }}>statusCourse:</span> "
            {p.statusCourse}"
            <br />
            <span style={{ color: "gray" }}>s3_key:</span> "{p.s3_key}"
          </div>
        ))}
      </div>
    </div>
  );
}

export default ParticipantList;
