import type { PostTag } from '../types';

// Blog tag → signal color (matches the prototype's tagColor map).
export const postTagColor: Record<PostTag, string> = {
  systems: 'var(--teal-hi)',
  security: 'var(--rose)',
  photo: 'var(--amber)',
  notes: 'var(--violet)',
};

export function tagColorOf(tag: string): string {
  return (postTagColor as Record<string, string>)[tag] ?? 'var(--text-mid)';
}
