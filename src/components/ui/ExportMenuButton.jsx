
import { useRef, useState, useEffect } from "react";
import { exportCSV, exportPDF } from "../../utils/exportUtils";

export default function ExportMenuButton({ rows = [], columns = [], filename = "export", title = "Export" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const count = rows.length;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={count === 0}
        className="flex items-center gap-2 h-10 px-4 rounded-xl
                   bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed
                   text-white text-sm font-semibold transition-colors shadow-sm"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
        Export
        {count > 0 && (
          <span className="bg-white/25 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
            {count}
          </span>
        )}
        <svg className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`}
             fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-30
                        bg-white dark:bg-slate-800
                        border border-slate-200 dark:border-slate-700
                        rounded-xl shadow-xl overflow-hidden w-44">
          <button
            onClick={() => { exportCSV(rows, columns, filename); setOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium
                       text-slate-700 dark:text-slate-200
                       hover:bg-emerald-50 dark:hover:bg-emerald-900/20
                       hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
          >
            <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </button>

          <div className="h-px bg-slate-100 dark:bg-slate-700" />

          <button
            onClick={() => { exportPDF(rows, columns, { title, filename }); setOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium
                       text-slate-700 dark:text-slate-200
                       hover:bg-red-50 dark:hover:bg-red-900/20
                       hover:text-red-600 dark:hover:text-red-400 transition-colors"
          >
            <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            Export PDF
          </button>
        </div>
      )}
    </div>
  );
}