"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Loader2,
  Save,
  Plus,
  Trash2,
  Info,
  ChevronDown,
  ChevronUp,
  Calculator,
  TrendingDown,
  Percent,
  Lock,
  Unlock,
  Pencil,
  X,
} from "lucide-react";

import { hasPermission } from "@/lib/permissions";
import { useAuthStore } from "@/store/authStore";

// ── Types ─────────────────────────────────────────────────────────────────────

type WeightRow = {
  komponen: string;
  seksi: "pemenuhan" | "reform" | "hasil";
  sub_komponen: string;
  bobot_total: number;
  aktif?: boolean;
};

type PolicyType = "direct_percent" | "ratio" | "decrease_ratio";
type FormulaOp = "+" | "-" | "*" | "/";
type FormulaTokenKind = "operand" | "op" | "open_paren" | "close_paren";

type FormulaToken = {
  kind: FormulaTokenKind;
  ref?: number;
  op?: FormulaOp;
};

type KriteriaOption = {
  _id?: string;
  question_id: number;
  parent_question_id?: number | null;
  komponen: string;
  seksi?: "pemenuhan" | "reform" | "hasil";
  pertanyaan: string;
  sub_komponen?: string;
  urutan?: number;
  bobot?: number;
  answer_type: string;
  is_computed?: boolean;
  formula_tokens?: FormulaToken[] | null;
  formula_min?: number;
  formula_max?: number;
  formula_zero_division_full_score?: boolean;
};

type PercentPolicy = {
  question_id: number;
  type: PolicyType;
  numerator_key?: string;
  denominator_key?: string;
  previous_key?: string;
  current_key?: string;
  cap_at_100?: boolean;
  zero_division?: "full_score" | "zero" | "ignore";
};

type SubItemDraft = {
  tempId: string;
  _id?: string;
  question_id?: number;
  pertanyaan: string;
  sub_komponen: string;
  bobot: number;
  is_computed: boolean;
  formula_tokens: FormulaToken[];
  toDelete?: boolean;
};

type PercentMasterDraft = {
  question_id: number;
  sub_items: SubItemDraft[];
  formula_tokens: FormulaToken[];
  formula_min: number;
  formula_max: number;
  formula_zero_division_full_score: boolean;
};

// ── Policy type config ────────────────────────────────────────────────────────

const POLICY_TYPE_CONFIG: Record<
  PolicyType,
  {
    label: string;
    desc: string;
    formula: string;
    icon: React.ReactNode;
    color: string;
    fields: ("numerator" | "denominator" | "previous" | "current")[];
  }
> = {
  direct_percent: {
    label: "Persen Langsung",
    desc: "Nilai yang diisi unit sudah berupa persen (0–100). Tidak perlu perhitungan tambahan.",
    formula: 'Contoh: unit mengisi "75" → skor = 75%',
    icon: <Percent size={14} />,
    color:
      "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    fields: [],
  },
  ratio: {
    label: "Rasio (Pembilang ÷ Penyebut)",
    desc: "Skor dihitung dari perbandingan jumlah yang memenuhi dibagi total. Masukkan nama kolom data untuk pembilang dan penyebut.",
    formula: "Rumus: Jumlah Memenuhi ÷ Total × 100%",
    icon: <Calculator size={14} />,
    color:
      "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
    fields: ["numerator", "denominator"],
  },
  decrease_ratio: {
    label: "Rasio Penurunan",
    desc: "Skor dihitung dari seberapa besar penurunan nilai periode sebelumnya ke periode sekarang. Cocok untuk indikator yang semakin kecil semakin baik.",
    formula: "Rumus: (Nilai Lama − Nilai Baru) ÷ Nilai Lama × 100%",
    icon: <TrendingDown size={14} />,
    color:
      "bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-800",
    fields: ["previous", "current"],
  },
};

const toLetterLabel = (urutan: number) => String.fromCharCode(64 + urutan);

function formulaToString(tokens: FormulaToken[]) {
  if (!tokens.length) return "";
  return tokens
    .map((token) => {
      if (token.kind === "operand") return toLetterLabel(token.ref ?? 0);
      if (token.kind === "op") return token.op ?? "?";
      if (token.kind === "open_paren") return "(";
      if (token.kind === "close_paren") return ")";
      return "?";
    })
    .join(" ");
}

function hasDivisionOperator(tokens: FormulaToken[] = []) {
  return tokens.some((token) => token.kind === "op" && token.op === "/");
}

function getDecreaseFormulaRefs(tokens: FormulaToken[] = []) {
  if (
    tokens.length === 7 &&
    tokens[0]?.kind === "open_paren" &&
    tokens[1]?.kind === "operand" &&
    tokens[2]?.kind === "op" &&
    tokens[2]?.op === "-" &&
    tokens[3]?.kind === "operand" &&
    tokens[4]?.kind === "close_paren" &&
    tokens[5]?.kind === "op" &&
    tokens[5]?.op === "/" &&
    tokens[6]?.kind === "operand" &&
    Number(tokens[1]?.ref) === Number(tokens[6]?.ref)
  ) {
    return {
      previousRef: Number(tokens[1]?.ref),
      currentRef: Number(tokens[3]?.ref),
    };
  }

  return null;
}

