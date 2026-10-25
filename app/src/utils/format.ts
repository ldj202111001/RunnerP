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

// 10월 25일 (토) 오전 7:30
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const day = '일월화수목금토'[d.getDay()];
  const h = d.getHours();
  const ampm = h < 12 ? '오전' : '오후';
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${day}) ${ampm} ${h % 12 || 12}:${pad(d.getMinutes())}`;
}
