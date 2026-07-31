"use client";

import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  BookOpen,
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Cloud,
  Command,
  File,
  FileText,
  FolderOpen,
  Gauge,
  Globe2,
  Grid3X3,
  Image as ImageIcon,
  LibraryBig,
  ListTodo,
  Menu,
  NotebookPen,
  Paperclip,
  Pin,
  Plus,
  Presentation,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Timer,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import materialIndex from "./materials-index.json";
import {
  academicEvents,
  dayOrderTimetable,
  saturdayStep,
  seedTasks,
  semesterEnd,
  semesterStart,
  subjects,
  type ClassSession,
  type SubjectKey,
} from "./academic-data";

type View = "command" | "calendar" | "timetable" | "library" | "notes" | "tasks" | "odysseus";
type TaskItem = (typeof seedTasks)[number];
type NoteItem = {
  id: string;
  title: string;
  subject: SubjectKey;
  content: string;
  updated: string;
  pinned: boolean;
  images: string[];
};
type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Array<{ title: string; url: string }>;
  notice?: string;
};

type UploadedMaterial = {
  id: string;
  name: string;
  subject: string;
  type: string;
  size: number;
  path: string;
  keywords: string[];
  indexed: boolean;
};

type ChatSession = {
  id: string;
  title: string;
  updated: string;
  messages: ChatMessage[];
};

const MAX_CHAT_IMAGE_BYTES = 2_700_000;
const navItems: Array<{ id: View; label: string; warrior: string; icon: typeof Gauge }> = [
  { id: "command", label: "Command", warrior: "War Room", icon: Gauge },
  { id: "calendar", label: "Calendar", warrior: "Menelaus", icon: CalendarDays },
  { id: "timetable", label: "Day Orders", warrior: "Calchas", icon: Grid3X3 },
  { id: "library", label: "Study Vault", warrior: "Nestor", icon: LibraryBig },
  { id: "notes", label: "Notes", warrior: "Diomedes", icon: NotebookPen },
  { id: "tasks", label: "Reminders", warrior: "Ajax", icon: ListTodo },
  { id: "odysseus", label: "AI Assistant", warrior: "Odysseus", icon: Sparkles },
];

const officialHolidayDates = new Set(
  academicEvents.filter((event) => event.kind === "holiday").map((event) => event.date),
);

const seedNotes: NoteItem[] = [
  {
    id: "note-1",
    title: "AVL Trees — rotation intuition",
    subject: "dsa",
    content:
      "A tree becomes unbalanced when the balance factor leaves the range -1 to +1.\n\nLL → right rotation\nRR → left rotation\nLR → left then right\nRL → right then left\n\nAsk Odysseus to turn this into a 5-question recap.",
    updated: "Today, 6:42 PM",
    pinned: true,
    images: [],
  },
  {
    id: "note-2",
    title: "OS Unit 2 — scheduling",
    subject: "os",
    content: "Compare FCFS, SJF, priority scheduling, and round-robin using waiting time and turnaround time.",
    updated: "Yesterday",
    pinned: false,
    images: [],
  },
];

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateKey = (dateKey: string) => new Date(`${dateKey}T12:00:00`);

const displayDate = (dateKey: string, options?: Intl.DateTimeFormatOptions) =>
  parseDateKey(dateKey).toLocaleDateString("en-IN", options ?? { day: "numeric", month: "short", year: "numeric" });

const minutesFromTime = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const subjectFor = (key: SubjectKey) => subjects.find((subject) => subject.key === key) ?? subjects[0];

function isNonWorkingDay(date: Date, manualHolidays: string[]) {
  const key = formatDateKey(date);
  return date.getDay() === 0 || date.getDay() === 6 || officialHolidayDates.has(key) || manualHolidays.includes(key);
}

function getDayOrder(dateKey: string, manualHolidays: string[]) {
  if (dateKey < semesterStart || dateKey > semesterEnd) return null;
  const target = parseDateKey(dateKey);
  if (isNonWorkingDay(target, manualHolidays)) return null;
  const cursor = parseDateKey(semesterStart);
  let workingDays = 0;
  while (cursor <= target) {
    if (!isNonWorkingDay(cursor, manualHolidays)) workingDays += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return ((workingDays - 1) % 5) + 1;
}

function classProgress(session: ClassSession, now: Date, isToday: boolean) {
  if (!isToday) return { value: 0, label: "Scheduled" };
  const current = now.getHours() * 60 + now.getMinutes();
  const start = minutesFromTime(session.start);
  const end = minutesFromTime(session.end);
  if (current < start) return { value: 0, label: `Starts in ${start - current}m` };
  if (current >= end) return { value: 100, label: "Completed" };
  const value = ((current - start) / (end - start)) * 100;
  return { value, label: `${end - current}m left` };
}

function formatClock(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

function freeWindows(sessions: ClassSession[], dayStart = "08:00", dayEnd = "18:10") {
  const windows: Array<{ start: number; end: number }> = [];
  let cursor = minutesFromTime(dayStart);
  const endOfDay = minutesFromTime(dayEnd);
  [...sessions].sort((a, b) => minutesFromTime(a.start) - minutesFromTime(b.start)).forEach((session) => {
    const start = minutesFromTime(session.start);
    const end = minutesFromTime(session.end);
    if (start - cursor >= 15) windows.push({ start: cursor, end: start });
    cursor = Math.max(cursor, end);
  });
  if (endOfDay - cursor >= 15) windows.push({ start: cursor, end: endOfDay });
  return windows;
}

function useStoredState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- browser storage is an external source hydrated after mount.
      if (stored) setValue(JSON.parse(stored));
    } catch {
      // Local test mode stays usable even when storage is blocked.
    }
    setReady(true);
  }, [key]);
  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore quota errors and keep the current session working.
    }
  }, [key, ready, value]);
  return [value, setValue] as const;
}

function GreekMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`greek-mark ${compact ? "compact" : ""}`} aria-hidden="true">
      <span>Α</span>
      <i />
    </div>
  );
}

function ProgressLine({ value, color = "var(--gold)" }: { value: number; color?: string }) {
  return (
    <div className="progress-track" aria-label={`${Math.round(value)} percent complete`}>
      <span style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }} />
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div className="modal-backdrop" onMouseDown={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="modal-card" onMouseDown={(event) => event.stopPropagation()} initial={{ opacity: 0, y: 24, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 18, scale: .97 }} transition={{ type: "spring", stiffness: 360, damping: 32 }}>
        <button className="icon-button modal-close" onClick={onClose} aria-label="Close dialog">
          <X size={18} />
        </button>
        {children}
      </motion.div>
    </motion.div>
  );
}

