import React, { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Menu, GraduationCap } from "lucide-react";
import Sidebar from "./Sidebar";
import { NotificationProvider } from "@/lib/notifications";
import NotificationBell from "@/components/notifications/NotificationBell";
import NotificationFeed from "@/components/notifications/NotificationFeed";

export default function AppLayout() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <NotificationProvider navigate={navigate}>
    <NotificationFeed />
    <div className="min-h-screen bg-background">
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center h-14 gap-3 px-4 border-b bg-background/95 backdrop-blur md:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="flex items-center justify-center w-9 h-9 -ml-1.5 rounded-lg text-foreground hover:bg-muted transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary shrink-0">
            <GraduationCap className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-bold tracking-tight">Timetable</span>
        </div>
        <div className="ml-auto"><NotificationBell /></div>
      </header>

      <main className={`transition-all duration-300 ${collapsed ? "md:ml-[68px]" : "md:ml-64"}`}>
        <div className="p-4 sm:p-6 md:p-8 max-w-[1400px] mx-auto">
          <div className="justify-end hidden mb-2 md:flex"><NotificationBell /></div>
          <Outlet />
        </div>
      </main>
    </div>
    </NotificationProvider>
  );
}
