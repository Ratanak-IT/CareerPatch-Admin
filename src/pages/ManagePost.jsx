import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
} from "@tanstack/react-table";
import { http } from "../api/http";
import { endpoints } from "../api/endpoints";

const TABS = {
  SERVICES: "services",
  JOBS: "jobs",
};

const POLL_MS = 10_000;

function normalizeListResponse(data) {
  if (!data) return { items: [], totalPages: 1, totalElements: 0 };

  if (Array.isArray(data)) {
    return { items: data, totalPages: 1, totalElements: data.length };
  }

  if (Array.isArray(data.content)) {
    return {
      items: data.content,
      totalPages: data.totalPages ?? 1,
      totalElements: data.totalElements ?? data.content.length,
    };
  }

  if (Array.isArray(data.data)) {
    return { items: data.data, totalPages: 1, totalElements: data.data.length };
  }

  return { items: [], totalPages: 1, totalElements: 0 };
}

function safeText(v) {
  if (v === null || v === undefined) return "-";
  if (typeof v === "string" && v.trim() === "") return "-";
  return String(v);
}

function formatDate(v) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  // screenshot style: YYYY-MM-DD
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getRowId(item) {
  return (
    item.id ??
    item.jobId ??
    item.serviceId ??
    item._id ??
    JSON.stringify(item).slice(0, 30)
  );
}

