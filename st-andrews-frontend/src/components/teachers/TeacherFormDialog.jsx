import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

const SUBJECTS = ["Mathematics", "English", "Science", "Social Studies", "ICT", "Religious Education", "Creative Arts", "Physical Education", "Home Economics", "French"];

const DEFAULT_FORM = { user_email: "", full_name: "", phone: "", subjects: [], status: "Active" };

export default function TeacherFormDialog({ open, onOpenChange, teacher, onSave }) {
  const [form, setForm] = useState(DEFAULT_FORM);

  useEffect(() => {
    if (teacher) {
      setForm({ ...DEFAULT_FORM, ...teacher });
    } else {
      setForm(DEFAULT_FORM);
    }
  }, [teacher, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const toggleSubject = (subject) => {
    setForm(prev => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter(s => s !== subject)
        : [...prev.subjects, subject],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{teacher ? "Edit Teacher" : "Add New Teacher"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Full Name *</Label>
            <Input value={form.full_name} onChange={e => update("full_name", e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Email *</Label>
            <Input type="email" value={form.user_email} onChange={e => update("user_email", e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input value={form.phone} onChange={e => update("phone", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => update("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Subjects</Label>
            <div className="grid grid-cols-2 gap-2 p-3 border rounded-lg max-h-40 overflow-y-auto">
              {SUBJECTS.map(subject => (
                <label key={subject} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={form.subjects.includes(subject)} onCheckedChange={() => toggleSubject(subject)} />
                  {subject}
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">{teacher ? "Update" : "Add Teacher"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
