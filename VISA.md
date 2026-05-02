# Major Update Plan: Sheet Sync, LkeJawaban, and Criteria Single Source of Truth

## Context

The application already has consistent `question_id` linking across the main data sources:

```txt
Google Sheet column A = LkeKriteria.question_id = LkeJawaban.question_id
```

This means the linking key already exists. The next major update should connect those sources properly instead of introducing another mapping layer.

Current problems:

1. Submissions with `source='sheet'` do not have `LkeJawaban` records in the database.
   The answers only exist in Google Sheet, so the input page cannot reliably display or edit them from DB state.

2. `ID_DETAIL_MAP` in `constants.js` duplicates criteria/detail metadata that should live in `LkeKriteria`.
   This creates two sources of truth that can diverge.

This document is the implementation plan. Do not treat it as already implemented.

## Implementation Tracking

Last updated: 2026-05-02

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1: Audit Current Structure | DONE | Audited models, answer routes, sheet parser utilities, checker routes, scoring, detail/export routes, and `ID_DETAIL_MAP` usage. |
| Phase 2: Create Reusable Sheet Sync Service | DONE | Added `lib/zi/sheet-sync.ts` with official app column mapping, header detection, and `missing_only` / `overwrite` modes. |
| Phase 3: Validate Sheet Format Before Sync | DONE | Sync validates matching IDs, duplicate IDs, unknown IDs, invalid IDs, and suspicious low valid-row count before writing. |
| Phase 4: Add Manual Sync API | DONE | Added `POST /api/zi/submissions/[id]/sync-sheet`. |
| Phase 5: Auto Sync on Input Page Load | DONE | `GET /jawaban` auto-syncs sheet/legacy sheet submissions only when no `LkeJawaban` records exist. Input page also has manual sync controls. |
| Phase 6: Protect Manual Edits | DONE | Implemented safe default `missing_only` that fills blank DB fields without replacing existing values; destructive overwrite is explicit from UI with confirmation. |
| Phase 7: Replace ID_DETAIL_MAP with LkeKriteria Lookup | DONE | Main checker/scoring paths now preload active `LkeKriteria` and pass an in-memory scoring map. `ID_DETAIL_MAP` remains only as fallback/seed/import legacy data. |
| Phase 8: Checker Must Process Parent Criteria Only | DONE | Sheet/app checker, detail route, export, and app-check scoring filter out detail child indicators from main totals. |
| Phase 9: Formula and Percentage Scoring | DONE | Percentage criteria now score from the actual numeric percentage: e.g. `40% x bobot 1 = 0.4`. A `MERAH` verdict still forces score `0` because evidence/link is invalid. |
| Phase 10: Input Page UI/UX | DONE | Added Google Sheet sync status, manual sync, overwrite sync confirmation, sync summary feedback, and input access for both app and sheet submissions. |
| Phase 11: Checker and Dashboard Consistency | DONE | Runtime totals now use active parent criteria; stale 137-style totals are corrected by check/sync flows. |
| Phase 12: Export Consistency | DONE | Sheet and Mongo export paths exclude detail indicators from main rows. |
| Phase 13: Testing Checklist | PARTIAL | `npx tsc --noEmit --pretty false` passes. `npm run build` compiles successfully but still fails at existing lint/prettier warnings across the project. Manual Google Sheet sync and percentage scoring need browser/API validation with real credentials. |

## Core Principle

The application format is the source of truth.

```txt
LkeKriteria = source of truth for questions, weights, answer types, formulas, and detail indicators
LkeJawaban  = per-submission/unit answers
Google Sheet = initial input source and optional re-sync source
```

Google Sheet should be interpreted according to the official application mapping. If a sheet does not match this format, the sheet is considered non-standard and should be fixed or synced through an explicit special path.

## Official Sheet Mapping

Use this mapping when importing/syncing Google Sheet data into `LkeJawaban`:

```txt
question_id   <- column A / 1
jawaban_unit  <- column K / 11
narasi        <- column L / 12
bukti         <- column M / 13
link_drive    <- column N / 14
jawaban_tpi_unit   <- column O / 15
catatan_tpi_unit   <- column R / 18
jawaban_tpi_itjen  <- column S / 19
catatan_tpi_itjen  <- column V / 22
```

Notes:

- `question_id` must match `LkeKriteria.question_id`.
- Scoring must use `LkeKriteria`, not sheet weights.
- Sheet data should never create new criteria.
- Unknown question IDs should be reported as warnings, not silently accepted as criteria.

## Final Goals

- `source='sheet'` submissions remain `source='sheet'`.
- Opening the input page for a sheet-based submission can display answers because sheet data has been synced into `LkeJawaban`.
- Sync can be safely repeated.
- Main checker total remains 113.
- Detail indicators are not counted as separate checker data.
- Detail indicators remain attached under their parent criterion.
- `ID_DETAIL_MAP` is removed from main scoring/checking logic and replaced by `LkeKriteria` lookup.
- `LkeKriteria` becomes the single source of truth for criteria metadata.

## Phase 1: Audit Current Structure

Before changing behavior, inspect the current flow and identify integration points.

