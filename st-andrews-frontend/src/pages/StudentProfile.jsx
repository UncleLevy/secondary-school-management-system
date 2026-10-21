import React, { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { entities } from "@/api/apiClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, FileDown, User, Phone, MapPin, Calendar,
  GraduationCap, TrendingUp, BookOpen, ClipboardList
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import { exportStudentReportCardPDF } from "@/utils/reportCardPDF";

const gradeColors = {
  "A+": "bg-emerald-100 text-emerald-800", "A": "bg-emerald-50 text-emerald-700",
  "B+": "bg-blue-100 text-blue-800", "B": "bg-blue-50 text-blue-700",
  "C+": "bg-amber-100 text-amber-800", "C": "bg-amber-50 text-amber-700",
  "D": "bg-orange-100 text-orange-800", "E": "bg-rose-100 text-rose-700",
  "F": "bg-rose-200 text-rose-900",
};

const statusColors = {
  Present: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Absent: "bg-rose-50 text-rose-700 border-rose-200",
  Late: "bg-amber-50 text-amber-700 border-amber-200",
  Excused: "bg-slate-100 text-slate-600 border-slate-200",
};

function getGradeLetter(score) {
  if (score >= 90) return "A+"; if (score >= 80) return "A";
  if (score >= 75) return "B+"; if (score >= 70) return "B";
  if (score >= 65) return "C+"; if (score >= 60) return "C";
  if (score >= 50) return "D"; if (score >= 40) return "E"; return "F";
}

export default function StudentProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [commentsByTerm, setCommentsByTerm] = useState({});
  const [savingComment, setSavingComment] = useState(null);
  const [principalName, setPrincipalName] = useState("Head Teacher");
  const [teacherName, setTeacherName] = useState("Class Teacher");

  const { data: student, isLoading: loadingStudent } = useQuery({
    queryKey: ["student", id],
    queryFn: () => entities.Student.get(id),
  });

  const { data: allResults = [] } = useQuery({
    queryKey: ["results"],
    queryFn: () => entities.ExamResult.list("-year"),
  });

  const { data: allAttendance = [] } = useQuery({
    queryKey: ["attendance"],
    queryFn: () => entities.Attendance.list("-date"),
  });

  const studentResults = useMemo(() =>
    allResults.filter(r => r.student_id === Number(id)), [allResults, id]);

  const studentAttendance = useMemo(() =>
    allAttendance.filter(a => a.student_id === Number(id)), [allAttendance, id]);

  // Group results by term + year
  const termGroups = useMemo(() => {
    const groups = {};
    studentResults.forEach(r => {
      const key = `${r.year}-${r.term}`;
      if (!groups[key]) groups[key] = { term: r.term, year: r.year, results: [] };
      groups[key].results.push(r);
    });
    return Object.values(groups).sort((a, b) =>
      b.year !== a.year ? b.year - a.year : a.term.localeCompare(b.term)
    );
  }, [studentResults]);

  // Overall stats
  const stats = useMemo(() => {
    if (studentResults.length === 0) return null;
    const scores = studentResults.map(r => r.score);
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const best = studentResults.reduce((a, b) => b.score > a.score ? b : a);
    const worst = studentResults.reduce((a, b) => b.score < a.score ? b : a);
    const present = studentAttendance.filter(a => a.status === "Present").length;
    const totalAtt = studentAttendance.length;
    return {
      avg, best, worst,
      attendanceRate: totalAtt > 0 ? Math.round((present / totalAtt) * 100) : null,
      totalDays: totalAtt, presentDays: present,
    };
  }, [studentResults, studentAttendance]);

  const handlePrintPDF = () => {
    if (!student) return;
    exportStudentReportCardPDF({
      student,
      termGroups,
      commentsByTerm,
      studentAttendance,
      stats,
      teacherName,
      principalName,
    });
  };

  if (loadingStudent) {
    return <Loader label="Loading student profile…" />;
  }

  if (!student) {
    return (
      <div className="py-24 text-center">
        <p className="text-muted-foreground">Student not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/students")}>
          Back to Students
        </Button>
      </div>
    );
  }

  const fullName = `${student.first_name} ${student.last_name}`;
  const initials = `${student.first_name?.[0] || ""}${student.last_name?.[0] || ""}`.toUpperCase();

  return (
    <div>
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-6">
        <div className="flex items-center gap-4 min-w-0">
          <Button variant="ghost" size="sm" onClick={() => navigate("/students")} className="gap-2 text-muted-foreground shrink-0">
            <ArrowLeft className="w-4 h-4" /> Students
          </Button>
          <span className="text-muted-foreground shrink-0">/</span>
          <span className="text-sm font-medium truncate">{fullName}</span>
        </div>
        <div className="sm:ml-auto">
          <Button onClick={handlePrintPDF} className="gap-2 w-full sm:w-auto">
            <FileDown className="w-4 h-4" /> Export Report Card
          </Button>
        </div>
      </div>

      {/* Profile Hero */}
      <Card className="mb-6 border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col gap-6 sm:flex-row">
            {/* Avatar */}
            <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 shrink-0">
              <span className="text-2xl font-bold text-primary">{initials}</span>
            </div>

            {/* Info */}
            <div className="grid flex-1 grid-cols-2 gap-4 md:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Full Name</p>
                <p className="font-semibold">{fullName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Grade & Section</p>
                <p className="font-semibold">{student.grade} {student.section ? `— Section ${student.section}` : ""}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Gender</p>
                <p className="font-semibold">{student.gender || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Status</p>
                <Badge variant="outline" className={
                  student.status === "Active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                    student.status === "Graduated" ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600"
                }>{student.status}</Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1"><Calendar className="w-3 h-3" /> Date of Birth</p>
                <p className="text-sm font-medium">{student.date_of_birth || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1"><User className="w-3 h-3" /> Guardian</p>
                <p className="text-sm font-medium">{student.guardian_name || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1"><Phone className="w-3 h-3" /> Phone</p>
                <p className="text-sm font-medium">{student.guardian_phone || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1"><MapPin className="w-3 h-3" /> Address</p>
                <p className="text-sm font-medium truncate">{student.address || "—"}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 mb-6 sm:grid-cols-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground">Overall Average</p>
              <p className={`text-2xl font-bold mt-1 ${stats.avg >= 70 ? "text-emerald-600" : stats.avg >= 50 ? "text-amber-600" : "text-rose-600"}`}>
                {stats.avg}%
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{getGradeLetter(stats.avg)} Grade</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground">Best Subject</p>
              <p className="mt-1 text-sm font-bold truncate">{stats.best.subject}</p>
              <p className="text-xs text-emerald-600 mt-0.5">{stats.best.score}% — {stats.best.term}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground">Needs Attention</p>
              <p className="mt-1 text-sm font-bold truncate">{stats.worst.subject}</p>
              <p className="text-xs text-rose-600 mt-0.5">{stats.worst.score}% — {stats.worst.term}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground">Attendance Rate</p>
              <p className={`text-2xl font-bold mt-1 ${stats.attendanceRate >= 75 ? "text-emerald-600" : "text-rose-600"}`}>
                {stats.attendanceRate ?? "—"}{stats.attendanceRate !== null ? "%" : ""}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{stats.presentDays}/{stats.totalDays} days</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="grades">
        <div className="mb-6 overflow-x-auto">
        <TabsList>
          <TabsTrigger value="grades" className="gap-2"><BookOpen className="w-4 h-4" /> Grades by Term</TabsTrigger>
          <TabsTrigger value="attendance" className="gap-2"><ClipboardList className="w-4 h-4" /> Attendance</TabsTrigger>
          <TabsTrigger value="reportcard" className="gap-2"><GraduationCap className="w-4 h-4" /> Report Card Settings</TabsTrigger>
        </TabsList>
        </div>

        {/* Grades by Term */}
        <TabsContent value="grades">
          {termGroups.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-16 text-center">
                <TrendingUp className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                <p className="font-medium">No exam results recorded yet</p>
                <p className="mt-1 text-sm text-muted-foreground">Add results from the Exam Results page.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {termGroups.map((group) => {
                const termKey = `${group.year}-${group.term}`;
                const termAvg = Math.round(group.results.reduce((s, r) => s + r.score, 0) / group.results.length);
                return (
                  <Card key={termKey} className="border-0 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-base">{group.term} — {group.year}</CardTitle>
                        <Badge variant="outline" className={termAvg >= 70 ? "bg-emerald-50 text-emerald-700" : termAvg >= 50 ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}>
                          Avg: {termAvg}%
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead>Subject</TableHead>
                            <TableHead className="text-center">Score</TableHead>
                            <TableHead className="text-center">Grade</TableHead>
                            <TableHead>Remarks</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.results.map(r => (
                            <TableRow key={r.id} className="hover:bg-muted/30">
                              <TableCell className="font-medium">{r.subject}</TableCell>
                              <TableCell className="font-semibold text-center">
                                <span className={r.score >= 70 ? "text-emerald-600" : r.score >= 50 ? "text-amber-600" : "text-rose-600"}>
                                  {r.score}%
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline" className={gradeColors[r.grade_letter] || ""}>
                                  {r.grade_letter || getGradeLetter(r.score)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">{r.remarks || "—"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      </div>

                      {/* Teacher comment */}
                      <div className="pt-4 mt-4 border-t">
                        <p className="mb-2 text-xs font-semibold tracking-wide uppercase text-muted-foreground">Teacher's Comment</p>
                        <Textarea
                          placeholder={`Add teacher's comment for ${group.term} ${group.year}...`}
                          className="text-sm min-h-[70px] resize-none"
                          value={commentsByTerm[termKey] || ""}
                          onChange={e => setCommentsByTerm(prev => ({ ...prev, [termKey]: e.target.value }))}
                        />
                        <p className="mt-1 text-xs text-muted-foreground">This comment will appear on the printed report card.</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance">
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-4">
              {studentAttendance.length === 0 ? (
                <div className="py-12 text-center">
                  <ClipboardList className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="font-medium">No attendance records</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentAttendance
                      .sort((a, b) => new Date(b.date) - new Date(a.date))
                      .map(a => (
                        <TableRow key={a.id} className="hover:bg-muted/30">
                          <TableCell>{new Date(a.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={statusColors[a.status]}>{a.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Report Card Settings */}
        <TabsContent value="reportcard">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Report Card Signatories</CardTitle>
            </CardHeader>
            <CardContent className="max-w-sm space-y-4">
              <div className="space-y-1.5">
                <p className="text-sm font-medium">Class Teacher Name</p>
                <input
                  className="w-full px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={teacherName}
                  onChange={e => setTeacherName(e.target.value)}
                  placeholder="e.g. Mr. John Mwansa"
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-medium">Head Teacher / Principal Name</p>
                <input
                  className="w-full px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={principalName}
                  onChange={e => setPrincipalName(e.target.value)}
                  placeholder="e.g. Mrs. Grace Banda"
                />
              </div>
              <Button onClick={handlePrintPDF} className="w-full gap-2 mt-2">
                <FileDown className="w-4 h-4" /> Generate & Download Report Card PDF
              </Button>
              <p className="text-xs text-muted-foreground">
                The PDF will include all term results, teacher comments, attendance summary, and signature blocks.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}