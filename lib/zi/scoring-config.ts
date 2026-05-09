import LkeKriteria from "@/modules/models/LkeKriteria";
import ZiScoringConfig from "@/modules/models/ZiScoringConfig";
import type { AnyBulkWriteOperation } from "mongodb";

type KriteriaLike = {
  question_id: number;
  parent_question_id?: number | null;
  komponen: string;
  seksi?: "pemenuhan" | "reform" | "hasil";
  sub_komponen?: string;
  pertanyaan?: string;
  bobot?: number;
  answer_type?: string;
  urutan?: number;
  formula_tokens?: FormulaToken[] | null;
  formula_min?: number;
  formula_max?: number;
  formula_zero_division_full_score?: boolean;
  aktif?: boolean;
};

type FormulaToken = {
  kind: "operand" | "op" | "open_paren" | "close_paren";
  ref?: number | null;
  op?: "+" | "-" | "*" | "/" | null;
};

type PercentPolicy = {
  question_id: number;
  type?: "direct_percent" | "ratio" | "decrease_ratio";
  numerator_key?: string;
  denominator_key?: string;
  previous_key?: string;
  current_key?: string;
  cap_at_100?: boolean;
  zero_division?: "full_score" | "zero" | "ignore";
};

type PercentSubItemInput = {
  _id?: string;
  question_id?: number;
  pertanyaan?: string;
  sub_komponen?: string;
  bobot?: number;
  is_computed?: boolean;
  formula_tokens?: FormulaToken[] | null;
  toDelete?: boolean;
};

type PercentMasterDraftInput = {
  question_id: number;
  sub_items?: PercentSubItemInput[];
  formula_tokens?: FormulaToken[] | null;
  formula_min?: number;
  formula_max?: number;
  formula_zero_division_full_score?: boolean;
};

function keyOf(k: { komponen: string; seksi?: string; sub_komponen?: string }) {
  return `${k.komponen}||${k.seksi || "pemenuhan"}||${k.sub_komponen || ""}`;
}

function metricKeyOf(kriteria: { question_id: number }) {
  return `qid_${Number(kriteria.question_id)}`;
}

function parseMetricQid(value: unknown) {
  const match = String(value ?? "").match(/^qid_(\d+)$/);
  return match ? Number(match[1]) : null;
}

function buildChildrenByParent(kriteriaList: KriteriaLike[]) {
  const map = new Map<number, KriteriaLike[]>();
  for (const item of kriteriaList) {
    if (
      item?.aktif === false ||
      item?.answer_type !== "jumlah" ||
      item?.parent_question_id == null
    ) {
      continue;
    }
    const parentQid = Number(item.parent_question_id);
    if (!map.has(parentQid)) map.set(parentQid, []);
    map.get(parentQid)!.push(item);
  }
  for (const children of map.values()) {
    children.sort((a, b) => Number(a.urutan ?? 0) - Number(b.urutan ?? 0));
  }
  return map;
}

function findChildByUrutan(children: KriteriaLike[], urutan: number | null | undefined) {
  if (urutan == null) return null;
  return children.find((child) => Number(child.urutan) === Number(urutan)) ?? null;
}

function findChildByPolicyKey(children: KriteriaLike[], key: unknown) {
  const value = String(key ?? "").trim();
  if (!value) return null;

  const qid = parseMetricQid(value);
  if (qid != null) {
    const byQid = children.find((child) => Number(child.question_id) === qid);
    if (byQid) return byQid;
  }

  return (
    children.find((child) => String(child.sub_komponen ?? "").trim() === value) ??
    null
  );
}

function isOperand(token: FormulaToken | undefined, ref?: number) {
  if (token?.kind !== "operand") return false;
  if (ref == null) return true;
  return Number(token.ref) === Number(ref);
}

function isOp(token: FormulaToken | undefined, op: FormulaToken["op"]) {
  return token?.kind === "op" && token.op === op;
}

function policyMetaFromParent(parent: KriteriaLike, fallback?: PercentPolicy) {
  return {
    cap_at_100:
      parent.formula_max == null
        ? fallback?.cap_at_100 ?? true
        : Number(parent.formula_max) <= 100,
    zero_division: parent.formula_zero_division_full_score
      ? "full_score"
      : fallback?.zero_division ?? "zero",
  } satisfies Pick<PercentPolicy, "cap_at_100" | "zero_division">;
}

