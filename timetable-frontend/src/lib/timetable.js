// Shared description of the school week, used by the timetable page and the dashboard.

export const SCHOOL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export const PERIODS = [
  { period: 1, start: "07:30", end: "08:15" },
  { period: 2, start: "08:15", end: "09:00" },
  { period: 3, start: "09:00", end: "09:45" },
  { period: 4, start: "10:00", end: "10:45" },
  { period: 5, start: "10:45", end: "11:30" },
  { period: 6, start: "11:30", end: "12:15" },
  { period: 7, start: "13:00", end: "13:45" },
  { period: 8, start: "13:45", end: "14:30" },
];

// Teaching periods available to one teacher, room or class in a school week.
export const WEEKLY_PERIODS = SCHOOL_DAYS.length * PERIODS.length;

export const classLabel = (slot) =>
  `${slot.grade}${slot.section ? `-${slot.section}` : ""}`;

export const GRADES = Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`);
export const SECTIONS = ["A", "B", "C", "D"];
