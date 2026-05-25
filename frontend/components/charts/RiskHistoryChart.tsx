"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function RiskHistoryChart({ data }: { data: Array<{ day: string; risk: number }> }) {
  return (
    <div className="h-56 w-full" aria-label="Risk history chart">
      <ResponsiveContainer>
        <AreaChart data={data}>
          <XAxis dataKey="day" tickLine={false} axisLine={false} />
          <YAxis domain={[0, 100]} hide />
          <Tooltip />
          <Area type="monotone" dataKey="risk" stroke="var(--orange)" fill="rgba(251,133,0,0.12)" strokeWidth={3} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
