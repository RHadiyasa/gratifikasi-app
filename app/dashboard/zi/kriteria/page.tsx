"use client";

import { useEffect, useState, useCallback, Fragment } from "react";
import axios from "axios";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Database,
  Upload,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertTriangle,
  X,
} from "lucide-react";
import type { LkeKriteria, FormulaToken, FormulaOp } from "@/types/zi";
import { useAuthStore } from "@/store/authStore";
import { hasPermission } from "@/lib/permissions";

const KOMPONEN_OPTIONS = [
  { key: "", label: "Semua Komponen" },
  { key: "mp", label: "Manajemen Perubahan" },
  { key: "tt", label: "Penataan Tatalaksana" },
  { key: "sdm", label: "Penataan SDM" },
  { key: "ak", label: "Penguatan Akuntabilitas" },
  { key: "pw", label: "Penguatan Pengawasan" },
  { key: "pp", label: "Peningkatan Pelayanan" },
  { key: "ipak", label: "Hasil - IPAK" },
  { key: "capaian_kinerja", label: "Hasil - Capaian Kinerja" },
  { key: "prima", label: "Hasil - Pelayanan Prima" },
];

const KOMPONEN_LABEL: Record<string, string> = Object.fromEntries(
  KOMPONEN_OPTIONS.filter((o) => o.key).map((o) => [o.key, o.label]),
);

const ANSWER_TYPE_LABELS: Record<string, string> = {
  ya_tidak: "Ya/Tidak",
  abc: "A-B-C",
  abcd: "A-B-C-D",
  abcde: "A-B-C-D-E",
  persen: "Persen (%)",
  nilai_04: "Nilai 0-4",
  jumlah: "Jumlah",
};

// Answer types available for manual creation (jumlah only via sub-item of persen)
const CREATABLE_ANSWER_TYPES = Object.entries(ANSWER_TYPE_LABELS).filter(
  ([k]) => k !== "jumlah",
);

// urutan (1-based) -> letter: 1->A, 2->B, ...
const toLetterLabel = (urutan: number) => String.fromCharCode(64 + urutan);

// Format infix formula tokens as human-readable string: "( A - B ) / A"
function formulaToString(
  tokens: FormulaToken[],
  urutanToLabel: (u: number) => string,
): string {
  if (!tokens.length) return "";
  return tokens
    .map((t) => {
      if (t.kind === "operand") return urutanToLabel(t.ref!);
      if (t.kind === "op") return t.op ?? "?";
      if (t.kind === "open_paren") return "(";
      if (t.kind === "close_paren") return ")";
      return "?";
    })
    .join(" ");
}

// Derive builder state from token list
function calcBuilderState(tokens: FormulaToken[]): {
  expectOperand: boolean;
  parenDepth: number;
} {
  let expectOperand = true;
  let parenDepth = 0;
  for (const t of tokens) {
    if (t.kind === "operand" || t.kind === "close_paren") expectOperand = false;
    else expectOperand = true;
    if (t.kind === "open_paren") parenDepth++;
    if (t.kind === "close_paren") parenDepth--;
  }
  return { expectOperand, parenDepth };
}

type SubItemDraft = {
  tempId: string;
  _id?: string;
  pertanyaan: string;
  bobot: number;
  is_computed: boolean;
  formula_tokens: FormulaToken[];
  toDelete: boolean;
};

const defaultForm = {
  question_id: "" as number | "",
  komponen: "mp" as LkeKriteria["komponen"],
  seksi: "pemenuhan" as LkeKriteria["seksi"],
  sub_komponen: "",
  urutan: 0,
  pertanyaan: "",
  standar_dokumen: "",
  kriteria_panrb: "",
  bobot: 0,
  answer_type: "ya_tidak" as LkeKriteria["answer_type"],
  aktif: true,
  formula_min: 0,
  formula_max: 100,
  formula_zero_division_full_score: false,
};

// Formula Builder Component

interface FormulaBuilderProps {
  tokens: FormulaToken[];
  onChange: (tokens: FormulaToken[]) => void;
  availableItems: { urutan: number; label: string }[];
  excludeUrutan?: number; // exclude self when building sub-item formula
  suffix?: string; // e.g. " * 100" for persen formula
}

