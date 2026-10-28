const pad = (n: number) => String(n).padStart(2, '0');

// 1:02:15 / 32:05
export function formatDuration(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

// 5'30" (초/km). 0이거나 비정상적으로 느리면 --
export function formatPace(secPerKm: number): string {
  if (!secPerKm || secPerKm >= 60 * 60) return `--'--"`;
  return `${Math.floor(secPerKm / 60)}'${pad(Math.round(secPerKm % 60))}"`;
}

// 5.02 (km)
export function formatKm(meters: number): string {
  return (meters / 1000).toFixed(2);
}

// "28:30" / "1:05:00" → 초. 형식이 틀리면 null
export function parseDuration(text: string): number | null {
  const parts = text.trim().split(':');
  if (parts.length < 2 || parts.length > 3 || parts.some((p) => !/^\d{1,2}$/.test(p))) return null;
  const [s, m, h = 0] = parts.map(Number).reverse();
  if (s >= 60 || m >= 60) return null;
  return h * 3600 + m * 60 + s;
}

// 로컬 날짜 → "2026-10-27" (DB DATE 형식)
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// "2026-10-27" → 2026년 10월 27일 (화)
export function formatDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const day = '일월화수목금토'[new Date(y, m - 1, d).getDay()];
  return `${y}년 ${m}월 ${d}일 (${day})`;
}

// 10월 25일 (토) 오전 7:30
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const day = '일월화수목금토'[d.getDay()];
  const h = d.getHours();
  const ampm = h < 12 ? '오전' : '오후';
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${day}) ${ampm} ${h % 12 || 12}:${pad(d.getMinutes())}`;
}
