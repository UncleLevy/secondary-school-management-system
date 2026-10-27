import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Clock, School, AlertTriangle, BookOpen, UserX } from "lucide-react";
import { entities } from "@/api/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import StatCard from "@/components/dashboard/StatCard";
import PageHeader from "@/components/shared/PageHeader";
import Loader from "@/components/shared/Loader";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { SCHOOL_DAYS, PERIODS, WEEKLY_PERIODS, classLabel } from "@/lib/timetable";

const JS_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const toMinutes = (hhmm) => {
  const [h, m] = (hhmm || "").split(":").map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
};
const periodTimes = (slot) => {
  const p = PERIODS.find((x) => x.period === slot.period);
  return { start: slot.start_time || p?.start, end: slot.end_time || p?.end };
};

export default function TeacherDashboard() {
  const { user } = useCurrentUser();
  const { data, isLoading } = useQuery({
    queryKey: ["my-schedule"],
    queryFn: () => entities.TimetableSlot.mySchedule(),
  });

  const slots = data?.slots ?? [];
  const clashes = data?.clashes ?? [];
  const now = new Date();
  const today = JS_DAYS[now.getDay()];
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const view = useMemo(() => {
    const todays = slots.filter((s) => s.day === today).sort((a, b) => a.period - b.period);
    const next = todays.find((s) => {
      const end = toMinutes(periodTimes(s).end);
      return end !== null && end > nowMinutes;
    });
    const subjects = {};
    slots.forEach((s) => { subjects[s.subject] = (subjects[s.subject] || 0) + 1; });
    const perDay = SCHOOL_DAYS.map((d) => ({ day: d, count: slots.filter((s) => s.day === d).length }));
    return {
      todays,
      next,
      classes: new Set(slots.map(classLabel)).size,
      subjects: Object.entries(subjects).sort(([, a], [, b]) => b - a),
      perDay,
      free: WEEKLY_PERIODS - slots.length,
    };
  }, [slots, today, nowMinutes]);

  if (isLoading) return <Loader label="Loading your timetable…" />;

  const firstName = (data?.teacher?.full_name || user?.full_name || "").split(" ")[0];

  if (data && !data.linked) {
    return (
      <div>
        <PageHeader title="My Dashboard" description={`Welcome${firstName ? `, ${firstName}` : ""}`} />
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16 text-center">
            <UserX className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="font-semibold">Your account isn't linked to a teacher profile</p>
            <p className="max-w-md mx-auto mt-1 mb-4 text-sm text-muted-foreground">
              Ask the administrator to add you on the Teachers page using the same email address as your login
              ({user?.email || "no email on your account"}). Your lessons will then appear here.
            </p>
            <Button asChild variant="outline"><Link to="/timetable">View the school timetable</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="My Dashboard"
        description={`Welcome${firstName ? `, ${firstName}` : ""} · your personal teaching schedule`}
        actions={
          <Button asChild className="gap-2">
            <Link to="/timetable"><CalendarDays className="w-4 h-4" /> Full Timetable</Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="My Lessons per Week" value={slots.length} icon={CalendarDays} color="blue" />
        <StatCard title="Lessons Today" value={view.todays.length} icon={Clock} color="green" />
        <StatCard title="Classes I Teach" value={view.classes} icon={School} color="amber" />
        <StatCard title="Free Periods per Week" value={view.free} icon={BookOpen} color="blue" />
      </div>

      {clashes.length > 0 && (
        <Card className="mb-6 border shadow-none border-rose-200 bg-rose-50">
          <CardContent className="flex items-start gap-2 p-4">
            <AlertTriangle className="w-4 h-4 mt-0.5 text-rose-600 shrink-0" />
            <div>
              <p className="mb-1 text-sm font-semibold text-rose-800">
                You are double-booked in {clashes.length === 1 ? "1 period" : `${clashes.length} periods`}
              </p>
              <ul className="space-y-0.5">
                {clashes.map((c, i) => (
                  <li key={i} className="text-xs text-rose-700">
                    {c.day}, Period {c.period}: {c.slots.map((s) => `${s.subject} (${classLabel(s)})`).join(" and ")}
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-xs text-rose-700">Please tell the administrator so it can be corrected.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {slots.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16 text-center">
            <CalendarDays className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="font-semibold">No lessons assigned to you yet</p>
            <p className="mt-1 text-sm text-muted-foreground">They will appear here once the administrator adds them to the timetable.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 mb-6 lg:grid-cols-3">
            <Card className="border-0 shadow-sm lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Clock className="w-4 h-4 text-primary" /> Today
                  <Badge variant="outline" className="ml-1 text-xs bg-primary/10 text-primary border-primary/20">{today}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {view.next && (
                  <div className="p-3 mb-3 border rounded-lg border-primary/30 bg-primary/5">
                    <p className="text-[11px] uppercase tracking-wide text-primary font-semibold">Next lesson</p>
                    <p className="text-sm font-semibold">
                      {view.next.subject} · {classLabel(view.next)}{view.next.room ? ` · ${view.next.room}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Period {view.next.period}, {periodTimes(view.next).start}–{periodTimes(view.next).end}
                    </p>
                  </div>
                )}
                {view.todays.length === 0 ? (
                  <p className="py-6 text-sm text-center text-muted-foreground">
                    {SCHOOL_DAYS.includes(today) ? "You have no lessons today." : "It's the weekend. See your week below."}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {view.todays.map((s) => {
                      const t = periodTimes(s);
                      const over = toMinutes(t.end) !== null && toMinutes(t.end) <= nowMinutes;
                      return (
                        <div key={s.id} className={`flex items-center gap-3 p-2.5 rounded-lg border ${over ? "opacity-50" : ""}`}>
                          <div className="w-10 text-center shrink-0">
                            <p className="text-xs font-bold">P{s.period}</p>
                            <p className="text-[10px] text-muted-foreground">{t.start}</p>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{s.subject}</p>
                            <p className="text-xs truncate text-muted-foreground">{classLabel(s)}{s.room ? ` · ${s.room}` : ""}</p>
                          </div>
                          <span className="text-[10px] text-muted-foreground shrink-0">{t.start}–{t.end}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">My Subjects</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {view.subjects.map(([name, count]) => (
                  <div key={name}>
                    <div className="flex justify-between mb-1 text-sm">
                      <span className="font-medium truncate">{name}</span>
                      <span className="text-xs text-muted-foreground">{count} / wk</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round((count / slots.length) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">My Week</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-xs border-separate border-spacing-1 min-w-[640px]">
                <thead>
                  <tr>
                    <th className="w-20 p-1 text-left text-muted-foreground">Period</th>
                    {SCHOOL_DAYS.map((d) => (
                      <th key={d} className={`p-1 text-left ${d === today ? "text-primary" : "text-muted-foreground"}`}>{d.slice(0, 3)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PERIODS.map((p) => (
                    <tr key={p.period}>
                      <td className="p-1 align-top text-muted-foreground">
                        P{p.period}<br /><span className="text-[10px]">{p.start}</span>
                      </td>
                      {SCHOOL_DAYS.map((d) => {
                        const mine = slots.filter((s) => s.day === d && s.period === p.period);
                        return (
                          <td key={d} className={`p-1 rounded align-top h-12 ${mine.length ? (mine.length > 1 ? "bg-rose-100" : "bg-primary/10") : "bg-muted/40"} ${d === today ? "ring-1 ring-primary/30" : ""}`}>
                            {mine.map((s) => (
                              <div key={s.id}>
                                <p className="font-semibold truncate">{s.subject}</p>
                                <p className="truncate text-muted-foreground">{classLabel(s)}{s.room ? ` · ${s.room}` : ""}</p>
                              </div>
                            ))}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
