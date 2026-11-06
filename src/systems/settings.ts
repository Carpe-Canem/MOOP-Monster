// Player settings, remembered in the browser (DESIGN.md: settings are saved between visits).
// One shared live object: change a field, then call saveSettings().
export interface Settings {
  muted: boolean;
  music: number; // 0..1
  sfx: number; // 0..1
  crt: boolean;
}

const KEY = 'moop.settings.v1';
const DEFAULTS: Settings = { muted: false, music: 0.6, sfx: 0.9, crt: false };

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    /* fall back to defaults */
  }
  return { ...DEFAULTS };
}

export const settings: Settings = load();

export function saveSettings(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}
