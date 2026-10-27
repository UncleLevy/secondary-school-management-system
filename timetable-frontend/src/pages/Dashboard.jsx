import React from "react";
import Loader from "@/components/shared/Loader";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import AdminDashboard from "@/components/dashboard/AdminDashboard";
import TeacherDashboard from "@/components/dashboard/TeacherDashboard";

// Admin and management see the school-wide overview; teachers see their own schedule.
export default function Dashboard() {
  const { user, isLoading } = useCurrentUser();
  if (isLoading) return <Loader label="Loading dashboard…" />;
  return user?.role === "teacher" ? <TeacherDashboard /> : <AdminDashboard />;
}
