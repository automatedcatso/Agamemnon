export type SubjectKey =
  | "dsa"
  | "app"
  | "coa"
  | "nma"
  | "os"
  | "pe"
  | "uhv"
  | "step";

export type ClassSession = {
  id: string;
  subject: SubjectKey;
  title: string;
  short: string;
  start: string;
  end: string;
  room?: string;
};

export type AcademicEvent = {
  date: string;
  title: string;
  kind: "holiday" | "milestone";
};

export const subjects: Array<{
  key: SubjectKey;
  name: string;
  short: string;
  code: string;
  accent: string;
  progress: number;
}> = [
  { key: "dsa", name: "Data Structures & Algorithms", short: "DSA", code: "21CSC202J", accent: "#d9ad4a", progress: 68 },
  { key: "app", name: "Advanced Programming Practice", short: "APP", code: "21CSC204P", accent: "#69a9e8", progress: 54 },
  { key: "coa", name: "Computer Organization & Architecture", short: "COA", code: "21CSC201T", accent: "#df7f71", progress: 61 },
  { key: "nma", name: "Numerical Methods & Analysis", short: "NMA", code: "21MAB204T", accent: "#7ac6ad", progress: 47 },
  { key: "os", name: "Operating Systems", short: "OS", code: "21CSC203T", accent: "#ad88e8", progress: 73 },
  { key: "pe", name: "Professional Ethics", short: "PE", code: "21LEM202T", accent: "#e5a66d", progress: 38 },
  { key: "uhv", name: "Universal Human Values II", short: "UHV-II", code: "21LEM201T", accent: "#8fb1cf", progress: 42 },
  { key: "step", name: "STEP Class", short: "STEP", code: "SATURDAY", accent: "#e0bd5d", progress: 25 },
];

const session = (
  id: string,
  subject: SubjectKey,
  title: string,
  short: string,
  start: string,
  end: string,
  room = "Main Block",
): ClassSession => ({ id, subject, title, short, start, end, room });

export const dayOrderTimetable: Record<number, ClassSession[]> = {
  1: [
    session("do1-dsa", "dsa", "Data Structures & Algorithms", "DSA", "09:45", "11:30"),
    session("do1-nma", "nma", "Numerical Methods & Analysis", "NMA", "12:30", "14:15"),
    session("do1-os", "os", "Operating Systems", "OS", "14:20", "16:00"),
  ],
  2: [
    session("do2-dsa", "dsa", "Data Structures & Algorithms", "DSA", "08:00", "09:40"),
    session("do2-nma", "nma", "Numerical Methods & Analysis", "NMA", "11:35", "12:25"),
  ],
  3: [
    session("do3-pe", "pe", "Professional Ethics", "PE", "10:40", "11:30"),
    session("do3-coa", "coa", "Computer Organization & Architecture", "COA", "12:30", "14:15"),
    session("do3-nma", "nma", "Numerical Methods & Analysis", "NMA", "14:20", "15:10"),
    session("do3-app", "app", "Advanced Programming Practice", "APP", "15:10", "16:00"),
    session("do3-dsa", "dsa", "Data Structures & Algorithms", "DSA", "16:00", "16:50"),
  ],
  4: [
    session("do4-app", "app", "Advanced Programming Practice", "APP", "08:00", "09:40"),
    session("do4-dsa", "dsa", "Data Structures & Algorithms", "DSA", "09:45", "10:35"),
    session("do4-coa", "coa", "Computer Organization & Architecture", "COA", "11:35", "12:25"),
    session("do4-os", "os", "Operating Systems", "OS", "13:25", "15:10"),
  ],
  5: [
    session("do5-coa", "coa", "Computer Organization & Architecture", "COA", "14:20", "15:10"),
    session("do5-os", "os", "Operating Systems", "OS", "15:10", "16:00"),
    session("do5-app", "app", "Advanced Programming Practice", "APP", "16:00", "16:50"),
    session("do5-uhv", "uhv", "Universal Human Values II", "UHV-II", "16:50", "18:10"),
  ],
};

export const saturdayStep = session(
  "saturday-step",
  "step",
  "STEP Class",
  "STEP",
  "12:30",
  "16:30",
  "STEP Hall",
);

export const academicEvents: AcademicEvent[] = [
  { date: "2026-07-20", title: "Enrolment Day", kind: "milestone" },
  { date: "2026-07-21", title: "Classes commence", kind: "milestone" },
  { date: "2026-08-15", title: "Independence Day", kind: "holiday" },
  { date: "2026-08-26", title: "Milad-un-Nabi", kind: "holiday" },
  { date: "2026-09-04", title: "Krishna Jayanthi", kind: "holiday" },
  { date: "2026-09-14", title: "Vinayakar Chathurthi", kind: "holiday" },
  { date: "2026-10-02", title: "Gandhi Jayanthi", kind: "holiday" },
  { date: "2026-10-19", title: "Ayutha Pooja", kind: "holiday" },
  { date: "2026-10-20", title: "Vijaya Dasami", kind: "holiday" },
  { date: "2026-11-08", title: "Deepavali", kind: "holiday" },
  { date: "2026-11-20", title: "Last working day", kind: "milestone" },
  { date: "2026-12-07", title: "First-year last working day", kind: "milestone" },
  { date: "2026-12-25", title: "Christmas", kind: "holiday" },
];

export const semesterStart = "2026-07-21";
export const semesterEnd = "2026-11-20";

export const seedTasks = [
  {
    id: "task-1",
    title: "Finish AVL Trees practice set",
    subject: "dsa" as SubjectKey,
    due: "2026-08-03T20:00:00+05:30",
    priority: "high" as const,
    reminder: "1 day before",
    completed: false,
  },
  {
    id: "task-2",
    title: "COA Unit 1 quick recap",
    subject: "coa" as SubjectKey,
    due: "2026-08-05T18:30:00+05:30",
    priority: "medium" as const,
    reminder: "2 hours before",
    completed: false,
  },
  {
    id: "task-3",
    title: "Upload Numerical Methods assignment",
    subject: "nma" as SubjectKey,
    due: "2026-08-07T23:59:00+05:30",
    priority: "high" as const,
    reminder: "1 day before",
    completed: false,
  },
];
