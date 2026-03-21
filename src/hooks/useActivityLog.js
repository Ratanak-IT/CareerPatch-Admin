// src/hooks/useActivityLog.js
// Stores admin activity logs to Supabase admin_activity_log table
import { useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export function useActivityLog() {
  const log = useCallback(async ({ action, target, targetId, detail = "" }) => {
    try {
      const adminEmail = localStorage.getItem("ADMIN_EMAIL") || "admin";
      await supabase.from("admin_activity_log").insert({
        action,          // e.g. "BAN_USER", "DELETE_POST", "UPDATE_CATEGORY"
        target,          // e.g. "freelancer", "post", "category"
        target_id:  targetId || null,
        detail,          // e.g. "Banned user Thai Ratanak"
        admin_email: adminEmail,
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      // silent — never break the UI for a log failure
      console.warn("activity log error:", e?.message);
    }
  }, []);

  return { log };
}

export async function fetchActivityLogs(limit = 200) {
  const { data, error } = await supabase
    .from("admin_activity_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}