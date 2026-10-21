import React, { useState } from "react";
import { entities } from "@/api/apiClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import Loader from "@/components/shared/Loader";
import TeacherFormDialog from "@/components/teachers/TeacherFormDialog";
import TeacherTable from "@/components/teachers/TeacherTable";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export default function Teachers() {
  const { user, isLoading: loadingUser } = useCurrentUser();
  const [formOpen, setFormOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch] = useState("");

  const queryClient = useQueryClient();

  const { data: teachers = [], isLoading } = useQuery({
    queryKey: ["teachers"],
    queryFn: () => entities.Teacher.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => entities.Teacher.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      setFormOpen(false);
      toast.success("Teacher added successfully");
    },
    onError: () => toast.error("Failed to save teacher"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => entities.Teacher.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      setFormOpen(false);
      setEditingTeacher(null);
      toast.success("Teacher updated");
    },
    onError: () => toast.error("Failed to update teacher"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => entities.Teacher.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      setDeleteTarget(null);
      toast.success("Teacher removed");
    },
    onError: () => toast.error("Failed to delete teacher"),
  });

  const handleSave = (formData) => {
    if (editingTeacher) {
      updateMutation.mutate({ id: editingTeacher.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (teacher) => {
    setEditingTeacher(teacher);
    setFormOpen(true);
  };

  const filtered = teachers.filter(t =>
    t.full_name.toLowerCase().includes(search.toLowerCase()) ||
    t.user_email.toLowerCase().includes(search.toLowerCase())
  );

  if (loadingUser || isLoading) {
    return <Loader label="Loading teachers…" />;
  }

  const canManage = user?.role === "admin";

  if (!canManage) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Admins only"
        description="The Teachers directory is only accessible to admin accounts."
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Teachers"
        description={`${teachers.length} teachers on staff`}
        actions={
          <Button onClick={() => { setEditingTeacher(null); setFormOpen(true); }} className="gap-2">
            <Plus className="w-4 h-4" /> Add Teacher
          </Button>
        }
      />

      <div className="flex flex-col gap-3 mb-6 sm:flex-row">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute w-4 h-4 -translate-y-1/2 left-3 top-1/2 text-muted-foreground" />
          <Input placeholder="Search teachers..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {filtered.length > 0 ? (
        <TeacherTable teachers={filtered} canManage={canManage} onEdit={handleEdit} onDelete={setDeleteTarget} />
      ) : (
        <EmptyState title="No teachers found" description="Add your first teacher to get started." />
      )}

      <TeacherFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        teacher={editingTeacher}
        onSave={handleSave}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Teacher</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {deleteTarget?.full_name}? This action cannot be undone.
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
