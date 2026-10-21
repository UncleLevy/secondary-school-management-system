import jsPDF from "jspdf";

const SCHOOL_NAME = "St. Andrews High School";
const SCHOOL_SUBTITLE = "Academic Management System";

// Colors [R, G, B]
const C_PRIMARY   = [30,  64,  175]; // blue-700
const C_WHITE     = [255, 255, 255];
const C_LIGHT_BG  = [248, 250, 252]; // slate-50
const C_HEADER_BG = [239, 246, 255]; // blue-50
const C_DARK      = [17,  24,  39];  // gray-900
const C_MUTED     = [107, 114, 128]; // gray-500
const C_LINE      = [229, 231, 235]; // gray-200
const C_ALT_ROW   = [249, 250, 251]; // gray-50
const C_GREEN     = [5,   150, 105];
const C_AMBER     = [180, 120, 0];
const C_RED       = [220, 38,  38];
const C_INDIGO    = [79,  70,  229];

const PAGE_W = 210; // A4 mm
const PAGE_H = 297;
const MARGIN = 14;
const CONTENT_W = PAGE_W - MARGIN * 2;

// ─── Header ────────────────────────────────────────────────────────────────
function drawHeader(doc, reportTitle, reportSubtitle) {
  doc.setFillColor(...C_PRIMARY);
  doc.rect(0, 0, PAGE_W, 40, "F");

  // School name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...C_WHITE);
  doc.text(SCHOOL_NAME, MARGIN, 16);

  // School subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(186, 210, 255);
  doc.text(SCHOOL_SUBTITLE, MARGIN, 23);

  // Report title (right)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...C_WHITE);
  doc.text(reportTitle, PAGE_W - MARGIN, 14, { align: "right" });

  if (reportSubtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(186, 210, 255);
    doc.text(reportSubtitle, PAGE_W - MARGIN, 21, { align: "right" });
  }

  // Generated date
  doc.setFontSize(7);
  doc.setTextColor(186, 210, 255);
  const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  doc.text(`Generated: ${dateStr}`, PAGE_W - MARGIN, 35, { align: "right" });
}

// ─── Signature Block ───────────────────────────────────────────────────────
function drawSignatureBlock(doc, label1 = "Class Teacher", label2 = "Head Teacher / Principal") {
  const y = PAGE_H - 46;
  const boxW = 68;
  const boxH = 22;

  // Divider line
  doc.setDrawColor(...C_LINE);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);

  // Left box
  doc.setFillColor(...C_HEADER_BG);
  doc.roundedRect(MARGIN, y + 5, boxW, boxH, 2, 2, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...C_MUTED);
  doc.text("Signature:", MARGIN + 3, y + 12);
  doc.setDrawColor(...C_PRIMARY);
  doc.setLineWidth(0.3);
  doc.line(MARGIN + 3, y + 21, MARGIN + boxW - 3, y + 21);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...C_DARK);
  doc.text(label1, MARGIN + 3, y + 29);

  // Right box
  const rx = PAGE_W - MARGIN - boxW;
  doc.setFillColor(...C_HEADER_BG);
  doc.roundedRect(rx, y + 5, boxW, boxH, 2, 2, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...C_MUTED);
  doc.text("Signature:", rx + 3, y + 12);
  doc.setDrawColor(...C_PRIMARY);
  doc.setLineWidth(0.3);
  doc.line(rx + 3, y + 21, rx + boxW - 3, y + 21);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...C_DARK);
  doc.text(label2, rx + 3, y + 29);

  // Footer note
  doc.setFont("helvetica", "italic");
  doc.setFontSize(6.5);
  doc.setTextColor(...C_MUTED);
  doc.text(
    "This is an official school record. Alterations require written authorisation from school administration.",
    PAGE_W / 2, PAGE_H - 6, { align: "center" }
  );
}

// ─── Table Helpers ─────────────────────────────────────────────────────────
function drawTableHeader(doc, y, columns) {
  const rowH = 8;
  doc.setFillColor(...C_PRIMARY);
  doc.rect(MARGIN, y, CONTENT_W, rowH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...C_WHITE);
  let x = MARGIN;
  columns.forEach(col => {
    doc.text(col.label, x + 2, y + 5.5);
    x += col.width;
  });
  return y + rowH;
}

