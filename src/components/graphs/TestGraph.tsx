"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function TestGraph({ title, times, eyeValues, headValues }: any) {
  const data = times.map((t: number, i: number) => ({
    time: t,
    eye: eyeValues[i] ?? 0,
    head: headValues[i] ?? 0,
  }));

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <h3 className="text-sm font-semibold mb-3">{title}</h3>

      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis />
          <Tooltip />

          <Line type="monotone" dataKey="eye" stroke="#6366f1" dot={false} />
          <Line type="monotone" dataKey="head" stroke="#f59e0b" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}