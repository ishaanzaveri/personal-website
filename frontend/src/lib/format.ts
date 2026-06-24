import type { Frame } from '../types';

// Relative time for the footer "last commit 4h ago" string.
export function relativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  const diff = Math.max(0, now.getTime() - then);
  const sec = Math.round(diff / 1000);
  const min = Math.round(sec / 60);
  const hr = Math.round(min / 60);
  const day = Math.round(hr / 24);
  if (sec < 60) return 'just now';
  if (min < 60) return `${min}m ago`;
  if (hr < 24) return `${hr}h ago`;
  if (day < 30) return `${day}d ago`;
  const mo = Math.round(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.round(mo / 12)}y ago`;
}

// Deterministic OKLCH gradient placeholder for a frame (ported from the
// prototype's frameBg — the LQIP shim until real images exist).
export function frameBg(frame: Frame): string {
  const { hue: h, lightness: l } = frame.image.placeholder;
  const isBW = (frame.tags || []).includes('b&w');
  const c = isBW ? 0 : 0.07;
  const angle = 135 + ((parseInt(frame.id.slice(1), 10) * 7) % 40);
  return `linear-gradient(${angle}deg,
    oklch(${(l + 0.06).toFixed(2)} ${c.toFixed(2)} ${h}) 0%,
    oklch(${l.toFixed(2)} ${(c * 0.85).toFixed(2)} ${(h + 20) % 360}) 55%,
    oklch(${(l - 0.1).toFixed(2)} ${(c * 0.6).toFixed(2)} ${(h + 40) % 360}) 100%)`;
}

// Synthesize a caption from EXIF when a frame has no hand-written one
// (mirrors the prototype's captionFor).
export function captionFor(frame: Frame): { title: string; paragraphs: string[]; note?: string } {
  if (frame.caption) return frame.caption;
  const place = frame.location.split(' · ')[0];
  return {
    title: `${place} — ${frame.lens}, ${frame.aperture}.`,
    paragraphs: [
      `${frame.camera} · ${frame.lens} · ${frame.aperture} · ${frame.shutter} · ${frame.iso}.`,
    ],
    note: `// ${frame.tags.join(' · ')}`,
  };
}

// Alt text for a frame image (real photos should carry a description; fall
// back to the synthesized caption title).
export function frameAlt(frame: Frame): string {
  return captionFor(frame).title;
}
