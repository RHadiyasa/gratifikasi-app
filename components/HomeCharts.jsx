"use client";

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

const monthlyData = [
  { bulan: "Jan", laporan: 3  },
  { bulan: "Feb", laporan: 5  },
  { bulan: "Mar", laporan: 4  },
  { bulan: "Apr", laporan: 8  },
  { bulan: "Mei", laporan: 11 },
  { bulan: "Jun", laporan: 7  },
  { bulan: "Jul", laporan: 13 },
  { bulan: "Agu", laporan: 10 },
  { bulan: "Sep", laporan: 15 },
  { bulan: "Okt", laporan: 18 },
  { bulan: "Nov", laporan: 14 },
  { bulan: "Des", laporan: 21 },
];

const pieData = [
  { name: "Selesai",            value: 42, color: "#22c55e" },
  { name: "Diteruskan ke KPK",  value: 23, color: "#a855f7" },
  { name: "Diverifikasi",       value: 21, color: "#3b82f6" },
  { name: "Diajukan",           value: 14, color: "#f59e0b" },
];

const tooltipStyle = {
  background: "hsl(var(--heroui-background))",
  border: "1px solid hsl(var(--heroui-default-200))",
  borderRadius: "12px",
  fontSize: "12px",
};

export function TrendChart() {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={monthlyData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="gradPrimary" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="hsl(var(--heroui-primary))" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(var(--heroui-primary))" stopOpacity={0}   />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--heroui-default-200))" vertical={false} />
        <XAxis dataKey="bulan" tick={{ fontSize: 11, fill: "hsl(var(--heroui-default-500))" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "hsl(var(--heroui-default-500))" }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={{ fontWeight: 600 }} />
        <Area
          type="monotone" dataKey="laporan" name="Laporan"
          stroke="hsl(var(--heroui-primary))" strokeWidth={2.5}
          fill="url(#gradPrimary)"
          dot={{ r: 3, fill: "hsl(var(--heroui-primary))", strokeWidth: 0 }}
          activeDot={{ r: 5, fill: "hsl(var(--heroui-primary))" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function StatusPieChart() {
  return (
    <>
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie
            data={pieData} dataKey="value" cx="50%" cy="50%"
            innerRadius={45} outerRadius={70} paddingAngle={3} strokeWidth={0}
          >
            {pieData.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>

      <div className="space-y-2 mt-2">
        {pieData.map((d) => (
          <div key={d.name} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
              <span className="text-default-600">{d.name}</span>
            </div>
            <span className="font-bold">{d.value}%</span>
          </div>
        ))}
      </div>
    </>
  );
}
