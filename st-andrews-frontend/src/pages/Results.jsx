import React, { useState } from "react";
import { entities } from "@/api/apiClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import Loader from "@/components/shared/Loader";

const subjects = ["Mathematics", "English", "Science", "Social Studies", "ICT", "Religious Education", "Creative Arts", "Physical Education", "Home Economics", "French"];
const terms = ["Term 1", "Term 2", "Term 3"];

function getGradeLetter(score) {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 75) return "B+";
  if (score >= 70) return "B";
  if (score >= 65) return "C+";
  if (score >= 60) return "C";
  if (score >= 50) return "D";
  if (score >= 40) return "E";
  return "F";
}

const gradeColors = {
  "A+": "bg-emerald-50 text-emerald-700",
  "A": "bg-emerald-50 text-emerald-700",
  "B+": "bg-primary/10 text-primary",
  "B": "bg-primary/10 text-primary",
  "C+": "bg-amber-50 text-amber-700",
  "C": "bg-amber-50 text-amber-700",
  "D": "bg-orange-50 text-orange-700",
  "E": "bg-rose-50 text-rose-600",
  "F": "bg-rose-100 text-rose-700",
};

export default function Results() {
  const [formOpen, setFormOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [termFilter, setTermFilter] = useState("all");
  const [form, setForm] = useState({
    student_id: "", subject: "", score: "", term: "Term 1", year: 2026, remarks: ""
  });

  const queryClient = useQueryClient();

  const { data: students = [] } = useQuery({
    queryKey: ["students"],
    queryFn: () => entities.Student.list(),
  });

  const { data: results = [], isLoading } = useQuery({
    queryKey: ["results"],
    queryFn: () => entities.ExamResult.list("-created_at"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => entities.ExamResult.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["results"] });
      setFormOpen(false);
      setForm({ student_id: "", subject: "", score: "", term: "Term 1", year: 2026, remarks: "" });
      toast.success("Result recorded");
    },
    onError: (error) => toast.error(getErrorMessage(error, "Failed to record result")),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const student = students.find(s => String(s.id) === String(form.student_id));
    if (!student) return toast.error("Please select a student");
    const score = Number(form.score);
    if (isNaN(score) || score < 0 || score > 100) return toast.error("Score must be 0-100");

    createMutation.mutate({
      ...form,
      score,
      student_name: `${student.first_name} ${student.last_name}`,
      grade: student.grade,
      grade_letter: getGradeLetter(score),
    });
  };

  const filtered = results.filter(r => {
    const matchSearch = r.student_name?.toLowerCase().includes(search.toLowerCase());
    const matchSubject = subjectFilter === "all" || r.subject === subjectFilter;
    const matchTerm = termFilter === "all" || r.term === termFilter;
    return matchSearch && matchSubject && matchTerm;
  });

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  if (isLoading) {
    return <Loader label="Loading exam results…" />;
  }

  return (
    <div>
      <PageHeader
        title="Exam Results"
        description="Record and view student examination scores"
        actions={
          <Button onClick={() => setFormOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Add Result
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col gap-3 mb-6 sm:flex-row">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute w-4 h-4 -translate-y-1/2 left-3 top-1/2 text-muted-foreground" />
          <Input placeholder="Search by student..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={subjectFilter} onValueChange={setSubjectFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Subject" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={termFilter} onValueChange={setTermFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Term" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Terms</SelectItem>
            {terms.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Results Table */}
      {filtered.length > 0 ? (
        <Card className="overflow-hidden border-0 shadow-sm">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Student</TableHead>
                <TableHead className="font-semibold">Grade</TableHead>
                <TableHead className="font-semibold">Subject</TableHead>
                <TableHead className="font-semibold">Term</TableHead>
                <TableHead className="font-semibold">Score</TableHead>
                <TableHead className="font-semibold">Grade</TableHead>
                <TableHead className="font-semibold">Remarks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(r => (
                <TableRow key={r.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium">{r.student_name}</TableCell>
                  <TableCell>{r.grade}</TableCell>
                  <TableCell>{r.subject}</TableCell>
                  <TableCell>{r.term}</TableCell>
                  <TableCell className="font-semibold">{r.score}%</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={gradeColors[r.grade_letter] || ""}>
                      {r.grade_letter}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.remarks || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </Card>
      ) : (
        <EmptyState icon={FileText} title="No results found" description="Add exam results to start tracking academic performance." />
      )}

      {/* Add Result Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Exam Result</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="mt-2 space-y-4">
            <div className="space-y-1.5">
              <Label>Student *</Label>
              <Select value={form.student_id} onValueChange={v => update("student_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                <SelectContent>
                  {students.filter(s => s.status === "Active").map(s => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.first_name} {s.last_name} — {s.grade}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Subject *</Label>
              <Select value={form.subject} onValueChange={v => update("subject", v)}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Score (0-100) *</Label>
                <Input type="number" min={0} max={100} value={form.score} onChange={e => update("score", e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Term *</Label>
                <Select value={form.term} onValueChange={v => update("term", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {terms.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Year</Label>
              <Input type="number" value={form.year} onChange={e => update("year", Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>Remarks</Label>
              <Input value={form.remarks} onChange={e => update("remarks", e.target.value)} placeholder="Optional teacher remarks" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>Save Result</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}