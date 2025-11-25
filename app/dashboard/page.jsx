"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { Button, Card, CardBody, Divider } from "@heroui/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Users, ClipboardList, Coins, ShieldCheck, List } from "lucide-react";
import Link from "next/link";

export default function Dashboard() {
  const statusColors = {
    Diajukan: "bg-blue-500",
    Diverifikasi: "bg-yellow-500",
    "Diteruskan ke KPK": "bg-purple-500",
    Selesai: "bg-green-500",
  };

  const [stats, setStats] = useState({
    totalPelapor: 0,
    totalNilai: 0,
    perStatus: {},
    totalUPG: 0,
    perJenis: {},
    trend: [],
    recentReports: [],
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const res = await axios.get("/api/dashboard");
      setStats(res.data);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    }
  };

  return (
    <div className="p-8 mx-20 space-y-8 min-h-screen">
      <h1 className="text-3xl font-bold">Dashboard UPG</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<Users size={28} />}
          title="Jumlah Pelapor"
          value={stats.totalPelapor}
          color="bg-blue-500"
        />
        <StatCard
          icon={<Coins size={28} />}
          title="Total Nilai Gratifikasi"
          value={`Rp ${stats.totalNilai.toLocaleString("id-ID")}`}
          color="bg-green-500"
        />
        <StatCard
          icon={<ClipboardList size={28} />}
          title="Total Tim UPG"
          value={stats.totalUPG}
          color="bg-purple-500"
        />
        <StatCard
          icon={<ShieldCheck size={28} />}
          title="Laporan Selesai"
          value={stats.perStatus?.Selesai || 0}
          color="bg-amber-500"
        />
      </div>

      {/* Chart */}
      <Card className="p-5">
        <CardBody>
          <h2 className="text-xl font-semibold mb-4">Tren Laporan Per Bulan</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="bulan" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="jumlah" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardBody>
      </Card>

      {/* Laporan per Status */}
      <Card className="p-5">
        <CardBody>
          <h2 className="py-2 mb-4 flex items-center justify-between">
            <p className="text-xl font-semibold">Jumlah Laporan per Status</p>
            <Button color="primary" as={Link} href="/dashboard/report-list">
              <List size={20} /> Semua Laporan
            </Button>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(stats.perStatus || {}).map(([status, jumlah]) => {
              const color = statusColors[status] || "bg-gray-500"; // fallback warna abu kalau tidak ada
              return (
                <div
                  key={status}
                  className={`p-4 rounded-xl shadow-lg text-white ${color} hover:scale-102 animate`}
                >
                  <Button className="bg-transparent text-white flex items-center justify-between w-full hover:scale-105">
                    <p className="text-base font-bold">{status}</p>
                    <p className="text-2xl font-bold">{jumlah}</p>
                  </Button>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>

      {/* Laporan Terbaru */}
      <Card className="p-5">
        <CardBody>
          <h2 className="text-xl font-semibold mb-4">Laporan Terbaru</h2>
          <Divider />

          <div>
            {stats.recentReports.map((r) => (
              <div
                key={r.uniqueId}
                className="py-3 flex justify-between items-center"
              >
                <div>
                  <p className="font-medium">{r.nama || "Anonim"}</p>
                  <p className="text-sm">
                    {r.reportType} • {r.status}
                  </p>
                </div>
                <span className="text-sm">
                  {new Date(r.createdAt).toLocaleDateString("id-ID")}
                </span>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

const StatCard = ({ icon, title, value, color }) => (
  <div
    className={`p-5 rounded-xl shadow-md text-white flex items-center justify-between ${color}`}
  >
    <div>
      <p className="text-sm opacity-80">{title}</p>
      <h3 className="text-xl font-bold">{value}</h3>
    </div>
    {icon}
  </div>
);
