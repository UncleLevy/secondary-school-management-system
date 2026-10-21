import React, { useState, useMemo } from "react";
import { entities } from "@/api/apiClient";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Users, TrendingDown, Award, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportAcademicReportPDF } from "@/utils/pdfExport";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import PageHeader from "@/components/shared/PageHeader";

export default function Reports() {
  const [selectedGrade, setSelectedGrade] = useState("all");
  const [selectedTerm, setSelectedTerm] = useState("all");

  const { data: students = [] } = useQuery({
    queryKey: ["students"],
    queryFn: () => entities.Student.list(),
  });

  const { data: results = [] } = useQuery({
    queryKey: ["results"],
    queryFn: () => entities.ExamResult.list(),
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ["attendance"],
    queryFn: () => entities.Attendance.list(),
  });

  const filteredResults = useMemo(() => {
    return results.filter(r => {
      const matchGrade = selectedGrade === "all" || r.grade === selectedGrade;
      const matchTerm = selectedTerm === "all" || r.term === selectedTerm;
      return matchGrade && matchTerm;
    });
  }, [results, selectedGrade, selectedTerm]);

  // Student report cards
  const studentReports = useMemo(() => {
    const map = {};
    filteredResults.forEach(r => {
      if (!map[r.student_id]) {
        map[r.student_id] = {
          id: r.student_id,
          name: r.student_name,
          grade: r.grade,
          subjects: [],
          scores: [],
        };
      }
      map[r.student_id].subjects.push(r.subject);
      map[r.student_id].scores.push(r.score);
    });

    return Object.values(map).map(s => ({
      ...s,
      average: Math.round(s.scores.reduce((a, b) => a + b, 0) / s.scores.length),
      highest: Math.max(...s.scores),
      lowest: Math.min(...s.scores),
      subjectCount: s.subjects.length,
    })).sort((a, b) => b.average - a.average);
  }, [filteredResults]);

  // Subject comparison radar
  const subjectRadar = useMemo(() => {
    const subjectMap = {};
    filteredResults.forEach(r => {
      if (!subjectMap[r.subject]) subjectMap[r.subject] = [];
      subjectMap[r.subject].push(r.score);
    });
    return Object.entries(subjectMap).map(([subject, scores]) => ({
      subject: subject.length > 10 ? subject.slice(0, 10) + "." : subject,
      average: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    }));
  }, [filteredResults]);

  // Score distribution histogram
  const scoreDistribution = useMemo(() => {
    const bins = [
      { range: "0-39", min: 0, max: 39, count: 0 },
      { range: "40-49", min: 40, max: 49, count: 0 },
      { range: "50-59", min: 50, max: 59, count: 0 },
      { range: "60-69", min: 60, max: 69, count: 0 },
      { range: "70-79", min: 70, max: 79, count: 0 },
      { range: "80-89", min: 80, max: 89, count: 0 },
      { range: "90-100", min: 90, max: 100, count: 0 },
    ];
    filteredResults.forEach(r => {
      const bin = bins.find(b => r.score >= b.min && r.score <= b.max);
      if (bin) bin.count++;
    });
    return bins;
  }, [filteredResults]);

  // At-risk students (avg < 50)
  const atRiskStudents = studentReports.filter(s => s.average < 50);

  // Top performers
  const topPerformers = studentReports.slice(0, 5);

  const uniqueGrades = [...new Set(students.map(s => s.grade).filter(Boolean))].sort((a, b) =>
    parseInt(a.replace("Grade ", "")) - parseInt(b.replace("Grade ", ""))
  );

  return (
    <div>
      <PageHeader
        title="Performance Reports"
        description="Analytical insights into student academic performance"
        actions={
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => exportAcademicReportPDF({ studentReports, filteredResults, selectedGrade, selectedTerm })}
            disabled={studentReports.length === 0}
          >
            <Download className="w-4 h-4" /> Export PDF
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col gap-3 mb-8 sm:flex-row">
        <Select value={selectedGrade} onValueChange={setSelectedGrade}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Grades" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Grades</SelectItem>
            {uniqueGrades.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={selectedTerm} onValueChange={setSelectedTerm}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="All Terms" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Terms</SelectItem>
            <SelectItem value="Term 1">Term 1</SelectItem>
            <SelectItem value="Term 2">Term 2</SelectItem>
            <SelectItem value="Term 3">Term 3</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-6 mb-6 lg:grid-cols-2">
        {/* Score Distribution */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <BarChart3 className="w-4 h-4 text-primary" /> Score Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredResults.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={scoreDistribution}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(220,13%,91%)" />
                  <XAxis dataKey="range" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(220,13%,91%)", fontSize: 13 }} />
                  <Bar dataKey="count" fill="hsl(224, 76%, 48%)" radius={[6, 6, 0, 0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-12 text-sm text-center text-muted-foreground">No data available</p>
            )}
          </CardContent>
        </Card>

        {/* Subject Radar */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Subject Performance Radar</CardTitle>
          </CardHeader>
          <CardContent>
            {subjectRadar.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={subjectRadar}>
                  <PolarGrid stroke="hsl(220,13%,91%)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Radar dataKey="average" stroke="hsl(224, 76%, 48%)" fill="hsl(224, 76%, 48%)" fillOpacity={0.2} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-12 text-sm text-center text-muted-foreground">No data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 mb-6 lg:grid-cols-2">
        {/* Top Performers */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Award className="w-4 h-4 text-amber-500" /> Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topPerformers.length > 0 ? (
              <div className="space-y-3">
                {topPerformers.map((s, i) => (
                  <div key={s.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-slate-100 text-slate-600" : "bg-orange-50 text-orange-600"
                        }`}>
                        {i + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.grade} · {s.subjectCount} subjects</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={s.average >= 70 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}>
                      {s.average}%
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-sm text-center text-muted-foreground">No data</p>
            )}
          </CardContent>
        </Card>

        {/* At-Risk Students */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <TrendingDown className="w-4 h-4 text-rose-500" /> At-Risk Students (Avg &lt; 50%)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {atRiskStudents.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.min(Math.max(atRiskStudents.length * 34, 100), 420)}>
                <BarChart
                  data={[...atRiskStudents].sort((a, b) => a.average - b.average)}
                  layout="vertical"
                  margin={{ left: 8, right: 24 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(220,13%,91%)" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={110} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: "1px solid hsl(220,13%,91%)", fontSize: 13 }}
                    formatter={(value) => [`${value}%`, "Average"]}
                    labelFormatter={(name, payload) => {
                      const s = payload?.[0]?.payload;
                      return s ? `${name} — ${s.grade} · Lowest: ${s.lowest}%` : name;
                    }}
                  />
                  <Bar dataKey="average" fill="hsl(350, 75%, 55%)" radius={[0, 6, 6, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-8 text-sm text-center text-muted-foreground">No at-risk students</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Full Student Rankings */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Users className="w-4 h-4 text-primary" /> Student Rankings
          </CardTitle>
        </CardHeader>
        <CardContent>
          {studentReports.length > 0 ? (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-12">Rank</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Subjects</TableHead>
                  <TableHead>Average</TableHead>
                  <TableHead>Highest</TableHead>
                  <TableHead>Lowest</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentReports.map((s, i) => (
                  <TableRow key={s.id} className="hover:bg-muted/30">
                    <TableCell className="font-bold text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.grade}</TableCell>
                    <TableCell>{s.subjectCount}</TableCell>
                    <TableCell>
                      <span className={`font-semibold ${s.average >= 70 ? "text-emerald-600" : s.average >= 50 ? "text-amber-600" : "text-rose-600"}`}>
                        {s.average}%
                      </span>
                    </TableCell>
                    <TableCell>{s.highest}%</TableCell>
                    <TableCell>{s.lowest}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          ) : (
            <p className="py-8 text-sm text-center text-muted-foreground">No results data to generate reports</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}