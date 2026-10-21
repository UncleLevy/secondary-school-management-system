import React from "react";
import { entities } from "@/api/apiClient";
import { useQuery } from "@tanstack/react-query";
import { Users, CalendarCheck, FileText, AlertTriangle, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import StatCard from "@/components/dashboard/StatCard";
import TodaySchedule from "@/components/dashboard/TodaySchedule";
import PageHeader from "@/components/shared/PageHeader";

const COLORS = ["hsl(224, 76%, 48%)", "hsl(160, 60%, 45%)", "hsl(36, 100%, 50%)", "hsl(280, 65%, 60%)", "hsl(340, 75%, 55%)"];

export default function Dashboard() {
  const { data: students = [] } = useQuery({
    queryKey: ["students"],
    queryFn: () => entities.Student.list(),
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ["attendance"],
    queryFn: () => entities.Attendance.list(),
  });

  const { data: results = [] } = useQuery({
    queryKey: ["results"],
    queryFn: () => entities.ExamResult.list(),
  });

  const activeStudents = students.filter(s => s.status === "Active").length;

  const presentCount = attendance.filter(a => a.status === "Present").length;
  const attendanceRate = attendance.length > 0 ? ((presentCount / attendance.length) * 100).toFixed(1) : 0;

  const avgScore = results.length > 0
    ? (results.reduce((sum, r) => sum + (r.score || 0), 0) / results.length).toFixed(1)
    : 0;

  const atRiskCount = (() => {
    const studentScores = {};
    results.forEach(r => {
      if (!studentScores[r.student_id]) studentScores[r.student_id] = [];
      studentScores[r.student_id].push(r.score);
    });
    return Object.values(studentScores).filter(scores => {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      return avg < 50;
    }).length;
  })();

  // Grade distribution data
  const gradeDistribution = (() => {
    const counts = {};
    students.forEach(s => {
      if (s.grade) counts[s.grade] = (counts[s.grade] || 0) + 1;
    });
    return Object.entries(counts)
      .sort(([a], [b]) => {
        const numA = parseInt(a.replace("Grade ", ""));
        const numB = parseInt(b.replace("Grade ", ""));
        return numA - numB;
      })
      .map(([name, count]) => ({ name: name.replace("Grade ", "G"), count }));
  })();

  // Subject performance data
  const subjectPerformance = (() => {
    const subjects = {};
    results.forEach(r => {
      if (!subjects[r.subject]) subjects[r.subject] = [];
      subjects[r.subject].push(r.score);
    });
    return Object.entries(subjects).map(([subject, scores]) => ({
      subject: subject.length > 8 ? subject.slice(0, 8) + "." : subject,
      average: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    }));
  })();

  // Gender distribution
  const genderData = (() => {
    const male = students.filter(s => s.gender === "Male").length;
    const female = students.filter(s => s.gender === "Female").length;
    return [
      { name: "Male", value: male },
      { name: "Female", value: female },
    ].filter(d => d.value > 0);
  })();

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Academic performance analytics overview"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 mb-8 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Students" value={activeStudents} icon={Users} color="blue" trend={5.2} trendLabel="this term" />
        <StatCard title="Attendance Rate" value={`${attendanceRate}%`} icon={CalendarCheck} color="green" />
        {/*<StatCard title="Average Score" value={`${avgScore}%`} icon={TrendingUp} color="amber" />
        <StatCard title="At-Risk Students" value={atRiskCount} icon={AlertTriangle} color="rose" />*/}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 mb-6 lg:grid-cols-3">
        {/* Grade Distribution */}
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Students by Grade</CardTitle>
          </CardHeader>
          <CardContent>
            {gradeDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={gradeDistribution}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(220, 13%, 91%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(220,13%,91%)", fontSize: 13 }} />
                  <Bar dataKey="count" fill="hsl(224, 76%, 48%)" radius={[6, 6, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-12 text-sm text-center text-muted-foreground">No student data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Gender Pie */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Gender Distribution</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            {genderData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={genderData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" stroke="none" paddingAngle={4}>
                    {genderData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(220,13%,91%)", fontSize: 13 }} />
                  <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 13 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-12 text-sm text-center text-muted-foreground">No data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Today's Schedule */}
      <TodaySchedule />

      {/* Subject Performance 
      <Card className="mt-6 border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Average Score by Subject</CardTitle>
        </CardHeader>
        <CardContent>
          {subjectPerformance.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={subjectPerformance} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(220, 13%, 91%)" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="subject" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(220,13%,91%)", fontSize: 13 }} />
                <Bar dataKey="average" fill="hsl(160, 60%, 45%)" radius={[0, 6, 6, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-12 text-sm text-center text-muted-foreground">No exam results yet</p>
          )}
        </CardContent>
      </Card>*/}
    </div>
  );
}