Files/areas to audit:

```txt
app/api/zi/submissions/[id]/jawaban/route.ts
app/api/zi/submissions/route.ts
app/api/zi/check/route.js
app/api/zi/check-single/route.js
app/api/zi/detail/export/route.js
app/zona-integritas/lke-checker/[id]/input/page.tsx
app/zona-integritas/lke-checker/[id]/page.tsx
lib/zi/constants.js
lib/zi/scoring.js
lib/zi/app-check.js
lib/zi/helpers.js
modules/models/LkeKriteria.ts
modules/models/LkeJawaban.ts
types/zi.ts
```

Expected output of this phase:

- Confirm current DB models.
- Confirm current sheet parser utilities.
- Confirm current checker behavior.
- Confirm all places that use `ID_DETAIL_MAP`.
- Confirm all places that count total data.

## Phase 2: Create Reusable Sheet Sync Service

Create a reusable service, for example:

```txt
syncSheetToLkeJawaban(submissionId, options)
```

Suggested location:

```txt
lib/zi/sheet-sync.ts
```

The service should:

- Load the submission by `submissionId`.
- Verify the submission has a Google Sheet link.
- Read the Google Sheet.
- Parse rows using the official sheet mapping.
- Match each row by `question_id` to `LkeKriteria.question_id`.
- Upsert into `LkeJawaban` using `submission_id + question_id`.
- Skip rows without a valid numeric `question_id`.
- Report unknown `question_id` values.
- Report invalid or suspicious sheet structure.
- Preserve `source='sheet'`; do not convert it to `source='app'`.

Sync options:

```txt
mode: 'missing_only' | 'overwrite'
```

Behavior:

```txt
missing_only = create records that do not exist yet and fill blank DB fields, do not overwrite existing values
overwrite    = replace DB values with values from Google Sheet
```

Default mode must be:

```txt
missing_only
```

## Phase 3: Validate Sheet Format Before Sync

Add lightweight validation before writing data to DB.

Validation rules:

- Column A must contain enough valid IDs that match `LkeKriteria.question_id`.
- If valid IDs are too few, stop sync and return an error.
- Column N is expected to contain Drive links or be empty.
- Columns K, L, M, N, O, R, S, and V may be empty but must be read according to official mapping.
- Unknown IDs should be included in the sync result warnings.

Recommended validation result shape:

```txt
validRows
invalidRows
unknownQuestionIds
warnings
canSync
```

The goal is to avoid silently importing badly mapped sheet data.

## Phase 4: Add Manual Sync API

Add an endpoint such as:

```txt
POST /api/zi/submissions/[id]/sync-sheet
```

Request body examples:

```json
{
  "mode": "missing_only"
}
```

```json
{
  "mode": "overwrite"
}
```

Response should include a sync summary:

```txt
imported
updated
skipped
invalidRows
unknownQuestionIds
warnings
mode
syncedAt
```

The endpoint should:

- Only accept `missing_only` or `overwrite`.
- Use `missing_only` by default.
- Return a clear error if the submission does not have a sheet link.
- Return validation errors if the sheet format is suspicious.

## Phase 5: Auto Sync on Input Page Load

When opening:

```txt
/zona-integritas/lke-checker/[id]/input
```

Behavior:

- If submission `source='app'`, use existing `LkeJawaban` data.
- If submission `source='sheet'` or legacy sheet source has no `LkeJawaban` unit/review data, auto-sync from sheet using `missing_only`.
- If submission `source='sheet'` and `LkeJawaban` already exists, do not auto-overwrite.
- Provide a manual button to sync again from Google Sheet.
- Provide a clear confirmation before `overwrite` sync.

Important:

Auto sync must not erase manual edits.

## Phase 6: Protect Manual Edits

Recommended minimal approach:

- Keep default sync mode as `missing_only`.
- Make `overwrite` explicit and user-triggered only.

Optional improved approach:

Add metadata to `LkeJawaban`, such as:

```txt
updated_from: 'sheet_sync' | 'manual' | 'system'
last_synced_at
last_synced_mapping
```

Then:

- User edits from input page mark records as `manual`.
- `missing_only` may fill blank fields from sheet but never overwrites manual values.
- `overwrite` can overwrite values but only after explicit confirmation.

If schema changes are too risky, implement the minimal mode-based protection first.

## Phase 7: Replace ID_DETAIL_MAP with LkeKriteria Lookup

Remove `ID_DETAIL_MAP` from main scoring/checking logic.

New strategy:

- At the beginning of a checker/scoring request, load all active `LkeKriteria` records.
- Build an in-memory `criteriaMap` keyed by `question_id`.
- Build `childrenByParent` keyed by `parent_question_id`.
- Use these maps for detail indicators, formulas, answer types, and weights.

Pseudo shape:

```txt
criteriaMap: Map<question_id, LkeKriteria>
childrenByParent: Map<parent_question_id, LkeKriteria[]>
```

Benefits:

- One source of truth.
- No hardcoded duplicated detail map.
- Detail indicators follow dashboard master data automatically.

## Phase 8: Checker Must Process Parent Criteria Only

Checker total and item processing must only include main/parent criteria.

