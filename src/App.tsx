import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import SettingsPanel from "./components/SettingsPanel";
import StatsPanel from "./components/StatsPanel";
import TimerDial from "./components/TimerDial";
import { useLocalStorage } from "./hooks/useLocalStorage";
import {
  DEFAULT_SETTINGS,
  MODE_META,
  MODE_ORDER,
  emptyDay,
  type History,
  type Mode,
  type Settings,
} from "./types";
import { dateLabel, fmtClock, nowHM, playChime, todayKey } from "./utils";

interface Toast {
  id: number;
  text: string;
  mode: Mode;
}

const SEEDS = [
  { left: "6%", top: "22%", delay: "0s", scale: 1 },
  { left: "14%", top: "68%", delay: "-3s", scale: 0.8 },
  { left: "28%", top: "85%", delay: "-7s", scale: 1.2 },
  { left: "46%", top: "12%", delay: "-5s", scale: 0.7 },
  { left: "63%", top: "78%", delay: "-2s", scale: 1.1 },
  { left: "78%", top: "30%", delay: "-9s", scale: 0.9 },
  { left: "88%", top: "62%", delay: "-6s", scale: 1.3 },
  { left: "92%", top: "16%", delay: "-4s", scale: 0.75 },
];

function TomatoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path d="M24 14q0.5-6.5 5.5-9" fill="none" stroke="#3fbf7f" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M24 14c-2.6-4.2-8.4-5.4-11.6-3 3.2 1 5.6 3 6.8 5.8z" fill="#3fbf7f" />
      <path d="M24 14c2.6-4.2 8.4-5.4 11.6-3-3.2 1-5.6 3-6.8 5.8z" fill="#57d194" />
      <circle cx="24" cy="29" r="15" fill="#f2543d" />
      <ellipse cx="18.5" cy="24.5" rx="3.6" ry="5.6" fill="#ffffff" opacity="0.22" transform="rotate(-22 18.5 24.5)" />
    </svg>
  );
}