function FormulaBuilder({
  tokens,
  onChange,
  availableItems,
  excludeUrutan,
  suffix,
}: FormulaBuilderProps) {
  const items = availableItems.filter((a) => a.urutan !== excludeUrutan);
  const { expectOperand, parenDepth } = calcBuilderState(tokens);
  const isEmpty = tokens.length === 0;

  function push(token: FormulaToken) {
    onChange([...tokens, token]);
  }

  function addOperand(urutan: number) {
    if (!expectOperand) return;
    push({ kind: "operand", ref: urutan });
  }

  function addOp(op: FormulaOp) {
    if (expectOperand) return;
    push({ kind: "op", op });
  }

  function addOpenParen() {
    if (!expectOperand) return;
    push({ kind: "open_paren" });
  }

  function addCloseParen() {
    if (expectOperand || parenDepth <= 0) return;
    push({ kind: "close_paren" });
  }

  function removeLast() {
    if (tokens.length > 0) onChange(tokens.slice(0, -1));
  }

  const display = formulaToString(tokens, toLetterLabel);

  return (
    <div className="space-y-2">
      {/* Display */}
      <div className="min-h-8 px-2.5 py-1.5 rounded border border-blue-200 dark:border-blue-700/40 bg-white dark:bg-content1 text-xs font-mono flex items-center gap-1 flex-wrap">
        {isEmpty ? (
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

      {/* Controls */}
      <div className="flex flex-wrap gap-1 items-center">
        {/* Paren open */}
        <button
          type="button"
          disabled={!expectOperand}
          onClick={addOpenParen}
          className="px-2.5 py-1 text-[10px] rounded border border-violet-300 dark:border-violet-600 bg-violet-50 dark:bg-violet-900/20 font-mono font-bold text-violet-700 dark:text-violet-300 disabled:opacity-30 hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors"
        >
          (
        </button>

        {/* Operand buttons */}
        {items.map((item) => (
          <button
            key={item.urutan}
            type="button"
            disabled={!expectOperand}
            onClick={() => addOperand(item.urutan)}
            title={item.label}
            className="px-2.5 py-1 text-[10px] rounded border border-blue-300 dark:border-blue-600 bg-white dark:bg-content1 font-mono font-bold text-blue-700 dark:text-blue-300 disabled:opacity-30 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          >
            {toLetterLabel(item.urutan)}
          </button>
        ))}

        {/* Paren close */}
        <button
          type="button"
          disabled={expectOperand || parenDepth <= 0}
          onClick={addCloseParen}
          className="px-2.5 py-1 text-[10px] rounded border border-violet-300 dark:border-violet-600 bg-violet-50 dark:bg-violet-900/20 font-mono font-bold text-violet-700 dark:text-violet-300 disabled:opacity-30 hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors"
        >
          )
        </button>

        {/* Separator */}
        <span className="text-default-300 text-[10px] px-0.5">|</span>

        {/* Operator buttons */}
        {(["+", "-", "*", "/"] as FormulaOp[]).map((op) => (
          <button
            key={op}
            type="button"
            disabled={expectOperand}
            onClick={() => addOp(op)}
            className="px-2.5 py-1 text-[10px] rounded border border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20 font-mono font-bold text-amber-700 dark:text-amber-300 disabled:opacity-30 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
          >
            {op}
          </button>
        ))}

        {/* Remove / Clear */}
        {tokens.length > 0 && (
          <button
            type="button"
            onClick={removeLast}
            className="px-2 py-1 text-[10px] rounded border border-default-200 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-default-400 hover:text-rose-500 transition-colors"
          >
            {"<- Hapus"}
          </button>
        )}
        {tokens.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="px-2 py-1 text-[10px] rounded border border-rose-200 dark:border-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-400 hover:text-rose-600 transition-colors"
          >
            Bersihkan
          </button>
        )}
      </div>

      {/* Item legend */}
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

export default function KriteriaPage() {
  const role = useAuthStore((s) => s.role);
  const canManageKriteria = hasPermission(role, "zi:kriteria:manage");

  const [list, setList] = useState<LkeKriteria[]>([]);
  const [loading, setLoading] = useState(true);
  const [komponen, setKomponen] = useState("");
  const [search, setSearch] = useState("");
  const [idSort, setIdSort] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [editing, setEditing] = useState<LkeKriteria | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [subItems, setSubItems] = useState<SubItemDraft[]>([]);
  const [persenFormula, setPersenFormula] = useState<FormulaToken[]>([]);
  const [loadingSub, setLoadingSub] = useState(false);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [seedMsg, setSeedMsg] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (komponen) params.komponen = komponen;
      const { data } = await axios.get("/api/zi/kriteria", { params });
      setList(data.kriteria ?? []);
    } finally {
      setLoading(false);
    }
  }, [komponen]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  // Fetch sub-items for a persen kriteria
  async function fetchSubItems(parentQid: number) {
    setLoadingSub(true);
    try {
      const { data } = await axios.get("/api/zi/kriteria", {
        params: { parent_question_id: parentQid, aktif: true },
      });
      const children: LkeKriteria[] = (data.kriteria ?? []).sort(
        (a: LkeKriteria, b: LkeKriteria) => a.urutan - b.urutan,
      );
      setSubItems(
        children.map((c) => ({
          tempId: c._id,
          _id: c._id,
          pertanyaan: c.pertanyaan,
          bobot: c.bobot,
          is_computed: c.is_computed ?? false,
          formula_tokens: c.formula_tokens ?? [],
          toDelete: false,
        })),
      );
      return children; // kembalikan untuk keperluan cleanup
    } finally {
      setLoadingSub(false);
    }
  }

  function openEdit(k: LkeKriteria) {
    setEditing(k);
    setIsNew(false);
    setForm({
      question_id: k.question_id,
      komponen: k.komponen,
      seksi: k.seksi,
      sub_komponen: k.sub_komponen,
      urutan: k.urutan,
      pertanyaan: k.pertanyaan,
      standar_dokumen: k.standar_dokumen,
      kriteria_panrb: k.kriteria_panrb,
      bobot: k.bobot,
      answer_type: k.answer_type,
      aktif: k.aktif,
      formula_min: k.formula_min ?? 0,
      formula_max: k.formula_max ?? 100,
      formula_zero_division_full_score:
        k.formula_zero_division_full_score ?? false,
    });
    setSubItems([]);
    setPersenFormula(k.formula_tokens ?? []);
    if (k.answer_type === "persen") {
      fetchSubItems(k.question_id);
    }
  }

  function openNew() {
    setEditing(null);
    setIsNew(true);
    setForm(defaultForm);
    setSubItems([]);
    setPersenFormula([]);
  }

  function addSubItem() {
    setSubItems((prev) => [
      ...prev,
      {
        tempId: `new-${Date.now()}`,
        pertanyaan: "",
        bobot: 0,
        is_computed: false,
        formula_tokens: [],
        toDelete: false,
      },
    ]);
  }

  function updateSubItem(
    tempId: string,
    field: keyof SubItemDraft,
    value: any,
  ) {
    setSubItems((prev) =>
      prev.map((s) => (s.tempId === tempId ? { ...s, [field]: value } : s)),
    );
  }

  function removeSubItem(tempId: string) {
    setSubItems((prev) =>
      prev.map((s) => (s.tempId === tempId ? { ...s, toDelete: true } : s)),
    );
  }

  async function handleSave() {
    if (form.question_id === "" && isNew) {
      alert("question_id wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      let savedParentQid: number;
      const payload = { ...form, question_id: Number(form.question_id) };

      // Include persen formula on parent payload if applicable
      const parentPayload =
        form.answer_type === "persen"
          ? {
              ...payload,
              formula_tokens: persenFormula.length ? persenFormula : null,
              formula_min: form.formula_min,
              formula_max: form.formula_max,
              formula_zero_division_full_score:
                form.formula_zero_division_full_score,
            }
          : payload;

      if (isNew) {
        const { data } = await axios.post("/api/zi/kriteria", parentPayload);
        savedParentQid = data.kriteria.question_id;
      } else if (editing) {
        await axios.patch(`/api/zi/kriteria/${editing._id}`, parentPayload);
        savedParentQid = editing.question_id;
      } else {
        return;
      }

      // Upsert / delete sub-items when persen type
      if (form.answer_type === "persen") {
        // Hapus sub-items di DB yang tidak ada di form (mencegah orphan / duplikat lama)
        const { data: dbData } = await axios.get("/api/zi/kriteria", {
          params: { parent_question_id: savedParentQid, aktif: true },
        });
        const dbIds: string[] = (dbData.kriteria ?? []).map(
          (c: LkeKriteria) => c._id,
        );
        const formIds = subItems
          .filter((s) => !s.toDelete && s._id)
          .map((s) => s._id!);
        for (const dbId of dbIds) {
          if (!formIds.includes(dbId)) {
            await axios.delete(`/api/zi/kriteria/${dbId}`);
          }
        }

        const subPayloadBase = {
          komponen: form.komponen,
          seksi: form.seksi,
          sub_komponen: form.sub_komponen,
          aktif: true,
          answer_type: "jumlah",
          parent_question_id: savedParentQid,
        };

        let urutanCounter = 1;
        for (const s of subItems) {
          if (s.toDelete) {
            if (s._id) await axios.delete(`/api/zi/kriteria/${s._id}`);
            continue;
          }

          const urutan = urutanCounter++;
          const subPayload = {
            ...subPayloadBase,
            pertanyaan: s.pertanyaan,
            bobot: s.bobot,
            is_computed: s.is_computed,
            formula_tokens:
              s.is_computed && s.formula_tokens.length
                ? s.formula_tokens
                : null,
            urutan,
          };

          if (s._id) {
            await axios.patch(`/api/zi/kriteria/${s._id}`, subPayload);
          } else {
            const { data: newData } = await axios.post(
              "/api/zi/kriteria",
              subPayload,
            );
            // Simpan _id yang baru ke state supaya jika user simpan ulang (setelah error),
            // item ini di-PATCH bukan di-POST lagi (mencegah duplikasi)
            const savedId = newData.kriteria._id;
            setSubItems((prev) =>
              prev.map((item) =>
                item.tempId === s.tempId ? { ...item, _id: savedId } : item,
              ),
            );
          }
        }
      }

      setEditing(null);
      setIsNew(false);
      fetchList();
    } catch (err: any) {
      alert(err?.response?.data?.error ?? "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(k: LkeKriteria) {
    if (!confirm(`Hapus ID ${k.question_id}? (soft delete)`)) return;
    await axios.delete(`/api/zi/kriteria/${k._id}`);
    fetchList();
  }

  async function handleSeed() {
    if (
      !confirm(
        "Seed data pertanyaan dari ID_DETAIL_MAP? Data yang sudah ada tidak akan ditimpa.",
      )
    )
      return;
    setSeeding(true);
    setSeedMsg(null);
    try {
      const { data } = await axios.post("/api/zi/kriteria/seed");
      setSeedMsg(`Selesai: ${data.inserted} baru, ${data.skipped} sudah ada.`);
      fetchList();
    } catch (err: any) {
      setSeedMsg(`Error: ${err?.response?.data?.error ?? err.message}`);
    } finally {
      setSeeding(false);
    }
  }

  async function handleImport() {
    if (
      !confirm(
        "Import semua pertanyaan dari file Excel Standarisasi? Data yang sudah ada akan diperbarui.",
      )
    )
      return;
    setImporting(true);
    setSeedMsg(null);
    try {
      const { data } = await axios.post("/api/zi/kriteria/import");
      setSeedMsg(
        `Import selesai: ${data.inserted} baru, ${data.modified} diperbarui (total ${data.total} pertanyaan).`,
      );
      fetchList();
    } catch (err: any) {
      setSeedMsg(`Error: ${err?.response?.data?.error ?? err.message}`);
    } finally {
      setImporting(false);
    }
  }

  // Filtered list: hide sub-items (jumlah with parent) by default; shown under their parent
  const filtered = list
    .filter((k) => {
      if (k.answer_type === "jumlah" && k.parent_question_id != null)
        return false;
      return (
        !search ||
        k.pertanyaan.toLowerCase().includes(search.toLowerCase()) ||
        k.sub_komponen.toLowerCase().includes(search.toLowerCase()) ||
        String(k.question_id).includes(search)
      );
    })
    .sort((a, b) =>
      idSort === "asc"
        ? a.question_id - b.question_id
        : b.question_id - a.question_id,
    );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageItems = filtered.slice(pageStart, pageStart + pageSize);

  useEffect(() => {
    setPage(1);
  }, [search, komponen, idSort, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  // Build parent -> children lookup for expand rows
  const childrenMap: Record<number, LkeKriteria[]> = {};
  for (const k of list) {
    if (k.aktif && k.answer_type === "jumlah" && k.parent_question_id != null) {
      if (!childrenMap[k.parent_question_id])
        childrenMap[k.parent_question_id] = [];
      childrenMap[k.parent_question_id].push(k);
    }
  }

  const showModal = editing !== null || isNew;
  const activeSubItems = subItems.filter((s) => !s.toDelete);
  const parentCount = list.filter(
    (k) => !(k.answer_type === "jumlah" && k.parent_question_id != null),
  ).length;
  const subItemCount = list.filter(
    (k) =>
      k.aktif && k.answer_type === "jumlah" && k.parent_question_id != null,
  ).length;
  const activeCount = list.filter((k) => k.aktif).length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-default-400">
            Zona Integritas
          </p>
          <h1 className="text-2xl font-bold text-default-900">
            Master Kriteria LKE
          </h1>
          <p className="text-sm text-default-500">
            Kelola pertanyaan, bobot, kriteria PANRB, dan formula perhitungan.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManageKriteria && (
            <>
              <button
                onClick={handleSeed}
                disabled={seeding}
                className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-default-300 bg-content1 text-sm hover:bg-default-100 disabled:opacity-60 transition-colors"
              >
                {seeding ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Database size={13} />
                )}
                Seed dari Constants
              </button>
              <button
                onClick={handleImport}
                disabled={importing}
                className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-primary text-primary text-sm hover:bg-primary/10 disabled:opacity-60 transition-colors"
              >
                {importing ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Upload size={13} />
                )}
                Import dari Excel
              </button>
            </>
          )}
          <button
            onClick={openNew}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus size={13} />
            Tambah
          </button>
        </div>
      </div>

      {seedMsg && (
        <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2">
          <AlertTriangle size={13} />
          {seedMsg}
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-default-200 bg-content1 overflow-hidden">
        <div className="border-b border-default-100 px-4 py-3 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-default-900">
                Daftar Kriteria
              </h2>
              <p className="text-xs text-default-500 mt-0.5">
                {filtered.length} hasil sesuai filter
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-md bg-default-100 px-2.5 py-1 text-default-600">
                {parentCount} indikator
              </span>
              <span className="rounded-md bg-blue-50 px-2.5 py-1 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                {subItemCount} sub-item
              </span>
              <span className="rounded-md bg-green-50 px-2.5 py-1 text-green-700 dark:bg-green-900/20 dark:text-green-300">
                {activeCount} aktif
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[260px]">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-default-400 pointer-events-none"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Quick action... cari ID, sub-komponen, atau pertanyaan"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-default-200 bg-background focus:outline-none focus:border-primary"
              />
            </div>
            <select
              value={komponen}
              onChange={(e) => setKomponen(e.target.value)}
              className="min-w-[190px] px-3 py-2 text-sm rounded-md border border-default-200 bg-background focus:outline-none focus:border-primary"
            >
              {KOMPONEN_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              value={idSort}
              onChange={(e) => setIdSort(e.target.value as "asc" | "desc")}
              className="min-w-[160px] px-3 py-2 text-sm rounded-md border border-default-200 bg-background focus:outline-none focus:border-primary"
              title="Urutkan berdasarkan ID"
            >
              <option value="asc">ID naik</option>
              <option value="desc">ID turun</option>
            </select>
            <select
              value={String(pageSize)}
              onChange={(e) => setPageSize(parseInt(e.target.value))}
              className="min-w-[130px] px-3 py-2 text-sm rounded-md border border-default-200 bg-background focus:outline-none focus:border-primary"
              title="Jumlah data per halaman"
            >
              <option value="15">15 baris</option>
              <option value="25">25 baris</option>
              <option value="50">50 baris</option>
              <option value="100">100 baris</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] leading-5 table-fixed min-w-[1120px]">
            <thead>
              <tr className="border-b border-default-200 bg-default-50/80">
                <th className="text-left px-4 py-3 font-semibold text-default-500 w-[70px]">
                  ID
                </th>
                <th className="text-left px-4 py-3 font-semibold text-default-500 w-[240px]">
                  Sub Komponen
                </th>
                <th className="text-left px-4 py-3 font-semibold text-default-500">
                  Pertanyaan
                </th>
                <th className="text-left px-4 py-3 font-semibold text-default-500 w-[140px]">
                  Bobot
                </th>
                <th className="text-left px-4 py-3 font-semibold text-default-500 w-[150px]">
                  Tipe Jawaban
                </th>
                <th className="text-left px-4 py-3 font-semibold text-default-500 w-[100px]">
                  Status
                </th>
                <th className="px-4 py-3 w-[104px]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-default-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-default-400"
                  >
                    <Loader2 size={16} className="animate-spin mx-auto mb-1" />
                    Memuat...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-default-400 text-sm"
                  >
                    Tidak ada data
                  </td>
                </tr>
              ) : (
                pageItems.map((k) => {
                  const children = childrenMap[k.question_id] ?? [];
                  return (
                    <Fragment key={k._id}>
                      <tr
                        className="cursor-pointer border-b border-default-100 hover:bg-default-50/70"
                        onClick={() =>
                          setExpanded(expanded === k._id ? null : k._id)
                        }
                      >
                        <td className="px-4 py-3 font-mono text-default-500 align-top">
                          {k.question_id}
                        </td>
                        <td className="px-4 py-3 text-default-700 align-top whitespace-normal break-words">
                          {k.sub_komponen || "-"}
                        </td>
                        <td className="px-4 py-3 text-default-800 align-top whitespace-normal break-words">
                          {k.pertanyaan || (
                            <span className="text-default-300 italic">
                              Belum diisi
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-default-500 align-top whitespace-nowrap">
                          {Number(k.bobot).toLocaleString("id-ID", {
                            maximumFractionDigits: 4,
                          })}
                        </td>
                        <td className="px-4 py-3 align-top grid">
                          <span
                            className={`text-xs px-2 py-0.5 rounded font-medium ${
                              k.answer_type === "persen"
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                : "bg-default-100 text-default-600"
                            }`}
                          >
                            {ANSWER_TYPE_LABELS[k.answer_type] ?? k.answer_type}
                          </span>
                          {children.length > 0 && (
                            <span className="ml-1 text-[9px] text-blue-500 dark:text-blue-400 px-1 py-0.5 rounded">
                              {children.length} detil indikator
                            </span>
                          )}
                          {k.answer_type === "persen" &&
                            k.formula_zero_division_full_score && (
                              <span className="ml-1 text-[9px] text-emerald-600 dark:text-emerald-400 px-1 py-0.5 rounded">
                                pembagi 0 = maks
                              </span>
                            )}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <span
                            className={`text-xs px-2 py-0.5 rounded font-medium ${k.aktif ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-default-100 text-default-500"}`}
                          >
                            {k.aktif ? "Aktif" : "Nonaktif"}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              type="button"
                              aria-label={`Edit kriteria ID ${k.question_id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                openEdit(k);
                              }}
                              className="p-1.5 rounded hover:bg-default-100 text-default-500 hover:text-primary transition-colors"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              type="button"
                              aria-label={`Hapus kriteria ID ${k.question_id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(k);
                              }}
                              className="p-1.5 rounded hover:bg-rose-50 text-default-500 hover:text-rose-600 transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                            {expanded === k._id ? (
                              <ChevronUp
                                size={13}
                                className="text-default-400"
                              />
                            ) : (
                              <ChevronDown
                                size={13}
                                className="text-default-400"
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                      {expanded === k._id && (
                        <tr className="bg-default-50/60">
                          <td colSpan={7} className="px-10 py-4">
                            <div className="grid gap-4 text-xs md:grid-cols-2">
                              <div className="space-y-1.5">
                                <p className="font-semibold uppercase tracking-wide text-default-400">
                                  Kriteria PANRB
                                </p>
                                <p className="text-default-700 whitespace-pre-wrap leading-5">
                                  {k.kriteria_panrb || "-"}
                                </p>
                              </div>
                              <div className="space-y-1.5">
                                <p className="font-semibold uppercase tracking-wide text-default-400">
                                  Standar Dokumen
                                </p>
                                <p className="text-default-700 whitespace-pre-wrap leading-5">
                                  {k.standar_dokumen || "-"}
                                </p>
                              </div>
                            </div>
                            {/* Sub-items preview */}
                            {children.length > 0 && (
                              <div className="mt-4 border-t border-default-200 pt-3">
                                <p className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-2">
                                  Detil Indikator (Jumlah)
                                </p>
                                <div className="divide-y divide-default-100 rounded-md border border-default-100 bg-content1">
                                  {children
                                    .sort((a, b) => a.urutan - b.urutan)
                                    .map((c, idx) => (
                                      <div
                                        key={c._id}
                                        className="flex items-start gap-3 px-3 py-2 text-xs text-default-600"
                                      >
                                        <span className="font-mono text-[10px] text-blue-500 w-5 text-right">
                                          {idx + 1}
                                        </span>
                                        <span className="text-[10px] text-default-400 font-mono w-10">
                                          #{c.question_id}
                                        </span>
                                        <span className="flex-1 leading-5">
                                          {c.pertanyaan || (
                                            <em className="text-default-300">
                                              Belum diisi
                                            </em>
                                          )}
                                        </span>
                                        <span className="text-default-400 font-mono whitespace-nowrap">
                                          {Number(c.bobot).toLocaleString(
                                            "id-ID",
                                            { maximumFractionDigits: 4 },
                                          )}
                                        </span>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            openEdit(c);
                                          }}
                                          className="p-1 rounded hover:bg-default-100 text-default-400 hover:text-primary"
                                        >
                                          <Pencil size={11} />
                                        </button>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {!loading && (
          <div className="px-4 py-2.5 border-t border-default-100 flex flex-wrap items-center justify-between gap-2 text-xs text-default-500">
            <span>
              Menampilkan {filtered.length === 0 ? 0 : pageStart + 1}-
              {Math.min(pageStart + pageSize, filtered.length)} dari{" "}
              {filtered.length} indikator utama · {subItemCount} sub-item
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="px-2 py-1 rounded border border-default-200 disabled:opacity-40 hover:bg-default-100 transition-colors"
              >
                Prev
              </button>
              <span className="px-2">
                Hal {safePage}/{totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="px-2 py-1 rounded border border-default-200 disabled:opacity-40 hover:bg-default-100 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit/Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-content1 rounded-xl border border-default-200 w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-default-200 flex items-center justify-between sticky top-0 bg-content1 z-10">
              <h2 className="font-semibold text-base">
                {isNew ? "Tambah Kriteria" : `Edit ID ${editing?.question_id}`}
              </h2>
              <button
                onClick={() => {
                  setEditing(null);
                  setIsNew(false);
                }}
                className="text-default-400 hover:text-default-600 text-xl leading-none"
              >
                x
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* question_id: only for new */}
              {isNew && (
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs font-medium text-default-600">
                      Question ID <span className="text-rose-500">*</span>
                    </span>
                    <input
                      type="number"
                      value={form.question_id}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          question_id: parseInt(e.target.value) || "",
                        }))
                      }
                      placeholder="Nomor unik dari Excel..."
                      className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-default-200 bg-content1 focus:outline-none focus:border-primary"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-default-600">
                      Komponen <span className="text-rose-500">*</span>
                    </span>
                    <select
                      value={form.komponen}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          komponen: e.target.value as LkeKriteria["komponen"],
                        }))
                      }
                      className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-default-200 bg-content1 focus:outline-none focus:border-primary"
                    >
                      {KOMPONEN_OPTIONS.filter((o) => o.key).map((o) => (
                        <option key={o.key} value={o.key}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}

              {/* seksi + sub_komponen */}
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-medium text-default-600">
                    Seksi
                  </span>
                  <select
                    value={form.seksi}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        seksi: e.target.value as LkeKriteria["seksi"],
                      }))
                    }
                    className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-default-200 bg-content1 focus:outline-none focus:border-primary"
                  >
                    <option value="pemenuhan">I. Pemenuhan</option>
                    <option value="reform">II. Reform</option>
                    <option value="hasil">Hasil</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-default-600">
                    Sub Komponen
                  </span>
                  <input
                    value={form.sub_komponen}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, sub_komponen: e.target.value }))
                    }
                    className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-default-200 bg-content1 focus:outline-none focus:border-primary"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-xs font-medium text-default-600">
                  Pertanyaan / Indikator
                </span>
                <textarea
                  value={form.pertanyaan}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, pertanyaan: e.target.value }))
                  }
                  rows={3}
                  className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-default-200 bg-content1 focus:outline-none focus:border-primary resize-y"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-default-600">
                  Kriteria PANRB
                </span>
                <textarea
                  value={form.kriteria_panrb}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, kriteria_panrb: e.target.value }))
                  }
                  rows={4}
                  className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-default-200 bg-content1 focus:outline-none focus:border-primary resize-y"
                  placeholder="Kriteria penilaian PANRB..."
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-default-600">
                  Standar Dokumen
                </span>
                <textarea
                  value={form.standar_dokumen}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, standar_dokumen: e.target.value }))
                  }
                  rows={4}
                  className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-default-200 bg-content1 focus:outline-none focus:border-primary resize-y"
                  placeholder="Daftar dokumen yang harus ada..."
                />
              </label>
              
              <div className="grid grid-cols-3 gap-3 items-end">
                <label className="block">
                  <span className="text-xs font-medium text-default-600">
                    Bobot
                  </span>
                  <input
                    type="number"
                    step="0.0001"
                    value={form.bobot}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        bobot: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-default-200 bg-content1 focus:outline-none focus:border-primary"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-default-600">
                    Tipe Jawaban
                  </span>
                  <select
                    value={form.answer_type}
                    onChange={(e) => {
                      const newType = e.target
                        .value as LkeKriteria["answer_type"];
                      setForm((f) => ({ ...f, answer_type: newType }));
                      if (newType !== "persen") setSubItems([]);
                      if (newType === "persen" && editing?.question_id) {
                        fetchSubItems(editing.question_id);
                      }
                    }}
                    className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-default-200 bg-content1 focus:outline-none focus:border-primary"
                  >
                    {CREATABLE_ANSWER_TYPES.map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2 mb-0.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.aktif}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, aktif: e.target.checked }))
                    }
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">Aktif</span>
                </label>
              </div>

              {/* Detil Indikator: hanya untuk tipe Persen */}
              {form.answer_type === "persen" &&
                (() => {
                  // Compute available sub-items (letter map) for formula builder
                  const activeSubs = subItems.filter((s) => !s.toDelete);
                  const availItems = activeSubs.map((s, idx) => ({
                    urutan: idx + 1,
                    label: s.pertanyaan || `Sub-item ${idx + 1}`,
                  }));

                  return (
                    <div className="rounded-lg border border-blue-200 dark:border-blue-700/40 bg-blue-50/50 dark:bg-blue-950/20 p-4 space-y-4">
                      {/* Sub-item list */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">
                            Detil Indikator
                          </p>
                          <button
                            type="button"
                            onClick={addSubItem}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs hover:bg-blue-700 transition-colors"
                          >
                            <Plus size={11} />
                            Tambah
                          </button>
                        </div>

                        {loadingSub ? (
                          <div className="flex items-center gap-2 text-xs text-blue-500">
                            <Loader2 size={11} className="animate-spin" />{" "}
                            Memuat...
                          </div>
                        ) : activeSubs.length === 0 ? (
                          <p className="text-[10px] text-blue-400 italic">
                            Belum ada detil. Klik &quot;Tambah&quot; untuk menambahkan.
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {subItems
                              .filter((s) => !s.toDelete)
                              .map((s, idx) => {
                                const letter = toLetterLabel(idx + 1);
                                return (
                                  <div
                                    key={s.tempId}
                                    className="rounded-lg border border-blue-200 dark:border-blue-700/30 bg-white dark:bg-content1 p-3 space-y-2"
                                  >
                                    {/* Row header */}
                                    <div className="flex items-center gap-2">
                                      <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400 shrink-0">
                                        {letter}
                                      </span>
                                      <input
                                        type="text"
                                        value={s.pertanyaan}
                                        onChange={(e) =>
                                          updateSubItem(
                                            s.tempId,
                                            "pertanyaan",
                                            e.target.value,
                                          )
                                        }
                                        placeholder="mis: Jumlah yang harus melaporkan"
                                        className="flex-1 px-2 py-1.5 text-xs rounded border border-blue-200 dark:border-blue-700/40 bg-blue-50 dark:bg-content2 focus:outline-none focus:border-blue-400"
                                      />
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={s.bobot}
                                        onChange={(e) =>
                                          updateSubItem(
                                            s.tempId,
                                            "bobot",
                                            parseFloat(e.target.value) || 0,
                                          )
                                        }
                                        placeholder="Bobot"
                                        className="w-16 px-2 py-1.5 text-xs rounded border border-blue-200 dark:border-blue-700/40 bg-blue-50 dark:bg-content2 focus:outline-none focus:border-blue-400 text-center"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => removeSubItem(s.tempId)}
                                        className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-900/20 text-default-400 hover:text-rose-500 transition-colors shrink-0"
                                      >
                                        <X size={12} />
                                      </button>
                                    </div>

                                    {/* Computed toggle */}
                                    <div className="flex items-center gap-3 pl-8">
                                      <label className="flex items-center gap-1.5 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={s.is_computed}
                                          onChange={(e) =>
                                            updateSubItem(
                                              s.tempId,
                                              "is_computed",
                                              e.target.checked,
                                            )
                                          }
                                          className="w-3.5 h-3.5 rounded"
                                        />
                                        <span className="text-[10px] text-blue-600 dark:text-blue-400">
                                          Nilai ini adalah hasil perhitungan
                                        </span>
                                      </label>
                                    </div>

                                    {/* Formula builder for computed sub-items */}
                                    {s.is_computed && (
                                      <div className="pl-8 space-y-1">
                                        <p className="text-[9px] font-semibold text-blue-500 uppercase tracking-wide">
                                          {letter} =
                                        </p>
                                        <FormulaBuilder
                                          tokens={s.formula_tokens}
                                          onChange={(t) =>
                                            updateSubItem(
                                              s.tempId,
                                              "formula_tokens",
                                              t,
                                            )
                                          }
                                          availableItems={availItems}
                                          excludeUrutan={idx + 1}
                                        />
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>

                      {/* Persen formula */}
                      {activeSubs.length >= 2 && (
                        <div className="border-t border-blue-200 dark:border-blue-700/40 pt-3 space-y-2">
                          <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">
                            Formula Persentase
                          </p>
                          <p className="text-[10px] text-blue-500 dark:text-blue-400">
                            Bangun ekspresi untuk menghitung nilai %. Hasil
                            otomatis dikali 100.
                          </p>
                          <FormulaBuilder
                            tokens={persenFormula}
                            onChange={setPersenFormula}
                            availableItems={availItems}
                            suffix=" * 100"
                          />
                          <div className="flex gap-3 pt-1">
                            <label className="flex flex-col gap-1 flex-1">
                              <span className="text-[10px] text-blue-500 dark:text-blue-400">
                                Min (%)
                              </span>
                              <input
                                type="number"
                                value={form.formula_min ?? 0}
                                onChange={(e) =>
                                  setForm((f) => ({
                                    ...f,
                                    formula_min: Number(e.target.value),
                                  }))
                                }
                                className="w-full rounded border border-blue-200 dark:border-blue-700/40 bg-transparent px-2 py-1 text-xs"
                              />
                            </label>
                            <label className="flex flex-col gap-1 flex-1">
                              <span className="text-[10px] text-blue-500 dark:text-blue-400">
                                Maks (%)
                              </span>
                              <input
                                type="number"
                                value={form.formula_max ?? 100}
                                onChange={(e) =>
                                  setForm((f) => ({
                                    ...f,
                                    formula_max: Number(e.target.value),
                                  }))
                                }
                                className="w-full rounded border border-blue-200 dark:border-blue-700/40 bg-transparent px-2 py-1 text-xs"
                              />
                            </label>
                          </div>
                          <label className="flex items-start gap-2 rounded border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-[10px] text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-950/20 dark:text-emerald-300">
                            <input
                              type="checkbox"
                              checked={form.formula_zero_division_full_score}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  formula_zero_division_full_score:
                                    e.target.checked,
                                }))
                              }
                              className="mt-0.5 h-3.5 w-3.5 rounded"
                            />
                            <span>
                              Pembagi 0 menggunakan nilai maksimal formula.
                            </span>
                          </label>
                        </div>
                      )}
                    </div>
                  );
                })()}
            </div>
            <div className="px-5 py-4 border-t border-default-200 flex justify-end gap-2 sticky bottom-0 bg-content1">
              <button
                onClick={() => {
                  setEditing(null);
                  setIsNew(false);
                }}
                className="px-4 py-2 text-sm rounded-lg border border-default-200 hover:bg-default-100 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-60 transition-colors"
              >
                {saving && <Loader2 size={13} className="animate-spin" />}
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
