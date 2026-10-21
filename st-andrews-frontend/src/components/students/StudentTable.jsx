import React from "react";
import { useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, Eye } from "lucide-react";

const statusColors = {
  Active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Inactive: "bg-slate-100 text-slate-600 border-slate-200",
  Transferred: "bg-amber-50 text-amber-700 border-amber-200",
  Graduated: "bg-primary/10 text-primary border-primary/20",
};

export default function StudentTable({ students, onEdit, onDelete }) {
  const navigate = useNavigate();
  return (
    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-semibold">Name</TableHead>
            <TableHead className="font-semibold">Gender</TableHead>
            <TableHead className="font-semibold">Grade</TableHead>
            <TableHead className="font-semibold">Section</TableHead>
            <TableHead className="font-semibold">Guardian</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((student) => (
            <TableRow key={student.id} className="hover:bg-muted/30 transition-colors">
              <TableCell className="font-medium">
                {student.first_name} {student.last_name}
              </TableCell>
              <TableCell>{student.gender}</TableCell>
              <TableCell>{student.grade}</TableCell>
              <TableCell>{student.section || "—"}</TableCell>
              <TableCell className="text-muted-foreground">{student.guardian_name || "—"}</TableCell>
              <TableCell>
                <Badge variant="outline" className={statusColors[student.status] || ""}>
                  {student.status}
                </Badge>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate(`/students/${student.id}`)}>
                      <Eye className="w-4 h-4 mr-2" /> View Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(student)}>
                      <Pencil className="w-4 h-4 mr-2" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDelete(student)} className="text-destructive">
                      <Trash2 className="w-4 h-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>
    </div>
  );
}