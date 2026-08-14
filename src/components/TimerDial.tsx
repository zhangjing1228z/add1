import type { CSSProperties } from "react";
import { MODE_META, type Mode } from "../types";
import { fmtClock } from "../utils";

interface Props {
  mode: Mode;
  secondsLeft: number;
  totalSeconds: number;
  running: boolean;
  cycleInRound: number;
  longEvery: number;
}

const R = 140;
const C = 2 * Math.PI * R;

const TICKS = Array.from({ length: 60 }, (_, i) => i);

export default function TimerDial({
  mode,
  secondsLeft,
  totalSeconds,
  running,
  cycleInRound,
  longEvery,
}: Props) {
  const meta = MODE_META[mode];
  const raw = totalSeconds > 0 ? (totalSeconds - secondsLeft) / totalSeconds : 0;
  const progress = Math.min(1, Math.max(0, raw));
  const offset = C * (1 - progress);
  const { left, right } = fmtClock(secondsLeft);

  const status = running ? "進行中" : secondsLeft === totalSeconds ? "準備開始" : "已暫停";

  return (
    <div
      key={mode}
      className="pop-in relative mx-auto w-[min(80vw,400px)]"
      style={{ "--accent": meta.color, "--glow": meta.glow } as CSSProperties}
    >
      <svg viewBox="0 0 360 360" className="block w-full">
        {/* 外圈刻度 */}
        {TICKS.map((i) => {
          const major = i % 5 === 0;
          return (
            <line
              key={i}
              x1="180"
              y1={major ? 14 : 19}
              x2="180"
              y2={major ? 29 : 25}
              transform={`rotate(${i * 6} 180 180)`}
              stroke="#a89aa6"
              strokeWidth={major ? 2.4 : 1.1}
              strokeLinecap="round"
              opacity={major ? 0.45 : 0.18}
            />
          );
        })}

        {/* 內部隨進度呼吸的填色 */}
        <circle
          cx="180"
          cy="180"
          r="124"
          fill={meta.color}
          style={{ opacity: 0.035 + progress * 0.065, transition: "opacity 1s linear, fill 600ms ease" }}
        />

        {/* 軌道 */}
        <circle
          className="arc-track"
          cx="180"
          cy="180"
          r={R}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth="10"
        />

        {/* 進度弧 */}
        <circle
          className="arc-progress"
          cx="180"
          cy="180"
          r={R}
          fill="none"
          stroke={meta.color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={offset}
          transform="rotate(-90 180 180)"
        />
      </svg>

      {/* 中央內容 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
        <span
          className="inline-flex items-baseline gap-2 rounded-full border px-4 py-1.5"
          style={{
            color: meta.color,
            background: meta.softBg,
            borderColor: `${meta.color}38`,
          }}
        >
          <span className="font-display text-sm font-bold tracking-[0.25em]">{meta.label}</span>
          <span className="font-num text-[10px] tracking-[0.28em] opacity-70">{meta.en}</span>
        </span>

        <div className="font-num text-[clamp(3.4rem,15vw,5.4rem)] font-bold leading-none tracking-tight tabular-nums">
          <span>{left}</span>
          <span className={running ? "colon-blink" : undefined}>:</span>
          <span key={secondsLeft} className="tick-in inline-block">
            {right}
          </span>
        </div>

        <p className="flex h-5 items-center gap-2 text-sm text-[#a89aa6]">
          <span
            className={`inline-block size-2 rounded-full ${running ? "animate-pulse" : ""}`}
            style={{ background: running || secondsLeft < totalSeconds ? meta.color : "#5a4f5c" }}
          />
          {status}
        </p>

        {/* 本輪番茄進度點 */}
        <div className="flex items-center gap-2.5" aria-label={`本輪已完成 ${cycleInRound} / ${longEvery} 個專注`}>
          {Array.from({ length: longEvery }, (_, i) => (
            <span
              key={`${longEvery}-${i}`}
              className="size-2.5 rounded-full border transition-all duration-500"
              style={
                i < cycleInRound
                  ? { background: meta.color, borderColor: meta.color, boxShadow: `0 0 8px ${meta.glow}` }
                  : { borderColor: "rgba(255,255,255,0.25)" }
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}
