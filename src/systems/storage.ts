// Browser storage: the high-score table (settings join it in Milestone 4).

export interface ScoreEntry {
  name: string;
  score: number;
}

const KEY = 'moop.highscores.v1';
const MAX = 10;

const DEFAULTS: ScoreEntry[] = [
  ['MOP', 20000],
  ['SUD', 17500],
  ['TUB', 15000],
  ['GEL', 12500],
  ['FOM', 10000],
  ['BUB', 8000],
  ['DAB', 6000],
  ['RIN', 4000],
  ['SOP', 2000],
  ['LAT', 1000],
].map(([name, score]) => ({ name: name as string, score: score as number }));

export function loadScores(): ScoreEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const list = JSON.parse(raw) as ScoreEntry[];
      if (Array.isArray(list)) return list.slice(0, MAX);
    }
  } catch {
    /* storage unavailable or corrupt: fall back to defaults */
  }
  return DEFAULTS.map((e) => ({ ...e }));
}

export function qualifies(score: number): boolean {
  const list = loadScores();
  return score > 0 && (list.length < MAX || score > list[list.length - 1].score);
}

export function addScore(name: string, score: number): number {
  const list = loadScores();
  const entry = { name: name.slice(0, 3).toUpperCase(), score };
  list.push(entry);
  list.sort((a, b) => b.score - a.score);
  const trimmed = list.slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(trimmed));
  } catch {
    /* ignore */
  }
  return trimmed.indexOf(entry);
}

export function topScore(): number {
  return loadScores()[0]?.score ?? 0;
}
