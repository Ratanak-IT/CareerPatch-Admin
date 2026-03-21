// src/components/ui/UserStatusModal.jsx
// Ban / Suspend / Activate users — stores action to Supabase admin_activity_log

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { http } from "../../api/http";
import { endpoints } from "../../api/endpoints";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

/* ─── Helpers ────────────────────────────────────────────────────────────── */
async function logActivity({ action, target, targetId, detail }) {
  try {
    const adminEmail = localStorage.getItem("ADMIN_EMAIL") || "admin";
    await supabase.from("admin_activity_log").insert({
      action, target, target_id: targetId || null,
      detail, admin_email: adminEmail,
      created_at: new Date().toISOString(),
    });
  } catch (e) {
    console.warn("log activity:", e?.message);
  }
}

const STATUS_OPTIONS = [
  {
    key:    "ACTIVE",
    label:  "Activate",
    desc:   "User can log in and use the platform normally.",
    icon:   (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color:  "bg-green-500 hover:bg-green-600",
    badge:  "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    action: "ACTIVATE_USER",
  },
  {
    key:    "SUSPENDED",
    label:  "Suspend",
    desc:   "Temporarily restrict access. User can be reactivated.",
    icon:   (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color:  "bg-orange-500 hover:bg-orange-600",
    badge:  "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    action: "SUSPEND_USER",
  },
  {
    key:    "BANNED",
    label:  "Ban",
    desc:   "Permanently block user from accessing the platform.",
    icon:   (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="9"/><path strokeLinecap="round" d="M4.93 4.93l14.14 14.14"/>
      </svg>
    ),
    color:  "bg-red-600 hover:bg-red-700",
    badge:  "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    action: "BAN_USER",
  },
];

/* ─── Current status badge ───────────────────────────────────────────────── */
export function UserStatusBadge({ status }) {
  const s = String(status || "ACTIVE").toUpperCase();
  const map = {
    ACTIVE:    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    SUSPENDED: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    BANNED:    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${map[s] || map.ACTIVE}`}>
      {s}
    </span>
  );
}

/* ─── Main modal ─────────────────────────────────────────────────────────── */
export default function UserStatusModal({ user, onClose, onUpdated }) {
  const [loading,       setLoading]       = useState(false);
  const [reason,        setReason]        = useState("");
  const [error,         setError]         = useState("");
  const [selected,      setSelected]      = useState(null);
  const [currentStatus, setCurrentStatus] = useState("ACTIVE");
  const [statusLoading, setStatusLoading] = useState(true);

  const userName = user?.fullName || user?.email || "User";
  const userType = String(user?.userType || "").toLowerCase().includes("business") ? "business" : "freelancer";

  // ── Fetch REAL status from Supabase on open ──────────────────────
  useEffect(() => {
    const userId = String(user?.id ?? "");
    if (!userId) { setStatusLoading(false); return; }
    supabase
      .from("admin_user_status")
      .select("status")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        setCurrentStatus(String(data?.status || "ACTIVE").toUpperCase());
        setStatusLoading(false);
      })
      .catch(() => { setCurrentStatus("ACTIVE"); setStatusLoading(false); });
  }, [user?.id]);

  const handleApply = async () => {
    if (!selected) { setError("Please select an action."); return; }
    setError(""); setLoading(true);

    try {
      // 1. Store status in Supabase (since API may not have ban endpoint)
      await supabase
        .from("admin_user_status")
        .upsert({
          user_id:    String(user.id),
          status:     selected.key,
          reason:     reason.trim() || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

      // 2. Try backend update if supported (graceful fail)
      try {
        await http.patch(`${endpoints.users}/${user.id}/status`, {
          status: selected.key,
          reason: reason.trim() || null,
        });
      } catch {
        // Backend may not support this — Supabase store is source of truth for admin
      }

      // 3. Log the action
      await logActivity({
        action:   selected.action,
        target:   userType,
        targetId: String(user.id),
        detail:   `${selected.label}ed ${userName}${reason ? ` — Reason: ${reason}` : ""}`,
      });

      onUpdated?.(user.id, selected.key);
      onClose();
    } catch (e) {
      setError(e?.message || "Failed to update user status.");
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
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Manage User Status</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {userName} •{" "}
              <span className="font-semibold capitalize">{userType}</span> •{" "}
              Current:{" "}
              {statusLoading
                ? <span className="text-slate-400">loading…</span>
                : <UserStatusBadge status={currentStatus} />
              }
            </p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 text-sm rounded-xl px-4 py-2.5">
              {error}
            </div>
          )}

          {/* Status options */}
          <div className="space-y-2">
            {statusLoading ? (
              <div className="flex items-center justify-center py-6 gap-2 text-slate-400">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Loading current status…</span>
              </div>
            ) : null}
            {!statusLoading && STATUS_OPTIONS.filter((o) => o.key !== currentStatus).map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setSelected(opt)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all
                  ${selected?.key === opt.key
                    ? "border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900"
                  }`}
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

            {/* Current status indicator */}
            {!statusLoading && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700">
                <span className="text-xs text-slate-400 dark:text-slate-500">Current status:</span>
                <UserStatusBadge status={currentStatus} />
              </div>
            )}
          </div>

          {/* Reason */}
          {selected && (
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Reason <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={`Why are you ${selected.label.toLowerCase()}ing ${userName}?`}
                rows={2}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900
                           px-4 py-2.5 text-sm text-slate-800 dark:text-white outline-none resize-none
                           focus:border-blue-400 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30
                           transition placeholder:text-slate-400"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-semibold
                         text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={loading || !selected}
              className={`flex-1 py-2.5 rounded-xl text-white text-sm font-semibold
                          flex items-center justify-center gap-2 transition disabled:opacity-50
                          ${selected ? selected.color : "bg-slate-400"}`}
            >
              {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {selected ? `${selected.label} User` : "Select an action"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}