function drawTableRow(doc, y, columns, values, rowIndex, colorFn) {
  const rowH = 7.5;
  if (rowIndex % 2 === 1) {
    doc.setFillColor(...C_ALT_ROW);
    doc.rect(MARGIN, y, CONTENT_W, rowH, "F");
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  let x = MARGIN;
  columns.forEach((col, i) => {
    const val = String(values[i] ?? "");
    const color = colorFn ? colorFn(i, val) : C_DARK;
    doc.setTextColor(...color);
    const truncated = doc.getTextWidth(val) > col.width - 4
      ? val.slice(0, Math.floor((col.width - 6) / doc.getTextWidth("a") * 0.9)) + "…"
      : val;
    doc.text(truncated, x + 2, y + 5.2);
    x += col.width;
  });
  // row bottom line
  doc.setDrawColor(...C_LINE);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, y + rowH, PAGE_W - MARGIN, y + rowH);
  return y + rowH;
}

// ─── Academic Report PDF ────────────────────────────────────────────────────
export function exportAcademicReportPDF({ studentReports, filteredResults, selectedGrade, selectedTerm }) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const gradeLabel = selectedGrade === "all" ? "All Grades" : selectedGrade;
  const termLabel  = selectedTerm  === "all" ? "All Terms"  : selectedTerm;

  drawHeader(doc, "Academic Performance Report", `${gradeLabel}  ·  ${termLabel}`);

  // ── Stats band ──────────────────────────────────────────────────────────
  doc.setFillColor(...C_LIGHT_BG);
  doc.rect(MARGIN, 45, CONTENT_W, 13, "F");
  const total      = studentReports.length;
  const overall    = total > 0 ? Math.round(studentReports.reduce((s, r) => s + r.average, 0) / total) : 0;
  const passing    = studentReports.filter(s => s.average >= 50).length;
  const atRisk     = total - passing;

  const stats = [
    [`Total Students`, total],
    [`Class Average`, `${overall}%`],
    [`Passing (≥50%)`, passing],
    [`At-Risk (<50%)`, atRisk],
  ];
  stats.forEach(([lbl, val], i) => {
    const sx = MARGIN + 4 + i * 47;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...C_MUTED);
    doc.text(lbl, sx, 50);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...C_DARK);
    doc.text(String(val), sx, 56);
  });

  // ── Student Rankings table ──────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...C_DARK);
  doc.text("Student Rankings", MARGIN, 67);

  const rankCols = [
    { label: "#",       width: 9  },
    { label: "Student", width: 48 },
    { label: "Grade",   width: 22 },
    { label: "Subjects",width: 18 },
    { label: "Average", width: 20 },
    { label: "Highest", width: 20 },
    { label: "Lowest",  width: 20 },
    { label: "Status",  width: 25 },
  ];

  let y = drawTableHeader(doc, 70, rankCols);

  studentReports.forEach((s, i) => {
    if (y > PAGE_H - 55) {
      doc.addPage();
      drawHeader(doc, "Academic Performance Report (cont.)", `${gradeLabel}  ·  ${termLabel}`);
      y = drawTableHeader(doc, 48, rankCols);
    }
    const status = s.average >= 70 ? "Excellent" : s.average >= 50 ? "Satisfactory" : "Needs Support";
    y = drawTableRow(doc, y, rankCols, [i + 1, s.name, s.grade, s.subjectCount, `${s.average}%`, `${s.highest}%`, `${s.lowest}%`, status], i,
      (colIdx, val) => {
        if (colIdx === 4) return parseInt(val) >= 70 ? C_GREEN : parseInt(val) >= 50 ? C_AMBER : C_RED;
        if (colIdx === 7) return val === "Excellent" ? C_GREEN : val === "Satisfactory" ? C_AMBER : C_RED;
        return C_DARK;
      });
  });

  // ── Subject Performance table ───────────────────────────────────────────
  if (filteredResults && filteredResults.length > 0) {
    const subMap = {};
    filteredResults.forEach(r => {
      if (!subMap[r.subject]) subMap[r.subject] = [];
      subMap[r.subject].push(r.score);
    });

    y += 8;
    if (y > PAGE_H - 80) {
      doc.addPage();
      drawHeader(doc, "Academic Performance Report (cont.)", `${gradeLabel}  ·  ${termLabel}`);
      y = 48;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...C_DARK);
    doc.text("Subject Performance Summary", MARGIN, y);
    y += 4;

    const subCols = [
      { label: "Subject",    width: 50 },
      { label: "Entries",    width: 22 },
      { label: "Average",    width: 25 },
      { label: "Highest",    width: 25 },
      { label: "Lowest",     width: 25 },
      { label: "Pass Rate",  width: 35 },
    ];

    // Override header color for subject table
    doc.setFillColor(...C_INDIGO);
    doc.rect(MARGIN, y, CONTENT_W, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...C_WHITE);
    let hx = MARGIN;
    subCols.forEach(col => { doc.text(col.label, hx + 2, y + 5.5); hx += col.width; });
    y += 8;

    Object.entries(subMap).forEach(([subject, scores], i) => {
      const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      const passing = scores.filter(s => s >= 50).length;
      const passRate = `${passing}/${scores.length} (${Math.round((passing / scores.length) * 100)}%)`;
      y = drawTableRow(doc, y, subCols,
        [subject, scores.length, `${avg}%`, `${Math.max(...scores)}%`, `${Math.min(...scores)}%`, passRate], i,
        (colIdx, val) => {
          if (colIdx === 2) return parseInt(val) >= 70 ? C_GREEN : parseInt(val) >= 50 ? C_AMBER : C_RED;
          return C_DARK;
        });
    });
  }

  drawSignatureBlock(doc);
  doc.save(`Academic_Report_${gradeLabel.replace(/ /g,"_")}_${termLabel.replace(/ /g,"_")}_${new Date().toISOString().split("T")[0]}.pdf`);
}