function derivePolicyFromMasterFormula(
  parent: KriteriaLike,
  children: KriteriaLike[],
  fallback?: PercentPolicy,
): PercentPolicy | null {
  const tokens = parent.formula_tokens ?? [];
  if (!tokens.length || children.length === 0) return null;

  const meta = policyMetaFromParent(parent, fallback);

  if (tokens.length === 3 && isOperand(tokens[0]) && isOp(tokens[1], "/") && isOperand(tokens[2])) {
    const numerator = findChildByUrutan(children, tokens[0].ref);
    const denominator = findChildByUrutan(children, tokens[2].ref);
    if (!numerator || !denominator) return null;
    return {
      ...fallback,
      question_id: Number(parent.question_id),
      type: "ratio",
      numerator_key: metricKeyOf(numerator),
      denominator_key: metricKeyOf(denominator),
      previous_key: "",
      current_key: "",
      ...meta,
    };
  }

  const isDecrease =
    tokens.length === 7 &&
    tokens[0]?.kind === "open_paren" &&
    isOperand(tokens[1]) &&
    isOp(tokens[2], "-") &&
    isOperand(tokens[3]) &&
    tokens[4]?.kind === "close_paren" &&
    isOp(tokens[5], "/") &&
    isOperand(tokens[6], tokens[1].ref ?? undefined);

  if (isDecrease) {
    const previous = findChildByUrutan(children, tokens[1].ref);
    const current = findChildByUrutan(children, tokens[3].ref);
    if (!previous || !current) return null;
    return {
      ...fallback,
      question_id: Number(parent.question_id),
      type: "decrease_ratio",
      numerator_key: "",
      denominator_key: "",
      previous_key: metricKeyOf(previous),
      current_key: metricKeyOf(current),
      ...meta,
    };
  }

  return null;
}

export function mergePercentPoliciesWithMaster(
  kriteriaList: KriteriaLike[],
  percentPolicies: PercentPolicy[] = [],
) {
  const childrenByParent = buildChildrenByParent(kriteriaList);
  const byQuestionId = new Map<number, PercentPolicy>();

  for (const policy of percentPolicies) {
    const qid = Number(policy?.question_id);
    if (Number.isFinite(qid) && qid > 0) {
      byQuestionId.set(qid, {
        ...policy,
        question_id: qid,
      });
    }
  }

  for (const parent of kriteriaList) {
    if (
      parent?.aktif === false ||
      parent?.answer_type !== "persen" ||
      parent?.question_id == null
    ) {
      continue;
    }

    const qid = Number(parent.question_id);
    const fallback = byQuestionId.get(qid);
    const derived = derivePolicyFromMasterFormula(
      parent,
      childrenByParent.get(qid) ?? [],
      fallback,
    );
    if (derived) {
      byQuestionId.set(qid, derived);
    } else if ((parent.formula_tokens ?? []).length > 0) {
      byQuestionId.set(qid, {
        ...fallback,
        question_id: qid,
        type: "direct_percent",
        numerator_key: "",
        denominator_key: "",
        previous_key: "",
        current_key: "",
        ...policyMetaFromParent(parent, fallback),
      });
    }
  }

  return [...byQuestionId.values()].sort(
    (a, b) => Number(a.question_id) - Number(b.question_id),
  );
}

export function normalizePercentPoliciesForStorage(
  kriteriaList: KriteriaLike[],
  percentPolicies: PercentPolicy[] = [],
) {
  const childrenByParent = buildChildrenByParent(kriteriaList);

  return percentPolicies
    .filter((policy) => Number(policy?.question_id) > 0)
    .map((policy) => {
      const qid = Number(policy.question_id);
      const children = childrenByParent.get(qid) ?? [];
      const normalizeKey = (key: unknown) => {
        const child = findChildByPolicyKey(children, key);
        return child ? metricKeyOf(child) : String(key ?? "").trim();
      };

      return {
        ...policy,
        question_id: qid,
        numerator_key: normalizeKey(policy.numerator_key),
        denominator_key: normalizeKey(policy.denominator_key),
        previous_key: normalizeKey(policy.previous_key),
        current_key: normalizeKey(policy.current_key),
        cap_at_100: policy.cap_at_100 !== false,
        zero_division: policy.zero_division ?? "full_score",
      };
    });
}

