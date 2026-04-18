import { google } from "googleapis";
import { colToLetter } from "./helpers.js";

export async function readSheet(auth, spreadsheetId, sheetName, range = "A:Z") {
  const sheets = google.sheets({ version: "v4", auth: await auth.getClient() });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!${range}`,
  });
  return res.data.values || [];
}

export async function getSheetProps(sheets, spreadsheetId, sheetName) {
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets(properties(sheetId,title,gridProperties))",
  });
  const sheet = meta.data.sheets?.find((s) => s.properties.title === sheetName);
  if (!sheet) throw new Error(`Tab "${sheetName}" tidak ditemukan`);
  return sheet.properties;
}

export async function ensureColumns(sheets, spreadsheetId, sheetProps, neededCols) {
  const current = sheetProps.gridProperties.columnCount;
  if (neededCols <= current) return;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          appendDimension: {
            sheetId: sheetProps.sheetId,
            dimension: "COLUMNS",
            length: neededCols - current,
          },
        },
      ],
    },
  });
}

export async function writeCells(sheets, spreadsheetId, sheetName, updates) {
  const data = updates.map(({ row, col, value }) => ({
    range: `${sheetName}!${colToLetter(col)}${row}`,
    values: [[value]],
  }));
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: { valueInputOption: "RAW", data },
  });
}

export async function batchUpdateCells(auth, spreadsheetId, sheetName, updates) {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: client });
  const maxCol = Math.max(...updates.map((u) => u.col));
  const props = await getSheetProps(sheets, spreadsheetId, sheetName);
  await ensureColumns(sheets, spreadsheetId, props, maxCol);
  await writeCells(sheets, spreadsheetId, sheetName, updates);
  return props;
}

export async function setSupervisiDropdown(
  sheets,
  spreadsheetId,
  sheetProps,
  supervisiCol,
  startRow,
  endRow,
) {
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          setDataValidation: {
            range: {
              sheetId: sheetProps.sheetId,
              startRowIndex: startRow - 1,
              endRowIndex: endRow,
              startColumnIndex: supervisiCol - 1,
              endColumnIndex: supervisiCol,
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
