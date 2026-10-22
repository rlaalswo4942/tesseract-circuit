// Persistent progress + settings in localStorage. Corrupt or missing data → safe defaults.
const KEY = 'tesseract-circuit:v1';
const QUALITIES = ['auto', 'low', 'medium', 'high'];

export function loadProgress(stageCount) {
  const fallback = { unlocked: 1, cleared: [], quality: 'auto' };
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (!raw || typeof raw !== 'object') return fallback;
    const unlocked = Number.isInteger(raw.unlocked) ? Math.min(Math.max(raw.unlocked, 1), stageCount) : 1;
    const cleared = Array.isArray(raw.cleared) ? [...new Set(raw.cleared.filter((i) => Number.isInteger(i) && i >= 0 && i < stageCount))] : [];
    const quality = QUALITIES.includes(raw.quality) ? raw.quality : 'auto';
    return { unlocked, cleared, quality };
  } catch {
    return fallback;
  }
}

export function saveProgress(progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress));
  } catch {
    // Private mode / storage full: the game still works, progress just isn't kept.
  }
}
