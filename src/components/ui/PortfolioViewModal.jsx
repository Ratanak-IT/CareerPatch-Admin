
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);


function safeText(v, fallback = "—") {
  return String(v ?? "").trim() || fallback;
}
function initials(name) {
  return (name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}
const SOCIAL_LABELS = {
  github: "GitHub", linkedin: "LinkedIn", facebook: "Facebook",
  telegram: "Telegram", twitter: "Twitter", youtube: "YouTube",
};

/* ─── Skill bar ──────────────────────────────────────────────────────────── */
function SkillBar({ skill }) {
  const [grown, setGrown] = useState(false);
  useEffect(() => { const t = setTimeout(() => setGrown(true), 100); return () => clearTimeout(t); }, []);
  const pct   = Math.min(100, Math.max(0, skill.percent || 0));
  const color = skill.color || "#1E88E5";
  return (
    <div className="mb-3">
      <div className="flex justify-between text-sm font-semibold mb-1">
        <span className="text-slate-700 dark:text-slate-200">{skill.name}</span>
        <span style={{ color }}>{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700 ease-out"
             style={{ width: grown ? `${pct}%` : "0%", background: color }} />
      </div>
    </div>
  );
}

/* ─── Section ────────────────────────────────────────────────────────────── */
function Section({ title, accent, children }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-base font-bold text-slate-800 dark:text-white">{title}</h3>
        <div className="flex-1 h-px" style={{ background: `${accent}40` }} />
      </div>
      {children}
    </div>
  );
}

/* ─── Empty state ────────────────────────────────────────────────────────── */
function EmptyPortfolio({ freelancer }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4">
        <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      </div>
      <p className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-1">No portfolio yet</p>
      <p className="text-sm text-slate-400 dark:text-slate-500">
        <span className="font-semibold">{freelancer?.fullName || "This freelancer"}</span> hasn't set up their portfolio.
      </p>
    </div>
  );
}

/* ─── Fullscreen iframe view ─────────────────────────────────────────────── */
function FullscreenView({ freelancer, onClose }) {
  const [loaded, setLoaded] = useState(false);
  // In dev: use localhost:5173 (user platform dev server)
  // In prod: use VITE_PLATFORM_URL env variable
  const baseUrl = import.meta.env.DEV
    ? "http://localhost:5173"
    : (import.meta.env.VITE_PLATFORM_URL || "");
  const portfolioUrl = `${baseUrl}/portfolio/${freelancer?.id}`;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black">
      {/* Thin topbar */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-black/80 backdrop-blur-sm border-b border-white/10 shrink-0">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-xs font-semibold text-white/70 hover:text-white transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to panel
        </button>

        <div className="flex items-center gap-2 ml-2">
          {freelancer?.profileImageUrl ? (
            <img src={freelancer.profileImageUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] font-bold">
              {initials(freelancer?.fullName)}
            </div>
          )}
          <span className="text-xs text-white/80 font-medium">
            {safeText(freelancer?.fullName, "Freelancer")}'s Portfolio
          </span>
        </div>

        <span className="ml-auto text-[10px] text-white/30">CareerPatch Admin</span>
      </div>

      {/* iframe */}
      <div className="flex-1 relative">
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-400">Loading portfolio…</p>
            </div>
          </div>
        )}
        <iframe
          src={portfolioUrl}
          title={`${freelancer?.fullName} Portfolio`}
          className="w-full h-full border-0"
          onLoad={() => setLoaded(true)}
        />
      </div>
    </div>
  );
}

