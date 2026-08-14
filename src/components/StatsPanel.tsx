import { useMemo } from "react";
import { MODE_META, type DayRecord, type History } from "../types";
import { WD, fmtDuration, todayKey } from "../utils";

interface Props {
  today: DayRecord;
  goal: number;
  history: History;
}

export default function StatsPanel({ today, goal, history }: Props) {
  const week = useMemo(() => {
    const days: { key: string; label: string; minutes: number; isToday: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = todayKey(d);
      const rec = history[key];
      days.push({
        key,
        label: WD[d.getDay()],
        minutes: rec ? Math.round(rec.focusSeconds / 60) : 0,
        isToday: i === 0,
      });
    }
    return days;
  }, [history]);

  const max = Math.max(...week.map((d) => d.minutes), 1);
  const pct = Math.min(100, Math.round((today.focusCount / goal) * 100));
  const logs = [...today.log].reverse().slice(0, 6);

  return (
    <section className="card reveal p-6" style={{ animationDelay: "120ms" }}>
      <header className="mb-5 flex items-end justify-between">
        <div>
          <h2 className="font-display text-lg font-bold">今日專注</h2>
          <p className="font-num mt-0.5 text-[10px] tracking-[0.3em] text-[#8d8290]">TODAY</p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-num text-xs text-[#c9bdc6]">
          目標 {goal} 個
        </span>
      </header>

      {/* 達成數與目標進度 */}
      <div className="mb-5 flex items-end gap-3">
        <span className="font-num text-6xl font-bold leading-none tabular-nums" style={{ color: "var(--accent)" }}>
          {today.focusCount}
        </span>
        <div className="pb-1.5">
          <p className="text-sm text-[#c9bdc6]">個番茄鐘</p>
          <p className="font-num text-xs text-[#8d8290]">{pct}% of goal</p>
        </div>
      </div>

      <div className="mb-6 h-2 overflow-hidden rounded-full bg-white/8">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, background: "var(--accent)", boxShadow: `0 0 10px var(--glow)` }}
        />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/8 bg-white/4 px-4 py-3">
          <p className="text-xs text-[#8d8290]">累計專注</p>
          <p className="font-num mt-1 text-xl font-bold tabular-nums">{fmtDuration(today.focusSeconds)}</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/4 px-4 py-3">
          <p className="text-xs text-[#8d8290]">完成休息</p>
          <p className="font-num mt-1 text-xl font-bold tabular-nums">
            {today.breakCount}
            <span className="ml-1 text-sm font-medium text-[#8d8290]">次</span>
          </p>
        </div>
      </div>

      {/* 近七日圖表 */}
      <h3 className="mb-3 text-xs font-medium tracking-wider text-[#8d8290]">近七日專注分鐘</h3>
      <div className="mb-6 flex items-end gap-2">
        {week.map((d) => (
          <div key={d.key} className="group flex flex-1 flex-col items-center gap-1.5" title={`${d.minutes} 分鐘`}>
            <span className="font-num h-4 text-[10px] tabular-nums text-[#8d8290] opacity-0 transition-opacity group-hover:opacity-100">
              {d.minutes}
            </span>
            <div className="flex h-16 w-full items-end rounded-md bg-white/4">
              <div
                className="w-full rounded-md transition-all duration-700"
                style={{
                  height: d.minutes > 0 ? `${Math.max(8, (d.minutes / max) * 100)}%` : "3px",
                  background: d.isToday ? "var(--accent)" : "rgba(255,255,255,0.16)",
                  boxShadow: d.isToday && d.minutes > 0 ? "0 0 10px var(--glow)" : undefined,
                }}
              />
            </div>
            <span className={`text-[11px] ${d.isToday ? "font-bold text-[#f3ece6]" : "text-[#8d8290]"}`}>
              {d.label}
            </span>
          </div>
        ))}
      </div>

      {/* 今日紀錄 */}
      <h3 className="mb-3 text-xs font-medium tracking-wider text-[#8d8290]">今日紀錄</h3>
      {logs.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/12 px-4 py-5 text-center text-sm text-[#8d8290]">
          還沒有紀錄 — 按下「開始」完成第一個番茄鐘吧
        </p>
      ) : (
        <ul className="space-y-1">
          {logs.map((entry, i) => {
            const meta = MODE_META[entry.mode];
            return (
              <li
                key={`${entry.t}-${i}`}
                className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-white/4"
              >
                <span className="size-2 shrink-0 rounded-full" style={{ background: meta.color }} />
                <span className="text-[#c9bdc6]">
                  {entry.minutes} 分鐘{meta.label}
                </span>
                <span className="font-num ml-auto text-xs tabular-nums text-[#8d8290]">{entry.t}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
