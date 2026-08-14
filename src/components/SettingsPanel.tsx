import { useEffect, useRef, useState } from "react";
import type { Settings } from "../types";
import { clamp } from "../utils";

interface Props {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onClear: () => void;
}

function Stepper({
  label,
  hint,
  value,
  unit,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  const btn =
    "grid size-8 place-items-center rounded-full border border-white/15 text-[#c9bdc6] transition-all " +
    "hover:border-[var(--accent)] hover:text-[var(--accent)] active:scale-90 disabled:opacity-25 disabled:pointer-events-none";
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {hint ? <p className="mt-0.5 text-xs text-[#8d8290]">{hint}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          className={btn}
          onClick={() => onChange(clamp(value - step, min, max))}
          disabled={value <= min}
          aria-label={`減少${label}`}
        >
          <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 8h10" />
          </svg>
        </button>
        <span className="w-16 text-center">
          <span className="font-num text-lg font-bold tabular-nums">{value}</span>
          <span className="ml-1 text-xs text-[#8d8290]">{unit}</span>
        </span>
        <button
          type="button"
          className={btn}
          onClick={() => onChange(clamp(value + step, min, max))}
          disabled={value >= max}
          aria-label={`增加${label}`}
        >
          <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M8 3v10M3 8h10" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function Toggle({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 py-2.5 text-left"
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        <span className="mt-0.5 block text-xs text-[#8d8290]">{desc}</span>
      </span>
      <span
        className="relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300"
        style={{ background: checked ? "var(--accent)" : "rgba(255,255,255,0.14)" }}
      >
        <span
          className="absolute top-0.5 left-0.5 size-5 rounded-full bg-[#f7f1ec] shadow transition-transform duration-300"
          style={{ transform: checked ? "translateX(20px)" : "translateX(0)" }}
        />
      </span>
    </button>
  );
}

export default function SettingsPanel({ settings, onChange, onClear }: Props) {
  const [confirming, setConfirming] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const handleClear = () => {
    if (!confirming) {
      setConfirming(true);
      timerRef.current = window.setTimeout(() => setConfirming(false), 3000);
      return;
    }
    setConfirming(false);
    onClear();
  };

  return (
    <section className="card reveal p-6" style={{ animationDelay: "220ms" }}>
      <header className="mb-2">
        <h2 className="font-display text-lg font-bold">自訂時長</h2>
        <p className="font-num mt-0.5 text-[10px] tracking-[0.3em] text-[#8d8290]">SETTINGS</p>
      </header>
      <p className="mb-3 text-xs text-[#8d8290]">調整會自動儲存；計時進行中時，新時長自下一階段生效。</p>

      <div className="divide-y divide-white/6">
        <Stepper
          label="專注時長"
          value={settings.focusMin}
          unit="分鐘"
          min={1}
          max={90}
          step={5}
          onChange={(v) => onChange({ focusMin: v })}
        />
        <Stepper
          label="短休息"
          value={settings.shortMin}
          unit="分鐘"
          min={1}
          max={30}
          onChange={(v) => onChange({ shortMin: v })}
        />
        <Stepper
          label="長休息"
          value={settings.longMin}
          unit="分鐘"
          min={5}
          max={60}
          step={5}
          onChange={(v) => onChange({ longMin: v })}
        />
        <Stepper
          label="長休息間隔"
          hint="每完成幾個專注後進入長休息"
          value={settings.longEvery}
          unit="個"
          min={2}
          max={8}
          onChange={(v) => onChange({ longEvery: v })}
        />
        <Stepper
          label="每日目標"
          value={settings.dailyGoal}
          unit="個"
          min={1}
          max={20}
          onChange={(v) => onChange({ dailyGoal: v })}
        />
      </div>

      <div className="mt-2 divide-y divide-white/6 border-t border-white/6">
        <Toggle
          label="自動接續"
          desc="階段結束後自動開始下一階段"
          checked={settings.autoNext}
          onChange={(v) => onChange({ autoNext: v })}
        />
        <Toggle
          label="完成提示音"
          desc="階段結束時播放輕柔鈴聲"
          checked={settings.sound}
          onChange={(v) => onChange({ sound: v })}
        />
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-white/6 pt-4">
        <p className="text-xs text-[#8d8290]">統計資料僅存於此瀏覽器</p>
        <button
          type="button"
          onClick={handleClear}
          className={
            "rounded-full px-3.5 py-1.5 text-xs font-medium transition-all " +
            (confirming
              ? "bg-[#f2543d] text-[#fff4f0] shadow-[0_4px_18px_rgba(242,84,61,0.4)]"
              : "border border-white/12 text-[#c9bdc6] hover:border-[#f2543d] hover:text-[#f2543d]")
          }
        >
          {confirming ? "再按一次確認清空" : "清空所有紀錄"}
        </button>
      </div>
    </section>
  );
}
