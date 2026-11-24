import { useEffect, useRef, type ReactNode } from 'react';

export function Dialog({ open, title, children, onClose }: { open: boolean; title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal?.() ?? d.setAttribute('open', '');
    if (!open && d.open) d.close?.() ?? d.removeAttribute('open');
  }, [open]);
  if (!open) return null;
  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="card m-auto w-[min(92vw,28rem)] p-6 text-[var(--text)] backdrop:bg-navy/70"
    >
      <h2 className="mb-3 text-2xl font-bold">{title}</h2>
      {children}
    </dialog>
  );
}
