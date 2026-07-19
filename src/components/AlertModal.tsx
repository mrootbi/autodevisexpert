import { useEffect } from 'react';
import { X, Users, Loader2 } from 'lucide-react';

interface AlertModalProps {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
  onRetry?: () => void;
  retryLabel?: string;
  retrying?: boolean;
}

export default function AlertModal({
  open,
  title,
  message,
  onClose,
  onRetry,
  retryLabel = 'Réessayer',
  retrying = false,
}: AlertModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="alert-modal-title"
    >
      <button
        type="button"
        aria-label="Fermer"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md animate-fadeIn rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          aria-label="Fermer la fenêtre"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
            <Users className="h-7 w-7" />
          </span>
          <p id="alert-modal-title" className="mt-4 font-display text-xl font-bold text-slate-900">
            {title}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">{message}</p>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
          <button type="button" onClick={onClose} className="btn-ghost flex-1 sm:flex-initial">
            Fermer
          </button>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              disabled={retrying}
              className="btn-green flex-1 sm:flex-initial"
            >
              {retrying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Analyse…
                </>
              ) : (
                retryLabel
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
