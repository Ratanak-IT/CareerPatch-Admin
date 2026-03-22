import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchActivityLogs } from "../hooks/useActivityLog";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
import ExportMenuButton from "../components/ui/ExportMenuButton";

function timeAgo(value) {
  if (!value) return "—";
  const d   = new Date(value);
  if (isNaN(d)) return "—";
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60)    return "just now";
  if (sec < 3600)  return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 604800)return `${Math.floor(sec / 86400)}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

function formatDate(v) {
  if (!v) return "—";
  return new Date(v).toLocaleString("en-US", {
    month: "short", day: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

/* ─── Action color + icon ────────────────────────────────────────────────── */
const ACTION_META = {
  BAN_USER:           { color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",         icon: "🚫" },
  UNBAN_USER:         { color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", icon: "✅" },
  SUSPEND_USER:       { color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400", icon: "⏸️" },
  ACTIVATE_USER:      { color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",     icon: "▶️" },
  DELETE_USER:        { color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",         icon: "🗑️" },
  DELETE_POST:        { color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",         icon: "🗑️" },
  UPDATE_CATEGORY:    { color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",     icon: "✏️" },
  CREATE_CATEGORY:    { color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", icon: "➕" },
  DELETE_CATEGORY:    { color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",         icon: "🗑️" },
  ACCEPT_APPLICATION: { color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", icon: "✅" },
  REJECT_APPLICATION: { color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",         icon: "❌" },
  RESET_APPLICATION:  { color: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",    icon: "🔄" },
  BULK_DELETE:        { color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",         icon: "🗑️" },
  BULK_EXPORT:        { color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", icon: "📤" },
};

function ActionBadge({ action }) {
  const meta = ACTION_META[action] || { color: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300", icon: "•" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${meta.color}`}>
      <span>{meta.icon}</span>
      {action?.replace(/_/g, " ")}
    </span>
  );
}

function TargetBadge({ target }) {
  const colors = {
    freelancer:   "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
    business:     "bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400",
    post:         "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400",
    category:     "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
    application:  "bg-cyan-50 text-cyan-600 dark:bg-cyan-900/20 dark:text-cyan-400",
  };
  const cls = colors[target?.toLowerCase()] || "bg-slate-100 text-slate-500";
  return (
    <span className={`px-2 py-0.5 rounded-md text-xs font-semibold capitalize ${cls}`}>
      {target || "—"}
    </span>
  );
}


