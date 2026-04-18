import nodemailer from "nodemailer";
import path from "path";
import { countStats } from "./helpers.js";

export async function sendEmailReport(results, excelPath, emailTo) {
  const { total, sesuai, sebagian, tidak } = countStats(results);

  const rows = results
    .map((r) => {
      const bg =
        r.verdict?.color === "HIJAU"
          ? "#d4edda"
          : r.verdict?.color === "KUNING"
            ? "#fff3cd"
            : "#f8d7da";
      return `<tr style="background:${bg}"><td style="padding:5px 8px;border:1px solid #dee2e6">${r.id}</td><td style="padding:5px 8px;border:1px solid #dee2e6">${(r.bukti || "-").substring(0, 50)}</td><td style="padding:5px 8px;border:1px solid #dee2e6;text-align:center">${r.existCheck?.fileCount || 0}</td><td style="padding:5px 8px;border:1px solid #dee2e6;text-align:center">${r.verdict?.score || 0}%</td><td style="padding:5px 8px;border:1px solid #dee2e6;font-weight:bold">${r.verdict?.status || "-"}</td></tr>`;
    })
    .join("");

  const html = `<div style="font-family:Arial,sans-serif;max-width:800px;margin:auto;color:#333"><h2 style="color:#2e4057;border-bottom:2px solid #2e4057;padding-bottom:8px">Laporan Pengecekan Data Dukung ZI</h2><p>Tanggal: <strong>${new Date().toLocaleDateString("id-ID", { dateStyle: "long" })}</strong></p><table style="width:100%;border-collapse:collapse;margin:12px 0"><tr><td style="padding:12px;background:#2e4057;color:#fff;text-align:center">Total<br><b style="font-size:22px">${total}</b></td><td style="padding:12px;background:#28a745;color:#fff;text-align:center">Sesuai<br><b style="font-size:22px">${sesuai}</b></td><td style="padding:12px;background:#ffc107;color:#212529;text-align:center">Sebagian<br><b style="font-size:22px">${sebagian}</b></td><td style="padding:12px;background:#dc3545;color:#fff;text-align:center">Tidak Sesuai<br><b style="font-size:22px">${tidak}</b></td></tr></table><table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr style="background:#2e4057;color:#fff"><th style="padding:7px 8px;border:1px solid #dee2e6">ID</th><th style="padding:7px 8px;border:1px solid #dee2e6">Bukti Data</th><th style="padding:7px 8px;border:1px solid #dee2e6">Jml File</th><th style="padding:7px 8px;border:1px solid #dee2e6">Skor</th><th style="padding:7px 8px;border:1px solid #dee2e6">Status</th></tr></thead><tbody>${rows}</tbody></table><p style="color:#888;font-size:11px;margin-top:12px">Laporan lengkap terlampir.</p></div>`;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.ZI_EMAIL_FROM, pass: process.env.ZI_EMAIL_PASS },
  });

  await transporter.sendMail({
    from: `ZI Checker <${process.env.ZI_EMAIL_FROM}>`,
    to: emailTo,
    subject: `Laporan ZI \u2014 ${sesuai}/${total} sesuai \u2014 ${new Date().toLocaleDateString("id-ID")}`,
    html,
    attachments: [{ filename: path.basename(excelPath), path: excelPath }],
  });
}
