import { FiMoon, FiSun, FiSearch, FiX, FiUsers, FiBriefcase, FiFileText, FiInbox, FiTag } from "react-icons/fi";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { http } from "../../api/http";
import { endpoints } from "../../api/endpoints";

const PAGE_TITLES = {
  "/analytics":     "Analytics Dashboard",
  "/freelancer":    "Freelancer",
  "/business-owner":"Business Owner",
  "/manage-post":   "Manage Posts",
  "/applications":  "Job Applications",
  "/categories":    "Categories",
  "/activity-log":  "Activity Log",
};


function GlobalSearch() {
  const navigate = useNavigate();
  const [q,        setQ]        = useState("");
  const [results,  setResults]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [open,     setOpen]     = useState(false);
  const ref = useRef(null);
  const inputRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const search = useCallback(async (query) => {
    if (!query.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const [fRes, bRes] = await Promise.all([
        http.get(endpoints.users, { params: { userType: "freelancer",     page: 0, size: 5 } }),
        http.get(endpoints.users, { params: { userType: "business_owner", page: 0, size: 5 } }),
      ]);

      const toArr = (r) => {
        const d = r?.data;
        return Array.isArray(d?.content) ? d.content :
               Array.isArray(d?.data?.content) ? d.data.content :
               Array.isArray(d) ? d : [];
      };

      const q = query.toLowerCase();
      const matchUser = (u) =>
        String(u?.fullName || "").toLowerCase().includes(q) ||
        String(u?.email    || "").toLowerCase().includes(q) ||
        String(u?.phone    || "").toLowerCase().includes(q);

      const freelancers = toArr(fRes).filter(matchUser).slice(0, 4).map((u) => ({
        id:       u.id,
        label:    u.fullName || u.email || "Freelancer",
        sub:      u.email || "",
        type:     "freelancer",
        icon:     "freelancer",
        navigate: "/freelancer",
      }));

      const businesses = toArr(bRes).filter(matchUser).slice(0, 4).map((u) => ({
        id:       u.id,
        label:    u.fullName || u.companyName || "Business",
        sub:      u.email || "",
        type:     "business",
        icon:     "business",
        navigate: "/business-owner",
      }));

      // Quick nav suggestions
      const pages = [
        { id: "nav-f",  label: "Freelancers",      sub: "Manage freelancers",       icon: "page", navigate: "/freelancer"     },
        { id: "nav-b",  label: "Business Owners",   sub: "Manage business owners",   icon: "page", navigate: "/business-owner" },
        { id: "nav-p",  label: "Manage Posts",      sub: "Posts & announcements",    icon: "page", navigate: "/manage-post"    },
        { id: "nav-a",  label: "Job Applications",  sub: "View all applications",    icon: "page", navigate: "/applications"   },
        { id: "nav-c",  label: "Categories",        sub: "Manage categories",        icon: "page", navigate: "/categories"     },
      ].filter((p) => p.label.toLowerCase().includes(q) || p.sub.toLowerCase().includes(q));

      setResults([...pages.slice(0, 2), ...freelancers, ...businesses]);
    } catch (e) {
      console.error("global search:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce
  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    const t = setTimeout(() => search(q), 280);
    return () => clearTimeout(t);
  }, [q, search]);

  const iconMap = {
    freelancer: <FiUsers className="w-4 h-4 text-blue-500"     />,
    business:   <FiBriefcase className="w-4 h-4 text-violet-500" />,
    page:       <FiFileText className="w-4 h-4 text-slate-400"  />,
  };

  return (
    <div ref={ref} className="relative w-full max-w-xs">
      {/* Input */}
      <div className={`flex items-center gap-2 h-10 rounded-xl border px-3 transition-all
        ${open
          ? "border-blue-400 dark:border-blue-500 ring-2 ring-blue-100 dark:ring-blue-900/30 bg-white dark:bg-slate-800"
          : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-slate-300"
        }`}>
        <FiSearch className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search… (⌘K)"
          className="flex-1 bg-transparent outline-none text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
        />
        {q && (
          <button onClick={() => { setQ(""); setResults([]); }}
            className="text-slate-400 hover:text-slate-600 transition">
            <FiX className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (q || results.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50
                        bg-white dark:bg-slate-800
                        border border-slate-200 dark:border-slate-700
                        rounded-2xl shadow-2xl dark:shadow-black/50
                        overflow-hidden">

          {loading && (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-slate-400">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              Searching…
            </div>
          )}

          {!loading && results.length === 0 && q && (
            <div className="px-4 py-4 text-sm text-slate-400 text-center">
              No results for "<span className="font-semibold">{q}</span>"
            </div>
          )}

          {!loading && results.length > 0 && (
            <ul className="py-1.5 max-h-72 overflow-y-auto">
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => { navigate(r.navigate); setOpen(false); setQ(""); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5
                               hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors text-left"
                  >
                    <span className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                      {iconMap[r.icon] || iconMap.page}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{r.label}</p>
                      {r.sub && <p className="text-xs text-slate-400 truncate">{r.sub}</p>}
                    </div>
                    {r.type && r.type !== "page" && (
                      <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0
                                       bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 capitalize">
                        {r.type}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-2">
            <p className="text-[10px] text-slate-400">
              Press <kbd className="bg-slate-100 dark:bg-slate-700 px-1 rounded text-[10px]">↵</kbd> to navigate •
              <kbd className="bg-slate-100 dark:bg-slate-700 px-1 rounded text-[10px] ml-1">Esc</kbd> to close
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main Topbar ────────────────────────────────────────────────────────── */
export default function Topbar() {
  const { pathname } = useLocation();

  const [isDark, setIsDark] = useState(() => localStorage.getItem("THEME") === "dark");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("THEME", isDark ? "dark" : "light");
  }, [isDark]);

  const title = useMemo(() => {
    for (const [path, label] of Object.entries(PAGE_TITLES)) {
      if (pathname.startsWith(path)) return label;
    }
    return "Admin Dashboard";
  }, [pathname]);

  return (
    <header className="px-6 py-4 flex items-center justify-between gap-4 max-[640px]:px-4
                       border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
      <h1 className="text-2xl font-bold text-blue-700 dark:text-blue-300 tracking-tight whitespace-nowrap max-[640px]:text-xl">
        {title}
      </h1>

      <GlobalSearch />

      <div className="flex items-center gap-2 shrink-0">
        {/* Dark mode toggle */}
        <button
          onClick={() => setIsDark((v) => !v)}
          title={isDark ? "Switch to light" : "Switch to dark"}
          className="h-10 w-10 rounded-xl border border-slate-200 dark:border-slate-700
                     bg-white dark:bg-slate-800 flex items-center justify-center
                     hover:bg-slate-50 dark:hover:bg-slate-700 transition text-slate-500 dark:text-slate-300"
        >
          {isDark ? <FiSun className="text-lg" /> : <FiMoon className="text-lg" />}
        </button>

        {/* Logout */}
        <button
          onClick={() => { localStorage.clear(); window.location.href = "/login"; }}
          className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition"
        >
          Log out
        </button>
      </div>
    </header>
  );
}