/* ─── Custom Select ────────────────────────────────────────────── */
function CustomSelect({ value, onChange, options, placeholder = "All" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const selected = options.find(o => o.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-2 h-10 pl-4 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm min-w-[160px] justify-between"
      >
        <span>{selected ? selected.label : placeholder}</span>
        <svg
          className={["w-4 h-4 text-slate-400 transition-transform duration-200", open ? "rotate-180" : ""].join(" ")}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-full min-w-[200px] bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 z-50 overflow-hidden py-1 max-h-60 overflow-y-auto">
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={[
                "w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-left transition-colors",
                opt.value === value
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800",
              ].join(" ")}
            >
              {opt.value === value
                ? <svg className="w-3.5 h-3.5 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                : <span className="w-3.5 shrink-0" />
              }
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Main ───────────────────────────────────────────────────────────────── */
export default function ActivityLog() {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [q,       setQ]       = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");

  const fetchLogs = useCallback(async () => {
    try {
      // Auto-delete logs older than 1 day
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      await supabase
        .from("admin_activity_log")
        .delete()
        .lt("created_at", cutoff);

      const data = await fetchActivityLogs(500);
      setLogs(data);
    } catch (e) {
      console.error("fetch logs:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    const id = setInterval(fetchLogs, 600_000);
    return () => clearInterval(id);
  }, [fetchLogs]);

  /* ── Action types for filter ── */
  const actionTypes = useMemo(() => {
    const set = new Set(logs.map((l) => l.action).filter(Boolean));
    return ["ALL", ...Array.from(set)];
  }, [logs]);

  /* ── Filtered logs ── */
  const filtered = useMemo(() => {
    return logs.filter((l) => {
      const matchQ = !q || [l.action, l.target, l.detail, l.admin_email, l.target_id]
        .some((v) => String(v || "").toLowerCase().includes(q.toLowerCase()));
      const matchAction = actionFilter === "ALL" || l.action === actionFilter;
      return matchQ && matchAction;
    });
  }, [logs, q, actionFilter]);

  /* ── Export columns ── */
  const exportCols = [
    { id: "action",      header: "Action",      accessorFn: (r) => r.action       || "—" },
    { id: "target",      header: "Target",      accessorFn: (r) => r.target       || "—" },
    { id: "detail",      header: "Detail",      accessorFn: (r) => r.detail       || "—" },
    { id: "admin_email", header: "Admin",       accessorFn: (r) => r.admin_email  || "—" },
    { id: "created_at",  header: "Date",        accessorFn: (r) => formatDate(r.created_at) },
  ];

  /* ── Stats ── */
  const stats = useMemo(() => {
    const today = logs.filter((l) => {
      const ms = new Date(l.created_at).getTime();
      return Date.now() - ms < 86400000;
    }).length;
    return { total: logs.length, today };
  }, [logs]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-800">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Activity Log</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track every admin action — who did what, when
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* <button onClick={fetchLogs}
            className="h-9 w-9 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button> */}
          <ExportMenuButton rows={filtered} columns={exportCols} filename="activity_log" title="Admin Activity Log" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Actions",    value: stats.total,        color: "text-slate-800 dark:text-white"  },
          { label: "Today",            value: stats.today,        color: "text-blue-600"                   },
          { label: "Showing",          value: filtered.length,    color: "text-violet-600"                 },
          { label: "Action Types",     value: actionTypes.length - 1, color: "text-emerald-600"           },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 px-4 py-3">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">{label}</p>
            <p className={`text-2xl font-black mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
               fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" strokeLinecap="round"/>
          </svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search actions, targets, admin…"
            className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800
                       pl-10 pr-4 outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 text-sm
                       text-slate-800 dark:text-white"
          />
        </div>
        <CustomSelect
          value={actionFilter}
          onChange={setActionFilter}
          options={actionTypes.map(a => ({ value: a, label: a === "ALL" ? "All Actions" : a.replace(/_/g, " ") }))}
          placeholder="All Actions"
        />
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-slate-500 dark:text-slate-400">
            {logs.length === 0 ? "No activity logged yet. Actions will appear here." : "No results match your filters."}
          </p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[22px] top-0 bottom-0 w-px bg-slate-100 dark:bg-slate-800" />

          <div className="space-y-1">
            {filtered.map((log, idx) => (
              <div key={log.id || idx} className="flex gap-4 group">
                {/* Dot */}
                <div className="relative z-10 w-11 shrink-0 flex items-start justify-center pt-3.5">
                  <div className="w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 shadow-sm"
                       style={{
                         background: ACTION_META[log.action]?.color.includes("red")    ? "#ef4444" :
                                     ACTION_META[log.action]?.color.includes("green")  ? "#22c55e" :
                                     ACTION_META[log.action]?.color.includes("orange") ? "#f97316" :
                                     "#3b82f6"
                       }} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 py-3 pb-4 border-b border-slate-50 dark:border-slate-800/50 group-last:border-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <ActionBadge action={log.action} />
                    <TargetBadge target={log.target} />
                    <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto shrink-0" title={formatDate(log.created_at)}>
                      {timeAgo(log.created_at)}
                    </span>
                  </div>

                  {log.detail && (
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">{log.detail}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 mt-1.5">
                    {log.admin_email && (
                      <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {log.admin_email}
                      </span>
                    )}
                    {log.target_id && (
                      <span className="text-[10px] text-slate-300 dark:text-slate-600 font-mono">
                        ID: {String(log.target_id).slice(0, 8)}…
                      </span>
                    )}
                    <span className="text-[10px] text-slate-300 dark:text-slate-600">
                      {formatDate(log.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}