export default function AgamemnonApp() {
  const [view, setView] = useState<View>("command");
  const [mobileNav, setMobileNav] = useState(false);
  const [now, setNow] = useState(new Date());
  const [search, setSearch] = useState("");
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [manualHolidays, setManualHolidays] = useStoredState<string[]>("agamemnon-holidays", []);
  const [tasks, setTasks] = useStoredState<TaskItem[]>("agamemnon-tasks", seedTasks);
  const [notes, setNotes] = useStoredState<NoteItem[]>("agamemnon-notes", seedNotes);
  const [taskModal, setTaskModal] = useState(false);
  const [settingsModal, setSettingsModal] = useState(false);
  const [odysseusSeed, setOdysseusSeed] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setGlobalSearchOpen(true);
      }
      if (event.key === "Escape") {
        setGlobalSearchOpen(false);
        setMobileNav(false);
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const todayKey = formatDateKey(now);
  const todayOrder = getDayOrder(todayKey, manualHolidays);
  const todaySessions = now.getDay() === 6 ? [saturdayStep] : todayOrder ? dayOrderTimetable[todayOrder] : [];
  const nextTask = tasks.filter((task) => !task.completed).sort((a, b) => +new Date(a.due) - +new Date(b.due))[0];
  const activeNav = navItems.find((item) => item.id === view) ?? navItems[0];

  const globalResults = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return [];
    return materialIndex
      .filter((material) => `${material.name} ${material.subject} ${material.keywords.join(" ")}`.toLowerCase().includes(query))
      .slice(0, 6);
  }, [search]);

  const selectView = (next: View) => {
    setView(next);
    setMobileNav(false);
    setGlobalSearchOpen(false);
  };

  const openOdysseus = (prompt = "") => {
    setOdysseusSeed(prompt);
    selectView("odysseus");
  };

  const toggleNavigation = () => {
    setMobileNav((open) => !open);
  };

  const requestNotifications = async () => {
    if (!("Notification" in window)) {
      setToast("This browser does not support notifications.");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification("Ajax Watch is active", {
        body: "Agamemnon can now warn you about deadlines on this device.",
      });
      setToast("Notifications enabled on this device.");
    } else {
      setToast("Notification permission was not enabled.");
    }
  };

  return (
    <MotionConfig reducedMotion="user" transition={{ duration: .32, ease: [.22, 1, .36, 1] }}>
    <div className="app-shell atlas-shell">
      <aside className="command-rail">
        <button className="rail-brand" onClick={() => selectView("command")} aria-label="Open Agamemnon command"><GreekMark compact /></button>
        <nav aria-label="Primary navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return <motion.button data-testid={`nav-${item.id}`} aria-label={`${item.label} ${item.warrior}`} title={`${item.label} · ${item.warrior}`} key={item.id} className={view === item.id ? "active" : ""} onClick={() => selectView(item.id)} whileHover={{ x: 3 }} whileTap={{ scale: .94 }}><Icon size={20} strokeWidth={1.7} />{item.id === "tasks" && tasks.some((task) => !task.completed) && <b>{tasks.filter((task) => !task.completed).length}</b>}<span>{item.label}</span></motion.button>;
          })}
        </nav>
        <div className="rail-spacer" />
        <button className="rail-status" onClick={requestNotifications} aria-label="Enable notifications"><i /><Bell size={18} /></button>
        <button className="rail-avatar" onClick={() => setSettingsModal(true)} aria-label="Open Agamemnon settings">AA</button>
      </aside>

      <AnimatePresence>
        {mobileNav && <motion.div className="command-drawer-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={() => setMobileNav(false)}>
          <motion.aside className="command-drawer" initial={{ x: -42, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -28, opacity: 0 }} transition={{ type: "spring", stiffness: 320, damping: 34 }} onMouseDown={(event) => event.stopPropagation()}>
            <header><div><GreekMark /><p><strong>AGAMEMNON</strong><span>ACADEMIC COMMAND</span></p></div><button className="icon-button" onClick={() => setMobileNav(false)} aria-label="Close navigation"><X /></button></header>
            <div className="drawer-art"><span>THE ODD SEMESTER</span><strong>Your campaign, mapped.</strong><small>{displayDate(todayKey, { weekday: "long", day: "numeric", month: "long" })}</small></div>
            <nav aria-label="Command menu">{navItems.map((item, index) => { const Icon = item.icon; return <motion.button key={item.id} className={view === item.id ? "active" : ""} onClick={() => selectView(item.id)} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * .035 }}><span><Icon size={20} /></span><p><strong>{item.label}</strong><small>{item.warrior}</small></p><ChevronRight size={17} /></motion.button>; })}</nav>
            <footer><div><i /><span><strong>Local test mode</strong><small>Everything stays on this device</small></span></div><button onClick={() => setSettingsModal(true)}><Settings2 size={17} /> Settings</button></footer>
          </motion.aside>
        </motion.div>}
      </AnimatePresence>

      <main className="workspace">
        <header className="topbar">
          <button data-testid="nav-toggle" className="menu-trigger" onClick={toggleNavigation} aria-label="Toggle navigation"><Menu size={20} /><span>Menu</span></button>
          <div className="view-context"><span>{activeNav.warrior}</span><strong>{activeNav.label}</strong></div>
          <button className="search-command" onClick={() => setGlobalSearchOpen(true)}><Search size={18} /><span>Search your campaign</span><kbd>⌘ K</kbd></button>
          <div className="topbar-actions">
            <div className="today-pill"><span>{displayDate(todayKey, { weekday: "short" })}</span><strong>{parseDateKey(todayKey).getDate()}</strong></div>
            <button className="icon-button notification-button" onClick={requestNotifications} aria-label="Enable notifications"><Bell size={19} /><i /></button>
            <button className="quick-add" onClick={() => setTaskModal(true)}><Plus size={18} /><span>New</span></button>
          </div>
        </header>

        <div className={`page-stage view-${view}`}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div className="view-motion" key={view} initial={{ opacity: 0, y: 14, filter: "blur(7px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -8, filter: "blur(5px)" }}>
              {view === "command" && <DashboardView now={now} todayKey={todayKey} todayOrder={todayOrder} sessions={todaySessions} nextTask={nextTask} tasks={tasks} setTasks={setTasks} openView={selectView} openAssistant={openOdysseus} openTask={() => setTaskModal(true)} />}
              {view === "calendar" && <CalendarView manualHolidays={manualHolidays} setManualHolidays={setManualHolidays} tasks={tasks} openTask={() => setTaskModal(true)} />}
              {view === "timetable" && <TimetableView now={now} todayKey={todayKey} manualHolidays={manualHolidays} openCalendar={() => selectView("calendar")} />}
              {view === "library" && <LibraryView initialQuery={search} openOdysseus={() => openOdysseus("Search my study vault and help me choose what to revise next.")} notify={setToast} />}
              {view === "notes" && <NotesView notes={notes} setNotes={setNotes} notify={setToast} askOdysseus={(prompt) => openOdysseus(prompt)} />}
              {view === "tasks" && <TasksView tasks={tasks} setTasks={setTasks} openTask={() => setTaskModal(true)} requestNotifications={requestNotifications} notify={setToast} />}
              {view === "odysseus" && <OdysseusView initialPrompt={odysseusSeed} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        {navItems.slice(0, 4).map((item) => {
          const Icon = item.icon;
          return <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => selectView(item.id)}><Icon size={20} /><span>{item.label}</span></button>;
        })}
        <button className={view === "odysseus" ? "active odysseus-mobile" : "odysseus-mobile"} onClick={() => selectView("odysseus")}><Sparkles size={20} /><span>Odysseus</span></button>
      </nav>

      <AnimatePresence>{globalSearchOpen && (
        <motion.div className="command-palette-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={() => setGlobalSearchOpen(false)}>
          <motion.div className="command-palette" initial={{ opacity: 0, y: -16, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: .98 }} onMouseDown={(event) => event.stopPropagation()}>
            <div className="palette-input"><Search size={20} /><input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search Agamemnon..." /><button onClick={() => setGlobalSearchOpen(false)}>ESC</button></div>
            <div className="palette-results">
              {!search && <div className="palette-empty"><Command size={28} /><strong>One search across your command centre</strong><span>Try “AVL trees”, “Unit 3”, or “Operating Systems”.</span></div>}
              {globalResults.map((material) => (
                <button key={material.id} onClick={() => { selectView("library"); setSearch(material.name); }}>
                  <FileText size={18} /><span><strong>{material.name}</strong><small>{material.subject} · {material.type.toUpperCase()}</small></span><ArrowRight size={17} />
                </button>
              ))}
              {search && globalResults.length === 0 && <div className="palette-empty"><Search size={28} /><strong>No exact match</strong><span>Odysseus can still reason about this topic.</span><button className="primary-button" onClick={() => openOdysseus(search)}>Ask Odysseus</button></div>}
            </div>
          </motion.div>
        </motion.div>
      )}</AnimatePresence>

      <AnimatePresence>{taskModal && <TaskModal onClose={() => setTaskModal(false)} onCreate={(task) => { setTasks((current) => [task, ...current]); setTaskModal(false); setToast("Reminder added to Ajax Watch."); }} />}</AnimatePresence>
      <AnimatePresence>{settingsModal && <SettingsModal onClose={() => setSettingsModal(false)} requestNotifications={requestNotifications} notify={setToast} />}</AnimatePresence>
      {toast && <div className="toast"><CheckCircle2 size={18} />{toast}</div>}
    </div>
    </MotionConfig>
  );
}

