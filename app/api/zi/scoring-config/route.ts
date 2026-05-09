import { NextResponse } from "next/server";

import { connect } from "@/config/dbconfig";
import { getSessionUser } from "@/lib/auth";
import {
  buildDefaultSubcomponentWeights,
  getActiveScoringConfig,
  mergePercentPoliciesWithMaster,
  normalizePercentPoliciesForStorage,
  syncMasterFormulaFromPercentPolicies,
  syncMasterPercentDraftsFromScoring,
} from "@/lib/zi/scoring-config";
import { hasPermission } from "@/lib/permissions";
import LkeKriteria from "@/modules/models/LkeKriteria";
import ZiScoringConfig from "@/modules/models/ZiScoringConfig";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || !hasPermission(user.role, "zi:scoring:manage")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await connect();
    const kriteria = await LkeKriteria.find({ aktif: true }).lean();
    const cfg = await getActiveScoringConfig(kriteria as any[]);
    const primary = kriteria.filter(
      (k: any) => !(k?.answer_type === "jumlah" && k?.parent_question_id != null),
    );
    const defaults = buildDefaultSubcomponentWeights(primary as any[]);

    return NextResponse.json({
      config: cfg || null,
      defaults,
      lock_master_kriteria:
        (cfg as { lock_master_kriteria?: boolean } | null)?.lock_master_kriteria ??
        false,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Gagal memuat konfigurasi" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user || !hasPermission(user.role, "zi:scoring:manage")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await connect();
    const body = await req.json();
    const {
      lock_master_kriteria = true,
      subcomponent_weights = [],
      percent_policies = [],
      percent_master_drafts = [],
      notes = "",
    } = body || {};

    const hasMasterDrafts =
      Array.isArray(percent_master_drafts) && percent_master_drafts.length > 0;

    if (hasMasterDrafts) {
      await syncMasterPercentDraftsFromScoring(percent_master_drafts);
    }

    let kriteria = (await LkeKriteria.find({ aktif: true }).lean()) as any[];
    let normalizedPolicies: any[] = normalizePercentPoliciesForStorage(
      kriteria,
      Array.isArray(percent_policies) ? percent_policies : [],
    );

    if (hasMasterDrafts) {
      normalizedPolicies = mergePercentPoliciesWithMaster(
        kriteria,
        normalizedPolicies,
      );
    } else {
      normalizedPolicies = await syncMasterFormulaFromPercentPolicies(
        normalizedPolicies,
      );
      kriteria = (await LkeKriteria.find({ aktif: true }).lean()) as any[];
      normalizedPolicies = mergePercentPoliciesWithMaster(
        kriteria,
        normalizedPolicies,
      );
    }

    const current = await getActiveScoringConfig();
    const nextVersion = Number((current as { version?: number } | null)?.version || 0) + 1;

    const currentId = (current as { _id?: unknown } | null)?._id;
    if (currentId) {
      await ZiScoringConfig.findByIdAndUpdate(currentId, { is_active: false });
    }

    const created = await ZiScoringConfig.create({
      version: nextVersion,
      is_active: true,
      lock_master_kriteria: Boolean(lock_master_kriteria),
      rounding_scale: 10000,
      notes: String(notes || ""),
      subcomponent_weights: Array.isArray(subcomponent_weights) ? subcomponent_weights : [],
      percent_policies: normalizedPolicies,
      updated_by: user.id || user.name || "unknown",
    });

    return NextResponse.json({ config: created }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Gagal menyimpan konfigurasi" }, { status: 500 });
  }
}
