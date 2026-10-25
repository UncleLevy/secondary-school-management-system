import React, { useMemo } from "react";
import { entities } from "@/api/apiClient";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, CalendarDays } from "lucide-react";
import { useState } from "react";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const SUBJECT_COLORS = {
  "Mathematics": "bg-blue-100 text-blue-800 border-blue-200",
  "English": "bg-purple-100 text-purple-800 border-purple-200",
  "Science": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Social Studies": "bg-amber-100 text-amber-800 border-amber-200",
  "ICT": "bg-cyan-100 text-cyan-800 border-cyan-200",
  "Religious Education": "bg-orange-100 text-orange-800 border-orange-200",
  "Creative Arts": "bg-pink-100 text-pink-800 border-pink-200",
  "Physical Education": "bg-lime-100 text-lime-800 border-lime-200",
  "Home Economics": "bg-rose-100 text-rose-800 border-rose-200",
  "French": "bg-indigo-100 text-indigo-800 border-indigo-200",
};

export default function TodaySchedule() {
  const todayIndex = new Date().getDay();
  const todayName = DAYS[todayIndex];
  const isWeekend = todayIndex === 0 || todayIndex === 6;

  // Default to Monday on weekends for display purposes
  const defaultDay = isWeekend ? "Monday" : todayName;
  const [selectedTeacher, setSelectedTeacher] = useState("all");

  const { data: slots = [] } = useQuery({
    queryKey: ["timetable"],
    queryFn: () => entities.TimetableSlot.list(),
  });

  const uniqueTeachers = useMemo(() =>
    [...new Set(slots.map(s => s.teacher_name).filter(Boolean))].sort(), [slots]);

  const todaySlots = useMemo(() =>
    slots
      .filter(s => s.day === defaultDay && (selectedTeacher === "all" || s.teacher_name === selectedTeacher))
      .sort((a, b) => a.period - b.period),
    [slots, defaultDay, selectedTeacher]
  );

  if (slots.length === 0) return null;

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-primary" />
            {isWeekend ? "Monday" : "Today"}'s Schedule
            {!isWeekend && <Badge variant="outline" className="text-xs ml-1 bg-primary/10 text-primary border-primary/20">{todayName}</Badge>}
          </CardTitle>
          <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
            <SelectTrigger className="w-[180px] h-8 text-xs">
              <SelectValue placeholder="All Teachers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teachers</SelectItem>
              {uniqueTeachers.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {todaySlots.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No classes scheduled for {defaultDay}</p>
        ) : (
          <div className="space-y-2">
            {todaySlots.map(slot => (
              <div key={slot.id} className={`flex items-center gap-3 p-2.5 rounded-lg border ${SUBJECT_COLORS[slot.subject] || "bg-slate-50 border-slate-200"}`}>
                <div className="shrink-0 text-center w-8">
                  <p className="text-xs font-bold">P{slot.period}</p>
                  {slot.start_time && <p className="text-[10px] opacity-60">{slot.start_time}</p>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{slot.subject}</p>
                  <p className="text-xs opacity-70 truncate">{slot.teacher_name} · {slot.grade}{slot.section ? `-${slot.section}` : ""}{slot.room ? ` · ${slot.room}` : ""}</p>
                </div>
                {slot.end_time && (
                  <div className="shrink-0 flex items-center gap-1 text-[10px] opacity-60">
                    <Clock className="w-3 h-3" /> {slot.start_time}–{slot.end_time}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}