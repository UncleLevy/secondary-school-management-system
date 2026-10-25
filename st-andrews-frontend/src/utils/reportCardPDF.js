import jsPDF from "jspdf";

const SCHOOL_NAME = "School Timetable System";
const SCHOOL_SUBTITLE = "Academic Management System";
const PRIMARY = [30, 64, 175];
const PRIMARY_LIGHT = [239, 246, 255];
const DARK = [17, 24, 39];
const MUTED = [107, 114, 128];
const BORDER = [229, 231, 235];
const GREEN = [5, 150, 105];
const AMBER = [180, 120, 0];
const RED = [220, 38, 38];

function scoreColor(score) {
  if (score >= 70) return GREEN;
  if (score >= 50) return AMBER;
  return RED;
}

function getGradeLetter(score) {
  if (score >= 90) return "A+"; if (score >= 80) return "A";
  if (score >= 75) return "B+"; if (score >= 70) return "B";
  if (score >= 65) return "C+"; if (score >= 60) return "C";
  if (score >= 50) return "D"; if (score >= 40) return "E"; return "F";
}

function drawPageHeader(doc, student) {
  const pageW = doc.internal.pageSize.getWidth();

  // Dark header bar
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, pageW, 42, "F");

  // School crest circle
  doc.setFillColor(255, 255, 255, 0.15);
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.5);
  doc.circle(pageW / 2, 20, 12, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text("SP", pageW / 2, 23, { align: "center" });

  // School name centred
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(SCHOOL_NAME, pageW / 2, 10, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(186, 210, 255);
  doc.text(SCHOOL_SUBTITLE, pageW / 2, 16, { align: "center" });

  // Report Card label (left)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text("OFFICIAL STUDENT REPORT CARD", 14, 37);

  // Date generated (right)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(186, 210, 255);
  doc.text(
    `Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
    pageW - 14, 37, { align: "right" }
  );
}

function drawStudentInfoBlock(doc, student, stats, y) {
  const pageW = doc.internal.pageSize.getWidth();

  // Light band
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, y, pageW - 28, 38, 3, 3, "F");
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.4);
  doc.roundedRect(14, y, pageW - 28, 38, 3, 3, "S");

  // Section title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...PRIMARY);
  doc.text("STUDENT INFORMATION", 18, y + 7);

  const col1x = 18, col2x = 80, col3x = 140;
  const row1 = y + 15, row2 = y + 25, row3 = y + 34;

  const field = (label, value, x, rowY) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED);
    doc.text(label, x, rowY - 4);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...DARK);
    doc.text(value || "—", x, rowY);
  };

  field("FULL NAME", `${student.first_name} ${student.last_name}`, col1x, row1);
  field("GRADE", student.grade || "—", col2x, row1);
  field("SECTION", student.section || "—", col3x, row1);

  field("DATE OF BIRTH", student.date_of_birth || "—", col1x, row2);
  field("GENDER", student.gender || "—", col2x, row2);
  field("STATUS", student.status || "—", col3x, row2);

  field("GUARDIAN", student.guardian_name || "—", col1x, row3);
  field("PHONE", student.guardian_phone || "—", col2x, row3);
  field("ENROLLED", student.enrollment_date || "—", col3x, row3);

  return y + 44;
}

function drawTermResults(doc, group, commentsByTerm, y) {
  const pageW = doc.internal.pageSize.getWidth();
  const termKey = `${group.year}-${group.term}`;
  const comment = commentsByTerm[termKey] || "";
  const termAvg = Math.round(group.results.reduce((s, r) => s + r.score, 0) / group.results.length);

  // Term header
  doc.setFillColor(...PRIMARY);
  doc.roundedRect(14, y, pageW - 28, 10, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(`${group.term.toUpperCase()} — ${group.year}`, 18, y + 7);

  // Average badge
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(`Class Average: ${termAvg}%  |  ${getGradeLetter(termAvg)}`, pageW - 18, y + 7, { align: "right" });

  y += 12;

  // Results table header
  const colWidths = [65, 22, 22, 55];
  const headers = ["Subject", "Score", "Grade", "Remarks"];
  const rowH = 8;
  let x = 14;

  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, pageW - 28, rowH, "F");
  headers.forEach((h, i) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(h, x + 2, y + 5.5);
    x += colWidths[i];
  });
  y += rowH;

  // Result rows
  group.results.forEach((r, idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(249, 250, 251);
      doc.rect(14, y, pageW - 28, rowH, "F");
    }
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.2);
    doc.line(14, y + rowH, 14 + pageW - 28, y + rowH);

    x = 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...DARK);
    doc.text(r.subject, x + 2, y + 5.5); x += colWidths[0];

    doc.setFont("helvetica", "bold");
    doc.setTextColor(...scoreColor(r.score));
    doc.text(`${r.score}%`, x + 2, y + 5.5); x += colWidths[1];

    doc.setFont("helvetica", "bold");
    doc.setTextColor(...scoreColor(r.score));
    doc.text(r.grade_letter || getGradeLetter(r.score), x + 2, y + 5.5); x += colWidths[2];

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text(r.remarks || "", x + 2, y + 5.5);

    y += rowH;
  });

  // Teacher comment
  if (comment) {
    y += 3;
    doc.setFillColor(...PRIMARY_LIGHT);
    const commentLines = doc.splitTextToSize(`Teacher's Comment: "${comment}"`, pageW - 34);
    const commentH = commentLines.length * 5 + 6;
    doc.roundedRect(14, y, pageW - 28, commentH, 2, 2, "F");
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(...PRIMARY);
    doc.text(commentLines, 18, y + 5);
    y += commentH;
  }

  return y + 6;
}

function drawAttendanceSummary(doc, studentAttendance, y) {
  const pageW = doc.internal.pageSize.getWidth();
  const present = studentAttendance.filter(a => a.status === "Present").length;
  const absent = studentAttendance.filter(a => a.status === "Absent").length;
  const late = studentAttendance.filter(a => a.status === "Late").length;
  const excused = studentAttendance.filter(a => a.status === "Excused").length;
  const total = studentAttendance.length;
  const rate = total > 0 ? Math.round((present / total) * 100) : 0;

  // Header
  doc.setFillColor(79, 70, 229);
  doc.roundedRect(14, y, pageW - 28, 10, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text("ATTENDANCE SUMMARY", 18, y + 7);
  y += 12;

  // Stats band
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, y, pageW - 28, 14, 2, 2, "F");

  const cells = [
    ["Total Days", total],
    ["Present", present],
    ["Absent", absent],
    ["Late", late],
    ["Excused", excused],
    ["Rate", `${rate}%`],
  ];

  const cellW = (pageW - 28) / cells.length;
  cells.forEach(([label, value], i) => {
    const cx = 14 + cellW * i + cellW / 2;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED);
    doc.text(label, cx, y + 5, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    if (i === 5) {
      doc.setTextColor(...(rate >= 75 ? GREEN : RED));
    } else {
      doc.setTextColor(...DARK);
    }
    doc.text(String(value), cx, y + 12, { align: "center" });
  });

  return y + 20;
}

function drawSignatureBlock(doc, teacherName, principalName) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const y = pageH - 46;

  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.5);
  doc.line(14, y, pageW - 14, y);

  const boxW = 68;

  const drawSig = (x, label, name) => {
    doc.setFillColor(...PRIMARY_LIGHT);
    doc.roundedRect(x, y + 4, boxW, 22, 2, 2, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED);
    doc.text("Signature:", x + 3, y + 11);
    doc.setDrawColor(...PRIMARY);
    doc.setLineWidth(0.3);
    doc.line(x + 3, y + 20, x + boxW - 3, y + 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...DARK);
    doc.text(name || label, x + 3, y + 27);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED);
    doc.text(label, x + 3, y + 32);
  };

  drawSig(14, "Class Teacher", teacherName);
  drawSig(pageW / 2 - boxW / 2, "Parent / Guardian", "");
  drawSig(pageW - 14 - boxW, "Head Teacher / Principal", principalName);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(6.5);
  doc.setTextColor(...MUTED);
  doc.text("This is an official school document. Any unauthorised alterations render it void.", pageW / 2, pageH - 5, { align: "center" });
}

