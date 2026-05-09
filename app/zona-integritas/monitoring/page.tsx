import type { LkeSubmission as ILke } from "@/types/zi";

import NextLink from "next/link";
import {
  BarChart3,
  Award,
  CheckCircle2,
  Clock,
  AlertCircle,
  Users,
  Star,
  ExternalLink,
} from "lucide-react";

import { connect } from "@/config/dbconfig";
import LkeSubmission from "@/modules/models/LkeSubmission";
import { TARGET_THRESHOLD } from "@/types/zi";
import { StatusBadge } from "@/components/StatusBadge";
import { TargetBadge } from "@/components/TargetBadge";
import { ZiProgressBar } from "@/components/ZiProgressBar";
import { StatCard } from "@/components/StatCard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getData() {
  await connect();
  const docs = await LkeSubmission.find({}).sort({ created_at: -1 }).lean();

  return docs as unknown as ILke[];
}

function buildSummary(docs: ILke[]) {
  const selesai = docs.filter((d) => d.status === "Selesai").length;
  const sedang = docs.filter((d) => d.status === "Sedang Dicek").length;
  const belum = docs.filter((d) => d.status === "Belum Dicek").length;
  const perluRevisi = docs.filter((d) => d.status === "Perlu Revisi").length;

  const withNilai = docs.filter((d) => d.nilai_lke_ai?.nilai_akhir != null);
  const wbkTercapai = withNilai.filter(
    (d) =>
      d.target === "WBK" &&
      d.nilai_lke_ai!.nilai_akhir! >= TARGET_THRESHOLD.WBK,
  ).length;
  const wbbmTercapai = withNilai.filter(
    (d) =>
      d.target === "WBBM" &&
      d.nilai_lke_ai!.nilai_akhir! >= TARGET_THRESHOLD.WBBM,
  ).length;
  const rata =
    withNilai.length > 0
      ? withNilai.reduce((sum, d) => sum + d.nilai_lke_ai!.nilai_akhir!, 0) /
        withNilai.length
      : null;

  return {
    total: docs.length,
    selesai,
    sedang,
    belum,
    perluRevisi,
    wbk_tercapai: wbkTercapai,
    wbbm_tercapai: wbbmTercapai,
    rata_nilai_akhir: rata,
  };
}

function avgNilai(units: ILke[]): number | null {
  const withNilai = units.filter((u) => u.nilai_lke_ai?.nilai_akhir != null);

  if (withNilai.length === 0) return null;

  return (
    withNilai.reduce((sum, u) => sum + u.nilai_lke_ai!.nilai_akhir!, 0) /
    withNilai.length
  );
}

