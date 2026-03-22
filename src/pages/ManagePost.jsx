import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
} from "@tanstack/react-table";
import { createClient } from "@supabase/supabase-js";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { http } from "../api/http";
import { endpoints } from "../api/endpoints";
import ExportMenuButton from "../components/ui/ExportMenuButton";

/* ─── Supabase ─────────────────────────────────────────────────── */
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const TABS      = { SERVICES: "services", JOBS: "jobs" };
const POLL_MS   = 600_000;
const PAGE_SIZE = 10;

/* ─── Status config — same pattern as UserStatusBadge ─────────── */
const STATUS_CFG = {
  ACTIVE:   { label: "ACTIVE",   cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"  },
  INACTIVE: { label: "INACTIVE", cls: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"          },
  OPEN:     { label: "OPEN",     cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"  },
  DRAFT:    { label: "DRAFT",    cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"  },
  CLOSED:   { label: "CLOSED",   cls: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"          },
};

/* ─── Status modal options ─────────────────────────────────────── */
const SERVICE_OPTIONS = [
  {
    key: "ACTIVE", label: "Activate",
    desc: "Post is visible and accessible on the platform.",
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    color: "bg-green-500 hover:bg-green-600",
  },
  {
    key: "INACTIVE", label: "Deactivate",
    desc: "Hide this post from the platform. Can be reactivated.",
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    color: "bg-red-500 hover:bg-red-600",
  },
];

const JOB_OPTIONS = [
  {
    key: "OPEN", label: "Open",
    desc: "Post is visible and accepting applications.",
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    color: "bg-green-500 hover:bg-green-600",
  },
  {
    key: "DRAFT", label: "Draft",
    desc: "Post is saved but not visible to applicants.",
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>,
    color: "bg-amber-500 hover:bg-amber-600",
  },
  {
    key: "CLOSED", label: "Close",
    desc: "Post is no longer accepting applications.",
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="9"/><path strokeLinecap="round" d="M4.93 4.93l14.14 14.14"/></svg>,
    color: "bg-red-500 hover:bg-red-600",
  },
];

/* ─── Helpers ──────────────────────────────────────────────────── */
function normalizeList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.content)) return data.content;
  if (Array.isArray(data.data))    return data.data;
  return [];
}

function safeText(v, fallback = "Unknown") {
  const s = String(v ?? "").trim();
  return s || fallback;
}

function formatDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function getRowId(item) {
  return String(item._postId ?? item.id ?? item.jobId ?? item.serviceId ?? Math.random());
}

function getInitials(name) {
  if (!name) return "?";
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join("");
}

const AVATAR_COLORS = [
  "bg-violet-500","bg-blue-500","bg-emerald-500","bg-amber-500",
  "bg-pink-500","bg-cyan-500","bg-rose-500","bg-indigo-500",
];
function avatarColor(name) {
  if (!name) return AVATAR_COLORS[0];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

async function logActivity({ action, target, targetId, detail }) {
  try {
    const adminEmail = localStorage.getItem("ADMIN_EMAIL") || "admin";
    await supabase.from("admin_activity_log").insert({
      action, target, target_id: targetId || null,
      detail, admin_email: adminEmail,
      created_at: new Date().toISOString(),
    });
  } catch (e) { console.warn("logActivity:", e?.message); }
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
        className="inline-flex items-center gap-2 h-11 pl-4 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm min-w-[160px] justify-between"
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
        <div className="absolute left-0 top-full mt-1.5 w-full min-w-[180px] bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 z-50 overflow-hidden py-1">
          {[{ value: "", label: placeholder }, ...options].map(opt => (
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

/* ─── PostStatusBadge — same style as UserStatusBadge ─────────── */
function PostStatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.ACTIVE;
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

/* ─── PostStatusModal — same pattern as UserStatusModal ───────── */
function PostStatusModal({ post, onClose, onUpdated }) {
  const [selected, setSelected] = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const postType      = post?._postType || "service";
  const options       = postType === "job" ? JOB_OPTIONS : SERVICE_OPTIONS;
  const currentStatus = post?.status || (postType === "job" ? "OPEN" : "ACTIVE");
  const title         = post?.title || post?.jobTitle || post?.name || "Post";

  const handleApply = async () => {
    if (!selected) { setError("Please select an action."); return; }
    setError(""); setLoading(true);
    try {
      // 1. Save to Supabase — source of truth
      const { error: sbError } = await supabase
        .from("admin_post_status")
        .upsert({
          post_id:    post._postId,
          post_type:  postType,
          status:     selected.key,
          title,
          snapshot:   JSON.stringify({ ...post, status: selected.key }),
          updated_at: new Date().toISOString(),
        }, { onConflict: "post_id" });
      if (sbError) throw sbError;

      // 2. Try API update — graceful fail
      try {
        const apiUrl = postType === "job"
          ? `${endpoints.jobs}/${post._postId}`
          : `${endpoints.services}/${post._postId}`;
        const rawCatId = post._catId || post.category?.id
                      || (typeof post.category === "string" ? post.category : null)
                      || post.categoryId || null;
        await http.put(apiUrl, {
          title:       post.title       || "",
          description: post.description || "",
          categoryId:  rawCatId,
          status:      selected.key,
          ...(postType === "job"
            ? { budget: post.budget ?? 0, jobImages: post.jobImages ?? post.imageUrls ?? [] }
            : { imageUrls: post.imageUrls ?? post.jobImages ?? [] }
          ),
        });
      } catch (apiErr) {
        console.warn("[ManagePost] API update skipped:", apiErr?.response?.status, apiErr?.response?.data?.message);
      }

      // 3. Log activity
      await logActivity({
        action: `SET_POST_${selected.key}`, target: postType,
        targetId: post._postId, detail: `Set "${title}" → ${selected.key}`,
      });

      onUpdated?.(post._postId, selected.key);
      onClose();
    } catch (e) {
      setError(e?.message || "Failed to update post status.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Manage Post Status</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {title} • <span className="font-semibold capitalize">{postType}</span> • Current: <PostStatusBadge status={currentStatus} />
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-600 text-sm rounded-xl px-4 py-2.5">{error}</div>
          )}

          <div className="space-y-2">
            {options.filter(o => o.key !== currentStatus).map(opt => (
              <button key={opt.key} type="button" onClick={() => setSelected(opt)}
                className={["w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all",
                  selected?.key === opt.key
                    ? "border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-900",
                ].join(" ")}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 ${opt.color.split(" ")[0]}`}>
                  {opt.icon}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 dark:text-white">{opt.label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{opt.desc}</p>
                </div>
                {selected?.key === opt.key && (
                  <svg className="w-5 h-5 text-blue-500 shrink-0 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
              </button>
            ))}

            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700">
              <span className="text-xs text-slate-400">Current status:</span>
              <PostStatusBadge status={currentStatus} />
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition">
              Cancel
            </button>
            <button type="button" onClick={handleApply} disabled={loading || !selected}
              className={["flex-1 py-2.5 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50",
                selected ? selected.color : "bg-slate-400",
              ].join(" ")}
            >
              {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {selected ? selected.label : "Select an action"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main ─────────────────────────────────────────────────────── */
export default function ManagePost() {
  const [tab,          setTab]          = useState(TABS.SERVICES);
  const [pagination,   setPagination]   = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [loading,      setLoading]      = useState(true);
  const [rawItems,     setRawItems]     = useState([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [catFilter,    setCatFilter]    = useState("");
  const [modalPost,    setModalPost]    = useState(null);
  const [postStatuses, setPostStatuses] = useState({});

  /* ── Fetch — same logic as doc 3, same data structure ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const url      = tab === TABS.JOBS ? endpoints.jobs : endpoints.services;
      const postType = tab === TABS.JOBS ? "job" : "service";

      const [postsRes, freelancersRes, ownersRes, supabaseRes, catsRes] = await Promise.allSettled([
        http.get(url, { params: { page: 0, size: 999 } }),
        http.get(endpoints.users, { params: { userType: "freelancer",     page: 0, size: 9999 } }),
        http.get(endpoints.users, { params: { userType: "business_owner", page: 0, size: 9999 } }),
        supabase.from("admin_post_status").select("post_id, status, title, snapshot").eq("post_type", postType),
        http.get("/api/jobs-service/categories"),
      ]);

      // User map
      const userMap = {};
      for (const res of [freelancersRes, ownersRes]) {
        if (res.status !== "fulfilled") continue;
        const raw      = res.value?.data;
        const pageData = raw?.data ?? raw;
        const list     = Array.isArray(pageData?.content) ? pageData.content
                       : Array.isArray(pageData) ? pageData : [];
        list.forEach(u => {
          if (u?.id) userMap[String(u.id)] = {
            name:   u.fullName || u.companyName || u.name || u.email || null,
            avatar: u.profileImageUrl || u.profileImage || u.avatarUrl || u.imageUrl || null,
          };
        });
      }

      // Category map
      const catRaw  = catsRes.status === "fulfilled" ? catsRes.value?.data : null;
      const catList = Array.isArray(catRaw) ? catRaw
                    : Array.isArray(catRaw?.data) ? catRaw.data
                    : Array.isArray(catRaw?.content) ? catRaw.content : [];
      const catMap  = {};
      catList.forEach(c => { if (c?.id) catMap[String(c.id)] = c.name; });

      // Supabase status + snapshot
      const statusRows = supabaseRes.status === "fulfilled" ? (supabaseRes.value?.data || []) : [];
      const statusMap  = {};
      const snapMap    = {};
      statusRows.forEach(r => {
        statusMap[r.post_id] = r.status;
        if (r.snapshot) { try { snapMap[r.post_id] = JSON.parse(r.snapshot); } catch {} }
        else if (r.title) { snapMap[r.post_id] = { id: r.post_id, title: r.title }; }
      });

      const NON_DEFAULT = new Set(["INACTIVE", "DRAFT", "CLOSED"]);
      const hiddenIds   = new Set(statusRows.filter(r => NON_DEFAULT.has(r.status)).map(r => r.post_id));

      // API posts
      const items = postsRes.status === "fulfilled" ? normalizeList(postsRes.value?.data) : [];
      const apiMap = {};
      items.forEach(it => {
        const id = String(it.id ?? it.jobId ?? it.serviceId ?? it._id);
        apiMap[id] = it;
      });

      // Recover hidden posts missing from API
      const missingIds = [...hiddenIds].filter(id => !apiMap[id]);
      if (missingIds.length > 0) {
        await Promise.allSettled(missingIds.map(async id => {
          try {
            const r  = await http.get(`${url}/${id}`);
            const it = r.data?.data ?? r.data;
            apiMap[id] = (it && (it.id || it.title)) ? it : (snapMap[id] || { id });
          } catch { apiMap[id] = snapMap[id] || { id }; }
        }));
      }

      // Merge
      const allIds = new Set([...Object.keys(apiMap), ...hiddenIds]);
      const merged = [...allIds].map(id => {
        const it = apiMap[id];
        if (!it) return null;
        const userId   = String(it.userId ?? it.freelancerId ?? it.businessOwnerId ?? "");
        const fromUser = userMap[userId] || null;
        const rawCatId = it.categoryId || (typeof it.category === "string" ? it.category : null) || it.category?.id || null;
        const catId    = rawCatId ? String(rawCatId) : null;
        const catName  = (catId && catMap[catId]) ? catMap[catId]
                       : (typeof it.category === "object" ? it.category?.name : null) || it.categoryName || null;
        return {
          ...it,
          _postId:     id,
          _postType:   postType,
          _fromName:   fromUser?.name   || null,
          _fromAvatar: fromUser?.avatar || null,
          _catName:    catName,
          status: statusMap[id] ?? (postType === "job" ? "OPEN" : "ACTIVE"),
        };
      }).filter(Boolean);

      setRawItems(merged);
      setPostStatuses(statusMap);
    } catch (e) {
      console.error("ManagePost fetch error:", e);
      setRawItems([]);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { setPagination(p => ({ ...p, pageIndex: 0 })); setGlobalFilter(""); setCatFilter(""); }, [tab]);
  useEffect(() => {
    fetchData();
    const id = window.setInterval(fetchData, POLL_MS);
    return () => window.clearInterval(id);
  }, [fetchData]);

  /* ── Modal updated callback ── */
  const handleStatusUpdated = useCallback((postId, newStatus) => {
    setPostStatuses(prev => ({ ...prev, [postId]: newStatus }));
    setRawItems(prev => prev.map(it => it._postId === postId ? { ...it, status: newStatus } : it));
  }, []);

  /* ── Category options for filter ── */
  const categoryOptions = useMemo(() => {
    const set = new Set(rawItems.map(i => i._catName).filter(Boolean));
    return Array.from(set).sort();
  }, [rawItems]);

  const filteredData = useMemo(() => {
    if (!catFilter) return rawItems;
    return rawItems.filter(i => i._catName === catFilter);
  }, [rawItems, catFilter]);

  /* ── Columns — same structure as BusinessOwner ── */
  const columns = useMemo(() => [
    {
      id: "no",
      header: "No",
      cell: ({ row, table }) => {
        const { pageIndex, pageSize } = table.getState().pagination;
        return <span>{pageIndex * pageSize + row.index + 1}.</span>;
      },
    },
    {
      id: "title",
      header: "Title",
      accessorFn: item => safeText(item.title || item.jobTitle || item.name || item.serviceName, "—"),
      cell: ({ getValue }) => (
        <span className="font-semibold text-slate-800 dark:text-white">{getValue()}</span>
      ),
    },
    {
      id: "from",
      header: "From",
      accessorFn: item => item._fromName || null,
      cell: ({ row, getValue }) => {
        const name   = getValue();
        const avatar = row.original._fromAvatar;
        if (!name) return <span className="text-slate-400">—</span>;
        return (
          <div className="flex items-center gap-2">
            {avatar ? (
              <img src={avatar} alt={name}
                className="w-7 h-7 rounded-full object-cover flex-shrink-0 border border-slate-200"
                onError={e => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
              />
            ) : null}
            <div className={["w-7 h-7 rounded-full items-center justify-center text-white text-[10px] font-bold flex-shrink-0",
              avatarColor(name), avatar ? "hidden" : "flex"].join(" ")}>
              {getInitials(name)}
            </div>
            <span className="text-slate-700 dark:text-slate-300 text-sm">{name}</span>
          </div>
        );
      },
    },
    {
      id: "category",
      header: "Category",
      accessorFn: item => item._catName || null,
      cell: ({ getValue }) => {
        const val = getValue();
        if (!val) return <span className="text-slate-400">—</span>;
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 border border-violet-100 dark:border-violet-800 whitespace-nowrap">
            {val}
          </span>
        );
      },
    },
    {
      id: "posted",
      header: "Posted",
      accessorFn: item => item.createdAt || item.createAt || item.created_date,
      cell: ({ getValue }) => (
        <span className="text-slate-500 text-sm tabular-nums">{formatDate(getValue())}</span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const item   = row.original;
        const status = postStatuses[item._postId] || item.status || (item._postType === "job" ? "OPEN" : "ACTIVE");
        return <PostStatusBadge status={status} />;
      },
    },
    {
      id: "action",
      header: "Action",
      cell: ({ row }) => (
        <button
          onClick={() => setModalPost(row.original)}
          className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold transition"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
          Status
        </button>
      ),
    },
  ], [postStatuses]);

  /* ── TanStack table — same config as BusinessOwner ── */
  const table = useReactTable({
    data: filteredData,
    columns,
    state: { globalFilter, pagination },
    onPaginationChange: setPagination,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: "includesString",
    getCoreRowModel:       getCoreRowModel(),
    getFilteredRowModel:   getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: false,
  });

  /* ── pageNums — same as BusinessOwner ── */
  const pageNums = useMemo(() => {
    const n = Math.min(table.getPageCount(), 8);
    return Array.from({ length: n }, (_, i) => i);
  }, [table.getPageCount()]);

  const activeCount   = rawItems.filter(i => (postStatuses[i._postId] || i.status) === "ACTIVE" || (postStatuses[i._postId] || i.status) === "OPEN").length;
  const inactiveCount = rawItems.filter(i => ["INACTIVE","DRAFT","CLOSED"].includes(postStatuses[i._postId] || i.status)).length;

  /* ── Render — identical structure to BusinessOwner ── */
  return (
    <>
    <div className="space-y-5">

      {/* Page header — same as BusinessOwner */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Manage Posts</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{rawItems.length} on this page</p>
        </div>
      </div>

      {/* Stats — same as BusinessOwner */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total",    value: rawItems.length, color: "text-slate-800 dark:text-white" },
          { label: "Active",   value: activeCount,     color: "text-emerald-600"               },
          { label: "Inactive", value: inactiveCount,   color: "text-red-500"                   },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 px-5 py-4 shadow-sm">
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{label}</p>
            <p className={`text-3xl font-black mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Card — same as BusinessOwner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">

        {/* Toolbar — same layout as BusinessOwner */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 flex-wrap">

            {/* Tab toggle (replaces Specialized in BusinessOwner) */}
            <div className="inline-flex rounded-xl border border-violet-200 dark:border-slate-700 overflow-hidden">
              {[
                { key: TABS.SERVICES, label: "Freelancer Post"     },
                { key: TABS.JOBS,     label: "Business Owner Post" },
              ].map(({ key, label }) => (
                <button key={key} onClick={() => setTab(key)}
                  className={[
                    "px-5 h-11 text-sm font-semibold transition-all",
                    tab === key ? "bg-violet-600 text-white" : "text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-slate-800",
                  ].join(" ")}
                >{label}</button>
              ))}
            </div>

            {/* Category filter — custom select */}
            <CustomSelect
              value={catFilter}
              onChange={val => { setCatFilter(val); setPagination(p => ({ ...p, pageIndex: 0 })); }}
              placeholder="All Categories"
              options={categoryOptions.map(c => ({ value: c, label: c }))}
            />

            {/* Search — same as BusinessOwner */}
            <input
              value={globalFilter}
              onChange={e => { setGlobalFilter(e.target.value); setPagination(p => ({ ...p, pageIndex: 0 })); }}
              placeholder="Search by title, category, author…"
              className="h-11 w-full sm:w-[380px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
            />
            <ExportMenuButton
              rows={filteredData}
              columns={[
                { id: "title",    header: "Title",    accessorFn: item => item?.title || item?.jobTitle || item?.serviceName || "—" },
                { id: "from",     header: "From",     accessorFn: item => item?._fromName || "—" },
                { id: "category", header: "Category", accessorFn: item => item?._catName  || "—" },
                { id: "status",   header: "Status",   accessorFn: item => item?.status    || "—" },
                { id: "posted",   header: "Posted",   accessorFn: item => item?.createdAt ? new Date(item.createdAt).toLocaleDateString() : "—" },
              ]}
              filename="manage_posts"
              title="Manage Posts"
            />
          </div>
        </div>

        {/* Table — same as BusinessOwner */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mt-4">
          <table className="w-full min-w-[860px] border-separate border-spacing-0">
            <thead>
              {table.getHeaderGroups().map(hg => (
                <tr key={hg.id} className="bg-gradient-to-r from-slate-50 to-blue-50/30 dark:from-slate-800 dark:to-slate-800">
                  {hg.headers.map(header => (
                    <th key={header.id}
                      className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-10 text-center text-slate-600">Loading...</td>
                </tr>
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-10 text-center text-slate-600">No posts found.</td>
                </tr>
              ) : (
                table.getRowModel().rows.map(row => (
                  <tr key={row.id}>
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-5 py-4 text-sm border-b border-slate-100 dark:border-slate-800">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination — identical to BusinessOwner */}
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            className="h-9 w-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 grid place-items-center disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition text-slate-600 dark:text-slate-300"
            onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}
          ><FiChevronLeft /></button>

          <div className="flex items-center gap-2">
            {pageNums.map(p => (
              <button key={p} onClick={() => table.setPageIndex(p)}
                className={["h-9 w-9 rounded-full font-semibold",
                  p === pagination.pageIndex ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100",
                ].join(" ")}
              >{p + 1}</button>
            ))}
          </div>

          <button
            className="h-9 w-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 grid place-items-center disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition text-slate-600 dark:text-slate-300"
            onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}
          ><FiChevronRight /></button>
        </div>

      </div>
    </div>

    {/* Modal — same pattern as UserStatusModal in BusinessOwner */}
    {modalPost && (
      <PostStatusModal
        post={modalPost}
        onClose={() => setModalPost(null)}
        onUpdated={handleStatusUpdated}
      />
    )}
    </>
  );
}