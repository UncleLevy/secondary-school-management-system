import React, { useState, useMemo, useEffect } from "react";
import { entities } from "@/api/apiClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, CalendarDays, AlertCircle, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";
import PageHeader from "@/components/shared/PageHeader";
import Loader from "@/components/shared/Loader";
import { SCHOOL_DAYS, PERIODS } from "@/lib/timetable";

const DAYS = SCHOOL_DAYS;

const SUBJECTS = [
  "Mathematics", "English", "Science", "Social Studies", "ICT",
  "Religious Education", "Creative Arts", "Physical Education", "Home Economics", "French",
];

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

const CLASH_LABELS = {
  teacher: { icon: "👤", label: "Teacher" },
  room: { icon: "🏫", label: "Room" },
  class: { icon: "👥", label: "Class" },
};

const DEFAULT_FORM = {
  day: "Monday", period: 1, subject: "", teacher_name: "",
  grade: "", section: "", room: "",
};

export default function Timetable() {
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "teacher"
  const [filterGrade, setFilterGrade] = useState("all");
  const [filterSection, setFilterSection] = useState("all");
  const [filterTeacher, setFilterTeacher] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [conflicts, setConflicts] = useState([]);

  const queryClient = useQueryClient();

  const { data: slots = [], isLoading } = useQuery({
    queryKey: ["timetable"],
    queryFn: () => entities.TimetableSlot.list(),
  });

  const { data: students = [] } = useQuery({
    queryKey: ["students"],
    queryFn: () => entities.Student.list(),
  });

  const uniqueGrades = useMemo(() =>
    [...new Set(students.map(s => s.grade).filter(Boolean))].sort((a, b) =>
      parseInt(a.replace("Grade ", "")) - parseInt(b.replace("Grade ", ""))
    ), [students]);

  const uniqueSections = useMemo(() =>
    [...new Set(students.map(s => s.section).filter(Boolean))].sort(), [students]);

  const uniqueTeachers = useMemo(() =>
    [...new Set(slots.map(s => s.teacher_name).filter(Boolean))].sort(), [slots]);

  // Clashes already present in the saved timetable (teacher, room or class double-booked).
  const { data: clashData } = useQuery({
    queryKey: ["timetable-clashes"],
    queryFn: () => entities.TimetableSlot.clashes(),
  });
  const allConflicts = clashData?.clashes ?? [];

  const refreshTimetable = () => {
    queryClient.invalidateQueries({ queryKey: ["timetable"] });
    queryClient.invalidateQueries({ queryKey: ["timetable-clashes"] });
  };

  const createMutation = useMutation({
    mutationFn: (data) => entities.TimetableSlot.create(data),
    onSuccess: () => { refreshTimetable(); setDialogOpen(false); toast.success("Slot created"); },
    onError: (error) => toast.error(getErrorMessage(error, "Failed to create slot")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => entities.TimetableSlot.update(id, data),
    onSuccess: () => { refreshTimetable(); setDialogOpen(false); setEditingSlot(null); toast.success("Slot updated"); },
    onError: (error) => toast.error(getErrorMessage(error, "Failed to update slot")),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => entities.TimetableSlot.delete(id),
    onSuccess: () => { refreshTimetable(); toast.success("Slot removed"); },
    onError: (error) => toast.error(getErrorMessage(error, "Failed to remove slot")),
  });

  const isSlotConflicted = (slot) => allConflicts.some(c => c.slot_ids.includes(slot.id));

  // Live warning: as the form changes, ask the backend whether this slot would clash.
  useEffect(() => {
    if (!dialogOpen) return;
    const { day, period, teacher_name, room, grade, section } = form;
    const timer = setTimeout(() => {
      entities.TimetableSlot.checkClash({ id: editingSlot?.id, day, period, teacher_name, room, grade, section })
        .then(res => setConflicts(res.clashes))
        .catch(() => setConflicts([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [dialogOpen, editingSlot, form.day, form.period, form.teacher_name, form.room, form.grade, form.section]);

  const openCreate = (day, period) => {
    const p = PERIODS.find(p => p.period === period);
    setEditingSlot(null);
    setForm({ ...DEFAULT_FORM, day, period, start_time: p?.start || "", end_time: p?.end || "" });
    setConflicts([]);
    setDialogOpen(true);
  };

  const openEdit = (slot) => {
    setEditingSlot(slot);
    setForm({ day: slot.day, period: slot.period, subject: slot.subject, teacher_name: slot.teacher_name, grade: slot.grade, section: slot.section || "", room: slot.room || "", start_time: slot.start_time || "", end_time: slot.end_time || "" });
    setConflicts([]);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.subject || !form.teacher_name || !form.grade) {
      toast.error("Subject, teacher, and grade are required");
      return;
    }
    if (conflicts.length > 0) {
      toast.error("Resolve the clash before saving this slot");
      return;
    }
    const p = PERIODS.find(p => p.period === form.period);
    const payload = { ...form, start_time: form.start_time || p?.start, end_time: form.end_time || p?.end };
    if (editingSlot) {
      updateMutation.mutate({ id: editingSlot.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  // Filtered view slots
  const viewSlots = useMemo(() => slots.filter(s => {
    if (viewMode === "teacher" && filterTeacher !== "all") return s.teacher_name === filterTeacher;
    if (filterGrade !== "all" && s.grade !== filterGrade) return false;
    if (filterSection !== "all" && s.section !== filterSection) return false;
    return true;
  }), [slots, filterGrade, filterSection, filterTeacher, viewMode]);

  const getCell = (day, period) => viewSlots.find(s => s.day === day && s.period === period);

  if (isLoading) return <Loader label="Loading timetable…" />;

  return (
    <div>
      <PageHeader
        title="Class Timetable"
        description={`${slots.length} scheduled slots · ${allConflicts.length > 0 ? `${allConflicts.length} conflict(s) detected` : "No conflicts"}`}
        actions={
          <div className="flex items-center gap-2">
            {allConflicts.length > 0 && (
              <Badge variant="outline" className="gap-1 bg-rose-50 text-rose-700 border-rose-200">
                <AlertCircle className="w-3 h-3" /> {allConflicts.length} Conflict{allConflicts.length > 1 ? "s" : ""}
              </Badge>
            )}
            <Button onClick={() => openCreate("Monday", 1)} className="gap-2">
              <Plus className="w-4 h-4" /> Add Slot
            </Button>
          </div>
        }
      />

      {/* View toggle + filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex overflow-hidden border rounded-lg">
          <button
            className={`px-4 py-2 text-sm font-medium transition-colors ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
            onClick={() => setViewMode("grid")}
          >Grid View</button>
          <button
            className={`px-4 py-2 text-sm font-medium transition-colors ${viewMode === "teacher" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
            onClick={() => setViewMode("teacher")}
          >Teacher View</button>
        </div>

        {viewMode === "grid" ? (
          <>
            <Select value={filterGrade} onValueChange={setFilterGrade}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="All Grades" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Grades</SelectItem>
                {uniqueGrades.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterSection} onValueChange={setFilterSection}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="All Sections" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sections</SelectItem>
                {uniqueSections.map(s => <SelectItem key={s} value={s}>Section {s}</SelectItem>)}
              </SelectContent>
            </Select>
          </>
        ) : (
          <Select value={filterTeacher} onValueChange={setFilterTeacher}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Select Teacher" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teachers</SelectItem>
              {uniqueTeachers.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Conflict Alerts */}
      {allConflicts.length > 0 && (
        <Card className="mb-6 border shadow-none border-rose-200 bg-rose-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
              <div>
                <p className="mb-1 text-sm font-semibold text-rose-800">Scheduling Conflicts Detected</p>
                <ul className="space-y-0.5">
                  {allConflicts.map((c, i) => (
                    <li key={i} className="text-xs text-rose-700">
                      {CLASH_LABELS[c.type].icon} {CLASH_LABELS[c.type].label} <strong>{c.name}</strong> is double-booked on <strong>{c.day}</strong>, Period <strong>{c.period}</strong>
                      {" "}({c.slots.map(s => s.subject).join(" and ")})
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timetable Grid */}
      <Card className="overflow-hidden border-0 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse">
            <thead>
              <tr className="bg-primary">
                <th className="px-3 py-3 text-xs font-semibold tracking-wide text-left uppercase w-28 text-white/80">Period</th>
                {DAYS.map(day => (
                  <th key={day} className="px-3 py-3 text-xs font-semibold tracking-wide text-left text-white uppercase">{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERIODS.map((p, pIdx) => (
                <tr key={p.period} className={pIdx % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                  <td className="px-3 py-2 border-r border-border">
                    <p className="text-xs font-bold text-foreground">P{p.period}</p>
                    <p className="text-[10px] text-muted-foreground">{p.start}–{p.end}</p>
                  </td>
                  {DAYS.map(day => {
                    const slot = getCell(day, p.period);
                    const conflicted = slot && isSlotConflicted(slot);
                    return (
                      <td key={day} className="px-2 py-2 border-r border-border align-top min-w-[120px]">
                        {slot ? (
                          <div
                            className={`rounded-lg border p-2 group relative cursor-pointer transition-all hover:shadow-md ${conflicted ? "border-rose-300 bg-rose-50 ring-1 ring-rose-400" : (SUBJECT_COLORS[slot.subject] || "bg-slate-100 text-slate-800 border-slate-200")}`}
                            onClick={() => openEdit(slot)}
                          >
                            {conflicted && <AlertCircle className="absolute w-3 h-3 text-rose-500 top-1 right-1" />}
                            <p className="text-xs font-bold leading-tight truncate">{slot.subject}</p>
                            <p className="text-[10px] mt-0.5 opacity-75 truncate">{slot.teacher_name}</p>
                            {(slot.grade || slot.room) && (
                              <p className="text-[10px] opacity-60 truncate">{slot.grade}{slot.section ? `-${slot.section}` : ""}{slot.room ? ` · ${slot.room}` : ""}</p>
                            )}
                            <button
                              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-rose-100"
                              onClick={e => { e.stopPropagation(); deleteMutation.mutate(slot.id); }}
                            >
                              <X className="w-3 h-3 text-rose-500" />
                            </button>
                          </div>
                        ) : (
                          <button
                            className="w-full h-full min-h-[52px] rounded-lg border border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors flex items-center justify-center group"
                            onClick={() => openCreate(day, p.period)}
                          >
                            <Plus className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Slot Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setConflicts([]); setEditingSlot(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSlot ? "Edit Timetable Slot" : "Add Timetable Slot"}</DialogTitle>
          </DialogHeader>

          {conflicts.length > 0 && (
            <div className="p-3 border rounded-lg border-amber-300 bg-amber-50" role="alert">
              <p className="flex items-center gap-1 mb-1 text-xs font-semibold text-amber-900">
                <AlertCircle className="w-3.5 h-3.5" /> Clash warning — change the slot to save it
              </p>
              {conflicts.map((c, i) => (
                <p key={i} className="text-xs text-amber-800">{c.message}</p>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Day</Label>
              <Select value={form.day} onValueChange={v => setForm(f => ({ ...f, day: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Period</Label>
              <Select value={String(form.period)} onValueChange={v => {
                const p = PERIODS.find(p => p.period === Number(v));
                setForm(f => ({ ...f, period: Number(v), start_time: p?.start || f.start_time, end_time: p?.end || f.end_time }));
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PERIODS.map(p => (
                    <SelectItem key={p.period} value={String(p.period)}>P{p.period} ({p.start}–{p.end})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Subject <span className="text-rose-500">*</span></Label>
              <Select value={form.subject} onValueChange={v => setForm(f => ({ ...f, subject: v }))}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>{SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Teacher Name <span className="text-rose-500">*</span></Label>
              <Input placeholder="e.g. Mr. John Banda" value={form.teacher_name} onChange={e => setForm(f => ({ ...f, teacher_name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Grade <span className="text-rose-500">*</span></Label>
              <Select value={form.grade} onValueChange={v => setForm(f => ({ ...f, grade: v }))}>
                <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                <SelectContent>
                  {uniqueGrades.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  <SelectItem value="Grade 1">Grade 1</SelectItem>
                  <SelectItem value="Grade 2">Grade 2</SelectItem>
                  <SelectItem value="Grade 3">Grade 3</SelectItem>
                  <SelectItem value="Grade 4">Grade 4</SelectItem>
                  <SelectItem value="Grade 5">Grade 5</SelectItem>
                  <SelectItem value="Grade 6">Grade 6</SelectItem>
                  <SelectItem value="Grade 7">Grade 7</SelectItem>
                  <SelectItem value="Grade 8">Grade 8</SelectItem>
                  <SelectItem value="Grade 9">Grade 9</SelectItem>
                  <SelectItem value="Grade 10">Grade 10</SelectItem>
                  <SelectItem value="Grade 11">Grade 11</SelectItem>
                  <SelectItem value="Grade 12">Grade 12</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Section</Label>
              <Select value={form.section || "none"} onValueChange={v => setForm(f => ({ ...f, section: v === "none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {["A", "B", "C", "D"].map(s => <SelectItem key={s} value={s}>Section {s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Room / Venue</Label>
              <Input placeholder="e.g. Room 12, Lab 2, Hall" value={form.room} onChange={e => setForm(f => ({ ...f, room: e.target.value }))} />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} className="gap-2" disabled={createMutation.isPending || updateMutation.isPending || conflicts.length > 0}>
              <Check className="w-4 h-4" /> {editingSlot ? "Update" : "Create"} Slot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}