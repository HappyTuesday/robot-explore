import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
export default function Modal({ title, children, onClose, className = '' }: { title: string; children: ReactNode; onClose?: () => void; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const old = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const el = ref.current; el?.focus();
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape' && onClose) onClose(); if (e.key === 'Tab') { const items = Array.from(el?.querySelectorAll<HTMLElement>('button:not([disabled]), select, input, a[href]') || []); if (!items.length) { e.preventDefault(); return; } const first = items[0], last = items[items.length - 1]; if (e.shiftKey && (document.activeElement === first || document.activeElement === el)) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && (document.activeElement === last || document.activeElement === el)) { e.preventDefault(); first.focus(); } } };
    document.addEventListener('keydown', key); return () => { document.body.style.overflow = old; document.removeEventListener('keydown', key); previous?.focus(); };
  }, [onClose]);
  return <div className="modal-backdrop"><div ref={ref} className={`modal ${className}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>{onClose && <button className="icon-button modal-close" aria-label="关闭" onClick={onClose}><X size={20}/></button>}{children}</div></div>;
}