Definition of detail child:

```txt
answer_type = 'jumlah'
parent_question_id != null
```

Main checker criteria:

```txt
aktif = true
not detail child
```

Rules:

- Detail child is not checked as a standalone item.
- Detail child is included as context for its parent.
- Total data remains 113.
- ID 125 and similar percentage/formula parents count as one item only.

Example:

```txt
ID 125 = checked item
Subdetail A/B = calculation/context fields under ID 125
Total impact = +1 checked item, not +3
```

## Phase 9: Formula and Percentage Scoring

For `answer_type='persen'`:

- Read formula metadata from `LkeKriteria`.
- Read child/detail values from `LkeJawaban`.
- Calculate the parent value automatically.
- Save/display the computed value on the parent answer.
- Include parent answer, detail values, narasi, bukti, and link as AI checker context.

Scoring must not depend on `ID_DETAIL_MAP`.

Preferred source order:

```txt
formula metadata -> LkeKriteria
input values     -> LkeJawaban child rows
computed result  -> parent LkeJawaban / runtime calculation
```

## Phase 10: Input Page UI/UX

Add sheet sync controls and status.

Suggested UI elements:

```txt
Data tersinkron dari Google Sheet
Terakhir sync: date/time
Mode sync terakhir: missing_only / overwrite
```

Buttons:

```txt
Sync dari Google Sheet
Sync ulang dan timpa dari Google Sheet
```

UX rules:

- `Sync dari Google Sheet` should default to `missing_only`.
- `overwrite` must show confirmation.
- Show sync summary after sync.
- Keep detail indicators visually under their parent.
- Text fields such as narasi and bukti must not be visually cut off.
- Use resizable textarea for long narasi/bukti where appropriate.

## Phase 11: Checker and Dashboard Consistency

Ensure all checker/dashboard numbers are based on active parent criteria only.

Required behavior:

```txt
Total = active parent criteria count, expected 113
Checked = parent criteria with AI result
Unchecked = parent criteria without AI result
Detail indicators = excluded from totals
```

If an old submission still stores stale totals such as 137:

- Recalculate based on active parent criteria.
- Patch submission metadata when safe.
- Display the corrected total.

## Phase 12: Export Consistency

Export should include only main/parent criteria as checker rows.

Detail indicators should appear only as supporting data/context if needed, not as separate exported checked criteria unless a specific export format requires them.

Rules:

- Parent criteria exported as main rows.
- Detail indicators excluded from main checker count.
- Formula/percentage parent can include calculated value and child details in supporting columns if appropriate.

## Phase 13: Testing Checklist

Minimum tests/manual checks:

```txt
source='sheet' submission with no LkeJawaban opens input page and auto-syncs
source='sheet' submission with existing LkeJawaban does not auto-overwrite
manual sync missing_only creates missing records and fills blank fields only
manual sync overwrite replaces values from sheet
unknown question IDs are reported
bad/suspicious sheet format does not silently import bad data
total checker remains 113
ID 125 appears as one parent item
detail indicators under ID 125 appear under the parent only
AI checker does not check detail indicators separately
search by ID still finds parent criteria
per-item save still works
save all still works
formula percentage still calculates from child values
export does not include detail indicators as standalone checked rows
old submissions with stale total such as 137 are corrected to 113
```

## Risks and Mitigations

### Risk: Sheet does not match official app format

Mitigation:

- Validate before sync.
- Warn about unknown IDs.
- Stop sync if valid IDs are too few.
- Keep default mode as `missing_only`.
- Require explicit action for overwrite.

### Risk: Manual edits are overwritten accidentally

Mitigation:

- Never auto-overwrite.
- Use `missing_only` for automatic sync.
- Put confirmation before overwrite sync.
- Optionally track `updated_from` metadata.

### Risk: Old checker totals still show 137

Mitigation:

- Recalculate totals from active parent criteria.
- Patch stale metadata when safe.
- Keep detail indicators out of totals.

### Risk: Scoring diverges from master criteria

Mitigation:

- Use `LkeKriteria` as the only source for weights, answer types, formulas, and detail indicators.
- Remove `ID_DETAIL_MAP` from main logic.

## Recommended Implementation Order

1. Audit files and current flow.
2. Build reusable sheet sync service.
3. Add manual sync API.
4. Integrate auto-sync on input page for sheet submissions with no DB answers.
5. Add sync UI and sync summary.
6. Refactor checker/scoring to use `LkeKriteria` lookup instead of `ID_DETAIL_MAP`.
7. Enforce parent-only total counting everywhere.
8. Update export consistency.
9. Run build/type checks.
10. Test with an old sheet-based submission and a new app-based submission.

## Acceptance Criteria

The update is complete when:

```txt
source='sheet' input page can display synced answers from Google Sheet
sync can be repeated safely
sync default does not overwrite manual edits
overwrite sync is explicit
total checker remains 113
detail indicators are never counted as standalone checker data
ID_DETAIL_MAP is no longer used as the main source of detail/formula logic
LkeKriteria is the single source of truth for criteria metadata
existing source='app' workflow still works
existing source='sheet' workflow still works
```