function buildFormulaTokensFromPolicy(
  policy: PercentPolicy,
  children: KriteriaLike[],
): FormulaToken[] | null {
  if (policy.type === "ratio") {
    const numerator = findChildByPolicyKey(children, policy.numerator_key);
    const denominator = findChildByPolicyKey(children, policy.denominator_key);
    if (!numerator || !denominator) return null;
    return [
      { kind: "operand", ref: Number(numerator.urutan) },
      { kind: "op", op: "/" },
      { kind: "operand", ref: Number(denominator.urutan) },
    ];
  }

  if (policy.type === "decrease_ratio") {
    const previous = findChildByPolicyKey(children, policy.previous_key);
    const current = findChildByPolicyKey(children, policy.current_key);
    if (!previous || !current) return null;
    return [
      { kind: "open_paren" },
      { kind: "operand", ref: Number(previous.urutan) },
      { kind: "op", op: "-" },
      { kind: "operand", ref: Number(current.urutan) },
      { kind: "close_paren" },
      { kind: "op", op: "/" },
      { kind: "operand", ref: Number(previous.urutan) },
    ];
  }

  return [];
}

export async function syncMasterFormulaFromPercentPolicies(
  percentPolicies: PercentPolicy[] = [],
) {
  const kriteriaList = (await LkeKriteria.find({ aktif: true }).lean()) as KriteriaLike[];
  const byQuestionId = new Map(
    kriteriaList.map((item) => [Number(item.question_id), item]),
  );
  const childrenByParent = buildChildrenByParent(kriteriaList);
  const normalized = normalizePercentPoliciesForStorage(kriteriaList, percentPolicies);
  const operations: AnyBulkWriteOperation[] = [];

  for (const policy of normalized) {
    const qid = Number(policy.question_id);
    const parent = byQuestionId.get(qid);
    if (!parent || parent.answer_type !== "persen") continue;

    const tokens = buildFormulaTokensFromPolicy(
      policy,
      childrenByParent.get(qid) ?? [],
    );
    if (tokens === null) continue;

    operations.push({
      updateOne: {
        filter: { question_id: qid },
        update: {
          $set: {
            formula_tokens: tokens.length > 0 ? tokens : null,
            formula_min: 0,
            formula_max: policy.cap_at_100 === false ? Math.max(Number(parent.formula_max ?? 100), 100) : 100,
            formula_zero_division_full_score: policy.zero_division === "full_score",
          },
        },
      },
    });
  }

  if (operations.length > 0) {
    await LkeKriteria.collection.bulkWrite(operations);
  }

  return normalized;
}

