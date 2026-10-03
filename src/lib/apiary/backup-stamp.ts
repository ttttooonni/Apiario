const KEY = "apiario:last-backup";

export function markBackupSaved(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, new Date().toISOString());
}

export function backupAgeDays(): number | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return null;
  const time = Date.parse(raw);
  if (!Number.isFinite(time)) return null;
  return (Date.now() - time) / 86_400_000;
}
