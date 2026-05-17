import ElearningParticipant from "@/modules/models/ParticipantModel";
import { connect } from "@/config/dbconfig";

const LEGACY_TAHUN = 2025;
const LEGACY_BATCH = "2";

let migrationPromise: Promise<void> | null = null;

async function runMigration() {
  await connect();
  await ElearningParticipant.updateMany(
    {
      $or: [
        { tahun: { $exists: false } },
        { tahun: null },
        { tahun: { $type: "string" } },
      ],
    },
    { $set: { tahun: LEGACY_TAHUN, batch: LEGACY_BATCH } }
  );
}

/**
 * Backfill semua peserta lama dengan tahun = 2025, batch = "2".
 * Idempotent — boleh dipanggil berkali-kali.
 * Cached per server process supaya tidak hammer database.
 */
export function ensureCohortBackfill(): Promise<void> {
  if (!migrationPromise) {
    migrationPromise = runMigration().catch((err) => {
      migrationPromise = null;
      throw err;
    });
  }
  return migrationPromise;
}
