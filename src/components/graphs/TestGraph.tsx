"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type FinalGraphSegment = {
  timesMs?: number[];
  eyeValues?: number[];
  headValues?: number[];
};

type FinalGraphSeries = {
  graphKey?: string;
  title?: string;
  segments?: FinalGraphSegment[];
  meanGain?: number;
  impulseCount?: number;
  xLabel?: string;
  yLabel?: string;
};

type ChartRow = {
  time: number;
  [key: string]: number;
};

function toNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item));
}

function formatNumber(value: unknown, digits = 2) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) return "-";

  return numberValue.toFixed(digits);
}

export default function TestGraph({ graph }: { graph: FinalGraphSeries }) {
  const segments = graph.segments ?? [];

  const chartData: ChartRow[] = [];
  const lineKeys: { key: string; type: "head" | "eye"; index: number }[] = [];

  segments.forEach((segment, segmentIndex) => {
    const times = toNumberArray(segment.timesMs);
    const eyeValues = toNumberArray(segment.eyeValues);
    const headValues = toNumberArray(segment.headValues);

    const length = Math.min(times.length, eyeValues.length, headValues.length);

    if (length <= 0) return;

    const headKey = `head_${segmentIndex}`;
    const eyeKey = `eye_${segmentIndex}`;

    lineKeys.push({ key: headKey, type: "head", index: segmentIndex });
    lineKeys.push({ key: eyeKey, type: "eye", index: segmentIndex });

    for (let i = 0; i < length; i++) {
      chartData.push({
        time: times[i],
        [headKey]: headValues[i],
        [eyeKey]: eyeValues[i],
      });
    }
  });

  const hasData = chartData.length > 0;

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">
              {graph.title || graph.graphKey || "Grafik"}
            </h3>

            {graph.graphKey && (
              <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                {graph.graphKey}
              </span>
            )}
          </div>

          <p className="mt-1 text-xs text-slate-500">
            {graph.xLabel || "Zaman (ms)"} · {graph.yLabel || "Velocity"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-indigo-50 px-3 py-1 font-semibold text-indigo-700">
            Mean Gain: {formatNumber(graph.meanGain)}
          </span>

          <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
            Impulse: {graph.impulseCount ?? segments.length}
          </span>

          <span className="rounded-full bg-green-50 px-3 py-1 font-semibold text-green-700">
            Baş
          </span>

          <span className="rounded-full bg-red-50 px-3 py-1 font-semibold text-red-700">
            Göz
          </span>
        </div>
      </div>

      {!hasData ? (
        <div className="flex h-[260px] items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-500">
          Bu kanal için impulse/event verisi yok.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="time"
              type="number"
              domain={["auto", "auto"]}
              tick={{ fontSize: 11 }}
              label={{
                value: graph.xLabel || "Time (ms)",
                position: "insideBottom",
                offset: -4,
                fontSize: 11,
              }}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              label={{
                value: graph.yLabel || "Velocity",
                angle: -90,
                position: "insideLeft",
                fontSize: 11,
              }}
            />
            <Tooltip />

            {lineKeys.map((line) => (
              <Line
                key={line.key}
                type="monotone"
                dataKey={line.key}
                name={`${line.type === "head" ? "Baş" : "Göz"} ${
                  line.index + 1
                }`}
                stroke={line.type === "head" ? "#22C55E" : "#FF4D4D"}
                strokeWidth={line.type === "head" ? 2.1 : 1.25}
                strokeOpacity={line.type === "head" ? 1 : 0.75}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}