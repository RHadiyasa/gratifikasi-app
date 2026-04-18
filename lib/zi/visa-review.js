import { VR_SHEET, VR_HEADER, VR_COL } from "./constants.js";
import { readSheet } from "./sheets.js";

export async function ensureVisaReviewSheet(sheets, spreadsheetId) {
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets(properties(sheetId,title,gridProperties))",
  });
  const existing = meta.data.sheets?.find(
    (s) => s.properties.title === VR_SHEET,
  );
  if (existing) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${VR_SHEET}!A1:K1`,
      valueInputOption: "RAW",
      requestBody: { values: [VR_HEADER] },
    });
    return existing.properties;
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{ addSheet: { properties: { title: VR_SHEET } } }],
    },
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${VR_SHEET}!A1:K1`,
    valueInputOption: "RAW",
    requestBody: { values: [VR_HEADER] },
  });
  const meta2 = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets(properties(sheetId,title,gridProperties))",
  });
  return meta2.data.sheets?.find((s) => s.properties.title === VR_SHEET)
    ?.properties;
}

export async function readVisaReviewMap(auth, spreadsheetId) {
  try {
    const rows = await readSheet(auth, spreadsheetId, VR_SHEET, "A:H");
    const map = {};
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const id = String(row[VR_COL.ID - 1] || "").trim();
      if (!id) continue;
      map[id] = {
        rowNum: i + 1,
        linkDicek: String(row[VR_COL.LINK - 1] || ""),
        fingerprint: String(row[VR_COL.FINGERPRINT - 1] || ""),
        result: String(row[VR_COL.RESULT - 1] || ""),
        supervisi: String(row[VR_COL.SUPERVISI - 1] || ""),
      };
    }
    return { map, totalRows: rows.length };
  } catch (err) {
    if (
      err.message?.includes("Unable to parse range") ||
      err.message?.includes("not found") ||
      err.status === 404
    ) {
      return { map: {}, totalRows: 0 };
    }
    throw err;
  }
}

export async function writeVisaReviewRows(
  sheets,
  spreadsheetId,
  existingUpdates,
  newRows,
) {
  if (existingUpdates.length > 0) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: "RAW",
        data: existingUpdates.map(({ rowNum, rowData }) => ({
          range: `${VR_SHEET}!A${rowNum}:K${rowNum}`,
          values: [rowData],
        })),
      },
    });
  }
  if (newRows.length > 0) {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${VR_SHEET}!A:K`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: newRows },
    });
  }
}

export async function setVisaReviewDropdown(
  sheets,
  spreadsheetId,
  sheetProps,
  totalDataRows,
) {
  if (totalDataRows <= 0) return;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          setDataValidation: {
            range: {
              sheetId: sheetProps.sheetId,
              startRowIndex: 1,
              endRowIndex: 1 + totalDataRows,
              startColumnIndex: VR_COL.SUPERVISI - 1,
              endColumnIndex: VR_COL.SUPERVISI,
            },
            rule: {
              condition: {
                type: "ONE_OF_LIST",
                values: [
                  { userEnteredValue: "Sudah Dicek AI" },
                  { userEnteredValue: "Revisi" },
                ],
              },
              showCustomUi: true,
              strict: false,
            },
          },
        },
      ],
    },
  });
}
