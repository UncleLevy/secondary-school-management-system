import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { entities } from "@/api/apiClient";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Users, School, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import StatCard from "@/components/dashboard/StatCard";
import TodaySchedule from "@/components/dashboard/TodaySchedule";
import PageHeader from "@/components/shared/PageHeader";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import Loader from "@/components/shared/Loader";
import { SCHOOL_DAYS, WEEKLY_PERIODS, classLabel } from "@/lib/timetable";

const COLORS = [
  "hsl(224, 76%, 48%)", "hsl(160, 60%, 45%)", "hsl(36, 100%, 50%)", "hsl(280, 65%, 60%)",
  "hsl(340, 75%, 55%)", "hsl(190, 70%, 42%)", "hsl(20, 85%, 55%)", "hsl(100, 45%, 45%)",
];
const TOOLTIP_STYLE = { borderRadius: 8, border: "1px solid hsl(220,13%,91%)", fontSize: 13 };
const CLASH_LABELS = { teacher: "Teacher", room: "Room", class: "Class" };

const countBy = (items, keyFn) => {
  const counts = {};
  items.forEach((item) => {
    const key = keyFn(item);
    if (key) counts[key] = (counts[key] || 0) + 1;
  });
  return counts;
};

const topEntries = (counts, limit) =>
  Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, limit);

