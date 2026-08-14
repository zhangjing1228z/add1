export type Mode = "focus" | "short" | "long";

export interface Settings {
  focusMin: number;
  shortMin: number;
  longMin: number;
  /** 每幾個專注後進入長休息 */
  longEvery: number;
  /** 自動接續下一階段 */
  autoNext: boolean;
  sound: boolean;
  dailyGoal: number;
}

export interface LogEntry {
  t: string; // HH:MM
  mode: Mode;
  minutes: number;
}

export interface DayRecord {
  focusCount: number;
  focusSeconds: number;
  breakCount: number;
  log: LogEntry[];
}

export type History = Record<string, DayRecord>;

export interface ModeMeta {
  label: string;
  en: string;
  color: string;
  glow: string;
  softBg: string;
}

export const MODE_META: Record<Mode, ModeMeta> = {
  focus: {
    label: "專注",
    en: "FOCUS",
    color: "#f2543d",
    glow: "rgba(242, 84, 61, 0.24)",
    softBg: "rgba(242, 84, 61, 0.13)",
  },
  short: {
    label: "短休息",
    en: "SHORT BREAK",
    color: "#3fbf7f",
    glow: "rgba(63, 191, 127, 0.22)",
    softBg: "rgba(63, 191, 127, 0.13)",
  },
  long: {
    label: "長休息",
    en: "LONG BREAK",
    color: "#4aa8de",
    glow: "rgba(74, 168, 222, 0.22)",
    softBg: "rgba(74, 168, 222, 0.13)",
  },
};

export const MODE_ORDER: Mode[] = ["focus", "short", "long"];

export const DEFAULT_SETTINGS: Settings = {
  focusMin: 25,
  shortMin: 5,
  longMin: 15,
  longEvery: 4,
  autoNext: false,
  sound: true,
  dailyGoal: 8,
};

export const emptyDay = (): DayRecord => ({
  focusCount: 0,
  focusSeconds: 0,
  breakCount: 0,
  log: [],
});