function calcBuilderState(tokens: FormulaToken[]) {
  let expectOperand = true;
  let parenDepth = 0;

  for (const token of tokens) {
    if (token.kind === "operand" || token.kind === "close_paren") {
      expectOperand = false;
    } else {
      expectOperand = true;
    }
    if (token.kind === "open_paren") parenDepth++;
    if (token.kind === "close_paren") parenDepth--;
  }

  return { expectOperand, parenDepth };
}

function FormulaBuilder({
  tokens,
  onChange,
  availableItems,
  excludeUrutan,
  suffix,
}: {
  tokens: FormulaToken[];
  onChange: (tokens: FormulaToken[]) => void;
  availableItems: { urutan: number; label: string }[];
  excludeUrutan?: number;
  suffix?: string;
}) {
  const items = availableItems.filter((item) => item.urutan !== excludeUrutan);
  const { expectOperand, parenDepth } = calcBuilderState(tokens);
  const display = formulaToString(tokens);

  function push(token: FormulaToken) {
    onChange([...tokens, token]);
  }

  return (
    <div className="space-y-2">
      <div className="min-h-8 px-2.5 py-1.5 rounded border border-blue-200 dark:border-blue-700/40 bg-white dark:bg-content1 text-xs font-mono flex items-center gap-1 flex-wrap">
        {tokens.length === 0 ? (
          <span className="text-default-300 italic font-sans text-[10px]">
            Klik operan untuk mulai membangun formula...
          </span>
        ) : (
          <span className="text-blue-700 dark:text-blue-300 font-semibold">
            {display}
          </span>
        )}
        {suffix && tokens.length > 0 && (
          <span className="text-default-400 text-[10px] font-sans">
            {suffix}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-1 items-center">
        <button
          className="px-2.5 py-1 text-[10px] rounded border border-violet-300 dark:border-violet-600 bg-violet-50 dark:bg-violet-900/20 font-mono font-bold text-violet-700 dark:text-violet-300 disabled:opacity-30"
          disabled={!expectOperand}
          type="button"
          onClick={() => push({ kind: "open_paren" })}
        >
          (
        </button>
        {items.map((item) => (
          <button
            key={item.urutan}
            className="px-2.5 py-1 text-[10px] rounded border border-blue-300 dark:border-blue-600 bg-white dark:bg-content1 font-mono font-bold text-blue-700 dark:text-blue-300 disabled:opacity-30"
            disabled={!expectOperand}
            title={item.label}
            type="button"
            onClick={() => push({ kind: "operand", ref: item.urutan })}
          >
            {toLetterLabel(item.urutan)}
          </button>
        ))}
        <button
          className="px-2.5 py-1 text-[10px] rounded border border-violet-300 dark:border-violet-600 bg-violet-50 dark:bg-violet-900/20 font-mono font-bold text-violet-700 dark:text-violet-300 disabled:opacity-30"
          disabled={expectOperand || parenDepth <= 0}
          type="button"
          onClick={() => push({ kind: "close_paren" })}
        >
          )
        </button>

        <span className="text-default-300 text-[10px] px-0.5">|</span>

        {(["+", "-", "*", "/"] as FormulaOp[]).map((op) => (
          <button
            key={op}
            className="px-2.5 py-1 text-[10px] rounded border border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20 font-mono font-bold text-amber-700 dark:text-amber-300 disabled:opacity-30"
            disabled={expectOperand}
            type="button"
            onClick={() => push({ kind: "op", op })}
          >
            {op}
          </button>
        ))}

        {tokens.length > 0 && (
          <>
            <button
              className="px-2 py-1 text-[10px] rounded border border-default-200 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-default-400 hover:text-rose-500 transition-colors"
              type="button"
              onClick={() => onChange(tokens.slice(0, -1))}
            >
              {"<- Hapus"}
            </button>
            <button
              className="px-2 py-1 text-[10px] rounded border border-rose-200 dark:border-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-400 hover:text-rose-600 transition-colors"
              type="button"
              onClick={() => onChange([])}
            >
              Bersihkan
            </button>
          </>
        )}
      </div>

      {items.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[9px] text-default-400">
          {items.map((item) => (
            <span key={item.urutan}>
              <span className="font-mono font-bold text-blue-500">
                {toLetterLabel(item.urutan)}
              </span>
              {" = "}
              {item.label || "(belum diisi)"}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function makeSubItemDraft(child: KriteriaOption): SubItemDraft {
  return {
    tempId: child._id || `qid-${child.question_id}`,
    _id: child._id,
    question_id: child.question_id,
    pertanyaan: child.pertanyaan || "",
    sub_komponen: child.sub_komponen || "",
    bobot: Number(child.bobot || 0),
    is_computed: Boolean(child.is_computed),
    formula_tokens: child.formula_tokens || [],
  };
}

function buildMasterDrafts(kriteriaList: KriteriaOption[]) {
  const drafts: Record<number, PercentMasterDraft> = {};
  const parents = kriteriaList.filter((item) => item.answer_type === "persen");

  for (const parent of parents) {
    const children = kriteriaList
      .filter(
        (item) =>
          item.answer_type === "jumlah" &&
          item.parent_question_id === parent.question_id,
      )
      .sort((a, b) => Number(a.urutan || 0) - Number(b.urutan || 0));

    drafts[parent.question_id] = {
      question_id: parent.question_id,
      sub_items: children.map(makeSubItemDraft),
      formula_tokens: parent.formula_tokens || [],
      formula_min: Number(parent.formula_min ?? 0),
      formula_max: Number(parent.formula_max ?? 100),
      formula_zero_division_full_score: Boolean(
        parent.formula_zero_division_full_score,
      ),
    };
  }

  return drafts;
}

function mergePoliciesWithPercentKriteria(
  currentPolicies: PercentPolicy[],
  kriteriaList: KriteriaOption[],
) {
  const byQuestionId = new Map<number, PercentPolicy>();
  for (const policy of currentPolicies || []) {
    const qid = Number(policy.question_id);
    if (qid > 0) {
      byQuestionId.set(qid, {
        ...policy,
        question_id: qid,
        type: policy.type || "direct_percent",
      });
    }
  }

  for (const item of kriteriaList) {
    if (item.answer_type !== "persen") continue;
    if (!byQuestionId.has(item.question_id)) {
      byQuestionId.set(item.question_id, {
        question_id: item.question_id,
        type: "direct_percent",
        cap_at_100: true,
        zero_division: "full_score",
      });
    }
  }

  return [...byQuestionId.values()].sort(
    (a, b) => Number(a.question_id) - Number(b.question_id),
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function activeDraftItems(draft?: PercentMasterDraft) {
  return draft?.sub_items.filter((item) => !item.toDelete) ?? [];
}

function getPolicyFormulaSummary(draft?: PercentMasterDraft) {
  if (draft?.formula_tokens?.length) {
    return `${formulaToString(draft.formula_tokens)} * 100`;
  }

  return "Input persen langsung";
}

function PolicyCard({
  policy,
  masterDraft,
  onMasterDraftChange,
}: {
  policy: PercentPolicy;
  masterDraft?: PercentMasterDraft;
  onMasterDraftChange: (draft: PercentMasterDraft) => void;
}) {
  const draft =
    masterDraft ?? {
      question_id: policy.question_id,
      sub_items: [],
      formula_tokens: [],
      formula_min: 0,
      formula_max: 100,
      formula_zero_division_full_score: false,
    };
  const activeSubItems = draft.sub_items.filter((item) => !item.toDelete);
  const children = activeSubItems.map((item, index) => ({
    ...item,
    question_id: item.question_id ?? 0,
    urutan: index + 1,
  }));
  const hasChildren = children.length > 0;
  const questionSelected = (policy.question_id ?? 0) > 0;

  const formulaItems = activeSubItems.map((item, index) => ({
    urutan: index + 1,
    label: item.pertanyaan || `Sub-item ${index + 1}`,
  }));
  const decreaseFormulaRefs = getDecreaseFormulaRefs(draft.formula_tokens);

  function updateDraft(patch: Partial<PercentMasterDraft>) {
    onMasterDraftChange({ ...draft, ...patch });
  }

  function updateSubItem(
    tempId: string,
    field: keyof SubItemDraft,
    value: unknown,
  ) {
    updateDraft({
      sub_items: draft.sub_items.map((item) =>
        item.tempId === tempId ? { ...item, [field]: value } : item,
      ),
    });
  }

  function addSubItem() {
    updateDraft({
      sub_items: [
        ...draft.sub_items,
        {
          tempId: `new-${Date.now()}`,
          pertanyaan: "",
          sub_komponen: "",
          bobot: 0,
          is_computed: false,
          formula_tokens: [],
        },
      ],
    });
  }

  function removeSubItem(tempId: string) {
    updateDraft({
      sub_items: draft.sub_items.map((item) =>
        item.tempId === tempId ? { ...item, toDelete: true } : item,
      ),
    });
  }

  return (
    <div className="rounded-xl border border-default-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-default-50 border-b border-default-100">
        <div className="flex items-center gap-3 min-w-0">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border shrink-0 bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800">
            <Calculator size={14} />
            Formula Persentase
          </span>
          <span className="text-sm text-default-500 truncate">
            {questionSelected ? (
              <strong className="text-foreground">#{policy.question_id}</strong>
            ) : (
              <span className="italic text-default-400">Belum dipilih</span>
            )}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex items-start gap-2 rounded-lg bg-default-100 px-3 py-2.5">
          <Info className="text-default-400 mt-0.5 shrink-0" size={13} />
          <p className="text-xs text-default-600 leading-relaxed">
            Kelola sub-item jumlah, susun formula persentase, lalu tentukan batas
            nilai akhir dengan Min (%) dan Maks (%).
          </p>
        </div>

          {/* Sub-item hint */}
          {questionSelected && hasChildren && (
            <div className="flex items-center gap-2 rounded-lg bg-green-500/8 border border-green-200 dark:border-green-800/50 px-3 py-2">
              <Info
                className="text-green-600 dark:text-green-400 shrink-0"
                size={12}
              />
              <p className="text-[11px] text-green-700 dark:text-green-400">
                Ditemukan <strong>{children.length} sub-item</strong> untuk
                pertanyaan ini. Pilih dari dropdown di bawah.
              </p>
            </div>
          )}

          {questionSelected && (
            <div className="rounded-lg border border-blue-200 dark:border-blue-700/40 bg-blue-50/50 dark:bg-blue-950/20 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">
                    Detil Indikator
                  </p>
                  <p className="text-[10px] text-blue-500 dark:text-blue-400 mt-0.5">
                    Kelola sub-item jumlah dan rumus persen untuk pertanyaan ini.
                  </p>
                </div>
                <button
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs hover:bg-blue-700 transition-colors"
                  type="button"
                  onClick={addSubItem}
                >
                  <Plus size={11} />
                  Tambah
                </button>
              </div>

              {activeSubItems.length === 0 ? (
                <p className="text-[10px] text-blue-400 italic">
                  Belum ada detil. Klik &quot;Tambah&quot; untuk menambahkan.
                </p>
              ) : (
                <div className="space-y-3">
                  {activeSubItems.map((item, index) => {
                    const letter = toLetterLabel(index + 1);

                    return (
                      <div
                        key={item.tempId}
                        className="rounded-lg border border-blue-200 dark:border-blue-700/30 bg-white dark:bg-content1 p-3 space-y-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400 shrink-0">
                            {letter}
                          </span>
                          <input
                            className="flex-1 px-2 py-1.5 text-xs rounded border border-blue-200 dark:border-blue-700/40 bg-blue-50 dark:bg-content2 focus:outline-none focus:border-blue-400"
                            placeholder="mis: Jumlah yang memenuhi"
                            type="text"
                            value={item.pertanyaan}
                            onChange={(e) =>
                              updateSubItem(
                                item.tempId,
                                "pertanyaan",
                                e.target.value,
                              )
                            }
                          />
                          <input
                            className="w-16 px-2 py-1.5 text-xs rounded border border-blue-200 dark:border-blue-700/40 bg-blue-50 dark:bg-content2 focus:outline-none focus:border-blue-400 text-center"
                            placeholder="Bobot"
                            step="0.01"
                            type="number"
                            value={item.bobot}
                            onChange={(e) =>
                              updateSubItem(
                                item.tempId,
                                "bobot",
                                parseFloat(e.target.value) || 0,
                              )
                            }
                          />
                          <button
                            className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-900/20 text-default-400 hover:text-rose-500 transition-colors shrink-0"
                            type="button"
                            onClick={() => removeSubItem(item.tempId)}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>

                        <div className="flex items-center gap-2 pl-8">
                          <span className="text-[10px] text-blue-500 dark:text-blue-400 whitespace-nowrap">
                            Nama Key:
                          </span>
                          <input
                            className="flex-1 px-2 py-1 text-[10px] font-mono rounded border border-blue-200 dark:border-blue-700/40 bg-blue-50 dark:bg-content2 focus:outline-none focus:border-blue-400"
                            placeholder="opsional, boleh sama; sistem tetap memakai ID unik"
                            type="text"
                            value={item.sub_komponen}
                            onChange={(e) =>
                              updateSubItem(
                                item.tempId,
                                "sub_komponen",
                                e.target.value,
                              )
                            }
                          />
                        </div>

                        <div className="flex items-center gap-3 pl-8">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              checked={item.is_computed}
                              className="w-3.5 h-3.5 rounded"
                              type="checkbox"
                              onChange={(e) =>
                                updateSubItem(
                                  item.tempId,
                                  "is_computed",
                                  e.target.checked,
                                )
                              }
                            />
                            <span className="text-[10px] text-blue-600 dark:text-blue-400">
                              Nilai ini adalah hasil perhitungan
                            </span>
                          </label>
                        </div>

                        {item.is_computed && (
                          <div className="pl-8 space-y-1">
                            <p className="text-[9px] font-semibold text-blue-500 uppercase tracking-wide">
                              {letter} =
                            </p>
                            <FormulaBuilder
                              availableItems={formulaItems}
                              excludeUrutan={index + 1}
                              tokens={item.formula_tokens}
                              onChange={(tokens) =>
                                updateSubItem(
                                  item.tempId,
                                  "formula_tokens",
                                  tokens,
                                )
                              }
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {activeSubItems.length >= 2 && (
                <div className="border-t border-blue-200 dark:border-blue-700/40 pt-3 space-y-2">
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">
                    Formula Persentase
                  </p>
                  <p className="text-[10px] text-blue-500 dark:text-blue-400">
                    Bangun ekspresi untuk menghitung nilai %. Hasil otomatis dikali 100.
                  </p>
                  <FormulaBuilder
                    availableItems={formulaItems}
                    suffix=" * 100"
                    tokens={draft.formula_tokens}
                    onChange={(tokens) =>
                      updateDraft({
                        formula_tokens: tokens,
                        formula_zero_division_full_score: hasDivisionOperator(
                          tokens,
                        )
                          ? draft.formula_zero_division_full_score
                          : false,
                      })
                    }
                  />
                  <div className="flex gap-3 pt-1">
                    <label className="flex flex-col gap-1 flex-1">
                      <span className="text-[10px] text-blue-500 dark:text-blue-400">
                        Min (%)
                      </span>
                      <input
                        className="w-full rounded border border-blue-200 dark:border-blue-700/40 bg-transparent px-2 py-1 text-xs"
                        type="number"
                        value={draft.formula_min}
                        onChange={(e) =>
                          updateDraft({
                            formula_min: Number(e.target.value),
                          })
                        }
                      />
                    </label>
                    <label className="flex flex-col gap-1 flex-1">
                      <span className="text-[10px] text-blue-500 dark:text-blue-400">
                        Maks (%)
                      </span>
                      <input
                        className="w-full rounded border border-blue-200 dark:border-blue-700/40 bg-transparent px-2 py-1 text-xs"
                        type="number"
                        value={draft.formula_max}
                        onChange={(e) =>
                          updateDraft({
                            formula_max: Number(e.target.value),
                          })
                        }
                      />
                    </label>
                  </div>
                  {hasDivisionOperator(draft.formula_tokens) && (
                    <label className="flex items-start gap-2 rounded border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-[10px] text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-950/20 dark:text-emerald-300">
                      <input
                        checked={draft.formula_zero_division_full_score}
                        className="mt-0.5 h-3.5 w-3.5 rounded"
                        type="checkbox"
                        onChange={(e) =>
                          updateDraft({
                            formula_zero_division_full_score: e.target.checked,
                          })
                        }
                      />
                      <span>
                        {decreaseFormulaRefs
                          ? "Aturan LKE penurunan: jika pembagi dan nilai saat ini sama-sama 0, gunakan Maks (%); jika nilai saat ini lebih dari 0, hasilnya 0."
                          : "Jika pembagi 0, gunakan nilai Maks (%). Jika tidak dicentang, hasilnya 0."}
                      </span>
                    </label>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ZiScoringConfigPage() {
  const role = useAuthStore((s) => s.role);
  const canManage = hasPermission(role, "zi:scoring:manage");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [weights, setWeights] = useState<WeightRow[]>([]);
  const [policies, setPolicies] = useState<PercentPolicy[]>([]);
  const [masterDrafts, setMasterDrafts] = useState<
    Record<number, PercentMasterDraft>
  >({});
  const [lockMaster, setLockMaster] = useState(true);
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(false);
  const [showWeights, setShowWeights] = useState(false);
  const [selectedQuestionId, setSelectedQuestionId] = useState<number | null>(
    null,
  );
  const [editingPolicyIndex, setEditingPolicyIndex] = useState<number | null>(
    null,
  );
  const [allKriteria, setAllKriteria] = useState<KriteriaOption[]>([]);

  const persenKriteria = useMemo(
    () => allKriteria.filter((k) => k.answer_type === "persen"),
    [allKriteria],
  );
  const selectedPolicyIndex =
    selectedQuestionId == null
      ? -1
      : policies.findIndex((p) => Number(p.question_id) === selectedQuestionId);
  const selectedPolicy =
    selectedPolicyIndex >= 0 ? policies[selectedPolicyIndex] : null;
  const selectedQuestion = selectedPolicy
    ? persenKriteria.find((k) => k.question_id === selectedPolicy.question_id)
    : undefined;
  const editingPolicy =
    editingPolicyIndex !== null ? policies[editingPolicyIndex] ?? null : null;
  const editingQuestion = editingPolicy
    ? persenKriteria.find((k) => k.question_id === editingPolicy.question_id)
    : undefined;

  useEffect(() => {
    if (!canManage) return;
    (async () => {
      setLoading(true);
      try {
        const [{ data }, kriRes] = await Promise.all([
          axios.get("/api/zi/scoring-config"),
          axios.get("/api/zi/kriteria?aktif=true"),
        ]);
        const activeRows: WeightRow[] =
          data?.config?.subcomponent_weights?.length > 0
            ? data.config.subcomponent_weights
            : data?.defaults || [];

        setWeights(
          activeRows.map((r: WeightRow) => ({
            ...r,
            bobot_total: Number(r.bobot_total || 0),
            aktif: r.aktif !== false,
          })),
        );
        const kriteriaRows = kriRes.data?.kriteria || [];
        setPolicies(
          mergePoliciesWithPercentKriteria(
            data?.config?.percent_policies || [],
            kriteriaRows,
          ),
        );
        setLockMaster(Boolean(data?.config?.lock_master_kriteria ?? true));
        setNotes(String(data?.config?.notes || ""));
        setAllKriteria(kriteriaRows);
        setMasterDrafts(buildMasterDrafts(kriteriaRows));
        setHasUnpublishedChanges(false);
      } finally {
        setLoading(false);
      }
    })();
  }, [canManage]);

  const sortedWeights = useMemo(
    () =>
      [...weights].sort(
        (a, b) =>
          a.komponen.localeCompare(b.komponen) ||
          a.seksi.localeCompare(b.seksi) ||
          a.sub_komponen.localeCompare(b.sub_komponen),
      ),
    [weights],
  );

  function updateWeight(index: number, value: number) {
    setHasUnpublishedChanges(true);
    setMessage(null);
    setWeights((prev) =>
      prev.map((r, i) => (i === index ? { ...r, bobot_total: value } : r)),
    );
  }

  function updateMasterDraft(questionId: number, draft: PercentMasterDraft) {
    if (!questionId) return;
    setHasUnpublishedChanges(true);
    setMessage(null);
    setMasterDrafts((prev) => ({
      ...prev,
      [questionId]: draft,
    }));
  }

  function selectPolicyByQuestionId(value: string) {
    const qid = Number(value || 0);
    if (!qid) {
      setSelectedQuestionId(null);
      setEditingPolicyIndex(null);
      return;
    }

    const index = policies.findIndex((p) => Number(p.question_id) === qid);
    setSelectedQuestionId(qid);
    setEditingPolicyIndex(index >= 0 ? index : null);
  }

  function resetSelectedPolicy() {
    if (!selectedPolicy) return;
    if (!confirm("Reset aturan scoring untuk ID ini?")) return;

    const questionId = Number(selectedPolicy.question_id);
    setHasUnpublishedChanges(true);
    setMessage(null);
    setPolicies((prev) =>
      prev.map((policy) =>
        Number(policy.question_id) === questionId
          ? {
              question_id: questionId,
              type: "direct_percent",
              cap_at_100: true,
              zero_division: "zero",
            }
          : policy,
      ),
    );
    setMasterDrafts((prev) => {
      const draft = prev[questionId];
      if (!draft) return prev;
      return {
        ...prev,
        [questionId]: {
          ...draft,
          formula_tokens: [],
          formula_min: 0,
          formula_max: 100,
          formula_zero_division_full_score: false,
        },
      };
    });
    setEditingPolicyIndex(null);
  }

  async function saveConfig() {
    setSaving(true);
    setMessage(null);
    try {
      const { data } = await axios.put("/api/zi/scoring-config", {
        lock_master_kriteria: lockMaster,
        notes,
        subcomponent_weights: weights.map((r) => ({
          ...r,
          bobot_total: Number(r.bobot_total || 0),
          aktif: r.aktif !== false,
        })),
        percent_policies: policies
          .filter((p) => Number(p.question_id) > 0)
          .map((p) => ({
            ...p,
            question_id: Number(p.question_id),
          })),
        percent_master_drafts: Object.values(masterDrafts).filter(
          (draft) => Number(draft.question_id) > 0,
        ),
      });
      const kriRes = await axios.get("/api/zi/kriteria?aktif=true");
      const kriteriaRows = kriRes.data?.kriteria || [];
      setAllKriteria(kriteriaRows);
      setMasterDrafts(buildMasterDrafts(kriteriaRows));
      setPolicies(
        mergePoliciesWithPercentKriteria(
          data?.config?.percent_policies || [],
          kriteriaRows,
        ),
      );
      setMessage({
        type: "success",
        text: "Konfigurasi penilaian berhasil dipublish sebagai versi aktif.",
      });
      setHasUnpublishedChanges(false);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || "Gagal menyimpan konfigurasi.";

      setMessage({ type: "error", text: msg });
    } finally {
      setSaving(false);
    }
  }

  if (!canManage) {
    return (
      <div className="p-6 text-sm text-rose-600">
        Anda tidak memiliki akses ke halaman ini.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Konfigurasi Penilaian LKE</h1>
        <p className="text-sm text-default-500">
          Atur bobot sub-komponen dan cara penghitungan jawaban persen untuk
          evaluasi LKE Zona Integritas.
        </p>
      </div>

      {loading ? (
        <div className="rounded-xl border border-default-200 p-8 flex items-center justify-center gap-2 text-default-500">
          <Loader2 className="animate-spin" size={18} />
          <span className="text-sm">Memuat konfigurasi...</span>
        </div>
      ) : (
        <>
          {/* ── Pengaturan Umum ── */}
          <div className="rounded-xl border border-default-200 p-4 space-y-4">
            <h2 className="text-sm font-semibold">Pengaturan Umum</h2>

            {/* Lock master */}
            <label
              aria-label="Kunci Bobot di Master Kriteria"
              className="flex items-start gap-3 cursor-pointer group"
              htmlFor="lock-master"
            >
              <div className="mt-0.5">
                <input
                  checked={lockMaster}
                  className="sr-only"
                  id="lock-master"
                  type="checkbox"
                  onChange={(e) => {
                    setLockMaster(e.target.checked);
                    setHasUnpublishedChanges(true);
                    setMessage(null);
                  }}
                />
                <div
                  className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 ${lockMaster ? "bg-primary" : "bg-default-300"}`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${lockMaster ? "translate-x-4" : "translate-x-0"}`}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-sm font-medium">
                  {lockMaster ? (
                    <Lock className="text-primary" size={13} />
                  ) : (
                    <Unlock className="text-default-400" size={13} />
                  )}
                  Kunci Bobot di Master Kriteria
                  <span className="text-[10px] font-normal text-default-400 bg-default-100 px-1.5 py-0.5 rounded">
                    Disarankan aktif
                  </span>
                </div>
                <p className="text-xs text-default-500 mt-0.5">
                  Jika aktif, bobot sub-komponen di tabel Master Kriteria tidak
                  bisa diubah secara mandiri — hanya melalui halaman ini.
                </p>
              </div>
            </label>

            {/* Catatan versi */}
            <div className="space-y-1.5">
              <label
                className="text-xs font-semibold text-default-600"
                htmlFor="notes-versi"
              >
                Catatan Versi
              </label>
              <textarea
                className="w-full px-3 py-2 text-sm rounded-lg border border-default-200 bg-content1 focus:outline-none focus:border-primary resize-none"
                id="notes-versi"
                placeholder="Contoh: Update bobot PW sesuai Permenpan No. XX/2024"
                rows={2}
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  setHasUnpublishedChanges(true);
                  setMessage(null);
                }}
              />
              <p className="text-[11px] text-default-400">
                Opsional — untuk keperluan audit dan riwayat perubahan
              </p>
            </div>
          </div>

          {/* ── Bobot Sub-Komponen ── */}
          <div className="rounded-xl border border-default-200 overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-default-50 transition-colors text-left"
              onClick={() => setShowWeights((v) => !v)}
            >
              <div>
                <h2 className="text-sm font-semibold">Bobot Sub-Komponen</h2>
                <p className="text-xs text-default-400 mt-0.5">
                  {weights.length} sub-komponen dikonfigurasi
                </p>
              </div>
              {showWeights ? (
                <ChevronUp className="text-default-400" size={16} />
              ) : (
                <ChevronDown className="text-default-400" size={16} />
              )}
            </button>
            {showWeights && (
              <div className="border-t border-default-100 overflow-auto">
                <table className="w-full text-sm min-w-[600px]">
                  <thead className="bg-default-50">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-medium text-default-500 text-xs">
                        Komponen
                      </th>
                      <th className="text-left px-3 py-2.5 font-medium text-default-500 text-xs">
                        Seksi
                      </th>
                      <th className="text-left px-3 py-2.5 font-medium text-default-500 text-xs">
                        Sub-Komponen
                      </th>
                      <th className="text-left px-3 py-2.5 font-medium text-default-500 text-xs w-36">
                        Bobot Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-default-100">
                    {sortedWeights.map((row, idx) => (
                      <tr
                        key={`${row.komponen}-${row.seksi}-${row.sub_komponen}-${idx}`}
                      >
                        <td className="px-4 py-2 font-medium">
                          {row.komponen}
                        </td>
                        <td className="px-3 py-2 text-default-500">
                          {row.seksi}
                        </td>
                        <td className="px-3 py-2 text-default-500">
                          {row.sub_komponen || "—"}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            className="w-full px-2 py-1.5 rounded border border-default-200 text-sm focus:outline-none focus:border-primary"
                            step="0.0001"
                            type="number"
                            value={row.bobot_total}
                            onChange={(e) =>
                              updateWeight(idx, Number(e.target.value || 0))
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Policy Persen ── */}
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold">
                Cara Hitung Jawaban Persen
              </h2>
              <p className="text-xs text-default-500 mt-0.5 max-w-xl">
                Pilih ID yang ingin diedit, lalu atur detil indikator dan
                formula persentasenya.
              </p>
            </div>

            <div className="rounded-xl border border-default-200 p-4 space-y-4">
              <div>
                <label
                  className="text-xs font-semibold text-default-600"
                  htmlFor="select-policy-question"
                >
                  Pilih ID / Pertanyaan LKE
                </label>
                <select
                  className="mt-1.5 w-full rounded-lg border border-default-200 bg-content1 px-3 py-2 text-sm focus:outline-none focus:border-primary"
                  disabled={policies.length === 0}
                  id="select-policy-question"
                  value={selectedQuestionId ?? ""}
                  onChange={(e) => selectPolicyByQuestionId(e.target.value)}
                >
                  <option value="">
                    {policies.length === 0
                      ? "Tidak ada pertanyaan tipe persen"
                      : "— Pilih ID untuk diedit —"}
                  </option>
                  {policies.map((policy) => {
                    const question = persenKriteria.find(
                      (k) => k.question_id === policy.question_id,
                    );
                    return (
                      <option
                        key={policy.question_id}
                        value={policy.question_id}
                      >
                        #{policy.question_id} —{" "}
                        {question?.pertanyaan || "Pertanyaan LKE"}
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedPolicy && (
                <div className="rounded-lg border border-default-200 bg-default-50 px-3 py-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">
                          #{selectedPolicy.question_id}
                        </span>
                        <span className="text-[11px] text-default-400">
                          {activeDraftItems(
                            masterDrafts[selectedPolicy.question_id],
                          ).length}{" "}
                          detil
                        </span>
                      </div>
                      <p className="mt-1 truncate text-sm text-default-700">
                        {selectedQuestion?.pertanyaan || "Pertanyaan LKE"}
                      </p>
                      <p className="mt-1 truncate text-xs text-default-400">
                        {getPolicyFormulaSummary(
                          masterDrafts[selectedPolicy.question_id],
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 sm:shrink-0">
                      <button
                        className="inline-flex items-center gap-1.5 rounded-lg border border-default-200 bg-content1 px-3 py-2 text-xs font-medium hover:bg-default-100"
                        type="button"
                        onClick={() => setEditingPolicyIndex(selectedPolicyIndex)}
                      >
                        <Pencil size={13} />
                        Atur
                      </button>
                      <button
                        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-content1 px-3 py-2 text-xs font-medium text-rose-500 hover:bg-rose-50"
                        type="button"
                        onClick={resetSelectedPolicy}
                      >
                        <Trash2 size={13} />
                        Reset
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {!selectedPolicy && policies.length > 0 && (
                <p className="text-xs text-default-400">
                  Detail aturan akan muncul setelah salah satu ID dipilih.
                </p>
              )}
            </div>
          </div>

          {/* Policy editor modal */}
          {editingPolicy && editingPolicyIndex !== null && (
            <div
              aria-modal="true"
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
              role="dialog"
              onClick={() => setEditingPolicyIndex(null)}
            >
              <div
                className="w-full max-w-4xl max-h-[88vh] overflow-y-auto rounded-xl bg-content1 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-default-200 bg-content1 px-5 py-4">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-default-400">
                      Edit Aturan Persen
                    </p>
                    <h3 className="truncate text-base font-semibold">
                      #{editingPolicy.question_id || "-"}{" "}
                      {editingQuestion?.pertanyaan || "Pilih pertanyaan LKE"}
                    </h3>
                  </div>
                  <button
                    className="rounded-lg p-2 text-default-400 hover:bg-default-100 hover:text-default-700"
                    title="Tutup"
                    type="button"
                    onClick={() => setEditingPolicyIndex(null)}
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="p-5">
                  <PolicyCard
                    masterDraft={masterDrafts[editingPolicy.question_id]}
                    policy={editingPolicy}
                    onMasterDraftChange={(draft) =>
                      updateMasterDraft(editingPolicy.question_id, draft)
                    }
                  />
                </div>

                <div className="sticky bottom-0 flex items-center justify-between gap-2 border-t border-default-200 bg-content1 px-5 py-4">
                  <button
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-4 py-2 text-sm text-rose-500 hover:bg-rose-50"
                    type="button"
                    onClick={resetSelectedPolicy}
                  >
                    <Trash2 size={14} />
                    Reset
                  </button>
                  <button
                    className="rounded-lg border border-default-200 px-4 py-2 text-sm hover:bg-default-100"
                    type="button"
                    onClick={() => setEditingPolicyIndex(null)}
                  >
                    Terapkan
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 pt-2">
            <button
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white hover:bg-primary/90 disabled:opacity-60 transition-colors text-sm font-medium"
              disabled={saving}
              onClick={saveConfig}
            >
              {saving ? (
                <Loader2 className="animate-spin" size={15} />
              ) : (
                <Save size={15} />
              )}
              {saving ? "Menyimpan..." : "Publish Konfigurasi"}
            </button>
            {message && (
              <div
                className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg ${
                  message.type === "success"
                    ? "bg-green-500/10 text-green-700 dark:text-green-400"
                    : "bg-red-500/10 text-red-600"
                }`}
              >
                {message.type === "success" ? "✅" : "⚠️"} {message.text}
              </div>
            )}
            {hasUnpublishedChanges && (
              <div className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
                Ada perubahan belum dipublish.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