export default function App() {
  const [settings, setSettings] = useLocalStorage<Settings>("pomo.settings.v1", DEFAULT_SETTINGS, (raw) => ({
    ...DEFAULT_SETTINGS,
    ...(raw as Partial<Settings>),
  }));
  const [history, setHistory] = useLocalStorage<History>("pomo.history.v1", {});
  const [task, setTask] = useLocalStorage<string>("pomo.task.v1", "");

  const [mode, setMode] = useState<Mode>("focus");
  const [secondsLeft, setSecondsLeft] = useState(settings.focusMin * 60);
  const [running, setRunning] = useState(false);
  const [cycle, setCycle] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dayKey, setDayKey] = useState(todayKey());

  const toastId = useRef(0);
  const meta = MODE_META[mode];
  const runningRef = useRef(running);
  runningRef.current = running;

  const durationOf = useCallback(
    (m: Mode) => {
      const map = { focus: settings.focusMin, short: settings.shortMin, long: settings.longMin } as const;
      return map[m] * 60;
    },
    [settings.focusMin, settings.shortMin, settings.longMin],
  );

  const pushToast = useCallback((text: string, m: Mode) => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-2), { id, text, mode: m }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4600);
  }, []);

  /* 跨日偵測：午夜後自動切換統計日 */
  useEffect(() => {
    const id = window.setInterval(() => {
      const k = todayKey();
      setDayKey((prev) => (prev === k ? prev : k));
    }, 30_000);
    return () => window.clearInterval(id);
  }, []);

  /* 計時 tick */
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  /* 閒置時同步時長設定（計時中則於下一階段生效） */
  useEffect(() => {
    if (!runningRef.current) setSecondsLeft(durationOf(mode));
  }, [durationOf, mode, settings.focusMin, settings.shortMin, settings.longMin]);

  /* 階段完成 */
  useEffect(() => {
    if (secondsLeft !== 0) return;
    setRunning(false);
    const finished = mode;
    if (settings.sound) playChime(finished === "focus" ? "focus" : "break");

    const minutes =
      finished === "focus" ? settings.focusMin : finished === "short" ? settings.shortMin : settings.longMin;

    let newCycle = cycle;
    if (finished === "focus") newCycle = cycle + 1;
    if (finished === "long") newCycle = 0;
    const next: Mode =
      finished === "focus" ? (newCycle % settings.longEvery === 0 ? "long" : "short") : "focus";

    const k = todayKey();
    const before = history[k] ?? emptyDay();
    setHistory((h) => {
      const day = h[k] ?? emptyDay();
      return {
        ...h,
        [k]: {
          ...day,
          focusCount: day.focusCount + (finished === "focus" ? 1 : 0),
          focusSeconds: day.focusSeconds + (finished === "focus" ? minutes * 60 : 0),
          breakCount: day.breakCount + (finished === "focus" ? 0 : 1),
          log: [...day.log, { t: nowHM(), mode: finished, minutes }].slice(-40),
        },
      };
    });

    pushToast(
      finished === "focus"
        ? `第 ${before.focusCount + 1} 個番茄完成，休息一下吧`
        : next === "focus"
          ? "休息結束，回到專注"
          : "休息結束，準備下一輪",
      finished,
    );

    setCycle(newCycle);
    setMode(next);
    setSecondsLeft(durationOf(next));
    if (settings.autoNext) setRunning(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  /* 文件標題倒數 */
  useEffect(() => {
    const { left, right } = fmtClock(secondsLeft);
    document.title = running ? `${left}:${right} ${meta.label}・番茄專注` : "番茄專注｜Pomodoro Focus";
  }, [secondsLeft, running, meta.label]);

  const toggle = useCallback(() => {
    if (!runningRef.current && secondsLeft === 0) {
      setSecondsLeft(durationOf(mode));
      setRunning(true);
      return;
    }
    setRunning((r) => !r);
  }, [secondsLeft, mode, durationOf]);

  const reset = useCallback(() => {
    setRunning(false);
    setSecondsLeft(durationOf(mode));
  }, [mode, durationOf]);

  const skip = useCallback(() => {
    setRunning(false);
    let next: Mode;
    let c = cycle;
    if (mode === "focus") next = "short";
    else {
      next = "focus";
      if (mode === "long") c = 0;
    }
    setMode(next);
    setCycle(c);
    setSecondsLeft(durationOf(next));
  }, [mode, cycle, durationOf]);

  const switchMode = useCallback(
    (m: Mode) => {
      if (m === mode) return;
      setRunning(false);
      setMode(m);
      setSecondsLeft(durationOf(m));
    },
    [mode, durationOf],
  );

  /* 鍵盤快捷鍵 */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      if (e.code === "Space") {
        e.preventDefault();
        /* 避免焦點仍在按鈕上時 Space 觸發兩次 */
        if (el && el.tagName === "BUTTON") el.blur();
        toggle();
      } else if (e.key === "r" || e.key === "R") {
        reset();
      } else if (e.key === "s" || e.key === "S") {
        skip();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle, reset, skip]);

  const today = history[dayKey] ?? emptyDay();
  const cycleInRound = cycle % settings.longEvery === 0 && cycle > 0 ? settings.longEvery : cycle % settings.longEvery;
  const totalSeconds = durationOf(mode);

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{ "--accent": meta.color, "--glow": meta.glow } as CSSProperties}
    >
      {/* 環境光暈 */}
      <div className="glow-orb -top-48 -left-48 size-[46rem]" style={{ background: meta.glow }} />
      <div
        className="glow-orb -right-56 -bottom-56 size-[42rem]"
        style={{ background: meta.glow, animationDelay: "-5s" }}
      />
      {/* 漂浮番茄籽 */}
      <div className="pointer-events-none absolute inset-0 transition-colors duration-1000" style={{ color: meta.color }}>
        {SEEDS.map((s, i) => (
          <span
            key={i}
            className="seed"
            style={{ left: s.left, top: s.top, animationDelay: s.delay, transform: `scale(${s.scale})` }}
          />
        ))}
      </div>

      {/* 完成通知 */}
      <div className="fixed top-5 right-5 z-50 flex w-[min(90vw,340px)] flex-col gap-2">
        {toasts.map((t) => {
          const m = MODE_META[t.mode];
          return (
            <div
              key={t.id}
              role="status"
              className="toast-in flex items-start gap-3 rounded-xl border border-white/10 bg-[#241c26]/95 px-4 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur"
              style={{ borderLeft: `3px solid ${m.color}` }}
            >
              <span className="mt-1 size-2 shrink-0 rounded-full" style={{ background: m.color }} />
              <p className="flex-1 text-sm leading-snug text-[#f3ece6]">{t.text}</p>
              <button
                type="button"
                aria-label="關閉通知"
                onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}
                className="text-[#8d8290] transition-colors hover:text-[#f3ece6]"
              >
                <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>

      <div className="relative mx-auto max-w-6xl px-5 pt-8 pb-10 md:px-8">
        {/* 頁首 */}
        <header className="reveal mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <TomatoMark className="size-10 drop-shadow-[0_4px_14px_rgba(242,84,61,0.35)]" />
            <div>
              <h1 className="font-display text-xl leading-tight font-bold">番茄專注</h1>
              <p className="font-num text-[10px] tracking-[0.32em] text-[#8d8290]">POMODORO FOCUS</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-num text-sm text-[#c9bdc6]">{dateLabel()}</p>
            <p className="mt-0.5 text-[11px] text-[#8d8290]">資料已自動儲存於此瀏覽器</p>
          </div>
        </header>

        <main className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_370px]">
          {/* 計時主舞台 */}
          <section className="card reveal relative overflow-hidden p-6 pt-8 md:p-10" style={{ animationDelay: "60ms" }}>
            <div
              className="pointer-events-none absolute inset-0 transition-opacity duration-700"
              style={{ background: `radial-gradient(58% 42% at 50% 34%, ${meta.glow}, transparent 72%)` }}
            />

            {/* 模式切換 */}
            <div className="relative mb-8 flex justify-center">
              <div className="flex rounded-full border border-white/8 bg-black/25 p-1">
                {MODE_ORDER.map((m) => {
                  const active = m === mode;
                  const mm = MODE_META[m];
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => switchMode(m)}
                      className="relative rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 sm:px-6"
                      style={
                        active
                          ? { background: mm.softBg, color: mm.color, boxShadow: `inset 0 0 0 1px ${mm.color}44` }
                          : { color: "#a89aa6" }
                      }
                      aria-pressed={active}
                    >
                      {mm.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <TimerDial
              mode={mode}
              secondsLeft={secondsLeft}
              totalSeconds={totalSeconds}
              running={running}
              cycleInRound={cycleInRound}
              longEvery={settings.longEvery}
            />

            {/* 控制列 */}
            <div className="relative mt-9 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={reset}
                aria-label="重置計時"
                className="grid size-13 place-items-center rounded-full border border-white/12 text-[#c9bdc6] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--accent)] hover:text-[var(--accent)] active:translate-y-0 active:scale-90"
              >
                <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 3-6.7" />
                  <path d="M3 4v5h5" />
                </svg>
              </button>

              <button
                type="button"
                onClick={toggle}
                className="group flex items-center gap-3 rounded-full px-10 py-4 text-lg font-bold text-[#fff6f1] transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
                style={{ background: meta.color, boxShadow: `0 10px 34px ${meta.glow}, 0 2px 0 rgba(0,0,0,0.18) inset` }}
              >
                {running ? (
                  <>
                    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor">
                      <rect x="6" y="5" width="4.5" height="14" rx="1.2" />
                      <rect x="13.5" y="5" width="4.5" height="14" rx="1.2" />
                    </svg>
                    暫停
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" className="size-5 transition-transform duration-200 group-hover:scale-110" fill="currentColor">
                      <path d="M8 5.6c0-1.2 1.3-2 2.4-1.3l10 6.4c1 .6 1 2 0 2.6l-10 6.4c-1.1.7-2.4-.1-2.4-1.3z" />
                    </svg>
                    {secondsLeft === totalSeconds ? `開始${meta.label}` : "繼續"}
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={skip}
                aria-label="跳過此階段"
                className="grid size-13 place-items-center rounded-full border border-white/12 text-[#c9bdc6] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--accent)] hover:text-[var(--accent)] active:translate-y-0 active:scale-90"
              >
                <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 5.5v13l9-6.5z" fill="currentColor" stroke="none" />
                  <path d="M18.5 5v14" />
                </svg>
              </button>
            </div>

            {/* 專注事項 */}
            <div className="relative mx-auto mt-8 flex max-w-sm items-center gap-2.5 border-b border-dashed border-white/15 pb-2 transition-colors focus-within:border-[var(--accent)]">
              <svg viewBox="0 0 24 24" className="size-4 shrink-0 text-[#8d8290]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" />
              </svg>
              <input
                value={task}
                onChange={(e) => setTask(e.target.value)}
                maxLength={40}
                placeholder="此刻專注於…（選填，會自動儲存）"
                className="w-full bg-transparent text-sm text-[#f3ece6] outline-none"
                aria-label="目前專注事項"
              />
            </div>
          </section>

          {/* 右欄：統計 + 設定 */}
          <div className="space-y-6">
            <StatsPanel today={today} goal={settings.dailyGoal} history={history} />
            <SettingsPanel
              settings={settings}
              onChange={(patch) => setSettings((s) => ({ ...s, ...patch }))}
              onClear={() => setHistory({})}
            />
          </div>
        </main>

        {/* 頁尾 */}
        <footer className="reveal mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-[#8d8290]" style={{ animationDelay: "320ms" }}>
          <span className="flex items-center gap-1.5">
            <kbd>Space</kbd> 開始／暫停
          </span>
          <span className="flex items-center gap-1.5">
            <kbd>R</kbd> 重置
          </span>
          <span className="flex items-center gap-1.5">
            <kbd>S</kbd> 跳過階段
          </span>
          <span className="text-[#5f5562]">・</span>
          <span>
            每 <span className="font-num">{settings.longEvery}</span> 個專注後進入長休息
          </span>
        </footer>
      </div>
    </div>
  );
}
