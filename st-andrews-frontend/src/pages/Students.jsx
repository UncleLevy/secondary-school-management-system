import React, { useState } from "react";
import { entities } from "@/api/apiClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import Loader from "@/components/shared/Loader";
import StudentFormDialog from "@/components/students/StudentFormDialog";
import StudentTable from "@/components/students/StudentTable";

export default function Students() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");

  const queryClient = useQueryClient();

  const { data: students = [], isLoading } = useQuery({
    queryKey: ["students"],
    queryFn: () => entities.Student.list("-created_at"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => entities.Student.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      setFormOpen(false);
      toast.success("Student registered successfully");
    },
    onError: (error) => toast.error(getErrorMessage(error, "Failed to register student")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => entities.Student.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      setFormOpen(false);
      setEditingStudent(null);
      toast.success("Student updated");
    },
    onError: (error) => toast.error(getErrorMessage(error, "Failed to update student")),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => entities.Student.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      setDeleteTarget(null);
      toast.success("Student removed");
    },
    onError: (error) => toast.error(getErrorMessage(error, "Failed to delete student")),
  });

  const handleSave = (formData) => {
    if (editingStudent) {
      updateMutation.mutate({ id: editingStudent.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (student) => {
    setEditingStudent(student);
    setFormOpen(true);
  };

  const filtered = students.filter(s => {
    const matchSearch = `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase());
    const matchGrade = gradeFilter === "all" || s.grade === gradeFilter;
    return matchSearch && matchGrade;
  });

  const uniqueGrades = [...new Set(students.map(s => s.grade).filter(Boolean))].sort((a, b) => {
    return parseInt(a.replace("Grade ", "")) - parseInt(b.replace("Grade ", ""));
  });

  if (isLoading) {
    return <Loader label="Loading students…" />;
  }

  return (
    <div>
      <PageHeader
        title="Students"
        description={`${students.length} students enrolled`}
        actions={
          <Button onClick={() => { setEditingStudent(null); setFormOpen(true); }} className="gap-2">
            <Plus className="w-4 h-4" /> Add Student
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col gap-3 mb-6 sm:flex-row">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute w-4 h-4 -translate-y-1/2 left-3 top-1/2 text-muted-foreground" />
          <Input placeholder="Search students..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={gradeFilter} onValueChange={setGradeFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Grades" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Grades</SelectItem>
            {uniqueGrades.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length > 0 ? (
        <StudentTable students={filtered} onEdit={handleEdit} onDelete={setDeleteTarget} />
      ) : (
        <EmptyState title="No students found" description="Register your first student to get started." />
      )}

      <StudentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        student={editingStudent}
        onSave={handleSave}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Student</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {deleteTarget?.first_name} {deleteTarget?.last_name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deleteTarget.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}