export async function syncMasterPercentDraftsFromScoring(
  drafts: PercentMasterDraftInput[] = [],
) {
  const validDrafts = drafts.filter((draft) => Number(draft?.question_id) > 0);
  if (validDrafts.length === 0) return;

  let maxDoc = (await LkeKriteria.findOne()
    .sort({ question_id: -1 })
    .select("question_id")
    .lean()) as { question_id?: number } | null;
  let nextQuestionId = Number(maxDoc?.question_id ?? 0) + 1;

  for (const draft of validDrafts) {
    const parent = (await LkeKriteria.findOne({
      question_id: Number(draft.question_id),
      aktif: true,
    }).lean()) as KriteriaLike | null;

    if (!parent || parent.answer_type !== "persen") continue;

    const existingChildren = (await LkeKriteria.find({
      parent_question_id: Number(parent.question_id),
      answer_type: "jumlah",
      aktif: true,
    }).lean()) as (KriteriaLike & { _id?: unknown })[];

    const incoming = Array.isArray(draft.sub_items) ? draft.sub_items : [];
    const activeIncoming = incoming.filter((item) => item && !item.toDelete);
    const incomingIds = new Set(
      activeIncoming
        .map((item) => String(item._id || ""))
        .filter(Boolean),
    );

    for (const child of existingChildren) {
      const id = String(child._id || "");
      if (id && !incomingIds.has(id)) {
        await LkeKriteria.findByIdAndUpdate(id, { aktif: false });
      }
    }

    let urutan = 1;
    for (const item of activeIncoming) {
      const childPayload = {
        question_id: Number(item.question_id) || undefined,
        parent_question_id: Number(parent.question_id),
        komponen: parent.komponen,
        seksi: parent.seksi || "pemenuhan",
        sub_komponen: String(item.sub_komponen || "").trim(),
        urutan,
        pertanyaan: String(item.pertanyaan || ""),
        standar_dokumen: "",
        kriteria_panrb: "",
        bobot: Number(item.bobot) || 0,
        answer_type: "jumlah",
        is_computed: Boolean(item.is_computed),
        formula_tokens:
          item.is_computed && Array.isArray(item.formula_tokens) && item.formula_tokens.length > 0
            ? item.formula_tokens
            : null,
        formula_min: 0,
        formula_max: 100,
        formula_zero_division_full_score: false,
        aktif: true,
      };

      if (item._id) {
        const { question_id, ...updatePayload } = childPayload;
        await LkeKriteria.findByIdAndUpdate(item._id, updatePayload);
      } else {
        await LkeKriteria.create({
          ...childPayload,
          question_id: childPayload.question_id || nextQuestionId++,
        });
      }

      urutan += 1;
    }

    await LkeKriteria.findOneAndUpdate(
      { question_id: Number(parent.question_id) },
      {
        $set: {
          formula_tokens:
            Array.isArray(draft.formula_tokens) && draft.formula_tokens.length > 0
              ? draft.formula_tokens
              : null,
          formula_min: Number(draft.formula_min ?? 0),
          formula_max: Number(draft.formula_max ?? 100),
          formula_zero_division_full_score: Boolean(
            draft.formula_zero_division_full_score,
          ),
        },
      },
    );
  }
}

export async function getActiveScoringConfig(kriteriaList?: KriteriaLike[]) {
  const cfg = await ZiScoringConfig.findOne({ is_active: true })
    .sort({ updatedAt: -1 })
    .lean();
  const criteria =
    kriteriaList ?? ((await LkeKriteria.find({ aktif: true }).lean()) as KriteriaLike[]);
  const percentPolicies = mergePercentPoliciesWithMaster(
    criteria,
    ((cfg as { percent_policies?: PercentPolicy[] } | null)?.percent_policies ?? []),
  );

  if (!cfg) {
    return percentPolicies.length > 0 ? { percent_policies: percentPolicies } : null;
  }

  return {
    ...cfg,
    percent_policies: percentPolicies,
  };
}

export async function isMasterKriteriaLocked() {
  const cfg = await getActiveScoringConfig();
  return Boolean(
    (cfg as { lock_master_kriteria?: boolean } | null)?.lock_master_kriteria,
  );
}

export function buildDefaultSubcomponentWeights(kriteriaList: KriteriaLike[]) {
  const map = new Map<string, { komponen: string; seksi: "pemenuhan" | "reform" | "hasil"; sub_komponen: string; bobot_total: number }>();
  for (const k of kriteriaList) {
    if (k?.aktif === false) continue;
    const entry = {
      komponen: k.komponen,
      seksi: (k.seksi || "pemenuhan") as "pemenuhan" | "reform" | "hasil",
      sub_komponen: k.sub_komponen || "",
    };
    const key = keyOf(entry);
    const prev = map.get(key);
    if (prev) {
      prev.bobot_total += Number(k.bobot) || 0;
    } else {
      map.set(key, { ...entry, bobot_total: Number(k.bobot) || 0 });
    }
  }
  return [...map.values()]
    .sort((a, b) =>
      a.komponen.localeCompare(b.komponen) ||
      a.seksi.localeCompare(b.seksi) ||
      a.sub_komponen.localeCompare(b.sub_komponen),
    )
    .map((item) => ({ ...item, bobot_total: Math.round(item.bobot_total * 10000) / 10000 }));
}
