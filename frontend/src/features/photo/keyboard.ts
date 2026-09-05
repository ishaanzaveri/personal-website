// Only the active photo surface should respond to page navigation shortcuts.
export function ignorePhotoShortcut(event: KeyboardEvent, ownDialog?: HTMLElement | null): boolean {
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return true;
  if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return true;
  return Array.from(document.querySelectorAll('dialog[open], [role="dialog"][aria-modal="true"]'))
    .some((dialog) => dialog !== ownDialog);
}
