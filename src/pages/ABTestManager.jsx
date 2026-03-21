

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { toast } from "react-toastify";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

/* ─── Toggle switch ──────────────────────────────────────────────────────── */
function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
        focus:outline-none disabled:opacity-50
        ${checked ? "bg-blue-500" : "bg-slate-300 dark:bg-slate-600"}`}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform
        ${checked ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}

/* ─── Rollout slider ─────────────────────────────────────────────────────── */
function RolloutSlider({ value, onChange, disabled }) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="range" min="0" max="100" step="5"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className="flex-1 h-2 rounded-full accent-blue-500"
      />
      <span className="text-sm font-bold text-slate-700 dark:text-slate-200 w-12 text-right">
        {value}%
      </span>
    </div>
  );
}

/* ─── Create/Edit Modal ──────────────────────────────────────────────────── */
function TestModal({ test, onClose, onSaved }) {
  const isEdit = !!test?.id;
  const [form, setForm] = useState({
    key:         test?.key         || "",
    name:        test?.name        || "",
    description: test?.description || "",
    enabled:     test?.enabled     ?? false,
    rollout_pct: test?.rollout_pct ?? 50,
    variant_a:   test?.variant_a   || "control",
    variant_b:   test?.variant_b   || "treatment",
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.key.trim())  { setError("Key is required (e.g. 'new_homepage')"); return; }
    if (!form.name.trim()) { setError("Name is required"); return; }
    setError(""); setLoading(true);
    try {
      const payload = {
        ...form,
        key: form.key.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""),
        updated_at: new Date().toISOString(),
      };
      if (isEdit) {
        await supabase.from("ab_tests").update(payload).eq("id", test.id);
        toast.success("Test updated!");
      } else {
        await supabase.from("ab_tests").insert({ ...payload, created_at: new Date().toISOString() });
        toast.success("Test created!");
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e?.message || "Failed to save.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">
            {isEdit ? "Edit A/B Test" : "New A/B Test"}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 text-sm rounded-xl px-4 py-2.5">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Key <span className="text-red-400">*</span>
              </label>
              <input value={form.key}
                onChange={(e) => set("key", e.target.value)}
                placeholder="new_homepage_cta"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-800 dark:text-white outline-none focus:border-blue-400 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Name <span className="text-red-400">*</span>
              </label>
              <input value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="New Homepage CTA"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-800 dark:text-white outline-none focus:border-blue-400 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Description
            </label>
            <input value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="What are we testing?"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-800 dark:text-white outline-none focus:border-blue-400 transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Variant A (Control)</label>
              <input value={form.variant_a} onChange={(e) => set("variant_a", e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-800 dark:text-white outline-none focus:border-blue-400 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Variant B (Treatment)</label>
              <input value={form.variant_b} onChange={(e) => set("variant_b", e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-800 dark:text-white outline-none focus:border-blue-400 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Rollout — {form.rollout_pct}% of users get Variant B
            </label>
            <RolloutSlider value={form.rollout_pct} onChange={(v) => set("rollout_pct", v)} />
            <p className="text-xs text-slate-400 mt-1">
              {form.rollout_pct}% → B ({form.variant_b}) · {100 - form.rollout_pct}% → A ({form.variant_a})
            </p>
          </div>

          <div className="flex items-center justify-between py-2 border-t border-slate-100 dark:border-slate-700">
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Active</p>
              <p className="text-xs text-slate-400">Enable this test for users</p>
            </div>
            <Toggle checked={form.enabled} onChange={(v) => set("enabled", v)} />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white text-sm font-semibold flex items-center justify-center gap-2 transition">
              {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {isEdit ? "Save Changes" : "Create Test"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────────── */
export default function ABTestManager() {
  const [tests,   setTests]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(null); // null | { test? }
  const [deleting, setDeleting] = useState(null);

  const fetchTests = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("ab_tests")
        .select("*")
        .order("created_at", { ascending: false });
      setTests(data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTests(); }, [fetchTests]);

  const toggleEnabled = async (test) => {
    const newVal = !test.enabled;
    setTests((prev) => prev.map((t) => t.id === test.id ? { ...t, enabled: newVal } : t));
    await supabase.from("ab_tests").update({ enabled: newVal }).eq("id", test.id);
    toast.success(newVal ? `"${test.name}" enabled` : `"${test.name}" disabled`);
  };

  const deleteTest = async (test) => {
    setDeleting(test.id);
    await supabase.from("ab_tests").delete().eq("id", test.id);
    setTests((prev) => prev.filter((t) => t.id !== test.id));
    toast.success("Test deleted");
    setDeleting(null);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">A/B Test Manager</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Toggle feature flags and run experiments on your user base
          </p>
        </div>
        <button
          onClick={() => setModal({ test: null })}
          className="flex items-center gap-2 h-10 px-4 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold transition shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Test
        </button>
      </div>

      {/* How to use */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl px-4 py-3">
        <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-1">💡 How to use in user platform</p>
        <code className="text-xs text-blue-700 dark:text-blue-300 font-mono">
          {'import { useABTest } from "../../hooks/useABTest";\n'}
          {'const variant = useABTest("your_test_key"); // "control" or "treatment"'}
        </code>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Tests",  value: tests.length,                            color: "text-slate-800 dark:text-white" },
          { label: "Active",       value: tests.filter((t) => t.enabled).length,   color: "text-emerald-600" },
          { label: "Inactive",     value: tests.filter((t) => !t.enabled).length,  color: "text-slate-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 px-5 py-4 shadow-sm">
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{label}</p>
            <p className={`text-3xl font-black mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tests list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tests.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <p className="text-4xl mb-3">🧪</p>
          <p className="text-slate-500 dark:text-slate-400">No tests yet. Create your first A/B test.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tests.map((test) => (
            <div key={test.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <code className="text-xs font-bold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {test.key}
                    </code>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full
                      ${test.enabled
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                      }`}>
                      {test.enabled ? "● Active" : "○ Inactive"}
                    </span>
                  </div>
                  <p className="font-bold text-slate-800 dark:text-white">{test.name}</p>
                  {test.description && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{test.description}</p>
                  )}

                  {/* Variants */}
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                      A: {test.variant_a}
                    </span>
                    <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                    <span className="text-xs px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-semibold">
                      B: {test.variant_b}
                    </span>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {test.rollout_pct}% get B
                    </span>
                  </div>

                  {/* Rollout bar */}
                  <div className="mt-2 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden w-64 max-w-full">
                    <div className="h-full bg-blue-500 rounded-full transition-all"
                         style={{ width: `${test.rollout_pct || 0}%` }} />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 shrink-0">
                  <Toggle checked={test.enabled} onChange={() => toggleEnabled(test)} />
                  <button onClick={() => setModal({ test })}
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => deleteTest(test)}
                    disabled={deleting === test.id}
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition disabled:opacity-50">
                    {deleting === test.id
                      ? <span className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                      : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                        </svg>
                    }
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <TestModal
          test={modal.test}
          onClose={() => setModal(null)}
          onSaved={fetchTests}
        />
      )}
    </div>
  );
}