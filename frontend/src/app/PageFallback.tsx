import { Prompt, Cursor } from '../components/primitives';

// Minimal route-level loading shim shown while a lazy page chunk loads.
export function PageFallback() {
  return (
    <div style={{ padding: 'var(--s-7) 0', color: 'var(--text-dim)', fontSize: 13 }}>
      <Prompt path="~/site">
        loading
        <Cursor />
      </Prompt>
    </div>
  );
}
