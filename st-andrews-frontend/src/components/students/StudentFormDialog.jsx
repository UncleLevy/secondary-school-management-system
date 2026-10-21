import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const grades = ["Grade 1","Grade 2","Grade 3","Grade 4","Grade 5","Grade 6","Grade 7","Grade 8","Grade 9","Grade 10","Grade 11","Grade 12"];
const sections = ["A", "B", "C", "D"];

export default function StudentFormDialog({ open, onOpenChange, student, onSave }) {
  const [form, setForm] = useState({
    first_name: "", last_name: "", gender: "", date_of_birth: "", grade: "",
    section: "", guardian_name: "", guardian_phone: "", address: "",
    enrollment_date: new Date().toISOString().split("T")[0], status: "Active"
  });

  useEffect(() => {
    if (student) {
      setForm({ ...student });
    } else {
      setForm({
        first_name: "", last_name: "", gender: "", date_of_birth: "", grade: "",
        section: "", guardian_name: "", guardian_phone: "", address: "",
        enrollment_date: new Date().toISOString().split("T")[0], status: "Active"
      });
    }
  }, [student, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...form,
      date_of_birth: form.date_of_birth || null,
      enrollment_date: form.enrollment_date || null,
    });
  };

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{student ? "Edit Student" : "Register New Student"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>First Name *</Label>
              <Input value={form.first_name} onChange={e => update("first_name", e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Last Name *</Label>
              <Input value={form.last_name} onChange={e => update("last_name", e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Gender *</Label>
              <Select value={form.gender} onValueChange={v => update("gender", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Date of Birth</Label>
              <Input type="date" value={form.date_of_birth} onChange={e => update("date_of_birth", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Grade *</Label>
              <Select value={form.grade} onValueChange={v => update("grade", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {grades.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Section</Label>
              <Select value={form.section} onValueChange={v => update("section", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {sections.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Guardian Name</Label>
            <Input value={form.guardian_name} onChange={e => update("guardian_name", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Guardian Phone</Label>
            <Input value={form.guardian_phone} onChange={e => update("guardian_phone", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Address</Label>
            <Textarea value={form.address} onChange={e => update("address", e.target.value)} rows={2} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">{student ? "Update" : "Register"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}