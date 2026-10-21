import React, { useState } from "react";
import { entities } from "@/api/apiClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, Save, Download } from "lucide-react";
import { exportAttendancePDF } from "@/utils/pdfExport";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

const statusColors = {
  Present: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Absent: "bg-rose-50 text-rose-700 border-rose-200",
  Late: "bg-amber-50 text-amber-700 border-amber-200",
  Excused: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function Attendance() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedGrade, setSelectedGrade] = useState("all");
  const [attendanceMap, setAttendanceMap] = useState({});
  const [marking, setMarking] = useState(false);

  const queryClient = useQueryClient();

  const { data: students = [] } = useQuery({
    queryKey: ["students"],
    queryFn: () => entities.Student.list(),
  });

  const { data: attendanceRecords = [] } = useQuery({
    queryKey: ["attendance"],
    queryFn: () => entities.Attendance.list("-date"),
  });

  const createMutation = useMutation({
    mutationFn: (records) => entities.Attendance.bulkCreate(records),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      setAttendanceMap({});
      setMarking(false);
      toast.success("Attendance saved");
    },
    onError: (error) => toast.error(getErrorMessage(error, "Failed to save attendance")),
  });

  const activeStudents = students.filter(s => s.status === "Active");
  const filteredStudents = selectedGrade === "all"
    ? activeStudents
    : activeStudents.filter(s => s.grade === selectedGrade);

  const uniqueGrades = [...new Set(activeStudents.map(s => s.grade).filter(Boolean))].sort((a, b) =>
    parseInt(a.replace("Grade ", "")) - parseInt(b.replace("Grade ", ""))
  );

  // Check existing attendance for the selected date
  const existingForDate = attendanceRecords.filter(a => a.date === selectedDate);
  const alreadyMarkedIds = new Set(existingForDate.map(a => a.student_id));

  const handleMarkStatus = (studentId, status) => {
    setAttendanceMap(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSave = () => {
    const records = Object.entries(attendanceMap).map(([studentId, status]) => {
      const student = students.find(s => String(s.id) === studentId);
      return {
        student_id: studentId,
        student_name: `${student.first_name} ${student.last_name}`,
        grade: student.grade,
        date: selectedDate,
        status,
      };
    });
    if (records.length === 0) {
      toast.error("Please mark attendance for at least one student");
      return;
    }
    createMutation.mutate(records);
  };

  // Today's attendance stats
  const todayRecords = attendanceRecords.filter(a => a.date === selectedDate);
  const todayPresent = todayRecords.filter(a => a.status === "Present").length;
  const todayAbsent = todayRecords.filter(a => a.status === "Absent").length;

  return (
    <div>
      <PageHeader
        title="Attendance"
        description="Mark and track student attendance"
        actions={
          marking ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setMarking(false); setAttendanceMap({}); }}>Cancel</Button>
              <Button onClick={handleSave} className="gap-2" disabled={createMutation.isPending}>
                <Save className="w-4 h-4" /> Save Attendance
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => exportAttendancePDF({ attendanceRecords, selectedDate, selectedGrade })}
                disabled={attendanceRecords.filter(a => a.date === selectedDate).length === 0}
              >
                <Download className="w-4 h-4" /> Export PDF
              </Button>
              <Button onClick={() => setMarking(true)} className="gap-2">
                <CalendarCheck className="w-4 h-4" /> Mark Attendance
              </Button>
            </div>
          )
        }
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6 sm:grid-cols-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Date</p>
            <p className="mt-1 text-lg font-bold">{new Date(selectedDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Recorded</p>
            <p className="mt-1 text-lg font-bold">{todayRecords.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-emerald-600">Present</p>
            <p className="mt-1 text-lg font-bold text-emerald-600">{todayPresent}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-rose-600">Absent</p>
            <p className="mt-1 text-lg font-bold text-rose-600">{todayAbsent}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 mb-6 sm:flex-row">
        <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-[180px]" />
        <Select value={selectedGrade} onValueChange={setSelectedGrade}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Grades" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Grades</SelectItem>
            {uniqueGrades.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {marking ? (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Mark Attendance — {selectedDate}</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredStudents.length > 0 ? (
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Student</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map(student => {
                    const alreadyMarked = alreadyMarkedIds.has(student.id);
                    return (
                      <TableRow key={student.id} className={alreadyMarked ? "opacity-50" : ""}>
                        <TableCell className="font-medium">{student.first_name} {student.last_name}</TableCell>
                        <TableCell>{student.grade}</TableCell>
                        <TableCell>
                          {alreadyMarked ? (
                            <Badge variant="outline" className="bg-muted">Already marked</Badge>
                          ) : (
                            <div className="flex gap-1.5">
                              {["Present", "Absent", "Late", "Excused"].map(status => (
                                <Button
                                  key={status}
                                  size="sm"
                                  variant={attendanceMap[student.id] === status ? "default" : "outline"}
                                  className={`text-xs h-7 px-2.5 ${attendanceMap[student.id] === status ? "" : ""}`}
                                  onClick={() => handleMarkStatus(student.id, status)}
                                >
                                  {status}
                                </Button>
                              ))}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              </div>
            ) : (
              <EmptyState title="No students" description="No active students in the selected grade." />
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Attendance Records</CardTitle>
          </CardHeader>
          <CardContent>
            {todayRecords.length > 0 ? (
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Student</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todayRecords.map(record => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.student_name}</TableCell>
                      <TableCell>{record.grade}</TableCell>
                      <TableCell>{record.date}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColors[record.status]}>
                          {record.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            ) : (
              <EmptyState icon={CalendarCheck} title="No records for this date" description="Select a date or mark attendance to see records." />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}