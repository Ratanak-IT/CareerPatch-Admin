// src/components/ui/LineSpark.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { LineChart, Line } from "recharts";

export default function LineSpark({ data, height = 40 }) {
  const chartData = useMemo(() => {
    const fallback = [
      { v: 2 },
      { v: 3 },
      { v: 2 },
      { v: 4 },
      { v: 3 },
      { v: 5 },
      { v: 6 },
      { v: 5 },
      { v: 7 },
    ];
    return Array.isArray(data) && data.length ? data : fallback;
  }, [data]);

  const wrapRef = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const read = () => {
      const w = Math.floor(el.getBoundingClientRect().width || 0);
      const h = Math.floor(el.getBoundingClientRect().height || 0);
      setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    };

    read();

    const ro = new ResizeObserver(() => read());
    ro.observe(el);

    // extra: next frame read (helps StrictMode/layout timing)
    const raf = requestAnimationFrame(read);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className="mt-2 w-full min-w-0 text-violet-500"
      style={{ height, minHeight: height }}
    >
      {size.w > 0 && size.h > 0 ? (
        <LineChart
          width={size.w}
          height={size.h}
          data={chartData}
          margin={{ top: 2, right: 0, left: 0, bottom: 2 }}
        >
          <Line
            type="monotone"
            dataKey="v"
            dot={false}
            stroke="currentColor"
            strokeWidth={2}
            isAnimationActive={false}
          />
        </LineChart>
      ) : null}
    </div>
  );
}