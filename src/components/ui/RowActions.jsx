
import { useEffect, useRef, useState } from "react";
import { FiMoreVertical, FiEdit2, FiTrash2 } from "react-icons/fi";

export default function RowActions({ onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="h-9 w-9 rounded-full hover:bg-slate-100 grid place-items-center text-slate-500"
        aria-label="Actions"
      >
        <FiMoreVertical />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-36 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden z-20">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
          >
            <FiEdit2 /> Update
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 text-red-600 flex items-center gap-2"
          >
            <FiTrash2 /> Delete
          </button>
        </div>
      )}
    </div>
  );
}