export default function AdminDashboard() {
  const { user } = useCurrentUser();
  const { data: slots = [], isLoading } = useQuery({
    queryKey: ["timetable"],
    queryFn: () => entities.TimetableSlot.list(),
  });

  const { data: teacherList = [] } = useQuery({
    queryKey: ["teachers"],
    queryFn: () => entities.Teacher.list(),
  });

  const { data: clashData } = useQuery({
    queryKey: ["timetable-clashes"],
    queryFn: () => entities.TimetableSlot.clashes(),
  });
  const clashes = clashData?.clashes ?? [];

  const stats = useMemo(() => {
    const teacherLoad = countBy(slots, (s) => s.teacher_name);
    const roomUse = countBy(slots, (s) => s.room);
    const dayCounts = countBy(slots, (s) => s.day);
    return {
      teachers: Object.keys(teacherLoad).length,
      unscheduled: teacherList.filter((t) => t.status === "Active" && !teacherLoad[t.full_name]).map((t) => t.full_name),
      classes: new Set(slots.map(classLabel)).size,
      rooms: Object.keys(roomUse).length,
      perDay: SCHOOL_DAYS.map((day) => ({ name: day.slice(0, 3), lessons: dayCounts[day] || 0 })),
      subjects: topEntries(countBy(slots, (s) => s.subject), 8).map(([name, value]) => ({ name, value })),
      teacherLoad: topEntries(teacherLoad, 8),
      roomUse: topEntries(roomUse, 6),
    };
  }, [slots, teacherList]);

  if (isLoading) return <Loader label="Loading dashboard…" />;

  const hasClashes = clashes.length > 0;

  return (
    <div>
      <PageHeader
        title="Admin Dashboard"
        description={`Welcome${user?.full_name ? `, ${user.full_name}` : ""} · school-wide timetable overview`}
        actions={
          <Button asChild className="gap-2">
            <Link to="/timetable"><CalendarDays className="w-4 h-4" /> Open Timetable</Link>
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 mb-8 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Lessons per Week" value={slots.length} icon={CalendarDays} color="blue" />
        <StatCard title="Teachers Scheduled" value={stats.teachers} icon={Users} color="green" />
        <StatCard title="Classes Scheduled" value={stats.classes} icon={School} color="amber" />
        <StatCard
          title="Timetable Clashes"
          value={clashes.length}
          icon={hasClashes ? AlertTriangle : CheckCircle2}
          color={hasClashes ? "rose" : "green"}
        />
      </div>

      {/* Clash status */}
      {hasClashes ? (
        <Card className="mb-6 border shadow-none border-rose-200 bg-rose-50">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                <div>
                  <p className="mb-1 text-sm font-semibold text-rose-800">
                    {clashes.length === 1 ? "1 timetable clash needs" : `${clashes.length} timetable clashes need`} attention
                  </p>
                  <ul className="space-y-0.5">
                    {clashes.slice(0, 5).map((c, i) => (
                      <li key={i} className="text-xs text-rose-700">
                        {CLASH_LABELS[c.type]} <strong>{c.name}</strong> is double-booked on {c.day}, Period {c.period}
                        {" "}({c.slots.map((s) => s.subject).join(" and ")})
                      </li>
                    ))}
                    {clashes.length > 5 && (
                      <li className="text-xs text-rose-700">…and {clashes.length - 5} more</li>
                    )}
                  </ul>
                </div>
              </div>
              <Button asChild variant="outline" size="sm" className="gap-1 bg-white">
                <Link to="/timetable">Review clashes <ArrowRight className="w-3.5 h-3.5" /></Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : slots.length > 0 && (
        <Card className="mb-6 border shadow-none border-emerald-200 bg-emerald-50">
          <CardContent className="flex items-center gap-2 p-4 text-sm font-medium text-emerald-800">
            <CheckCircle2 className="w-4 h-4" /> No clashes — every teacher, room and class is booked at most once per period.
          </CardContent>
        </Card>
      )}

      {slots.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16 text-center">
            <CalendarDays className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="font-semibold">No timetable yet</p>
            <p className="mt-1 mb-4 text-sm text-muted-foreground">Add lessons on the Timetable page and the weekly overview will appear here.</p>
            <Button asChild><Link to="/timetable">Build the timetable</Link></Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Charts Row */}
          <div className="grid grid-cols-1 gap-6 mb-6 lg:grid-cols-3">
            <Card className="border-0 shadow-sm lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Lessons per Day</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={stats.perDay}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(220, 13%, 91%)" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="lessons" name="Lessons" fill="hsl(224, 76%, 48%)" radius={[6, 6, 0, 0]} barSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Lessons by Subject</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={stats.subjects} cx="50%" cy="45%" innerRadius={50} outerRadius={80} dataKey="value" stroke="none" paddingAngle={2}>
                      {stats.subjects.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Workload + rooms */}
          <div className="grid grid-cols-1 gap-6 mb-6 lg:grid-cols-2">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Teacher Workload</CardTitle>
                <p className="text-xs text-muted-foreground">Lessons per week, out of {WEEKLY_PERIODS} periods</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {stats.teacherLoad.map(([name, count]) => (
                  <UsageBar key={name} label={name} count={count} />
                ))}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Room Usage</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {stats.rooms > 0 ? `Periods booked per week, out of ${WEEKLY_PERIODS}` : "No rooms assigned yet"}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {stats.roomUse.map(([name, count]) => (
                  <UsageBar key={name} label={name} count={count} color="bg-emerald-500" />
                ))}
              </CardContent>
            </Card>
          </div>

          {stats.unscheduled.length > 0 && (
            <Card className="mb-6 border shadow-none border-amber-200 bg-amber-50">
              <CardContent className="p-4 text-sm text-amber-900">
                <p className="mb-1 font-semibold">
                  {stats.unscheduled.length === 1 ? "1 active teacher has" : `${stats.unscheduled.length} active teachers have`} no lessons yet
                </p>
                <p className="text-xs">{stats.unscheduled.join(", ")}</p>
              </CardContent>
            </Card>
          )}

          <TodaySchedule />
        </>
      )}
    </div>
  );
}

function UsageBar({ label, count, color = "bg-primary" }) {
  const percent = Math.min(100, Math.round((count / WEEKLY_PERIODS) * 100));
  return (
    <div>
      <div className="flex items-center justify-between mb-1 text-sm">
        <span className="font-medium truncate">{label}</span>
        <span className="text-xs text-muted-foreground shrink-0">{count} · {percent}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
