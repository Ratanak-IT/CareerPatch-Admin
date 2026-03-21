import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
} from "@tanstack/react-table";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import UserStatusModal, {
  UserStatusBadge,
} from "../components/ui/UserStatusModal";
import { createClient } from "@supabase/supabase-js";
import { http } from "../api/http";
import { endpoints } from "../api/endpoints";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);

const POLL_MS = 10_000;

function normType(v) {
  return String(v ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s_-]/g, "");
}

function isBusinessUser(u) {
  const t = normType(u?.userType);
  return t === "BUSINESSOWNER";
}

function safeText(v, fallback = "Unknown") {
  const s = String(v ?? "").trim();
  return s ? s : fallback;
}

/* ─── Custom Select ────────────────────────────────────────────── */
function CustomSelect({ value, onChange, options, placeholder = "All" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 h-11 pl-4 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm min-w-[160px] justify-between"
      >
        <span>{selected ? selected.label : placeholder}</span>
        <svg
          className={[
            "w-4 h-4 text-slate-400 transition-transform duration-200",
            open ? "rotate-180" : "",
          ].join(" ")}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 w-full min-w-[180px] bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 z-50 overflow-hidden py-1">
          {[{ value: "", label: placeholder }, ...options].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={[
                "w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-left transition-colors",
                opt.value === value
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800",
              ].join(" ")}
            >
              {opt.value === value ? (
                <svg
                  className="w-3.5 h-3.5 text-blue-500 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <span className="w-3.5 shrink-0" />
              )}
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BusinessOwner() {
  const [rows, setRows] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState("");
  const [spec, setSpec] = useState("");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusUser, setStatusUser] = useState(null);
  const [userStatuses, setUserStatuses] = useState({});

  const fetchOwners = useCallback(async () => {
    try {
      setLoading(true);
      const res = await http.get(endpoints.users, {
        params: {
          userType: "business_owner",
          page: pagination.pageIndex,
          size: pagination.pageSize,
          sortBy: "createdAt",
        },
      });
      const top = res?.data;
      const pageData = top?.data ?? top ?? {};
      const raw = Array.isArray(pageData?.content) ? pageData.content : [];
      const users = raw.filter(Boolean);
      setTotalPages(Number(pageData?.totalPages) || 1);
      if (!users.length) {
        setRows([]);
        return;
      }
      const { data: statusRows } = await supabase
        .from("admin_user_status")
        .select("user_id, status")
        .in(
          "user_id",
          users.map((u) => String(u.id)),
        );
      const statusMap = {};
      (statusRows || []).forEach((r) => {
        statusMap[r.user_id] = r.status;
      });
      setRows(
        users.map((u) => ({
          ...u,
          accountStatus: statusMap[String(u.id)] || "ACTIVE",
        })),
      );
      setUserStatuses(statusMap);
    } catch (error) {
      console.error("Error fetching business owners:", error);
      setRows([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [pagination.pageIndex, pagination.pageSize]);

  useEffect(() => {
    fetchOwners();
    const pollId = window.setInterval(fetchOwners, POLL_MS);
    const channel = supabase
      .channel("admin_user_status_business")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "admin_user_status" },
        (payload) => {
          const { new: row } = payload;
          if (!row?.user_id) return;
          setUserStatuses((prev) => ({ ...prev, [row.user_id]: row.status }));
          setRows((prev) =>
            prev.map((u) =>
              String(u.id) === String(row.user_id)
                ? { ...u, accountStatus: row.status }
                : u,
            ),
          );
        },
      )
      .subscribe();
    return () => {
      window.clearInterval(pollId);
      supabase.removeChannel(channel);
    };
  }, [fetchOwners]);

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
        accessorFn: (u) => safeText(u?.fullName ?? u?.name, "Unknown"),
        id: "name",
        header: "Name",
        cell: ({ getValue }) => (
          <span className="font-semibold text-slate-800 dark:text-white">
            {getValue()}
          </span>
        ),
      },
      {
        accessorFn: (u) => safeText(u?.phone, "Unknown"),
        id: "phone",
        header: "Phone",
      },
      {
        accessorFn: (u) => safeText(u?.email, "Unknown"),
        id: "email",
        header: "Email address",
      },
      {
        accessorFn: (u) => safeText(u?.address ?? u?.location, "Unknown"),
        id: "location",
        header: "Location",
      },
      {
        accessorFn: (u) =>
          safeText(
            u?.industry ?? u?.specialized ?? u?.specialization,
            "Unknown",
          ),
        id: "industry",
        header: "Specialized",
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const status =
            userStatuses[String(row.original.id)] ||
            row.original.accountStatus ||
            "ACTIVE";
          return <UserStatusBadge status={status} />;
        },
      },
      {
        id: "action",
        header: "Action",
        cell: ({ row }) => (
          <button
            onClick={() => {
              setStatusUser(row.original);
              setStatusOpen(true);
            }}
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold transition"
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
                d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
              />
            </svg>
            Status
          </button>
        ),
      },
    ],
    [userStatuses],
  );

  const specializations = useMemo(() => {
    const set = new Set(
      rows.map((u) =>
        safeText(u?.industry ?? u?.specialized ?? u?.specialization, "Unknown"),
      ),
    );
    return Array.from(set);
  }, [rows]);

  const data = useMemo(() => {
    return rows
      .filter((u) => isBusinessUser(u) || normType(u?.userType) === "")
      .filter((u) => {
        if (!spec) return true;
        return (
          safeText(
            u?.industry ?? u?.specialized ?? u?.specialization,
            "Unknown",
          ).toLowerCase() === spec.toLowerCase()
        );
      });
  }, [rows, spec]);

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter, pagination },
    pageCount: totalPages,
    manualPagination: true,
    onPaginationChange: setPagination,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: "includesString",
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const pageNums = useMemo(() => {
    const n = Math.min(totalPages, 8);
    return Array.from({ length: n }, (_, i) => i);
  }, [totalPages]);

  return (
    <>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
              Business Owners
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {rows.length} on this page
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: "Total",
              value: rows.length,
              color: "text-slate-800 dark:text-white",
            },
            {
              label: "Active",
              value: rows.filter(
                (u) =>
                  (userStatuses[String(u.id)] ||
                    u.accountStatus ||
                    "ACTIVE") === "ACTIVE",
              ).length,
              color: "text-emerald-600",
            },
            {
              label: "Restricted",
              value: rows.filter((u) =>
                ["SUSPENDED", "BANNED"].includes(
                  userStatuses[String(u.id)] || u.accountStatus || "",
                ),
              ).length,
              color: "text-red-500",
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

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
          {/* Toolbar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-5">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Custom Select — replaces native <select> */}
              <CustomSelect
                value={spec}
                onChange={(val) => setSpec(val)}
                placeholder="All Specialized"
                options={specializations.map((s) => ({ value: s, label: s }))}
              />

              <input
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                placeholder="Search by name, email, phone, location, specialized"
                className="h-11 w-full sm:w-[520px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <table className="w-full min-w-[860px] border-separate border-spacing-0">
              <thead>
                {table.getHeaderGroups().map((hg) => (
                  <tr
                    key={hg.id}
                    className="bg-gradient-to-r from-slate-50 to-blue-50/30 dark:from-slate-800 dark:to-slate-800"
                  >
                    {hg.headers.map((header) => (
                      <th
                        key={header.id}
                        className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap"
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
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
                      className="px-4 py-10 text-center text-slate-600"
                    >
                      Loading...
                    </td>
                  </tr>
                ) : table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="px-4 py-10 text-center text-slate-600"
                    >
                      No businesses found.
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <tr key={row.id}>
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

          {/* Pagination */}
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
                    p === pagination.pageIndex
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

      {statusOpen && statusUser && (
        <UserStatusModal
          user={statusUser}
          onClose={() => {
            setStatusOpen(false);
            setStatusUser(null);
          }}
          onUpdated={(userId, newStatus) =>
            setUserStatuses((prev) => ({ ...prev, [userId]: newStatus }))
          }
        />
      )}
    </>
  );
}
