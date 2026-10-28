import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { entities } from "@/api/apiClient";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useNotifications } from "@/lib/notifications";
import { PERIODS, SCHOOL_DAYS, classLabel } from "@/lib/timetable";

const POLL_MS = 60_000;
const REMINDER_MINUTES = 10;
const JS_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const clashKey = (c) => `${c.type}|${c.name}|${c.day}|${c.period}`;
const clashText = (c) => `${c.type === "class" ? "Class" : c.type === "room" ? "Room" : "Teacher"} ${c.name} is double-booked on ${c.day}, Period ${c.period}`;
const dateStamp = (d = new Date()) => d.toISOString().slice(0, 10);
const toMinutes = (hhmm) => {
  const [h, m] = (hhmm || "").split(":").map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
};
// One id per browser tab session, so the clash summary pops up once per sign-in, not on every refresh.
const sessionId = () => {
  try {
    let id = sessionStorage.getItem("session-id");
    if (!id) { id = String(Date.now()); sessionStorage.setItem("session-id", id); }
    return id;
  } catch { return "no-session"; }
};
const startOf = (slot) => slot.start_time || PERIODS.find((p) => p.period === slot.period)?.start;

/** Invisible component: watches the timetable and raises notifications for the signed-in role. */
export default function NotificationFeed() {
  const { user } = useCurrentUser();
  if (!user) return null;
  return user.role === "teacher" ? <TeacherFeed /> : <ManagerFeed />;
}

function ManagerFeed() {
  const { notify } = useNotifications();
  const previous = useRef(null);

  const { data } = useQuery({
    queryKey: ["timetable-clashes"],
    queryFn: () => entities.TimetableSlot.clashes(),
    refetchInterval: POLL_MS,
  });

  useEffect(() => {
    if (!data) return;
    const clashes = data.clashes ?? [];
    const keys = new Set(clashes.map(clashKey));
    const before = previous.current;
    previous.current = keys;

    if (before === null) {
      if (clashes.length > 0) {
        notify({
          type: "warning",
          title: clashes.length === 1 ? "1 timetable clash needs attention" : `${clashes.length} timetable clashes need attention`,
          message: clashText(clashes[0]) + (clashes.length > 1 ? ` (and ${clashes.length - 1} more)` : ""),
          link: "/timetable",
          dedupeKey: `clash-summary:${sessionId()}`,
        });
      }
      return;
    }
    const fresh = clashes.filter((c) => !before.has(clashKey(c)));
    fresh.slice(0, 3).forEach((c) => notify({ type: "warning", title: "New timetable clash", message: clashText(c), link: "/timetable" }));
    if (fresh.length > 3) notify({ type: "warning", title: `${fresh.length - 3} more new clashes`, link: "/timetable" });
    if (before.size > 0 && keys.size === 0) {
      notify({ type: "success", title: "All clashes resolved", message: "The timetable has no double-bookings." });
    }
  }, [data, notify]);

  return null;
}

function TeacherFeed() {
  const { notify } = useNotifications();
  const { data } = useQuery({
    queryKey: ["my-schedule"],
    queryFn: () => entities.TimetableSlot.mySchedule(),
    refetchInterval: POLL_MS,
  });
  const slots = data?.slots;
  const clashes = data?.clashes;

  // Once per day: how many lessons today.
  useEffect(() => {
    if (!data?.linked) return;
    const today = JS_DAYS[new Date().getDay()];
    if (!SCHOOL_DAYS.includes(today)) return;
    const todays = (slots ?? []).filter((s) => s.day === today).sort((a, b) => a.period - b.period);
    if (todays.length === 0) return;
    const first = todays[0];
    notify({
      type: "info",
      title: `You have ${todays.length} ${todays.length === 1 ? "lesson" : "lessons"} today`,
      message: `First: ${first.subject}, ${classLabel(first)} at ${startOf(first) || `Period ${first.period}`}`,
      link: "/",
      dedupeKey: `today:${dateStamp()}`,
    });
  }, [data, slots, notify]);

  // Whenever the set of the teacher's own clashes changes.
  useEffect(() => {
    if (!clashes || clashes.length === 0) return;
    const signature = clashes.map(clashKey).sort().join(";");
    notify({
      type: "warning",
      title: "You are double-booked",
      message: clashes.map((c) => `${c.day} P${c.period}`).join(", ") + ". Please tell the administrator.",
      link: "/",
      dedupeKey: `own-clash:${signature}`,
    });
  }, [clashes, notify]);

  // Reminder shortly before each lesson.
  useEffect(() => {
    if (!slots || slots.length === 0) return;
    const check = () => {
      const now = new Date();
      const today = JS_DAYS[now.getDay()];
      const nowMin = now.getHours() * 60 + now.getMinutes();
      slots.filter((s) => s.day === today).forEach((s) => {
        const start = toMinutes(startOf(s));
        if (start === null) return;
        const diff = start - nowMin;
        if (diff >= 0 && diff <= REMINDER_MINUTES) {
          notify({
            type: "info",
            title: diff === 0 ? "Your lesson is starting now" : `Your lesson starts in ${diff} min`,
            message: `${s.subject}, ${classLabel(s)}${s.room ? `, ${s.room}` : ""} (Period ${s.period})`,
            link: "/",
            dedupeKey: `reminder:${dateStamp()}:${s.id}`,
          });
        }
      });
    };
    check();
    const timer = setInterval(check, 30_000);
    return () => clearInterval(timer);
  }, [slots, notify]);

  return null;
}
