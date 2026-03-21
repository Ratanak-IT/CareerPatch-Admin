import { useEffect, useMemo, useRef, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import AnimatedNumber from "./AnimatedNumber";

export default function DonutCard({ title, value, delta, data }) {
  const COLORS = ["#f59e0b", "#fdba74", "#1d4ed8"];

  const deltaStr = delta == null ? null : String(delta);
  const isNeg = deltaStr?.startsWith("-");

  const wrapRef = useRef(null);
  const [wrapW, setWrapW] = useState(0);

  useEffect(() => {
    if (!wrapRef.current) return;
    const el = wrapRef.current;
    const ro = new ResizeObserver((entries) => {
      const w = entries?.[0]?.contentRect?.width ?? 0;
      setWrapW(Math.round(w));
    });
    ro.observe(el);
    setWrapW(Math.round(el.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, []);

  const chart = useMemo(() => {
    const W = wrapW || 240;
    const outerRadius = Math.max(65, Math.min(100, Math.round(W * 0.38)));
    const innerRadius = Math.max(45, Math.round(outerRadius * 0.69));
    const fontSize = Math.max(12, Math.min(18, Math.round(W * 0.07)));
    const showLabels = W >= 160;
    const minLabelPct = 6;

    const renderLabel = ({ percent, x, y, cx, cy }) => {
      if (!showLabels) return "";
      const p = (percent || 0) * 100;
      if (p < minLabelPct) return "";
      const dx = x - cx;
      const dy = y - cy;
      const scale = 0.9;
      const nx = cx + dx * scale;
      const ny = cy + dy * scale;
      return (
        <text
          x={nx} y={ny}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={fontSize}
          fill="#9ca3af"
          style={{ pointerEvents: "none" }}
        >
          {`${Math.round(p)}%`}
        </text>
      );
    };

    return { outerRadius, innerRadius, renderLabel };
  }, [wrapW]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-800">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-md text-gray-500 dark:text-gray-100 font-medium">{title}</div>
          <div className="flex items-baseline gap-3.5 mt-1">
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              <AnimatedNumber value={value} />
            </div>
            {deltaStr && (
              <div className={`flex items-center gap-0.5 text-sm font-semibold ${isNeg ? "text-red-500" : "text-green-500"}`}>
                <span>{isNeg ? "↓" : "↑"}</span>
                {deltaStr.replace("-", "")}
              </div>
            )}
          </div>
          <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">last day</div>
        </div>
      </div>

      {/* Body */}
      <div className="flex items-center justify-between gap-4 mt-3">
        {/* Legend */}
        <div className="flex flex-col gap-2.5">
          {data.map((d, idx) => (
            <div key={d.name} className="flex items-center gap-2.5 text-xs text-gray-500 dark:text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ background: COLORS[idx % COLORS.length] }} />
              <span>{d.name}</span>
            </div>
          ))}
        </div>

        {/* Donut */}
        <div ref={wrapRef} className="w-[60%] min-w-[140px]">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                innerRadius={chart.innerRadius}
                outerRadius={chart.outerRadius}
                paddingAngle={2}
                labelLine={false}
                label={chart.renderLabel}
                isAnimationActive
              >
                {data.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}