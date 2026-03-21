
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { createClient } from "@supabase/supabase-js";
import { http } from "../api/http";
import { endpoints } from "../api/endpoints";
import StatCard from "../components/ui/StatCard";
import DonutCard from "../components/ui/DonutCard";
import Loading from "../components/ui/Loading";
import ExportMenuButton from "../components/ui/ExportMenuButton";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const POLL_MS = 15_000;

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function toArray(raw) {
  if (Array.isArray(raw))                return raw;
  if (Array.isArray(raw?.content))       return raw.content;
  if (Array.isArray(raw?.data?.content)) return raw.data.content;
  if (Array.isArray(raw?.data))          return raw.data;
  return [];
}

function getTotal(raw) {
  return raw?.totalElements ?? raw?.data?.totalElements ?? raw?.total ?? raw?.data?.total ?? null;
}

function toMs(value) {
  if (!value) return null;
  let v = value;
  if (typeof v === "string" && /^\d+$/.test(v)) v = Number(v);
  if (typeof v === "number" && v < 1e12) v = v * 1000;
  const d = new Date(v);
  const ms = d.getTime();
  return Number.isFinite(ms) ? ms : null;
}

function pct(part, total) {
  if (!total) return "0.0%";
  return `${((part / total) * 100).toFixed(1)}%`;
}

function buildAgeBuckets(items, now = Date.now()) {
  const out = { new: 0, week: 0, old: 0 };
  for (const it of items || []) {
    const ms = toMs(it?.createdAt ?? it?.created_at ?? it?.created);
    if (!ms) continue;
    const days = (now - ms) / 86400000;
    if (days <= 1)  out.new  += 1;
    else if (days <= 14) out.week += 1;
    else            out.old  += 1;
  }
  return out;
}

/* Build last-N-months growth data from a list of items with createdAt */
function buildMonthlyGrowth(items, months = 6) {
  const now   = new Date();
  const result = [];
  for (let i = months - 1; i >= 0; i--) {
    const d    = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const mon  = d.getMonth();
    const label = d.toLocaleString("en-US", { month: "short" });
    const count = items.filter((it) => {
      const ms = toMs(it?.createdAt ?? it?.created_at);
      if (!ms) return false;
      const dt = new Date(ms);
      return dt.getFullYear() === year && dt.getMonth() === mon;
    }).length;
    result.push({ month: label, count });
  }
  return result;
}

/* ─── Section card wrapper ────────────────────────────────────────────────── */
function Card({ children, className = "" }) {
  return (
    <div className={`bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-800 ${className}`}>
      {children}
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-1 h-4 bg-blue-500 rounded-full" />
      <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">{children}</h3>
    </div>
  );
}

/* ─── Custom tooltip ─────────────────────────────────────────────────────── */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 shadow-lg">
      <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-xs" style={{ color: p.color }}>
          {p.name}: <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

/* ─── Application status badge ───────────────────────────────────────────── */
function StatusDot({ status }) {
  const map = {
    pending:  "bg-yellow-400",
    accepted: "bg-green-500",
    rejected: "bg-red-500",
  };
  return <span className={`inline-block w-2 h-2 rounded-full ${map[(status||"pending").toLowerCase()] || "bg-gray-400"}`} />;
}

/* ─── Mini stat row ──────────────────────────────────────────────────────── */
function MiniStat({ label, value, color = "text-slate-800 dark:text-white" }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-slate-700/50 last:border-0">
      <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
      <span className={`text-sm font-bold ${color}`}>{value}</span>
    </div>
  );
}

