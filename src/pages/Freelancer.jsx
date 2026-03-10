// src/pages/Freelancer.jsx
import { useEffect, useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
} from "@tanstack/react-table";
import { http } from "../api/http";
import { endpoints } from "../api/endpoints";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

import RowActions from "../components/ui/RowActions";
import FreelancerUpdateModal from "../components/ui/FreelancerEditModal";

const POLL_MS = 10_000;

export default function Freelancer() {
  const [allRows, setAllRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [globalFilter, setGlobalFilter] = useState("");
  const [skill, setSkill] = useState("");

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  // modal
  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  const fetchFreelancers = async () => {
    try {
      setLoading(true);
      const res = await http.get(endpoints.users, {
        params: {
          userType: "freelancer",
          page: 0,
          size: 9999,
          sortBy: "createdAt",
        },
      });

      const top = res?.data;
      const pageData = top?.data ?? top;
      const raw = Array.isArray(pageData?.content) ? pageData.content : [];

      setAllRows(raw.filter(Boolean));
    } catch (error) {
      console.error("Error fetching freelancers:", error);
      setAllRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFreelancers();
    const id = window.setInterval(fetchFreelancers, POLL_MS);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [globalFilter, skill]);

  const skills = useMemo(() => {
    const set = new Set();
    for (const u of allRows) {
      if (Array.isArray(u?.skills)) {
        for (const s of u.skills) {
          const v = String(s ?? "").trim();
          if (v) set.add(v);
        }
      }
    }
    return Array.from(set);
  }, [allRows]);

  const data = useMemo(() => {
    if (!skill) return allRows;
    const picked = skill.toLowerCase();
    return allRows.filter((u) =>
      Array.isArray(u?.skills)
        ? u.skills.map((x) => String(x).toLowerCase()).includes(picked)
        : false
    );
  }, [allRows, skill]);

  // ✅ real delete API
  const handleDelete = async (user) => {
    const id = user?.id;
    if (!id) return;

    const ok = window.confirm("Delete this freelancer?");
    if (!ok) return;

    try {
      await http.delete(`${endpoints.users}/${id}`); // <-- adjust if your backend uses different route
      await fetchFreelancers(); // refresh
    } catch (e) {
      console.error(e);
      alert("Delete failed.");
    }
  };

  // ✅ open modal
  const handleOpenEdit = (user) => {
    setSelected(user);
    setEditOpen(true);
  };

  // ✅ real update API
  const handleUpdate = async (payload) => {
    const id = selected?.id;
    if (!id) return;

    await http.put(`${endpoints.users}/${id}`, payload); // <-- adjust if PATCH/POST different
    await fetchFreelancers(); // refresh
  };

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
        accessorFn: (u) => String(u?.fullName ?? u?.name ?? "").trim() || "Unknown",
        id: "name",
        header: "Name",
        cell: ({ getValue }) => <span className="font-semibold text-slate-800">{getValue()}</span>,
      },
      {
        accessorFn: (u) => String(u?.phone ?? "").trim() || "Unknown",
        id: "phone",
        header: "Phone",
      },
      {
        accessorFn: (u) => String(u?.email ?? "").trim() || "Unknown",
        id: "email",
        header: "Email address",
      },
      {
        accessorFn: (u) => String(u?.address ?? u?.location ?? "").trim() || "Unknown",
        id: "location",
        header: "Location",
      },
      {
        accessorFn: (u) => (Array.isArray(u?.skills) && u.skills.length ? u.skills.join(", ") : "Unknown"),
        id: "skills",
        header: "Skill",
      },
      {
        id: "action",
        header: "Action",
        cell: ({ row }) => (
          <RowActions
            onEdit={() => handleOpenEdit(row.original)}
            onDelete={() => handleDelete(row.original)}
          />
        ),
      },
    ],
    [pagination.pageIndex, pagination.pageSize, allRows]
  );

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter, pagination },
    onPaginationChange: setPagination,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _columnId, filterValue) => {
      const q = String(filterValue ?? "").trim().toLowerCase();
      if (!q) return true;

      const u = row.original;
      const name = String(u?.fullName || u?.name || "").toLowerCase();
      const email = String(u?.email || "").toLowerCase();
      const phone = String(u?.phone || "").toLowerCase();
      const addr = String(u?.address || u?.location || "").toLowerCase();
      const skills = Array.isArray(u?.skills) ? u.skills.join(", ").toLowerCase() : "";

      return [name, email, phone, addr, skills].some((x) => x.includes(q));
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const pageNums = useMemo(() => {
    const count = table.getPageCount();
    return Array.from({ length: Math.min(count, 8) }, (_, i) => i);
  }, [table.getPageCount()]);

  return (
    <>
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 dark:bg-slate-900 dark:border-slate-800">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <select
              value={skill}
              onChange={(e) => setSkill(e.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-slate-700 font-semibold"
            >
              <option value="">Filter by skill</option>
              {skills.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <input
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Search for a Freelancer by name or email"
              className="h-11 w-full sm:w-130 rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-215 border-separate border-spacing-0">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="bg-slate-50 text-slate-600">
                  {hg.headers.map((h) => (
                    <th key={h.id} className="px-4 py-3 text-left text-sm font-semibold">
                      {flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-10 text-center text-slate-600">
                    Loading...
                  </td>
                </tr>
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-10 text-center text-slate-600">
                    No freelancers found.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-4 border-b border-slate-200 text-slate-700">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

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
                  p === pagination.pageIndex ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100",
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

      {/* modal */}
      <FreelancerUpdateModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        initialUser={selected}
        onSubmit={handleUpdate}
      />
    </>
  );
}