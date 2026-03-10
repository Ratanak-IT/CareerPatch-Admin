// src/components/ui/RecentActivities.jsx
import { useEffect, useMemo, useState } from "react";
import { http } from "../../api/http";
import { endpoints } from "../../api/endpoints";
import { getAvatarUrl, toAbsoluteUrl } from "../../utils/avatar";

const POLL_MS = 10_000;

function formatDDMMYYYY(dateStr) {
  // expects "YYYY-MM-DD" (or "YYYY-MM-DDTHH:mm:ss...")
  if (!dateStr) return "";
  const d = String(dateStr).slice(0, 10); // keep only YYYY-MM-DD
  const [yyyy, mm, dd] = d.split("-");
  if (!yyyy || !mm || !dd) return "";
  return `${dd}/${mm}/${yyyy}`;
}

function safeArray(data) {
  // support: { content: [] } OR { data: { content: [] } } OR [] OR { data: [] }
  const next = data?.content ?? data?.data?.content ?? data?.data ?? data ?? [];
  return Array.isArray(next) ? next : [];
}

function sortByCreatedAtDesc(list) {
  return [...list].sort((a, b) => new Date(b?.createdAt) - new Date(a?.createdAt));
}

export default function RecentActivities() {
  const [freelancers, setFreelancers] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [errFreelancer, setErrFreelancer] = useState(null);
  const [errBusiness, setErrBusiness] = useState(null);

  const freelancerList = useMemo(
    () => (Array.isArray(freelancers) ? freelancers : []),
    [freelancers]
  );

  const businessList = useMemo(
    () => (Array.isArray(businesses) ? businesses : []),
    [businesses]
  );

  // ✅ Freelancer
  useEffect(() => {
    let cancelled = false;
    let id = null;

    const run = async () => {
      try {
        setErrFreelancer(null);

        // /api/users?userType=freelancer (from your endpoints)
        const res = await http.get(endpoints.getFreelan, {
          params: { sortBy: "createdAt" },
        });

        if (cancelled) return;

        const next = safeArray(res?.data);
        setFreelancers(sortByCreatedAtDesc(next));
      } catch (e) {
        if (cancelled) return;
        console.error(e);
        setErrFreelancer("Failed to load freelancers.");
        setFreelancers([]);
      }
    };

    run();
    id = window.setInterval(run, POLL_MS);

    return () => {
      cancelled = true;
      if (id) window.clearInterval(id);
    };
  }, []);

  // ✅ Business Owner
  useEffect(() => {
    let cancelled = false;
    let id = null;

    const run = async () => {
      try {
        setErrBusiness(null);

        const res = await http.get("/api/users", {
          params: {
            userType: "business_owner",
            sortBy: "createdAt",
          },
        });

        if (cancelled) return;

        const next = safeArray(res?.data);

        // keep only what you want + sort same as freelancer
        const cleaned = next.map((u) => ({
          id: u?.id,
          profileImageUrl: u?.profileImageUrl,
          fullName: u?.fullName,
          userType: u?.userType,
          createdAt: u?.createdAt,
        }));

        setBusinesses(sortByCreatedAtDesc(cleaned));
      } catch (e) {
        if (cancelled) return;
        console.error(e);
        setErrBusiness("Failed to load businesses.");
        setBusinesses([]);
      }
    };

    run();
    id = window.setInterval(run, POLL_MS);

    return () => {
      cancelled = true;
      if (id) window.clearInterval(id);
    };
  }, []);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 dark:bg-slate-900 dark:border-slate-800">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* LEFT: Freelancer */}
        <div className="min-w-0">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-semibold text-slate-700 dark:text-slate-100">
              New Freelancer
            </div>
          </div>

          {errFreelancer ? (
            <div className="mt-4 text-sm text-red-500">{errFreelancer}</div>
          ) : null}

          <div className="mt-5 space-y-4">
            {freelancerList.slice(0, 6).map((u, idx) => {
              const key = u?.id ?? u?.userId ?? u?.email ?? idx;

              const avatar = toAbsoluteUrl(getAvatarUrl(u));
              const name = u?.fullName || u?.name || u?.email || "User";
              const time = formatDDMMYYYY(u?.createdAt);
              const initial = String(name).trim().charAt(0).toUpperCase() || "U";

              return (
                <div key={key} className="flex items-center gap-4">
                  {avatar ? (
                    <img
                      className="h-11 w-11 rounded-full object-cover"
                      src={avatar}
                      alt={name}
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="h-11 w-11 rounded-full bg-slate-200 text-slate-700 grid place-items-center font-extrabold dark:bg-slate-800 dark:text-slate-200">
                      {initial}
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="text-slate-700 dark:text-slate-100 truncate">
                      <span className="font-bold">{name}</span>
                      {u?.userType ? (
                        <span className="text-slate-500 dark:text-slate-400">
                          {", "}
                          {u.userType}
                        </span>
                      ) : null}
                    </div>

                    <div className="text-slate-500 text-sm dark:text-slate-400">
                      {time}
                    </div>
                  </div>
                </div>
              );
            })}

            {freelancerList.length === 0 && !errFreelancer ? (
              <div className="text-sm text-slate-400 dark:text-slate-500">
                No new freelancers found.
              </div>
            ) : null}
          </div>
        </div>

        {/* RIGHT: Business */}
        <div className="min-w-0">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-semibold text-slate-700 dark:text-slate-100">
              New Business
            </div>
          </div>

          {errBusiness ? (
            <div className="mt-4 text-sm text-red-500">{errBusiness}</div>
          ) : null}

          <div className="mt-5 space-y-4">
            {businessList.slice(0, 6).map((u, idx) => {
              const key = u?.id ?? idx;

              const avatar = u?.profileImageUrl;
              const name = u?.fullName || "Business";
              const time = formatDDMMYYYY(u?.createdAt);
              const initial = String(name).trim().charAt(0).toUpperCase() || "B";

              return (
                <div key={key} className="flex items-center gap-4">
                  {avatar ? (
                    <img
                      className="h-11 w-11 rounded-full object-cover"
                      src={avatar}
                      alt={name}
                      onError={(e) => (e.currentTarget.style.display = "none")}
                    />
                  ) : (
                    <div className="h-11 w-11 rounded-full bg-slate-200 text-slate-700 grid place-items-center font-extrabold dark:bg-slate-800 dark:text-slate-200">
                      {initial}
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="text-slate-700 dark:text-slate-100 truncate">
                      <span className="font-bold">{name}</span>
                      <span className="text-slate-500 dark:text-slate-400">
                        {", "}
                        BUSINESS
                      </span>
                    </div>

                    <div className="text-slate-500 text-sm dark:text-slate-400">
                      {time}
                    </div>
                  </div>
                </div>
              );
            })}

            {businessList.length === 0 && !errBusiness ? (
              <div className="text-sm text-slate-400 dark:text-slate-500">
                No new business found.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}