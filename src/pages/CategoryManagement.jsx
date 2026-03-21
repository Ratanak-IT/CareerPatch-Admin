
import { useCallback, useEffect, useState } from "react";
import { http } from "../api/http";
import { toast } from "react-toastify";
import ExportMenuButton from "../components/ui/ExportMenuButton";

const BASE = "/api/jobs-service/categories";
const TYPES = ["SERVICE", "JOB"];


function CategoryModal({ mode, initial, onClose, onSaved }) {
  const isEdit = mode === "edit";
  const [form,    setForm]    = useState({ name: initial?.name || "", type: initial?.type || "SERVICE" });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("Name is required."); return; }
    setError(""); setLoading(true);
    try {
      if (isEdit) {
        await http.put(`${BASE}/${initial.id}`, { name: form.name.trim(), type: form.type });
        toast.success("Category updated!");
      } else {
        await http.post(`${BASE}/create-new`, { name: form.name.trim(), type: form.type });
        toast.success("Category created!");
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">
            {isEdit ? "Edit Category" : "New Category"}
          </h2>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm rounded-xl px-4 py-2.5">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Category Name <span className="text-red-400">*</span>
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Web Development"
              autoFocus
              className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900
                         px-4 py-2.5 text-sm text-slate-800 dark:text-white outline-none
                         focus:border-blue-400 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30
                         transition placeholder:text-slate-400"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Type
            </label>
            <div className="flex gap-3">
              {TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, type: t }))}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all
                    ${form.type === t
                      ? "bg-blue-500 text-white border-blue-500 shadow-sm"
                      : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:border-blue-300"
                    }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-semibold
                         text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white text-sm font-semibold
                         flex items-center justify-center gap-2 transition">
              {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {isEdit ? "Save Changes" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Delete Confirm ─────────────────────────────────────────────────────── */
function DeleteModal({ category, onClose, onDeleted }) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await http.delete(`${BASE}/${category.id}`);
      toast.success("Category deleted!");
      onDeleted();
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to delete.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex flex-col items-center text-center gap-3 mb-6">
          <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Delete Category?</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-200">"{category?.name}"</span>?
            This may affect existing posts using this category.
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-semibold
                       text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition">
            Cancel
          </button>
          <button onClick={handleDelete} disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white text-sm font-semibold
                       flex items-center justify-center gap-2 transition">
            {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {loading ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Type badge ─────────────────────────────────────────────────────────── */
function TypeBadge({ type }) {
  const isJob = String(type || "").toUpperCase() === "JOB";
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-bold
      ${isJob
        ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
      }`}>
      {isJob ? "JOB" : "SERVICE"}
    </span>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */
export default function CategoryManagement() {
  const [categories, setCategories] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [q,          setQ]          = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");

  const [modal,      setModal]      = useState(null); // null | { mode: "create"|"edit", initial? }
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await http.get(BASE);
      const raw = res?.data;
      const list =
        Array.isArray(raw)          ? raw :
        Array.isArray(raw?.data)    ? raw.data :
        Array.isArray(raw?.content) ? raw.content : [];
      setCategories(list);
    } catch (e) {
      console.error("fetch categories:", e);
      toast.error("Failed to load categories.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  /* ── Filtered list ── */
  const filtered = categories.filter((c) => {
    const matchQ    = !q || c.name?.toLowerCase().includes(q.toLowerCase());
    const matchType = typeFilter === "ALL" || String(c.type || "").toUpperCase() === typeFilter;
    return matchQ && matchType;
  });

  /* ── Export columns ── */
  const exportCols = [
    { id: "name",      header: "Name",       accessorFn: (c) => c.name      || "—" },
    { id: "type",      header: "Type",       accessorFn: (c) => c.type      || "—" },
    { id: "createdAt", header: "Created At", accessorFn: (c) => c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—" },
  ];

  const jobCount     = categories.filter((c) => String(c.type || "").toUpperCase() === "JOB").length;
  const serviceCount = categories.filter((c) => String(c.type || "").toUpperCase() === "SERVICE").length;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-800">

      {/* Title row */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Categories</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage job and service categories
          </p>
        </div>
        <button
          onClick={() => setModal({ mode: "create" })}
          className="flex items-center gap-2 h-10 px-4 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold transition shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Category
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total",    value: categories.length, color: "text-slate-700 dark:text-white" },
          { label: "Job",      value: jobCount,           color: "text-violet-600" },
          { label: "Service",  value: serviceCount,       color: "text-emerald-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 px-4 py-3">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">{label}</p>
            <p className={`text-2xl font-black mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Search + filter + export */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
               fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" strokeLinecap="round"/>
          </svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search categories…"
            className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800
                       pl-10 pr-4 outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 text-sm
                       text-slate-800 dark:text-white"
          />
        </div>

        {/* Type filter pills */}
        <div className="flex gap-2 shrink-0">
          {["ALL", "JOB", "SERVICE"].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`h-10 px-4 rounded-xl text-sm font-semibold border transition-all
                ${typeFilter === t
                  ? "bg-blue-500 text-white border-blue-500"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-300"
                }`}
            >
              {t}
            </button>
          ))}
        </div>

        <ExportMenuButton
          rows={filtered}
          columns={exportCols}
          filename="categories"
          title="Categories"
        />
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800">
              <th className="px-5 py-3.5 text-left text-sm font-semibold text-slate-600 dark:text-slate-300 w-10">#</th>
              <th className="px-5 py-3.5 text-left text-sm font-semibold text-slate-600 dark:text-slate-300">Name</th>
              <th className="px-5 py-3.5 text-left text-sm font-semibold text-slate-600 dark:text-slate-300">Type</th>
              <th className="px-5 py-3.5 text-left text-sm font-semibold text-slate-600 dark:text-slate-300">Created</th>
              <th className="px-5 py-3.5 text-right text-sm font-semibold text-slate-600 dark:text-slate-300">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center">
                  <div className="flex items-center justify-center gap-2 text-slate-400">
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    Loading…
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-slate-400 dark:text-slate-500">
                  {q || typeFilter !== "ALL" ? "No categories match your filters." : "No categories yet."}
                </td>
              </tr>
            ) : (
              filtered.map((cat, idx) => (
                <tr key={cat.id} className="border-t border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-5 py-4 text-sm text-slate-400">{idx + 1}</td>
                  <td className="px-5 py-4">
                    <span className="text-sm font-semibold text-slate-800 dark:text-white">{cat.name}</span>
                  </td>
                  <td className="px-5 py-4">
                    <TypeBadge type={cat.type} />
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400">
                    {cat.createdAt ? new Date(cat.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" }) : "—"}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setModal({ mode: "edit", initial: cat })}
                        className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteTarget(cat)}
                        className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 text-xs font-semibold hover:bg-red-100 dark:hover:bg-red-900/40 transition"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
        Showing {filtered.length} of {categories.length} categories
      </p>

      {/* Modals */}
      {modal && (
        <CategoryModal
          mode={modal.mode}
          initial={modal.initial}
          onClose={() => setModal(null)}
          onSaved={fetchCategories}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          category={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={fetchCategories}
        />
      )}
    </div>
  );
}