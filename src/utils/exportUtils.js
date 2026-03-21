
import jsPDF from "jspdf";

export function exportCSV(rows, columns, filename = "export") {
  if (!rows?.length) return;

  const headers = columns.map((c) => c.header || c.id || "");
  const data = rows.map((row) =>
    columns.map((col) => {
      const val = col.accessorFn ? col.accessorFn(row) : row[col.id] ?? "";
      return `"${String(val ?? "").replace(/"/g, '""')}"`; 
    })
  );

  const csv = [
    headers.map((h) => `"${h}"`).join(","),
    ...data.map((r) => r.join(",")),
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─── PDF (manual table — no autotable plugin needed) ─────────────────────── */
export function exportPDF(rows, columns, { title = "Export", filename = "export" } = {}) {
  if (!rows?.length) return;

  const doc    = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W      = doc.internal.pageSize.getWidth();   // 297mm landscape
  const margin = 14;
  const usable = W - margin * 2;

  // Title
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42);
  doc.text(title, margin, 15);

  // Subtitle
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Generated: ${new Date().toLocaleString()}  •  ${rows.length} records`,
    margin,
    21
  );

  // Column widths — equal distribution
  const colCount = columns.length;
  const colW     = usable / colCount;
  const rowH     = 7;
  const headerH  = 8;
  let   y        = 28;

  const checkNewPage = (neededH) => {
    const pageH = doc.internal.pageSize.getHeight();
    if (y + neededH > pageH - 10) {
      doc.addPage();
      y = 14;
    }
  };

  // Header row background
  doc.setFillColor(37, 99, 235);
  doc.rect(margin, y, usable, headerH, "F");

  // Header text
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.setFont(undefined, "bold");
  columns.forEach((col, i) => {
    const label = String(col.header || col.id || "");
    doc.text(label, margin + i * colW + 2, y + 5.5, { maxWidth: colW - 4 });
  });
  y += headerH;

  // Data rows
  doc.setFont(undefined, "normal");
  rows.forEach((row, ri) => {
    checkNewPage(rowH);

    // Alternating row background
    if (ri % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, usable, rowH, "F");
    }

    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);

    columns.forEach((col, i) => {
      const val = col.accessorFn ? col.accessorFn(row) : row[col.id] ?? "";
      const text = String(val ?? "");
      doc.text(text, margin + i * colW + 2, y + 4.8, { maxWidth: colW - 4 });
    });

    y += rowH;
  });

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  const pageH = doc.internal.pageSize.getHeight();
  doc.text("CareerPatch Admin", margin, pageH - 5);
  doc.text(`Page 1`, W - margin, pageH - 5, { align: "right" });

  doc.save(`${filename}_${new Date().toISOString().slice(0, 10)}.pdf`);
}