/* ─── Main ───────────────────────────────────────────────────────────────── */
export default function AnalyticsReporting() {
  const [loading, setLoading] = useState(true);

  /* Raw data */
  const [freelancerList,  setFreelancerList]  = useState([]);
  const [ownerList,       setOwnerList]       = useState([]);
  const [serviceList,     setServiceList]     = useState([]);
  const [jobList,         setJobList]         = useState([]);
  const [applications,    setApplications]    = useState([]);
  const [categories,      setCategories]      = useState([]);

  /* Totals */
  const [totals, setTotals] = useState({ freelancers: 0, owners: 0, posts: 0, jobs: 0 });

  const fetchAll = useCallback(async (first = false) => {
    if (first) setLoading(true);
    try {
      const [fRes, oRes, sRes, jRes, cRes] = await Promise.all([
        http.get(endpoints.users, { params: { userType: "freelancer",      page: 0, size: 9999 } }),
        http.get(endpoints.users, { params: { userType: "business_owner",  page: 0, size: 9999 } }),
        http.get(endpoints.services),
        http.get(endpoints.jobs),
        http.get("/api/jobs-service/categories"),
      ]);

      const fl = toArray(fRes.data);
      const ol = toArray(oRes.data);
      const sl = toArray(sRes.data);
      const jl = toArray(jRes.data);
      const cl = Array.isArray(cRes.data) ? cRes.data : Array.isArray(cRes.data?.data) ? cRes.data.data : [];

      setFreelancerList(fl);
      setOwnerList(ol);
      setServiceList(sl);
      setJobList(jl);
      setCategories(cl);
      setTotals({
        freelancers: getTotal(fRes.data) ?? fl.length,
        owners:      getTotal(oRes.data) ?? ol.length,
        posts:       getTotal(sRes.data) ?? sl.length,
        jobs:        getTotal(jRes.data) ?? jl.length,
      });

      /* Supabase applications */
      const { data: apps } = await supabase.from("job_applications").select("id, status, created_at");
      setApplications(apps || []);
    } catch (e) {
      console.error("analytics fetch:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll(true);
    const id = setInterval(() => fetchAll(false), POLL_MS);
    return () => clearInterval(id);
  }, [fetchAll]);

  /* ── Derived data ── */
  const now = Date.now();

  const fBuckets = useMemo(() => buildAgeBuckets(freelancerList, now), [freelancerList]);
  const oBuckets = useMemo(() => buildAgeBuckets(ownerList,      now), [ownerList]);
  const sBuckets = useMemo(() => buildAgeBuckets(serviceList,    now), [serviceList]);
  const jBuckets = useMemo(() => buildAgeBuckets(jobList,        now), [jobList]);

  /* Monthly growth charts */
  const freelancerGrowth = useMemo(() => buildMonthlyGrowth(freelancerList), [freelancerList]);
  const ownerGrowth      = useMemo(() => buildMonthlyGrowth(ownerList),      [ownerList]);
  const postGrowth       = useMemo(() => buildMonthlyGrowth(serviceList),    [serviceList]);
  const jobGrowth        = useMemo(() => buildMonthlyGrowth(jobList),        [jobList]);

  /* Combined user growth chart */
  const userGrowthChart = useMemo(() => {
    return freelancerGrowth.map((item, i) => ({
      month:       item.month,
      Freelancers: item.count,
      Businesses:  ownerGrowth[i]?.count || 0,
    }));
  }, [freelancerGrowth, ownerGrowth]);

  /* Combined posts chart */
  const postsChart = useMemo(() => {
    return postGrowth.map((item, i) => ({
      month:    item.month,
      Services: item.count,
      Jobs:     jobGrowth[i]?.count || 0,
    }));
  }, [postGrowth, jobGrowth]);

  /* Application stats */
  const appStats = useMemo(() => ({
    total:    applications.length,
    pending:  applications.filter((a) => !a.status || a.status === "pending").length,
    accepted: applications.filter((a) => a.status === "accepted").length,
    rejected: applications.filter((a) => a.status === "rejected").length,
  }), [applications]);

  /* Application monthly chart */
  const appGrowth = useMemo(() => buildMonthlyGrowth(applications), [applications]);

  /* Category distribution */
  const categoryDist = useMemo(() => {
    const map = {};
    serviceList.forEach((s) => {
      const name = s?.category?.name || s?.categoryName || "Unknown";
      map[name] = (map[name] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count]) => ({ name, count }));
  }, [serviceList]);

  /* Top skills among freelancers */
  const topSkills = useMemo(() => {
    const map = {};
    freelancerList.forEach((u) => {
      (u?.skills || []).forEach((s) => {
        const key = String(s).trim();
        if (key) map[key] = (map[key] || 0) + 1;
      });
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([skill, count]) => ({ skill, count }));
  }, [freelancerList]);

  /* Export data */
  const exportRows = useMemo(() => [
    { metric: "Total Freelancers",    value: totals.freelancers },
    { metric: "Total Business Owners", value: totals.owners },
    { metric: "Total Service Posts",  value: totals.posts },
    { metric: "Total Job Posts",      value: totals.jobs },
    { metric: "Total Applications",   value: appStats.total },
    { metric: "Pending Applications", value: appStats.pending },
    { metric: "Accepted Applications",value: appStats.accepted },
    { metric: "Rejected Applications",value: appStats.rejected },
    { metric: "Total Categories",     value: categories.length },
  ], [totals, appStats, categories]);

  const exportCols = [
    { id: "metric", header: "Metric", accessorFn: (r) => r.metric },
    { id: "value",  header: "Value",  accessorFn: (r) => r.value  },
  ];

  const donutServices = useMemo(() => [
    { name: "Last 24h",  value: sBuckets.new  },
    { name: "Last 2wks", value: sBuckets.week },
    { name: "Older",     value: sBuckets.old  },
  ], [sBuckets]);

  const donutJobs = useMemo(() => [
    { name: "Last 24h",  value: jBuckets.new  },
    { name: "Last 2wks", value: jBuckets.week },
    { name: "Older",     value: jBuckets.old  },
  ], [jBuckets]);

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">

      {/* ── Header row ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Analytics & Reporting</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Live dashboard · auto-refresh every {POLL_MS / 1000}s
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Live</span>
          </div>
          <ExportMenuButton rows={exportRows} columns={exportCols} filename="analytics" title="Analytics Report" />
        </div>
      </div>

      {/* ── Stat cards ── */}
      {/* Hero stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: "Freelancers",    value: totals.freelancers, delta: pct(fBuckets.new, totals.freelancers), icon: "👤", color: "from-blue-500 to-blue-600" },
          { label: "Business Owners", value: totals.owners,    delta: pct(oBuckets.new, totals.owners),      icon: "🏢", color: "from-violet-500 to-violet-600" },
          { label: "Service Posts",  value: totals.posts,       delta: pct(sBuckets.new, totals.posts),      icon: "📋", color: "from-emerald-500 to-emerald-600" },
          { label: "Job Posts",      value: totals.jobs,        delta: pct(jBuckets.new, totals.jobs),       icon: "💼", color: "from-amber-500 to-amber-600" },
        ].map(({ label, value, delta, icon, color }) => (
          <div key={label} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-20 h-20 rounded-full bg-gradient-to-br ${color} opacity-5 translate-x-6 -translate-y-6`} />
            <div className="text-2xl mb-2">{icon}</div>
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{label}</p>
            <p className="text-4xl font-black text-slate-800 dark:text-white mt-1">{value}</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1">↑ {delta} last 24h</p>
          </div>
        ))}
      </div>

      {/* ── Application summary ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: "Total Applications", value: appStats.total,    color: "text-blue-600",   bg: "bg-blue-50 dark:bg-blue-900/20",    icon: "📨" },
          { label: "Pending",            value: appStats.pending,  color: "text-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-900/20", icon: "⏳" },
          { label: "Accepted",           value: appStats.accepted, color: "text-green-600",  bg: "bg-green-50 dark:bg-green-900/20",  icon: "✅" },
          { label: "Rejected",           value: appStats.rejected, color: "text-red-600",    bg: "bg-red-50 dark:bg-red-900/20",      icon: "❌" },
        ].map(({ label, value, color, bg, icon }) => (
          <div key={label} className={`rounded-2xl border border-slate-200 dark:border-slate-800 px-5 py-4 shadow-sm ${bg}`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</p>
              <span className="text-lg">{icon}</span>
            </div>
            <p className={`text-3xl font-black ${color}`}>{value}</p>
            <p className="text-xs text-slate-400 mt-1">{value > 0 ? `${((value / Math.max(appStats.total, 1)) * 100).toFixed(0)}% of total` : "—"}</p>
          </div>
        ))}
      </div>

      {/* ── Growth charts ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

        {/* User growth */}
        <Card>
          <SectionTitle>User Growth (6 months)</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={userGrowthChart} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gF" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gB" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="Freelancers" stroke="#3b82f6" fill="url(#gF)" strokeWidth={2} />
              <Area type="monotone" dataKey="Businesses"  stroke="#8b5cf6" fill="url(#gB)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Posts growth */}
        <Card>
          <SectionTitle>Posts Growth (6 months)</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={postsChart} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Services" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Jobs"     fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* ── Applications chart + donut ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* Application trend */}
        <Card className="xl:col-span-2">
          <SectionTitle>Application Trend (6 months)</SectionTitle>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={appGrowth} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#06b6d4" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="count" name="Applications" stroke="#06b6d4" fill="url(#gA)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Application status breakdown */}
        <Card>
          <SectionTitle>Application Status</SectionTitle>
          <div className="space-y-1">
            <MiniStat label="Total"    value={appStats.total} />
            <MiniStat label="Pending"  value={appStats.pending}  color="text-yellow-600" />
            <MiniStat label="Accepted" value={appStats.accepted} color="text-green-600" />
            <MiniStat label="Rejected" value={appStats.rejected} color="text-red-500" />
          </div>

          {/* Mini progress bars */}
          <div className="mt-4 space-y-2.5">
            {[
              { label: "Accepted", count: appStats.accepted, color: "bg-green-500"  },
              { label: "Pending",  count: appStats.pending,  color: "bg-yellow-400" },
              { label: "Rejected", count: appStats.rejected, color: "bg-red-500"    },
            ].map(({ label, count, color }) => {
              const w = appStats.total > 0 ? (count / appStats.total) * 100 : 0;
              return (
                <div key={label}>
                  <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                    <span>{label}</span>
                    <span>{w.toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ${color}`}
                         style={{ width: `${w}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* ── Category + Skills + Donuts ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* Top categories */}
        <Card>
          <SectionTitle>Top Service Categories</SectionTitle>
          {categoryDist.length === 0 ? (
            <p className="text-sm text-slate-400">No data</p>
          ) : (
            <div className="space-y-3">
              {categoryDist.map(({ name, count }, i) => {
                const max = categoryDist[0]?.count || 1;
                const w   = (count / max) * 100;
                const colors = ["#3b82f6","#8b5cf6","#10b981","#f59e0b","#ef4444","#06b6d4"];
                return (
                  <div key={name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600 dark:text-slate-300 font-medium truncate">{name}</span>
                      <span className="text-slate-400 shrink-0 ml-2">{count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                           style={{ width: `${w}%`, background: colors[i % colors.length] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Top skills */}
        <Card>
          <SectionTitle>Top Freelancer Skills</SectionTitle>
          {topSkills.length === 0 ? (
            <p className="text-sm text-slate-400">No skill data</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topSkills} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} allowDecimals={false} />
                <YAxis type="category" dataKey="skill" tick={{ fontSize: 10, fill: "#94a3b8" }} width={70} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Freelancers" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Platform summary */}
        <Card>
          <SectionTitle>Platform Summary</SectionTitle>
          <div className="space-y-1 mb-4">
            <MiniStat label="Total Users"      value={totals.freelancers + totals.owners} />
            <MiniStat label="Freelancers"      value={totals.freelancers} color="text-blue-600" />
            <MiniStat label="Business Owners"  value={totals.owners}      color="text-violet-600" />
            <MiniStat label="Service Posts"    value={totals.posts}       color="text-emerald-600" />
            <MiniStat label="Job Posts"        value={totals.jobs}        color="text-yellow-600" />
            <MiniStat label="Categories"       value={categories.length}  />
            <MiniStat label="Applications"     value={appStats.total}     color="text-cyan-600" />
          </div>
          <div className="text-xs text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-50 dark:border-slate-700">
            Last refreshed: {new Date().toLocaleTimeString()}
          </div>
        </Card>
      </div>

      {/* ── Donuts ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <DonutCard title="Service Post Age"      value={totals.posts} delta={pct(sBuckets.new, totals.posts)} data={donutServices} />
        <DonutCard title="Job Post Age"          value={totals.jobs}  delta={pct(jBuckets.new, totals.jobs)}  data={donutJobs} />
        <DonutCard
          title="Freelancer Activity"
          value={totals.freelancers}
          delta={pct(fBuckets.new, totals.freelancers)}
          data={[
            { name: "Last 24h",  value: fBuckets.new  },
            { name: "Last 2wks", value: fBuckets.week },
            { name: "Older",     value: fBuckets.old  },
          ]}
        />
        <DonutCard
          title="Business Activity"
          value={totals.owners}
          delta={pct(oBuckets.new, totals.owners)}
          data={[
            { name: "Last 24h",  value: oBuckets.new  },
            { name: "Last 2wks", value: oBuckets.week },
            { name: "Older",     value: oBuckets.old  },
          ]}
        />
      </div>

    </div>
  );
}