import React from "react";
import { useNavigate } from "react-router-dom";
import { Bell, AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/lib/notifications";

const ICONS = {
  info: { icon: Info, className: "text-blue-600" },
  success: { icon: CheckCircle2, className: "text-emerald-600" },
  warning: { icon: AlertTriangle, className: "text-amber-600" },
  error: { icon: XCircle, className: "text-rose-600" },
};

const ago = (time) => {
  const mins = Math.round((Date.now() - time) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return new Date(time).toLocaleDateString();
};

export default function NotificationBell() {
  const { items, unread, markAllRead, clearAll } = useNotifications();
  const navigate = useNavigate();

  return (
    <Popover onOpenChange={(open) => { if (!open && unread) markAllRead(); }}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}>
          <Bell className="w-5 h-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[340px] p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <p className="text-sm font-semibold">Notifications</p>
          {items.length > 0 && (
            <button onClick={clearAll} className="text-xs text-muted-foreground hover:text-foreground">Clear all</button>
          )}
        </div>
        <div className="max-h-[360px] overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-4 py-8 text-sm text-center text-muted-foreground">You're all caught up.</p>
          ) : items.map((n) => {
            const { icon: Icon, className } = ICONS[n.type] || ICONS.info;
            return (
              <button
                key={n.id}
                onClick={() => n.link && navigate(n.link)}
                className={`flex w-full gap-3 px-4 py-3 text-left border-b last:border-0 hover:bg-muted/50 ${n.read ? "" : "bg-primary/5"}`}
              >
                <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${className}`} />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{n.title}</span>
                  {n.message && <span className="block text-xs text-muted-foreground">{n.message}</span>}
                  <span className="block text-[11px] text-muted-foreground/70 mt-0.5">{ago(n.time)}</span>
                </span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
