// src/pages/BusinessOwner.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
} from "@tanstack/react-table";
import { FiChevronLeft, FiChevronRight, FiMoreVertical } from "react-icons/fi";
import { http } from "../api/http";
import { endpoints } from "../api/endpoints";

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

const columns = [
  {
    id: "no",
    header: "No",
    cell: ({ row, table }) => {
      const { pageIndex, pageSize } = table.getState().pagination;
      return <span>{pageIndex * pageSize + row.index + 1}.</span>;
    },
    enableColumnFilter: false,
  },
  {
    accessorFn: (u) => safeText(u?.fullName ?? u?.name, "Unknown"),
    id: "name",
    header: "Name",
    cell: ({ getValue }) => (
      <span className="font-semibold text-slate-800">{getValue()}</span>
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
      safeText(u?.industry ?? u?.specialized ?? u?.specialization, "Unknown"),
    id: "industry",
    header: "Specialized",
  },
  {
    id: "action",
    header: "Action",
    enableColumnFilter: false,
    cell: () => (
      <button className="h-9 w-9 rounded-full hover:bg-slate-100 grid place-items-center text-slate-500">
        <FiMoreVertical />
      </button>
    ),
  },
];

export default function BusinessOwner() {
  const [rows, setRows] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // TanStack global filter (search box)
  const [globalFilter, setGlobalFilter] = useState("");
  // Specialization dropdown
  const [spec, setSpec] = useState("");

  // Server-side pagination state driven by TanStack
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

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

      setRows(raw.filter(Boolean));
      setTotalPages(Number(pageData?.totalPages) || 1);
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
    const id = window.setInterval(fetchOwners, POLL_MS);
    return () => window.clearInterval(id);
  }, [fetchOwners]);

  // Specialization options derived from current page rows
  const specializations = useMemo(() => {
    const set = new Set(
      rows.map((u) =>
        safeText(u?.industry ?? u?.specialized ?? u?.specialization, "Unknown")
      )
    );
    return Array.from(set);
  }, [rows]);

  // Pre-filter rows by spec dropdown before passing to TanStack
  const data = useMemo(() => {
    return rows
      .filter((u) => isBusinessUser(u) || normType(u?.userType) === "")
      .filter((u) => {
        if (!spec) return true;
        const industry = safeText(
          u?.industry ?? u?.specialized ?? u?.specialization,
          "Unknown"
        );
        return industry.toLowerCase() === spec.toLowerCase();
      });
  }, [rows, spec]);

  const table = useReactTable({
    data,
    columns,
    state: {
      globalFilter,
      pagination,
    },
    pageCount: totalPages,
    manualPagination: true, // server-side pagination
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
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 dark:bg-slate-900 dark:border-slate-800">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <select
            value={spec}
            onChange={(e) => setSpec(e.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-slate-700 font-semibold"
          >
            <option value="">All Specialized</option>
            {specializations.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search by name, email, phone, location, specialized"
            className="h-11 w-full sm:w-[520px] rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
      </div>

      {/* Table */}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[860px] border-separate border-spacing-0">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="bg-slate-50 text-slate-600">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-sm font-semibold"
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
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
                      className="px-4 py-4 border-b border-slate-200 text-slate-700"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
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
          className="h-10 w-10 rounded-full border border-slate-200 bg-white grid place-items-center disabled:opacity-50"
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
                "h-9 w-9 rounded-full font-semibold",
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
          className="h-10 w-10 rounded-full border border-slate-200 bg-white grid place-items-center disabled:opacity-50"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          <FiChevronRight />
        </button>
      </div>
    </div>
  );
}