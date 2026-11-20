import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface BottomSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  closeLabel?: string;
  maxWidthClass?: string;
  pinned?: boolean;
  compactBody?: boolean;
  children: React.ReactNode;
}

export const BottomSheetModal: React.FC<BottomSheetModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  closeLabel = 'ปิดหน้าต่าง',
  maxWidthClass = 'sm:max-w-lg',
  pinned = false,
  compactBody = false,
  children,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[1200] flex items-end sm:items-center justify-center bg-slate-950/60 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => {
        if (!pinned && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`w-full ${maxWidthClass} bg-white border border-slate-200 rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[88vh] flex flex-col overflow-hidden`}
      >
        {/* Mobile drag handle */}
        <div className="sm:hidden pt-2 pb-0.5 flex justify-center shrink-0" aria-hidden="true">
          <div className="w-10 h-1.5 rounded-full bg-slate-300" />
        </div>

        {/* Sticky Sheet Header */}
        <div className="px-4 sm:px-5 py-3 border-b border-slate-200/80 flex items-center justify-between gap-3 shrink-0 bg-white">
          <div className="flex items-center gap-2.5 min-w-0">
            {icon && (
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 shrink-0">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-sm sm:text-lg font-extrabold text-slate-900 leading-snug truncate">
                {title}
              </h3>
              {subtitle && (
                <p className="text-xs text-slate-500 mt-0.5 truncate">{subtitle}</p>
              )}
            </div>
          </div>

          <button
            type="button"
            data-testid="modal-close-btn"
            onClick={onClose}
            aria-label={closeLabel}
            className="min-h-[40px] min-w-[40px] px-3 py-1.5 inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 border border-slate-200 hover:border-red-200 font-bold text-xs transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          >
            <X className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">{closeLabel}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className={`${compactBody ? 'p-3 sm:p-4' : 'p-5'} overflow-y-auto flex-1`}>
          {children}
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
};
