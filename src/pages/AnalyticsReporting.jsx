import { useEffect, useMemo, useState } from "react";
import { http } from "../api/http";
import { endpoints } from "../api/endpoints";
import StatCard from "../components/ui/StatCard";
import DonutCard from "../components/ui/DonutCard";
import RecentActivities from "../components/ui/RecentActivities";
import Loading from "../components/ui/Loading";

const POLL_MS = 10_000;

function toArray(raw) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.content)) return raw.content;
  if (Array.isArray(raw?.data?.content)) return raw.data.content;
  if (Array.isArray(raw?.data)) return raw.data;
  return [];
}

function getTotal(raw) {
  return (
    raw?.totalElements ??
    raw?.data?.totalElements ??
    raw?.total ??
    raw?.data?.total ??
    null
  );
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

function buildAgeBuckets(items, now = Date.now()) {
  const NEW_MAX_DAYS = 1;
  const WEEK_MAX_DAYS = 14;

  const out = { new: 0, week: 0, old: 0 };
  for (const it of items || []) {
    const ms = toMs(it?.createdAt ?? it?.created_at ?? it?.created);
    if (!ms) continue;

    const ageDays = (now - ms) / 86400000;
    if (ageDays <= NEW_MAX_DAYS) out.new += 1;
    else if (ageDays <= WEEK_MAX_DAYS) out.week += 1;
    else out.old += 1;
  }
  return out;
}

function pct(part, total) {
  if (!total) return "0.0%";
  return `${((part / total) * 100).toFixed(1)}%`;
}

export default function AnalyticsReporting() {
  const [loading, setLoading] = useState(true);

  const [counts, setCounts] = useState({
    freelancers: 0,
    owners: 0,
    posts: 0,
    announcements: 0,
  });

  const [servicesBuckets, setServicesBuckets] = useState({
    new: 0,
    week: 0,
    old: 0,
  });
  const [jobsBuckets, setJobsBuckets] = useState({ new: 0, week: 0, old: 0 });

  // NEW: buckets for users so we can compute "last day %" like DonutCard
  const [freelancerBuckets, setFreelancerBuckets] = useState({
    new: 0,
    week: 0,
    old: 0,
  });
  const [ownerBuckets, setOwnerBuckets] = useState({ new: 0, week: 0, old: 0 });

  useEffect(() => {
    let mounted = true;
    let timer = null;

    const run = async (isFirst = false) => {
      if (isFirst) setLoading(true);

      try {
        // IMPORTANT:
        // We fetch user lists (size 10000) so we can compute created-in-last-day.
        // If you have server-side "createdAfter" filters, that’s even better.
        const [freelancersRes, ownersRes, servicesRes, jobsRes] =
          await Promise.all([
            http.get(endpoints.users, {
              params: {
                userType: "freelancer",
                page: 0,
                size: 10000,
                sortBy: "createdAt", // ok if supported; if not, remove
              },
            }),
            http.get(endpoints.users, {
              params: {
                userType: "business_owner",
                page: 0,
                size: 10000,
                sortBy: "createdAt",
              },
            }),
            http.get(endpoints.services),
            http.get(endpoints.jobs),
          ]);

        const freelancersList = toArray(freelancersRes.data);
        const ownersList = toArray(ownersRes.data);

        const servicesList = toArray(servicesRes.data);
        const jobsList = toArray(jobsRes.data);

        const freelancersTotal =
          getTotal(freelancersRes.data) ?? freelancersList.length;
        const ownersTotal = getTotal(ownersRes.data) ?? ownersList.length;

        const postsTotal = getTotal(servicesRes.data) ?? servicesList.length;
        const announcementsTotal = getTotal(jobsRes.data) ?? jobsList.length;

        const now = Date.now();

        const nextCounts = {
          freelancers: freelancersTotal,
          owners: ownersTotal,
          posts: postsTotal,
          announcements: announcementsTotal,
        };

        const sBuckets = buildAgeBuckets(servicesList, now);
        const jBuckets = buildAgeBuckets(jobsList, now);

        const fBuckets = buildAgeBuckets(freelancersList, now);
        const oBuckets = buildAgeBuckets(ownersList, now);

        if (!mounted) return;

        setCounts(nextCounts);
        setServicesBuckets(sBuckets);
        setJobsBuckets(jBuckets);
        setFreelancerBuckets(fBuckets);
        setOwnerBuckets(oBuckets);
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    run(true);
    timer = setInterval(() => run(false), POLL_MS);

    return () => {
      mounted = false;
      if (timer) clearInterval(timer);
    };
  }, []);

  const donutServices = useMemo(
    () => [
      { name: "new post", value: servicesBuckets.new },
      { name: "Per week", value: servicesBuckets.week },
      { name: "Old post", value: servicesBuckets.old },
    ],
    [servicesBuckets],
  );

  const donutJobs = useMemo(
    () => [
      { name: "new", value: jobsBuckets.new },
      { name: "Per week", value: jobsBuckets.week },
      { name: "Old post", value: jobsBuckets.old },
    ],
    [jobsBuckets],
  );

  // existing "last day" metrics
  const servicesLastDayPct = useMemo(
    () => pct(servicesBuckets.new, counts.posts),
    [servicesBuckets.new, counts.posts],
  );
  const jobsLastDayPct = useMemo(
    () => pct(jobsBuckets.new, counts.announcements),
    [jobsBuckets.new, counts.announcements],
  );

  // NEW: user last-day metrics (this replaces the old delta-vs-prev logic)
  const freelancersLastDayPct = useMemo(
    () => pct(freelancerBuckets.new, counts.freelancers),
    [freelancerBuckets.new, counts.freelancers],
  );
  const ownersLastDayPct = useMemo(
    () => pct(ownerBuckets.new, counts.owners),
    [ownerBuckets.new, counts.owners],
  );

  if (loading) return <Loading />;

  return (
    <div id="pdf-root" className="space-y-6">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Freelancer"
          value={counts.freelancers}
          delta={freelancersLastDayPct}
          sub="last day"
        />
        <StatCard
          label="Business Owner"
          value={counts.owners}
          delta={ownersLastDayPct}
          sub="last day"
        />

        <StatCard
          label="Freelancer Post Analytic"
          value={counts.posts}
          delta={servicesLastDayPct}
          sub="last day"
        />
        <StatCard
          label="Announcement Analytic"
          value={counts.announcements}
          delta={jobsLastDayPct}
          sub="last day"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Post Count"
          value={counts.posts}
          spark
          sparkData={[{ v: 1 }, { v: 2 }, { v: 3 }, { v: 2 }, { v: 5 }]}
        />
        <StatCard
          label="Announcement count"
          value={counts.announcements}
          spark
          sparkData={[{ v: 2 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 3 }]}
        />

        <DonutCard
          title="Freelancer Post Analytic"
          value={counts.posts}
          delta={servicesLastDayPct}
          data={donutServices}
        />
        <DonutCard
          title="Announcement Analytic"
          value={counts.announcements}
          delta={jobsLastDayPct}
          data={donutJobs}
        />
      </div>

      <div>
        <RecentActivities />
      </div>
    </div>
  );
}