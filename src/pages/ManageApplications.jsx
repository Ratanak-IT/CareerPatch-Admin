import { useCallback, useEffect, useMemo, useState } from "react";
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
import ExportMenuButton from "../components/ui/ExportMenuButton";
import { endpoints } from "../api/endpoints";

/* ── Supabase ── */
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);


function formatDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function safeText(v) {
  const s = String(v ?? "").trim();
  return s || "—";
}

/* ── Status Badge — same style as BusinessOwner UserStatusBadge ── */
function StatusBadge({ status }) {
  const map = {
    pending:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    accepted:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    rejected: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  };
  const s = (status || "pending").toLowerCase();
  return (
    <span
      className={`px-2.5 py-1 rounded-full text-xs font-bold ${map[s] || map.pending}`}
    >
      {s.charAt(0).toUpperCase() + s.slice(1)}
    </span>
  );
}

/* ── Detail Modal ── */
function ApplicationDetailModal({ app, onClose }) {
  if (!app) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-700">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">
              Application Detail
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Applied for:{" "}
              <span className="font-semibold text-blue-600">
                {app._jobTitle || app.job_title || "—"}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            ×
          </button>
        </div>
        <div className="px-6 py-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <InfoRow label="Full Name" value={app.full_name} />
            <InfoRow label="Email" value={app.email} />
            <InfoRow label="Phone" value={app.phone} />
            <InfoRow
              label="Applying For"
              value={app.job_title_apply || app._jobTitle}
            />
            <InfoRow label="Applied On" value={formatDate(app.created_at)} />
            <InfoRow
              label="Status"
              value={<StatusBadge status={app.status} />}
            />
          </div>
          {app.description && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Description
              </p>
              <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 dark:bg-slate-900 rounded-xl px-4 py-3">
                {app.description}
              </p>
            </div>
          )}
          {app.cover_letter && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <span>📝</span> Cover Letter
              </p>
              <p className="text-sm text-slate-700 leading-relaxed bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl px-4 py-3 whitespace-pre-wrap">
                {app.cover_letter}
              </p>
            </div>
          )}
          <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Job Info
            </p>
            <div className="grid grid-cols-2 gap-4">
              <InfoRow
                label="Job Title"
                value={app._jobTitle || app.job_title}
              />
              <InfoRow label="Job ID" value={app.job_id} />
              <InfoRow label="Business" value={app._businessName} />
              <InfoRow label="Business Email" value={app._businessEmail} />
            </div>
          </div>
          <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Freelancer
            </p>
            <div className="flex items-center gap-3">
              {app.applicant_avatar ? (
                <img
                  src={app.applicant_avatar}
                  alt={app.full_name}
                  className="w-10 h-10 rounded-full object-cover border border-slate-200"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                  {(app.full_name || "?")[0].toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-white">
                  {app.full_name || "—"}
                </p>
                <p className="text-xs text-slate-500">{app.email || "—"}</p>
              </div>
            </div>
          </div>
          {(app.cv_url || app.overview_url) && (
            <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Attachments
              </p>
              <div className="flex gap-3">
                {app.cv_url && (
                  <a
                    href={app.cv_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 text-blue-600 text-sm font-semibold hover:bg-blue-100 transition"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    CV / Resume
                  </a>
                )}
                {app.overview_url && (
                  <a
                    href={app.overview_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-50 text-violet-600 text-sm font-semibold hover:bg-violet-100 transition"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    Portfolio
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
        {label}
      </p>
      <p className="text-sm text-slate-800 dark:text-slate-200">
        {value || "—"}
      </p>
    </div>
  );
}

/* ── Main ── */
export default function ManageApplications() {
  const [applications, setApplications] = useState([]);
  const [jobs, setJobs] = useState({});
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(null);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("job_applications")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setApplications(data || []);
    } catch (e) {
      console.error("fetch applications error:", e);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await http.get(endpoints.jobs, {
        params: { page: 0, size: 9999 },
      });
      const raw = res?.data;
      const list = Array.isArray(raw?.content)
        ? raw.content
        : Array.isArray(raw?.data?.content)
          ? raw.data.content
          : Array.isArray(raw)
            ? raw
            : [];
      const map = {};
      list.forEach((j) => {
        // store both id forms and userId
        const id = j.id ?? j.jobId;
        if (id)
          map[String(id)] = {
            title: j.title || "—",
            userId: j.userId ?? j.businessOwnerId ?? j.user?.id ?? null,
          };
      });
      setJobs(map);
    } catch (e) {
      console.error("fetch jobs error:", e);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await http.get(endpoints.users, {
        params: { userType: "business_owner", page: 0, size: 9999 },
      });
      const raw = res?.data;
      const pageData = raw?.data ?? raw;
      const list = Array.isArray(pageData?.content)
        ? pageData.content
        : Array.isArray(pageData)
          ? pageData
          : [];
      const map = {};
      list.forEach((u) => {
        if (u?.id)
          map[String(u.id)] = {
            fullName: u.fullName || u.companyName || u.name || "—",
            email: u.email || "—",
            avatar: u.profileImageUrl || u.profileImage || null,
          };
      });
      setUsers(map);
    } catch (e) {
      console.error("fetch users error:", e);
    }
  }, []);

  useEffect(() => {
    fetchApplications();
    fetchJobs();
    fetchUsers();
  }, [fetchApplications, fetchJobs, fetchUsers]);

  /* ── Enrich: resolve business name from job → userId → user ── */
  const enriched = useMemo(() => {
    return applications.map((app) => {
      const jobId = String(app.job_id ?? "");
      const job = jobs[jobId] || {};
      const userId = job.userId ? String(job.userId) : null;
      const bizUser = userId ? users[userId] || {} : {};
      return {
        ...app,
        _jobTitle: job.title || app.job_title || "—",
        _businessName: bizUser.fullName || "—",
        _businessEmail: bizUser.email || "—",
        _businessAvatar: bizUser.avatar || null,
      };
    });
  }, [applications, jobs, users]);

  

  /* ── Columns ── */
  const columns = useMemo(
    () => [
      {
        id: "no",
        header: "No",
        cell: ({ row, table }) => {
          const { pageIndex, pageSize } = table.getState().pagination;
          return <span>{pageIndex * pageSize + row.index + 1}.</span>;
        },
      },
      {
        id: "applicant",
        header: "Freelancer",
        accessorFn: (r) => r.full_name,
        cell: ({ row }) => {
          const r = row.original;
          return (
            <div className="flex items-center gap-2.5">
              {r.applicant_avatar ? (
                <img
                  src={r.applicant_avatar}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold shrink-0">
                  {(r.full_name || "?")[0].toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                  {r.full_name || "—"}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {r.email || "—"}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        id: "job",
        header: "Job Applied",
        accessorFn: (r) => r._jobTitle,
        cell: ({ getValue }) => (
          <span className="text-sm font-semibold text-slate-800 dark:text-white">
            {getValue()}
          </span>
        ),
      },
      {
        id: "business",
        header: "Business (To)",
        accessorFn: (r) => r._businessName,
        cell: ({ row }) => {
          const r = row.original;
          if (r._businessName === "—")
            return <span className="text-slate-400">—</span>;
          return (
            <div className="flex items-center gap-2">
              {r._businessAvatar ? (
                <img
                  src={r._businessAvatar}
                  alt=""
                  className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 text-[10px] font-bold shrink-0">
                  {(r._businessName || "?")[0].toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-white">
                  {r._businessName}
                </p>
                <p className="text-xs text-slate-400">{r._businessEmail}</p>
              </div>
            </div>
          );
        },
      },
      {
        id: "date",
        header: "Date",
        accessorFn: (r) => r.created_at,
        cell: ({ getValue }) => (
          <span className="text-sm text-slate-500">
            {formatDate(getValue())}
          </span>
        ),
      },
      {
        id: "action",
        header: "Action",
        cell: ({ row }) => (
          <button
            onClick={() => setSelected(row.original)}
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold transition"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            View
          </button>
        ),
      },
    ],
    [],
  );

  const globalFilterFn = useCallback((row, _colId, filterValue) => {
    const q = String(filterValue || "")
      .toLowerCase()
      .trim();
    if (!q) return true;
    const r = row.original;
    return [
      r.full_name,
      r.email,
      r._jobTitle,
      r._businessName,
      r._businessEmail,
    ].some((v) =>
      String(v || "")
        .toLowerCase()
        .includes(q),
    );
  }, []);

  const table = useReactTable({
    data: enriched,
    columns,
    state: { globalFilter: q, pagination },
    onGlobalFilterChange: (v) => {
      setQ(String(v ?? ""));
      setPagination((p) => ({ ...p, pageIndex: 0 }));
    },
    onPaginationChange: setPagination,
    globalFilterFn,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const { pageIndex } = pagination;
  const pageCount = table.getPageCount();

  // Same pageNums as BusinessOwner
  const pageNums = useMemo(() => {
    const n = Math.min(pageCount, 8);
    return Array.from({ length: n }, (_, i) => i);
  }, [pageCount]);

  const totalShown = table.getFilteredRowModel().rows.length;

  return (
    <>
      <div className="space-y-5">
        {/* Header — same as BusinessOwner */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
              Job Applications
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              All applications from freelancers to business job posts
            </p>
          </div>
          <button
            onClick={() => {
              fetchApplications();
              fetchJobs();
              fetchUsers();
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm font-semibold transition"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
        </div>

        {/* Stats cards — same as BusinessOwner */}
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: "Total",
              value: applications.length,
              color: "text-slate-800 dark:text-white",
            },
            {
              label: "Pending",
              value: applications.filter(
                (a) => !a.status || a.status === "pending",
              ).length,
              color: "text-yellow-600",
            },
            {
              label: "Accepted",
              value: applications.filter((a) => a.status === "accepted").length,
              color: "text-emerald-600",
            },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 px-5 py-4 shadow-sm"
            >
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                {label}
              </p>
              <p className={`text-3xl font-black mt-1 ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Card — same as BusinessOwner */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
          {/* Toolbar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative">
                <svg
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
                </svg>
                <input
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setPagination((p) => ({ ...p, pageIndex: 0 }));
                  }}
                  placeholder="Search by freelancer, job, or business…"
                  className="h-11 w-full sm:w-[380px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-10 pr-4 outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
                />
              </div>
              <span className="text-slate-500 dark:text-slate-400 font-semibold text-sm">
                {totalShown} application{totalShown !== 1 ? "s" : ""}
              </span>
              <ExportMenuButton
                rows={table.getFilteredRowModel().rows.map((r) => r.original)}
                columns={[
                  {
                    id: "full_name",
                    header: "Freelancer",
                    accessorFn: (r) => r.full_name || "—",
                  },
                  {
                    id: "email",
                    header: "Email",
                    accessorFn: (r) => r.email || "—",
                  },
                  {
                    id: "phone",
                    header: "Phone",
                    accessorFn: (r) => r.phone || "—",
                  },
                  {
                    id: "_jobTitle",
                    header: "Job Applied",
                    accessorFn: (r) => r._jobTitle || "—",
                  },
                  {
                    id: "_businessName",
                    header: "Business",
                    accessorFn: (r) => r._businessName || "—",
                  },
                  {
                    id: "_businessEmail",
                    header: "Business Email",
                    accessorFn: (r) => r._businessEmail || "—",
                  },
                  {
                    id: "status",
                    header: "Status",
                    accessorFn: (r) => r.status || "pending",
                  },
                  {
                    id: "created_at",
                    header: "Date",
                    accessorFn: (r) =>
                      r.created_at
                        ? new Date(r.created_at).toLocaleDateString()
                        : "—",
                  },
                ]}
                filename="applications"
                title="Job Applications"
              />
            </div>
          </div>

          {/* Table — same as BusinessOwner */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <table className="w-full min-w-[860px] border-separate border-spacing-0">
              <thead>
                {table.getHeaderGroups().map((hg) => (
                  <tr
                    key={hg.id}
                    className="bg-gradient-to-r from-slate-50 to-blue-50/30 dark:from-slate-800 dark:to-slate-800"
                  >
                    {hg.headers.map((h) => (
                      <th
                        key={h.id}
                        className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap"
                      >
                        {flexRender(h.column.columnDef.header, h.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        Loading applications…
                      </div>
                    </td>
                  </tr>
                ) : table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      No applications found.
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-blue-50/40 dark:hover:bg-slate-800/60 transition-colors"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className="px-5 py-4 text-sm border-b border-slate-100 dark:border-slate-800"
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
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
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <FiChevronLeft />
            </button>

            <div className="flex items-center gap-2">
              {pageNums.map((p) => (
                <button
                  key={p}
                  onClick={() => table.setPageIndex(p)}
                  className={[
                    "h-9 w-9 rounded-full font-semibold transition",
                    p === pageIndex
                      ? "bg-blue-600 text-white"
                      : "text-slate-600 hover:bg-slate-100",
                  ].join(" ")}
                >
                  {p + 1}
                </button>
              ))}
            </div>

            <button
              className="h-9 w-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 grid place-items-center disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition text-slate-600 dark:text-slate-300"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <FiChevronRight />
            </button>
          </div>
        </div>
      </div>

      {selected && (
        <ApplicationDetailModal
          app={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