export default function ManagePost() {
  const [tab, setTab] = useState(TABS.SERVICES);

  const [page, setPage] = useState(0);
  const [size] = useState(10);

  const [loading, setLoading] = useState(true);

  const [rawItems, setRawItems] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  const [q, setQ] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const url = tab === TABS.JOBS ? endpoints.jobs : endpoints.services;
      const res = await http.get(url, { params: { page, size } });

      const normalized = normalizeListResponse(res.data);
      setRawItems(normalized.items);
      setTotalPages(normalized.totalPages || 1);
      setTotalElements(normalized.totalElements || 0);
    } catch (e) {
      console.error("ManagePost fetch error:", e);
      setRawItems([]);
      setTotalPages(1);
      setTotalElements(0);
    } finally {
      setLoading(false);
    }
  }, [page, size, tab]);

  useEffect(() => {
    setPage(0);
  }, [tab]);

  useEffect(() => {
    fetchData();
    const id = window.setInterval(fetchData, POLL_MS);
    return () => window.clearInterval(id);
  }, [fetchData]);

  // detect client pagination (array response)
  const isClientPagination = useMemo(() => {
    return totalPages === 1 && rawItems.length > size;
  }, [totalPages, rawItems.length, size]);

  const globalFilterFn = useCallback((row, _columnId, filterValue) => {
    const query = String(filterValue || "").trim().toLowerCase();
    if (!query) return true;

    const item = row.original;

    const title =
      item.title ||
      item.jobTitle ||
      item.name ||
      item.serviceName ||
      item.position ||
      "";

    const desc =
      item.description ||
      item.desc ||
      item.content ||
      item.summary ||
      item.requirements ||
      "";

    const from =
      item?.user?.fullName ||
      item?.owner?.fullName ||
      item?.createdBy?.fullName ||
      item?.freelancer?.fullName ||
      item?.businessOwner?.fullName ||
      item.ownerName ||
      item.freelancerName ||
      "";

    const skill = item.skill || item.category || item.categoryName || "";

    return (
      String(title).toLowerCase().includes(query) ||
      String(desc).toLowerCase().includes(query) ||
      String(from).toLowerCase().includes(query) ||
      String(skill).toLowerCase().includes(query)
    );
  }, []);

  // Delete handler placeholder (wire to your API)
  const onDelete = async (row) => {
    // Example:
    // const id = row.id ?? row.jobId ?? row.serviceId;
    // await http.delete(`${url}/${id}`);
    console.log("delete", row);
    // After delete, refresh:
    fetchData();
  };

  const columns = useMemo(() => {
    // screenshot columns: Title | From | Skill | Date | Action
    return [
      {
        id: "title",
        header: "Title",
        cell: ({ row, table }) => {
          const idx = row.index + 1 + (table.getState().pagination.pageIndex * table.getState().pagination.pageSize);
          const item = row.original;

          const title =
            item.title ||
            item.jobTitle ||
            item.name ||
            item.serviceName ||
            item.position ||
            "-";

          return (
            <div className="text-slate-700">
              <span className="mr-1">{idx}.</span>
              {safeText(title)}
            </div>
          );
        },
      },
      {
        id: "from",
        header: "From",
        accessorFn: (item) => {
          const u =
            item.user ||
            item.owner ||
            item.createdBy ||
            item.businessOwner ||
            item.freelancer ||
            item.author ||
            null;
          return (
            u?.fullName ||
            u?.name ||
            u?.username ||
            u?.email ||
            item.ownerName ||
            item.freelancerName ||
            "-"
          );
        },
        cell: ({ getValue }) => <div className="text-slate-700">{safeText(getValue())}</div>,
      },
      {
        id: "skill",
        header: "Skill",
        accessorFn: (item) =>
          item.skill || item.category || item.categoryName || item.skillCategory || "—",
        cell: ({ getValue }) => <div className="text-slate-700">{safeText(getValue())}</div>,
      },
      {
        id: "date",
        header: "Date",
        accessorFn: (item) => item.createdAt || item.createAt || item.created_date,
        cell: ({ getValue }) => <div className="text-slate-700">{formatDate(getValue())}</div>,
      },
      {
        id: "action",
        header: "Action",
        cell: ({ row }) => (
          <button
            onClick={() => onDelete(row.original)}
            className="h-9 px-5 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 active:scale-[0.98] transition"
          >
            Delete
          </button>
        ),
      },
    ];
  }, [fetchData]);

  const table = useReactTable({
    data: rawItems,
    columns,
    getRowId,
    state: {
      globalFilter: q,
      pagination: { pageIndex: page, pageSize: size },
    },
    onGlobalFilterChange: (val) => {
      setQ(String(val ?? ""));
      setPage(0);
    },
    onPaginationChange: (updater) => {
      const next =
        typeof updater === "function"
          ? updater({ pageIndex: page, pageSize: size })
          : updater;
      setPage(next.pageIndex ?? 0);
    },
    globalFilterFn,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: isClientPagination ? getPaginationRowModel() : undefined,
    manualPagination: !isClientPagination,
    pageCount: !isClientPagination ? totalPages : undefined,
  });

  const rowsToRender = isClientPagination
    ? table.getRowModel().rows
    : table.getCoreRowModel().rows;

  const maxPages = isClientPagination ? table.getPageCount() : totalPages;

  const totalShown = isClientPagination
    ? table.getFilteredRowModel().rows.length
    : totalElements;

  // pagination UI like screenshot: centered numbers + arrows
  const pageNumbers = useMemo(() => {
    const total = Math.max(1, maxPages);
    const current = page + 1;

    // show up to 8 numbers (like screenshot)
    const windowSize = 8;
    let start = Math.max(1, current - Math.floor(windowSize / 2));
    let end = start + windowSize - 1;
    if (end > total) {
      end = total;
      start = Math.max(1, end - windowSize + 1);
    }

    const arr = [];
    for (let i = start; i <= end; i++) arr.push(i);
    return arr;
  }, [maxPages, page]);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      {/* Title */}
      <div className="text-3xl font-bold text-slate-800 mb-4">Manage Posts</div>

      {/* Search + (optional) filters row (style like screenshot) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-[420px]">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
            placeholder="Search by title, skill, special, Specialized"
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 outline-none focus:ring-2 focus:ring-violet-200"
          />
        </div>

        <div className="text-slate-500 font-semibold">
          {tab === TABS.SERVICES ? "Freelancer Post" : "Business Owner Post"} •{" "}
          {totalShown} items
        </div>
      </div>

      <div className="h-6" />

      {/* Tabs pill like screenshot */}
      <div className="inline-flex rounded-2xl border-2 border-violet-500 overflow-hidden">
        <button
          onClick={() => setTab(TABS.SERVICES)}
          className={[
            "px-8 h-12 text-lg font-semibold transition",
            tab === TABS.SERVICES
              ? "bg-violet-600 text-white"
              : "bg-white text-violet-600 hover:bg-violet-50",
          ].join(" ")}
        >
          Freelancer Post
        </button>

        <button
          onClick={() => setTab(TABS.JOBS)}
          className={[
            "px-8 h-12 text-lg font-semibold transition",
            tab === TABS.JOBS
              ? "bg-violet-600 text-white"
              : "bg-white text-violet-600 hover:bg-violet-50",
          ].join(" ")}
        >
          Business Owner Post
        </button>
      </div>

      <div className="h-4" />

      {/* Table */}
      <div className="mt-4 rounded-2xl overflow-hidden">
        {/* header row background like screenshot */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="bg-slate-100">
                  {hg.headers.map((header) => (
                    <th
                      key={header.id}
                      align="left"
                      className="px-6 py-4 text-sm font-semibold text-slate-600"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td className="px-6 py-6 text-slate-600" colSpan={columns.length}>
                    Loading...
                  </td>
                </tr>
              ) : rowsToRender.length === 0 ? (
                <tr>
                  <td className="px-6 py-6 text-slate-600" colSpan={columns.length}>
                    No data found.
                  </td>
                </tr>
              ) : (
                rowsToRender.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-6 py-4 text-sm">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination: centered numbers + arrows (screenshot style) */}
      <div className="mt-8 flex items-center justify-center gap-4">
        {/* Left arrow */}
        <button
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
          className="text-2xl text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Previous"
        >
          ‹
        </button>

        {/* Numbers */}
        <div className="flex items-center gap-5">
          {pageNumbers.map((n) => {
            const active = n === page + 1;
            return (
              <button
                key={n}
                onClick={() => setPage(n - 1)}
                className={[
                  "h-9 w-9 rounded-full font-semibold transition",
                  active
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:bg-slate-100",
                ].join(" ")}
              >
                {n}
              </button>
            );
          })}
        </div>

        {/* Right arrow */}
        <button
          onClick={() => setPage((p) => (p + 1 < maxPages ? p + 1 : p))}
          disabled={page + 1 >= maxPages}
          className="text-2xl text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Next"
        >
          ›
        </button>
      </div>
    </div>
  );
}