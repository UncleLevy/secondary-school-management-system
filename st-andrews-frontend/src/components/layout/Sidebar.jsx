import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  FileText,
  BarChart3,
  GraduationCap,
  LogOut,
  ChevronLeft,
  Menu,
  X,
  CalendarDays,
  SquareUserRound,
  MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { auth } from "@/api/apiClient";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const navItems = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Students", path: "/students", icon: Users },
  { label: "Attendance", path: "/attendance", icon: CalendarCheck },
  //{ label: "Exam Results", path: "/results", icon: FileText },
  //{ label: "Reports", path: "/reports", icon: BarChart3 },
  { label: "Timetable", path: "/timetable", icon: CalendarDays },
];

export default function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const location = useLocation();
  const { isAdmin, canManage } = useCurrentUser();

  const items = [
    ...navItems,
    ...(canManage ? [{ label: "SMS", path: "/sms", icon: MessageSquare }] : []),
    ...(isAdmin ? [{ label: "Teachers", path: "/teachers", icon: SquareUserRound }] : []),
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-screen bg-sidebar text-sidebar-foreground z-50 flex flex-col transition-all duration-300 md:translate-x-0 w-64 ${
          collapsed ? "md:w-[68px]" : "md:w-64"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Logo */}
        <div className="flex items-center h-16 gap-3 px-4 border-b border-sidebar-border shrink-0">
          <div className="flex items-center justify-center rounded-lg w-9 h-9 bg-sidebar-primary shrink-0">
            <GraduationCap className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          {(!collapsed || mobileOpen) && (
            <div className="overflow-hidden">
              <h1 className="text-sm font-bold tracking-tight truncate">St. Andrews</h1>
              <p className="text-[10px] text-sidebar-foreground/60 uppercase tracking-widest">High School</p>
            </div>
          )}
          {/* Desktop collapse toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex ml-auto text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent h-7 w-7 shrink-0"
          >
            {collapsed ? <Menu className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
          {/* Mobile close */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(false)}
            className="md:hidden ml-auto text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent h-7 w-7 shrink-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {items.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/25"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                }`}
              >
                <item.icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? "" : "group-hover:scale-110 transition-transform"}`} />
                {(!collapsed || mobileOpen) && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-sidebar-border">
          <button
            onClick={() => auth.logout()}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all w-full`}
          >
            <LogOut className="w-[18px] h-[18px] shrink-0" />
            {(!collapsed || mobileOpen) && <span>Sign Out</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