export function exportStudentReportCardPDF({
  student, termGroups, commentsByTerm, studentAttendance, stats, teacherName, principalName
}) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  drawPageHeader(doc, student);

  let y = 48;
  y = drawStudentInfoBlock(doc, student, stats, y);

  // Overall performance band
  if (stats) {
    const pageW = doc.internal.pageSize.getWidth();
    doc.setFillColor(...PRIMARY_LIGHT);
    doc.roundedRect(14, y, pageW - 28, 14, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...PRIMARY);
    doc.text("CUMULATIVE PERFORMANCE", 18, y + 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...DARK);
    doc.text(`Overall Average: `, 18, y + 12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...scoreColor(stats.avg));
    doc.text(`${stats.avg}%  (${getGradeLetter(stats.avg)})`, 48, y + 12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text(`Best: ${stats.best.subject} ${stats.best.score}%`, 100, y + 12);
    doc.text(`Attendance: ${stats.attendanceRate ?? "N/A"}%`, 160, y + 12);
    y += 20;
  }

  // Term results - add new page when needed
  termGroups.forEach((group) => {
    const pageH = doc.internal.pageSize.getHeight();
    const estimatedHeight = group.results.length * 8 + 40;
    if (y + estimatedHeight > pageH - 55) {
      doc.addPage();
      drawPageHeader(doc, student);
      y = 48;
    }
    y = drawTermResults(doc, group, commentsByTerm, y);
  });

  // Attendance summary
  const pageH = doc.internal.pageSize.getHeight();
  if (y + 40 > pageH - 55) {
    doc.addPage();
    drawPageHeader(doc, student);
    y = 48;
  }
  y = drawAttendanceSummary(doc, studentAttendance, y);

  // Signature block on last page
  drawSignatureBlock(doc, teacherName, principalName);

  // Page numbers
  const pageCount = doc.internal.getNumberOfPages();
  const pageW = doc.internal.pageSize.getWidth();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED);
    doc.text(`Page ${i} of ${pageCount}`, pageW - 14, doc.internal.pageSize.getHeight() - 5, { align: "right" });
  }

  const safeName = `${student.first_name}_${student.last_name}`.replace(/\s+/g, "_");
  doc.save(`ReportCard_${safeName}_${new Date().toISOString().split("T")[0]}.pdf`);
}