function DashboardView({
  now,
  todayKey,
  todayOrder,
  sessions,
  nextTask,
  tasks,
  setTasks,
  openView,
  openAssistant,
  openTask,
}: {
  now: Date;
  todayKey: string;
  todayOrder: number | null;
  sessions: ClassSession[];
  nextTask?: TaskItem;
  tasks: TaskItem[];
  setTasks: React.Dispatch<React.SetStateAction<TaskItem[]>>;
  openView: (view: View) => void;
  openAssistant: (prompt?: string) => void;
  openTask: () => void;
}) {
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";
  const completed = tasks.filter((task) => task.completed).length;
  const dueDate = nextTask ? new Date(nextTask.due) : null;
  const remainingHours = dueDate ? Math.max(0, Math.round((+dueDate - +now) / 3_600_000)) : 0;
  const currentMinute = now.getHours() * 60 + now.getMinutes();
  const nextSession = sessions.find((session) => minutesFromTime(session.end) > currentMinute);
  const pendingTasks = tasks.filter((task) => !task.completed).slice(0, 3);

  return (
    <div className="dashboard-atlas page-enter">
      <section className="atlas-intro">
        <div><span className="atlas-overline">ACADEMIC COMMAND / {displayDate(todayKey, { weekday: "long", day: "numeric", month: "long" }).toUpperCase()}</span><h1>{greeting}, <em>Aaryash.</em></h1><p>Everything that matters today—classes, deadlines, free windows and study intelligence—on one clear field.</p></div>
        <div className="atlas-actions"><button className="atlas-secondary" onClick={openTask}><Plus size={18} /> Add reminder</button><button className="atlas-primary" onClick={() => openAssistant()}><Sparkles size={18} /> Ask Odysseus</button></div>
      </section>

      <section className="editorial-grid">
        <motion.article className="campaign-feature" whileHover={{ y: -3 }} transition={{ type: "spring", stiffness: 260, damping: 26 }}>
          <div className="campaign-top"><span><i /> LIVE CAMPAIGN</span><button onClick={() => openView("calendar")}>Open calendar <ArrowUpRight size={16} /></button></div>
          <div className="campaign-bottom"><div><span>TODAY&apos;S FORMATION</span><strong>{now.getDay() === 6 ? "STEP" : todayOrder ? `DAY ORDER ${todayOrder}` : "OPEN DAY"}</strong><p>{sessions.length ? `${sessions.length} classes mapped from the rotating schedule.` : "No scheduled classes. Reclaim the day for deep work."}</p></div><b>{String(parseDateKey(todayKey).getDate()).padStart(2, "0")}</b></div>
        </motion.article>

        <motion.article className="atlas-stat deadline-stat" whileHover={{ y: -3 }}><header><Timer size={19} /><span>NEXT DEADLINE</span></header><strong>{nextTask ? (remainingHours < 24 ? `${remainingHours}h` : `${Math.ceil(remainingHours / 24)}d`) : "Clear"}</strong><p>{nextTask?.title ?? "Nothing urgent on the horizon."}</p><button onClick={() => openView("tasks")}>View Ajax Watch <ArrowRight size={15} /></button></motion.article>
        <motion.article className="atlas-stat momentum-stat" whileHover={{ y: -3 }}><header><ShieldCheck size={19} /><span>MOMENTUM</span></header><strong>{completed + 6}<small> wins</small></strong><p>Tasks completed across this semester campaign.</p><div className="momentum-bars">{[42,66,51,78,62,88,72].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div></motion.article>

        <section className="atlas-schedule">
          <header><div><span>CALCHAS / TODAY</span><h2>{nextSession ? "Next on your field" : "Today’s formation"}</h2></div><button onClick={() => openView("timetable")}>Full timetable <ArrowUpRight size={16} /></button></header>
          <div className="atlas-class-list">{sessions.length === 0 && <div className="atlas-empty"><CalendarCheck2 /><p><strong>No classes today</strong><span>Use an open window for a focused recap.</span></p></div>}{sessions.map((item) => { const subject = subjectFor(item.subject); const progress = classProgress(item, now, true); return <motion.button key={item.id} onClick={() => openView("timetable")} whileHover={{ x: 4 }} className={progress.value > 0 && progress.value < 100 ? "live" : ""}><span className="class-index" style={{ color: subject.accent }}>{item.short.slice(0,3)}</span><p><strong>{item.title}</strong><small>{item.start}–{item.end} · {item.room}</small></p><span className="class-state">{progress.label}</span><div><i style={{ width: `${progress.value}%`, background: subject.accent }} /></div></motion.button>; })}</div>
        </section>

        <motion.article className="vault-visual" whileHover={{ y: -3 }} onClick={() => openView("library")}>
          <div className="visual-shade" /><header><span>NESTOR / STUDY VAULT</span><ArrowUpRight /></header><div><strong>{materialIndex.length}</strong><small>course files</small><p>Search slides, documents and extracted topics from one living archive.</p></div>
        </motion.article>

        <section className="deadline-stack">
          <header><div><span>AJAX / WATCHLIST</span><h2>Needs attention</h2></div><button onClick={openTask}><Plus size={17} /></button></header>
          {pendingTasks.map((task) => { const subject = subjectFor(task.subject); const date = new Date(task.due); return <article key={task.id}><button onClick={() => setTasks((items) => items.map((item) => item.id === task.id ? { ...item, completed: true } : item))} aria-label="Mark complete"><Circle size={19} /></button><span style={{ background: subject.accent }} /><p><strong>{task.title}</strong><small>{subject.short} · {task.reminder}</small></p><time>{date.getDate()}<small>{date.toLocaleString("en-IN", { month: "short" }).toUpperCase()}</small></time></article>; })}
          <button className="stack-footer" onClick={() => openView("tasks")}>Manage every reminder <ArrowRight size={16} /></button>
        </section>

        <motion.article className="strategy-card" whileHover={{ y: -3 }}>
          <div className="strategy-copy"><span><i /> ODYSSEUS / GEMINI 3.1 FLASH-LITE</span><h2>Turn scattered material into a clear route.</h2><p>Search your vault, understand a diagram, build a recap, or pressure-test tomorrow’s plan.</p><div><button onClick={() => openAssistant("Build me a focused 15-minute recap from the most relevant study material.")}>Build a recap</button><button onClick={() => openAssistant("Quiz me using my Operating Systems material.")}>Start a quiz</button></div><button className="strategy-input" onClick={() => openAssistant()}><Sparkles size={17} /><span>Ask anything about your semester</span><Send size={17} /></button></div>
        </motion.article>

        <section className="subject-ribbon"><header><span>YOUR LEGIONS</span><button onClick={() => openView("library")}>All subjects <ArrowUpRight size={15} /></button></header><div>{subjects.slice(0,7).map((subject) => <button key={subject.key} onClick={() => openView("library")}><i style={{ background: subject.accent }} /><span><strong>{subject.short}</strong><small>{subject.name}</small></span><b>{subject.progress}%</b></button>)}</div></section>
      </section>
    </div>
  );
}

function CalendarView({
  manualHolidays,
  setManualHolidays,
  tasks,
  openTask,
}: {
  manualHolidays: string[];
  setManualHolidays: React.Dispatch<React.SetStateAction<string[]>>;
  tasks: TaskItem[];
  openTask: () => void;
}) {
  const [month, setMonth] = useState(6);
  const [mode, setMode] = useState<"month" | "schedule">("month");
  const [selected, setSelected] = useState("2026-07-31");
  const firstDay = new Date(2026, month, 1);
  const daysInMonth = new Date(2026, month + 1, 0).getDate();
  const leading = firstDay.getDay();
  const cells = Array.from({ length: 42 }, (_, index) => {
    const day = index - leading + 1;
    return day >= 1 && day <= daysInMonth ? new Date(2026, month, day) : null;
  });
  const selectedEvent = academicEvents.find((event) => event.date === selected);
  const selectedOrder = getDayOrder(selected, manualHolidays);
  const selectedDate = parseDateKey(selected);
  const selectedTasks = tasks.filter((task) => formatDateKey(new Date(task.due)) === selected);
  const monthEvents = academicEvents.filter((event) => parseDateKey(event.date).getMonth() === month);

  const toggleHoliday = () => {
    if (officialHolidayDates.has(selected)) return;
    setManualHolidays((current) => current.includes(selected) ? current.filter((date) => date !== selected) : [...current, selected]);
  };

  return (
    <div className="calendar-view page-enter">
      <div className="page-heading-row">
        <div><span className="eyebrow"><span /> MENELAUS · 2026 CAMPAIGN CALENDAR</span><h1>Calendar</h1><p>Official holidays, rotating day orders, classes, deadlines, and your own exceptions.</p></div>
        <div className="page-actions"><div className="segmented"><button className={mode === "month" ? "active" : ""} onClick={() => setMode("month")}>Month</button><button className={mode === "schedule" ? "active" : ""} onClick={() => setMode("schedule")}>Schedule</button></div><button className="primary-button" onClick={openTask}><Plus size={17} /> Create</button></div>
      </div>
      <div className="calendar-layout">
        <aside className="calendar-side">
          <div className="mini-year"><strong>2026</strong><span>Odd semester</span></div>
          <div className="calendar-legend"><strong>CALENDARS</strong><label><i className="legend-gold" /> Day order</label><label><i className="legend-red" /> Holiday</label><label><i className="legend-blue" /> Deadlines</label><label><i className="legend-cream" /> Personal</label></div>
          <div className="selected-day-card">
            <span>{displayDate(selected, { weekday: "long" }).toUpperCase()}</span><strong>{selectedDate.getDate()}</strong><h3>{selectedEvent?.title ?? (manualHolidays.includes(selected) ? "Personal holiday" : selectedOrder ? `Day Order ${selectedOrder}` : selectedDate.getDay() === 0 ? "Sunday" : "Open day")}</h3>
            {selectedOrder && <p>{dayOrderTimetable[selectedOrder].length} classes scheduled</p>}
            {selectedDate.getDay() === 6 && <p>STEP · 12:30 PM–4:30 PM</p>}
            {selectedTasks.map((task) => <p key={task.id}>{task.title}</p>)}
            {!officialHolidayDates.has(selected) && selected >= semesterStart && selected <= semesterEnd && <button className={manualHolidays.includes(selected) ? "danger-outline" : "secondary-button"} onClick={toggleHoliday}>{manualHolidays.includes(selected) ? "Remove holiday" : "Mark as holiday"}</button>}
            {officialHolidayDates.has(selected) && <div className="official-chip"><ShieldCheck size={15} /> Official holiday</div>}
          </div>
          <div className="calendar-note"><ShieldCheck size={18} /><p><strong>Day Order engine</strong><span>Adding a holiday shifts every later order automatically.</span></p></div>
        </aside>
        <section className="calendar-main panel">
          <div className="calendar-toolbar"><div><button className="secondary-button compact" onClick={() => { setMonth(6); setSelected("2026-07-31"); }}>Today</button><button className="icon-button" disabled={month === 0} onClick={() => setMonth((value) => Math.max(0, value - 1))}><ChevronLeft /></button><button className="icon-button" disabled={month === 11} onClick={() => setMonth((value) => Math.min(11, value + 1))}><ChevronRight /></button><h2>{firstDay.toLocaleString("en-IN", { month: "long" })} <span>2026</span></h2></div><div className="calendar-sync"><Cloud size={15} /> Academic planner imported</div></div>
          {mode === "month" ? (
            <div className="month-grid">
              {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day) => <div className="weekday" key={day}>{day}</div>)}
              {cells.map((date, index) => {
                if (!date) return <div className="calendar-cell muted" key={`empty-${index}`} />;
                const key = formatDateKey(date);
                const event = academicEvents.find((item) => item.date === key);
                const order = getDayOrder(key, manualHolidays);
                const dayTasks = tasks.filter((task) => formatDateKey(new Date(task.due)) === key);
                const isToday = key === "2026-07-31";
                const isManual = manualHolidays.includes(key);
                return (
                  <button className={`calendar-cell ${selected === key ? "selected" : ""} ${event?.kind === "holiday" || isManual ? "holiday" : ""}`} key={key} onClick={() => setSelected(key)}>
                    <span className={isToday ? "today-number" : ""}>{date.getDate()}</span>
                    {order && <b className="do-chip">DO {order}</b>}
                    {event && <i className={`event-chip ${event.kind}`}>{event.title}</i>}
                    {isManual && !event && <i className="event-chip holiday">Personal holiday</i>}
                    {date.getDay() === 6 && key >= semesterStart && key <= semesterEnd && <i className="event-chip step">STEP · 12:30</i>}
                    {dayTasks.slice(0, 2).map((task) => <i className="event-chip task" key={task.id}>{task.title}</i>)}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="agenda-list">
              {[...monthEvents, ...tasks.filter((task) => new Date(task.due).getMonth() === month).map((task) => ({ date: formatDateKey(new Date(task.due)), title: task.title, kind: "task" as const }))]
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((event, index) => <button key={`${event.date}-${index}`} onClick={() => setSelected(event.date)}><span><strong>{parseDateKey(event.date).getDate()}</strong><small>{displayDate(event.date, { weekday: "short" }).toUpperCase()}</small></span><i className={`agenda-dot ${event.kind}`} /><p><strong>{event.title}</strong><small>{event.kind === "task" ? "Deadline" : event.kind === "holiday" ? "Official holiday" : "Academic milestone"}</small></p><ChevronRight size={17} /></button>)}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function TimetableView({ now, todayKey, manualHolidays, openCalendar }: { now: Date; todayKey: string; manualHolidays: string[]; openCalendar: () => void }) {
  const todayOrder = getDayOrder(todayKey, manualHolidays);
  return (
    <div className="timetable-view page-enter">
      <div className="page-heading-row">
        <div><span className="eyebrow"><span /> CALCHAS · ROTATING DAY ORDER ENGINE</span><h1>Your timetable</h1><p>Built from the supplied DO1–DO5 timetable, with live class progress and holiday-aware rotation.</p></div>
        <div className="today-order-medallion"><span>TODAY</span><strong>{now.getDay() === 6 ? "STEP" : todayOrder ? `DO${todayOrder}` : "OFF"}</strong><small>{displayDate(todayKey, { weekday: "long" })}</small></div>
      </div>
      <div className="day-order-alert"><ShieldCheck size={20} /><p><strong>Automatic shift is active.</strong><span>Sundays and official or manually marked holidays do not consume a day order. Saturday STEP remains visible as a separate fixed class.</span></p><button onClick={openCalendar}>Manage holidays <ChevronRight size={16} /></button></div>
      <section className="timetable-board">
        {[1, 2, 3, 4, 5].map((order) => {
          const isToday = order === todayOrder;
          return (
            <div className={`day-column ${isToday ? "today" : ""}`} key={order}>
              <div className="day-column-head"><span>DAY ORDER</span><strong>DO{order}</strong>{isToday && <i>Today</i>}</div>
              <div className="day-column-body">
                {dayOrderTimetable[order].map((item) => {
                  const subject = subjectFor(item.subject);
                  const progress = classProgress(item, now, isToday);
                  return (
                    <article className={`timetable-class ${progress.value > 0 && progress.value < 100 ? "live" : ""}`} style={{ "--subject": subject.accent } as React.CSSProperties} key={item.id}>
                      <div className="class-topline"><span>{item.start}–{item.end}</span>{progress.value > 0 && progress.value < 100 && <b>LIVE</b>}</div>
                      <h3>{item.title}</h3><p>{item.room} · {item.short}</p>
                      <div className="class-progress-label"><span>{progress.label}</span><span>{Math.round(progress.value)}%</span></div>
                      <ProgressLine value={progress.value} color={subject.accent} />
                    </article>
                  );
                })}
                <div className="free-window-group">
                  <span>FREE WINDOWS</span>
                  {freeWindows(dayOrderTimetable[order]).map((window) => (
                    <article className="free-window" key={`${order}-${window.start}`}>
                      <Timer size={15} />
                      <p><strong>{formatClock(window.start)}–{formatClock(window.end)}</strong><small>Free slot · ideal for library or revision</small></p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
        <div className={`day-column step-column ${now.getDay() === 6 ? "today" : ""}`}>
          <div className="day-column-head"><span>EVERY SATURDAY</span><strong>STEP</strong>{now.getDay() === 6 && <i>Today</i>}</div>
          <div className="day-column-body">
            {(() => {
              const subject = subjectFor("step");
              const progress = classProgress(saturdayStep, now, now.getDay() === 6);
              return <article className="timetable-class" style={{ "--subject": subject.accent } as React.CSSProperties}><div className="class-topline"><span>12:30–16:30</span></div><h3>STEP Class</h3><p>4-hour Saturday block</p><div className="class-progress-label"><span>{progress.label}</span><span>{Math.round(progress.value)}%</span></div><ProgressLine value={progress.value} color={subject.accent} /></article>;
            })()}
            <div className="free-window-group"><span>BEFORE &amp; AFTER STEP</span>{freeWindows([saturdayStep], "08:00", "18:10").map((window) => <article className="free-window" key={`step-${window.start}`}><Timer size={15} /><p><strong>{formatClock(window.start)}–{formatClock(window.end)}</strong><small>Free slot</small></p></article>)}</div>
          </div>
        </div>
      </section>
    </div>
  );
}

function LibraryView({ initialQuery, openOdysseus, notify }: { initialQuery: string; openOdysseus: () => void; notify: (message: string) => void }) {
  const [query, setQuery] = useState(initialQuery);
  const [subject, setSubject] = useState("All subjects");
  const [uploads, setUploads] = useState<UploadedMaterial[]>([]);
  const uploadInput = useRef<HTMLInputElement>(null);
  const allMaterials = [...uploads, ...materialIndex];
  const subjectNames = ["All subjects", ...Array.from(new Set(allMaterials.map((item) => item.subject)))];
  const results = allMaterials.filter((item) => {
    const matchesSubject = subject === "All subjects" || item.subject === subject;
    const haystack = `${item.name} ${item.subject} ${item.keywords.join(" ")}`.toLowerCase();
    return matchesSubject && haystack.includes(query.toLowerCase());
  });

  const fileIcon = (type: string) => type === "pdf" ? FileText : type.startsWith("ppt") ? Presentation : type.startsWith("doc") ? File : FileText;
  const prettySize = (bytes: number) => bytes > 1_048_576 ? `${(bytes / 1_048_576).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;
  const addMaterials = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    const added = files.map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      subject: "Personal uploads",
      type: file.name.split(".").pop()?.toLowerCase() || "file",
      size: file.size,
      path: URL.createObjectURL(file),
      keywords: ["personal", "upload"],
      indexed: false,
    }));
    setUploads((current) => [...added, ...current]);
    setSubject("All subjects");
    notify(`${added.length} material${added.length === 1 ? "" : "s"} added for this local session.`);
    event.target.value = "";
  };

  return (
    <div className="library-view page-enter">
      <div className="page-heading-row">
        <div><span className="eyebrow"><span /> NESTOR · SEARCHABLE STUDY VAULT</span><h1>Study material</h1><p>{allMaterials.length} files across {subjectNames.length - 1} subjects. Search titles, slide text, document text, and extracted PDF topics.</p></div>
        <div className="page-actions"><input hidden multiple type="file" ref={uploadInput} onChange={addMaterials} /><button className="secondary-button" onClick={() => uploadInput.current?.click()}><Upload size={17} /> Add material</button><button className="primary-button" onClick={openOdysseus}><Sparkles size={17} /> Ask about files</button></div>
      </div>
      <div className="vault-stats">
        <div><FolderOpen /><p><strong>{subjectNames.length - 1}</strong><span>Subject collections</span></p></div><div><BookOpen /><p><strong>{allMaterials.filter((item) => item.indexed).length}</strong><span>Content-indexed files</span></p></div><div><ShieldCheck /><p><strong>{uploads.length || "Local"}</strong><span>{uploads.length ? "Personal session uploads" : "Original files preserved"}</span></p></div>
      </div>
      <section className="panel vault-panel">
        <div className="vault-toolbar"><label><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search topics, units, files..." /></label><select value={subject} onChange={(event) => setSubject(event.target.value)}>{subjectNames.map((name) => <option key={name}>{name}</option>)}</select><span>{results.length} results</span></div>
        <div className="file-table-head"><span>NAME</span><span>SUBJECT</span><span>TYPE</span><span>SIZE</span><span /></div>
        <div className="file-list">
          {results.map((item) => {
            const Icon = fileIcon(item.type);
            const encodedPath = item.path.startsWith("blob:") ? item.path : item.path.split("/").map((part, index) => index === 0 ? "" : encodeURIComponent(part)).join("/");
            return (
              <a className="file-row" href={encodedPath} target="_blank" rel="noreferrer" key={item.id}>
                <span className={`file-type ${item.type}`}><Icon size={20} /></span><p><strong>{item.name}</strong><small>{item.indexed ? item.keywords.slice(0, 5).join(" · ") : "Filename indexed · legacy format"}</small></p><span>{item.subject}</span><b>{item.type.toUpperCase()}</b><span>{prettySize(item.size)}</span><ArrowUpRight size={17} />
              </a>
            );
          })}
          {results.length === 0 && <div className="empty-state"><Search /><strong>No material found</strong><span>Try a broader topic or ask Odysseus to reason across the vault.</span></div>}
        </div>
      </section>
    </div>
  );
}

function NotesView({ notes, setNotes, notify, askOdysseus }: { notes: NoteItem[]; setNotes: React.Dispatch<React.SetStateAction<NoteItem[]>>; notify: (message: string) => void; askOdysseus: (prompt: string) => void }) {
  const [selectedId, setSelectedId] = useState(notes[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const selected = notes.find((note) => note.id === selectedId) ?? notes[0];
  const filtered = notes.filter((note) => `${note.title} ${note.content}`.toLowerCase().includes(query.toLowerCase()));

  const update = (patch: Partial<NoteItem>) => {
    if (!selected) return;
    setNotes((items) => items.map((item) => item.id === selected.id ? { ...item, ...patch, updated: "Just now" } : item));
  };
  const addNote = () => {
    const note: NoteItem = { id: crypto.randomUUID(), title: "Untitled note", subject: "dsa", content: "", updated: "Just now", pinned: false, images: [] };
    setNotes((items) => [note, ...items]);
    setSelectedId(note.id);
  };
  const addImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 1_500_000) { notify("Use an image under 1.5 MB in local test mode."); return; }
    const reader = new FileReader();
    reader.onload = () => update({ images: [...(selected?.images ?? []), String(reader.result)] });
    reader.readAsDataURL(file);
  };

  return (
    <div className="notes-view page-enter">
      <div className="page-heading-row compact-heading"><div><span className="eyebrow"><span /> DIOMEDES · FIELD NOTES</span><h1>Notes</h1></div><button className="primary-button" onClick={addNote}><Plus size={17} /> New note</button></div>
      <section className="notes-workspace panel">
        <aside className="notes-list-pane">
          <label><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search notes" /></label>
          <div className="notes-list">
            {filtered.map((note) => <button className={selected?.id === note.id ? "active" : ""} onClick={() => setSelectedId(note.id)} key={note.id}>{note.pinned && <Pin size={13} />}<strong>{note.title}</strong><span>{subjectFor(note.subject).short} · {note.updated}</span><p>{note.content.slice(0, 90) || "Empty note"}</p></button>)}
          </div>
        </aside>
        {selected ? (
          <div className="note-editor">
            <div className="editor-toolbar"><select value={selected.subject} onChange={(event) => update({ subject: event.target.value as SubjectKey })}>{subjects.slice(0, 7).map((subject) => <option value={subject.key} key={subject.key}>{subject.name}</option>)}</select><span>Saved locally · {selected.updated}</span><button className={`icon-button ${selected.pinned ? "active" : ""}`} onClick={() => update({ pinned: !selected.pinned })}><Pin size={17} /></button><button className="icon-button danger" onClick={() => { setNotes((items) => items.filter((item) => item.id !== selected.id)); setSelectedId(notes.find((item) => item.id !== selected.id)?.id ?? ""); }}><Trash2 size={17} /></button></div>
            <input className="note-title-input" value={selected.title} onChange={(event) => update({ title: event.target.value })} aria-label="Note title" />
            <textarea className="note-body-input" value={selected.content} onChange={(event) => update({ content: event.target.value })} placeholder="Write your note..." aria-label="Note content" />
            {selected.images.length > 0 && (
              <div className="note-images">
                {selected.images.map((image, index) => (
                  <div key={index}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- user-selected local data URL has no stable dimensions or loader. */}
                    <img src={image} alt={`Reference ${index + 1}`} />
                    <button onClick={() => update({ images: selected.images.filter((_, imageIndex) => imageIndex !== index) })}><X size={14} /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="editor-footer"><input hidden type="file" accept="image/*" ref={fileInput} onChange={addImage} /><button className="secondary-button compact" onClick={() => fileInput.current?.click()}><ImageIcon size={17} /> Add diagram / photo</button><button className="secondary-button compact" onClick={() => askOdysseus(`Help me improve and revise this ${subjectFor(selected.subject).name} note titled “${selected.title}”:\n\n${selected.content.slice(0, 6000)}`)}><Sparkles size={17} /> Ask Odysseus about note</button><span>{selected.content.length} characters</span></div>
          </div>
        ) : <div className="empty-state"><NotebookPen /><strong>No notes yet</strong><button className="primary-button" onClick={addNote}>Create your first note</button></div>}
      </section>
    </div>
  );
}

function TasksView({ tasks, setTasks, openTask, requestNotifications, notify }: { tasks: TaskItem[]; setTasks: React.Dispatch<React.SetStateAction<TaskItem[]>>; openTask: () => void; requestNotifications: () => void; notify: (message: string) => void }) {
  const [filter, setFilter] = useState<"upcoming" | "completed">("upcoming");
  const pending = tasks.filter((task) => !task.completed);
  const visibleTasks = tasks.filter((task) => filter === "completed" ? task.completed : !task.completed);
  return (
    <div className="tasks-view page-enter">
      <div className="page-heading-row"><div><span className="eyebrow"><span /> AJAX · DEADLINE WATCH</span><h1>Reminders & warnings</h1><p>Get the first warning a day before, then add any custom schedule you need.</p></div><div className="page-actions"><button className="secondary-button" onClick={requestNotifications}><Bell size={17} /> Enable device notifications</button><button className="primary-button" onClick={openTask}><Plus size={17} /> New reminder</button></div></div>
      <div className="reminder-overview">
        <section className="panel warning-card"><div className="warning-icon"><Bell /></div><span>NEXT WARNING</span><h2>{pending[0]?.title ?? "Campaign clear"}</h2><p>{pending[0] ? `${pending[0].reminder} · ${new Date(pending[0].due).toLocaleString("en-IN", { day: "numeric", month: "long", hour: "numeric", minute: "2-digit" })}` : "No pending deadlines."}</p><ProgressLine value={pending[0] ? 62 : 100} /></section>
        <section className="panel reminder-settings"><div><ShieldCheck /><p><strong>Ajax Watch</strong><span>Browser notifications + in-app warnings</span></p><b>ARMED</b></div><button onClick={requestNotifications}>Test notification <ArrowUpRight size={16} /></button></section>
        <section className="panel reminder-settings"><div><Cloud /><p><strong>Cross-device push</strong><span>Ready to activate during hosting setup</span></p><b className="muted-badge">LOCAL</b></div><button onClick={() => notify("Local mode is ready. Cross-device push will be connected only when you ask to deploy.")}>Deployment checklist <ArrowUpRight size={16} /></button></section>
      </div>
      <section className="panel task-manager">
        <div className="panel-heading"><div><span className="panel-kicker">ACTIVE CAMPAIGN</span><h2>{filter === "upcoming" ? `${pending.length} items need attention` : `${tasks.filter((task) => task.completed).length} victories recorded`}</h2></div><div className="segmented"><button className={filter === "upcoming" ? "active" : ""} onClick={() => setFilter("upcoming")}>Upcoming</button><button className={filter === "completed" ? "active" : ""} onClick={() => setFilter("completed")}>Completed</button></div></div>
        <div className="task-table-head"><span>TASK</span><span>SUBJECT</span><span>DUE</span><span>REMINDER</span><span>PRIORITY</span><span /></div>
        <div className="task-list-full">
          {visibleTasks.map((task) => {
            const subject = subjectFor(task.subject);
            const due = new Date(task.due);
            return <div className={task.completed ? "task-row done" : "task-row"} key={task.id}><button onClick={() => setTasks((items) => items.map((item) => item.id === task.id ? { ...item, completed: !item.completed } : item))}>{task.completed ? <CheckCircle2 /> : <Circle />}</button><p><strong>{task.title}</strong><small>Created in Agamemnon</small></p><span><i style={{ background: subject.accent }} />{subject.short}</span><span>{due.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}<small>{due.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}</small></span><span>{task.reminder}</span><b className={`priority ${task.priority}`}>{task.priority}</b><button className="icon-button" onClick={() => setTasks((items) => items.filter((item) => item.id !== task.id))}><Trash2 size={16} /></button></div>;
          })}
          {visibleTasks.length === 0 && <div className="empty-state"><CheckCircle2 /><strong>{filter === "completed" ? "No completed reminders yet" : "The campaign is clear"}</strong><span>{filter === "completed" ? "Finish an item and it will appear here." : "Create a reminder when a new deadline arrives."}</span></div>}
        </div>
      </section>
    </div>
  );
}

function OdysseusView({ initialPrompt }: { initialPrompt: string }) {
  const welcome: ChatMessage = { id: "welcome", role: "assistant", content: "I’m Odysseus, your academic strategist. I can search the study vault, explain a diagram or photo, build recaps, and warn you when a plan is slipping. What are we solving?" };
  const [messages, setMessages] = useState<ChatMessage[]>([welcome]);
  const [sessions, setSessions] = useStoredState<ChatSession[]>("agamemnon-chat-history", []);
  const [activeSession, setActiveSession] = useState("current-session");
  const [input, setInput] = useState(initialPrompt);
  const [thinking, setThinking] = useState(false);
  const [activeModel, setActiveModel] = useState("gemini-3.1-flash-lite");
  const [webSearch, setWebSearch] = useStoredState("agamemnon-web-search", true);
  const [vaultOnly, setVaultOnly] = useStoredState("agamemnon-vault-only", false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [attachment, setAttachment] = useState<{ name: string; data: string; mimeType: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length === 1 && !thinking) {
      scrollRef.current?.scrollTo({ top: 0, behavior: "instant" });
      return;
    }
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, thinking]);

  useEffect(() => {
    if (!initialPrompt) return;
    setInput(initialPrompt);
    window.setTimeout(() => inputRef.current?.focus(), 50);
  }, [initialPrompt]);

  const archiveConversation = (snapshot = messages) => {
    const firstQuestion = snapshot.find((message) => message.role === "user")?.content;
    if (!firstQuestion) return;
    const session: ChatSession = { id: activeSession, title: firstQuestion.slice(0, 42), updated: "Just now", messages: snapshot };
    setSessions((current) => [session, ...current.filter((item) => item.id !== activeSession)].slice(0, 12));
  };

  const newChat = () => {
    archiveConversation();
    setActiveSession(crypto.randomUUID());
    setMessages([{ ...welcome, id: crypto.randomUUID() }]);
    setInput("");
    setAttachment(null);
    setHistoryOpen(false);
    setSettingsOpen(false);
    window.setTimeout(() => inputRef.current?.focus(), 50);
  };

  const openSession = (session: ChatSession) => {
    archiveConversation();
    setActiveSession(session.id);
    setMessages(session.messages);
    setHistoryOpen(false);
  };

  const chooseFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file?.type.startsWith("image/")) return;
    if (file.size > MAX_CHAT_IMAGE_BYTES) {
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", content: "That image is too large for the hosted assistant. Use an image under 2.7 MB so the request stays within Vercel’s function payload limit." }]);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAttachment({ name: file.name, data: String(reader.result).split(",")[1], mimeType: file.type });
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const sendMessage = async (prompt?: string) => {
    const text = (prompt ?? input).trim();
    if ((!text && !attachment) || thinking) return;
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", content: text || `Analyse ${attachment?.name}` };
    const outgoing = [...messages, userMessage];
    setMessages(outgoing);
    setInput("");
    setThinking(true);
    try {
      const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: outgoing.slice(-10), attachment, webSearch: webSearch && !vaultOnly, vaultOnly }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Odysseus is unavailable.");
      if (data.model) setActiveModel(data.model);
      const assistantMessage: ChatMessage = { id: crypto.randomUUID(), role: "assistant", content: data.text, sources: data.sources, notice: data.warning };
      const completed = [...outgoing, assistantMessage];
      setMessages(completed);
      setSessions((current) => [{ id: activeSession, title: userMessage.content.slice(0, 42), updated: "Just now", messages: completed }, ...current.filter((item) => item.id !== activeSession)].slice(0, 12));
      setAttachment(null);
    } catch (error) {
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", content: error instanceof Error ? error.message : "I couldn’t reach the model. Your notes and study vault are still safe locally." }]);
    } finally {
      setThinking(false);
    }
  };

  const suggestions = ["Find everything about AVL trees", "Build a 20-minute COA recap", "Quiz me on Operating Systems", "What should I study before Monday?"];

  return (
    <div className="assistant-view page-enter">
      <aside className={`chat-history ${historyOpen ? "mobile-visible" : ""}`}>
        <div><span>ODYSSEUS</span><button data-testid="chat-new" className="icon-button" onClick={newChat} aria-label="Start a new chat"><Plus /></button></div>
        <button className="active" onClick={() => setHistoryOpen(false)}><Sparkles size={16} /><span><strong>Academic strategy</strong><small>Current conversation</small></span></button>
        <span className="history-label">RECENT</span>
        {sessions.map((session) => <button className={session.id === activeSession ? "active" : ""} onClick={() => openSession(session)} key={session.id}><BookOpen size={16} /><span><strong>{session.title}</strong><small>{session.updated}</small></span></button>)}
        {sessions.length === 0 && <div className="history-empty">Your completed conversations will appear here.</div>}
        <div className="ai-privacy"><ShieldCheck /><p><strong>Protected by design</strong><span>The Gemini key stays server-side. Local vault fallback works during quota pauses.</span></p></div>
      </aside>
      <section className="chat-main">
        <header className="chat-header"><button className="icon-button history-mobile-trigger" onClick={() => setHistoryOpen((open) => !open)} aria-label="Open chat history"><BookOpen /></button><div className="odysseus-avatar"><span>Ο</span><i /></div><div><strong>Odysseus</strong><span><i /> {activeModel.toUpperCase()} · NESTOR VAULT · VISION</span></div><button data-testid="web-search-toggle" className={`web-toggle ${webSearch && !vaultOnly ? "active" : ""}`} type="button" onClick={() => { setWebSearch((value) => !value); setVaultOnly(false); }}><Globe2 size={16} /> Web search <i /></button><button data-testid="chat-settings" className={`icon-button ${settingsOpen ? "active" : ""}`} onClick={() => setSettingsOpen((open) => !open)} aria-label="Odysseus settings" aria-expanded={settingsOpen}><Settings2 /></button></header>
        {settingsOpen && <div className="chat-settings-panel"><div><span>ODYSSEUS SETTINGS</span><button className="icon-button" onClick={() => setSettingsOpen(false)} aria-label="Close settings"><X /></button></div><label><p><strong>Web grounding</strong><small>Use current Google Search sources when available.</small></p><input type="checkbox" checked={webSearch && !vaultOnly} onChange={(event) => { setWebSearch(event.target.checked); if (event.target.checked) setVaultOnly(false); }} /></label><label><p><strong>Nestor Vault only</strong><small>Stay entirely inside your uploaded college material.</small></p><input data-testid="vault-only-toggle" type="checkbox" checked={vaultOnly} onChange={(event) => setVaultOnly(event.target.checked)} /></label><div className="settings-model"><ShieldCheck /><p><strong>Server-side protection</strong><small>Your API key never enters the browser bundle.</small></p></div><button className="chat-danger" onClick={() => setSessions([])}><Trash2 size={15} /> Clear saved chat history</button></div>}
        <div ref={scrollRef} className="chat-scroll" data-testid="chat-scroll">
          {messages.length === 1 && <div className="chat-intro"><div className="large-orb"><Sparkles /></div><span>WISE COUNSEL, CLEAR ACTION</span><h1>How can I help you conquer today?</h1><p>I can search all {materialIndex.length} files, analyse an uploaded image, use current web sources, and turn the answer into a study plan.</p><div className="prompt-grid">{suggestions.map((suggestion) => <button key={suggestion} onClick={() => void sendMessage(suggestion)} disabled={thinking}><Sparkles size={16} />{suggestion}<ArrowUpRight size={15} /></button>)}</div></div>}
          <div className="messages" aria-live="polite">
            {messages.map((message) => <div className={`message ${message.role}`} key={message.id}>{message.role === "assistant" && <div className="message-avatar">Ο</div>}<div className="message-bubble">{message.notice && <div className="message-notice"><ShieldCheck size={15} />{message.notice}</div>}<p>{message.content}</p>{message.sources && message.sources.length > 0 && <div className="message-sources"><span>SOURCES</span>{message.sources.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.url}>{source.title}<ArrowUpRight size={13} /></a>)}</div>}</div></div>)}
            {thinking && <div className="message assistant"><div className="message-avatar">Ο</div><div className="thinking"><i /><i /><i /><span>Odysseus is searching the campaign...</span></div></div>}
            <div ref={endRef} />
          </div>
        </div>
        <form className="chat-composer" onSubmit={(event) => { event.preventDefault(); void sendMessage(); }}>
          {attachment && <div className="attachment-chip"><ImageIcon size={15} />{attachment.name}<button type="button" onClick={() => setAttachment(null)} aria-label="Remove attachment"><X size={14} /></button></div>}
          <textarea data-testid="chat-input" ref={inputRef} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} placeholder="Ask Odysseus about your courses, files, deadlines..." rows={1} />
          <div><input hidden type="file" accept="image/*" ref={fileInput} onChange={chooseFile} /><button type="button" className="icon-button" onClick={() => fileInput.current?.click()} aria-label="Attach image"><Paperclip /></button><button type="button" className={`composer-tool ${webSearch && !vaultOnly ? "active" : ""}`} onClick={() => { setWebSearch((value) => !value); setVaultOnly(false); }}><Globe2 size={15} /> Search web</button><span>Enter to send · Shift + Enter for new line</span><button data-testid="chat-send" className="send-button" disabled={thinking || (!input.trim() && !attachment)} aria-label="Send message"><Send size={18} /></button></div>
        </form>
      </section>
    </div>
  );
}

function TaskModal({ onClose, onCreate }: { onClose: () => void; onCreate: (task: TaskItem) => void }) {
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState<SubjectKey>("dsa");
  const [date, setDate] = useState("2026-08-03");
  const [time, setTime] = useState("20:00");
  const [priority, setPriority] = useState<"high" | "medium">("high");
  const [reminder, setReminder] = useState("1 day before");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    onCreate({ id: crypto.randomUUID(), title: title.trim(), subject, due: `${date}T${time}:00+05:30`, priority, reminder, completed: false });
  };
  return <Modal onClose={onClose}><form className="task-form" onSubmit={submit}><span className="panel-kicker">AJAX · NEW WATCH</span><h2>Create a reminder</h2><p>Agamemnon will surface it on the dashboard and in your deadline watch.</p><label>What needs to be done?<input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Submit OS assignment" /></label><div className="form-grid"><label>Subject<select value={subject} onChange={(event) => setSubject(event.target.value as SubjectKey)}>{subjects.slice(0, 7).map((item) => <option key={item.key} value={item.key}>{item.name}</option>)}</select></label><label>Priority<select value={priority} onChange={(event) => setPriority(event.target.value as "high" | "medium")}><option value="high">High</option><option value="medium">Medium</option></select></label><label>Due date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><label>Due time<input type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label></div><label>Warn me<select value={reminder} onChange={(event) => setReminder(event.target.value)}><option>1 day before</option><option>2 days before</option><option>2 hours before</option><option>30 minutes before</option><option>At a custom time</option></select></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button"><Bell size={17} /> Arm reminder</button></div></form></Modal>;
}

function SettingsModal({ onClose, requestNotifications, notify }: { onClose: () => void; requestNotifications: () => void; notify: (message: string) => void }) {
  const [reducedMotion, setReducedMotion] = useStoredState("agamemnon-reduced-motion", false);
  const [compactPanels, setCompactPanels] = useStoredState("agamemnon-compact-panels", false);

  useEffect(() => {
    document.documentElement.classList.toggle("user-reduced-motion", reducedMotion);
    document.documentElement.classList.toggle("compact-panels", compactPanels);
  }, [compactPanels, reducedMotion]);

  return <Modal onClose={onClose}><div className="settings-modal"><span className="panel-kicker">AGAMEMNON · PREFERENCES</span><h2>Command settings</h2><p>Personalise this device. These choices stay in your local browser.</p><label><span><strong>Calmer motion</strong><small>Reduce decorative transitions and floating effects.</small></span><input type="checkbox" checked={reducedMotion} onChange={(event) => setReducedMotion(event.target.checked)} /></label><label><span><strong>Compact information</strong><small>Fit more timetable and vault content on screen.</small></span><input type="checkbox" checked={compactPanels} onChange={(event) => setCompactPanels(event.target.checked)} /></label><button className="settings-action" onClick={() => void requestNotifications()}><Bell size={18} /><span><strong>Device notifications</strong><small>Enable or test Ajax deadline warnings.</small></span><ArrowUpRight size={17} /></button><button className="settings-action" onClick={() => notify("Your data is stored locally in this browser. Cloud sync is waiting for deployment setup.")}><ShieldCheck size={18} /><span><strong>Privacy & storage</strong><small>Review the current local-only protection mode.</small></span><ArrowUpRight size={17} /></button><div className="modal-actions"><button className="primary-button" onClick={onClose}>Done</button></div></div></Modal>;
}