/* ─── Main modal ─────────────────────────────────────────────────────────── */
export default function PortfolioViewModal({ freelancer, onClose }) {
  const [portfolio,   setPortfolio]   = useState(null);
  const [template,    setTemplate]    = useState("minimal");
  const [loading,     setLoading]     = useState(true);
  const [fullscreen,  setFullscreen]  = useState(false);

  const userId = freelancer?.id;

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    supabase
      .from("portfolios")
      .select("*")
      .eq("user_id", String(userId))
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error("portfolio fetch:", error);
        if (data) {
          setTemplate(data.template || "minimal");
          setPortfolio(data.data || null);
        }
        setLoading(false);
      });
  }, [userId]);

  useEffect(() => {
    if (!fullscreen) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [fullscreen]);

  /* ── Fullscreen mode ── */
  if (fullscreen) {
    return <FullscreenView freelancer={freelancer} onClose={() => setFullscreen(false)} />;
  }

  const acc     = portfolio?.accentColor || "#1E88E5";
  const skills  = Array.isArray(portfolio?.skills)       ? portfolio.skills       : [];
  const projs   = Array.isArray(portfolio?.projects)     ? portfolio.projects     : [];
  const certs   = Array.isArray(portfolio?.certificates) ? portfolio.certificates : [];
  const exp     = Array.isArray(portfolio?.experience)   ? portfolio.experience   : [];
  const edu     = Array.isArray(portfolio?.education)    ? portfolio.education    : [];
  const socials = portfolio?.socials || {};

  return (
    <div className="fixed inset-0 flex z-100">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Slide-over panel */}
      <div className="relative ml-auto w-full max-w-2xl h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden animate-slide-in">

        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          {freelancer?.profileImageUrl ? (
            <img src={freelancer.profileImageUrl} alt=""
              className="w-10 h-10 rounded-full object-cover border-2 shrink-0"
              style={{ borderColor: acc }} />
          ) : (
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                 style={{ background: acc }}>
              {initials(freelancer?.fullName)}
            </div>
          )}
          
          <div className="min-w-0 flex-1">
            <p className="font-bold text-slate-800 dark:text-white text-sm truncate">
              {safeText(freelancer?.fullName, "Freelancer")}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-slate-400 truncate">{safeText(freelancer?.email)}</span>
              {template && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize shrink-0"
                      style={{ background: `${acc}20`, color: acc }}>{template}</span>
              )}
            </div>
          </div>

          {/* Fullscreen button */}
          <button
            onClick={() => setFullscreen(true)}
            title="View fullscreen"
            className="w-9 h-9 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
            </svg>
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !portfolio || !portfolio.name ? (
            <EmptyPortfolio freelancer={freelancer} />
          ) : (
            <div className="px-6 py-5">

              {/* Hero */}
              <div className="rounded-2xl p-5 mb-5 flex items-center gap-4"
                   style={{ background: `${acc}12`, border: `1px solid ${acc}30` }}>
                {portfolio.avatar ? (
                  <img src={portfolio.avatar} alt=""
                    className="w-14 h-14 rounded-xl object-cover shrink-0 border-2"
                    style={{ borderColor: acc }} />
                ) : (
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-black shrink-0"
                       style={{ background: acc }}>
                    {initials(portfolio.name)}
                  </div>
                )}
                <div className="min-w-0">
                  <h2 className="text-lg font-black text-slate-800 dark:text-white">{portfolio.name}</h2>
                  {portfolio.title && <p className="text-sm font-semibold" style={{ color: acc }}>{portfolio.title}</p>}
                  {portfolio.bio   && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{portfolio.bio}</p>}
                  <div className="flex flex-wrap gap-3 mt-1.5">
                    {portfolio.location && <span className="text-xs text-slate-400">📍 {portfolio.location}</span>}
                    {portfolio.email    && <span className="text-xs text-slate-400">✉ {portfolio.email}</span>}
                  </div>
                </div>
              </div>

              {/* Fullscreen CTA banner */}
              <button
                onClick={() => setFullscreen(true)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl mb-5 border-2 border-dashed text-sm font-semibold transition hover:opacity-80"
                style={{ borderColor: `${acc}50`, color: acc, background: `${acc}08` }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                </svg>
                View Full Portfolio
              </button>

              {/* Socials */}
              {Object.entries(socials).some(([, v]) => v) && (
                <div className="flex flex-wrap gap-2 mb-5">
                  {Object.entries(socials).filter(([, v]) => v).map(([k, v]) => (
                    <a key={k} href={v} target="_blank" rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition hover:opacity-80"
                      style={{ borderColor: `${acc}50`, color: acc, background: `${acc}10` }}>
                      {SOCIAL_LABELS[k] || k}
                    </a>
                  ))}
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-4 gap-2 mb-5">
                {[
                  { label: "Skills",     value: skills.length },
                  { label: "Projects",   value: projs.length  },
                  { label: "Experience", value: exp.length    },
                  { label: "Certs",      value: certs.length  },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-xl p-3 text-center border border-slate-100 dark:border-slate-800">
                    <p className="text-xl font-black" style={{ color: acc }}>{value}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              {/* Skills */}
              {skills.length > 0 && (
                <Section title="Skills" accent={acc}>
                  <div className="grid sm:grid-cols-2 gap-x-6">
                    {skills.map((s, i) => <SkillBar key={i} skill={s} />)}
                  </div>
                </Section>
              )}

              {/* Projects */}
              {projs.length > 0 && (
                <Section title="Projects" accent={acc}>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {projs.map((p, i) => (
                      <div key={i} className="rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                        {p.image ? (
                          <img src={p.image} alt="" className="w-full h-28 object-cover" />
                        ) : (
                          <div className="h-16 flex items-center justify-center text-2xl font-black"
                               style={{ background: `${acc}15`, color: `${acc}60` }}>{"{}"}</div>
                        )}
                        <div className="p-3">
                          <p className="font-bold text-sm text-slate-800 dark:text-white">{p.title}</p>
                          {p.desc && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{p.desc}</p>}
                          {Array.isArray(p.tags) && p.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {p.tags.map((t, j) => (
                                <span key={j} className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                                      style={{ background: `${acc}15`, color: acc }}>{t}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Experience */}
              {exp.length > 0 && (
                <Section title="Experience" accent={acc}>
                  <div className="space-y-4">
                    {exp.map((e, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="w-2 h-2 rounded-full mt-2 shrink-0" style={{ background: acc }} />
                        <div>
                          <p className="font-bold text-sm text-slate-800 dark:text-white">{e.role}</p>
                          <p className="text-xs font-semibold" style={{ color: acc }}>{e.company}</p>
                          <p className="text-xs text-slate-400">{e.from} – {e.to || "Present"}</p>
                          {e.desc && <p className="text-xs text-slate-500 mt-1">{e.desc}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Education */}
              {edu.length > 0 && (
                <Section title="Education" accent={acc}>
                  <div className="space-y-3">
                    {edu.map((e, i) => (
                      <div key={i} className="flex items-start justify-between">
                        <div>
                          <p className="font-bold text-sm text-slate-800 dark:text-white">{e.degree}</p>
                          <p className="text-xs" style={{ color: acc }}>{e.school}</p>
                        </div>
                        <span className="text-xs text-slate-400 shrink-0">{e.from}–{e.to || "Now"}</span>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Certificates */}
              {certs.length > 0 && (
                <Section title="Certificates" accent={acc}>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {certs.map((c, i) => (
                      <a key={i} href={c.url || "#"} target={c.url ? "_blank" : "_self"} rel="noopener noreferrer"
                        className="block rounded-xl border border-slate-100 dark:border-slate-700 p-3 hover:shadow-sm transition">
                        {c.image && <img src={c.image} alt="" className="w-full h-16 object-cover rounded-lg mb-2" />}
                        <p className="font-bold text-sm" style={{ color: acc }}>{c.title}</p>
                        {c.issuer && <p className="text-xs text-slate-400 mt-0.5">{c.issuer}</p>}
                        {c.url && <span className="text-xs font-semibold mt-1 inline-block" style={{ color: acc }}>View ↗</span>}
                      </a>
                    ))}
                  </div>
                </Section>
              )}

            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slide-in {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
        .animate-slide-in {
          animation: slide-in 0.28s cubic-bezier(0.22, 1, 0.36, 1);
        }
      `}</style>
    </div>
  );
}