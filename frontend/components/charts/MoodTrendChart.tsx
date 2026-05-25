"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function MoodTrendChart({ data }: { data: Array<{ day: string; mood: number }> }) {
  return (
    <div className="h-48 w-full" aria-label="Mood trend chart">
      <ResponsiveContainer>
        <LineChart data={data}>
          <XAxis dataKey="day" tickLine={false} axisLine={false} />
          <YAxis domain={[1, 10]} hide />
          <Tooltip />
          <Line type="monotone" dataKey="mood" stroke="var(--teal)" strokeWidth={3} dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
