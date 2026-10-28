import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/useCurrentUser";

/**
 * In-app notifications: every notification is kept in a list (the bell) and,
 * unless told otherwise, also pops out as a banner. The list is stored per user
 * in localStorage so it survives a refresh; dedupe keys stop the same event
 * from popping up again.
 */
const NotificationContext = createContext(null);
const MAX_ITEMS = 50;

const read = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
};
const write = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
};

const POP = { info: toast.info, success: toast.success, warning: toast.warning, error: toast.error };

export function NotificationProvider({ children, navigate }) {
  const { user } = useCurrentUser();
  const listKey = user ? `notifications:${user.id}` : null;
  const seenKey = user ? `notified:${user.id}` : null;
  const [items, setItems] = useState([]);

  useEffect(() => { setItems(listKey ? read(listKey, []) : []); }, [listKey]);

  const persist = useCallback((next) => {
    setItems(next);
    if (listKey) write(listKey, next);
  }, [listKey]);

  /**
   * notify({ type, title, message, link, dedupeKey, popup })
   * type: info | success | warning | error. link: app path opened by the banner button.
   */
  const notify = useCallback(({ type = "info", title, message = "", link, dedupeKey, popup = true }) => {
    if (!listKey) return;
    if (dedupeKey) {
      const seen = read(seenKey, []);
      if (seen.includes(dedupeKey)) return;
      write(seenKey, [...seen, dedupeKey].slice(-200));
    }
    const item = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, type, title, message, link, time: Date.now(), read: false };
    setItems((prev) => {
      const next = [item, ...prev].slice(0, MAX_ITEMS);
      write(listKey, next);
      return next;
    });
    if (popup) {
      POP[type](title, {
        description: message || undefined,
        duration: type === "warning" || type === "error" ? 12000 : 7000,
        action: link && navigate ? { label: "View", onClick: () => navigate(link) } : undefined,
      });
    }
  }, [listKey, seenKey, navigate]);

  const markAllRead = useCallback(() => persist(items.map((i) => ({ ...i, read: true }))), [items, persist]);
  const clearAll = useCallback(() => persist([]), [persist]);

  const value = useMemo(() => ({
    items, unread: items.filter((i) => !i.read).length, notify, markAllRead, clearAll,
  }), [items, notify, markAllRead, clearAll]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used inside NotificationProvider");
  return ctx;
}
