/**
 * Hitung Levenshtein distance antara dua string.
 * Kecil = mirip, 0 = identik.
 */
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const prev: number[] = new Array(n + 1);
  const curr: number[] = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + cost
      );
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j];
  }
  return prev[n];
}

export type FuzzyCandidate<T> = {
  item: T;
  score: number;
  matchKind: "exact" | "prefix" | "substring" | "fuzzy";
};

/**
 * Cari kandidat dari list berdasarkan query.
 * Prioritas: exact > prefix > substring > fuzzy (levenshtein).
 * Return top-N kandidat terurut.
 */
export function fuzzyFind<T>(
  query: string,
  items: T[],
  getKey: (item: T) => string,
  options: { limit?: number; fuzzyMaxDistance?: number } = {}
): FuzzyCandidate<T>[] {
  const limit = options.limit ?? 5;
  const fuzzyMaxDistance = options.fuzzyMaxDistance ?? 4;

  const q = query.trim().toLowerCase();
  if (!q) return [];

  const candidates: FuzzyCandidate<T>[] = [];

  for (const item of items) {
    const raw = getKey(item)?.toString() ?? "";
    const key = raw.toLowerCase();

    if (!key) continue;

    if (key === q) {
      candidates.push({ item, score: 0, matchKind: "exact" });
      continue;
    }
    if (key.startsWith(q)) {
      candidates.push({ item, score: 1, matchKind: "prefix" });
      continue;
    }
    if (key.includes(q)) {
      candidates.push({ item, score: 2, matchKind: "substring" });
      continue;
    }

    if (Math.abs(key.length - q.length) > fuzzyMaxDistance + 2) continue;
    const dist = levenshtein(q, key);
    if (dist <= fuzzyMaxDistance) {
      candidates.push({ item, score: 10 + dist, matchKind: "fuzzy" });
    }
  }

  candidates.sort((a, b) => a.score - b.score);
  return candidates.slice(0, limit);
}
