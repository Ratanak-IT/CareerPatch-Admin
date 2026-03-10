import LineSpark from "./LineSpark";
import AnimatedNumber from "./AnimatedNumber";

export default function StatCard({
  label,
  value,
  delta,
  sub,
  spark = false,
  sparkData = null,
}) {
  const deltaStr = delta == null ? null : String(delta);
  const isNeg = deltaStr?.startsWith("-");

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col gap-1 w-full min-w-0">
      {/* Top row: label + icon */}
      <div className="flex items-start justify-between">
        <div className="text-sm text-gray-500 font-medium">{label}</div>
        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-base leading-none">
          ⧉
        </div>
      </div>

      {/* Value */}
      <div className="text-4xl font-bold text-gray-900 mt-1">
        <AnimatedNumber value={value} />
      </div>

      {/* Delta */}
      {deltaStr && (
        <div
          className={`flex items-center gap-1 text-sm font-semibold mt-1 ${
            isNeg ? "text-red-500" : "text-green-600"
          }`}
        >
          <span>{isNeg ? "↓" : "↑"}</span>
          {deltaStr.replace("-", "")}
        </div>
      )}

      {/* Sub label */}
      {sub && <div className="text-xs text-gray-400">{sub}</div>}

      {/* Sparkline */}
      {spark ? (
        <div className="flex items-center gap-3 w-full">
          <div className="flex-1 w-full min-w-0">
            <LineSpark data={sparkData} height={40} />
          </div>
        </div>
      ) : null}
    </div>
  );
}