// ─── Attendance Summary PDF ────────────────────────────────────────────────
export function exportAttendancePDF({ attendanceRecords, selectedDate, selectedGrade }) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const gradeLabel = selectedGrade === "all" ? "All Grades" : selectedGrade;
  const dateLabel  = new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });

  drawHeader(doc, "Attendance Summary", `${gradeLabel}  ·  ${dateLabel}`);

  const records = attendanceRecords.filter(a =>
    a.date === selectedDate && (selectedGrade === "all" || a.grade === selectedGrade)
  );

  const present = records.filter(a => a.status === "Present").length;
  const absent  = records.filter(a => a.status === "Absent").length;
  const late    = records.filter(a => a.status === "Late").length;
  const excused = records.filter(a => a.status === "Excused").length;
  const total   = records.length;
  const rate    = total > 0 ? Math.round((present / total) * 100) : 0;

  // ── Stats band ──────────────────────────────────────────────────────────
  doc.setFillColor(...C_LIGHT_BG);
  doc.rect(MARGIN, 45, CONTENT_W, 16, "F");

  const statItems = [
    ["Total Recorded", total,   C_DARK],
    ["Present",        present, C_GREEN],
    ["Absent",         absent,  C_RED],
    ["Late",           late,    C_AMBER],
    ["Excused",        excused, C_MUTED],
    ["Attendance Rate",`${rate}%`, rate >= 75 ? C_GREEN : C_RED],
  ];
  statItems.forEach(([lbl, val, color], i) => {
    const sx = MARGIN + 4 + i * 31;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...C_MUTED);
    doc.text(lbl, sx, 51);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...color);
    doc.text(String(val), sx, 58);
  });

  // ── Register table ──────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...C_DARK);
  doc.text(`Attendance Register — ${dateLabel}`, MARGIN, 70);

  const cols = [
    { label: "#",           width: 10 },
    { label: "Student Name",width: 65 },
    { label: "Grade",       width: 28 },
    { label: "Status",      width: 25 },
    { label: "Notes",       width: 54 },
  ];

  let y = drawTableHeader(doc, 73, cols);

  records.forEach((r, i) => {
    if (y > PAGE_H - 55) {
      doc.addPage();
      drawHeader(doc, "Attendance Summary (cont.)", `${gradeLabel}  ·  ${dateLabel}`);
      y = drawTableHeader(doc, 48, cols);
    }
    const notes = r.status === "Absent" ? "Guardian to be notified"
      : r.status === "Late" ? "Arrived after roll call" : "";
    y = drawTableRow(doc, y, cols, [i + 1, r.student_name, r.grade || "", r.status, notes], i,
      (colIdx, val) => {
        if (colIdx === 3) {
          if (val === "Present") return C_GREEN;
          if (val === "Absent")  return C_RED;
          if (val === "Late")    return C_AMBER;
          return C_MUTED;
        }
        return C_DARK;
      });
  });

  if (records.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...C_MUTED);
    doc.text("No attendance records found for the selected filters.", PAGE_W / 2, 95, { align: "center" });
  }

  drawSignatureBlock(doc, "Class Teacher", "Head Teacher / Principal");
  doc.save(`Attendance_${selectedDate}_${gradeLabel.replace(/ /g,"_")}.pdf`);
}