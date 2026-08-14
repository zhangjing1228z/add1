export const WD = ["日", "一", "二", "三", "四", "五", "六"];

export const pad2 = (n: number): string => String(n).padStart(2, "0");

export function fmtClock(totalSeconds: number): { left: string; right: string } {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return { left: `${h}:${pad2(m % 60)}`, right: pad2(s) };
  }
  return { left: pad2(m), right: pad2(s) };
}

export function todayKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function nowHM(): string {
  const d = new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function dateLabel(d: Date = new Date()): string {
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日・週${WD[d.getDay()]}`;
}

export function fmtDuration(sec: number): string {
  const m = Math.round(sec / 60);
  if (m < 1) return "0 分鐘";
  if (m < 60) return `${m} 分鐘`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} 小時 ${r} 分` : `${h} 小時`;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/* ---------- 完成提示音（WebAudio 合成，無需音訊檔） ---------- */
let audioCtx: AudioContext | null = null;

export function playChime(kind: "focus" | "break"): void {
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    audioCtx = audioCtx ?? new Ctor();
    if (audioCtx.state === "suspended") void audioCtx.resume();
    const t0 = audioCtx.currentTime;
    const notes = kind === "focus" ? [523.25, 659.25, 783.99] : [659.25, 493.88];
    notes.forEach((freq, i) => {
      const ctx = audioCtx as AudioContext;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = t0 + i * 0.17;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.2, t + 0.035);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.6);
    });
  } catch {
    /* 靜音失敗時不阻斷流程 */
  }
}