export default async function MonitoringPage() {
  const docs = await getData();
  const summary = buildSummary(docs);

  // Group by eselon1, sorted by nilai desc within each group
  const byEselon1 = docs.reduce<Record<string, ILke[]>>((acc, d) => {
    const key = d.eselon1 || "Lainnya";

    if (!acc[key]) acc[key] = [];
    acc[key].push(d);

    return acc;
  }, {});

  // Sort each group: units with nilai desc, then units without nilai
  for (const key of Object.keys(byEselon1)) {
    byEselon1[key].sort((a, b) => {
      const aVal = a.nilai_lke_ai?.nilai_akhir ?? null;
      const bVal = b.nilai_lke_ai?.nilai_akhir ?? null;

      if (aVal === null && bVal === null) return 0;
      if (aVal === null) return 1;
      if (bVal === null) return -1;

      return bVal - aVal;
    });
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Monitoring Zona Integritas</h1>
        <p className="text-sm text-default-500 mt-1">
          Rekap perkembangan evaluasi LKE seluruh unit kerja
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <StatCard
          color="default"
          icon={<Users size={18} />}
          label="Total Unit"
          size="sm"
          value={summary.total}
        />
        <StatCard
          color="green"
          icon={<CheckCircle2 size={18} />}
          label="Selesai"
          size="sm"
          value={summary.selesai}
        />
        <StatCard
          color="amber"
          icon={<Clock size={18} />}
          label="Sedang Dicek"
          size="sm"
          value={summary.sedang}
        />
        <StatCard
          color="red"
          icon={<AlertCircle size={18} />}
          label="Perlu Revisi"
          size="sm"
          value={summary.perluRevisi}
        />
        <StatCard
          color="default"
          icon={<AlertCircle size={18} />}
          label="Belum Dicek"
          size="sm"
          value={summary.belum}
        />
        <StatCard
          color="blue"
          icon={<Award size={18} />}
          label="WBK Tercapai"
          size="sm"
          value={summary.wbk_tercapai}
        />
        <StatCard
          color="violet"
          icon={<Star size={18} />}
          label="WBBM Tercapai"
          size="sm"
          value={summary.wbbm_tercapai}
        />
      </div>

      {/* Rata nilai akhir */}
      {summary.rata_nilai_akhir !== null && (
        <div className="rounded-xl border border-default-200 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-default-500 font-medium">
              Rata-rata Nilai Akhir LKE
            </p>
            <p className="text-3xl font-bold tabular-nums mt-0.5">
              {summary.rata_nilai_akhir.toFixed(2)}
            </p>
          </div>
          <BarChart3 className="text-default-300" size={32} />
        </div>
      )}

      {/* Table by eselon1 */}
      {Object.entries(byEselon1).map(([eselon1, units]) => {
        const avg = avgNilai(units);
        const unitsDenganNilai = units.filter(
          (u) => u.nilai_lke_ai?.nilai_akhir != null,
        ).length;

        return (
          <div key={eselon1} className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold">{eselon1}</h2>
                <span className="text-xs text-default-400 bg-default-100 px-2 py-0.5 rounded-full">
                  {units.length} unit
                </span>
              </div>
              {avg !== null && (
                <div className="text-xs text-default-500">
                  Rata-rata:{" "}
                  <span className="font-bold tabular-nums text-foreground">
                    {avg.toFixed(2)}
                  </span>
                  <span className="text-default-400">
                    {" "}
                    dari {unitsDenganNilai} unit dinilai
                  </span>
                </div>
              )}
            </div>
            <div className="overflow-x-auto rounded-xl border border-default-200">
              <table className="w-full text-sm">
                <thead className="bg-default-50">
                  <tr>
                    <th className="text-center py-2.5 px-3 font-medium text-default-500 text-xs w-10">
                      #
                    </th>
                    <th className="text-left py-2.5 px-4 font-medium text-default-500 text-xs">
                      Unit Kerja
                    </th>
                    <th className="text-left py-2.5 px-3 font-medium text-default-500 text-xs w-28">
                      Target
                    </th>
                    <th className="text-left py-2.5 px-3 font-medium text-default-500 text-xs w-32">
                      Status
                    </th>
                    <th className="text-left py-2.5 px-3 font-medium text-default-500 text-xs w-40">
                      Progress Cek
                    </th>
                    <th className="text-right py-2.5 px-4 font-medium text-default-500 text-xs w-24">
                      Nilai Akhir
                    </th>
                    <th className="text-center py-2.5 px-3 font-medium text-default-500 text-xs w-16">
                      Detail
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-default-100">
                  {units.map((sub, idx) => {
                    const threshold = TARGET_THRESHOLD[sub.target];
                    const val = sub.nilai_lke_ai?.nilai_akhir ?? null;
                    const achieved = val !== null && val >= threshold;
                    const unitId = String(sub._id);

                    return (
                      <tr
                        key={unitId}
                        className="hover:bg-default-50 transition-colors"
                      >
                        <td className="py-3 px-3 text-center">
                          {val !== null ? (
                            <span className="text-xs font-bold text-default-400">
                              {idx + 1}
                            </span>
                          ) : (
                            <span className="text-default-300 text-xs">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium">{sub.eselon2}</div>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {sub.pic_unit && (
                              <span className="text-xs text-default-400">
                                {sub.pic_unit}
                              </span>
                            )}
                            <span
                              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                sub.source === "app"
                                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                  : "bg-default-100 text-default-500"
                              }`}
                            >
                              {sub.source === "app" ? "App" : "Sheet"}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <TargetBadge
                            showStatus={val !== null}
                            target={sub.target}
                            tercapai={achieved}
                          />
                        </td>
                        <td className="py-3 px-3">
                          <StatusBadge status={sub.status} />
                        </td>
                        <td className="py-3 px-3">
                          <ZiProgressBar
                            label={`${sub.checked_count}/${sub.total_data}`}
                            size="sm"
                            value={sub.progress_percent}
                          />
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums">
                          {val !== null ? (
                            <span
                              className={`font-bold ${achieved ? "text-green-600 dark:text-green-400" : "text-red-500"}`}
                            >
                              {val.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-default-300">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <NextLink
                            className="inline-flex items-center justify-center w-7 h-7 rounded-lg hover:bg-primary/10 text-default-400 hover:text-primary transition-colors"
                            href={`/zona-integritas/lke-checker/${unitId}`}
                            title={`Detail ${sub.eselon2}`}
                          >
                            <ExternalLink size={13} />
                          </NextLink>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {docs.length === 0 && (
        <div className="text-center py-20 text-default-400 text-sm">
          Belum ada data unit. Tambahkan melalui{" "}
          <NextLink
            className="text-primary underline"
            href="/zona-integritas/lke-checker"
          >
            LKE Checker
          </NextLink>
          .
        </div>
      )}
    </div>
  );
}
