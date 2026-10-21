import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

const statusColors = {
  Active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Inactive: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function TeacherTable({ teachers, canManage, onEdit, onDelete }) {
  return (
    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-semibold">Name</TableHead>
            <TableHead className="font-semibold">Email</TableHead>
            <TableHead className="font-semibold">Phone</TableHead>
            <TableHead className="font-semibold">Subjects</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            {canManage && <TableHead className="w-12"></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {teachers.map((teacher) => (
            <TableRow key={teacher.id} className="hover:bg-muted/30 transition-colors">
              <TableCell className="font-medium">{teacher.full_name}</TableCell>
              <TableCell className="text-muted-foreground">{teacher.user_email}</TableCell>
              <TableCell className="text-muted-foreground">{teacher.phone || "—"}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {(teacher.subjects || []).length > 0
                    ? teacher.subjects.map(s => (
                        <Badge key={s} variant="outline" className="text-xs font-normal">{s}</Badge>
                      ))
                    : <span className="text-muted-foreground">—</span>}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={statusColors[teacher.status] || ""}>
                  {teacher.status}
                </Badge>
              </TableCell>
              {canManage && (
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(teacher)}>
                        <Pencil className="w-4 h-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDelete(teacher)} className="text-destructive">
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>
    </div>
  );
}
